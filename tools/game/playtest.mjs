import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "../node_modules/playwright/index.mjs";
import { serveBuilt } from "./serve-built.mjs";
const server = await serveBuilt(),
  browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
await mkdir(".artifacts/m1", { recursive: true });
const errors = [];
async function record(page, key) {
  return page.evaluate(
    (key) =>
      new Promise((resolve, reject) => {
        const r = indexedDB.open("stella-maiden-m1", 1);
        r.onsuccess = () => {
          const tx = r.result.transaction("records", "readonly"),
            q = tx.objectStore("records").get(key);
          q.onsuccess = () => resolve(q.result);
          q.onerror = () => reject(q.error);
        };
      }),
    key,
  );
}
try {
  const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    }),
    page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => d.accept());
  await page.goto(server.url + "#/studio");
  await page.waitForSelector("#entity-form");
  console.log("Playtest: image replacement + content-only seventh maiden");
  await page
    .locator("#upload-asset")
    .setInputFiles("art/characters/standard/maiden-05/v1.png");
  await page
    .locator('[data-action="save-entity"]')
    .waitFor({ state: "visible" });
  await page.waitForFunction(
    () => document.querySelector('[aria-busy="true"]') === null,
  );
  let project = await record(page, "editor:project"),
    asset = project.pack.assets.find((a) => a.id.startsWith("m1:asset-"));
  assert.ok(asset);
  await page.locator('[data-field="portrait"]').selectOption(asset.id);
  await page.locator('[data-action="save-entity"]').click();
  await page.waitForFunction(
    () => document.querySelector('[aria-busy="true"]') === null,
  );
  assert.equal(
    (await record(page, "editor:project")).pack.characters[0].portrait,
    asset.id,
  );
  await page.locator('[data-action="clone"]').click();
  await page.waitForFunction(
    () => document.querySelector('[aria-busy="true"]') === null,
  );
  project = await record(page, "editor:project");
  const added = project.pack.characters.at(-1);
  await page.locator('[data-field="name"]').fill("接力驗證彗星");
  await page.locator('[data-field="attack"]').fill("55");
  await page.locator('[data-field="skill"]').selectOption("m1:dispersion");
  await page.locator('[data-field="rarity"]').fill("5");
  await page.locator('[data-get-planet="m1:haven"]').check();
  await page.locator('[data-action="save-entity"]').click();
  await page.waitForFunction(
    () => document.querySelector('[aria-busy="true"]') === null,
  );
  await page.locator('[data-action="test"]').click();
  await page.waitForSelector("canvas");
  await page.locator('[data-action="battle"]').click();
  await page.locator('[data-action="auto"]').click();
  await page
    .getByRole("heading", { name: "航跡已開拓" })
    .waitFor({ timeout: 30000 });
  let s = await record(page, "save:test");
  assert.ok(s.cleared.includes("m1:haven"));
  assert.ok(
    s.roster.some((o) => o.definition === added.id),
    "acquisition edit must grant the seventh character",
  );
  assert.equal(
    await record(page, "save:main"),
    undefined,
    "sandbox must not create official progress",
  );
  await page.locator('[data-action="result-activate"]').click();
  await page.locator('[data-action="build"]').click();
  await page.waitForTimeout(100);
  s = await record(page, "save:test");
  assert.equal(s.jobs.filter((j) => j.kind === "build").length, 1);
  assert.ok(s.colonies["m1:haven"].active);
  await page.clock.install();
  await page.clock.fastForward(47000);
  await page.waitForTimeout(350);
  s = await record(page, "save:test");
  assert.ok(
    s.colonies["m1:haven"].buildings["m1:extractor"] >= 1,
    "management panel must allow timed construction",
  );
  await page.clock.resume();
  await page.locator('[data-action="close"]').first().click();
  console.log("Playtest: training, save identity, performance sampling");
  await page.locator('[data-id="training"][data-action="panel"]').click();
  await page.locator('[data-action="training-start"]').click();
  await page.locator("#training-clock").waitFor();
  await page.screenshot({ path: ".artifacts/m1/training.png" });
  const perf = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const times = [];
        let last = performance.now();
        function tick(t) {
          times.push(t - last);
          last = t;
          if (times.length >= 90) {
            const sorted = [...times].sort((a, b) => a - b);
            resolve({
              frames: times.length,
              p95FrameMs: sorted[Math.floor(sorted.length * 0.95)],
              averageFrameMs: times.reduce((a, b) => a + b) / times.length,
              viewport: [innerWidth, innerHeight],
              userAgent: navigator.userAgent,
            });
          } else requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      }),
  );
  assert.ok(Number.isFinite(perf.p95FrameMs));
  await writeFile(
    ".artifacts/m1/performance.json",
    JSON.stringify(perf, null, 2),
  );
  await page.locator('[data-action="retreat"]').click();
  await page.getByRole("heading", { name: "避彈訓練完成" }).waitFor();
  await page.locator('[data-action="close"]').first().click();
  assert.equal(
    (await record(page, "save:test")).roster.length,
    s.roster.length,
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: media replacement, cloned character + skill/star/acquisition editing, actual first-battle win/drop, colony activation/build completion while paused, training, isolated official save; p95 ms:",
    perf.p95FrameMs.toFixed(1),
  );
} finally {
  await browser.close();
  await server.close();
}
