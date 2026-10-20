// Original template's diagnostic only. New games need their own acceptance checks.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const url = new URL(process.argv[2] ?? 'https://sces5504.github.io/dev-environment-template/');
assert.equal(url.protocol, 'https:');
assert.equal(url.hostname, 'sces5504.github.io');
assert.equal(url.pathname, '/dev-environment-template/');
assert.equal(url.username + url.password + url.search + url.hash, '');
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const response = await page.goto(url.href, { waitUntil: 'networkidle', timeout: 60000 });
  assert.equal(response.status(), 200);
  assert.equal(await page.locator('#result').textContent(), 'dev-environment-template-pages-probe-v1');
  assert.deepEqual(errors, []);
  await mkdir('.artifacts', { recursive: true });
  await page.screenshot({ path: '.artifacts/pages-probe.png', fullPage: true });
  console.log('Public HTTPS 200, expected rendered probe and no page errors: PASS');
} finally {
  await browser.close();
}
