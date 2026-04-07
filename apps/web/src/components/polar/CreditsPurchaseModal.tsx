'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { trpc } from '@/lib/trpc'

type CreditsPurchaseModalProps = {
  onClose: () => void
}

export function CreditsPurchaseModal({ onClose }: CreditsPurchaseModalProps) {
  const [loading, setLoading] = useState<string | null>(null)

  const { data: products } = trpc.polar.getProducts.useQuery()
  const createCheckout = trpc.polar.createCheckout.useMutation()

  const handlePurchase = async (productId: string) => {
    setLoading(productId)
    try {
      const result = await createCheckout.mutateAsync({ productId })
      window.location.href = result.checkoutUrl
    } catch (error) {
      console.error('Checkout failed:', error)
      setLoading(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-stone-900 border border-stone-700 rounded-xl max-w-lg w-full mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-700">
          <h2 className="text-xl font-semibold text-white">Get Render Credits</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-white transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <p className="text-stone-300">Redirecting to checkout...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {(products || []).map((product) => (
                <div key={product.id} className="bg-stone-800 rounded-lg p-5 border border-stone-700">
                  <div className="text-2xl font-bold text-white mb-1">
                    ${(product.priceInCents / 100).toFixed(0)}
                  </div>
                  <div className="text-sm text-stone-400 mb-4">
                    {product.credits} renders &middot; ${(product.priceInCents / 100 / product.credits).toFixed(2)}/render
                  </div>
                  <button
                    type="button"
                    onClick={() => handlePurchase(product.id)}
                    className="w-full bg-white text-stone-900 hover:bg-stone-200 font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Buy {product.name.replace(' Pack', '')}
                  </button>
                </div>
              ))}
            </div>
          )}

          <p className="mt-6 text-center text-xs text-stone-500">
            Credits never expire. 1 credit = 1 video render.
          </p>
        </div>
      </div>
    </div>
  )
}
