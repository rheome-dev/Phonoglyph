# Source Tree

## Project Structure Overview

```plaintext
midiviz-monorepo/
├── .github/                     # GitHub Actions workflows
│   └── workflows/
│       ├── ci.yml              # Continuous integration
│       ├── deploy-staging.yml   # Staging deployment
│       └── deploy-prod.yml      # Production deployment
├── apps/
│   ├── web/                    # Next.js Frontend Application
│   │   ├── public/             # Static assets
│   │   │   ├── icons/          # App icons and favicons
│   │   │   ├── images/         # Static images
│   │   │   └── manifest.json   # PWA manifest
│   │   ├── src/
│   │   │   ├── app/            # Next.js App Router
│   │   │   │   ├── (auth)/     # Auth route group
│   │   │   │   │   ├── login/  # Login page
│   │   │   │   │   └── signup/ # Signup page
│   │   │   │   ├── dashboard/  # User dashboard
│   │   │   │   ├── editor/     # Visualization editor
│   │   │   │   ├── globals.css # Global styles
│   │   │   │   ├── layout.tsx  # Root layout
│   │   │   │   └── page.tsx    # Home page
│   │   │   ├── components/     # React components
│   │   │   │   ├── auth/       # Authentication components
│   │   │   │   ├── upload/     # File upload components
│   │   │   │   ├── editor/     # Visualization editor components
│   │   │   │   ├── ui/         # shadcn/ui components
│   │   │   │   └── common/     # Shared components
│   │   │   ├── hooks/          # Custom React hooks
│   │   │   │   ├── use-auth.ts # Authentication hook
│   │   │   │   ├── use-upload.ts # File upload hook
│   │   │   │   └── use-visualization.ts # Visualization hook
│   │   │   ├── lib/            # Utility libraries
│   │   │   │   ├── supabase.ts # Supabase client config
│   │   │   │   ├── utils.ts    # General utilities
│   │   │   │   ├── validations.ts # Form validation schemas
│   │   │   │   └── constants.ts # App constants
│   │   │   ├── server/         # Server-side code
│   │   │   │   ├── api.ts      # tRPC client setup
│   │   │   │   └── actions.ts  # Server actions
│   │   │   ├── styles/         # CSS and styling
│   │   │   │   ├── globals.css # Global styles
│   │   │   │   └── components.css # Component-specific styles
│   │   │   └── types/          # TypeScript type definitions
│   │   │       ├── auth.ts     # Authentication types
│   │   │       ├── file.ts     # File-related types
│   │   │       └── visualization.ts # Visualization types
│   │   ├── .env.example        # Environment template
│   │   ├── next.config.js      # Next.js configuration
│   │   ├── package.json        # Frontend dependencies
│   │   ├── tailwind.config.js  # Tailwind CSS config
│   │   └── tsconfig.json       # TypeScript config
│   └── api/                    # Express.js Backend Application
│       ├── src/
│       │   ├── routers/        # tRPC routers
│       │   │   ├── auth.ts     # Authentication router
│       │   │   ├── file.ts     # File management router
│       │   │   ├── project.ts  # Project management router
│       │   │   └── render.ts   # Rendering router
│       │   ├── services/       # Business logic services
│       │   │   ├── auth.ts     # Authentication service
│       │   │   ├── file.ts     # File processing service
│       │   │   ├── s3.ts       # AWS S3 service
│       │   │   ├── queue.ts    # Message queue service
│       │   │   └── render.ts   # Video rendering service
│       │   ├── lib/            # Utility libraries
│       │   │   ├── supabase.ts # Server Supabase client
│       │   │   ├── database.ts # Database utilities
│       │   │   ├── validation.ts # Input validation
│       │   │   ├── file-validation.ts # File validation
│       │   │   └── constants.ts # Server constants
│       │   ├── middleware/     # Express middleware
│       │   │   ├── auth.ts     # Authentication middleware
│       │   │   ├── cors.ts     # CORS configuration
│       │   │   ├── rate-limit.ts # Rate limiting
│       │   │   └── error.ts    # Error handling
│       │   ├── models/         # Data models
│       │   │   ├── user.ts     # User model
│       │   │   ├── project.ts  # Project model
│       │   │   └── file.ts     # File model
│       │   ├── types/          # TypeScript definitions
│       │   │   ├── auth.ts     # Auth types
│       │   │   ├── api.ts      # API types
│       │   │   └── database.ts # Database types
│       │   ├── server.ts       # Express server setup
│       │   └── trpc.ts         # tRPC configuration
│       ├── .env.example        # Environment template
│       ├── package.json        # Backend dependencies
│       └── tsconfig.json       # TypeScript config
├── packages/
│   ├── config/                 # Shared configurations
│   │   ├── eslint/             # ESLint configurations
│   │   │   ├── next.js         # Next.js ESLint config
│   │   │   ├── node.js         # Node.js ESLint config
│   │   │   └── base.js         # Base ESLint config
│   │   ├── typescript/         # TypeScript configurations
│   │   │   ├── next.json       # Next.js TS config
│   │   │   ├── node.json       # Node.js TS config
│   │   │   └── base.json       # Base TS config
│   │   └── tailwind/           # Tailwind configurations
│   │       └── base.js         # Base Tailwind config
│   └── ui/                     # Shared UI components (optional)
│       ├── src/
│       │   ├── components/     # Reusable UI components
│       │   └── styles/         # Shared styles
│       └── package.json
├── tests/                      # Test files
│   ├── integration/            # Integration tests
│   │   ├── auth.spec.ts        # Authentication tests
│   │   ├── file-upload.spec.ts # File upload tests
│   │   └── api.spec.ts         # API endpoint tests
│   ├── e2e/                    # End-to-end tests
│   │   ├── authentication.spec.ts # Auth flow tests
│   │   ├── file-upload.spec.ts # Upload flow tests
│   │   └── visualization.spec.ts # Visualization tests
│   ├── fixtures/               # Test data and fixtures
│   │   ├── midi-files/         # Sample MIDI files
│   │   ├── audio-files/        # Sample audio files
│   │   └── test-data.json      # Test data
│   └── utils/                  # Test utilities
│       ├── setup.ts            # Test setup
│       ├── mock-data.ts        # Mock data generators
│       └── helpers.ts          # Test helpers
├── docs/                       # Documentation
│   ├── architecture/           # Architecture documentation
│   ├── prc/                    # Sharded PRD
│   ├── stories/                # User stories
│   └── README.md               # Project documentation
├── .ai/                        # AI development files
│   ├── debug-log.md            # Development debug log
│   └── core-dump*.md           # Agent core dumps
├── bmad/                       # BMAD development system
│   └── .bmad-core/             # BMAD configuration
├── .gitignore                  # Git ignore rules
├── .env.example                # Root environment template
├── package.json                # Root package.json (workspaces)
├── pnpm-workspace.yaml         # PNPM workspace config
└── README.md                   # Project README
```

## Development File Organization

### Frontend Components Structure

```plaintext
src/components/
├── auth/                       # Authentication-related components
│   ├── login-form.tsx         # Login form component
│   ├── signup-form.tsx        # Signup form component
│   ├── oauth-buttons.tsx      # Social login buttons
│   ├── auth-guard.tsx         # Route protection component
│   └── profile-menu.tsx       # User profile dropdown
├── upload/                     # File upload components
│   ├── file-dropzone.tsx      # Drag & drop upload area
│   ├── upload-progress.tsx    # Upload progress indicator
│   ├── file-list.tsx          # Uploaded files list
│   ├── file-preview.tsx       # File preview component
│   └── upload-manager.tsx     # Upload queue manager
├── editor/                     # Visualization editor components
│   ├── canvas-viewer.tsx      # Main visualization canvas
│   ├── timeline-scrubber.tsx  # Timeline control
│   ├── settings-panel.tsx     # Visualization settings
│   ├── color-picker.tsx       # Color scheme picker
│   └── export-controls.tsx    # Export/render controls
├── ui/                         # shadcn/ui components
│   ├── button.tsx             # Button component
│   ├── input.tsx              # Input component
│   ├── dialog.tsx             # Dialog component
│   ├── toast.tsx              # Toast notifications
│   └── loading-spinner.tsx    # Loading indicator
└── common/                     # Shared components
    ├── layout.tsx             # Page layout wrapper
    ├── header.tsx             # Site header
    ├── footer.tsx             # Site footer
    ├── navigation.tsx         # Navigation menu
    └── error-boundary.tsx     # Error boundary wrapper
```

### Backend Services Structure

```plaintext
src/services/
├── auth.ts                     # Authentication business logic
├── file.ts                     # File processing and validation
├── s3.ts                       # AWS S3 operations
├── project.ts                  # Project management logic
├── render.ts                   # Video rendering coordination
├── queue.ts                    # Message queue operations
├── notification.ts             # User notifications
└── analytics.ts                # Usage analytics
```

## File Naming Conventions

### Frontend Files
- **Components:** PascalCase with descriptive names (`FileUploadZone.tsx`)
- **Hooks:** camelCase with "use" prefix (`useFileUpload.ts`)
- **Pages:** kebab-case following Next.js conventions (`user-profile/page.tsx`)
- **Utilities:** kebab-case (`file-validation.ts`)
- **Types:** kebab-case with .types suffix (`auth.types.ts`)

### Backend Files
- **Routers:** singular noun (`user.ts`, `project.ts`)
- **Services:** singular noun (`auth.ts`, `file.ts`)
- **Models:** singular noun (`user.ts`, `project.ts`)
- **Middleware:** descriptive function (`rate-limit.ts`, `error-handler.ts`)

### Test Files
- **Unit Tests:** `[component].test.ts` or `[component].spec.ts`
- **Integration Tests:** `[feature].integration.spec.ts`
- **E2E Tests:** `[flow].e2e.spec.ts`

## Import Organization

### Import Order
```typescript
// 1. Node modules
import React from 'react';
import { NextRequest } from 'next/server';

// 2. Internal modules (absolute imports)
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

// 3. Relative imports
import './component.css';
import { helperFunction } from '../utils';
```

### Path Aliases
```typescript
// tsconfig.json path mapping
{
  "@/*": ["./src/*"],
  "@/components/*": ["./src/components/*"],
  "@/lib/*": ["./src/lib/*"],
  "@/hooks/*": ["./src/hooks/*"],
  "@/types/*": ["./src/types/*"]
}
```

## Environment Configuration

### Development Environment Files
```plaintext
# Root level
.env.example                    # Template for all environments
.env.local                      # Local development overrides

# App level  
apps/web/.env.example          # Frontend environment template
apps/web/.env.local            # Frontend local settings

apps/api/.env.example          # Backend environment template
apps/api/.env.local            # Backend local settings
```

### Environment Variable Naming
```bash
# Frontend (Next.js) - must start with NEXT_PUBLIC_ for client access
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Backend - no prefix restrictions
DATABASE_URL=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
REDIS_URL=
```

## Build and Deployment Structure

### Build Outputs
```plaintext
# Frontend build
apps/web/.next/                 # Next.js build output
apps/web/out/                   # Static export (if needed)

# Backend build
apps/api/dist/                  # TypeScript compiled output
apps/api/node_modules/          # Dependencies

# Package builds
packages/config/dist/           # Shared config builds
packages/ui/dist/               # UI package build
```

### Deployment Configuration
```plaintext
.github/
└── workflows/
    ├── ci.yml                  # Test and build validation
    ├── deploy-staging.yml      # Staging deployment
    └── deploy-prod.yml         # Production deployment
```

This source tree structure ensures:
- ✅ Clear separation of concerns
- ✅ Consistent naming conventions
- ✅ Scalable file organization
- ✅ Easy navigation for development teams
- ✅ Proper environment management 