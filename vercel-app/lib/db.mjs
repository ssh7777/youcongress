import pg from 'pg';
import { repository } from './records.mjs';
import { postgresConfig } from './postgres.mjs';
import { databaseMode, EMBEDDED_DATABASE } from './database-mode.mjs';
import { embeddedQuery } from './embedded.mjs';

export class DatabaseUnavailable extends Error {}
let pool;
function connectionPool() {
  if (!pool) {
    pool = new pg.Pool({
      ...postgresConfig(),
      max: 4,
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

async function externalQuery(text, values, readOnly = true) {
  let client;
  try {
    client = await connectionPool().connect();
    await client.query(readOnly ? 'BEGIN READ ONLY' : 'BEGIN');
    const result = await client.query(text, values);
    await client.query('COMMIT');
    return result;
  } catch {
    if (client) await client.query('ROLLBACK').catch(() => {});
    throw new DatabaseUnavailable('APX database access is temporarily unavailable.');
  } finally {
    client?.release();
  }
}

export async function query(text, values = []) {
  try {
    if (databaseMode() === EMBEDDED_DATABASE) return await embeddedQuery(text, values);
    return await externalQuery(text, values, true);
  } catch (error) {
    if (error instanceof DatabaseUnavailable) throw error;
    throw new DatabaseUnavailable('APX public records are temporarily unavailable.');
  }
}

export async function writeQuery(text, values = []) {
  if (databaseMode() === EMBEDDED_DATABASE) {
    throw new DatabaseUnavailable('Persistent writes require external PostgreSQL.');
  }
  return externalQuery(text, values, false);
}

export async function writeTransaction(work) {
  if (databaseMode() === EMBEDDED_DATABASE) {
    throw new DatabaseUnavailable('Persistent writes require external PostgreSQL.');
  }
  let client;
  try {
    client = await connectionPool().connect();
    await client.query('BEGIN');
    const result = await work((text, values = []) => client.query(text, values));
    await client.query('COMMIT');
    return result;
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    if (error instanceof DatabaseUnavailable) throw error;
    throw new DatabaseUnavailable('APX could not complete the database transaction.');
  } finally {
    client?.release();
  }
}

export const records = repository(query);
