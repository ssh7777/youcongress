# Vercel-native migration — stage 1

This is an independently buildable Next.js application, **not yet a feature-complete
replacement** for the Phoenix application. It requires no running Phoenix server.
PostgreSQL is still required; Vercel Functions do not include persistent storage.

## Implemented

- Statement browsing with bounded pagination and parameterized title search.
- Statement pages with source-linked quotations, author names, source passages,
  recorded dates and date precision. All database text is escaped by React.
- A spreadsheet-safe **page-only source-record CSV** download. This intentionally
  uses a new URL (`/p/<slug>/source-records.csv`), not the existing verified dataset
  endpoint. It does not claim authoritative stance or verification resolution.
- Database/schema health check (`/api/health` returns 503 on failure).
- Explicit unavailable states without fake records or exposed database errors.
- Read-only SQL transactions, TLS peer verification by default, small pooled
  connections, connection/query timeouts, safe source URLs and security headers.

## Not yet migrated

Accounts, provider callbacks, email/SMS/Turnstile, sessions, authenticated voting,
liquid delegation, comments/edits, hall and author detail routes, verification
history precedence, full dataset export, MCP authentication/tools, ingestion,
background jobs and admin/moderation. These are **not** redirected to the original
site and no nonfunctional buttons are presented as working features.

## Run locally

```sh
cd vercel-app
npm ci
npm test
npm run build
# Set DATABASE_URL through your shell or a private .env.local file.
# DATABASE_SSL=false is only for trusted local databases without TLS.
npm start
```

Connect to an existing migrated YouCongress PostgreSQL database, preferably using
an independently provisioned read-only role and a serverless pooled connection
URL. No database migrations or demo seeds run during build or request handling.
Database strings/credentials must never be committed. Verify your provider's CA
chain rather than disabling peer verification on public connections.

## Deploy a separate Vercel preview project

Use the same Git repository and set **Root Directory to `vercel-app`**, Framework
to **Next.js**, Build Command to `npm run build`, Output Directory to framework
default. Configure `DATABASE_URL` in Vercel settings. Do not supply PHOENIX_ORIGIN.
Do not use the repository-root gateway build command for this project.

The repository-root Vercel project is deliberately unchanged: switching its
production URL to this incomplete migration would remove existing functionality.
Validate the separate preview before a future production cutover. A successful
build without DATABASE_URL is not a healthy application; `/api/health` must be
200 with `{ "status": "ok" }` before accepting a database-backed deployment.

## Verification

Unit tests check SQL parameterization, wildcard escaping, pagination limits, URL
schemes and CSV formula escaping. The existing release CI also builds this app,
then runs `test/integration.mjs` against the complete Phoenix-migrated disposable
PostgreSQL schema. That test inserts isolated records and checks real HTTP search,
quote provenance, XSS escaping, CSV output and missing-record handling, then
cleans up. It refuses nonlocal database URLs and requires an explicit CI opt-in.

Next stages should migrate author/hall browsing and authoritative verification
resolution, then accounts/sessions/CSRF, then transactional direct voting and
cycle-safe delegation, and finally authenticated MCP and background execution.
Each needs feature-parity tests before enabling writes or switching production.
