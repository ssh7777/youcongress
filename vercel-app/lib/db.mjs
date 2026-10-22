import pg from 'pg';
import { repository } from './records.mjs';

export class DatabaseUnavailable extends Error {}
let pool;
function connectionPool() {
  if (!process.env.DATABASE_URL?.trim()) throw new DatabaseUnavailable('Database is not configured.');
  if (!pool) {
    const url = new URL(process.env.DATABASE_URL);
    // pg connection-string SSL parameters can replace the explicit TLS settings.
    for (const key of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert']) url.searchParams.delete(key);
    pool = new pg.Pool({
      connectionString: url.href,
      ssl: process.env.DATABASE_SSL === 'false' ? false : {rejectUnauthorized: true},
      max: 2,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 10000,
      statement_timeout: 7500,
      query_timeout: 8000,
      allowExitOnIdle: true
    });
    pool.on('error', () => console.error('Native database pool connection failed.'));
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
    throw new DatabaseUnavailable('Public records are temporarily unavailable.');
  } finally { client?.release(); }
}
export const records = repository(query);
