/**
 * Polar.SH API Client for server-side operations
 * Handles checkout session creation and webhook signature verification
 */

import { createHmac, timingSafeEqual } from 'crypto'

export interface PolarProduct {
  id: string
  name: string
  credits: number
  priceInCents: number
}

export interface PolarCheckoutSession {
  id: string
  url: string
}

export interface PolarOrder {
  id: string
  status: string
  metadata?: Record<string, string>
}

const POLAR_API_URL = process.env.POLAR_API_URL || 'https://api.sandbox.polars.sh/v1'
const POLAR_ACCESS_TOKEN = process.env.POLAR_ACCESS_TOKEN

export class PolarClient {
  private baseUrl: string
  private accessToken: string | undefined

  constructor() {
    this.baseUrl = POLAR_API_URL
    this.accessToken = POLAR_ACCESS_TOKEN
  }

  /**
   * Creates a checkout session for purchasing credits
   */
  async createCheckout(
    productId: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<PolarCheckoutSession> {
    if (!this.accessToken) {
      throw new Error('Polar access token not configured')
    }

    const response = await fetch(`${this.baseUrl}/checkouts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        product_id: productId,
        success_url: successUrl,
        cancel_url: cancelUrl,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Polar checkout creation failed: ${response.status} ${error}`)
    }

    const data = await response.json() as { id: string; url: string }
    return {
      id: data.id,
      url: data.url,
    }
  }

  /**
   * Gets available products/credit packs
   */
  async getProducts(): Promise<PolarProduct[]> {
    if (!this.accessToken) {
      throw new Error('Polar access token not configured')
    }

    const response = await fetch(`${this.baseUrl}/products`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Polar get products failed: ${response.status} ${error}`)
    }

    const data = await response.json() as { products?: PolarProduct[] }
    return data.products || []
  }

  /**
   * Gets an order by ID
   */
  async getOrder(orderId: string): Promise<PolarOrder> {
    if (!this.accessToken) {
      throw new Error('Polar access token not configured')
    }

    const response = await fetch(`${this.baseUrl}/orders/${orderId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Polar get order failed: ${response.status} ${error}`)
    }

    return response.json() as unknown as PolarOrder
  }

  /**
   * Verifies the webhook signature from Polar
   * Uses HMAC-SHA256 to compare the raw body against the signature
   */
  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    const webhookSecret = process.env.POLAR_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error('Polar webhook secret not configured')
      return false
    }

    const expectedSignature = createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex')

    // Use timing-safe comparison to prevent timing attacks
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
}

// Singleton instance for reuse
let polarClientInstance: PolarClient | null = null

export function getPolarClient(): PolarClient {
  if (!polarClientInstance) {
    polarClientInstance = new PolarClient()
  }
  return polarClientInstance
}
