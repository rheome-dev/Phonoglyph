# REST API Spec

The project will use tRPC, which does not follow the OpenAPI specification. The API is defined by the backend routers and consumed by a type-safe frontend client.

```typescript
// Example tRPC Router Definition (apps/api/src/routers/project.ts)
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';

export const projectRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({ name: z.string(), midiFilePath: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // ... logic to create a project in the database
    }),

  render: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      renderConfiguration: z.record(z.any()),
    }))
    .mutation(async ({ ctx, input }) => {
      // ... logic to place a job on the render queue
    }),
});
