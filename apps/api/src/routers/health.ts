import { router, publicProcedure } from '../trpc';

export const healthRouter = router({
  check: publicProcedure
    .query(() => {
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        message: 'tRPC server is running! 🚀'
      }
    }),
}); 