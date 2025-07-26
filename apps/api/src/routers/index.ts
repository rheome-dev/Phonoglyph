import { router } from '../trpc';

// Core functionality routers
import { healthRouter } from './health';
import { authRouter } from './auth';
import { userRouter } from './user';
import { guestRouter } from './guest';

// Content management routers
import { projectRouter } from './project';
import { fileRouter } from './file';
import { midiRouter } from './midi';
import { stemRouter } from './stem';
import { autoSaveRouter } from './auto-save';

/**
 * Enhanced tRPC App Router
 * Organized by functional domains for better maintainability
 */
export const appRouter = router({
  // Core functionality - authentication, health, user management
  health: healthRouter,
  auth: authRouter,
  user: userRouter,
  guest: guestRouter,

  // Content management - projects, files, audio processing
  project: projectRouter,
  file: fileRouter,
  midi: midiRouter,
  stem: stemRouter,
  autoSave: autoSaveRouter,
});

export type AppRouter = typeof appRouter;