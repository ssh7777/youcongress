// Applies the versioned SQL schema before every production build ("npm run build").
// - No DATABASE_URL: migrations are skipped with a loud notice and the build keeps
//   going; /api/health then reports the database as unconfigured.
// - DATABASE_URL set: migrations run in a transaction under a Postgres advisory
//   lock (concurrent deployments cannot double-apply), and any failure fails the
//   build instead of publishing an application with a half-applied schema.
import { readdir, readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { databaseUrl, makeClient } from '../lib/connect.mjs';

export { databaseUrl, connectionSettings } from '../lib/connect.mjs';

export const ADVISORY_LOCK_KEY = 728155224771032n; // stable app-wide lock key
export const MIGRATIONS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');

export async function loadMigrations(dir = MIGRATIONS_DIR) {
  const names = (await readdir(dir)).filter(name => name.endsWith('.sql')).sort();
  return Promise.all(names.map(async name => ({ name, sql: await readFile(resolve(dir, name), 'utf8') })));
}

// Every migration is applied exactly once, recorded in schema_migrations, and
// rolled back whole on error. The advisory lock serializes concurrent builds.
export async function applyMigrations(client, migrations) {
  await client.query('SELECT pg_advisory_lock($1)', [ADVISORY_LOCK_KEY.toString()]);
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      inserted_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
    const applied = new Set((await client.query('SELECT name FROM schema_migrations')).rows.map(row => row.name));
    for (const migration of migrations) {
      if (applied.has(migration.name)) continue;
      await client.query('BEGIN');
      try {
        await client.query(migration.sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [migration.name]);
        await client.query('COMMIT');
        console.log(`Applied ${migration.name}`);
      } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        throw new Error(`Migration ${migration.name} failed: ${error.message}`);
      }
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [ADVISORY_LOCK_KEY.toString()]).catch(() => {});
  }
}

export async function run(env = process.env) {
  const url = databaseUrl(env);
  if (!url) {
    console.warn('DATABASE_URL is not set — skipping database migrations. /api/health will report the database as unconfigured.');
    return false;
  }
  if (!/^postgres(ql)?:\/\//i.test(url)) {
    throw new Error('DATABASE_URL must be a postgres:// or postgresql:// connection string.');
  }
  const client = makeClient(url, env);
  await client.connect();
  try {
    await applyMigrations(client, await loadMigrations());
    const { rows } = await client.query('SELECT count(*)::int AS n FROM schema_migrations');
    console.log(`Database schema is up to date (${rows[0].n} migration(s) recorded).`);
    return true;
  } finally {
    await client.end().catch(() => {});
  }
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  run().catch(error => {
    console.error(`Database migration failed: ${error.message}`);
    process.exitCode = 1;
  });
}
