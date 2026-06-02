# Sports Platform

Sports Platform powers the public and organizer workflow for **Coppa Reghinna Minor 2026**:

- public tournament pages
- captain team registration
- owner/admin approval
- groups and group-stage match generation
- results and standings

The app is now prepared for **PostgreSQL-backed deployment on Vercel**. Local development should also use PostgreSQL so the local environment matches production behavior.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma 7
- PostgreSQL
- Zod

## Environment

Copy the example file first:

```bash
cp .env.example .env
```

Required variables:

- `DATABASE_URL`
  PostgreSQL connection string for local and production environments.
- `APP_URL`
  Public base URL used for metadata, sitemap, and robots output.

Production seed variables:

- `PRODUCTION_OWNER_EMAIL`
- `PRODUCTION_OWNER_NAME` optional, default provided
- `PRODUCTION_OWNER_PASSWORD`
- `PRODUCTION_ADMIN_EMAIL`
- `PRODUCTION_ADMIN_NAME` optional, default provided
- `PRODUCTION_ADMIN_PASSWORD`

Optional local QA variables:

- `SMOKE_TEST_BASE_URL`
- `SMOKE_TEST_TOURNAMENT_SLUG`

Example local PostgreSQL configuration:

```env
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/sports_platform?schema=public"
APP_URL="http://localhost:3000"
```

Example production PostgreSQL configuration:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"
APP_URL="https://your-domain.example"
PRODUCTION_OWNER_EMAIL="owner@example.com"
PRODUCTION_OWNER_PASSWORD="strong-owner-password"
PRODUCTION_ADMIN_EMAIL="admin@example.com"
PRODUCTION_ADMIN_PASSWORD="strong-admin-password"
```

## Local Development

This project uses Node 22.

```bash
nvm use
npm install
```

Make sure a local PostgreSQL database exists and `DATABASE_URL` points to it, then run:

```bash
npm run db:push
npm run db:seed
```

Start the app:

```bash
npm run dev
```

Local seed behavior:

- `npm run db:seed` loads local demo credentials and sample tournament data
- it is intended only for local development and QA
- do **not** run it in production

If you prefer migrations locally instead of `db:push`:

```bash
npm run db:migrate
npm run db:seed
```

## Database Scripts

- `npm run db:generate`
  Regenerates Prisma Client.
- `npm run db:migrate`
  Runs Prisma dev migrations locally.
- `npm run db:migrate:deploy`
  Applies committed migrations in deployment environments.
- `npm run db:push`
  Syncs the current schema directly to the database.
- `npm run db:seed`
  Loads local demo data.
- `npm run db:seed:production`
  Loads the minimal branded production baseline.

## Production Seed

`npm run db:seed:production` creates:

- organization `Coppa Reghinna Minor`
- tournament `Coppa Reghinna Minor 2026`
- slug `coppa-reghinna-minor-2026`
- sport `Futsal`
- status `PUBLISHED`
- format `GROUPS_PLUS_KNOCKOUT`
- one `OWNER` user from env vars
- one `ADMIN` user from env vars

It intentionally creates:

- zero teams
- zero players
- zero matches
- zero team registrations

It is safe for an empty deployment bootstrap and should be used instead of the demo seed in production.

## Smoke Test

Run the smoke test against a running app:

Terminal 1:

```bash
npm run dev
```

Terminal 2:

```bash
npm run smoke:test
```

Default expectations:

- base URL: `http://127.0.0.1:3000`
- tournament slug: `coppa-reghinna-minor-2026`

Override if needed:

```bash
SMOKE_TEST_BASE_URL="https://your-domain.example" \
SMOKE_TEST_TOURNAMENT_SLUG="your-public-slug" \
npm run smoke:test
```

## End-To-End QA

One-time browser setup:

```bash
npx playwright install chromium
```

Run the suite:

```bash
npm run test:e2e
```

Or the UI runner:

```bash
npm run test:e2e:ui
```

## Vercel Deployment

Recommended production model:

- Vercel for the Next.js app
- managed PostgreSQL for the database
- `DATABASE_URL` stored in Vercel environment variables

Recommended deployment flow:

1. Create the PostgreSQL database.
2. Set Vercel environment variables.
3. Run migrations with:

```bash
npm run db:migrate:deploy
```

4. Bootstrap production data with:

```bash
npm run db:seed:production
```

5. Deploy the app on Vercel.

Important production warning:

- do **not** run `npm run db:seed` in production
- it creates demo users and demo tournament data

### Monorepo Note

If this app later lives inside a GitHub monorepo subfolder, set the Vercel **Root Directory** to the app folder containing this `package.json`.

## Validation Commands

Run before sharing or deploying:

```bash
npm run lint
npm run build
```
