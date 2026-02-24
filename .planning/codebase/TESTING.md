# Testing Patterns

**Analysis Date:** 2026-02-24

## Test Framework

**Runner:**
- Vitest 3.2.4
- Config files: `apps/web/vitest.config.ts`, `apps/api/vitest.config.ts`

**Assertion Library:**
- Vitest built-in `expect()` API (compatible with Jest)
- Testing Library for React components (@testing-library/react 14.1.2)

**Run Commands:**
```bash
# Run all tests across workspaces
pnpm test

# Watch mode for specific workspace
pnpm --filter @phonoglyph/web test --watch
pnpm --filter @phonoglyph/api test --watch

# Coverage reports
pnpm --filter @phonoglyph/web test:coverage
pnpm --filter @phonoglyph/api test:coverage

# Run specific test file
pnpm --filter @phonoglyph/web test src/test/auth-service.test.ts
```

## Test File Organization

**Location:**
- Frontend: `src/test/` and `src/tests/` directories (both patterns exist in codebase)
- Backend: `src/test/` directory
- Structure recommendation: Use `src/test/` for all new tests

**Naming:**
- Unit tests: `<feature>.test.ts` or `<feature>.test.tsx`
- Integration tests: same naming, distinguished by file path
- Example files:
  - `src/test/protected-routes.test.tsx` (React component)
  - `src/test/trpc-auth.test.ts` (tRPC procedures)
  - `src/test/file-upload-integration.test.ts` (integration test)

**Structure:**
```
apps/
  web/
    src/
      test/
        basic.test.ts
        auth-service.test.ts
        protected-routes.test.tsx
        particle-audio-spawning.test.ts
  api/
    src/
      test/
        trpc-auth.test.ts
        file-upload-integration.test.ts
        r2-storage.test.ts
        database-security.test.ts
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest'

// Group related tests with describe()
describe('Feature Name', () => {
  // Setup before all tests
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Individual test case
  it('should do something specific', () => {
    expect(result).toBe(expected)
  })

  // Grouped sub-features
  describe('Sub-feature', () => {
    it('handles edge case', () => {
      expect(edge).toBeDefined()
    })
  })
})
```

**Patterns:**
- Setup: Use `beforeEach()` to reset mocks before each test
- Teardown: Use `afterAll()` for cleanup (e.g., closing database connections)
- Assertions: Always assert specific behavior, not just "no error thrown"
- Async: Use `async` in test function and `await` for async operations

**Frontend Test Example:**
```typescript
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { useRouter } from 'next/navigation'
import { AuthGuard } from '@/components/auth/auth-guard'
import { useAuth } from '@/hooks/use-auth'

// Mock Next.js hooks at module level
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
}))

vi.mock('@/hooks/use-auth', () => ({
  useAuth: vi.fn(),
}))

describe('AuthGuard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(useRouter as Mock).mockReturnValue({ push: vi.fn() })
  })

  it('shows loading spinner when authentication is loading', () => {
    ;(useAuth as Mock).mockReturnValue({
      user: null,
      loading: true,
    })

    render(<AuthGuard><div>Content</div></AuthGuard>)
    expect(screen.getByTestId('auth-loading-spinner')).toBeInTheDocument()
  })

  it('renders children when user is authenticated', async () => {
    ;(useAuth as Mock).mockReturnValue({
      user: { id: '1', email: 'test@example.com' },
      loading: false,
    })

    render(<AuthGuard><div>Protected Content</div></AuthGuard>)

    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeInTheDocument()
    })
  })
})
```

**Backend Test Example:**
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { appRouter } from '../routers'

describe('tRPC Authentication Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Public Procedures', () => {
    it('should allow health check without authentication', async () => {
      const caller = appRouter.createCaller({
        req: {},
        res: {},
        supabase: {},
        user: null,
        session: null,
        isGuest: false,
      })

      const result = await caller.health.check()
      expect(result.status).toBe('healthy')
    })
  })

  describe('Protected Procedures', () => {
    it('should reject without authentication', async () => {
      const caller = appRouter.createCaller({
        req: {},
        res: {},
        supabase: {},
        user: null,
        session: null,
        isGuest: false,
      })

      await expect(caller.auth.me()).rejects.toThrow('You must be logged in')
    })

    it('should allow with authentication', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      }

      const caller = appRouter.createCaller({
        req: {},
        res: {},
        supabase: {},
        user: mockUser,
        session: { access_token: 'test-token' },
        isGuest: false,
      })

      const result = await caller.auth.me()
      expect(result.user).toEqual(mockUser)
    })
  })
})
```

## Mocking

**Framework:** Vitest `vi` API (Jest-compatible)

**Patterns:**

1. **Module Mocking:**
```typescript
// At top of test file, before imports that use the mocked module
vi.mock('@/lib/auth', () => ({
  AuthService: {
    getCurrentUser: vi.fn(),
    signOut: vi.fn(),
  },
}))
```

2. **Function Mocking:**
```typescript
const mockFn = vi.fn()
mockFn.mockReturnValue('value')
mockFn.mockResolvedValue({ data: 'async result' })
mockFn.mockRejectedValue(new Error('failed'))
mockFn.mockImplementation((arg) => arg * 2)

// Check calls
expect(mockFn).toHaveBeenCalled()
expect(mockFn).toHaveBeenCalledWith('argument')
expect(mockFn).toHaveBeenCalledTimes(2)
```

3. **React Hook Mocking:**
```typescript
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
}))

// Reset and configure per test
beforeEach(() => {
  ;(useRouter as Mock).mockReturnValue({
    push: vi.fn(),
    back: vi.fn(),
  })
})
```

4. **Window/Global Mocking:**
```typescript
// In setup.ts or per test
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000',
    pathname: '/',
  },
  writable: true,
})

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })),
})
```

**What to Mock:**
- External dependencies (APIs, databases)
- Browser APIs that don't work in test environment (window.location, matchMedia)
- Next.js hooks (useRouter, useSearchParams)
- Auth services
- Do NOT mock internal components unless testing in isolation

**What NOT to Mock:**
- Zod validation schemas
- Utility functions (cn, validators)
- Custom hooks (call them directly)
- Component prop callbacks (use spy instead: `vi.spyOn()`)

## Fixtures and Factories

**Test Data:**
```typescript
// Mock user for consistent test data
const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  image: undefined,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
}

// Mock Supabase client for integration testing
const mockSupabase = {
  from: vi.fn().mockReturnValue({
    insert: vi.fn().mockResolvedValue({ error: null }),
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'file_123' },
          error: null,
        }),
      }),
    }),
    delete: vi.fn().mockResolvedValue({ error: null }),
    update: vi.fn().mockResolvedValue({ error: null }),
  }),
}

// Mock tRPC context
const mockContext = {
  req: {},
  res: {},
  supabase: mockSupabase,
  user: mockUser,
  session: { access_token: 'mock-token' },
  isGuest: false,
}
```

**Location:**
- Simple fixtures: Defined in test file at top, before describe()
- Reusable fixtures: Consider creating `src/test/fixtures/` directory
- Factory functions: Not currently used, but pattern would be:
```typescript
// fixtures/user.factory.ts
export function createMockUser(overrides = {}) {
  return { id: 'default-id', email: 'default@test.com', ...overrides }
}
```

## Setup Files

**Frontend Setup:** `apps/web/src/test/setup.ts`
- Imports `@testing-library/jest-dom` for extended matchers
- Mocks window.location
- Mocks window.matchMedia
- Mocks ResizeObserver
- Makes React globally available for JSX

**Backend Setup:** No global setup file (not required for API testing)

## Coverage

**Requirements:** No coverage threshold enforced in config
- Target: Aim for 80%+ coverage on critical paths (auth, file upload, validation)
- Not all code needs 100% coverage (setup files, error pages can be lower)

**View Coverage:**
```bash
pnpm --filter @phonoglyph/web test:coverage
pnpm --filter @phonoglyph/api test:coverage

# Opens HTML report in coverage/ directory
# View at: coverage/index.html
```

## Test Types

**Unit Tests:**
- Scope: Single function or component in isolation
- Approach: Mock all dependencies, test behavior with various inputs
- Location: `src/test/` with function name (e.g., `validateFile.test.ts`, `card.test.tsx`)
- Example: Testing `validateFile()` function with valid/invalid inputs

**Integration Tests:**
- Scope: Multiple components/functions working together
- Approach: Mock external services (APIs, databases) but test integration between layers
- Location: `src/test/` with "-integration" suffix (e.g., `file-upload-integration.test.ts`)
- Example: Testing upload flow from form input through API call to database

**E2E Tests:**
- Framework: Not currently implemented
- Would use: Playwright or Cypress
- Not detected in current codebase
- If needed, create `apps/web/tests/e2e/` directory

**Component Tests:**
- Approach: Use React Testing Library, test user behavior not implementation
- Pattern: Render component, simulate user actions, assert on DOM state
- Example: `protected-routes.test.tsx` tests component renders/redirects based on auth state
- Use `screen` queries: `screen.getByText()`, `screen.getByTestId()`, `screen.getByRole()`

## Common Patterns

**Async Testing:**
```typescript
// Wait for async operations
it('loads user data', async () => {
  ;(useAuth as Mock).mockReturnValue({
    user: { id: '1' },
    loading: false,
  })

  render(<Dashboard />)

  // Wait for element to appear (handles async updates)
  await waitFor(() => {
    expect(screen.getByText('User Data')).toBeInTheDocument()
  })
})

// Test async function
it('uploads file successfully', async () => {
  const result = await uploadFile({ fileName: 'test.mid', ... })
  expect(result.uploadUrl).toBeDefined()
})
```

**Error Testing:**
```typescript
// Test error handling
it('handles upload errors gracefully', async () => {
  ;(useUpload as Mock).mockImplementation(() => {
    throw new Error('Upload failed')
  })

  const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

  render(<UploadComponent />)

  await waitFor(() => {
    expect(consoleSpy).toHaveBeenCalledWith('Upload error:', expect.any(Error))
  })

  consoleSpy.mockRestore()
})

// Test error thrown from procedure
it('throws on invalid input', async () => {
  const caller = appRouter.createCaller(mockContext)

  await expect(
    caller.file.getUploadUrl({
      fileName: 'test.txt',
      fileSize: 1024,
      mimeType: 'text/plain',
    })
  ).rejects.toThrow('File validation failed')
})
```

**Spy Testing (without full mock):**
```typescript
// Spy on module method without replacing
const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

// Component under test
render(<Component />)

// Check it was called
expect(consoleSpy).toHaveBeenCalledWith('error message')

// Clean up
consoleSpy.mockRestore()
```

**Multiple Mocks in One Test:**
```typescript
it('handles multiple async operations', async () => {
  ;(useAuth as Mock).mockReturnValue({
    user: mockUser,
    loading: false,
  })
  ;(useRouter as Mock).mockReturnValue({
    push: vi.fn(),
  })

  const { rerender } = render(<Component />)

  // Test initial state
  expect(screen.getByText('Authenticated')).toBeInTheDocument()

  // Change mock
  ;(useAuth as Mock).mockReturnValue({
    user: null,
    loading: false,
  })
  rerender(<Component />)

  // Test after state change
  expect(screen.getByText('Not Authenticated')).toBeInTheDocument()
})
```

## Current Test Coverage

**Frontend Tests:** Located in `apps/web/src/test/`
- `basic.test.ts` - Sanity check test
- `auth-service.test.ts` - Auth service tests
- `protected-routes.test.tsx` - AuthGuard component tests
- `supabase-connection.test.ts` - Database connection verification
- `particle-audio-spawning.test.ts` - Audio feature testing

**Backend Tests:** Located in `apps/api/src/test/`
- `trpc-auth.test.ts` - tRPC auth procedures and middleware
- `file-upload-integration.test.ts` - File upload flow
- `r2-storage.test.ts` - Cloud storage operations
- `database-security.test.ts` - Database RLS and security
- `database-schema.test.ts` - Schema validation
- `midi-parser.test.ts` - MIDI file parsing
- `file-validation.test.ts` - File validation rules
- `asset-management.test.ts` - Asset lifecycle management

---

*Testing analysis: 2026-02-24*
