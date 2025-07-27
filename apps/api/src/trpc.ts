import { initTRPC, TRPCError } from '@trpc/server'
import type { CreateExpressContextOptions } from '@trpc/server/adapters/express'
import { z } from 'zod'
import { createSupabaseServerClient } from './lib/supabase'
import { transformSupabaseUser, type User, type AuthContext } from 'phonoglyph-types'
import { 
  extractGuestSession, 
  createGuestUserFromSession, 
  isValidGuestSession, 
  isGuestUser,
  type GuestUser 
} from './types/guest'
import { logger } from './lib/logger'

// Create tRPC context with Supabase authentication and guest support for Express
export const createTRPCContext = async (opts: CreateExpressContextOptions) => {
  const { req, res } = opts

  // Debug all headers
  logger.debug('Backend - All headers:', (req as any).headers)
  logger.debug('Backend - Authorization header:', (req as any).headers?.authorization)
  logger.debug('Backend - Content-Type header:', (req as any).headers?.['content-type'])

  // Extract authorization header
  const authHeader = (req as any).headers?.authorization
  const accessToken = authHeader?.replace('Bearer ', '')

  logger.auth('Backend - Auth header present:', !!authHeader)
  logger.auth('Backend - Access token present:', !!accessToken)

  // Create Supabase client with user session
  const supabase = createSupabaseServerClient(accessToken)

  let user: User | GuestUser | null = null
  let session: any = null
  let isGuest = false

  // Try to get authenticated user session first
  if (accessToken) {
    try {
      // Try different approaches for getting user data
      let supabaseUser: any = null;
      let error: any = null;
      
      try {
        // Use type assertion to access auth methods
        const authClient = supabase.auth as any;
        if (authClient.getUser) {
          const result = await authClient.getUser();
          supabaseUser = result.data?.user;
          error = result.error;
        } else if (authClient.getSession) {
          const { data: { session } } = await authClient.getSession();
          supabaseUser = session?.user || null;
        }
      } catch (authError) {
        error = authError;
      }
      
      logger.auth('Backend - Supabase user lookup result:', { user: !!supabaseUser, error: !!error })
      
      if (!error && supabaseUser) {
        user = transformSupabaseUser(supabaseUser)
        // For server-side, we create a session object from the user data
        // since getSession() doesn't work the same way on server
        session = {
          user: supabaseUser,
          access_token: accessToken,
          // Add other session properties as needed
        }
        logger.auth('Backend - User authenticated:', user.email)
      }
    } catch (error) {
      logger.error('Error retrieving user session:', error)
    }
  }

  // If no authenticated user, check for guest session
  if (!user) {
    const guestSession = extractGuestSession(req)
    if (guestSession && isValidGuestSession(guestSession.sessionId)) {
      user = createGuestUserFromSession(guestSession.sessionId)
      isGuest = true
      logger.auth('Backend - Guest user created')
    }
  }

  logger.auth('Backend - Final context:', { 
    hasUser: !!user, 
    hasSession: !!session, 
    isGuest 
  })

  return {
    req,
    res,
    supabase: supabase as any, // Type assertion to handle interface mismatch
    user,
    session,
    isGuest,
  } as AuthContext & { req: any; res: any; isGuest: boolean }
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>>

// Initialize tRPC with context and enhanced error handling
const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        // Add additional error context for debugging
        timestamp: new Date().toISOString(),
        path: (error.cause && typeof error.cause === 'object' && 'path' in error.cause)
          ? (error.cause as any).path
          : 'unknown',
      },
    };
  },
});

// Enhanced error handling middleware
const errorHandlingMiddleware = t.middleware(({ next, path, type, input }) => {
  const start = Date.now();

  return next({
    onError: ({ error, path, input, type }) => {
      const duration = Date.now() - start;

      // Log error with context
      logger.error('tRPC Error:', {
        path,
        type,
        code: error.code,
        message: error.message,
        duration,
        input: type === 'mutation' ? '[REDACTED]' : input, // Don't log sensitive mutation data
      });

      // In development, log full error details
      if (process.env.NODE_ENV === 'development') {
        console.error('Full tRPC Error Details:', error);
      }
    },
    onSuccess: ({ path, type }) => {
      const duration = Date.now() - start;

      // Log successful operations (only in development to avoid noise)
      if (process.env.NODE_ENV === 'development') {
        logger.debug('tRPC Success:', { path, type, duration });
      }
    },
  });
});

// Export reusable router and procedure helpers
export const router = t.router
export const publicProcedure = t.procedure.use(errorHandlingMiddleware)

// Protected procedure that requires authentication with enhanced error handling
export const protectedProcedure = t.procedure
  .use(errorHandlingMiddleware)
  .use(({ ctx, next }) => {
    if (!ctx.user || !ctx.session || ctx.isGuest) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to access this resource',
        cause: {
          reason: 'missing_auth',
          hasUser: !!ctx.user,
          hasSession: !!ctx.session,
          isGuest: ctx.isGuest
        },
      });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user as User,
        session: ctx.session,
      },
    });
  })

// Procedure that works with both authenticated and guest users
export const flexibleProcedure = t.procedure
  .use(errorHandlingMiddleware)
  .use(({ ctx, next }) => {
    if (!ctx.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'You must have a session (authenticated or guest) to access this resource',
        cause: { reason: 'no_session' },
      });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
        isGuest: ctx.isGuest,
      },
    });
  });

// Guest-friendly procedure (allows access without any user session)
export const guestFriendlyProcedure = t.procedure
  .use(errorHandlingMiddleware)
  .use(({ ctx, next }) => {
    return next({
      ctx: {
        ...ctx,
        user: ctx.user || null,
        isGuest: ctx.isGuest || false,
      },
    });
  });
