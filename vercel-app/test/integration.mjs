// Only run against a disposable local database (CI opt-in). Requires "npm run build" first.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
import {applyMigrations, loadMigrations, connectionSettings} from '../scripts/migrate.mjs';

process.on('uncaughtException', error => {
  console.error(`::error::${String(error.message).replaceAll('\n', '%0A')}`);
  process.exit(1);
});

const url = new URL(process.env.DATABASE_URL || 'http://invalid');
assert.equal(process.env.NATIVE_TEST_DATABASE, '1', 'Explicit disposable-database opt-in required');
assert.ok(['localhost', '127.0.0.1'].includes(url.hostname), 'Integration tests only run against a local disposable database');
const client = new pg.Client(connectionSettings(url.href, {DATABASE_SSL: 'false'}));
await client.connect();
const slug = `native-ci-${randomUUID()}`;
let server, statementId;
try {
  await applyMigrations(client, await loadMigrations());
  const user = await client.query("INSERT INTO users(username, display_name) VALUES ($1, 'Native CI') RETURNING id", [`ci-${randomUUID()}`]);
  const statement = await client.query('INSERT INTO policy_statements(title, slug) VALUES ($1, $2) RETURNING id', [`Native search ${slug}`, slug]);
  statementId = statement.rows[0].id;
  await client.query(
    "INSERT INTO quotes(policy_statement_id, author_name, content, source_url, source_text, date, date_precision) VALUES ($1, 'Native CI author', $2, $3, 'Original source passage', '2026-01-02', 'day')",
    [statementId, '=formula <script id="native-record-xss">alert(1)</script>', 'https://example.com/native-ci-source']
  );
  await client.query("INSERT INTO votes(user_id, policy_statement_id, value) VALUES ($1, $2, 'for')", [user.rows[0].id, statementId]);
  await client.query('INSERT INTO intelligence_posts(title, summary, source_url, published_at) VALUES ($1, $2, $3, now())', [`Native intelligence ${slug}`, 'CI intelligence summary', 'https://example.com/native-intelligence']);

  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '4010'], {cwd: new URL('..', import.meta.url), stdio: 'inherit', env: {...process.env, DATABASE_SSL: 'false'}});
  const origin = 'http://127.0.0.1:4010';
  let ready = false;
  for (let attempt = 0; attempt < 40; attempt++) {
    try { if ((await fetch(`${origin}/api/health`)).ok) {ready = true; break;} } catch {}
    if (server.exitCode !== null) throw new Error('Native server exited');
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  assert.ok(ready, 'APX schema health check must pass');

  const health = await (await fetch(`${origin}/api/health`)).json();
  assert.equal(health.status, 'ok');
  assert.deepEqual(health.schema, ['users', 'policy_statements', 'votes', 'quotes', 'intelligence_posts']);

  const listing = await fetch(`${origin}/explore?q=${encodeURIComponent(slug)}`);
  assert.equal(listing.status, 200);
  assert.ok((await listing.text()).includes(`Native search ${slug}`));

  const page = await (await fetch(`${origin}/p/${slug}`)).text();
  assert.ok(page.includes('Native CI author'));
  assert.ok(page.includes('&lt;script id=&quot;native-record-xss&quot;'), 'quote HTML must be escaped');
  assert.ok(!page.includes('<script id="native-record-xss"'), 'raw script tags must never appear');
  assert.ok(page.includes('For 1'), 'statement page shows vote tallies');

  const csv = await (await fetch(`${origin}/p/${slug}/source-records.csv`)).text();
  assert.ok(csv.includes('attribution APX'));
  assert.ok(csv.toLowerCase().includes("'=formula"));
  const legacyName = ['you', 'congress'].join('');
  assert.ok(!csv.toLowerCase().includes(legacyName));

  const reconsider = await (await fetch(`${origin}/reconsider`)).text();
  assert.ok(reconsider.includes(`Native search ${slug}`));
  assert.ok(reconsider.includes('For 1'));

  const intelligence = await (await fetch(`${origin}/intelligence`)).text();
  assert.ok(intelligence.includes(`Native intelligence ${slug}`));
  assert.ok(intelligence.includes('CI intelligence summary'));

  assert.equal((await fetch(`${origin}/p/does-not-exist-${slug}`)).status, 404);
  console.log('APX native integration checks passed');
} finally {
  if (server) server.kill('SIGTERM');
  await client.query('DELETE FROM votes WHERE policy_statement_id = $1', [statementId]).catch(() => {});
  await client.query('DELETE FROM quotes WHERE policy_statement_id = $1', [statementId]).catch(() => {});
  await client.query('DELETE FROM policy_statements WHERE id = $1', [statementId]).catch(() => {});
  await client.query('DELETE FROM users WHERE username LIKE $1', [`ci-%`]).catch(() => {});
  await client.query("DELETE FROM intelligence_posts WHERE title LIKE 'Native intelligence native-ci-%'").catch(() => {});
  await client.end().catch(() => {});
}
