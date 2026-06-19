# AGENTS.md

## Project Mission

Build a modular sports tournament management platform for organizers.

The platform serves organizers, teams, players, and spectators through private dashboard workflows and public tournament pages.

Product direction is inspired by the category and workflow of tools like Enjore, but this repository must not copy Enjore code, branding, UI, wording, images, data structures, or proprietary assets. Use original naming, original interface decisions, and original copy.

## Current Product Scope

The current Coppa Reghinna Minor flow includes:

- teams register publicly
- captains receive private manage links
- admins review and approve registrations
- approval creates `Team`, `TournamentTeam`, and `Player` records
- organizers configure tournament format
- organizers assign groups
- organizers generate competition structure and calendar
- organizers enter results
- public users view calendar, standings, and teams
- the final phase can stay hidden publicly until the organizer reveals it

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma
- PostgreSQL locally
- Supabase/PostgreSQL production target
- Zod for validation
- local Docker/Postgres where applicable

## Coppa Tournament Invariants

For Coppa Reghinna Minor 2026:

- 16 teams
- 4 groups of 4
- each team plays 3 group matches
- top 2 teams per group qualify
- knockout starts at quarter-finals
- no third-place final
- 31 total matches:
- 24 group matches
- 4 quarter-finals
- 2 semi-finals
- 1 final
- schedule only Monday–Thursday
- 2 matches per valid day
- slots: `22:00` and `23:00`
- a `23:00` match may end at `00:00` the next day but belongs to the start date
- the final phase can be hidden publicly through stage visibility

## Delivery Principles

- Work one vertical slice at a time.
- Prefer production-friendly simplicity over premature abstraction.
- Keep business logic out of page components and presentational UI.
- Build modules around domain features, not around framework file types.
- Add dependencies only when they remove meaningful complexity.
- Keep naming explicit and domain-oriented.
- Document assumptions when they affect later phases.

## Architecture Rules

Use a feature-based structure under `src/`:

- `src/app` for routes, layouts, and page composition only
- `src/features/organizations`
- `src/features/tournaments`
- `src/features/teams`
- `src/features/players`
- `src/features/matches`
- `src/features/standings`
- `src/features/team-registrations`
- `src/features/auth`
- `src/components/ui` for shared primitive UI pieces
- `src/components/layout` for shared shells and navigation
- `src/lib` for cross-feature utilities and infrastructure

Inside each feature, prefer this separation:

- `components/` for feature UI
- `server/` for Prisma queries, mutations, and domain services
- `schemas/` for Zod validation
- `types/` for feature-specific TypeScript types when needed
- `utils/` only when logic is feature-local and not server-specific

## App Router Conventions

- Keep route files thin.
- Pages should assemble feature modules rather than own business rules.
- Put mutations behind server actions or route handlers with Zod validation.
- Use stable, readable URLs based on slugs for public tournament pages.
- Preserve public route access without authentication.
- Protect dashboard routes behind authentication and authorization.

Current routing direction:

- organizer area: `/dashboard/...`
- public area: `/tournaments/[slug]...`

## Data and Domain Rules

Current core entities include:

- `Organization`
- `Tournament`
- `Team`
- `TournamentTeam`
- `TournamentStage`
- `TournamentGroup`
- `TournamentScheduleSlot`
- `Match`
- `Player`
- `TeamRegistration`
- `TeamRegistrationPlayer`

General data rules:

- always store timestamps with `createdAt` and `updatedAt`
- use unique slugs for public tournament pages
- enforce validation with Zod at every write boundary
- keep Prisma access in feature `server/` modules or shared infrastructure, not inside UI components
- keep standings logic inside the standings feature, not spread across UI files

## Standing Rules

Use the existing default ruleset unless explicitly changed:

- win = 3 points
- draw = 1 point
- loss = 0 points
- standings sorted by points, then goal difference, then goals scored, then team name

## Database and Environment Safety Rules

- Never run destructive database commands unless `APP_ENV` is `local` or `test` and the database host is `localhost` or `127.0.0.1`.
- Never run test registration seeds against Supabase or any remote database.
- Never reset, truncate, delete, or reseed production data unless explicitly instructed and protected by a production-specific script.
- Never commit `.env` or `.env.local`.
- `.env.example` may contain placeholders only.
- Do not expose Supabase service role keys, SMTP passwords, production URLs, admin passwords, or tokens.
- UI must never show local test credentials in staging or production.
- Local login hints are allowed only in local/test development mode.

## Migration Rules

- Any Prisma schema change must include a migration.
- After schema changes, run:
- `npx prisma migrate status`
- `npx prisma generate`
- `npx tsc --noEmit`
- `npm run lint`
- `npm run test:unit`
- `npm run build`
- If code references a new database column, ensure the migration exists and is applied locally.
- UI-only tasks must not modify Prisma schema or migrations.

## Agent Working Rules

- Keep task scope narrow.
- Do not modify unrelated files.
- Do not claim browser or E2E confirmation unless actually tested in a browser or with Playwright.
- Always state exactly what was changed and what was tested.
- If a command fails, explain the failure and whether it blocks the task.
- For server actions using Next.js `redirect`, do not catch `NEXT_REDIRECT` as a normal error.
- Preserve public route access without authentication.
- Protect dashboard routes behind authentication and authorization.

## Tournament Lifecycle Rules

The expected deterministic setup workflow is:

1. Competition settings
2. Group assignment
3. Generate competition structure/calendar
4. Enter results
5. Reveal final phase publicly when ready

Rules:

- Saving competition settings after group assignments or matches exist must be blocked or require explicit reset.
- Group assignment requires valid competition settings and current groups.
- Generation requires valid settings, valid groups, valid slots, and no stale group assignments.
- Dashboard UI should reflect the same lifecycle and should not let users click actions that will obviously fail.

## Public Visibility Rules

- Dashboard always shows all generated matches.
- Public pages show only public stages.
- Group stage is public by default.
- Knockout/final phase may be hidden by default.
- The admin toggle must only change stage visibility.
- The toggle must not delete matches, regenerate the calendar, change results, or change group assignments.

## UI Rules

- Keep the UI original and neutral; do not mimic Enjore screens.
- Favor clarity for organizers over decorative complexity.
- Shared primitives belong in `src/components/ui`.
- Feature-specific screens and tables belong inside their feature folders.
- Empty states, validation messages, and button labels should use original product language.

## Coding Standards

- Use strict TypeScript.
- Default to server-first patterns where practical.
- Avoid `any` unless there is a documented reason.
- Write small, testable functions for domain logic.
- Avoid giant utility files and ambiguous dumping grounds.

## Definition Of Done

A task is not complete unless:

- the requested behavior works end to end at codepath level
- validation exists at write boundaries
- business logic is placed in feature modules, not pages
- no local/test credentials are exposed in production UI
- migrations are included when schema changes
- tests are added or updated when behavior changes
- changed files are explained clearly
- these commands pass:
- `npx tsc --noEmit`
- `npm run lint`
- `npm run test:unit`
- `npm run build`

For database or schema work, also require:

- `npx prisma validate`
- `npx prisma migrate status`
- `npx prisma generate`

If a command fails, fix the issue or state precisely why it cannot be fixed within the current scope.
