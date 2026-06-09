# Sports Platform

Sports Platform powers the public and organizer workflow for **Coppa Reghinna Minor 2026**:

- public tournament pages
- captain team registration and private registration management
- owner/admin approval and tournament operations
- groups and group-stage match generation
- results and standings

The app is now prepared for **PostgreSQL-backed deployment on Vercel**. Local development should also use PostgreSQL so the local environment matches production behavior.

## Current Functionality

This section describes the app **as it works now** (09-06-2026), including the latest registration document flow.

### Roles And Access

- `OWNER`
  Can sign in, access `/dashboard`, create and edit tournaments, manage teams and players, review registrations, reset captain private links, generate schedules, enter results, and publish tournaments.
- `ADMIN`
  Same current dashboard permissions as `OWNER`.
- `VIEWER`
  Can sign in, but cannot access the organizer dashboard. Viewer accounts are limited to the public tournament area.
- `Captain` via private manage link
  Does not need a dashboard account. After submitting a team registration, the captain receives a private link that shows registration status and allows player document uploads or paper-delivery marking.
- Public visitor
  Can browse published tournament pages without signing in.

### What Organizers Can Do Today

- Sign in with seeded local accounts.
- Access a dashboard listing organizations and tournaments.
- Create tournaments.
- Edit tournament name, slug, sport, season, location, status, format, and start/end dates.
- Open the public page for any tournament directly from the dashboard.
- Create a new team and attach it to a tournament immediately.
- Reuse an existing organization team in a tournament.
- Add players to each tournament team roster manually.
- Review captain-submitted team registrations grouped by `PENDING`, `APPROVED`, and `REJECTED`.
- See captain details, team notes, roster size, and per-player document status inside each registration.
- Approve a pending registration:
  This creates the real team, attaches it to the tournament, creates the roster players, assigns the next seed, and marks the registration as reviewed.
- Reject a pending registration.
- Regenerate a captain private manage link if the original link is lost.
- Configure groups for `GROUPS_PLUS_KNOCKOUT` tournaments.
- Generate round-robin schedules automatically for `ROUND_ROBIN` tournaments.
- Generate group-stage matches automatically from current group assignments for `GROUPS_PLUS_KNOCKOUT` tournaments.
- Create matches manually.
- Enter final match results or return a match to scheduled status.

### What Captains Can Do Today

- Submit a public team registration when the tournament status is `PUBLISHED`.
- Enter captain first name, last name, email, phone, team name, optional notes, and a roster.
- Submit a roster with:
  minimum `5` players and maximum `11` players.
- Enter, for each player:
  first name, last name, jersey number, and optional role.
- Receive a private manage link immediately after registration submission.
- Open the private page to:
  view registration status, roster, timestamps, and review state.
- Download registration PDFs currently exposed by the app:
  adult liability waiver, minor liability waiver, and GDPR/privacy document.
- Upload a player document per roster player through Supabase Storage.
- Upload only `PDF`, `JPG`, or `PNG` files up to `5 MB`.
- Replace a previously uploaded file.
- Mark a player document as `PAPER_DELIVERY` instead of uploading a file.
- Continue uploading documents even after the registration is approved.
- View but not modify documents after the registration is rejected.

### What The Public Area Shows Today

Public tournament navigation currently exposes:

- overview
- team registration
- teams
- calendar
- standings

The public area currently shows:

- tournament identity, status, format, season, dates, location, and support contact
- quick metrics such as teams, matches, and completed results
- overview cards for upcoming matches and final results
- public team rosters with player names and jersey numbers
- full calendar of scheduled and completed matches
- team standings based on final results only
- share actions for public tournament pages

### What Is Stored And Calculated Today

- Organizations, tournaments, teams, tournament-team assignments, groups, players, matches, users, sessions, team registrations, and registration-player document metadata are modeled in Prisma.
- Match results currently store only:
  `status`, `homeScore`, and `awayScore`.
- Team standings are calculated from final scores using:
  points, goal difference, goals scored, and team name.
- Registration player document status supports:
  `MISSING`, `UPLOADED`, and `PAPER_DELIVERY`.

### What The App Does Not Show Or Support Yet

- No player standings or player statistical leaderboards.
- No player match-event tracking such as goals, assists, cautions, expulsions, fouls, suspensions, or minute-by-minute events.
- No public disciplinary tables.
- No referee assignment flow.
- No online payment flow.
- No automated knockout bracket generation yet.
- No public knockout bracket visualization yet.
- No roster editing by captains after initial registration submission; the private link currently covers status and document handling, not roster mutation.
- No document download UI for organizers from the dashboard at the moment; organizer visibility is focused on document status summaries.

### Main Routes

- `/`
  Public landing page.
- `/login`
  Sign-in page for seeded users.
- `/tournaments`
  Public list of published tournaments.
- `/tournaments/[slug]`
  Public tournament overview.
- `/tournaments/[slug]/register-team`
  Public team registration form.
- `/tournaments/[slug]/register-team/manage/[token]`
  Captain private registration management page.
- `/tournaments/[slug]/teams`
  Public team rosters.
- `/tournaments/[slug]/calendar`
  Public fixtures and results.
- `/tournaments/[slug]/standings`
  Public team standings.
- `/dashboard`
  Organizer dashboard for `OWNER` and `ADMIN`.
- `/dashboard/tournaments/new`
  Organizer tournament creation page.
- `/dashboard/tournaments/[slug]`
  Organizer tournament workspace.

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
- `SUPABASE_URL`
  Supabase project base URL used for private team document uploads.
- `SUPABASE_SERVICE_ROLE_KEY`
  Service role key used server-side to upload and delete captain-submitted player documents.
- `SUPABASE_TEAM_DOCUMENTS_BUCKET`
  Private bucket name used for team registration player documents.

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
SUPABASE_URL="https://your-project-ref.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
SUPABASE_TEAM_DOCUMENTS_BUCKET="team-documents"
```

Example production PostgreSQL configuration:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"
APP_URL="https://your-domain.example"
SUPABASE_URL="https://your-project-ref.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
SUPABASE_TEAM_DOCUMENTS_BUCKET="team-documents"
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
- it creates sample `OWNER`, `ADMIN`, and `VIEWER` accounts
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
