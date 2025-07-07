import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../../../api/src/routers';
import { trpcLinks } from './trpc-links';

// Create the tRPC React client for hooks
export const trpc = createTRPCReact<AppRouter>();

/**
 * We need a single TRPC client instance, which is used both for the React
 * hooks and for server-side usage.
 */
export const trpcClient = trpc.createClient({
  links: trpcLinks,
}); 