// Run only against a disposable local APX database after `npm run migrate` and `npm run build:next`.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {randomUUID} from 'node:crypto';
import pg from 'pg';

process.on('uncaughtException', error => {
  console.error(`::error::${String(error.message).replaceAll('\n', '%0A')}`);
  process.exit(1);
});

const url = new URL(process.env.DATABASE_URL || 'http://invalid');
assert.equal(process.env.NATIVE_TEST_DATABASE, '1', 'Explicit disposable-database opt-in required');
assert.ok(['localhost', '127.0.0.1'].includes(url.hostname));
assert.equal(url.pathname, '/postgres');
const client = new pg.Client({connectionString: url.href, ssl: false});
await client.connect();
const slug = `apx-ci-${randomUUID()}`;
let server, statementId, userId, intelligenceId;
try {
  await client.query('BEGIN');
  const user = await client.query("INSERT INTO users(email,display_name) VALUES ($1,'APX CI author') RETURNING id", [`${slug}@example.com`]);
  userId = user.rows[0].id;
  const statement = await client.query('INSERT INTO policy_statements(title,slug,description,created_by) VALUES ($1,$2,$3,$4) RETURNING id', [`APX search ${slug}`, slug, 'Disposable integration statement', userId]);
  statementId = statement.rows[0].id;
  await client.query('INSERT INTO quotes(statement_id,author_name,content,source_url,source_text) VALUES ($1,$2,$3,$4,$5)', [statementId, 'APX CI author', '=formula <script id="apx-record-xss">alert(1)</script>', 'https://example.com/apx-ci-source', 'Original source passage']);
  await client.query("INSERT INTO votes(statement_id,user_id,position) VALUES ($1,$2,'for')", [statementId, userId]);
  const intelligence = await client.query("INSERT INTO intelligence_posts(slug,title,summary,content,status,author_id,published_at) VALUES ($1,$2,'Integration summary','Intelligence body','published',$3,now()) RETURNING id", [slug, `Intelligence ${slug}`, userId]);
  intelligenceId = intelligence.rows[0].id;
  await client.query("INSERT INTO reconsiderations(statement_id,requested_by,rationale) VALUES ($1,$2,$3)", [statementId, userId, `Reconsider rationale ${slug}`]);
  await client.query('COMMIT');

  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '4010'], {cwd: new URL('..', import.meta.url), stdio: 'inherit', env: {...process.env, DATABASE_SSL: 'false'}});
  const origin = 'http://127.0.0.1:4010';
  let ready = false;
  for (let attempt = 0; attempt < 40; attempt++) {
    try { if ((await fetch(`${origin}/api/health`)).ok) {ready = true; break;} } catch {}
    if (server.exitCode !== null) throw new Error('APX server exited');
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  assert.ok(ready, 'APX schema health check must pass');

  const home = await fetch(`${origin}/`);
  assert.equal(home.status, 200);
  assert.ok((await home.text()).includes('APX'));
  const listing = await fetch(`${origin}/explore?q=${encodeURIComponent(slug)}`);
  assert.equal(listing.status, 200);
  assert.ok((await listing.text()).includes(`APX search ${slug}`));
  const detail = await fetch(`${origin}/p/${slug}`);
  assert.equal(detail.status, 200);
  const html = await detail.text();
  assert.ok(html.includes('Original source passage'));
  assert.ok(html.includes('APX CI author'));
  assert.ok(html.includes('https://example.com/apx-ci-source'));
  assert.ok(!html.includes('<script id="apx-record-xss">'), 'Database text must be HTML-escaped');
  const reconsider = await fetch(`${origin}/reconsider`);
  assert.equal(reconsider.status, 200);
  assert.ok((await reconsider.text()).includes(`Reconsider rationale ${slug}`));
  const intelligencePage = await fetch(`${origin}/intelligence`);
  assert.equal(intelligencePage.status, 200);
  assert.ok((await intelligencePage.text()).includes(`Intelligence ${slug}`));
  const csv = await fetch(`${origin}/p/${slug}/source-records.csv`);
  assert.equal(csv.status, 200);
  assert.ok(csv.headers.get('content-type').startsWith('text/csv'));
  assert.ok((await csv.text()).includes('"\'=formula'));
  assert.equal((await fetch(`${origin}/p/${slug}-missing`)).status, 404);
  assert.equal((await fetch(`${origin}/p/${slug}-missing/source-records.csv`)).status, 404);
  console.log('APX integration passed: all requested routes, quotes, votes, reconsiderations, intelligence, CSV, health, escaping and 404s.');
} finally {
  if (server && server.exitCode === null) {
    server.kill('SIGTERM');
    await once(server, 'exit');
  }
  await client.query('ROLLBACK').catch(() => {});
  if (intelligenceId) await client.query('DELETE FROM intelligence_posts WHERE id=$1', [intelligenceId]);
  if (statementId) await client.query('DELETE FROM policy_statements WHERE id=$1', [statementId]);
  if (userId) await client.query('DELETE FROM users WHERE id=$1', [userId]);
  await client.end();
}
