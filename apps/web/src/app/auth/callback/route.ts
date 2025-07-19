import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/'

  // Log the callback for debugging
  console.log('OAuth callback received:', {
    url: request.url,
    code: code ? 'present' : 'missing',
    next,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV || 'development',
    vercelUrl: process.env.NEXT_PUBLIC_VERCEL_URL
  })

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
      
      console.log('OAuth callback successful')
    } catch (error) {
      console.error('OAuth callback error:', error)
      return NextResponse.redirect(new URL('/auth/error', request.url))
    }
  }

  // Handle preview deployment redirect
  // Create a special page that will handle the client-side redirect
  const isPreviewRedirect = requestUrl.searchParams.get('preview_redirect') === 'true'
  
  if (isPreviewRedirect) {
    // This will be handled by the client-side redirect logic
    const redirectUrl = new URL('/auth/preview-redirect', request.url)
    redirectUrl.searchParams.set('next', next)
    console.log('Redirecting to preview redirect handler:', redirectUrl.toString())
    return NextResponse.redirect(redirectUrl)
  }

  // Normal redirect to the intended page or dashboard
  const redirectUrl = new URL(next, request.url)
  console.log('Redirecting to:', redirectUrl.toString())
  return NextResponse.redirect(redirectUrl)
} 