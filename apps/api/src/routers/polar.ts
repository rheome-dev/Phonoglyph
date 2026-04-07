/**
 * Polar.SH tRPC Router
 * Handles credit pack purchases, credit balance queries, and free credit grants
 */

import { z } from 'zod'
import { router, protectedProcedure, publicProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'
import { PolarClient } from '../lib/polar-server'
import { supabaseAdmin } from '../lib/supabase'
import { logger } from '../lib/logger'

// Hardcoded credit packs (prices in cents)
// Maps internal pack IDs to Polar product IDs via env vars
const CREDIT_PACKS = [
  {
    id: 'starter',
    name: 'Starter Pack',
    credits: 10,
    priceInCents: 2200,
    polarProductId: process.env.POLAR_STARTER_PACK_ID || '',
  },
  {
    id: 'pro',
    name: 'Pro Pack',
    credits: 50,
    priceInCents: 9000,
    polarProductId: process.env.POLAR_PRO_PACK_ID || '',
  },
]

export const polarRouter = router({
  /**
   * Public endpoint to get available credit packs
   */
  getProducts: publicProcedure.query(() => {
    return CREDIT_PACKS.map((pack) => ({
      id: pack.id,
      name: pack.name,
      credits: pack.credits,
      priceInCents: pack.priceInCents,
    }))
  }),

  /**
   * Get current user's credit balance and transaction history
   */
  getCredits: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id

    // Get user's current credits from users table
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('credits')
      .eq('id', userId)
      .single()

    if (userError) {
      logger.error('Error fetching user credits:', userError)
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch credit balance',
      })
    }

    const balance = userData?.credits ?? 0

    // Get transaction history
    const { data: transactions, error: txError } = await supabaseAdmin
      .from('credit_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (txError) {
      logger.error('Error fetching credit transactions:', txError)
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch transaction history',
      })
    }

    return {
      balance,
      transactions: transactions || [],
    }
  }),

  /**
   * Create a Polar checkout session for purchasing credits
   */
  createCheckout: protectedProcedure
    .input(z.object({ productId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id

      // Find the product and get the Polar product ID
      const product = CREDIT_PACKS.find((p) => p.id === input.productId)
      if (!product) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Unknown product: ${input.productId}`,
        })
      }

      if (!product.polarProductId) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Polar product ID not configured for ${input.productId}`,
        })
      }

      // Build success/cancel URLs
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
      const successUrl = `${baseUrl}/settings?credits=success`
      const cancelUrl = `${baseUrl}/settings?credits=cancelled`

      // Create checkout session using Polar client with the real Polar product ID
      const polarClient = new PolarClient()
      let checkout
      try {
        checkout = await polarClient.createCheckout(
          product.polarProductId,
          successUrl,
          cancelUrl
        )
      } catch (err) {
        logger.error('Polar checkout creation failed:', err)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create checkout session',
        })
      }

      logger.log('Polar checkout created:', {
        checkoutId: checkout.id,
        userId,
        productId: input.productId,
      })

      return {
        checkoutUrl: checkout.url,
      }
    }),

  /**
   * Grant 5 free credits to new users (one-time only)
   */
  grantFreeCredits: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.user.id

    // Check if user already has a grant transaction
    const { data: existingGrant, error: grantError } = await supabaseAdmin
      .from('credit_transactions')
      .select('id')
      .eq('user_id', userId)
      .eq('type', 'grant')
      .limit(1)

    if (grantError) {
      logger.error('Error checking existing grant:', grantError)
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to check grant status',
      })
    }

    if (existingGrant && existingGrant.length > 0) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'Free credits already claimed',
      })
    }

    // Grant 5 credits to user
    const { data: updatedUser, error: updateError } = await supabaseAdmin.rpc('increment_credits', {
      user_id: userId,
      amount: 5,
    })

    // If the RPC function doesn't exist, do it manually
    if (updateError) {
      logger.log('increment_credits RPC not found, using manual update')

      // Get current credits
      const { data: currentUser, error: fetchError } = await supabaseAdmin
        .from('users')
        .select('credits')
        .eq('id', userId)
        .single()

      if (fetchError) {
        logger.error('Error fetching user credits:', fetchError)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to grant credits',
        })
      }

      const newBalance = (currentUser?.credits ?? 0) + 5

      const { error: setError } = await supabaseAdmin
        .from('users')
        .update({ credits: newBalance })
        .eq('id', userId)

      if (setError) {
        logger.error('Error updating user credits:', setError)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to grant credits',
        })
      }
    }

    // Record the transaction
    const { error: txError } = await supabaseAdmin
      .from('credit_transactions')
      .insert({
        user_id: userId,
        amount: 5,
        type: 'grant',
        polar_order_id: null,
      })

    if (txError) {
      logger.error('Error inserting grant transaction:', txError)
      // Don't throw - credits were already granted
    }

    logger.log('Free credits granted to user:', userId)

    return {
      success: true,
      creditsGranted: 5,
    }
  }),
})
