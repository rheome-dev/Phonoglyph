"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const trpc_1 = require("../trpc");
exports.authRouter = (0, trpc_1.router)({
    // Get current session
    session: trpc_1.publicProcedure
        .query(({ ctx }) => {
        return {
            authenticated: !!ctx.user,
            user: ctx.user || null,
        };
    }),
    // Get current user details
    me: trpc_1.protectedProcedure
        .query(({ ctx }) => {
        return {
            user: ctx.user,
            session: !!ctx.session,
            authenticated: true,
        };
    }),
});
//# sourceMappingURL=auth.js.map