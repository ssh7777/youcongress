import { PGlite } from '@electric-sql/pglite';
import { migrate } from './migrations.mjs';

let databasePromise;

export function embeddedDatabase() {
  if (!databasePromise) {
    databasePromise = (async () => {
      // No dataDir means ephemeral in-memory PostgreSQL. APX exposes no write flows.
      const database = new PGlite();
      await database.waitReady;
      await migrate(database, {embedded: true, logger: {log: () => {}}});
      return database;
    })();
    databasePromise.catch(() => { databasePromise = undefined; });
  }
  return databasePromise;
}

export async function embeddedQuery(text, values = []) {
  const database = await embeddedDatabase();
  return database.query(text, values);
}
