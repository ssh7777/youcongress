// Only run in CI against the disposable database migrated by the Phoenix release.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {randomUUID} from 'node:crypto';
import pg from 'pg';

const url = new URL(process.env.DATABASE_URL || 'http://invalid');
assert.equal(process.env.NATIVE_TEST_DATABASE, '1', 'Explicit disposable-database opt-in required');
assert.ok(['localhost', '127.0.0.1'].includes(url.hostname));
assert.equal(url.pathname, '/you_congress');
const client = new pg.Client({connectionString: url.href, ssl: false});
await client.connect();
const slug = `native-ci-${randomUUID()}`;
let server, statementId, authorId;
try {
  await client.query('BEGIN');
  const author = await client.query("INSERT INTO authors(name, inserted_at, updated_at) VALUES ('Native CI author', now(), now()) RETURNING id");
  authorId = author.rows[0].id;
  const statement = await client.query('INSERT INTO statements(title,slug,inserted_at,updated_at) VALUES ($1,$2,now(),now()) RETURNING id', [`Native search ${slug}`, slug]);
  statementId = statement.rows[0].id;
  const opinion = await client.query('INSERT INTO opinions(content,source_url,source_text,author_id,inserted_at,updated_at) VALUES ($1,$2,$3,$4,now(),now()) RETURNING id', ['=formula <script id="native-record-xss">alert(1)</script>', 'https://example.com/native-ci-source', 'Original source passage', authorId]);
  await client.query('INSERT INTO opinions_statements(opinion_id,statement_id,inserted_at,updated_at) VALUES ($1,$2,now(),now())', [opinion.rows[0].id, statementId]);
  await client.query('COMMIT');
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '4010'], {cwd: new URL('..', import.meta.url), stdio: 'inherit', env: {...process.env, DATABASE_SSL: 'false'}});
  const origin = 'http://127.0.0.1:4010';
  let ready = false;
  for (let attempt = 0; attempt < 40; attempt++) {
    try { if ((await fetch(`${origin}/api/health`)).ok) {ready = true; break;} } catch {}
    if (server.exitCode !== null) throw new Error('Native server exited');
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  assert.ok(ready, 'Native schema health check must pass');
  const listing = await fetch(`${origin}/explore?q=${encodeURIComponent(slug)}`);
  assert.equal(listing.status, 200);
  assert.ok((await listing.text()).includes(`Native search ${slug}`));
  const detail = await fetch(`${origin}/p/${slug}`);
  assert.equal(detail.status, 200);
  const html = await detail.text();
  assert.ok(html.includes('Original source passage'));
  assert.ok(html.includes('Native CI author'));
  assert.ok(html.includes('https://example.com/native-ci-source'));
  assert.ok(!html.includes('<script id="native-record-xss">'), 'Database text must be HTML-escaped');
  const csv = await fetch(`${origin}/p/${slug}/source-records.csv`);
  assert.equal(csv.status, 200);
  assert.ok(csv.headers.get('content-type').startsWith('text/csv'));
  assert.ok((await csv.text()).includes('"\'=formula'));
  assert.equal((await fetch(`${origin}/p/${slug}-missing`)).status, 404);
  assert.equal((await fetch(`${origin}/p/${slug}-missing/source-records.csv`)).status, 404);
  console.log('Native integration passed against the full migrated Phoenix schema: search, quotes, source links, escaping, CSV, health and 404s.');
} finally {
  if (server && server.exitCode === null) {
    server.kill('SIGTERM');
    await once(server, 'exit');
  }
  await client.query('ROLLBACK').catch(() => {});
  if (statementId) await client.query('DELETE FROM statements WHERE id=$1', [statementId]);
  if (authorId) await client.query('DELETE FROM authors WHERE id=$1', [authorId]);
  await client.end();
}
