import pg from 'pg';
import { repository } from './records.mjs';
import { connectionSettings } from './connect.mjs';

export class DatabaseUnavailable extends Error {}
let pool;
function connectionPool() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new DatabaseUnavailable('Database is not configured.');
  if (!pool) {
    pool = new pg.Pool({
      ...connectionSettings(url),
      max: 2,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 10000,
      statement_timeout: 7500,
      query_timeout: 8000
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
