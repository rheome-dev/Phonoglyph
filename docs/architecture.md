# MidiViz Fullstack Architecture Document

## Introduction

This document outlines the complete fullstack architecture for MidiViz, including backend systems, frontend implementation, and their integration. It serves as the single source of truth for AI-driven development, ensuring consistency across the entire technology stack. This unified approach combines what would traditionally be separate backend and frontend architecture documents, streamlining the development process for modern fullstack applications where these concerns are increasingly intertwined.

### Starter Template or Existing Project

N/A - Greenfield project

### Change Log

| Date       | Version | Description     | Author    |
| :--------- | :------ | :-------------- | :-------- |
| 2025-06-25 | 1.0     | Initial Draft | Architect |

## Architectural Patterns

* **Jamstack Architecture:** Static site generation with serverless APIs for optimal performance and scalability.
* **Component-Based UI:** Reusable React components with TypeScript for maintainability and type safety.
* **API Gateway Pattern:** A single entry point for all API calls to handle centralized auth, rate limiting, and routing.
* **Message Queue Pattern:** Decouples the API from the video processing service, enabling resilience and independent scaling.
* **Pub/Sub Pattern:** Used via Redis to push real-time render progress updates to the client without polling.

## Tech Stack

### Technology Stack Table

| Category               | Technology                  | Version | Purpose                               | Rationale                             |
| :--------------------- | :-------------------------- | :------ | :------------------------------------ | :------------------------------------ |
| **Frontend Language** | TypeScript                  | 5.3.3   | Type-safe frontend development        | Strong typing, excellent tooling      |
| **Frontend Framework** | Next.js                     | 14.1.0  | React framework with SSR/SSG          | SEO, performance, Vercel integration  |
| **UI Component Library** | Tailwind CSS + shadcn/ui      | latest  | Utility-first styling & components    | Rapid development, consistent design  |
| **State Management** | Zustand                     | 4.5.2   | Minimal client-side state management  | Simplicity and performance            |
| **Backend Language** | TypeScript                  | 5.3.3   | Type-safe backend development         | Code sharing with frontend            |
| **Backend Framework** | Express.js                  | 4.18.2  | Backend web framework                 | Simplicity, performance, wide ecosystem |
| **API Style** | tRPC                        | 10.45.2 | Type-safe API communication           | End-to-end type safety client/server  |
| **Database** | PostgreSQL (Supabase)       | 16.1    | Managed relational data store         | ACID compliance, built-in auth, managed |
| **File Storage** | AWS S3                      | N/A     | User file uploads and rendered videos | Scalability, reliability, security    |
| **Authentication** | Supabase Auth               | latest  | User authentication & database        | Ease of use, security, novice-friendly |
| **Frontend Testing** | Vitest + React Testing Library| latest  | Component and unit testing            | Speed, simplicity, modern features    |
| **Backend Testing** | Vitest                      | latest  | Unit and integration testing          | Consistent test framework across stack |
| **E2E Testing** | Playwright                  | 1.42.1  | End-to-end browser testing            | Reliability, speed, cross-browser     |
| **CI/CD** | GitHub Actions              | N/A     | Continuous integration & deployment | Native integration with GitHub repo   |

## Data Models

### User

* **Purpose:** Represents authenticated users in the system (managed by Supabase Auth).
* **TypeScript Interface:**
    ```typescript
    interface User {
      id: string; // UUID from Supabase auth.users
      email: string;
      user_metadata: {
        name?: string;
        avatar_url?: string;
      };
      created_at: string; // ISO timestamp
      updated_at: string; // ISO timestamp
    }
    ```

### Project

* **Purpose:** Represents a user's visualization project.
* **TypeScript Interface:**
    ```typescript
    interface Project {
      id: string;
      userId: string;
      name: string;
      midiFilePath: string;
      audioFilePath?: string;
      userVideoPath?: string; // For overlay mode
      renderConfiguration: Record<string, any>; // JSONB field
      createdAt: Date;
      updatedAt: Date;
    }
    ```

## REST API Spec

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

## Database Schema

```sql
-- Authentication Tables (Managed by Supabase)
-- Supabase automatically manages authentication tables in the 'auth' schema:
-- - auth.users (user authentication data)
-- - auth.sessions (session management)
-- - auth.refresh_tokens (token refresh handling)

-- Projects Table
CREATE TABLE "projects" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "user_id" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "midi_file_path" TEXT NOT NULL,
  "audio_file_path" TEXT,
  "user_video_path" TEXT,
  "render_configuration" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

## Unified Project Structure

```plaintext
midiviz-monorepo/
├── apps/
│   ├── web/                    # Next.js Frontend
│   │   ├── src/
│   │   │   ├── app/            # Next.js App Router
│   │   │   ├── components/
│   │   │   ├── lib/            # Utilities, helpers
│   │   │   └── server/         # tRPC client, server actions
│   │   └── package.json
│   └── api/                    # Express.js Backend
│       ├── src/
│       │   ├── routers/        # tRPC routers
│       │   ├── services/       # Business logic (e.g., queue service)
│       │   └── trpc.ts         # tRPC main configuration
│       └── package.json
├── packages/
│   ├── config/                 # Shared configs (ESLint, TSConfig)
│   └── ui/                     # Shared UI components (optional)
└── package.json                # Root package.json with workspaces

## Security and Performance

### Security Requirements

* **Authentication**: All user-specific endpoints must be protected procedures.
* **File Uploads**: All uploaded files must be scanned and validated on the backend before processing.
* **Content Access**: All user content in S3 will be accessed exclusively through short-lived pre-signed URLs.

### Performance Optimization

* **Frontend**: Leverage Next.js for server-side rendering (SSR) of initial pages and client-side navigation for speed.
* **Backend**: The API will be stateless for horizontal scaling. The rendering process is offloaded to a separate, scalable service.
* **Database**: Utilize read replicas for the PostgreSQL database if read traffic becomes a bottleneck.

## Error Handling Strategy

A standardized error format will be used for all API responses. For render jobs, detailed failure reasons will be communicated back to the client via the WebSocket `RenderProgressMessage`. All backend errors will be logged with a correlation ID (the `jobId` for renders) to simplify support and debugging.

## Testing Strategy

* **Frontend**: Unit tests for components and utilities using Vitest. E2E tests for critical user flows (upload, edit, render) using Playwright.
* **Backend**: Unit tests for services and routers using Vitest. Integration tests will connect to a test database to verify database interactions.