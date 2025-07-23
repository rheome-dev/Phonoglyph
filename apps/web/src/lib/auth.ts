import { supabase } from './supabase'
import type { LoginCredentials, SignupCredentials, AuthProvider, User } from 'phonoglyph-types'

export class AuthService {
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
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectTo || `${window.location.origin}/auth/callback`,
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
      redirectTo: `${window.location.origin}/auth/reset-password`,
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