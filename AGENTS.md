# AGENTS.md

## Project Mission

Build a modular sports tournament management SaaS for organizers.

Product direction is inspired by the category and workflow of tools like Enjore, but this repository must not copy Enjore code, branding, UI, wording, images, data structures, or proprietary assets. Use original naming, original interface decisions, and original copy.

## Product Scope

The product helps organizers:

- create organizations and tournaments
- register teams and players
- schedule matches
- enter results
- publish public tournament pages with calendar and standings

The initial MVP slice is intentionally narrow:

- organizer creates a tournament
- organizer adds teams
- organizer creates matches manually
- organizer enters results
- public page shows calendar and standings

Anything outside that flow is out of scope until the slice is complete and stable.

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma
- SQLite for the first local MVP, while keeping the schema portable to PostgreSQL later
- Zod for input validation

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
- Use route groups to separate organizer surfaces from public tournament pages.
- Use stable, readable URLs based on slugs for public pages.

Suggested routing direction for the MVP:

- organizer area: `/(app)` or `/(dashboard)`
- public area: `/(public)` or direct public routes such as `/tournaments/[slug]`

## Data and Domain Rules

For the MVP, model the smallest useful set of entities:

- `Organization`
- `Tournament`
- `Team`
- `TournamentTeam` or equivalent join model if teams can be reused later
- `Match`
- `MatchParticipant` only if needed; otherwise keep a simpler home/away team relation for the first slice

Prefer simple enumerations for domain state, for example:

- tournament status: `DRAFT`, `PUBLISHED`, `COMPLETED`
- match status: `SCHEDULED`, `FINAL`

General data rules:

- always store timestamps with `createdAt` and `updatedAt`
- use unique slugs for public tournament pages
- enforce validation with Zod at every write boundary
- keep the local MVP schema SQLite-friendly, but avoid patterns that would block PostgreSQL migration later

## Standing Rules For MVP

Use a clear default ruleset unless explicitly changed:

- win = 3 points
- draw = 1 point
- loss = 0 points
- standings sorted by points, then goal difference, then goals scored, then team name

Keep standings calculation in a dedicated standings module. Do not spread ranking logic across UI files.

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
- Keep Prisma access in feature `server/` modules or shared infrastructure, not inside UI components.
- Avoid giant utility files and ambiguous `helpers.ts` dumping grounds.

## Implementation Order

Build the MVP in this order:

1. application skeleton and route groups
2. Prisma setup for local SQLite MVP
3. organization and tournament creation flow
4. team creation and tournament team listing
5. manual match creation
6. result entry and standings calculation
7. public tournament page with calendar and standings
8. lint, build, and basic QA pass

## Definition Of Done

A task is not complete unless:

- the requested vertical slice behavior works end to end
- validation is present where data enters the system
- business logic is placed in feature modules, not pages
- changed files are explained clearly
- `npm run lint` passes
- `npm run build` passes

If a command fails, fix the issue or state precisely why it cannot be fixed within the current scope.
