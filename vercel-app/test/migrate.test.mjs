import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {applyMigrations, loadMigrations, databaseUrl, connectionSettings, ADVISORY_LOCK_KEY} from '../scripts/migrate.mjs';

function fakeClient(results = []) {
  const calls = [];
  const client = {
    calls,
    query: async (sql, values) => {
      calls.push([sql, values]);
      if (typeof sql === 'string' && sql.startsWith('SELECT name FROM')) return {rows: results};
      return {rows: []};
    }
  };
  return client;
}

test('migrations load in sorted order from the migrations directory', async () => {
  const migrations = await loadMigrations();
  assert.ok(migrations.length >= 1);
  assert.equal(migrations[0].name, '001_init.sql');
  const names = migrations.map(m => m.name);
  assert.deepEqual(names, [...names].sort());
  for (const table of ['users', 'policy_statements', 'votes', 'quotes', 'intelligence_posts']) {
    assert.ok(migrations[0].sql.includes(table), `schema must create ${table}`);
  }
});

test('applyMigrations locks, applies missing migrations transactionally, and unlocks', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'apx-migrations-'));
  await writeFile(join(dir, '001_a.sql'), 'CREATE TABLE a (id int);');
  await writeFile(join(dir, '002_b.sql'), 'CREATE TABLE b (id int);');
  const client = fakeClient();
  await applyMigrations(client, await loadMigrations(dir));
  const statements = client.calls.map(([sql]) => String(sql));
  assert.equal(statements[0], 'SELECT pg_advisory_lock($1)');
  assert.deepEqual(client.calls[0][1], [ADVISORY_LOCK_KEY.toString()]);
  assert.ok(statements.includes('BEGIN'));
  assert.equal(statements.filter(s => s === 'COMMIT').length, 2);
  assert.equal(statements.at(-1), 'SELECT pg_advisory_unlock($1)');
  const inserts = client.calls.filter(([sql, values]) => String(sql).includes('INSERT INTO schema_migrations'));
  assert.deepEqual(inserts.map(([, values]) => values[0]), ['001_a.sql', '002_b.sql']);
});

test('already applied migrations are never re-run', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'apx-migrations-'));
  await writeFile(join(dir, '001_a.sql'), 'CREATE TABLE a (id int);');
  const client = fakeClient([{name: '001_a.sql'}]);
  await applyMigrations(client, await loadMigrations(dir));
  const statements = client.calls.map(([sql]) => String(sql));
  assert.ok(!statements.some(s => s === 'BEGIN'), 'nothing to apply');
});

test('a failing migration rolls back and reports its name', async () => {
  const client = {
    calls: [],
    query: async (sql, values) => {
      client.calls.push([String(sql), values]);
      if (String(sql).startsWith('SELECT name FROM')) return {rows: []};
      if (String(sql).startsWith('CREATE TABLE boom')) throw new Error('syntax error');
      return {rows: []};
    }
  };
  await assert.rejects(() => applyMigrations(client, [{name: '002_boom.sql', sql: 'CREATE TABLE boom;'}]), /002_boom\.sql failed/);
  assert.ok(client.calls.some(([sql]) => sql === 'ROLLBACK'));
});

test('DATABASE_URL handling: unset skips, non-postgres URLs are rejected', async () => {
  assert.equal(databaseUrl({}), null);
  assert.equal(databaseUrl({DATABASE_URL: '  '}), null);
  assert.equal(databaseUrl({DATABASE_URL: ' postgres://db.example/app '}), 'postgres://db.example/app');
  const settings = connectionSettings('postgres://user:pass@db.example/app?sslmode=require&application_name=apx');
  assert.ok(!settings.connectionString.includes('sslmode='));
  assert.equal(settings.ssl.rejectUnauthorized, true);
  assert.equal(connectionSettings('postgres://user:pass@db.example/app', {DATABASE_SSL: 'false'}).ssl, false);
});
