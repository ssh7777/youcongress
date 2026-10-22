# APX

[APX](https://apx-lake.vercel.app) is a source-grounded policy intelligence application. It connects policy statements to inspectable quotations, public votes, reconsideration requests, and dated intelligence analysis.

The production application is the native Next.js codebase in [`vercel-app/`](vercel-app/). It runs on Vercel with embedded PostgreSQL via PGlite and does not proxy the legacy website, require a Phoenix server, or depend on a Neon integration. Durable external PostgreSQL remains supported for a future write-enabled version.

## Public routes

- `/` — APX overview.
- `/explore` — searchable policy statements with quote and vote counts.
- `/p/<slug>` — statement details, original source passages, and page-only CSV exports.
- `/reconsider` — open requests to revisit policy statements.
- `/intelligence` — published intelligence posts.
- `/api/health` — PostgreSQL and schema-migration health.

The current interface is read-only. Authentication, account management, authenticated voting, ingestion, MCP, and background jobs are not presented as working APX features.

## Database

The versioned initial migration creates:

- users;
- policy statements;
- votes;
- quotes;
- intelligence posts;
- reconsiderations.

The deployment build applies pending migrations automatically before compiling Next.js. Embedded function instances initialize the same versioned schema at runtime; external mode also uses transactional migrations and a PostgreSQL advisory lock. Embedded PGlite is ephemeral and appropriate only for the current read-only interface. See [`vercel-app/MIGRATION.md`](vercel-app/MIGRATION.md) for the schema, persistence boundaries, environment, and deployment details.

## Local development

With Node.js 22 or later:

```sh
cd vercel-app
npm ci
npm test
npm run dev
```

Set `APX_DATABASE_MODE=embedded` in a private `.env.local` file for the self-contained read-only database. To use durable external records instead, omit that variable and set `DATABASE_URL`. `DATABASE_SSL=false` is only for a trusted local database without TLS.

Framework-only production preflight:

```sh
npm run build:next
```

Full deployment build in the current embedded production mode:

```sh
APX_DATABASE_MODE=embedded npm run build
```

## Legacy code

The Phoenix application and its tests remain in the repository as legacy implementation context. They are not the APX production runtime. The APX database schema is separate and the APX migration must only be run against the intended APX database.

## License and data rights

Application code is licensed under the [MIT License](LICENSE). APX structured annotations are released under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) with attribution to APX. Third-party quotations and source material retain their original rights; APX records link to their sources.
