// Browser smoke check of the real compiled release. Run from CI after migration.
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const polls = [];
    const sockets = [];
    page.on('request', request => {
      if (new URL(request.url()).pathname === '/live/longpoll') polls.push(request.method());
    });
    page.on('websocket', socket => sockets.push(socket.url()));
    const response = await page.goto('http://localhost:4000/explore');
    assert.equal(response.status(), 200);
    await page.waitForFunction(() => document.querySelector('[data-phx-main]')?.classList.contains('phx-connected'));
    await page.locator('input[name="search"]').fill('gateway-smoke-query');
    await page.locator("#search-results").waitFor({state: "visible"});
    await page.waitForFunction(() => document.querySelector('[data-phx-main]')?.classList.contains('phx-connected'));
    assert.ok(polls.includes('GET'), 'LiveView must poll over HTTP');
    assert.ok(polls.includes('POST'), 'LiveView must send events over HTTP');
    assert.deepEqual(sockets, [], 'gateway mode must not attempt WebSockets');
    console.log('LiveView connected and processed a search event using HTTP long-polling.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(`::error::${String(error.stack || error).replaceAll("\n", "%0A")}`);
  process.exitCode = 1;
});
