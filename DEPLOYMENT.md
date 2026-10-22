# APX production deployment

The APX production runtime is the native Next.js application in `vercel-app/`. The Vercel project is configured with:

- **Project:** `apx`
- **Production URL:** `https://apx-lake.vercel.app`
- **Root Directory:** `vercel-app`
- **Framework:** Next.js
- **Install Command:** `npm ci`
- **Build Command:** `npm run build`

The legacy Phoenix gateway configuration at the repository root belongs to the older deployment path and is not used by the APX project.

## Environment variables

Configure these in the APX Vercel project:

| Variable | Environments | Value |
| --- | --- | --- |
| `DATABASE_URL` | Production, Preview | Pooled serverless PostgreSQL connection URL |
| `DATABASE_SSL` | Production, Preview | `true` (default; may be omitted) |
| `NEXT_PUBLIC_APP_NAME` | Production, Preview, Development | `APX` |
| `NEXT_PUBLIC_APP_URL` | Production | `https://apx-lake.vercel.app` |
| `NODE_ENV` | Production | `production` |

Use separate databases for production and previews when preview schema changes are possible. Never commit connection strings. Keep TLS peer verification enabled for public hosted databases.

## Build and migration pipeline

`npm run build` executes `node scripts/migrate.mjs` and then `next build`. The migration runner:

1. requires `DATABASE_URL` and validates that it is a PostgreSQL URL;
2. acquires a database advisory lock so simultaneous deployments cannot initialize the schema twice;
3. creates the `apx_schema_migrations` ledger;
4. applies each pending SQL migration in its own transaction;
5. records the version and releases the lock.

The initial schema creates users, policy statements, votes, quotes, intelligence posts, and reconsiderations. It contains no destructive table operations and no demo seed data. A missing or unreachable database fails the deployment build rather than producing an apparently healthy release without its required schema.

## Verification

Before deployment:

```sh
cd vercel-app
npm ci
npm test
npm run build:next
```

The framework preflight does not require a database. CI also runs the migration and HTTP integration tests against a disposable local PostgreSQL database.

After every production deployment, verify:

```text
GET https://apx-lake.vercel.app/api/health
```

A healthy release returns HTTP 200 with:

```json
{"status":"ok","database":"postgresql","schema":"001_initial"}
```

Also smoke-test `/`, `/explore`, `/reconsider`, and `/intelligence`. A Vercel deployment marked Ready is not accepted as a healthy APX release until the health endpoint passes.
