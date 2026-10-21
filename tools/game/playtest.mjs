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
async function waitSave(page, ready, description) {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    const save = await record(page, "save:test");
    if (save && ready(save)) return save;
    await page.waitForTimeout(100);
  }
  const save = await record(page, "save:test");
  throw Error(
    `${description}: ${JSON.stringify({ jobs: save?.jobs, colonies: save?.colonies, wallet: save?.wallet, feedback: await page.locator("#toast").textContent() })}`,
  );
}
try {
  const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    }),
    page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => {
    errors.push("Unexpected browser dialog");
    void d.dismiss();
  });
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
  await page.locator('[data-action="story-skip"]').click();
  await page.locator('[data-action="view"]').click();
  await page.locator('[data-action="battle"]').click();
  await page.locator('[data-action="auto"]').click();
  await page
    .getByRole("heading", { name: "航跡已開拓" })
    .waitFor({ timeout: 120000 });
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
  s = await waitSave(
    page,
    (s) => s.jobs.filter((j) => j.kind === "build").length === 1,
    "construction must be durably queued",
  );
  assert.equal(s.jobs.filter((j) => j.kind === "build").length, 1);
  assert.ok(s.colonies["m1:haven"].active);
  await page.clock.install();
  await page.clock.fastForward(65000);
  s = await waitSave(
    page,
    (s) => (s.colonies["m1:haven"].buildings["m1:extractor"] ?? 0) >= 1,
    "construction must finish while the management panel is open",
  );
  assert.ok(
    s.colonies["m1:haven"].buildings["m1:extractor"] >= 1,
    "management panel must allow timed construction",
  );
  await page.clock.resume();
  await page.locator('[data-action="close"]').first().click();
  for (let i = 0; i < 5; i++) {
    await page.waitForTimeout(300);
    const skip = page.locator('[data-action="story-skip"]');
    if (await skip.isVisible()) await skip.click();
    else break;
  }
  console.log("Playtest: character profile, dialogue and content acquisition");
  await page.locator(".squad-card").first().click();
  await page.waitForSelector(".character-detail");
  assert.ok((await page.locator(".skill-detail").innerText()).includes("護盾"));
  await page.screenshot({ path: ".artifacts/m1/profile.png" });
  await page.locator('[data-action="close"]').first().click();
  await page.locator('[data-id="planets"][data-action="panel"]').click();
  assert.ok(
    (await page.locator(".modal-body").innerText()).includes("蔚藍前哨"),
  );
  await page.locator('[data-action="close"]').first().click();
  assert.deepEqual(errors, []);
  console.log(
    "PASS: original media replacement, seventh character/skill/star/acquisition edit, multi-wave battle win/drop, colony build while paused, character profile and planet management; official save isolated.",
  );
} finally {
  await browser.close();
  await server.close();
}
