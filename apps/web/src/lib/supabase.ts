import { createClient } from '@supabase/supabase-js'
import { debugLog } from '@/lib/utils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const isDummyConfig = !supabaseUrl || !supabaseAnonKey;

if (isDummyConfig && typeof window !== 'undefined') {
  debugLog.error('🔥 SUPABASE NOT CONFIGURED! Auth and database will not work.');
}

export const supabase = createClient(
  supabaseUrl || 'https://dummy.supabase.co',
  supabaseAnonKey || 'dummy-key'
) 