import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gatewayConfig, checkBackend, build } from './build-vercel.mjs';

const html = '<meta name="csrf-token" content="token"><meta name="liveview-transport" content="longpoll">';
const healthy = async () => new Response(html);

test('requires an explicit backend rather than silently deploying an empty site', () => {
  assert.throws(() => gatewayConfig({}), /PHOENIX_ORIGIN is required/);
});

test('rejects insecure, malformed and credential-bearing origins', () => {
  for (const PHOENIX_ORIGIN of ['http://backend.example.com', 'ftp://backend.example.com', 'https://user:secret@backend.example.com', 'https://backend.example.com/path', 'https://backend.example.com?q=x', 'https://backend.example.com#fragment']) {
    assert.throws(() => gatewayConfig({PHOENIX_ORIGIN}), /HTTPS origin/);
  }
});

test('rejects public gateway origins to prevent rewrite loops', () => {
  for (const env of [
    {PHOENIX_ORIGIN: 'https://app.vercel.app'},
    {PHOENIX_ORIGIN: 'https://app.example.com', PUBLIC_ORIGIN: 'https://app.example.com'},
    {PHOENIX_ORIGIN: 'https://app.example.com', VERCEL_URL: 'app.example.com'}
  ]) assert.throws(() => gatewayConfig(env), /rewrite loop/);
});

test('generates a catch-all external rewrite without a static page or redirect', () => {
  assert.deepEqual(gatewayConfig({PHOENIX_ORIGIN: 'https://backend.example.com/'}), {
    version: 3,
    routes: [{src: '/(.*)', dest: 'https://backend.example.com/$1', headers: {'Cache-Control': 'private, no-store'}}]
  });
});

test('only permits HTTP localhost for local checks, never Vercel builds', () => {
  assert.equal(gatewayConfig({PHOENIX_ORIGIN: 'http://localhost:4000'}).version, 3);
  assert.throws(() => gatewayConfig({PHOENIX_ORIGIN: 'http://localhost:4000', VERCEL: '1'}), /HTTPS origin/);
});

test('backend preflight refuses errors and domain redirects', async () => {
  for (const status of [301, 302, 404, 500, 503]) {
    await assert.rejects(checkBackend('https://backend.example.com', async () => new Response('', {status})), /expected 200/);
  }
});

test('backend preflight rejects arbitrary HTML and websocket-only servers', async () => {
  for (const content of ['hello', '<meta name="csrf-token" content="token">']) {
    await assert.rejects(checkBackend('https://backend.example.com', async () => new Response(content)), /gateway mode/);
  }
  await checkBackend('https://backend.example.com', healthy);
});

test('writes Build Output API config only after successful preflight', async () => {
  const output = await mkdtemp(join(tmpdir(), 'youcongress-vercel-'));
  try {
    await build({PHOENIX_ORIGIN: 'https://backend.example.com'}, output, healthy);
    assert.equal(JSON.parse(await readFile(join(output, 'config.json'), 'utf8')).version, 3);
    await assert.rejects(build({}, output, healthy), /required/);
    await assert.rejects(readFile(join(output, 'config.json')), /ENOENT/);
  } finally {
    await rm(output, {recursive: true, force: true});
  }
});
