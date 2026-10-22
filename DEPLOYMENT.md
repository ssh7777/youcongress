# Production deployment

## Current Vercel deployment: repository-root Next.js application

The root `package.json`, `app/`, `next.config.mjs`, and `vercel.json` now build the
native Next.js migration. Vercel must use the **repository root**, framework
**Next.js**, install command `npm ci`, build command `npm run build`, and output
`.next` (all commands are also committed in `vercel.json`). No PHOENIX_ORIGIN or
persistent Phoenix backend is required by this deployment.

**Scope warning:** this serves the read-only migration, not the complete Phoenix
application. Authentication, voting, delegation, jobs and MCP are not migrated.
The persistent Phoenix application can still be built separately via Docker.
See `vercel-app/MIGRATION.md` for feature scope and remaining work.

Set `DATABASE_URL` to an existing migrated YouCongress PostgreSQL database using
a serverless pooled connection URL, preferably with read-only credentials. TLS
verifies peer certificates by default. Missing credentials or an unavailable
schema yield HTTP 503 at `/api/health`; a successful build alone does not prove
data access works. Never put credentials in a NEXT_PUBLIC_ variable.

Before deploying, remove old dashboard overrides for the gateway command
`node scripts/build-vercel.mjs`, output `.vercel/output`, or root directory
`vercel-app`. The gateway script is now legacy tooling, not the production entry
point. Committed config selects Next.js, but the project's Root Directory must
still be correct. Any stored PHOENIX_ORIGIN is unused by the native application.

Check after deployment: `/` and `/explore`, `/api/health` (must return 200), a
known `/p/<slug>` record and its source-record CSV. The native CSV is a page-only
source export, not the authoritative verified Phoenix dataset.

## Legacy Phoenix container configuration

The remaining configuration below applies to the separate Phoenix application,
not to the root Vercel Next.js deployment.

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
license attribution still identify YouCongress; they are not deployment routing.

## Build, migrate, start

On a machine with Docker:

```sh
docker build -t youcongress .
# Supply required secrets and the public origin in a private, untracked file.
docker run --rm --env-file .env.production youcongress /app/bin/migrate
docker run --rm --env-file .env.production -p 4000:4000 youcongress
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

## Native migration source and tests

`vercel-app/` contains the shared implementation imported by the root App Router.
CI builds the root application and tests its real HTTP routes against a fully
migrated disposable PostgreSQL database. See
[`vercel-app/MIGRATION.md`](vercel-app/MIGRATION.md) for remaining feature-parity
work. Do not claim the read-only stage is the complete participation application.
