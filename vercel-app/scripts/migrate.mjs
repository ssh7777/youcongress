import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import pg from 'pg';
import { postgresConfig } from '../lib/postgres.mjs';

const migrationsDirectory = fileURLToPath(new URL('../migrations/', import.meta.url));

export async function migrate(client, directory = migrationsDirectory) {
  const files = (await readdir(directory))
    .filter(name => /^\d+_[a-z0-9_]+\.sql$/.test(name))
    .sort();
  if (!files.length) throw new Error('No APX database migrations were found.');

  // Serialize deployments before creating the migration ledger as well as the schema.
  await client.query('SELECT pg_advisory_lock($1, $2)', [827280, 1]);
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS apx_schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
    for (const file of files) {
      const version = file.replace(/\.sql$/, '');
      const existing = await client.query('SELECT 1 FROM apx_schema_migrations WHERE version = $1', [version]);
      if (existing.rowCount) {
        console.log(`APX migration ${version} is already applied.`);
        continue;
      }

      const sql = await readFile(resolve(directory, file), 'utf8');
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO apx_schema_migrations(version) VALUES ($1)', [version]);
        await client.query('COMMIT');
        console.log(`Applied APX migration ${version}.`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw new Error(`APX migration ${version} failed: ${error.message}`);
      }
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock($1, $2)', [827280, 1]);
  }
}

async function main() {
  const client = new pg.Client({...postgresConfig(), connectionTimeoutMillis: 10000});
  await client.connect();
  try {
    await migrate(client);
    console.log('APX PostgreSQL schema is up to date.');
  } finally {
    await client.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
