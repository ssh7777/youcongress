# Production deployment

## Vercel compatibility

This repository is an **Elixir/Phoenix LiveView server**, not a static frontend.
It needs a continuously running BEAM process, WebSockets for LiveView, PostgreSQL,
and Oban background workers. Vercel's static hosting and supported Function
runtimes do not run this application directly. A `vercel.json`, npm build command,
or static export cannot fix that architectural mismatch.

Deploy the existing Dockerfile on a container host supporting persistent processes
and WebSockets (for example Fly.io, Render, or Railway). The full application,
including `/live/websocket`, must be reachable on its public origin. Hosting a
separate frontend on Vercel would require an architectural change; a catch-all
Vercel rewrite is not a replacement for a WebSocket-capable host.

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

Database TLS verifies certificates by default. Prefer properly trusted database
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
