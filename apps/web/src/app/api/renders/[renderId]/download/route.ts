import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
  const { data: render, error } = await supabase
    .from('renders')
    .select('id, project_name, output_url')
    .eq('id', renderId)
    .single();

  if (error || !render || !render.output_url) {
    return NextResponse.json({ error: 'Render not found' }, { status: 404 });
  }

  const filename = `${(render.project_name || 'render').replace(/[^a-z0-9]/gi, '_')}.mp4`;

  // Proxy the file through our server to avoid CORS issues
  // and guarantee Content-Disposition: attachment
  try {
    const upstream = await fetch(render.output_url);

    if (!upstream.ok) {
      return NextResponse.json({ error: 'Failed to fetch video from storage' }, { status: 502 });
    }

    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': upstream.headers.get('content-length') || '',
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch (err) {
    console.error('Failed to proxy download:', err);
    return NextResponse.json({ error: 'Failed to download video' }, { status: 500 });
  }
}
