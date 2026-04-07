'use client'

import { trpc } from '@/lib/trpc'

type CreditsDisplayProps = {
  onOpenPurchase: () => void
}

export function CreditsDisplay({ onOpenPurchase }: CreditsDisplayProps) {
  const { data: creditsData, isLoading } = trpc.polar.getCredits.useQuery()

  const balance = creditsData?.balance ?? 0
  const hasCredits = balance > 0

  if (isLoading) {
    return (
      <div className="bg-stone-800 text-stone-300 rounded-full px-3 py-1 text-sm inline-flex items-center gap-1.5">
        <span>●</span>
        <span>...</span>
      </div>
    )
  }

  return (
    <div className="bg-stone-800 text-stone-300 rounded-full px-3 py-1 text-sm inline-flex items-center gap-1.5">
      <span
        className={`w-2 h-2 rounded-full flex-shrink-0 ${hasCredits ? 'bg-green-500' : 'bg-stone-500'}`}
      />
      <button
        type="button"
        onClick={onOpenPurchase}
        className="hover:text-white transition-colors cursor-pointer"
      >
        {balance} render{balance !== 1 ? 's' : ''} left
      </button>
    </div>
  )
}
