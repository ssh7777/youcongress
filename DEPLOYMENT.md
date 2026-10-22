# APX production deployment

The APX production runtime is the native Next.js application in `vercel-app/`. The Vercel project is configured with:

- **Project:** `apx`
- **Production URL:** `https://apx-lake.vercel.app`
- **Root Directory:** `vercel-app`
- **Framework:** Next.js
- **Install Command:** `npm ci`
- **Build Command:** `npm run build`
- **Database mode:** embedded PostgreSQL via PGlite

The current read-only application needs no external database integration. The legacy Phoenix gateway configuration at the repository root belongs to the older deployment path and is not used by APX.

## Environment variables

| Variable | Environments | Value |
| --- | --- | --- |
| `APX_DATABASE_MODE` | Production, Preview | `embedded` |
| `NEXT_PUBLIC_APP_NAME` | Production, Preview, Development | `APX` |
| `NEXT_PUBLIC_APP_URL` | Production | `https://apx-lake.vercel.app` |
| `NODE_ENV` | Production | `production` |

No `DATABASE_URL` is required in embedded mode. The mode is explicit: missing external database credentials never silently activate an ephemeral database.

For a future write-enabled application, remove `APX_DATABASE_MODE`, configure a durable external `DATABASE_URL`, and add persistent-write tests before enabling those features. Embedded PGlite is single-connection and ephemeral; it is suitable for the current read-only routes, not durable user writes.

## Build and migration pipeline

`npm run build` executes `node scripts/migrate.mjs` and then `next build`.

In embedded mode, the build creates an in-memory PostgreSQL instance and applies all pending migrations. At runtime, each function instance initializes the same versioned schema before querying it. Migration modules are statically imported into the serverless bundles, and PGlite is configured as a server external package so its WASM assets load correctly in production route bundles.

In external mode, the runner also acquires a database advisory lock, applies each migration in a transaction, and records versions in `apx_schema_migrations` so simultaneous deployments cannot initialize the schema twice.

The initial schema creates users, policy statements, votes, quotes, intelligence posts, and reconsiderations. It contains no destructive table operations and no demo seed data.

## Verification

Before deployment:

```sh
cd vercel-app
npm ci
npm test
APX_DATABASE_MODE=embedded npm run build
APX_DATABASE_MODE=embedded node test/embedded-integration.mjs
```

CI also verifies optional external PostgreSQL mode against a disposable database, including record-level HTTP integration tests.

After every production deployment, verify:

```text
GET https://apx-lake.vercel.app/api/health
```

A healthy embedded release returns HTTP 200 with:

```json
{"status":"ok","database":"postgresql","mode":"embedded","schema":"001_initial"}
```

Also smoke-test `/`, `/explore`, `/reconsider`, `/intelligence`, and a missing statement. A Ready deployment or health-only check is not accepted until all route bundles respond correctly.
