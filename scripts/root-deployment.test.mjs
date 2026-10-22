import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Vercel builds the native app at repository root, not the obsolete gateway', async () => {
  const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url)));
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url)));
  assert.equal(config.framework, 'nextjs');
  assert.equal(config.installCommand, 'npm ci');
  assert.equal(config.buildCommand, 'npm run build');
  assert.equal(config.outputDirectory, '.next');
  assert.equal(pkg.scripts.build, 'next build');
  assert.ok(pkg.dependencies.next);
  assert.ok(!JSON.stringify(config).includes('build-vercel.mjs'));
});

test('all migrated routes have root entry points with statically analyzable runtime settings', async () => {
  for (const file of ['app/layout.jsx', 'app/page.jsx', 'app/explore/page.jsx', 'app/p/[slug]/page.jsx', 'app/p/[slug]/source-records.csv/route.js', 'app/api/health/route.js']) {
    const text = await readFile(new URL(`../${file}`, import.meta.url), 'utf8');
    assert.match(text, /vercel-app\/app/);
    if (file.endsWith('route.js')) {
      assert.match(text, /export const runtime = 'nodejs'/);
      assert.match(text, /export const dynamic = 'force-dynamic'/);
    }
  }
});
