# Unified Project Structure

```plaintext
midiviz-monorepo/
├── apps/
│   ├── web/                    # Next.js Frontend
│   │   ├── src/
│   │   │   ├── app/            # Next.js App Router
│   │   │   ├── components/
│   │   │   ├── lib/            # Utilities, helpers
│   │   │   └── server/         # tRPC client, server actions
│   │   └── package.json
│   └── api/                    # Express.js Backend
│       ├── src/
│       │   ├── routers/        # tRPC routers
│       │   ├── services/       # Business logic (e.g., queue service)
│       │   └── trpc.ts         # tRPC main configuration
│       └── package.json
├── packages/
│   ├── config/                 # Shared configs (ESLint, TSConfig)
│   └── ui/                     # Shared UI components (optional)
└── package.json                # Root package.json with workspaces
