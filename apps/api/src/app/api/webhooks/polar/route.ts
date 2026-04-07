/**
 * Polar.SH Webhook Handler
 * Receives events from Polar when payments complete or change state
 */

import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { supabaseAdmin } from '../../../../lib/supabase'
import { logger } from '../../../../lib/logger'

const WEBHOOK_SECRET = process.env.POLAR_WEBHOOK_SECRET || ''

/**
 * Verify the Polar webhook signature using HMAC-SHA256
 */
function verifySignature(rawBody: string, signature: string): boolean {
  if (!WEBHOOK_SECRET) {
    logger.error('Polar webhook secret not configured')
    return false
  }

  const expectedSignature = createHmac('sha256', WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex')

  try {
    const signatureBuffer = Buffer.from(signature, 'hex')
    const expectedBuffer = Buffer.from(expectedSignature, 'hex')

    if (signatureBuffer.length !== expectedBuffer.length) {
      return false
    }

    return timingSafeEqual(signatureBuffer, expectedBuffer)
  } catch {
    return false
  }
}

interface PolarWebhookEvent {
  event: string
  data: {
    id: string
    status?: string
    product_id?: string
    customer_id?: string
    amount?: number
    currency?: string
    metadata?: Record<string, string>
    created_at?: string
  }
}

export async function POST(req: NextRequest) {
  // Read raw body as text for signature verification
  const rawBody = await req.text()

  // Verify signature from Polar-Signature header
  const signature = req.headers.get('polar-signature') || ''

  if (!verifySignature(rawBody, signature)) {
    logger.warn('Polar webhook: invalid signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  let event: PolarWebhookEvent
  try {
    event = JSON.parse(rawBody)
  } catch {
    logger.error('Polar webhook: failed to parse body')
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  logger.log('Polar webhook received:', { event: event.event, dataId: event.data?.id })

  try {
    switch (event.event) {
      case 'payment.completed': {
        const { data } = event

        // Amount from Polar is in cents — we need to map it to credits
        // Based on our pricing: $22 → 10 credits ($2.20/credit), $90 → 50 credits ($1.80/credit)
        let creditsToAdd = 0
        const amountInDollars = (data.amount || 0) / 100

        if (amountInDollars >= 90) {
          creditsToAdd = 50
        } else if (amountInDollars >= 22) {
          creditsToAdd = 10
        } else {
          // For custom amounts, calculate based on $2.20/credit average rate
          creditsToAdd = Math.round((data.amount || 0) / 220)
        }

        // Find user by polar_customer_id in metadata or by email if available
        let userId: string | null = null

        if (data.metadata?.userId) {
          userId = data.metadata.userId
        } else if (data.customer_id) {
          // Look up user by polar_customer_id in our user_profiles table
          const { data: userData } = await supabaseAdmin
            .from('user_profiles')
            .select('id')
            .eq('polar_customer_id', data.customer_id)
            .single()

          userId = userData?.id || null
        }

        if (!userId) {
          logger.error('Polar webhook: could not find user for payment', {
            customerId: data.customer_id,
            metadata: data.metadata,
          })
          // Return 200 to prevent Polar from retrying — we can't fulfill this order
          return NextResponse.json({ received: true })
        }

        // Add credits to user
        const { data: updatedUser, error: updateError } = await supabaseAdmin.rpc('increment_credits', {
          uid: userId,
          amount: creditsToAdd,
        }).single()

        if (updateError) {
          // Fallback: manual update if RPC doesn't exist
          logger.log('increment_credits RPC not found, using manual update')

          const { data: currentUser } = await supabaseAdmin
            .from('user_profiles')
            .select('credits')
            .eq('id', userId)
            .single()

          const newBalance = (currentUser?.credits ?? 0) + creditsToAdd

          await supabaseAdmin
            .from('user_profiles')
            .update({ credits: newBalance })
            .eq('id', userId)
        }

        // Record the transaction
        await supabaseAdmin
          .from('credit_transactions')
          .insert({
            user_id: userId,
            amount: creditsToAdd,
            type: 'purchase',
            polar_order_id: data.id,
          })

        logger.log('Polar webhook: credits added', { userId, credits: creditsToAdd, orderId: data.id })
        break
      }

      case 'payment.created': {
        // Log for debugging — payment was initiated but not completed
        logger.log('Polar webhook: payment created', { orderId: event.data.id, status: event.data.status })
        break
      }

      case 'order.created': {
        // New order created (may be in a pending state)
        logger.log('Polar webhook: order created', { orderId: event.data.id })
        break
      }

      case 'subscription.created':
      case 'subscription.cancelled':
      case 'subscription.updated': {
        // Handle subscription events if we add subscription billing later
        logger.log('Polar webhook: subscription event', { event: event.event, orderId: event.data.id })
        break
      }

      default:
        logger.log('Polar webhook: unhandled event type', { event: event.event })
    }
  } catch (err) {
    logger.error('Polar webhook: error processing event', err)
    // Return 200 to prevent Polar retrying on our internal errors
    // (Polar will not retry non-200 responses, but we want to ack)
    return NextResponse.json({ received: true })
  }

  return NextResponse.json({ received: true })
}
