"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.guestFriendlyProcedure = exports.flexibleProcedure = exports.protectedProcedure = exports.publicProcedure = exports.router = exports.createTRPCContext = void 0;
const server_1 = require("@trpc/server");
const supabase_1 = require("./lib/supabase");
const phonoglyph_types_1 = require("phonoglyph-types");
const guest_1 = require("./types/guest");
const api_key_1 = require("./services/api-key");
const logger_1 = require("./lib/logger");
// Create tRPC context with Supabase authentication, API key auth, and guest support for Express
const createTRPCContext = async (opts) => {
    const { req, res } = opts;
    // Debug all headers
    logger_1.logger.debug('Backend - All headers:', req.headers);
    logger_1.logger.debug('Backend - Authorization header:', req.headers?.authorization);
    logger_1.logger.debug('Backend - Content-Type header:', req.headers?.['content-type']);
    // Extract authorization header
    const authHeader = req.headers?.authorization;
    const accessToken = authHeader?.replace('Bearer ', '');
    // Extract API key header
    const apiKey = req.headers?.['x-api-key'];
    logger_1.logger.auth('Backend - Auth header present:', !!authHeader);
    logger_1.logger.auth('Backend - Access token present:', !!accessToken);
    logger_1.logger.auth('Backend - API key present:', !!apiKey);
    let user = null;
    let session = null;
    let isGuest = false;
    let supabase = (0, supabase_1.createSupabaseServerClient)(accessToken);
    // Priority 1: API Key authentication (for CLI/programmatic access)
    if (apiKey) {
        const apiKeyResult = await (0, api_key_1.validateApiKey)(apiKey);
        if (apiKeyResult) {
            // Look up user via admin client
            const { data: { user: supabaseUser }, error } = await supabase_1.supabaseAdmin.auth.admin.getUserById(apiKeyResult.userId);
            if (!error && supabaseUser) {
                user = (0, phonoglyph_types_1.transformSupabaseUser)(supabaseUser);
                // Use admin client for API key sessions (no user token available)
                supabase = supabase_1.supabaseAdmin;
                session = {
                    user: supabaseUser,
                    access_token: 'api-key-session',
                    apiKeyScopes: apiKeyResult.scopes,
                };
                logger_1.logger.auth('Backend - User authenticated via API key:', user.email);
            }
        }
    }
    // Priority 2: Supabase Bearer token authentication
    if (!user && accessToken) {
        try {
            // Try different approaches for getting user data
            let supabaseUser = null;
            let error = null;
            try {
                // Use type assertion to access auth methods
                const authClient = supabase.auth;
                if (authClient.getUser) {
                    const result = await authClient.getUser();
                    supabaseUser = result.data?.user;
                    error = result.error;
                }
                else if (authClient.getSession) {
                    const { data: { session } } = await authClient.getSession();
                    supabaseUser = session?.user || null;
                }
            }
            catch (authError) {
                error = authError;
            }
            logger_1.logger.auth('Backend - Supabase user lookup result:', { user: !!supabaseUser, error: !!error });
            if (!error && supabaseUser) {
                user = (0, phonoglyph_types_1.transformSupabaseUser)(supabaseUser);
                // For server-side, we create a session object from the user data
                // since getSession() doesn't work the same way on server
                session = {
                    user: supabaseUser,
                    access_token: accessToken,
                    // Add other session properties as needed
                };
                logger_1.logger.auth('Backend - User authenticated:', user.email);
            }
        }
        catch (error) {
            logger_1.logger.error('Error retrieving user session:', error);
        }
    }
    // Priority 3: Guest session
    if (!user) {
        const guestSession = (0, guest_1.extractGuestSession)(req);
        if (guestSession && (0, guest_1.isValidGuestSession)(guestSession.sessionId)) {
            user = (0, guest_1.createGuestUserFromSession)(guestSession.sessionId);
            isGuest = true;
            logger_1.logger.auth('Backend - Guest user created');
        }
    }
    logger_1.logger.auth('Backend - Final context:', {
        hasUser: !!user,
        hasSession: !!session,
        isGuest
    });
    return {
        req,
        res,
        supabase,
        user,
        session,
        isGuest,
    };
};
exports.createTRPCContext = createTRPCContext;
// Initialize tRPC with context
const t = server_1.initTRPC.context().create();
// Export reusable router and procedure helpers
exports.router = t.router;
exports.publicProcedure = t.procedure;
// Protected procedure that requires authentication
exports.protectedProcedure = t.procedure.use(({ ctx, next }) => {
    if (!ctx.user || !ctx.session || ctx.isGuest) {
        throw new server_1.TRPCError({
            code: 'UNAUTHORIZED',
            message: 'You must be logged in to access this resource',
        });
    }
    return next({
        ctx: {
            ...ctx,
            user: ctx.user,
            session: ctx.session,
        },
    });
});
// Procedure that works with both authenticated and guest users
exports.flexibleProcedure = t.procedure.use(({ ctx, next }) => {
    if (!ctx.user) {
        throw new server_1.TRPCError({
            code: 'UNAUTHORIZED',
            message: 'You must have a session (authenticated or guest) to access this resource',
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
exports.guestFriendlyProcedure = t.procedure.use(({ ctx, next }) => {
    return next({
        ctx: {
            ...ctx,
            user: ctx.user || null,
            isGuest: ctx.isGuest || false,
        },
    });
});
//# sourceMappingURL=trpc.js.map