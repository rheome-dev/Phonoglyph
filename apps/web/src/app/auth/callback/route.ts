import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { debugLog } from '@/lib/utils';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/'

  // Check if Supabase is properly configured
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    debugLog.error('Supabase not configured properly')
    return NextResponse.redirect(new URL('/auth/error', request.url))
  }

  if (code) {
    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        debugLog.error('OAuth callback error:', error)
        return NextResponse.redirect(new URL('/auth/error', request.url))
      }
    } catch (error) {
      debugLog.error('OAuth callback error:', error)
      return NextResponse.redirect(new URL('/auth/error', request.url))
    }
  }

  // Redirect to the intended page or dashboard
  return NextResponse.redirect(new URL(next, request.url))
} 