import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {postgresConfig} from '../lib/postgres.mjs';

test('PostgreSQL configuration requires a PostgreSQL URL', () => {
  assert.throws(() => postgresConfig({}), /DATABASE_URL is required/);
  assert.throws(() => postgresConfig({DATABASE_URL: 'https://example.com/db'}), /PostgreSQL connection URL/);
});

test('connection-string SSL parameters cannot override explicit TLS settings', () => {
  const secure = postgresConfig({DATABASE_URL: 'postgres://user:pass@db.example.com/apx?sslmode=disable'});
  assert.deepEqual(secure.ssl, {rejectUnauthorized: true});
  assert.ok(!new URL(secure.connectionString).searchParams.has('sslmode'));
  const local = postgresConfig({DATABASE_URL: 'postgres://postgres@localhost/apx?sslmode=require', DATABASE_SSL: 'false'});
  assert.equal(local.ssl, false);
});

test('initial schema contains every required APX table without destructive statements', async () => {
  const sql = await readFile(new URL('../migrations/001_initial.sql', import.meta.url), 'utf8');
  for (const table of ['users', 'policy_statements', 'votes', 'quotes', 'intelligence_posts', 'reconsiderations']) {
    assert.match(sql, new RegExp(`CREATE TABLE ${table} \\(`));
  }
  assert.doesNotMatch(sql, /\b(DROP|TRUNCATE|ALTER)\s+TABLE\b/i);
});
