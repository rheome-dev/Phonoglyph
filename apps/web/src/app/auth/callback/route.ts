import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const redirectTo = requestUrl.searchParams.get('redirectTo')
  const next = requestUrl.searchParams.get('next') ?? '/'

  // Check if Supabase is properly configured
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error('Supabase not configured properly')
    return NextResponse.redirect(new URL('/auth/error', request.url))
  }

  if (code) {
    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('OAuth callback error:', error)
        return NextResponse.redirect(new URL('/auth/error', request.url))
      }
    } catch (error) {
      console.error('OAuth callback error:', error)
      return NextResponse.redirect(new URL('/auth/error', request.url))
    }
  }

  // Use redirectTo if provided, otherwise use next, otherwise default to dashboard
  const finalRedirect = redirectTo || next || '/dashboard'
  
  // If redirectTo is a full URL, redirect to it directly
  if (finalRedirect.startsWith('http')) {
    return NextResponse.redirect(finalRedirect)
  }
  
  // Otherwise, redirect relative to current origin
  return NextResponse.redirect(new URL(finalRedirect, request.url))
} 