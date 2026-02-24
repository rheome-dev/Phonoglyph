# Coding Conventions

**Analysis Date:** 2026-02-24

## Naming Patterns

**Files:**
- React components: PascalCase (e.g., `Card.tsx`, `AuthGuard.tsx`, `FeatureNode.tsx`)
- Custom hooks: kebab-case with `use-` prefix (e.g., `use-auth.ts`, `use-upload.ts`, `use-audio-analysis.ts`)
- Utilities and services: camelCase (e.g., `logger.ts`, `utils.ts`, `auth-service.ts`)
- UI component directories: lowercase with hyphens (e.g., `/ui/glass-modal.tsx`, `/ui/droppable-parameter.tsx`)
- Test files: co-located with source, `.test.ts` or `.spec.ts` suffix (e.g., `protected-routes.test.tsx`)

**Functions:**
- camelCase for all functions: `getCurrentUser()`, `validateFile()`, `generateUploadUrl()`
- Async functions: same camelCase pattern, no async prefix
- Constructor functions: PascalCase (e.g., `createTRPCContext()`, `createGuestSession()`)
- Helper/utility functions: clearly descriptive, camelCase (e.g., `sanitizeFileName()`, `isExecutableFile()`)

**Variables:**
- camelCase for all variables: `uploadUrl`, `fileId`, `mockUser`, `debugEnabled`
- Boolean variables: prefixed with `is`, `has`, `should`, `can` (e.g., `isAuthenticated`, `hasError`, `shouldShowConversionPrompt`)
- Constants: camelCase (e.g., `BUCKET_NAME`, `DEBUG_ENABLED`, `PORT`)
- React component props objects: same camelCase (e.g., `isLoading`, `onSubmit`, `defaultValue`)

**Types:**
- Interfaces: PascalCase (e.g., `User`, `Project`, `AuthContext`, `UserProfile`)
- Type aliases: PascalCase (e.g., `type AuthUser = User | GuestUser`)
- Enum-like types: PascalCase with union literals (e.g., `type FileType = 'midi' | 'audio' | 'video'`)
- Schema validation objects: camelCase (e.g., `createProjectSchema`, `loginCredentialsSchema`)
- Zod schemas: PascalCase suffix with Schema (e.g., `FileUploadSchema`, `FileMetadataSchema`)

**Imports/Exports:**
- Named exports for types, interfaces, schemas (e.g., `export interface User { ... }`)
- Default exports for React components and page files
- Barrel files: use named exports (e.g., `export { Card, CardHeader, CardContent, ... }`)

## Code Style

**Formatting:**
- No explicit Prettier or ESLint config found in root
- Next.js app uses `next lint` (ESLint with Next.js preset)
- Backend API uses `eslint` with TypeScript support
- Manual formatting follows these patterns observed:
  - 2-space indentation
  - Semicolons required
  - Double quotes for strings
  - Trailing commas in multi-line objects/arrays

**Linting:**
- Frontend uses `eslint-config-next` (built-in ESLint preset for Next.js)
- Backend uses `@typescript-eslint/eslint-plugin` and `@typescript-eslint/parser`
- No custom ESLint rules file found - using defaults from presets
- Run linting via: `pnpm lint` (root) or `pnpm --filter @phonoglyph/web lint` / `pnpm --filter @phonoglyph/api lint`

**TypeScript Strictness:**
- Both apps use `strict: true` in tsconfig.json
- Additional strict checks enabled in API (`noImplicitAny: true`, `noImplicitReturns: true`, `noUncheckedIndexedAccess: true`, `noImplicitOverride: true`)
- Frontend uses `"jsx": "preserve"` for Next.js
- API uses `"module": "commonjs"` with `"outDir": "./dist"` for compiled output

## Import Organization

**Order:**
1. External packages (React, Next.js, third-party libraries)
2. Internal type imports (from shared types package or local interfaces)
3. Internal service/lib imports (utilities, auth services, API clients)
4. Relative component/hook imports
5. Style imports (CSS modules, Tailwind utility functions)

**Example (Frontend):**
```typescript
"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from 'phonoglyph-types'
import { AuthService } from '@/lib/auth'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
```

**Example (Backend):**
```typescript
import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'
import type { CreateExpressContextOptions } from '@trpc/server/adapters/express'
import { logger } from '../lib/logger'
```

**Path Aliases:**
- Frontend: `@/*` → `./src/*` (e.g., `@/lib/auth`, `@/components/ui/card`)
- Backend: `@/*` → `./src/*` (e.g., `@/routers/user`, `@/services/r2-storage`)

## Error Handling

**Patterns:**
- Frontend: try/catch with detailed error messages stored in state
  - Use `useAuth()` hook for auth errors
  - Store errors in component state: `const [error, setError] = useState<string | null>(null)`
  - Always provide user-friendly error messages

- Backend: tRPC errors using `TRPCError` from `@trpc/server`
  - Always include error code (e.g., `'BAD_REQUEST'`, `'INTERNAL_SERVER_ERROR'`, `'UNAUTHORIZED'`)
  - Include descriptive message for client handling
  - Pattern: `throw new TRPCError({ code: 'BAD_REQUEST', message: 'Description here' })`

- Database errors: Supabase returns `{ error }` in response, check before using data
  - Pattern: `const { error: dbError } = await ctx.supabase.from('table').insert(...)`
  - Log detailed error with `logger.error()`, throw user-friendly TRPCError

- Async errors: Always distinguish between Error types
  - Pattern: `catch (err) { const message = err instanceof Error ? err.message : 'Unknown error' }`

**Examples:**
```typescript
// Frontend error handling
try {
  setLoading(true)
  const currentUser = await AuthService.getCurrentUser()
  setUser(currentUser)
  setError(null)
} catch (err) {
  setError(err instanceof Error ? err.message : 'Failed to load user')
}

// Backend error handling
if (!uploadRateLimit.checkRateLimit(userId)) {
  throw new TRPCError({
    code: 'TOO_MANY_REQUESTS',
    message: 'Upload rate limit exceeded. Please wait before uploading more files.',
  })
}
```

## Logging

**Framework:** No dedicated logging library. Uses native `console` methods with conditional formatting.

**Backend Logging Utility:** `logger` from `@/lib/logger`
- `logger.log()` - General info (conditional on DEBUG_ENABLED)
- `logger.error()` - Always logged regardless of debug setting
- `logger.warn()` - Warnings (conditional)
- `logger.info()` - Info level (conditional)
- `logger.debug()` - Prefixed with '🔍' emoji (conditional)
- `logger.auth()` - Auth-related logs prefixed with '🔐' emoji (conditional)

**Frontend Logging Utility:** `debugLog` from `@/lib/utils`
- `debugLog.log()` - General logging (conditional on DEBUG_ENABLED)
- `debugLog.error()` - Always logged
- `debugLog.warn()` - Warnings (conditional)
- `debugLog.info()` - Info level (conditional)

**When to Log:**
- Backend: Log at entry/exit points for protected procedures, database operations, file uploads
- Frontend: Log user actions, authentication state changes, API errors
- Always log errors, never log in success-only paths
- Don't log sensitive data (passwords, tokens, personal details)

**Conditional Debug Logging:**
- Backend: `process.env.DEBUG_LOGGING === 'true'` in development
- Frontend: `process.env.NEXT_PUBLIC_DEBUG_LOGGING === 'true'` OR `window.__DEBUG_LOGGING__`
- Enable via: `DEBUG_LOGGING=true pnpm --filter @phonoglyph/api dev`
- Enable via: `NEXT_PUBLIC_DEBUG_LOGGING=true pnpm --filter @phonoglyph/web dev`

## Comments

**When to Comment:**
- Explain the "why" not the "what" - code should be clear, comments explain reasoning
- Document non-obvious algorithmic choices or workarounds
- Mark temporary solutions with `// TODO`, `// FIXME`, or `// HACK` comments
- Use JSDoc for exported functions and type definitions

**JSDoc/TSDoc:**
- Use for public API functions, services, hooks
- Include `@param` for parameters with type and description
- Include `@returns` for return type and description
- Example:
```typescript
/**
 * Validates file upload based on size, type, and extension.
 * @param input File metadata including name, size, mimeType
 * @returns ValidatedFile with isValid flag and any validation errors
 */
export function validateFile(input: FileUploadInput): ValidatedFile { ... }
```

**Inline Comments:**
- Use sparingly; prefer self-documenting code
- When used, keep them short and on the same line when possible
- Complex logic: add comment block above, not inline

## Function Design

**Size:** Functions should be small and focused (aim for single responsibility)
- Observed average: 20-50 lines for business logic
- Longer functions (100+ lines) are service implementations handling multiple steps (acceptable)

**Parameters:**
- Prefer object parameters for 3+ arguments to avoid confusion
- Always type parameters explicitly with TypeScript
- Optional parameters marked with `?` or use separate overloads

**Return Values:**
- Always specify return type explicitly (TypeScript strict mode)
- Use `Promise<T>` for async functions
- Return consistent types - don't mix `null` and `undefined` without reason
- Use tuples or objects for multiple return values: `{ user, error }` preferred over `[User, Error]`

**Example:**
```typescript
async function uploadFile(input: {
  fileName: string
  fileSize: number
  mimeType: string
}): Promise<{ fileId: string; uploadUrl: string }> {
  // implementation
}
```

## Module Design

**Exports:**
- One primary export per file when possible
- Multiple related exports allowed in UI component files (e.g., Card + CardHeader + CardContent)
- Barrel files use named exports for re-exporting (e.g., `export { Card, CardHeader, ... }`)

**Barrel Files:**
- Used in `/components/ui/` to export all UI components from one file
- Example: `cards.tsx` exports all Card-related components
- Pattern: collect imports then named export list

**Service Pattern:**
- Services are singleton-like or instantiated classes
- Example: `AuthService`, `MediaProcessor`, `AssetManager`
- Methods are static or instance methods depending on state needs
- Services handle external integrations (Supabase, R2 storage, FFmpeg)

**Hook Pattern:**
- Custom hooks follow React hooks conventions
- Return object with methods and state: `{ user, loading, error, refreshUser, signOut }`
- Use `useEffect` for side effects, cleanup subscriptions properly
- Example: `useAuth()` returns auth state and methods

---

*Convention analysis: 2026-02-24*
