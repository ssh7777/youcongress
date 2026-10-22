# APX on Vercel

APX is a native Next.js application using real PostgreSQL. The current production configuration runs embedded PostgreSQL through PGlite inside the Vercel Node.js functions, so it needs no Neon account, integration, or connection string. External PostgreSQL remains supported.

APX does not require the legacy Phoenix server and does not forward traffic to another website.

## Routes

- `/` — APX overview.
- `/explore` — searchable policy statements with quote and vote counts.
- `/p/<slug>` — statement details and page-only source-record CSV exports.
- `/reconsider` — open reconsideration requests with their statement links and rationale.
- `/intelligence` — published intelligence posts.
- `/api/health` — database and migration health; returns 503 if the complete APX schema cannot be initialized or reached.

## Current embedded production mode

Set `APX_DATABASE_MODE=embedded`. Each function instance lazily starts its own in-memory PostgreSQL database and applies the same versioned migrations before answering record queries. This is appropriate because the current APX interface is read-only and ships without mutable production content.

PGlite is single-connection and ephemeral. **Do not add account, voting, ingestion, or other persistent write flows in embedded mode.** Those features require a durable external database and a deliberate data-persistence design. No nonfunctional write buttons are presented in the current interface.

`serverExternalPackages` in `next.config.mjs` keeps PGlite's WASM assets compatible with Next.js production route bundles.

## Schema and migrations

`migrations/001_initial.mjs` contains the initial SQL schema: users, policy statements, votes, quotes, intelligence posts, and reconsiderations, with constraints and indexes. `apx_schema_migrations` records applied versions. Additional migrations are statically imported by `lib/migrations.mjs`, so the exact migration code is included in every serverless bundle.

Run the deployment migration check with:

```sh
cd vercel-app
npm ci
APX_DATABASE_MODE=embedded npm run migrate
```

`npm run build` always validates pending migrations before `next build`, in either database mode. External mode additionally uses a PostgreSQL advisory lock and one transaction per migration. Neither mode drops tables or substitutes demo records.

## Optional external PostgreSQL mode

For durable external PostgreSQL, remove `APX_DATABASE_MODE` and set `DATABASE_URL` to a pooled connection string. Runtime record queries then use read-only transactions and a small connection pool.

```sh
DATABASE_URL=... npm run build
```

TLS certificate verification is enabled by default; `DATABASE_SSL=false` is only for a trusted local database. Use separate databases for production and previews when previews may contain schema changes. A deployment role must be able to create the schema during migration.

## Local verification

```sh
cd vercel-app
npm ci
npm test
npm run build:next                         # Framework-only preflight.
APX_DATABASE_MODE=embedded npm run build   # Exact production database mode.
APX_DATABASE_MODE=embedded node test/embedded-integration.mjs
```

The embedded integration test checks real HTTP responses for every requested route, migrated health, empty states, and missing records. CI also tests external mode against a disposable local PostgreSQL database with record-level integration coverage. Never point the external integration test at production.

## Vercel project

The Vercel project uses Root Directory `vercel-app`, Framework `nextjs`, Install Command `npm ci`, and Build Command `npm run build`.

Current environment variables:

- `APX_DATABASE_MODE=embedded` (production and preview)
- `NEXT_PUBLIC_APP_NAME=APX`
- `NEXT_PUBLIC_APP_URL=https://apx-lake.vercel.app` (production)
- `NODE_ENV=production` (production)

After deployment, `/api/health` must return HTTP 200 with:

```json
{"status":"ok","database":"postgresql","mode":"embedded","schema":"001_initial"}
```

Also verify `/`, `/explore`, `/reconsider`, and `/intelligence`; a health-only check does not prove that every PGlite route bundle can load its WASM runtime.
