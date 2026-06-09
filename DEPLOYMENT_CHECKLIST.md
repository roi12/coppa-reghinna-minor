# Deployment Checklist

This checklist covers the PostgreSQL + Vercel deployment path for the current app.

## 1. Local Pre-Deploy Commands

```bash
cp .env.example .env
npm install
npm run db:generate
npm run lint
npm run build
```

For a full local database check against PostgreSQL:

```bash
npm run db:push
npm run db:seed
```

Important:

- `npm run db:seed` is a local demo seed only
- never use the demo seed in production

## 2. Required Environment Variables

Required in Vercel:

- `DATABASE_URL`
  PostgreSQL connection string
- `APP_URL`
  Final public origin
- `RESEND_API_KEY`
  Resend API key used server-side for captain emails
- `EMAIL_FROM`
  Use `Coppa Reghinna Minor <onboarding@resend.dev>` for the MVP
- `EMAIL_REPLY_TO`
  Use `coppareghinnaminor@gmail.com` so replies go to the tournament inbox
- `PRODUCTION_OWNER_EMAIL`
- `PRODUCTION_OWNER_PASSWORD`
- `PRODUCTION_ADMIN_EMAIL`
- `PRODUCTION_ADMIN_PASSWORD`

Optional:

- `PRODUCTION_OWNER_NAME`
- `PRODUCTION_ADMIN_NAME`

Example:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"
APP_URL="https://your-domain.example"
RESEND_API_KEY=""
EMAIL_FROM="Coppa Reghinna Minor <onboarding@resend.dev>"
EMAIL_REPLY_TO="coppareghinnaminor@gmail.com"
PRODUCTION_OWNER_EMAIL="owner@example.com"
PRODUCTION_OWNER_PASSWORD="strong-owner-password"
PRODUCTION_ADMIN_EMAIL="admin@example.com"
PRODUCTION_ADMIN_PASSWORD="strong-admin-password"
```

## 3. Database Setup

Before the first public deployment:

1. Create the PostgreSQL database.
2. Set the environment variables.
3. Apply migrations:

```bash
npm run db:migrate:deploy
```

4. Seed the production baseline:

```bash
npm run db:seed:production
```

Production seed result:

- creates `Coppa Reghinna Minor`
- creates `Coppa Reghinna Minor 2026`
- tournament slug `coppa-reghinna-minor-2026`
- creates one owner and one admin from env vars
- creates no demo teams, players, matches, or team registrations

## 4. Vercel Setup

Recommended Vercel configuration:

- Framework Preset: `Next.js`
- Root Directory: repository root, or the app subfolder if used in a monorepo
- Install Command: `npm install`
- Build Command: `npm run build`

If the app moves into a GitHub monorepo later:

- set the Vercel **Root Directory** to the folder containing this app
- keep Prisma paths relative to that app folder

## 5. First Deploy Order

Recommended order:

1. push code
2. configure Vercel env vars
3. run `npm run db:migrate:deploy`
4. run `npm run db:seed:production`
5. deploy on Vercel
6. verify public pages and organizer login

## 6. Post-Deploy Manual QA

Public pages:

- open `/`
- open `/tournaments`
- open `/tournaments/coppa-reghinna-minor-2026`
- open `/tournaments/coppa-reghinna-minor-2026/register-team`
- open `/tournaments/coppa-reghinna-minor-2026/calendar`
- open `/tournaments/coppa-reghinna-minor-2026/standings`
- open `/tournaments/coppa-reghinna-minor-2026/teams`

Organizer flow:

- open `/login`
- sign in as production owner
- open `/dashboard`
- verify the Coppa Reghinna Minor 2026 tournament exists

## 7. Explicit Warnings

- Do not run `npm run db:seed` in production.
- Do not rely on `prisma/dev.db`; it is local-only and must not be deployed.
- Vercel deployment must use PostgreSQL, not SQLite.
