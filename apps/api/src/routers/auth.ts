import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';

export const authRouter = router({
  // Get current session
  session: publicProcedure
    .query(({ ctx }) => {
      return {
        authenticated: !!ctx.user,
        user: ctx.user || null,
      };
    }),

  // Get current user details
  me: protectedProcedure
    .query(({ ctx }) => {
      return {
        user: ctx.user,
        session: !!ctx.session,
        authenticated: true,
      };
    }),
}); 