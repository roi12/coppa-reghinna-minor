# PROJECT_PLAN.md

## Objective

Build a practical, production-oriented MVP for a modular sports tournament management SaaS using Next.js App Router, TypeScript, Tailwind CSS, Prisma, and a feature-based architecture.

The first delivered workflow is:

Organizer creates a tournament -> adds teams -> creates matches manually -> enters results -> public page shows calendar and standings.

## Current Repository Baseline

Current state of the repository:

- Next.js app exists but still uses the default starter page and metadata
- Tailwind is available through the Next.js setup
- Prisma is installed and configured, but the schema is still a starter scaffold
- Zod is installed
- no feature modules exist yet
- no tournament domain model exists yet
- no organizer or public route structure exists yet

Implication:

- the next work should create product structure first, not jump straight into UI details
- the first implementation should switch local development to SQLite while keeping a path to PostgreSQL later

## Product Goals For MVP

The MVP should prove that the system can support the core organizer workflow from data entry to public consumption.

The MVP must provide:

- a way to create a tournament under an organizer context
- a way to add teams to that tournament
- a way to manually create scheduled matches
- a way to enter final scores
- automatic standings derived from match results
- a public tournament page with fixtures and standings

## Explicit Non-Goals For MVP

Do not include these in the first slice:

- payment or subscription logic
- advanced authentication and permissions matrix
- self-service team registration
- automated round-robin or knockout generators
- referee assignment
- player statistics
- media galleries or social content
- multi-sport rules engines
- live scoring websockets
- mobile app support

These can come later once the base tournament workflow is stable.

## Product Assumptions

To keep the first slice practical:

- start with one organizer-facing workflow and one public workflow
- allow a simple local organizer context rather than full auth if auth is not yet implemented
- use one default standings ruleset for all MVP tournaments
- support team-based tournaments only in the first slice
- treat matches as manually entered fixtures with date, time, location, and score

## Recommended Folder Architecture

```text
src/
  app/
    (dashboard)/
      layout.tsx
      tournaments/
        new/
          page.tsx
        [tournamentId]/
          page.tsx
          teams/
            page.tsx
          matches/
            page.tsx
          results/
            page.tsx
    tournaments/
      [slug]/
        page.tsx
    api/
      health/
        route.ts

  components/
    layout/
      app-shell.tsx
      page-header.tsx
    ui/
      badge.tsx
      button.tsx
      card.tsx
      empty-state.tsx
      input.tsx
      select.tsx
      table.tsx

  features/
    organizations/
      components/
      schemas/
      server/
      types/
    tournaments/
      components/
        tournament-form.tsx
        tournament-summary-card.tsx
      schemas/
        create-tournament.schema.ts
      server/
        create-tournament.ts
        get-tournament-by-id.ts
        get-tournament-by-slug.ts
        list-tournaments.ts
      types/
        tournament.types.ts
    teams/
      components/
        team-form.tsx
        teams-table.tsx
      schemas/
        create-team.schema.ts
      server/
        add-team-to-tournament.ts
        create-team.ts
        list-tournament-teams.ts
      types/
        team.types.ts
    matches/
      components/
        match-form.tsx
        matches-table.tsx
        result-form.tsx
      schemas/
        create-match.schema.ts
        report-result.schema.ts
      server/
        create-match.ts
        list-tournament-matches.ts
        report-match-result.ts
      types/
        match.types.ts
    standings/
      server/
        calculate-standings.ts
        get-tournament-standings.ts
      types/
        standings.types.ts

  lib/
    prisma.ts
    utils.ts
    constants/
      standings.ts
    validations/
      common.ts
```

### Why This Structure

- `src/app` remains thin and route-focused
- business rules live in feature modules
- each feature owns its validation and persistence logic
- public and organizer surfaces can evolve independently
- standings logic is isolated so ranking rules stay consistent across admin and public pages

## MVP Domain Model

The first slice should use a small, durable model.

### Organization

Purpose:

- owns tournaments

Minimum fields:

- `id`
- `name`
- `slug`
- `createdAt`
- `updatedAt`

### Tournament

Purpose:

- core competition container

Minimum fields:

- `id`
- `organizationId`
- `name`
- `slug`
- `sport`
- `seasonLabel`
- `locationLabel` optional
- `status`
- `startsAt` optional
- `endsAt` optional
- `publishedAt` optional
- `createdAt`
- `updatedAt`

### Team

Purpose:

- reusable team identity

Minimum fields:

- `id`
- `organizationId`
- `name`
- `slug`
- `createdAt`
- `updatedAt`

### Tournament Team

Purpose:

- links teams into a specific tournament

Minimum fields:

- `id`
- `tournamentId`
- `teamId`
- `seed` optional
- `createdAt`

This join model is worth adding early because it avoids painting the schema into a corner.

### Match

Purpose:

- manually scheduled fixture and result container

Minimum fields:

- `id`
- `tournamentId`
- `homeTeamId`
- `awayTeamId`
- `roundLabel` optional
- `startsAt` optional
- `locationLabel` optional
- `status`
- `homeScore` optional
- `awayScore` optional
- `createdAt`
- `updatedAt`

## MVP Vertical Slice Definition

### Primary User Story

An organizer can create a tournament from scratch, populate the participating teams, define the fixture list manually, report final scores, and immediately publish a public-facing page where visitors can see upcoming or completed matches and the standings table.

### Organizer Workflow

1. Create tournament.
2. Add teams to the tournament.
3. Create matches by selecting home team, away team, date/time, and optional location.
4. Enter or edit final scores for each match.
5. View the current standings generated from played matches.
6. Publish or access the public tournament page by slug.

### Public Workflow

1. Open tournament public page.
2. See tournament header information.
3. See match calendar in chronological order.
4. See standings table derived from results.

### MVP Screens

Organizer-facing screens:

- tournament creation page
- tournament overview page
- tournament teams management page
- tournament matches management page
- tournament results management page

Public-facing screen:

- tournament public page with calendar and standings

### MVP Capabilities By Module

`organizations`

- provide tournament ownership context
- likely seeded or stubbed at first if auth is deferred

`tournaments`

- create tournament
- fetch tournament by id and slug
- expose summary details for admin and public pages

`teams`

- create teams
- add teams to tournament
- list tournament teams

`matches`

- create manual fixtures
- list fixtures in chronological order
- submit final scores
- mark match status as scheduled or final

`standings`

- compute rankings from final matches only
- expose a reusable standings read model for organizer and public views

## Data Flow Design

For the MVP, each write should follow the same path:

1. page submits form data
2. Zod schema validates payload
3. feature server action or mutation service executes business rule
4. Prisma persists changes
5. page revalidates and re-renders the updated read model

This pattern keeps mutation logic explicit and prevents UI files from turning into service layers.

## Production-Oriented Constraints

To avoid rework later:

- use slugs from the beginning for public tournament pages
- keep feature services small and composable
- isolate standings calculation in pure functions where possible
- keep DB schema neutral enough for later PostgreSQL migration
- include status fields now rather than inferring everything from nullable columns
- design public pages to work without organizer session context

## First Implementation Phase

### Phase 1 Goal

Deliver the full MVP slice end to end for one organizer context in local development.

### Phase 1 Scope

Implement only what is needed for the flow below:

- create one organization context
- create tournaments inside that organization
- add teams to a tournament
- create manual matches for that tournament
- report results
- render a public page with fixtures and standings

### Phase 1 Execution Order

1. Replace starter app framing with a tournament-product shell and route groups.
2. Rework Prisma for the MVP domain model and local SQLite development.
3. Add shared infrastructure: Prisma client, shared validation helpers, route-level shells.
4. Implement tournament creation flow.
5. Implement team creation and assignment to tournament.
6. Implement manual match creation.
7. Implement result entry and standings computation.
8. Implement public tournament page.
9. Run lint, build, and a manual QA pass across the full workflow.

### Phase 1 Deliverables

- feature module skeletons for organizations, tournaments, teams, matches, and standings
- Prisma schema and first migration for the MVP entities
- organizer routes for tournament setup and operations
- public tournament route by slug
- standings calculation service
- basic original UI for forms, tables, and status display

### Phase 1 Acceptance Criteria

The first implementation phase is complete when:

- an organizer can create a tournament without editing the database manually
- teams can be added through the app UI
- matches can be created manually through the app UI
- results update the standings correctly
- the public page shows both calendar and standings from persisted data
- the codebase follows the feature architecture described above
- `npm run lint` passes
- `npm run build` passes

### Recommended Immediate Next Step

Start implementation with repository structure and data model, not with visual polish.

The first coding task should be:

- create the route groups and feature module folders
- define the Prisma MVP schema for SQLite local development
- add the tournament creation path as the first working organizer flow

That gives the project a stable spine for the remaining slice.
