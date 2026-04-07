'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { trpc } from '@/lib/trpc'

type CreditsPurchaseModalProps = {
  onClose: () => void
}

export function CreditsPurchaseModal({ onClose }: CreditsPurchaseModalProps) {
  const [loading, setLoading] = useState<string | null>(null)

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
          <h2 className="text-xl font-semibold text-white">Get More Renders</h2>
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
              {/* Starter Pack */}
              <div className="bg-stone-800 rounded-lg p-5 border border-stone-700">
                <div className="text-2xl font-bold text-white mb-1">$22</div>
                <div className="text-sm text-stone-400 mb-4">
                  10 renders · $2.20/render · no expiry
                </div>
                <button
                  type="button"
                  onClick={() => handlePurchase('starter')}
                  className="w-full bg-black text-white hover:bg-stone-800 font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Buy Starter
                </button>
              </div>

              {/* Pro Pack */}
              <div className="bg-stone-800 rounded-lg p-5 border border-stone-700">
                <div className="text-2xl font-bold text-white mb-1">$90</div>
                <div className="text-sm text-stone-400 mb-4">
                  50 renders · $1.80/render · no expiry
                </div>
                <button
                  type="button"
                  onClick={() => handlePurchase('pro')}
                  className="w-full bg-black text-white hover:bg-stone-800 font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Buy Pro
                </button>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-6 text-center text-sm text-stone-500">
            Questions? Contact <a href="mailto:support@raybox.fm" className="text-stone-400 hover:text-white">support@raybox.fm</a>
          </div>
        </div>
      </div>
    </div>
  )
}
