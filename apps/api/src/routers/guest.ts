import { router, guestFriendlyProcedure, flexibleProcedure } from '../trpc';
import { isGuestUser, type GuestUser } from '../types/guest';
import type { User } from 'raybox-types';

export const guestRouter = router({
    // Get session info for any user type
    sessionInfo: guestFriendlyProcedure
      .query(({ ctx }) => {
        if (!ctx.user) {
          return {
            type: 'none',
            authenticated: false,
            isGuest: false,
            user: null,
          }
        }
  
        if (ctx.isGuest && isGuestUser(ctx.user)) {
           const guestUser = ctx.user as GuestUser;
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
          }
        }
  
        const authUser = ctx.user as User
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
        }
      }),
  
    // Basic project operations for guests
    listProjects: flexibleProcedure
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
          }
        }
  
        // This part would fetch projects for authenticated users
        return {
            projects: [], // Replace with actual project fetching logic
            isGuest: false,
        }
      }),
}); 