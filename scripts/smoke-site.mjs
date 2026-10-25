import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const [directory, article = '/'] = process.argv.slice(2);
if (!directory) throw new Error('Usage: node scripts/smoke-site.mjs <built-site> [article-path]');
const reservation = createServer();
await new Promise(resolve => reservation.listen(0, '127.0.0.1', resolve));
const port = reservation.address().port;
await new Promise(resolve => reservation.close(resolve));
const origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, [join(directory, 'node_modules/astro/astro.js'), 'preview', '--host', '127.0.0.1', '--port', String(port)], { cwd: directory, stdio: ['ignore', 'pipe', 'pipe'] });
let serverOutput = '';
server.stdout.on('data', data => { serverOutput += data; });
server.stderr.on('data', data => { serverOutput += data; });
let browser;
try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw new Error(`Preview exited: ${serverOutput}`);
    try { ready = (await fetch(origin)).ok; } catch {}
    if (ready) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.ok(ready, `Preview did not start: ${serverOutput}`);
  browser = await chromium.launch();
  for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.origin === origin) return route.continue();
      if (route.request().resourceType() === 'image') return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="#888"/></svg>' });
      return route.fulfill({ status: 200, body: '' });
    });
    for (const path of [...new Set(['/', article])]) {
      const response = await page.goto(origin + path);
      assert.equal(response.status(), 200);
      await page.locator('h1').waitFor();
      assert.ok(await page.locator('nav a[href="/"]').count() >= 1);
      await page.evaluate(() => document.fonts.ready);
      // Explicitly load the variable face: the unused static Inter face need
      // not be loaded on a fresh CI browser, even when the page renders correctly.
      assert.ok(await page.evaluate(async () => {
        const faces = await document.fonts.load('16px InterVariable');
        return faces.length > 0 && faces.every(face => face.status === 'loaded');
      }), 'The packaged variable font must load successfully');
      const font = await page.request.get(origin + '/fonts/Inter/InterVariable.woff2');
      assert.equal(font.status(), 200);
      assert.ok((await font.body()).byteLength > 1000);
      const metrics = await page.evaluate(() => {
        const f = document.querySelector('footer').getBoundingClientRect();
        const c = document.querySelector('.content').getBoundingClientRect();
        return { footer: f.left, content: c.left, overflow: document.documentElement.scrollWidth - innerWidth };
      });
      assert.ok(Math.abs(metrics.footer - metrics.content) < 2, 'Footer must align with content');
      if (metrics.overflow >= 2) console.log(`Existing overflow at ${path} (${width}px): ${metrics.overflow}px`);
      assert.deepEqual(errors, [], `${path}: browser errors`);
    }
    await page.close();
  }
  console.log(`Production smoke passed: ${directory}`);
} finally {
  await browser?.close();
  const closed = new Promise(resolve => server.once('close', resolve));
  if (server.exitCode === null) { server.kill('SIGTERM'); await closed; }
}
