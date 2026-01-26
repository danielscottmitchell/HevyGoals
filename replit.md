# HevyGoals - Fitness Volume Tracking Dashboard

## Overview

HevyGoals is a web dashboard that connects to the Hevy fitness app API to track and visualize weightlifting progress toward a customizable yearly volume goal (default: 3,000,000 lbs). The application computes total weight lifted from workout data, displays pacing analytics, shows a GitHub-style contribution heatmap, and tracks personal records (PRs) for exercises.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, using Vite as the build tool
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style variant)
- **Charts**: Recharts for volume progress visualization
- **Path Aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ESM modules
- **API Pattern**: RESTful endpoints under `/api/` prefix
- **Build Process**: esbuild for server bundling, Vite for client

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `shared/schema.ts` defines all tables
- **Key Tables**:
  - `users` and `sessions` - Replit Auth integration
  - `hevy_connections` - API keys and user settings
  - `workouts` - Cached workout data from Hevy API
  - `daily_aggregates` - Pre-computed daily volume stats
  - `pr_events` and `exercise_prs` - Personal record tracking
  - `weight_log` - User bodyweight entries for bodyweight exercise calculations

### Authentication
- **Provider**: Replit Auth (OpenID Connect)
- **Session Storage**: PostgreSQL-backed sessions via `connect-pg-simple`
- **Implementation**: Located in `server/replit_integrations/auth/`

### External API Integration
- **Hevy API**: Third-party fitness tracking API
  - Uses `api-key` header for authentication
  - Endpoints for fetching workouts, workout events, and individual workout details
  - Requires Hevy Pro subscription for API access

### Project Structure
```
client/           # React frontend
├── src/
│   ├── components/   # UI components (dashboard, layout, shadcn/ui)
│   ├── hooks/        # Custom React hooks
│   ├── pages/        # Route pages (Dashboard, Settings, PRs, Landing)
│   └── lib/          # Utilities and query client
server/           # Express backend
├── routes.ts     # API route definitions
├── storage.ts    # Database operations interface
├── db.ts         # Drizzle database connection
└── replit_integrations/auth/  # Authentication setup
shared/           # Shared code between client/server
├── schema.ts     # Drizzle database schema
├── routes.ts     # API contract definitions with Zod
└── models/       # Auth-related models
```

## External Dependencies

### Database
- **PostgreSQL**: Primary database, connection via `DATABASE_URL` environment variable
- **Drizzle ORM**: Schema management and queries
- **drizzle-kit**: Database migrations (`npm run db:push`)

### Third-Party APIs
- **Hevy API** (`api.hevyapp.com`): Fitness workout data source
  - Requires user-provided API key stored in `hevy_connections` table
  - Pro subscription required for API access

### Authentication Services
- **Replit Auth**: OpenID Connect provider via `ISSUER_URL`
- Required environment variables: `SESSION_SECRET`, `REPL_ID`

### Key NPM Packages
- Frontend: React, TanStack Query, Recharts, date-fns, wouter, react-hook-form, zod
- Backend: Express, Passport, drizzle-orm, pg, connect-pg-simple
- Shared: Zod for validation, drizzle-zod for schema-to-validation generation