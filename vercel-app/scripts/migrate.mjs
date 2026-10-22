import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import pg from 'pg';
import { PGlite } from '@electric-sql/pglite';
import { postgresConfig } from '../lib/postgres.mjs';
import { databaseMode, EMBEDDED_DATABASE } from '../lib/database-mode.mjs';
import { migrate } from '../lib/migrations.mjs';

async function main() {
  if (databaseMode() === EMBEDDED_DATABASE) {
    const database = new PGlite();
    try {
      await database.waitReady;
      await migrate(database, {embedded: true});
      console.log('APX embedded PostgreSQL schema is up to date.');
    } finally {
      await database.close();
    }
    return;
  }

  const client = new pg.Client({...postgresConfig(), connectionTimeoutMillis: 10000});
  await client.connect();
  try {
    await migrate(client);
    console.log('APX external PostgreSQL schema is up to date.');
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
