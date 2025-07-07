import { createClient } from '@supabase/supabase-js'

export function createTestSupabaseClient() {
  return createClient(
    process.env.SUPABASE_URL || 'http://localhost:54321',
    process.env.SUPABASE_ANON_KEY || 'test-key',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
} 