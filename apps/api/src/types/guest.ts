/**
 * Guest User Types for API
 */

export interface GuestUser {
  id: string
  isGuest: true
  sessionId: string
  createdAt: string
  tempData?: {
    projects: any[]
    preferences: Record<string, any>
  }
}

export interface GuestProject {
  id: string
  name: string
  guestUserId: string
  tempData: any
  createdAt: string
  expiresAt: string
}

export interface GuestSession {
  sessionId: string
  createdAt: string
  expiresAt: string
  ipAddress?: string
  userAgent?: string
}

/**
 * Extract guest session from request headers
 */
export function extractGuestSession(req: any): { sessionId: string } | null {
  // Check for guest session in headers
  const guestSessionHeader = req.headers['x-guest-session']
  if (guestSessionHeader && typeof guestSessionHeader === 'string') {
    return { sessionId: guestSessionHeader }
  }

  // Check for guest session in cookies
  const cookies = req.headers.cookie
  if (cookies) {
    const guestSessionMatch = cookies.match(/guest_session_id=([^;]+)/)
    if (guestSessionMatch) {
      return { sessionId: guestSessionMatch[1] }
    }
  }

  return null
}

/**
 * Create guest user from session
 */
export function createGuestUserFromSession(sessionId: string): GuestUser {
  return {
    id: `guest_${sessionId}`,
    isGuest: true,
    sessionId,
    createdAt: new Date().toISOString(),
    tempData: {
      projects: [],
      preferences: {}
    }
  }
}

/**
 * Check if user is a guest user
 */
export function isGuestUser(user: any): user is GuestUser {
  return user && user.isGuest === true
}

/**
 * Validate guest session format
 */
export function isValidGuestSession(sessionId: string): boolean {
  // Basic validation - guest sessions should be in format: timestamp_randomstring
  const parts = sessionId.split('_')
  if (parts.length < 2) return false
  
  // Check if first part is a valid timestamp
  const timestampStr = parts[0]
  if (!timestampStr) return false
  
  const timestamp = parseInt(timestampStr)
  if (isNaN(timestamp) || timestamp <= 0) return false
  
  // Check if session is not too old (7 days)
  const maxAge = 7 * 24 * 60 * 60 * 1000 // 7 days
  const sessionAge = Date.now() - timestamp
  
  return sessionAge <= maxAge
} 