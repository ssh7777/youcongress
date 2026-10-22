# APX

[APX](https://apx-lake.vercel.app) is a source-grounded policy intelligence application. It connects policy statements to inspectable quotations, persistent public votes, reconsideration requests, and dated intelligence analysis.

The production application is the native Next.js codebase in [`vercel-app/`](vercel-app/). It runs on Vercel with durable external PostgreSQL and does not proxy the legacy website or require a Phoenix server.

## Public routes and functionality

- `/` — APX overview.
- `/explore` — search policy statements and create your own.
- `/p/<slug>` — statement details, persistent voting, sourced quotations, owner editing, reconsideration requests, and page-only CSV exports.
- `/reconsider` — open reconsideration requests; requesters can close their own requests.
- `/intelligence` — publish intelligence posts and edit or delete your own posts.
- `/api/health` — PostgreSQL and current schema-migration health.
- `/api/mutate` — same-origin form endpoint for persistent changes.

The first successful change creates an HttpOnly guest session. The session identifies the owner of later edits without requiring an account password. Ownership is enforced in SQL: visitors cannot update or delete another guest’s records, and deleting a statement is blocked while another guest’s contributions depend on it.

## Database and persistence

The versioned migrations create users, guest sessions, policy statements, votes, quotes, intelligence posts, and reconsiderations. Production uses `APX_DATABASE_MODE=external` with `DATABASE_URL`. Vercel’s Prisma Postgres integration is also supported through `PRISMA_DATABASE_URL` or `POSTGRES_URL` when `DATABASE_URL` is absent or empty.

Every external deployment build:

1. applies pending migrations transactionally under an advisory lock;
2. inserts and updates every persistent record type in a write probe;
3. rolls the probe back so no test records remain;
4. compiles the Next.js application.

Runtime record reads use read-only transactions. Mutations use parameterized write transactions, same-origin request checks, bounded input validation, and owner-scoped SQL. See [`vercel-app/MIGRATION.md`](vercel-app/MIGRATION.md) for the full deployment and persistence contract.

Embedded PGlite remains available as an explicitly selected, read-only development mode. It is ephemeral and is not used for production writes.

## Local development

With Node.js 22 or later:

```sh
cd vercel-app
npm ci
npm test
npm run dev
```

For read-only local development, set `APX_DATABASE_MODE=embedded`. For persistent writes, use `APX_DATABASE_MODE=external` and a local `DATABASE_URL`. `DATABASE_SSL=false` is only for a trusted local database without TLS.

## Verification

```sh
npm test
APX_DATABASE_MODE=embedded npm run build
APX_DATABASE_MODE=embedded node test/embedded-integration.mjs
```

CI additionally runs external PostgreSQL migrations, the rollback write probe, read-only record integration, and the full mutation suite. The mutation suite covers guest sessions, CSRF rejection, ownership, CRUD for every record type, vote upserts, HTML form redirects, XSS escaping, and persistence across a server restart.

## Legacy code

The Phoenix application and its tests remain in the repository as legacy implementation context. They are not the APX production runtime. Use only the intended APX database for the native schema and mutation tests.

## License and data rights

Application code is licensed under the [MIT License](LICENSE). APX structured annotations are released under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) with attribution to APX. Third-party quotations and source material retain their original rights; APX records link to their sources.
