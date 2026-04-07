import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createClient } from '@supabase/supabase-js';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// R2 / Cloudflare S3-compatible client
function getR2Client() {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
    },
    forcePathStyle: true,
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { renderId: string } }
) {
  const { renderId } = params;

  if (!renderId) {
    return NextResponse.json({ error: 'Missing renderId' }, { status: 400 });
  }

  // Fetch render from DB
  const supabase = getAdminClient();
  const { data: render, error } = await supabase
    .from('renders')
    .select('id, project_name, output_url, bucket_name')
    .eq('id', renderId)
    .single();

  if (error || !render || !render.output_url) {
    return NextResponse.json({ error: 'Render not found' }, { status: 404 });
  }

  // Extract S3 key from output_url
  // Format: https://${bucket}.s3.us-east-1.amazonaws.com/${renderId}/out.mp4
  // OR: https://${bucket}.s3.amazonaws.com/${renderId}/out.mp4
  // OR: https://assets.raybox.fm/${key}
  let s3Key: string;
  let bucketName: string;

  try {
    const url = new URL(render.output_url);
    const pathParts = url.pathname.replace(/^\//, '').split('/');
    // URL format: bucket.s3.amazonaws.com/renderId/out.mp4
    // First part is the bucket, last two are renderId and filename
    if (pathParts.length >= 2 && pathParts[1] === renderId) {
      bucketName = pathParts[0];
      s3Key = `${renderId}/out.mp4`;
    } else if (pathParts.length >= 3) {
      // Nested: bucket/renders/renderId/out.mp4
      bucketName = pathParts[0];
      s3Key = pathParts.slice(1).join('/');
    } else {
      return NextResponse.json({ error: 'Invalid output URL format' }, { status: 500 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid output URL' }, { status: 500 });
  }

  // Generate filename for the download
  const filename = `${(render.project_name || 'render').replace(/[^a-z0-9]/gi, '_')}.mp4`;

  // Generate signed URL with Content-Disposition: attachment
  const r2 = getR2Client();
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: s3Key,
    ResponseContentDisposition: `attachment; filename="${filename}"`,
  });

  try {
    const signedUrl = await getSignedUrl(r2, command, { expiresIn: 300 }); // 5 min expiry
    return NextResponse.redirect(signedUrl);
  } catch (err) {
    console.error('Failed to generate signed download URL:', err);
    return NextResponse.json({ error: 'Failed to generate download URL' }, { status: 500 });
  }
}
