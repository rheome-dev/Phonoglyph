import { router } from '../trpc';
import { healthRouter } from './health';
import { guestRouter } from './guest';
import { authRouter } from './auth';
import { userRouter } from './user';
import { projectRouter } from './project';
import { fileRouter } from './file';
import { midiRouter } from './midi';
import { stemRouter } from './stem';
import { autoSaveRouter } from './auto-save';
import { audioAnalysisSandboxRouter } from './audio-analysis-sandbox';
import { assetRouter } from './asset';
import { renderRouter } from './render';

export const appRouter = router({
  health: healthRouter,
  auth: authRouter,
  user: userRouter,
  guest: guestRouter,
  project: projectRouter,
  file: fileRouter,
  asset: assetRouter,
  midi: midiRouter,
  stem: stemRouter,
  autoSave: autoSaveRouter,
  audioAnalysisSandbox: audioAnalysisSandboxRouter,
  render: renderRouter,
});

export type AppRouter = typeof appRouter; 