-- APX initial schema: Users, Policy Statements, Votes, Quotes, Intelligence Posts.
-- Applied idempotently by scripts/migrate.mjs (safe to run on every deployment).

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT,
  email TEXT UNIQUE,
  inserted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS policy_statements (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  inserted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quotes (
  id BIGSERIAL PRIMARY KEY,
  policy_statement_id BIGINT NOT NULL REFERENCES policy_statements(id) ON DELETE CASCADE,
  author_name TEXT,
  content TEXT NOT NULL,
  source_url TEXT,
  source_text TEXT,
  date DATE,
  date_precision TEXT,
  verification_status TEXT,
  inserted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS quotes_policy_statement_id_idx ON quotes (policy_statement_id);

CREATE TABLE IF NOT EXISTS votes (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  policy_statement_id BIGINT NOT NULL REFERENCES policy_statements(id) ON DELETE CASCADE,
  value TEXT NOT NULL CHECK (value IN ('for', 'abstain', 'against')),
  inserted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, policy_statement_id)
);

CREATE INDEX IF NOT EXISTS votes_policy_statement_id_idx ON votes (policy_statement_id);

CREATE TABLE IF NOT EXISTS intelligence_posts (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT,
  body TEXT,
  source_url TEXT,
  published_at TIMESTAMPTZ,
  inserted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS intelligence_posts_published_at_idx ON intelligence_posts (published_at DESC);
