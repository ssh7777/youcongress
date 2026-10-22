# APX production deployment

The APX production runtime is the native Next.js application in `vercel-app/` with durable external PostgreSQL.

- **Project:** `apx`
- **Production URL:** `https://apx-lake.vercel.app`
- **Root Directory:** `vercel-app`
- **Framework:** Next.js
- **Install Command:** `npm ci`
- **Build Command:** `npm run build`
- **Database mode:** `external`

## Environment variables

| Variable | Environments | Value |
| --- | --- | --- |
| `APX_DATABASE_MODE` | Production, Preview | `external` |
| `DATABASE_URL` | Production, Preview | Sensitive PostgreSQL connection URL |
| `PRISMA_DATABASE_URL` / `POSTGRES_URL` | Production, Preview | Optional integration-injected fallbacks when `DATABASE_URL` is absent or empty |
| `DATABASE_SSL` | Production, Preview | `true` by default |
| `NEXT_PUBLIC_APP_NAME` | Production, Preview, Development | `APX` |
| `NEXT_PUBLIC_APP_URL` | Production | `https://apx-lake.vercel.app` |
| `NODE_ENV` | Production | `production` |

Production and preview databases should be separate when preview changes could affect production data. Never commit connection strings. Keep TLS peer verification enabled for hosted databases.

## Prisma Postgres without Neon

[Prisma Postgres for Vercel](https://vercel.com/marketplace/prisma) is a compatible alternative that has a free plan and does not require a credit card. Install the integration, create a database in US East, then open APX’s **Storage** tab and connect that database to Production and Preview. The integration can inject `DATABASE_URL`, `PRISMA_DATABASE_URL`, and `POSTGRES_URL`; APX accepts them in that order and uses the first non-empty value, so no credentials need to be copied into chat or Git.

Prisma’s integration supplies a standard PostgreSQL direct connection string that works with APX’s existing `pg` driver and migrations. For substantial production traffic, follow Prisma’s pooling guidance rather than increasing APX’s per-function pool.

## Persistent functionality

Visitors can create and update policy statements, add and edit sourced quotations, change votes, open and close reconsiderations, and publish and edit intelligence posts. The first successful mutation creates a one-year HttpOnly guest session. Only the token’s SHA-256 hash is stored in PostgreSQL.

All write queries are parameterized and ownership-scoped. Cross-origin mutations are rejected using the runtime’s forwarded host and protocol. Statement deletion is guarded against cascading through another guest’s contributions. Input lengths and vote/operation choices are validated server-side.

## Build, migration, and write verification

`npm run build` executes the migration runner and then `next build`.

External mode:

1. acquires a PostgreSQL advisory lock;
2. applies each pending migration in a transaction and records it in `apx_schema_migrations`;
3. runs a write probe covering users, guest sessions, statements, votes, quotes, reconsiderations, intelligence posts, and an ownership-scoped update;
4. rolls back all probe data;
5. compiles Next.js.

The current schema version is `002_persistent_writes`. A database that cannot support persistent writes fails the deployment build instead of publishing a read-only or misleadingly healthy application.

## Verification

Local and CI checks include:

- unit tests and embedded read-only route integration;
- external initial and repeat migrations;
- rollback write probes against every persistent table;
- read-only record integration;
- full HTTP mutation integration for guest sessions, CSRF, ownership, CRUD, vote upserts, redirects, XSS escaping, and persistence across a server restart.

After production deployment, verify:

```text
GET https://apx-lake.vercel.app/api/health
```

Expected response:

```json
{"status":"ok","database":"postgresql","mode":"external","schema":"002_persistent_writes"}
```

Also verify `/`, `/explore`, `/reconsider`, and `/intelligence`, then exercise the visible create/edit forms. A Ready status without the current external health response and successful write probe is not a valid APX release.
