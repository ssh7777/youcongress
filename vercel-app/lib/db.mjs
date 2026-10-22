import pg from 'pg';
import { repository } from './records.mjs';
import { postgresConfig } from './postgres.mjs';

export class DatabaseUnavailable extends Error {}
let pool;
function connectionPool() {
  if (!pool) {
    pool = new pg.Pool({
      ...postgresConfig(),
      max: 2,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 10000,
      statement_timeout: 7500,
      query_timeout: 8000,
      allowExitOnIdle: true
    });
    pool.on('error', () => console.error('APX database pool connection failed.'));
  }
  return pool;
}

export async function query(text, values = []) {
  let client;
  try {
    client = await connectionPool().connect();
    await client.query('BEGIN READ ONLY');
    const result = await client.query(text, values);
    await client.query('COMMIT');
    return result;
  } catch {
    if (client) await client.query('ROLLBACK').catch(() => {});
    throw new DatabaseUnavailable('APX public records are temporarily unavailable.');
  } finally {
    client?.release();
  }
}

export const records = repository(query);
