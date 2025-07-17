import { initTRPC, TRPCError } from '@trpc/server'
import type { CreateExpressContextOptions } from '@trpc/server/adapters/express'
import { z } from 'zod'
import { createSupabaseServerClient } from './lib/supabase'
import { transformSupabaseUser, type User, type AuthContext } from './types/auth'
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
      const { data: { user: supabaseUser }, error } = await supabase.auth.getUser()
      
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
    supabase,
    user,
    session,
    isGuest,
  } as AuthContext & { req: any; res: any; isGuest: boolean }
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>>

// Initialize tRPC with context
const t = initTRPC.context<Context>().create()

// Export reusable router and procedure helpers
export const router = t.router
export const publicProcedure = t.procedure

// Protected procedure that requires authentication
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user || !ctx.session || ctx.isGuest) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource',
    })
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user as User,
      session: ctx.session,
    },
  })
})

// Procedure that works with both authenticated and guest users
export const flexibleProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must have a session (authenticated or guest) to access this resource',
    })
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      isGuest: ctx.isGuest,
    },
  })
})

// Guest-friendly procedure (allows access without any user session)
export const guestFriendlyProcedure = t.procedure.use(({ ctx, next }) => {
  return next({
    ctx: {
      ...ctx,
      user: ctx.user || null,
      isGuest: ctx.isGuest || false,
    },
  })
})
