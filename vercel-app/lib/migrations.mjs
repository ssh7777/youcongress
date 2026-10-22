import * as initial from '../migrations/001_initial.mjs';
import * as persistentWrites from '../migrations/002_persistent_writes.mjs';

export const migrations = [initial, persistentWrites];

async function execute(client, sql) {
  // pg accepts multi-statement queries; PGlite exposes exec for the same purpose.
  if (typeof client.exec === 'function') return client.exec(sql);
  return client.query(sql);
}

export async function migrate(client, {embedded = false, logger = console} = {}) {
  if (!migrations.length) throw new Error('No APX database migrations were found.');

  // External databases can be reached by concurrent deployments. PGlite is single-connection.
  if (!embedded) await client.query('SELECT pg_advisory_lock($1, $2)', [827280, 1]);
  try {
    await execute(client, `CREATE TABLE IF NOT EXISTS apx_schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);

    for (const {version, sql} of migrations) {
      const existing = await client.query('SELECT 1 FROM apx_schema_migrations WHERE version = $1', [version]);
      if (existing.rows.length) {
        logger.log(`APX migration ${version} is already applied.`);
        continue;
      }

      try {
        await client.query('BEGIN');
        await execute(client, sql);
        await client.query('INSERT INTO apx_schema_migrations(version) VALUES ($1)', [version]);
        await client.query('COMMIT');
        logger.log(`Applied APX migration ${version}.`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw new Error(`APX migration ${version} failed: ${error.message}`);
      }
    }
  } finally {
    if (!embedded) await client.query('SELECT pg_advisory_unlock($1, $2)', [827280, 1]);
  }
}
