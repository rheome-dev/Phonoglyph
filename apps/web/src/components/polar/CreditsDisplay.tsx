'use client';

import React from 'react';
import { Coins } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';

interface CreditsDisplayProps {
  onOpenPurchase: () => void;
}

/**
 * Displays the user's current credit balance with a button to purchase more.
 * Shows a loading state while fetching credits, and falls back gracefully if
 * the query fails (credits feature not yet wired up on the backend).
 */
export function CreditsDisplay({ onOpenPurchase }: CreditsDisplayProps) {
  const { data, isLoading } = trpc.user.getCredits.useQuery(undefined, {
    retry: false,
  });

  const credits = data?.credits ?? null;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onOpenPurchase}
      className="text-stone-400 hover:text-white gap-1.5"
    >
      <Coins className="w-4 h-4" />
      {isLoading ? (
        <span className="text-xs font-mono">—</span>
      ) : credits !== null ? (
        <span className="text-xs font-mono">{credits} credits</span>
      ) : (
        <span className="text-xs font-mono">Get credits</span>
      )}
    </Button>
  );
}
