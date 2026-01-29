# HevyGoals - Fitness Volume Tracking Dashboard

A web dashboard that connects to the Hevy fitness app API to track and visualize your weightlifting progress toward a customizable yearly volume goal.

## Features

- **Volume Tracking**: Track total weight lifted toward a yearly goal (default: 3,000,000 lbs)
- **Bodyweight Exercise Support**: Accurately calculates volume for pull-ups, dips, push-ups, and other bodyweight exercises using your weight log
- **GitHub-Style Heatmap**: Visual calendar showing daily workout intensity
- **Personal Records (PRs)**: Automatic tracking of exercise PRs with historical data
- **Progress Analytics**: Pacing metrics, projections, and trend visualization
- **Shareable Progress Cards**: Generate and share your progress stats
- **Dark/Light Theme**: Full theme support

## Tech Stack

### Frontend
- React with TypeScript
- Vite build tool
- TanStack Query for data fetching
- Tailwind CSS with shadcn/ui components
- Recharts for data visualization
- Wouter for routing

### Backend
- Node.js with Express
- TypeScript with ESM modules
- PostgreSQL with Drizzle ORM
- Replit Auth (OpenID Connect)

## Setup

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Hevy Pro subscription (required for API access)

### Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Session encryption key
- `REPL_ID` - Replit environment ID
- `ISSUER_URL` - OpenID Connect issuer URL

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Push database schema:
   ```bash
   npm run db:push
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

## Usage

1. Log in with your Replit account
2. Go to Settings and enter your Hevy API key
3. Click "Sync Data" to import your workouts
4. View your progress on the Dashboard

### Weight Log

For accurate bodyweight exercise calculations, add your weight entries in Settings. The app uses your most recent weight entry on or before each workout date.

### Hevy API Key

Get your API key from the Hevy app:
1. Open Hevy app
2. Go to Settings > API
3. Copy your API key (requires Hevy Pro)

## Bodyweight Exercise Calculations

The app correctly handles three types of bodyweight exercises:

| Type | Examples | Calculation |
|------|----------|-------------|
| Pure Bodyweight | Pull-ups, Push-ups, Dips | Bodyweight × Reps |
| Weighted Bodyweight | Weighted Pull-ups, Weighted Dips | (Bodyweight + Added Weight) × Reps |
| Assisted Bodyweight | Assisted Pull-ups, Assisted Dips | (Bodyweight - Assistance) × Reps |

## License

MIT
