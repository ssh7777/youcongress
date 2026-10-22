import { mkdir, writeFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Vercel is the HTTP gateway; the persistent Phoenix release is the origin.
// Never fall back to the upstream project's production site or an empty export.
export function gatewayConfig(env = process.env) {
  if (!env.PHOENIX_ORIGIN?.trim()) {
    throw new Error('PHOENIX_ORIGIN is required: deploy the Phoenix Docker backend, then set its HTTPS origin in Vercel. Vercel cannot run the Elixir server itself.');
  }
  const origin = new URL(env.PHOENIX_ORIGIN.trim());
  const local = !env.VERCEL && ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname);
  if ((origin.protocol !== 'https:' && !(local && origin.protocol === 'http:')) ||
      origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) {
    throw new Error('PHOENIX_ORIGIN must be an HTTPS origin without credentials, path, query or fragment.');
  }
  const publicHosts = [env.VERCEL_URL, env.VERCEL_BRANCH_URL, env.VERCEL_PROJECT_PRODUCTION_URL, env.PUBLIC_ORIGIN]
    .filter(Boolean).map(value => new URL(value.includes('://') ? value : `https://${value}`).hostname);
  if (publicHosts.includes(origin.hostname) || origin.hostname.endsWith('.vercel.app')) {
    throw new Error('PHOENIX_ORIGIN must point to the Phoenix backend, not a Vercel gateway (rewrite loop).');
  }
  return {
    version: 3,
    routes: [{ src: '/(.*)', dest: `${origin.origin}/$1`, headers: { 'Cache-Control': 'private, no-store' } }]
  };
}

export async function checkBackend(origin, fetcher = fetch) {
  const response = await fetcher(`${origin}/about`, { redirect: 'manual', signal: AbortSignal.timeout(15000) });
  if (response.status !== 200) {
    throw new Error(`Phoenix backend /about returned ${response.status}; expected 200 without a redirect.`);
  }
  const html = await response.text();
  if (!/<meta\s+name="csrf-token"\s+content="[^"]+"/.test(html) ||
      !/<meta\s+name="liveview-transport"\s+content="longpoll"/.test(html)) {
    throw new Error('Backend is not the updated Phoenix app in gateway mode. Deploy this code with LIVEVIEW_TRANSPORT=longpoll before deploying Vercel.');
  }
}

export async function build(env = process.env, output = '.vercel/output', fetcher = fetch) {
  // Remove stale output first: failed validation must not reuse an old gateway.
  await rm(output, { recursive: true, force: true });
  const config = gatewayConfig(env);
  const origin = new URL(env.PHOENIX_ORIGIN.trim()).origin;
  await checkBackend(origin, fetcher);
  await mkdir(output, { recursive: true });
  await writeFile(`${output}/config.json`, JSON.stringify(config, null, 2) + '\n');
  console.log('Verified Phoenix backend; generated Vercel HTTP gateway (Build Output API v3).');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  build().catch(error => {
    console.error(`Vercel deployment blocked: ${error.message}`);
    process.exitCode = 1;
  });
}
