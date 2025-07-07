/**
 * Guest User Service
 * Manages anonymous user sessions and temporary data storage
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

class GuestUserService {
  private readonly GUEST_SESSION_KEY = 'guest_session_id'
  private readonly GUEST_DATA_KEY = 'guest_user_data'
  private readonly SESSION_DURATION = 24 * 60 * 60 * 1000 // 24 hours
  private readonly DATA_EXPIRY = 7 * 24 * 60 * 60 * 1000 // 7 days

  /**
   * Create or retrieve guest user session
   */
  createGuestSession(): GuestUser {
    let sessionId = this.getStoredSessionId()
    
    if (!sessionId || this.isSessionExpired(sessionId)) {
      sessionId = this.generateSessionId()
      this.storeSessionId(sessionId)
    }

    const guestUser: GuestUser = {
      id: `guest_${sessionId}`,
      isGuest: true,
      sessionId,
      createdAt: new Date().toISOString(),
      tempData: this.loadGuestData(sessionId)
    }

    return guestUser
  }

  /**
   * Get current guest user or null if no session
   */
  getCurrentGuestUser(): GuestUser | null {
    if (typeof window === 'undefined') return null
    
    const sessionId = this.getStoredSessionId()
    if (!sessionId || this.isSessionExpired(sessionId)) {
      return null
    }

    return {
      id: `guest_${sessionId}`,
      isGuest: true,
      sessionId,
      createdAt: this.getSessionCreatedAt(sessionId) || new Date().toISOString(),
      tempData: this.loadGuestData(sessionId)
    }
  }

  /**
   * Save temporary project data for guest user
   */
  saveGuestProject(project: Omit<GuestProject, 'id' | 'createdAt' | 'expiresAt'>): GuestProject {
    const guestProject: GuestProject = {
      ...project,
      id: `guest_project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + this.DATA_EXPIRY).toISOString()
    }

    const projects = this.getGuestProjects(project.guestUserId)
    projects.push(guestProject)
    this.saveGuestProjects(project.guestUserId, projects)

    return guestProject
  }

  /**
   * Get all guest projects for a user
   */
  getGuestProjects(guestUserId: string): GuestProject[] {
    if (typeof window === 'undefined') return []
    
    const key = `${this.GUEST_DATA_KEY}_${guestUserId}_projects`
    const stored = localStorage.getItem(key)
    
    if (!stored) return []

    try {
      const projects: GuestProject[] = JSON.parse(stored)
      // Filter out expired projects
      const validProjects = projects.filter(p => !this.isDataExpired(p.expiresAt))
      
      // If some projects were expired, save the filtered list
      if (validProjects.length !== projects.length) {
        this.saveGuestProjects(guestUserId, validProjects)
      }
      
      return validProjects
    } catch {
      return []
    }
  }

  /**
   * Convert guest data to user account
   */
  transferGuestDataToUser(guestUserId: string, realUserId: string): {
    projects: GuestProject[]
    preferences: Record<string, any>
  } {
    const projects = this.getGuestProjects(guestUserId)
    const preferences = this.getGuestPreferences(guestUserId)
    
    // Clean up guest data after transfer
    this.clearGuestData(guestUserId)
    
    return { projects, preferences }
  }

  /**
   * Clear all guest data and session
   */
  clearGuestSession(): void {
    if (typeof window === 'undefined') return
    
    const sessionId = this.getStoredSessionId()
    if (sessionId) {
      this.clearGuestData(`guest_${sessionId}`)
      localStorage.removeItem(this.GUEST_SESSION_KEY)
      localStorage.removeItem(`${this.GUEST_SESSION_KEY}_created`)
    }
  }

  /**
   * Check if user should see conversion prompts
   */
  shouldShowConversionPrompt(guestUser: GuestUser): boolean {
    const projects = this.getGuestProjects(guestUser.id)
    const sessionAge = Date.now() - new Date(guestUser.createdAt).getTime()
    const hasProjects = projects.length > 0
    const isOldSession = sessionAge > 2 * 60 * 60 * 1000 // 2 hours

    return hasProjects || isOldSession
  }

  // Private helper methods
  private generateSessionId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private getStoredSessionId(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(this.GUEST_SESSION_KEY)
  }

  private storeSessionId(sessionId: string): void {
    if (typeof window === 'undefined') return
    localStorage.setItem(this.GUEST_SESSION_KEY, sessionId)
    localStorage.setItem(`${this.GUEST_SESSION_KEY}_created`, new Date().toISOString())
  }

  private getSessionCreatedAt(sessionId: string): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(`${this.GUEST_SESSION_KEY}_created`)
  }

  private isSessionExpired(sessionId: string): boolean {
    const createdAt = this.getSessionCreatedAt(sessionId)
    if (!createdAt) return true
    
    const sessionAge = Date.now() - new Date(createdAt).getTime()
    return sessionAge > this.SESSION_DURATION
  }

  private isDataExpired(expiresAt: string): boolean {
    return new Date(expiresAt).getTime() < Date.now()
  }

  private loadGuestData(sessionId: string): GuestUser['tempData'] {
    if (typeof window === 'undefined') return undefined
    
    const key = `${this.GUEST_DATA_KEY}_guest_${sessionId}`
    const stored = localStorage.getItem(key)
    
    if (!stored) return { projects: [], preferences: {} }

    try {
      return JSON.parse(stored)
    } catch {
      return { projects: [], preferences: {} }
    }
  }

  private saveGuestProjects(guestUserId: string, projects: GuestProject[]): void {
    if (typeof window === 'undefined') return
    
    const key = `${this.GUEST_DATA_KEY}_${guestUserId}_projects`
    localStorage.setItem(key, JSON.stringify(projects))
  }

  private getGuestPreferences(guestUserId: string): Record<string, any> {
    if (typeof window === 'undefined') return {}
    
    const key = `${this.GUEST_DATA_KEY}_${guestUserId}_preferences`
    const stored = localStorage.getItem(key)
    
    if (!stored) return {}

    try {
      return JSON.parse(stored)
    } catch {
      return {}
    }
  }

  private clearGuestData(guestUserId: string): void {
    if (typeof window === 'undefined') return
    
    const keys = [
      `${this.GUEST_DATA_KEY}_${guestUserId}`,
      `${this.GUEST_DATA_KEY}_${guestUserId}_projects`,
      `${this.GUEST_DATA_KEY}_${guestUserId}_preferences`
    ]
    
    keys.forEach(key => localStorage.removeItem(key))
  }
}

export const guestUserService = new GuestUserService() 