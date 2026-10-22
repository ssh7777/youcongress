import test from 'node:test';
import assert from 'node:assert/strict';
import {postgresConfig} from '../lib/postgres.mjs';
import {databaseMode} from '../lib/database-mode.mjs';
import {migrations} from '../lib/migrations.mjs';

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

test('database mode is explicit and external URLs remain supported', () => {
  assert.equal(databaseMode({APX_DATABASE_MODE: 'embedded'}), 'embedded');
  assert.equal(databaseMode({DATABASE_URL: 'postgres://db.example.com/apx'}), 'external');
  assert.equal(databaseMode({APX_DATABASE_MODE: 'external', DATABASE_URL: 'postgres://db.example.com/apx'}), 'external');
  assert.throws(() => databaseMode({APX_DATABASE_MODE: 'external'}), /DATABASE_URL is required/);
  assert.throws(() => databaseMode({APX_DATABASE_MODE: 'invalid'}), /embedded or external/);
  assert.throws(() => databaseMode({}), /APX_DATABASE_MODE=embedded/);
});

test('initial schema contains every required APX table without destructive statements', () => {
  assert.equal(migrations[0].version, '001_initial');
  const sql = migrations[0].sql;
  for (const table of ['users', 'policy_statements', 'votes', 'quotes', 'intelligence_posts', 'reconsiderations']) {
    assert.match(sql, new RegExp(`CREATE TABLE ${table} \\(`));
  }
  assert.doesNotMatch(sql, /\b(DROP|TRUNCATE)\s+TABLE\b/i);
  assert.equal(migrations[1].version, '002_persistent_writes');
  assert.match(migrations[1].sql, /CREATE TABLE guest_sessions/);
  assert.match(migrations[1].sql, /ALTER TABLE quotes ADD COLUMN created_by/);
});
