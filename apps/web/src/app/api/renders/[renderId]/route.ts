import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Public endpoint — no auth required, used by shareable render pages.
// Uses service role key so it bypasses RLS for reads only.
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ renderId: string }> }
) {
  const { renderId } = await params;

  if (!renderId) {
    return NextResponse.json({ error: 'Missing renderId' }, { status: 400 });
  }

  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('renders')
    .select('*')
    .eq('id', renderId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Render not found' }, { status: 404 });
  }

  return NextResponse.json({
    id: data.id,
    user_id: data.user_id,
    project_id: data.project_id,
    project_name: data.project_name,
    status: data.status,
    output_url: data.output_url,
    error_message: data.error_message,
    credits_spent: data.credits_spent,
    metadata: data.metadata,
    created_at: data.created_at,
  });
}
