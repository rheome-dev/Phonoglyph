"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.guestRouter = void 0;
const trpc_1 = require("../trpc");
const guest_1 = require("../types/guest");
exports.guestRouter = (0, trpc_1.router)({
    // Get session info for any user type
    sessionInfo: trpc_1.guestFriendlyProcedure
        .query(({ ctx }) => {
        if (!ctx.user) {
            return {
                type: 'none',
                authenticated: false,
                isGuest: false,
                user: null,
            };
        }
        if (ctx.isGuest && (0, guest_1.isGuestUser)(ctx.user)) {
            const guestUser = ctx.user;
            return {
                type: 'guest',
                authenticated: false,
                isGuest: true,
                user: {
                    id: guestUser.id,
                    sessionId: guestUser.sessionId,
                    createdAt: guestUser.createdAt,
                },
                limitations: {
                    maxProjects: 3,
                    dataRetention: '7 days',
                    features: ['basic_upload', 'simple_visualization'],
                },
            };
        }
        const authUser = ctx.user;
        return {
            type: 'authenticated',
            authenticated: true,
            isGuest: false,
            user: {
                id: authUser.id,
                email: authUser.email,
                name: authUser.name,
            },
            limitations: null,
        };
    }),
    // Basic project operations for guests
    listProjects: trpc_1.flexibleProcedure
        .query(({ ctx }) => {
        if (ctx.isGuest) {
            return {
                projects: [],
                isGuest: true,
                message: 'Guest projects are stored locally. Sign up to save your work!',
                conversionPrompt: {
                    title: 'Save Your Work Forever',
                    description: 'Create an account to keep your projects safe and access them from any device.',
                    benefits: ['Unlimited projects', 'Cloud storage', 'Advanced features'],
                },
            };
        }
        // This part would fetch projects for authenticated users
        return {
            projects: [], // Replace with actual project fetching logic
            isGuest: false,
        };
    }),
});
//# sourceMappingURL=guest.js.map