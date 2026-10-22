# APX database and deployment guide

APX is a native Next.js application backed by durable external PostgreSQL in production. It supports persistent guest-owned writes for every public record type and does not require the legacy Phoenix server.

## Routes

- `/` — overview.
- `/explore` — statement search and creation.
- `/p/<slug>` — statements, voting, sourced quotes, owner editing, reconsideration requests, and CSV export.
- `/reconsider` — open requests and owner-controlled closing.
- `/intelligence` — publishing and owner editing.
- `/api/health` — current external schema health.
- `/api/mutate` — same-origin POST endpoint used by the site’s HTML forms.

## Schema

`migrations/001_initial.mjs` creates users, policy statements, votes, quotes, intelligence posts, and reconsiderations. `migrations/002_persistent_writes.mjs` adds hashed guest sessions and quote ownership. The migration ledger is `apx_schema_migrations`; the current version is `002_persistent_writes`.

Migrations are statically imported by `lib/migrations.mjs`, so serverless bundles contain the exact schema code. External migrations run in transactions under a PostgreSQL advisory lock. No migration drops existing tables or inserts demo content.

## Persistent guest model

The first successful mutation generates a cryptographically random guest token and stores only its SHA-256 hash in `guest_sessions`. The HttpOnly, Secure (in production), SameSite=Lax cookie lasts one year. Users can edit only records they own. Another guest’s session cannot be used to alter those records.

Votes use a `(statement_id, user_id)` upsert, so changing a vote updates rather than duplicates it. Statement deletion is blocked when another guest’s quote, vote, or reconsideration would otherwise be cascade-deleted.

This guest model is not password authentication, email verification, administration, or moderation. Those features should be added deliberately before exposing privileged operations.

## Production mode

```text
APX_DATABASE_MODE=external
DATABASE_URL=<sensitive pooled PostgreSQL URL>
DATABASE_SSL=true
```

`npm run build` applies migrations and runs a rollback write probe before compiling. The probe writes every persistent table and tests an owner-scoped update, then rolls back. This verifies that production is genuinely writable without leaving test data behind.

Runtime reads use read-only transactions. Writes use a small PostgreSQL pool, parameterized SQL, bounded inputs, owner predicates, and same-origin validation based on forwarded host/protocol headers.

## Embedded development mode

`APX_DATABASE_MODE=embedded` starts in-memory PGlite for read-only local development. It is explicitly not a persistent-write mode and is not the production configuration.

## Verification

```sh
cd vercel-app
npm ci
npm test
APX_DATABASE_MODE=embedded npm run build
APX_DATABASE_MODE=embedded node test/embedded-integration.mjs
```

CI runs external migrations and read-only integration plus `test/mutations-integration.mjs`. That suite performs real HTTP form mutations for every record type, verifies guest cookies and ownership, rejects cross-origin requests, tests vote updates and HTML redirects, checks output escaping, restarts Next.js, and confirms all changes remain.

The deployment health endpoint must return:

```json
{"status":"ok","database":"postgresql","mode":"external","schema":"002_persistent_writes"}
```
