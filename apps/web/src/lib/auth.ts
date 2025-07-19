import { supabase } from './supabase'
import type { LoginCredentials, SignupCredentials, AuthProvider, User } from '../types/auth'

export class AuthService {
  // Helper function to detect if we're in a preview deployment
  private static isPreviewDeployment(): boolean {
    if (typeof window === 'undefined') return false
    
    const hostname = window.location.hostname
    // Check if it's a Vercel preview deployment (contains vercel.app and has a git branch pattern)
    return hostname.includes('vercel.app') && 
           (hostname.includes('-git-') || hostname.includes('-pr-') || hostname.includes('-preview'))
  }

  // Helper function to save preview URL to localStorage
  private static savePreviewUrl(): void {
    if (typeof window === 'undefined') return
    
    if (this.isPreviewDeployment()) {
      const previewUrl = window.location.origin
      localStorage.setItem('phonoglyph_preview_url', previewUrl)
      console.log('Saved preview URL:', previewUrl)
    }
  }

  // Helper function to get the correct redirect URL
  private static getRedirectUrl(path: string = '/auth/callback'): string {
    // Use environment variable or fallback to a reasonable default
    const productionUrl = process.env.NEXT_PUBLIC_SITE_URL || 
                         (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')
    return `${productionUrl}${path}`
  }

  // Email/Password Authentication
  static async signUpWithEmail({ email, password, name }: SignupCredentials) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name || '',
        },
      },
    })

    if (error) {
      throw new Error(error.message)
    }

    return data
  }

  static async signInWithEmail({ email, password }: LoginCredentials) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      throw new Error(error.message)
    }

    return data
  }

  // OAuth Authentication
  static async signInWithOAuth({ provider, redirectTo }: AuthProvider) {
    // Save preview URL before starting OAuth flow
    this.savePreviewUrl()
    
    // If we're in a preview deployment, use the preview redirect mechanism
    let finalRedirectTo = redirectTo || this.getRedirectUrl('/auth/callback')
    
    if (this.isPreviewDeployment()) {
      // Add a parameter to indicate this is a preview redirect
      const url = new URL(finalRedirectTo)
      url.searchParams.set('preview_redirect', 'true')
      finalRedirectTo = url.toString()
    }
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: finalRedirectTo,
      },
    })

    if (error) {
      throw new Error(error.message)
    }

    return data
  }

  // Session Management
  static async getCurrentUser(): Promise<User | null> {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return null
    }

    return {
      id: user.id,
      email: user.email || '',
      user_metadata: user.user_metadata || {},
      created_at: user.created_at || '',
      updated_at: user.updated_at || '',
    }
  }

  static async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      throw new Error(error.message)
    }

    return session
  }

  static async signOut() {
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      throw new Error(error.message)
    }
  }

  // Password Reset
  static async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: this.getRedirectUrl('/auth/reset-password'),
    })

    if (error) {
      throw new Error(error.message)
    }
  }

  static async updatePassword(password: string) {
    const { data, error } = await supabase.auth.updateUser({
      password,
    })

    if (error) {
      throw new Error(error.message)
    }

    return data
  }

  // Auth State Changes
  static onAuthStateChange(callback: (event: string, session: any) => void | Promise<void>) {
    return supabase.auth.onAuthStateChange(callback)
  }
} 