# Sports Platform

Sports Platform powers the public and organizer workflow for **Coppa Reghinna Minor 2026**:

- public tournament pages
- captain team registration and private registration management
- owner/admin approval and tournament operations
- competition-structure generation, group assignment, and calendar scheduling
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
  This creates the real team, attaches it to the tournament, creates the roster players, assigns the next seed, rotates the captain private manage link, marks the registration as reviewed, and emails the captain the new link.
- Reject a pending registration.
- Regenerate a captain private manage link if the original link is lost.
- Save competition settings for:
  `SINGLE_ROUND_ROBIN`, `DOUBLE_ROUND_ROBIN`, `GROUPS_ONLY`, `GROUPS_THEN_KNOCKOUT`, and `KNOCKOUT_ONLY`.
- Create or randomize group assignments for grouped tournaments.
- Generate competition structure separately from scheduling:
  group fixtures, knockout dependencies, and placeholder participants are created first without forcing dates.
- Reschedule generated matches without rebuilding the competition structure.
- Resolve knockout participants from final group standings and completed upstream knockout matches.
- Delete only generated scheduled structure when it is still safe to do so.
- Create matches manually.
- Enter final match results or return a match to scheduled status.

### What Captains Can Do Today

- Submit a public team registration when the tournament status is `PUBLISHED`.
- Enter captain first name, last name, email, phone, team name, optional notes, and a roster.
- Submit a roster with:
  minimum `5` players and maximum `11` players.
- Enter, for each player:
  first name, last name, jersey number, and optional role.
- Receive a confirmation email with a private manage link after registration submission.
- Still see the private manage link immediately after registration submission in the current success flow.
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
- full calendar of scheduled, live, and completed matches
- placeholder participant labels for unresolved knockout slots such as group positions and upstream winners
- team standings based on final results only, including per-group standings for grouped tournaments
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
- No dedicated visual knockout bracket page yet; the public calendar already shows knockout rounds and placeholder participants.
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

For local development, keep both `.env` and `.env.local` pointed at the same local PostgreSQL database. In this repository:

- Next.js loads `.env.local` and `.env`
- Prisma CLI loads `.env`
- standalone Prisma and seed scripts that import `dotenv/config` also load `.env`

Copy the example file first:

```bash
cp .env.example .env
cp .env.example .env.local
```

Required local variables:

- `APP_ENV`
  Use `local` for the local-only setup.
- `DATABASE_URL`
  PostgreSQL connection string used by the app runtime.
- `DIRECT_URL`
  PostgreSQL connection string used by Prisma CLI through `prisma.config.ts`.
- `APP_URL`
  Public base URL used locally for metadata and captain manage links.
- `TEST_REGISTRATION_SEED_CONFIRM`
  Set to `LOCAL_ONLY` only when you intentionally want the development registration seed to be allowed to run.

Optional local placeholders:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_TEAM_DOCUMENTS_BUCKET`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `EMAIL_FROM`
- `EMAIL_REPLY_TO`
- `SMOKE_TEST_BASE_URL`
- `SMOKE_TEST_TOURNAMENT_SLUG`

If the SMTP variables are unset, registration and approval still work and captain emails are skipped safely.

Example local PostgreSQL configuration:

```env
APP_ENV="local"
DATABASE_URL="postgresql://reghinna:reghinna_local_password@localhost:5432/reghinna_local?schema=public"
DIRECT_URL="postgresql://reghinna:reghinna_local_password@localhost:5432/reghinna_local?schema=public"
APP_URL="http://localhost:3000"
TEST_REGISTRATION_SEED_CONFIRM="LOCAL_ONLY"
```

## Local Development

## Tournament Formats And Scheduling

Competition generation and calendar scheduling are now separate operations.

- Competition generation creates stages, grouped fixtures, knockout rounds, and participant dependencies.
- Calendar scheduling assigns dates and kickoff times later, using the saved slot configuration.
- Rescheduling preserves pairings and results.
- Regenerating structure is blocked when protected matches already exist.
- Legacy tournaments without stage records still work through the compatibility layer and are not auto-deleted.

Supported formats:

- `SINGLE_ROUND_ROBIN`
- `DOUBLE_ROUND_ROBIN`
- `GROUPS_ONLY`
- `GROUPS_THEN_KNOCKOUT`
- `KNOCKOUT_ONLY`

Coppa Reghinna Minor 2026 target configuration:

- 16 teams
- 4 groups
- 4 teams per group
- single round-robin group stage
- top 2 per group qualify
- quarter-finals, semi-finals, final
- no third-place match
- 31 matches total

Default local scheduling for this format can be configured with:

- start date chosen by the organizer
- maximum 2 matches per day
- slot times `22:00, 23:00`
- duration `60` minutes
- no team twice on the same calendar day

Unit coverage for the pure generator and scheduler is available with:

```bash
npm run test:unit
```

## Development Registration Seed

Use `npm run seed:test-registrations` to create 16 synthetic pending team registrations for the seeded tournament slug `coppa-reghinna-minor-2026`.

Requirements:

- `NODE_ENV` must not be `production`.
- `TEST_REGISTRATION_SEED_CONFIRM` must be set to `LOCAL_ONLY` only for the run that should create or clean the synthetic registrations.
- `DATABASE_URL` must point to a local PostgreSQL host.
- If `DIRECT_URL` is set, it must also point to a local PostgreSQL host.
- If `APP_URL` is set, it must be a local frontend URL such as `http://localhost:3000`.

Behavior:

- The seed creates only synthetic captain and player data, prefixes every team with `TEST –`, and marks every registration note with `BETA_TEST_DATA_2026`.
- It does not send email and does not call external services.
- It creates pending `TeamRegistration` and `TeamRegistrationPlayer` data only. It does not approve registrations and does not create `Team`, `TournamentTeam`, or `Player` records directly.
- After creation it prints the local captain private management links once in the terminal.

Idempotency and cleanup:

- Re-running `npm run seed:test-registrations` deletes and recreates only the exact marked synthetic registrations for that tournament.
- If one of those synthetic registrations was approved and now has linked matches, the script stops instead of deleting related data silently.
- Use `npm run seed:test-registrations -- --cleanup-only` to remove only the marked synthetic registration dataset when it is safe to do so.

Testing scope:

- This seed helps test dashboard review, pending registration listing, captain private links, document workflows, and approval or rejection paths against deterministic data.
- It does not test the browser submission flow itself. Keep at least one end-to-end form submission test for that path.

This project uses Node 22.

```bash
nvm use
npm install
```

Make sure a local PostgreSQL database exists and `DATABASE_URL` points to it, then run:

```bash
npm run db:push
```

Use the local databases like this:

- `reghinna_local`
  clean local development database
- `reghinna_test`
  destructive test and simulation database

`npm run dev` does not seed data automatically. It starts the app on `127.0.0.1` only and shows whatever is already stored in the current local database.

Only run `npm run db:seed`, `npm run db:seed:demo`, or `npm run db:seed:base` when you intentionally want to replace the current local seeded organizations and tournaments. They are not safe as routine verification steps if you need to preserve an existing local Coppa Reghinna Minor dataset.

Start the app:

```bash
npm run dev
```

Local seed behavior:

- `npm run db:seed` loads the clean base local records for the Coppa Reghinna Minor tournament
- `npm run db:seed:base` does the same explicitly
- `npm run db:seed:demo` loads the base local records plus the four demo teams, players, and sample matches
- it creates sample `OWNER`, `ADMIN`, and `VIEWER` accounts
- it is intended only for local development and QA
- do **not** run it in production

If you prefer migrations locally instead of `db:push`:

```bash
npm run db:migrate
npm run db:seed
```

For clean local development on `reghinna_local`, reset safely and reload only the base records:

```bash
npm run db:reset:local
```

That reset refuses non-local hosts and only works when the active database is `reghinna_local`.

For manual 16-team registration testing, start from the clean base seed:

```bash
npm run db:seed:base
```

That leaves the target tournament with:

- 0 teams
- 0 `TournamentTeam` links
- 0 players
- 0 matches
- 0 groups
- 0 generated stages
- 0 schedule slots

ready for synthetic registration approvals or manual setup.

For destructive tournament simulation, use `reghinna_test` instead of `reghinna_local`. Provision the database first if needed:

```bash
npm run db:test:ensure
```

Then run the explicit 16-team registration simulation only when you want it:

```bash
npm run seed:test-registrations
```

That script is the only path that should create the fake 16 pending registrations used for approval and calendar testing.

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
  Loads the clean local base seed.
- `npm run db:seed:base`
  Loads only the base local records needed for manual tournament testing.
- `npm run db:seed:demo`
  Loads the base local records plus the four demo teams, players, and sample matches.
- `npm run db:reset:local`
  Resets only `reghinna_local` and re-seeds it with the clean base records.
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

- do **not** run `npm run db:seed` or `npm run db:seed:demo` in production
- they create demo users and demo tournament data

### Monorepo Note

If this app later lives inside a GitHub monorepo subfolder, set the Vercel **Root Directory** to the app folder containing this `package.json`.

## Validation Commands

Run before sharing or deploying:

```bash
npm run lint
npm run build
```
