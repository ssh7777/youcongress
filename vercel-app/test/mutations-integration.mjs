// Requires a disposable migrated APX database and a production build.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {randomUUID} from 'node:crypto';
import pg from 'pg';

assert.equal(process.env.NATIVE_TEST_DATABASE, '1');
assert.equal(process.env.APX_DATABASE_MODE, 'external');
const databaseUrl = new URL(process.env.DATABASE_URL || 'http://invalid');
assert.ok(['localhost', '127.0.0.1'].includes(databaseUrl.hostname));
assert.equal(databaseUrl.pathname, '/postgres');
const client = new pg.Client({connectionString: databaseUrl.href, ssl: false});
await client.connect();
const origin = 'http://127.0.0.1:4012';
const marker = randomUUID();
const statementIds = [], intelligenceIds = [], userIds = [];
let server;

function startServer() {
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '4012'], {
    cwd: new URL('..', import.meta.url), stdio: 'inherit', env: process.env
  });
}
async function stopServer() {
  if (server && server.exitCode === null) {
    server.kill('SIGTERM');
    await once(server, 'exit');
  }
}
async function healthy() {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const response = await fetch(`${origin}/api/health`);
      if (response.ok) {
        const body = await response.json();
        assert.equal(body.mode, 'external');
        assert.equal(body.schema, '002_persistent_writes');
        return;
      }
    } catch {}
    if (server.exitCode !== null) throw new Error('Mutation test server exited.');
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error('Mutation test server did not become healthy.');
}
async function post(fields, {cookie, requestOrigin = origin, json = true} = {}) {
  const response = await fetch(`${origin}/api/mutate`, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      origin: requestOrigin,
      accept: json ? 'application/json' : 'text/html',
      'content-type': 'application/x-www-form-urlencoded',
      ...(cookie ? {cookie} : {})
    },
    body: new URLSearchParams(fields)
  });
  const text = await response.text();
  return {
    response,
    body: json ? JSON.parse(text) : text,
    cookie: response.headers.get('set-cookie')?.match(/apx_guest=[^;]+/)?.[0]
  };
}
function created(result, status = 200) {
  assert.equal(result.response.status, status, JSON.stringify(result.body));
  assert.equal(result.body.ok, true, JSON.stringify(result.body));
  return result.body.record;
}
async function page(path, cookie) {
  return fetch(`${origin}${path}`, {headers: cookie ? {cookie} : {}});
}

try {
  startServer();
  await healthy();

  const csrf = await post({resource: 'statement', operation: 'create', title: 'Cross origin attempt'}, {requestOrigin: 'https://attacker.example'});
  assert.equal(csrf.response.status, 403);

  const createdStatement = await post({resource: 'statement', operation: 'create', title: `Persistent statement ${marker}`, description: 'Initial description', returnTo: '/explore'});
  const guestCookie = createdStatement.cookie;
  assert.ok(guestCookie, 'First mutation must create a persistent guest session');
  const statement = created(createdStatement);
  statementIds.push(statement.id);
  userIds.push(statement.created_by);
  assert.ok(statement.slug);
  const statementPath = `/p/${encodeURIComponent(statement.slug)}`;
  assert.ok((await (await page(`/explore?q=${encodeURIComponent(marker)}`)).text()).includes(`Persistent statement ${marker}`));

  const updated = await post({resource: 'statement', operation: 'update', id: statement.id, title: `Updated statement ${marker}`, description: 'Updated description', returnTo: statementPath}, {cookie: guestCookie, json: false});
  assert.equal(updated.response.status, 303);
  assert.ok(updated.response.headers.get('location').includes('success='));
  let html = await (await page(statementPath, guestCookie)).text();
  assert.ok(html.includes(`Updated statement ${marker}`));
  assert.ok(html.includes('Updated description'));
  assert.ok(html.includes('Edit your policy statement'));

  for (const position of ['for', 'against']) {
    const result = await post({resource: 'vote', operation: 'set', statement_id: statement.id, position, returnTo: statementPath}, {cookie: guestCookie});
    assert.equal(created(result).position, position);
  }
  const vote = await client.query('SELECT count(*)::int AS count,position FROM votes WHERE statement_id=$1 GROUP BY position', [statement.id]);
  assert.deepEqual(vote.rows, [{count: 1, position: 'against'}]);

  const quoteResult = await post({resource: 'quote', operation: 'create', statement_id: statement.id, content: '<script id="mutation-xss">alert(1)</script>', author_name: 'Mutation author', source_url: 'https://example.com/mutation', source_text: 'Original mutation passage', returnTo: statementPath}, {cookie: guestCookie});
  const quote = created(quoteResult);
  html = await (await page(statementPath, guestCookie)).text();
  assert.ok(!html.includes('<script id="mutation-xss">'));
  await post({resource: 'quote', operation: 'update', id: quote.id, content: 'Updated persistent quote', author_name: 'Mutation author', source_url: 'https://example.com/mutation', source_text: 'Updated source passage', returnTo: statementPath}, {cookie: guestCookie}).then(created);
  html = await (await page(statementPath, guestCookie)).text();
  assert.ok(html.includes('Updated persistent quote'));

  const otherStatementResult = await post({resource: 'statement', operation: 'create', title: `Other guest statement ${marker}`, description: '', returnTo: '/explore'});
  const otherCookie = otherStatementResult.cookie;
  const otherStatement = created(otherStatementResult);
  statementIds.push(otherStatement.id);
  userIds.push(otherStatement.created_by);
  const forbidden = await post({resource: 'statement', operation: 'update', id: statement.id, title: 'Stolen title', description: '', returnTo: statementPath}, {cookie: otherCookie});
  assert.equal(forbidden.response.status, 404);
  assert.equal(forbidden.body.ok, false);

  const reconsideration = created(await post({resource: 'reconsideration', operation: 'create', statement_id: statement.id, rationale: `Persistent rationale ${marker}`, returnTo: '/reconsider'}, {cookie: guestCookie}));
  assert.ok((await (await page('/reconsider', guestCookie)).text()).includes(`Persistent rationale ${marker}`));
  created(await post({resource: 'reconsideration', operation: 'close', id: reconsideration.id, returnTo: '/reconsider'}, {cookie: guestCookie}));
  assert.ok(!(await (await page('/reconsider', guestCookie)).text()).includes(`Persistent rationale ${marker}`));

  const intelligence = created(await post({resource: 'intelligence', operation: 'create', title: `Persistent intelligence ${marker}`, summary: 'Initial summary', content: 'Initial analysis', returnTo: '/intelligence'}, {cookie: guestCookie}));
  intelligenceIds.push(intelligence.id);
  created(await post({resource: 'intelligence', operation: 'update', id: intelligence.id, title: `Updated intelligence ${marker}`, summary: 'Updated summary', content: 'Updated analysis', returnTo: '/intelligence'}, {cookie: guestCookie}));
  assert.ok((await (await page('/intelligence', guestCookie)).text()).includes(`Updated intelligence ${marker}`));

  // A fresh server process must see the same externally persisted mutations.
  await stopServer();
  startServer();
  await healthy();
  html = await (await page(statementPath, guestCookie)).text();
  assert.ok(html.includes(`Updated statement ${marker}`));
  assert.ok(html.includes('Updated persistent quote'));
  assert.ok(html.includes('Updated source passage'));
  assert.ok((await (await page('/intelligence', guestCookie)).text()).includes(`Updated intelligence ${marker}`));

  created(await post({resource: 'quote', operation: 'delete', id: quote.id, returnTo: statementPath}, {cookie: guestCookie}));
  created(await post({resource: 'intelligence', operation: 'delete', id: intelligence.id, returnTo: '/intelligence'}, {cookie: guestCookie}));
  created(await post({resource: 'statement', operation: 'delete', id: otherStatement.id, returnTo: '/explore'}, {cookie: otherCookie}));
  created(await post({resource: 'statement', operation: 'delete', id: statement.id, returnTo: '/explore'}, {cookie: guestCookie}));
  assert.equal((await page(statementPath, guestCookie)).status, 404);
  console.log('Persistent mutation integration passed: guest sessions, CSRF, ownership, CRUD, vote upsert, HTML redirects, XSS escaping, and restart persistence.');
} finally {
  await stopServer();
  if (intelligenceIds.length) await client.query('DELETE FROM intelligence_posts WHERE id=ANY($1::bigint[])', [intelligenceIds]);
  if (statementIds.length) await client.query('DELETE FROM policy_statements WHERE id=ANY($1::bigint[])', [statementIds]);
  if (userIds.length) await client.query('DELETE FROM users WHERE id=ANY($1::bigint[])', [userIds]);
  await client.end();
}
