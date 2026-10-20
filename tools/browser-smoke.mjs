import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.setContent('<button id="probe">0</button><script>let n=0;document.querySelector("button").onclick=()=>document.querySelector("button").textContent=++n;</script>');
  await page.locator('#probe').click();
  assert.equal(await page.locator('#probe').textContent(), '1');
  console.log('Chromium launch, JavaScript and input: PASS (tool smoke, not a game test)');
} finally {
  await browser.close();
}

