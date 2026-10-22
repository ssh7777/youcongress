# Production deployment

## APX on Vercel: native Next.js application (`vercel-app/`)

The `apx` Vercel project deploys the native Next.js application in
`vercel-app/` (Root Directory `vercel-app`, Framework Next.js, Build Command
`npm run build`). It serves `/`, `/explore`, `/reconsider`, `/intelligence`,
statement pages with CSV exports, and `/api/health` directly from Vercel
Functions backed by serverless PostgreSQL.

Database migrations run automatically during every deployment build
(`npm run build` = `node scripts/migrate.mjs && next build`): each SQL file in
`vercel-app/migrations/` is applied exactly once, transactionally, under a
Postgres advisory lock. A migration failure fails the build; an unconfigured
`DATABASE_URL` skips migrations and is reported truthfully by `/api/health`.

| Variable | Environments | Value |
| --- | --- | --- |
| `DATABASE_URL` | Production, Preview | Pooled serverless PostgreSQL connection URL (Neon / Vercel Postgres via the Vercel Marketplace) |
| `DATABASE_SSL` | Production, Preview | `true` (default; may be omitted) |
| `NEXT_PUBLIC_APP_NAME` | Production, Preview, Development | `APX` |
| `NEXT_PUBLIC_APP_URL` | Production | `https://apx-lake.vercel.app` |
| `NODE_ENV` | Production | `production` |

See `vercel-app/MIGRATION.md` for the schema (users, policy statements, votes,
quotes, intelligence posts) and local development. The sections below describe
the legacy HTTP gateway used by the separate `youcongress` Vercel project.

## Legacy: HTTP gateway + persistent Phoenix backend

This repository now includes `vercel.json` and a dependency-free Node build
script that generates a **Vercel Build Output API v3 HTTP gateway**. Every path
(including assets, forms, OAuth callbacks, and LiveView polling) is rewritten to
your own Phoenix backend, not redirected to another website or replaced by a
static landing page. Dynamic responses are marked private/no-store.

**Vercel still does not run the Elixir release, PostgreSQL or Oban workers.**
Deploy the existing Dockerfile on a persistent container host first. There is no
backend URL or database included with a Vercel connection, and this repository
will never silently use the original APX production server as yours.

### Setup order (required)

1. Deploy the Dockerfile to your own container host. Supply `DATABASE_URL`,
   `SECRET_KEY_BASE`, and integrations below; run `/app/bin/migrate`.
2. Set **on the Phoenix backend**:
   - `BASE_URL=https://<your-public-vercel-domain>` (the address users visit).
   - `LIVEVIEW_TRANSPORT=longpoll`.
   - Keep the secret stable across deployments and replicas. Configure clustering
     appropriately if the backend has multiple instances.
3. Set **in Vercel** (separately for production and previews):
   - `PHOENIX_ORIGIN=https://<your-backend-host>` (NOT the Vercel address).
   - Leave Framework as Other, repository root as Root Directory, and Output
     Directory unset. The committed `vercel.json` supplies the build command.
4. Deploy this branch to Vercel. The build checks `/about` on the backend and
   requires both a CSRF token and the long-poll transport marker. Missing settings,
   backend errors, redirects, or old backend code now **fail the build clearly**
   instead of publishing a "Ready" deployment with an empty output and a 404.
5. Verify the public gateway homepage, `/explore` search, login/logout, and an
   authenticated vote against a staging database. Register OAuth callbacks and
   Turnstile domains for the public Vercel address. Production side effects such
   as emails and votes are not tested automatically against your real accounts.

Vercel's HTTP rewrites do not proxy WebSocket upgrades. Gateway mode explicitly
uses Phoenix's HTTP long-poll transport with sessions/CSRF enabled; direct
container deployments retain WebSockets with a long-poll fallback. No arbitrary
wildcard origin allowlist or CORS bypass is used. A preview backend must trust
its exact preview public origin; don't share production databases with previews.
Vercel proxy timeouts still apply to long-running HTTP requests and streamed MCP
responses; use the backend directly for integrations requiring longer streams.

Local gateway builder checks: `node --test scripts/build-vercel.test.mjs`.
CI compiles the actual Docker backend and tests LiveView connection plus a search
event in Chromium using long-polling. This does not by itself verify a live
Vercel deployment or your external integrations.

## Required configuration

Set these in your hosting provider's environment/secrets settings:

- `DATABASE_URL`: PostgreSQL connection string. The database must support the
  extensions used in `priv/repo/migrations`, including pgvector.
- `SECRET_KEY_BASE`: a stable secret generated with `mix phx.gen.secret`.
- `PHX_SERVER=true`: already set by the container's `bin/server` entry point.
- `PORT`: the internal listening port (default `4000`; Fly config sets `8080`).

The public origin is selected at startup, in this order, ignoring empty values:

1. `BASE_URL`: full origin such as `https://my-app.example.com`.
2. `PHX_HOST`: hostname, or full origin.
3. `VERCEL_URL`: per-deployment hostname (metadata only; does not add Vercel runtime support).
4. `VERCEL_PROJECT_PRODUCTION_URL`.
5. `RENDER_EXTERNAL_URL`.
6. `RAILWAY_PUBLIC_DOMAIN`.
7. `FLY_APP_NAME`: becomes `https://<app-name>.fly.dev`.

For automatic platform URL selection, **remove stale `BASE_URL` and `PHX_HOST`
values from hosting settings**. For a custom domain, set `BASE_URL` explicitly.
No domain can be discovered automatically on an arbitrary host without platform
metadata or an explicit setting. Never derive trusted password-reset/share URLs
from an arbitrary request's Host header. Missing or invalid public origins now
fail startup rather than silently using `example.com` or the old production site.

The selected origin controls generated endpoint URLs and the LiveView origin
allowlist. Access the app using that origin. Arbitrary `*.vercel.app` sites are
not trusted. `REDIRECT_HOSTS` optionally lists comma-separated domain aliases to
redirect to that origin, preserving paths and queries. No aliases are enabled by
default. Fly clustering and IPv6 Erlang distribution are only enabled on Fly.

Database TLS verifies certificates by default. For a trusted local/private database
that does not support TLS, explicitly set `DATABASE_SSL=false`; do not use this
for public database connections. Prefer properly trusted database
certificates; `DATABASE_SSL_VERIFY=false` is an explicit insecure escape hatch.
Configure optional integrations using `.env.example`. In particular, update
`GOOGLE_CALLBACK_URL` and `X_CALLBACK_URL` and register the exact same URLs in the
OAuth provider consoles; callback allowlists and Turnstile domain settings cannot
be updated automatically by this repository. Email sender addresses and dataset
license attribution still identify APX; they are not deployment routing.

## Build, migrate, start

On a machine with Docker:

```sh
docker build -t apx .
# Supply required secrets and the public origin in a private, untracked file.
docker run --rm --env-file .env.production apx /app/bin/migrate
docker run --rm --env-file .env.production -p 4000:4000 apx
```

For Fly, `fly.toml` already runs migrations as its release command. It no longer
pins the old custom domain; set `BASE_URL` if you intentionally want a custom domain.
Use a separate database for preview environments; do not run preview migrations
against production accidentally.

## Verification

With the versions in `.tool-versions` installed:

```sh
elixir scripts/runtime_config_test.exs
mix deps.get
mix format --check-formatted
mix compile
mix assets.deploy
mix test
```

The standalone runtime configuration tests do not need dependencies or a database.
The full application tests require PostgreSQL and project dependencies.

## Vercel-native replacement in progress

`vercel-app/` contains stage 1 of the Next.js migration: read-only PostgreSQL-backed
browsing, search, source records and a limited CSV download. It runs natively on
Vercel with no Phoenix backend but is **not yet feature complete**. See
[`vercel-app/MIGRATION.md`](vercel-app/MIGRATION.md) for preview deployment and the
remaining feature-parity work. The root production gateway configuration has not
been switched to this incomplete replacement.
