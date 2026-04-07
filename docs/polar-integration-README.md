# Polar.SH Integration

## Overview
Raybox uses Polar.SH as its Merchant of Record for credit-based render pricing.

## Setup

### 1. Environment Variables
The API requires these in `apps/api/env.example` (copy to `apps/api/.env.local`):
```bash
POLAR_ACCESS_TOKEN=        # From Settings → API Credentials
POLAR_WEBHOOK_SECRET=      # From Settings → Webhooks
POLAR_API_URL=https://api.sandbox.polars.sh/v1  # Sandbox — swap for production
POLAR_STARTER_PACK_ID=     # From Products in Polar dashboard
POLAR_PRO_PACK_ID=         # From Products in Polar dashboard
FRONTEND_URL=http://localhost:3000
```

The web app requires these in `apps/web/.env.example` (copy to `apps/web/.env.local`):
```bash
NEXT_PUBLIC_POLAR_STARTER_PACK_ID=  # Client-safe starter pack ID
NEXT_PUBLIC_POLAR_PRO_PACK_ID=       # Client-safe pro pack ID
```

### 2. Database Migration
Run the SQL migration to create the credits/renders tables:
```bash
psql $DATABASE_URL -f apps/api/src/scripts/create-polar-tables.sql
```

### 3. Webhook URL
In Polar dashboard, add webhook endpoint:
```
https://your-domain.com/api/webhooks/polar
```
Events: `payment.completed`, `payment.created`, `order.created`

### 4. Configure Products in Polar Dashboard
Create two products:
- **Starter Pack**: $22, 10 credits, no expiry
- **Pro Pack**: $90, 50 credits, no expiry

## Architecture

```
User clicks Export
    → HUD checks credits balance via trpc.polar.getCredits
    → If 0 credits: CreditsPurchaseModal opens → Polar Checkout redirect
    → If credits > 0: Lambda render triggered
    → Lambda completes → frontend calls trpc.render.completeRender
    → Credits atomically decremented, render record created

User purchases credits
    → Polar processes payment
    → Polar webhook fires to /api/webhooks/polar
    → Credits added to user's account
    → User redirected to /settings?credits=success
```

## Testing
Use Polar sandbox (`api.sandbox.polars.sh`) — no live payments until account approved.

## Environment Variables Reference

| Variable | Location | Description |
|----------|----------|-------------|
| POLAR_ACCESS_TOKEN | apps/api/.env.local | Bearer token for Polar API |
| POLAR_WEBHOOK_SECRET | apps/api/.env.local | HMAC signing secret for webhooks |
| POLAR_API_URL | apps/api/.env.local | API base URL (sandbox vs production) |
| POLAR_STARTER_PACK_ID | apps/api/.env.local | Polar product ID for starter pack |
| POLAR_PRO_PACK_ID | apps/api/.env.local | Polar product ID for pro pack |
| FRONTEND_URL | apps/api/.env.local | Base URL for checkout redirects |
| NEXT_PUBLIC_POLAR_STARTER_PACK_ID | apps/web/.env.local | Client-safe starter pack ID |
| NEXT_PUBLIC_POLAR_PRO_PACK_ID | apps/web/.env.local | Client-safe pro pack ID |
