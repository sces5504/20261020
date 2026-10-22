import { fingerprint } from "../../src/content/fingerprint.ts";
import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { chromium } from "../node_modules/playwright/index.mjs";
import { unlockStudio } from "./studio-access.mjs";
const expected = process.argv[2];
assert.match(expected, /^[a-f0-9]{40}$/);
const root = process.cwd();
const pack = JSON.parse(
  await readFile(root + "/content/generated/runtime.json", "utf8"),
);
const base = "https://sces5504.github.io/20261020/";
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
  proxy: process.env.HTTPS_PROXY
    ? { server: process.env.HTTPS_PROXY }
    : undefined,
});
const output = root + "/.artifacts/v8-public";
await mkdir(output, { recursive: true });
const errors = [],
  loaded = [];
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  // Keep TLS verification enabled in Playwright's Node transport, which uses the managed CA.
  // Chromium's own CA store lacks the environment proxy CA; fulfill only this public origin
  // from verified upstream responses, preserving its production URL, HTML, JS and assets.
  await page.route(base + "**", async (route) => {
    const response = await route.fetch();
    await route.fulfill({ response });
  });
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (/\/assets\/.*\.js$/.test(r.url())) loaded.push(r.url());
  });
  await page.goto(base + "version.json?v=" + expected);
  const version = JSON.parse(await page.locator("body").innerText());
  assert.equal(version.commit, expected);
  assert.equal(version.contentVersion, "0.8.0");
  assert.equal(version.packs.length, 8);
  assert.equal(version.contentHash, await fingerprint(pack));
  await page.goto(base + "?v=" + expected + "#/play");
  await page.waitForSelector("canvas");
  await page.waitForTimeout(500);
  if (await page.locator('[data-action="story-skip"]').count())
    await page.locator('[data-action="story-skip"]').click();
  assert.match(await page.locator(".build-note").innerText(), /26 位少女/);
  await page.locator('.deck-nav [data-id="roster"]').click();
  await page.locator('.character-card [data-action="level"]').first().click();
  await page.locator('.modal-heading [data-action="close"]').click();
  await page.locator('.deck-nav [data-id="quests"]').click();
  assert.equal(await page.locator(".daily-quests article").count(), 7);
  const task = page.locator('[data-daily-quest="m1:daily.forcegirl"]');
  await task.locator('[data-action="quest"]').click();
  await page.waitForFunction(
    () =>
      document.querySelector('[data-daily-quest="m1:daily.forcegirl"] button')
        .disabled,
  );
  assert.match(await task.innerText(), /今日已領取/);
  await page.screenshot({ path: output + "/daily.png" });
  const assets = pack.assets.filter((a) => a.id.includes("20261023"));
  assert.equal(assets.length, 33);
  const media = await page.evaluate(async (assets) => {
    const results = [];
    for (const a of assets) {
      const r = await fetch(a.src);
      if (!r.ok) throw Error(a.id + " " + r.status);
      const buf = await r.arrayBuffer();
      const hash = Array.from(
        new Uint8Array(await crypto.subtle.digest("SHA-256", buf)),
      )
        .map((n) => n.toString(16).padStart(2, "0"))
        .join("");
      if (hash !== a.hash) throw Error(a.id + " SHA");
      const image = new Image();
      image.src = a.src;
      await image.decode();
      if (image.naturalWidth !== a.width || image.naturalHeight !== a.height)
        throw Error(a.id + " size");
      results.push({ id: a.id, sha256: hash });
    }
    return results;
  }, assets);
  await page.goto(base + "?v=" + expected + "#/studio");
  await unlockStudio(page);
  await page.locator('[data-action="laboratory"]').click();
  await page.waitForSelector(".laboratory");
  for (let i = 0; i < 6; i++)
    await page
      .locator(".lab-ally")
      .nth(i)
      .locator("[data-character]")
      .selectOption("");
  await page
    .locator(".lab-ally")
    .first()
    .locator("[data-character]")
    .selectOption("story10:character.arcturus");
  await page
    .locator(".lab-ally")
    .first()
    .locator("[data-skill-level]")
    .fill("10");
  await page.locator('[data-lab="start"]').click();
  await page.locator('[data-lab="cast"]').first().click();
  for (let i = 0; i < 15; i++) await page.locator('[data-lab="step"]').click();
  const debug = JSON.parse(await page.locator("#lab-debug").textContent());
  assert.equal(debug.config.allies[0].character, "story10:character.arcturus");
  assert(debug.time >= 0.24);
  assert.equal(
    await page
      .locator("#lab-metrics tbody tr")
      .first()
      .locator("td")
      .last()
      .textContent(),
    "1",
  );
  await page
    .locator(".laboratory")
    .screenshot({ path: output + "/laboratory.png" });
  assert.deepEqual(errors, []);
  assert(loaded.length > 0);
  await writeFile(
    output + "/verification.json",
    JSON.stringify(
      {
        version,
        loaded,
        media,
        checks: [
          "production-runtime-26-maidens",
          "daily-quests-seven",
          "actual-daily-level-and-claim",
          "33-public-media-http-sha-decode",
          "Arcturus-original-skill-Lv10-cast-step",
          "no-page-errors",
        ],
        transport:
          "TLS-verified Playwright Node route.fetch through managed proxy; Chromium certificate errors were not ignored",
        physicalDevice: false,
      },
      null,
      2,
    ),
  );
  console.log("PASS public 0.8", expected, loaded, media.length);
} finally {
  await browser.close();
}
