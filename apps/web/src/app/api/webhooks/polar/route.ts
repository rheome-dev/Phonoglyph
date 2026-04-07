import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import * as crypto from 'crypto';

/**
 * Polar.SH webhook handler
 * POST /api/webhooks/polar
 *
 * Verifies HMAC-SHA256 signature and handles:
 * - payment.completed: adds credits to user, records transaction
 * - order.created: logs for debugging
 */

const POLAR_WEBHOOK_SECRET = process.env.POLAR_WEBHOOK_SECRET;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Admin client with service role (bypasses RLS for webhook writes)
const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    })
  : null;

interface PolarWebhookPayload {
  event: string;
  data: {
    id?: string;
    status?: string;
    customer_id?: string;
    metadata?: Record<string, string>;
    amount?: number;
    product_id?: string;
    [key: string]: unknown;
  };
}

function verifySignature(rawBody: string, signature: string): boolean {
  if (!POLAR_WEBHOOK_SECRET) {
    console.error('[polar-webhook] POLAR_WEBHOOK_SECRET not configured');
    return false;
  }

  if (!signature) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', POLAR_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  try {
    const signatureBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    if (signatureBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  // Get raw body for signature verification BEFORE parsing
  const rawBody = await req.text();

  // Verify HMAC-SHA256 signature from Polar-Signature header
  const signature = req.headers.get('polar-signature') || '';
  if (!verifySignature(rawBody, signature)) {
    console.warn('[polar-webhook] Invalid signature, rejecting request');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Parse the webhook payload
  let payload: PolarWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    console.error('[polar-webhook] Failed to parse webhook body');
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { event, data } = payload;
  console.log(`[polar-webhook] Received event: ${event}`, JSON.stringify(data));

  // Always return 200 to Polar to prevent re-delivery
  try {
    await handleEvent(event, data);
  } catch (err) {
    console.error(`[polar-webhook] Error handling event ${event}:`, err);
    // Still return 200 — don't re-deliver on processing errors
  }

  return NextResponse.json({ received: true });
}

async function handleEvent(event: string, data: PolarWebhookPayload['data']) {
  if (!supabaseAdmin) {
    throw new Error(
      'Supabase admin client not initialized — set SUPABASE_SERVICE_ROLE_KEY env var'
    );
  }

  switch (event) {
    case 'payment.completed':
    case 'order.completed': {
      // Polar delivers credits when a payment is confirmed
      // data.metadata should contain: { userId, packId, credits }
      const userId = data.metadata?.userId;
      const creditsToAdd = parseInt(data.metadata?.credits || '0', 10);

      if (!userId) {
        console.warn('[polar-webhook] payment.completed missing userId in metadata');
        return;
      }

      if (creditsToAdd <= 0) {
        console.warn('[polar-webhook] payment.completed credits <= 0, skipping');
        return;
      }

      // Look up the user by polar_customer_id if metadata.userId isn't set
      // Otherwise update by metadata userId directly
      let targetUserId = userId;

      // Update user's credits
      const { data: updatedUser, error: updateError } = await supabaseAdmin
        .from('users')
        .update({
          credits: supabaseAdmin.rpc('increment_credits' as never, {
            user_id: userId,
            amount: creditsToAdd,
          }) as never,
        })
        .eq('id', userId)
        .select('credits')
        .single();

      // If the RPC function doesn't exist, do it manually
      if (updateError) {
        console.log('[polar-webhook] increment_credits RPC not found, using manual update');
        const { data: currentUser } = await supabaseAdmin
          .from('users')
          .select('credits')
          .eq('id', userId)
          .single();

        const newBalance = (currentUser?.credits ?? 0) + creditsToAdd;
        const { error: setError } = await supabaseAdmin
          .from('users')
          .update({ credits: newBalance })
          .eq('id', userId);

        if (setError) {
          throw new Error(`Failed to add credits for user ${userId}: ${setError.message}`);
        }
      }

      // Record the credit transaction
      const { error: txError } = await supabaseAdmin
        .from('credit_transactions')
        .insert({
          user_id: userId,
          amount: creditsToAdd,
          type: 'purchase',
          polar_order_id: data.id || null,
        });

      if (txError) {
        console.error('[polar-webhook] Failed to record purchase transaction:', txError);
        // Don't throw — credits were already added
      }

      console.log(`[polar-webhook] Added ${creditsToAdd} credits to user ${userId}`);
      break;
    }

    case 'order.created': {
      // Log for debugging — useful to track when Polar processes an order
      console.log('[polar-webhook] order.created:', {
        orderId: data.id,
        status: data.status,
        customerId: data.customer_id,
      });
      break;
    }

    case 'payment.created': {
      // Await payment confirmation — log and wait for payment.completed
      console.log('[polar-webhook] payment.created:', {
        orderId: data.id,
        status: data.status,
      });
      break;
    }

    default:
      console.log(`[polar-webhook] Unhandled event type: ${event}`);
  }
}
