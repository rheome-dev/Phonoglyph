import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AuthService } from '../lib/auth'

// Mock Supabase client with any types to avoid complex type matching
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signInWithOAuth: vi.fn(),
      getUser: vi.fn(),
      getSession: vi.fn(),
      signOut: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
    },
  },
}))

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('signUpWithEmail', () => {
    it('should sign up user with email and password', async () => {
      const mockResponse = { 
        data: { user: { id: '123' }, session: null }, 
        error: null 
      }
      const { supabase } = await import('../lib/supabase')
      ;(supabase.auth.signUp as any).mockResolvedValue(mockResponse)

      const credentials = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      }

      const result = await AuthService.signUpWithEmail(credentials)

      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: {
          data: {
            name: 'Test User',
          },
        },
      })
      expect(result).toEqual(mockResponse.data)
    })

    it('should throw error on signup failure', async () => {
      const mockResponse = { 
        data: { user: null, session: null }, 
        error: { message: 'Signup failed' } 
      }
      const { supabase } = await import('../lib/supabase')
      ;(supabase.auth.signUp as any).mockResolvedValue(mockResponse)

      const credentials = {
        email: 'test@example.com',
        password: 'password123'
      }

      await expect(AuthService.signUpWithEmail(credentials))
        .rejects
        .toThrow('Signup failed')
    })
  })

  describe('signInWithEmail', () => {
    it('should sign in user with email and password', async () => {
      const mockResponse = { 
        data: { user: { id: '123' }, session: {} }, 
        error: null 
      }
      const { supabase } = await import('../lib/supabase')
      ;(supabase.auth.signInWithPassword as any).mockResolvedValue(mockResponse)

      const credentials = {
        email: 'test@example.com',
        password: 'password123'
      }

      const result = await AuthService.signInWithEmail(credentials)

      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })
      expect(result).toEqual(mockResponse.data)
    })
  })

  describe('signInWithOAuth', () => {
    it('should initiate OAuth sign in', async () => {
      const mockResponse = { 
        data: { provider: 'google', url: 'https://oauth-url.com' }, 
        error: null 
      }
      const { supabase } = await import('../lib/supabase')
      ;(supabase.auth.signInWithOAuth as any).mockResolvedValue(mockResponse)

      // Mock window.location.origin for Node environment
      Object.defineProperty(global, 'window', {
        value: {
          location: { origin: 'http://localhost:3000' }
        },
        writable: true,
      })

      const authProvider = {
        provider: 'google' as const,
        redirectTo: 'http://localhost:3000/dashboard'
      }

      const result = await AuthService.signInWithOAuth(authProvider)

      expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: 'http://localhost:3000/dashboard',
        },
      })
      expect(result).toEqual(mockResponse.data)
    })
  })

  describe('getCurrentUser', () => {
    it('should return formatted user data', async () => {
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        user_metadata: { name: 'Test User' },
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        app_metadata: {},
        aud: 'authenticated',
      }
      const mockResponse = {
        data: { user: mockUser },
        error: null
      }
      const { supabase } = await import('../lib/supabase')
      ;(supabase.auth.getUser as any).mockResolvedValue(mockResponse)

      const result = await AuthService.getCurrentUser()

      expect(result).toEqual({
        id: '123',
        email: 'test@example.com',
        user_metadata: { name: 'Test User' },
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      })
    })

    it('should return null when no user', async () => {
      const mockResponse = { data: { user: null }, error: null }
      const { supabase } = await import('../lib/supabase')
      ;(supabase.auth.getUser as any).mockResolvedValue(mockResponse)

      const result = await AuthService.getCurrentUser()

      expect(result).toBeNull()
    })
  })
}) 