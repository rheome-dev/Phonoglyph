import { httpLink, TRPCLink } from '@trpc/client';
import type { AppRouter } from '../../../api/src/routers';
import { supabase } from './supabase';
import { observable } from '@trpc/server/observable';

// Global session cache to avoid multiple calls
let sessionCache: any = null;
let sessionPromise: Promise<any> | null = null;

/**
 * Get session with caching to avoid multiple calls
 */
const getSession = async () => {
  if (sessionCache) {
    return sessionCache;
  }
  
  if (sessionPromise) {
    return sessionPromise;
  }
  
  sessionPromise = supabase.auth.getSession();
  const result = await sessionPromise;
  sessionCache = result.data.session;
  sessionPromise = null;
  return sessionCache;
};

/**
 * A TRPCLink that waits for the Supabase session to be loaded before
 * continuing with requests. This prevents race conditions on page load.
 */
const authLink: TRPCLink<AppRouter> = () => {
  return ({ next, op }) => {
    return observable((observer) => {
      const attemptRequest = async (retryCount = 0) => {
        try {
          const session = await getSession();
          
          // If no session and we haven't retried too many times, wait and retry
          if (!session && retryCount < 10) {
            setTimeout(() => attemptRequest(retryCount + 1), (retryCount + 1) * 200);
            return;
          }
          
          // Create headers object
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
          };
          
          // Add Authorization header if session exists
          if (session?.access_token) {
            headers['Authorization'] = `Bearer ${session.access_token}`;
          }
          
          const newOp = {
            ...op,
            context: {
              ...op.context,
              headers,
            },
          };
          
          next(newOp).subscribe(observer);
        } catch (error) {
          // If there's an error, still try to make the request without auth
          const newOp = { ...op, context: op.context };
          next(newOp).subscribe(observer);
        }
      };

      attemptRequest();

      return () => {};
    });
  };
};

// Clear session cache when auth state changes
supabase.auth.onAuthStateChange(() => {
  sessionCache = null;
  sessionPromise = null;
});

export const trpcLinks = [
  authLink,
  httpLink({
    url: 'http://localhost:3001/api/trpc',
    fetch: async (url, options) => {
      // Get the current session
      const session = await getSession();
      
      // Create headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options?.headers as Record<string, string> || {}),
      };
      
      // Add Authorization header if session exists
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      
      return fetch(url, { 
        ...(options || {}), 
        headers
      });
    }
  })
];