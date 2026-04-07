# Polar.SH Integration Plan — Raybox

## Context

Polar.SH is a Merchant of Record platform. Raybox will use Polar's Usage-Based Billing (credit packs) to monetize video renders. This document covers the full implementation plan.

**Sandbox-first:** All development uses Polar's sandbox environment. Production API keys are swapped when the account is approved.

---

## High-Level Architecture

```
User clicks "Export"
        ↓
[Check: credits > 0?] ──no──→ [Show "Out of Credits" modal]
        │yes                        └── Buy Pack → Polar Checkout → return → credits updated
        ↓
Lambda render triggered
        ↓
Render completes → S3 URL returned
        ↓
Render record saved to DB (render_id, user_id, output_url, credits_spent=1)
        ↓
Credits decremented in DB

User visits /renders/[id]/result
        ↓
Video player + download + share options
```

---

## Phase 1: Database Schema

### New tables and columns

**users table — add columns:**
```sql
ALTER TABLE users ADD COLUMN polar_customer_id TEXT;
ALTER TABLE users ADD COLUMN credits INTEGER DEFAULT 5;  -- free tier: 5 renders/month
```

**credit_transactions table — create:**
```sql
CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  amount INTEGER NOT NULL,           -- positive = purchase, negative = spend
  type TEXT NOT NULL,                 -- 'purchase' | 'spend' | 'refund' | 'grant'
  polar_order_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**renders table — create (if not exists):**
```sql
CREATE TABLE renders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  project_id UUID REFERENCES projects(id),
  output_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'completed' | 'failed'
  credits_spent INTEGER DEFAULT 1,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Phase 2: Backend API Routes

### 1. `apps/api/src/routers/polar.ts` — new router

**`polar.createCheckout` — protected mutation**
- Input: `{ productId: string, packType: 'starter' | 'pro' }`
- Creates a Polar Checkout Session via `https://api.sandbox.polars.sh/v1/checkouts`
- Returns: `{ checkoutUrl: string }`
- On success: redirect user to `checkoutUrl`

**`polar.getProducts` — public query**
- Returns hardcoded list of credit packs (id, name, credits, price)
- No auth needed — prices are public

**`polar.getCredits` — protected query**
- Input: none (user from session)
- Returns: `{ balance: number, transactions: CreditTransaction[] }`

**`polar.grantFreeCredits` — protected mutation (one-time)**
- Grants 5 free credits to new users on first login
- Protected: only runs once per user (check `credit_transactions` for existing grant)

### 2. `apps/api/src/routers/render.ts` — modify `triggerRender`

After Lambda render completes (after `getRenderStatus` returns `done: true`), in the frontend or via a poll:
- Decrement `credits` on the user record (atomic: `UPDATE users SET credits = credits - 1 WHERE id = ? AND credits > 0`)
- Insert into `credit_transactions` with `type: 'spend'`, `amount: -1`
- Insert into `renders` table

**Race condition guard:** Use a DB transaction or atomic update. If `credits <= 0` before decrement, reject the render.

### 3. `apps/api/src/routers/webhooks.ts` — modify or add `webhooks.polar` endpoint

**`POST /api/webhooks/polar`** — no auth (uses HMAC signature)
- Verify `Polar-Signature` header (HMAC-SHA256 of raw body using webhook secret)
- Parse event type from `event` field
- Handle:
  - `payment.created` — await payment confirmation
  - `payment.completed` — add credits to user (look up `metadata.userId`), insert `credit_transactions`
  - `order.created` — log for debugging
- Always return `200` to Polar (don't re-deliver on 5xx)
- Return `400` on bad signature

---

## Phase 3: Frontend UI

### 1. `apps/web/src/components/hud/HudOverlay.tsx` — add credits display

In the top bar (above or near the export button):
```
[Export]  ● 3 renders left  ↑  ← text: "3 renders left", click opens credits purchase modal
```

- Show `credits` count from `polar.getCredits` query
- If `credits === 0`: Export button shows disabled state with "Out of credits" tooltip
- Click on credits text → opens `CreditsPurchaseModal`

### 2. `apps/web/src/components/polar/CreditsPurchaseModal.tsx` — new component

Modal triggered from HUD or from "Out of credits" state:
```
┌─────────────────────────────────────────────┐
│  Get More Renders                       [X] │
├─────────────────────────────────────────────┤
│  Starter Pack                    $22        │
│  10 renders · $2.20/render · no expiry      │
│  [Buy Starter Pack]  ← triggers checkout     │
│                                             │
│  Pro Pack                        $90        │
│  50 renders · $1.80/render · no expiry      │
│  [Buy Pro Pack]                             │
│                                             │
│  Questions? Contact support@raybox.fm        │
└─────────────────────────────────────────────┘
```

- Uses `polar.createCheckout` mutation
- On success, redirects to `checkoutUrl` in the same tab
- After return from Polar checkout, page reloads → credits query refetches

### 3. `apps/web/src/app/settings/page.tsx` — add credits section

Below API Keys section:
```
┌─────────────────────────────────────────────┐
│  Renders & Billing                          │
├─────────────────────────────────────────────┤
│  Current balance: 3 renders                 │
│                                             │
│  Transaction history:                       │
│  Apr 2  Rendered "Summer Edit"     -1       │
│  Apr 1  Purchased Starter Pack    +10      │
│  Mar 30 Rendered "Beat Video"      -1       │
│                                             │
│  [Buy more renders] → links to purchase    │
└─────────────────────────────────────────────┘
```

### 4. Landing page — `apps/web/src/app/page.tsx`

Add pricing section above the footer:
```
┌─────────────────────────────────────────────┐
│  Simple, transparent pricing                │
├─────────────────────────────────────────────┤
│  Free               Starter     Pro          │
│  5 renders/mo      10 renders   50 renders │
│  $0                 $22          $90        │
│  [Get started]      [Buy pack]    [Buy pack]│
│                                             │
│  All renders include:                       │
│  ✓ HD + 4K export                           │
│  ✓ No watermarks                             │
│  ✓ Commercial license                       │
└─────────────────────────────────────────────┘
```

---

## Phase 4: Environment Variables

Add to `apps/api/.env` and `apps/web/.env.local`:

```bash
# Polar.SH (sandbox — replace with production keys when approved)
POLAR_ACCESS_TOKEN=your_polar_access_token
POLAR_WEBHOOK_SECRET=your_webhook_signing_secret

# Credit pack product IDs from Polar dashboard
POLAR_STARTER_PACK_ID=your_starter_pack_product_id
POLAR_PRO_PACK_ID=your_pro_pack_product_id
```

---

## Phase 5: File Changes Summary

### New files to create:
```
apps/api/src/routers/polar.ts                      — Polar checkout + credits queries
apps/api/src/routers/render.ts                     — modify: decrement credits after render
apps/api/src/lib/polar-server.ts                   — Polar API client (server-side)
apps/web/src/lib/polar-client.ts                   — Polar API client (client-side)
apps/web/src/components/polar/CreditsPurchaseModal.tsx
apps/web/src/components/polar/CreditsDisplay.tsx
apps/web/src/components/polar/TransactionHistory.tsx
apps/api/src/scripts/create-polar-tables.sql       — migration SQL
```

### Files to modify:
```
apps/api/src/routers/webhooks.ts                  — add Polar webhook handler
apps/api/src/trpc.ts                             — add polar router to appRouter
apps/web/src/components/hud/HudOverlay.tsx        — add credits display
apps/web/src/app/page.tsx                         — add pricing section
apps/web/src/app/settings/page.tsx                — add credits/billing section
apps/web/src/app/creative-visualizer/page.tsx     — wire render completion → decrement credits
apps/web/.env.example                            — document POLAR_* vars
apps/api/.env.example                            — document POLAR_* vars
```

---

## Implementation Order

1. **DB migrations** — create tables, add columns (run SQL manually or via Supabase dashboard)
2. **Backend: Polar API client** (`polar-server.ts`) — typed client for Polar REST API
3. **Backend: polar router** — checkout + credits queries
4. **Backend: webhook handler** — signature verification + event handling
5. **Backend: render flow** — decrement credits after successful render
6. **Frontend: CreditsDisplay** — HUD balance indicator
7. **Frontend: CreditsPurchaseModal** — buy packs UI
8. **Frontend: settings billing section** — transaction history
9. **Frontend: landing page pricing** — pricing section
10. **Env vars + .env.example** — document required keys
