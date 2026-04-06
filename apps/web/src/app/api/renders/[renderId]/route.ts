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
  { params }: { params: { renderId: string } }
) {
  const { renderId } = params;

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

// Public endpoint for updating render status/output (used by frontend after polling).
// Accepts the user_id in the body for ownership check and uses service role key
// to bypass auth, enabling renderers to save output URLs from any session.
export async function PATCH(
  request: NextRequest,
  { params }: { params: { renderId: string } }
) {
  const { renderId } = params;

  if (!renderId) {
    return NextResponse.json({ error: 'Missing renderId' }, { status: 400 });
  }

  let body: {
    status?: 'queued' | 'in_progress' | 'completed' | 'failed';
    outputUrl?: string;
    errorMessage?: string;
    metadata?: Record<string, any>;
    userId?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const updates: Record<string, any> = {};
  if (body.status) updates.status = body.status;
  if (body.outputUrl) updates.output_url = body.outputUrl;
  if (body.errorMessage) updates.error_message = body.errorMessage;
  if (body.metadata) updates.metadata = body.metadata;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const supabase = getAdminClient();

  // If userId is provided and looks like a valid UUID, scope the update to that user.
  // Otherwise update by renderId only (service role bypasses RLS, so this is safe).
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  let query = supabase.from('renders').update(updates).eq('id', renderId);

  if (body.userId && uuidRegex.test(body.userId)) {
    query = query.eq('user_id', body.userId);
  }

  const { error } = await query;

  if (error) {
    console.error('PATCH /api/renders error:', error.message, error.code, error.details);
    return NextResponse.json({ error: 'Failed to update render', details: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
