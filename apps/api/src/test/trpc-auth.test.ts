import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTRPCContext, appRouter } from '../trpc'
import type { CreateExpressContextOptions } from '@trpc/server/adapters/express'

// Mock Supabase
vi.mock('../lib/supabase', () => ({
  createSupabaseServerClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(),
      getSession: vi.fn(),
    },
  })),
}))

describe('tRPC Authentication Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createTRPCContext', () => {
    it('should create context without user when no auth header', async () => {
      const mockOpts: CreateExpressContextOptions = {
        req: {
          headers: {},
        } as any,
        res: {} as any,
      }

      const context = await createTRPCContext(mockOpts)

      expect(context.user).toBeNull()
      expect(context.session).toBeNull()
      expect(context.supabase).toBeDefined()
    })

    it('should create context with user when valid auth header', async () => {
      const { createSupabaseServerClient } = await import('../lib/supabase')
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: 'user-123',
                email: 'test@example.com',
                user_metadata: { name: 'Test User' },
                created_at: '2023-01-01T00:00:00Z',
                updated_at: '2023-01-01T00:00:00Z',
              },
            },
            error: null,
          }),
          getSession: vi.fn().mockResolvedValue({
            data: { session: { access_token: 'test-token' } },
            error: null,
          }),
        },
      }
      ;(createSupabaseServerClient as any).mockReturnValue(mockSupabase)

      const mockOpts: CreateExpressContextOptions = {
        req: {
          headers: {
            authorization: 'Bearer test-token',
          },
        } as any,
        res: {} as any,
      }

      const context = await createTRPCContext(mockOpts)

      expect(context.user).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        image: undefined,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      })
      expect(context.session).toEqual({ access_token: 'test-token' })
    })
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
      expect(result.message).toContain('tRPC server is running!')
    })

    it('should allow greeting without authentication', async () => {
      const caller = appRouter.createCaller({
        req: {},
        res: {},
        supabase: {},
        user: null,
        session: null,
        isGuest: false,
      })

      const result = await caller.greeting({ name: 'Test' })

      expect(result.message).toContain('Hello Test from tRPC!')
      expect(result.authenticated).toBe(false)
    })

    it('should return session info for unauthenticated user', async () => {
      const caller = appRouter.createCaller({
        req: {},
        res: {},
        supabase: {},
        user: null,
        session: null,
        isGuest: false,
      })

      const result = await caller.auth.session()

      expect(result.authenticated).toBe(false)
      expect(result.user).toBeNull()
    })
  })

  describe('Protected Procedures', () => {
    it('should reject protected procedures without authentication', async () => {
      const caller = appRouter.createCaller({
        req: {},
        res: {},
        supabase: {},
        user: null,
        session: null,
        isGuest: false,
      })

      await expect(caller.auth.me()).rejects.toThrow('You must be logged in to access this resource')
    })

    it('should allow protected procedures with authentication', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        image: undefined,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
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
      expect(result.authenticated).toBe(true)
    })

    it('should return user profile for authenticated user', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        image: 'https://example.com/avatar.jpg',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      }

      const caller = appRouter.createCaller({
        req: {},
        res: {},
        supabase: {},
        user: mockUser,
        session: { access_token: 'test-token' },
        isGuest: false,
      })

      const result = await caller.user.profile()

      expect(result.id).toBe('user-123')
      expect(result.display_name).toBeDefined()
      expect(result.avatar_url).toBeDefined()
    })
  })
}) 