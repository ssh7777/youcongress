# APX on Vercel — native Next.js application

This directory is an independently buildable Next.js application for **APX**, the
public-records platform. It requires no running Phoenix server and is the app
deployed by the `apx` Vercel project (Root Directory `vercel-app`).

## Routes

- `/` — overview of the three record areas.
- `/explore` — statement browsing with bounded pagination and parameterized title search.
- `/reconsider` — policy statements with recorded vote tallies (for / abstain / against).
- `/intelligence` — source-linked policy intelligence posts.
- `/p/<slug>` — statement pages with source-linked quotations, authors, source
  passages, recorded dates and date precision. All database text is escaped by React.
- `/p/<slug>/source-records.csv` — spreadsheet-safe page-only source-record CSV.
- `/api/health` — database/schema health check (`200 { "status": "ok" }`, else `503`).

## Database schema

`migrations/001_init.sql` creates exactly these tables:

| Table | Purpose |
| --- | --- |
| `users` | Accounts (public display names and usernames) |
| `policy_statements` | Policy statements / claims (slug, title) |
| `quotes` | Sourced quotations linked to a statement |
| `votes` | Recorded votes per user and statement (`for`, `abstain`, `against`) |
| `intelligence_posts` | Source-linked policy intelligence posts |

Plus `schema_migrations`, the bookkeeping table used by the migration runner.

## Migrations run automatically during deployment

`npm run build` is `node scripts/migrate.mjs && next build`. The runner applies
each SQL file in `migrations/` exactly once, inside a transaction, under a
Postgres advisory lock so concurrent deployments cannot double-apply. When
`DATABASE_URL` is set, a migration failure **fails the deployment build** —
an application with a half-applied schema is never published. When
`DATABASE_URL` is unset the runner prints a notice and the build continues;
`/api/health` then reports `503`, which is the acceptance gate for a
database-backed deployment.

## Environment

| Variable | Environments | Value |
| --- | --- | --- |
| `DATABASE_URL` | Production, Preview | Pooled serverless PostgreSQL connection URL (Neon / Vercel Postgres) |
| `DATABASE_SSL` | Production, Preview | `true` (default; may be omitted). `false` only for a trusted local database |
| `NEXT_PUBLIC_APP_NAME` | Production, Preview, Development | `APX` |
| `NEXT_PUBLIC_APP_URL` | Production | `https://apx-lake.vercel.app` |
| `NODE_ENV` | Production | `production` |

Link a database from the Vercel Marketplace (Neon or Vercel Postgres) and copy
its pooled connection string into `DATABASE_URL`. Use separate databases for
production and previews when preview schema changes are possible. Never commit
connection strings. Keep TLS peer verification enabled for public hosted
databases.

## Run locally

```sh
cd vercel-app
npm ci
npm test
# Set DATABASE_URL through your shell or a private .env.local file.
npm run build
npm start
```

## Verification

Unit tests check SQL parameterization, wildcard escaping, pagination limits,
URL schemes, CSV formula escaping, and the migration runner (advisory lock,
transactional apply, skip/validate behavior): `npm test`. With a disposable
local database and `NATIVE_TEST_DATABASE=1`, `node test/integration.mjs` inserts
isolated records and checks real HTTP search, quote provenance, XSS escaping,
CSV output, vote tallies, intelligence posts and missing-record handling, then
cleans up. It refuses nonlocal database URLs.

Not yet migrated from the Phoenix application: accounts/provider callbacks,
email/SMS/Turnstile, sessions, authenticated voting and liquid delegation,
comments/edits, author and hall detail routes, verification-history precedence,
full dataset export, MCP tools, ingestion and background jobs. These are **not**
redirected elsewhere and no nonfunctional buttons are presented as working
features.
