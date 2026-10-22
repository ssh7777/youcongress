# APX — Policy Analytics Platform

APX is a Phoenix application for organizing source-linked public positions, policy proposals, voting and delegation, and curated policy intelligence. It is intended to make evidence and disagreement easier to inspect; it does not claim to represent all experts or the public, and it does not make binding decisions.

## What is included

- **Policy proposals and source-linked positions** — public statements can be connected to attributed quotations, source URLs, verification states, and topic areas.
- **Liquid-democracy participation** — participants can vote directly or delegate. Direct votes take precedence; otherwise the stored result follows the existing delegation rules. The application’s voting logic and business schema remain unchanged by the APX rebrand.
- **Verification workflows** — distinguish quote authenticity, relevance to a proposal, and inferred stance. Automated status is not a universal guarantee of truth.
- **Policy & cyber intelligence** — `/intelligence` curates public RSS/Atom metadata from configured feeds. Deterministic rules filter headlines and excerpts, assign heuristic impact labels, create short briefs, and suggest links to APX proposals. This is not full-text AI analysis or an official threat assessment. Every item links to its publisher.
- **Discovery metadata** — `/robots.txt`, `/sitemap.xml`, `/llms.txt`, canonical URLs, and JSON-LD for public intelligence pages.
- **MCP tools** — `/mcp` and `/mcp-tools` expose the existing tool interface.

APX is a policy analytics project. This repository does not establish a registered non-profit, government service, official standard, certification authority, or endorsement by any institution.

## Technology

- Elixir `~> 1.18` / OTP
- Phoenix, LiveView, Ecto, PostgreSQL
- Oban for background jobs and scheduled feed ingestion
- Tailwind and esbuild for assets

## Local development

Install a compatible Elixir/OTP toolchain, PostgreSQL, and Node.js/npm. Then:

```sh
cp .env.example .env
# Set DATABASE_URL if your local PostgreSQL credentials differ.
mix setup
mix phx.server
```

The application is available at `http://localhost:4000`. The development environment loads `.env` through `dotenvy` when available.

Useful commands:

```sh
mix test
mix format --check-formatted
mix intelligence.ingest
```

`mix intelligence.ingest` fetches the configured feeds once. The production Oban cron schedule also runs ingestion daily when the queue is enabled. The article table is introduced by `priv/repo/migrations/20261022120000_create_intelligence_articles.exs`; it is additive and does not alter the existing voting or policy tables.

## Configuration

See [`.env.example`](.env.example). Set real deployment values in the hosting provider’s secret/environment settings; do not commit credentials.

| Variable | Purpose |
| --- | --- |
| `BASE_URL` | Canonical public origin, including `https://`; used for canonical links, sitemap, and generated absolute URLs. |
| `PHX_HOST` / `PORT` | Phoenix host and listener port. The listener binds to all interfaces for container hosting. |
| `DATABASE_URL` | PostgreSQL connection URL; required in production. |
| `DATABASE_SSL_VERIFY` | Keep `true` unless the database provider requires another explicitly reviewed setup. |
| `SECRET_KEY_BASE` | Phoenix cookie/session signing key; generate with `mix phx.gen.secret`. |
| `POOL_SIZE` | Database pool size. |
| `INTELLIGENCE_INGESTION_ENABLED` | Enable or disable scheduled feed ingestion. |
| `CONTACT_EMAIL`, `EMAIL_FROM`, `ADMIN_NOTIFICATION_EMAIL` | Optional contact destination, verified sender, and internal notification recipient. Mail features need a working mail provider. |
| `SENDGRID_API_KEY` | SendGrid credential for production mail delivery. |
| `OPENAI_API_KEY`, `OPENAI_ORGANIZATION_KEY` | Optional existing AI-assisted workflows; not used to generate the intelligence feed briefs. |
| `AMPLITUDE_KEY`, `PLAUSIBLE_DOMAIN` | Optional analytics integrations. Product analytics remain subject to consent. |
| OAuth, Turnstile, Twilio, and MCP Redis variables | Optional integrations; see their corresponding configuration and feature flags. |
| `APP_REVISION` | Optional release identifier for monitoring. |

RSS source URLs and their categories are configured in `config/config.exs`. Feed triage uses headline and feed-excerpt text, freshness limits, and deterministic rules; it does not fetch publisher article bodies. Review configured sources and their terms before enabling ingestion in production.

## Deployment notes

This application is an OTP/Phoenix server with PostgreSQL, LiveView WebSocket connections, and Oban workers. Use a deployment target that can run a long-lived BEAM release and background workers. The repository includes a container build and legacy Fly configuration; set the canonical host, database, secrets, mail, and worker process settings for the environment you actually use.

**Vercel compatibility is not established.** A `vercel.json` rewrite or static asset build does not provide an Elixir/OTP runtime, durable Oban workers, or the Phoenix WebSocket process this app requires. Do not treat the current code as a verified Vercel deployment. A Vercel adapter would need to be implemented and exercised end to end (including LiveView, database connections, release startup, and scheduled jobs) before deployment there can be claimed.

After provisioning the database and setting secrets, run the migration/release workflow for the chosen host. Do not use demo seed data in a production database. Configure a real `BASE_URL` before serving indexed pages or enabling public mail.

## Project and data boundaries

- APX summaries and impact labels are triage aids; use the original publisher as the source of record.
- Recorded votes and quotes are not a representative survey and do not by themselves prove a factual claim.
- The public dataset includes third-party excerpts. Follow the attribution and licensing notices in each export and respect the rights of original publishers.
- See `LICENSE` for the software license and the dataset/export notices for data-specific terms.
