export interface CreditProduct {
  id: string;
  name: string;
  credits: number;
  priceInCents: number;
}

export interface CreditTransaction {
  id: string;
  amount: number;
  type: string;
  created_at: string;
}

export interface CreditBalance {
  balance: number;
  transactions: CreditTransaction[];
}

export async function getProducts(): Promise<CreditProduct[]> {
  const response = await fetch('/api/trpc/polar.getProducts');
  if (!response.ok) {
    throw new Error('Failed to fetch products');
  }
  const data = await response.json();
  return data.result?.data ?? [];
}

export async function getCredits(): Promise<CreditBalance> {
  const response = await fetch('/api/trpc/polar.getCredits');
  if (!response.ok) {
    throw new Error('Failed to fetch credits');
  }
  const data = await response.json();
  return data.result?.data ?? { balance: 0, transactions: [] };
}

export async function createPolarCheckout(productId: string): Promise<{ checkoutUrl: string }> {
  const response = await fetch('/api/trpc/polar.createCheckout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ productId }),
  });
  if (!response.ok) {
    throw new Error('Failed to create checkout');
  }
  const data = await response.json();
  return data.result?.data ?? { checkoutUrl: '' };
}
