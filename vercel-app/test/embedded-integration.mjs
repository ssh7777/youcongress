// Run after `APX_DATABASE_MODE=embedded npm run build`.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';

assert.equal(process.env.APX_DATABASE_MODE, 'embedded');
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '4011'], {
  cwd: new URL('..', import.meta.url),
  stdio: 'inherit',
  env: {...process.env, DATABASE_URL: ''}
});
const origin = 'http://127.0.0.1:4011';
try {
  let health;
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const response = await fetch(`${origin}/api/health`);
      if (response.ok) {health = await response.json(); break;}
    } catch {}
    if (server.exitCode !== null) throw new Error('Embedded APX server exited');
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  assert.deepEqual(health, {status: 'ok', database: 'postgresql', mode: 'embedded', schema: '002_persistent_writes'});

  for (const path of ['/', '/explore', '/reconsider', '/intelligence']) {
    const response = await fetch(`${origin}${path}`);
    assert.equal(response.status, 200, `${path} must return 200`);
    const html = await response.text();
    assert.ok(html.includes('APX'), `${path} must render APX`);
    assert.ok(!html.includes('Records are temporarily unavailable'), `${path} must have a working database`);
  }
  assert.equal((await fetch(`${origin}/p/missing`)).status, 404);
  assert.equal((await fetch(`${origin}/p/missing/source-records.csv`)).status, 404);
  console.log('Embedded APX integration passed: migrated PostgreSQL health, all requested routes, empty states and 404s.');
} finally {
  if (server.exitCode === null) {
    server.kill('SIGTERM');
    await once(server, 'exit');
  }
}
