"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.guestFriendlyProcedure = exports.flexibleProcedure = exports.protectedProcedure = exports.publicProcedure = exports.router = exports.createTRPCContext = void 0;
const server_1 = require("@trpc/server");
const supabase_1 = require("./lib/supabase");
const auth_1 = require("./types/auth");
const guest_1 = require("./types/guest");
// Create tRPC context with Supabase authentication and guest support for Express
const createTRPCContext = async (opts) => {
    const { req, res } = opts;
    // Debug all headers
    console.log('🔍 Backend - All headers:', req.headers);
    console.log('🔍 Backend - Authorization header:', req.headers.authorization);
    console.log('🔍 Backend - Content-Type header:', req.headers['content-type']);
    // Extract authorization header
    const authHeader = req.headers.authorization;
    const accessToken = authHeader?.replace('Bearer ', '');
    console.log('🔐 Backend - Auth header present:', !!authHeader);
    console.log('🔐 Backend - Access token present:', !!accessToken);
    // Create Supabase client with user session
    const supabase = (0, supabase_1.createSupabaseServerClient)(accessToken);
    let user = null;
    let session = null;
    let isGuest = false;
    // Try to get authenticated user session first
    if (accessToken) {
        try {
            const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(accessToken);
            console.log('🔐 Backend - Supabase user lookup result:', { user: !!supabaseUser, error: !!error });
            if (!error && supabaseUser) {
                user = (0, auth_1.transformSupabaseUser)(supabaseUser);
                // For server-side, we create a session object from the user data
                // since getSession() doesn't work the same way on server
                session = {
                    user: supabaseUser,
                    access_token: accessToken,
                    // Add other session properties as needed
                };
                console.log('🔐 Backend - User authenticated:', user.email);
            }
        }
        catch (error) {
            console.error('Error retrieving user session:', error);
        }
    }
    // If no authenticated user, check for guest session
    if (!user) {
        const guestSession = (0, guest_1.extractGuestSession)(req);
        if (guestSession && (0, guest_1.isValidGuestSession)(guestSession.sessionId)) {
            user = (0, guest_1.createGuestUserFromSession)(guestSession.sessionId);
            isGuest = true;
            console.log('🔐 Backend - Guest user created');
        }
    }
    console.log('🔐 Backend - Final context:', {
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