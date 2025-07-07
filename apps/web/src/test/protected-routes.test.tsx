import { describe, it, expect, vi, beforeEach, Mock } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AuthGuard } from '@/components/auth/auth-guard'
import { useAuth } from '@/hooks/use-auth'

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
}))

// Mock auth hook
vi.mock('@/hooks/use-auth', () => ({
  useAuth: vi.fn(),
}))

const mockPush = vi.fn()
const mockSearchParams = {
  get: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(useRouter as Mock).mockReturnValue({
    push: mockPush,
  })
  ;(useSearchParams as Mock).mockReturnValue(mockSearchParams)
})

describe('AuthGuard Component', () => {
  const TestComponent = () => <div>Protected Content</div>

  it('shows loading spinner when authentication is loading', () => {
    ;(useAuth as Mock).mockReturnValue({
      user: null,
      loading: true,
    })

    render(
      <AuthGuard>
        <TestComponent />
      </AuthGuard>
    )

    const spinner = screen.getByTestId('auth-loading-spinner')
    expect(spinner).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('renders children when user is authenticated', async () => {
    ;(useAuth as Mock).mockReturnValue({
      user: { id: '1', email: 'test@example.com' },
      loading: false,
    })

    render(
      <AuthGuard>
        <TestComponent />
      </AuthGuard>
    )

    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeInTheDocument()
    })
  })

  it('redirects to login when user is not authenticated', async () => {
    ;(useAuth as Mock).mockReturnValue({
      user: null,
      loading: false,
    })

    // Mock window.location
    const mockLocation = {
      pathname: '/protected-route',
      origin: 'http://localhost:3000',
    }
    Object.defineProperty(window, 'location', {
      value: mockLocation,
      writable: true,
    })

    render(
      <AuthGuard>
        <TestComponent />
      </AuthGuard>
    )

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        'http://localhost:3000/auth/login?redirectTo=%2Fprotected-route'
      )
    })
  })

  it('allows access when requireAuth is false', async () => {
    ;(useAuth as Mock).mockReturnValue({
      user: null,
      loading: false,
    })

    render(
      <AuthGuard requireAuth={false}>
        <TestComponent />
      </AuthGuard>
    )

    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeInTheDocument()
    })
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('redirects authenticated users away from auth pages', async () => {
    ;(useAuth as Mock).mockReturnValue({
      user: { id: '1', email: 'test@example.com' },
      loading: false,
    })

    mockSearchParams.get.mockReturnValue('/dashboard')

    // Mock window.location for auth page
    const mockLocation = {
      pathname: '/auth/login',
      origin: 'http://localhost:3000',
    }
    Object.defineProperty(window, 'location', {
      value: mockLocation,
      writable: true,
    })

    render(
      <AuthGuard>
        <TestComponent />
      </AuthGuard>
    )

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('uses custom redirect URL', async () => {
    ;(useAuth as Mock).mockReturnValue({
      user: null,
      loading: false,
    })

    const customRedirect = '/custom-login'
    const mockLocation = {
      pathname: '/protected',
      origin: 'http://localhost:3000',
    }
    Object.defineProperty(window, 'location', {
      value: mockLocation,
      writable: true,
    })

    render(
      <AuthGuard redirectTo={customRedirect}>
        <TestComponent />
      </AuthGuard>
    )

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        'http://localhost:3000/custom-login?redirectTo=%2Fprotected'
      )
    })
  })

  it('renders custom fallback during loading', () => {
    ;(useAuth as Mock).mockReturnValue({
      user: null,
      loading: true,
    })

    const CustomFallback = () => <div>Custom Loading...</div>

    render(
      <AuthGuard fallback={<CustomFallback />}>
        <TestComponent />
      </AuthGuard>
    )

    expect(screen.getByText('Custom Loading...')).toBeInTheDocument()
    expect(screen.queryByRole('progressbar', { hidden: true })).not.toBeInTheDocument()
  })

  it('handles authentication errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    ;(useAuth as Mock).mockReturnValue({
      user: null,
      loading: false,
    })

    // Mock an error in window.location access
    Object.defineProperty(window, 'location', {
      get: () => {
        throw new Error('Location access error')
      },
    })

    render(
      <AuthGuard>
        <TestComponent />
      </AuthGuard>
    )

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Auth guard error:',
        expect.any(Error)
      )
    })

    consoleSpy.mockRestore()
  })
})

describe('Route Protection Integration', () => {
  it('prevents access to dashboard without authentication', async () => {
    ;(useAuth as Mock).mockReturnValue({
      user: null,
      loading: false,
    })

    const mockLocation = {
      pathname: '/dashboard',
      origin: 'http://localhost:3000',
    }
    Object.defineProperty(window, 'location', {
      value: mockLocation,
      writable: true,
    })

    const DashboardPage = () => (
      <AuthGuard>
        <div>Dashboard Content</div>
      </AuthGuard>
    )

    render(<DashboardPage />)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        'http://localhost:3000/auth/login?redirectTo=%2Fdashboard'
      )
    })
    expect(screen.queryByText('Dashboard Content')).not.toBeInTheDocument()
  })

  it('allows access to profile page with authentication', async () => {
    ;(useAuth as Mock).mockReturnValue({
      user: { id: '1', email: 'test@example.com' },
      loading: false,
    })

    const ProfilePage = () => (
      <AuthGuard>
        <div>Profile Content</div>
      </AuthGuard>
    )

    render(<ProfilePage />)

    await waitFor(() => {
      expect(screen.getByText('Profile Content')).toBeInTheDocument()
    })
    expect(mockPush).not.toHaveBeenCalled()
  })
}) 