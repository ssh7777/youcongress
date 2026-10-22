# APX on Vercel

APX is a native Next.js application backed by serverless PostgreSQL. It does not require the legacy Phoenix server and does not forward traffic to another website.

## Routes

- `/` — APX overview.
- `/explore` — searchable policy statements with quote and vote counts.
- `/p/<slug>` — statement details and page-only source-record CSV exports.
- `/reconsider` — open reconsideration requests with their statement links and rationale.
- `/intelligence` — published intelligence posts.
- `/api/health` — database and migration health; returns 503 until the complete APX schema is available.

## Database schema and migrations

`migrations/001_initial.sql` creates users, policy statements, votes, quotes, intelligence posts, and reconsiderations, together with constraints and indexes. `apx_schema_migrations` records applied versions.

Run migrations with:

```sh
cd vercel-app
npm ci
# Set DATABASE_URL and, for a local non-TLS database only, DATABASE_SSL=false.
npm run migrate
```

`npm run build` always runs pending migrations before `next build`. The runner uses a PostgreSQL advisory lock and one transaction per migration. It never drops existing tables or substitutes demo data. Use a database role that can create the schema during deployment; runtime SQL itself uses read-only transactions.

Use a pooled Neon/Vercel Postgres connection string for serverless traffic. Production and preview databases should be separate when previews may contain schema changes. TLS certificate verification is enabled by default; do not set `DATABASE_SSL=false` for a public database.

## Local verification

```sh
cd vercel-app
npm ci
npm test
npm run build:next       # Framework-only preflight; does not need a database.
DATABASE_URL=... npm run build  # Full deployment build, including migrations.
```

The integration test additionally requires a disposable local PostgreSQL database and explicit opt-in. Never point it at a production database.

## Vercel project

The Vercel project uses Root Directory `vercel-app`, Framework `nextjs`, Install Command `npm ci`, and Build Command `npm run build`.

Required environment variables:

- `DATABASE_URL` (production and preview)
- `NEXT_PUBLIC_APP_NAME=APX`
- `NEXT_PUBLIC_APP_URL=https://apx-lake.vercel.app` (production)
- `NODE_ENV=production` (production)

After deployment, `/api/health` must return HTTP 200 with `{ "status": "ok" }`. A Ready deployment with a failing health endpoint is not considered a healthy database-backed release.

Accounts, authentication, authenticated voting, ingestion, and background jobs are intentionally not exposed as nonfunctional UI. The current APX interface is read-only.
