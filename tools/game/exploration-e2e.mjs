import assert from "node:assert/strict";
import { readFile, mkdir } from "node:fs/promises";
import { chromium } from "../node_modules/playwright/index.mjs";
import { serveBuilt } from "./serve-built.mjs";
const server = await serveBuilt(),
  pack = JSON.parse(await readFile("content/generated/runtime.json", "utf8"));
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
});
await mkdir(".artifacts/v2", { recursive: true });
async function record(page, key = "save:main") {
  return page.evaluate(
    (key) =>
      new Promise((resolve) => {
        const r = indexedDB.open("stella-maiden-m1", 1);
        r.onsuccess = () => {
          const q = r.result
            .transaction("records")
            .objectStore("records")
            .get(key);
          q.onsuccess = () => resolve(q.result);
        };
      }),
    key,
  );
}
async function waitSave(page, ready, description) {
  const end = Date.now() + 15000;
  while (Date.now() < end) {
    const save = await record(page);
    if (save && ready(save)) return save;
    await page.waitForTimeout(100);
  }
  throw Error(
    description +
      ": " +
      JSON.stringify({
        save: await record(page),
        feedback: await page.locator("#toast").textContent(),
      }),
  );
}
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 2,
  });
  let page = await context.newPage();
  const errors = [];
  page.setDefaultTimeout(15000);
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => {
    errors.push("Native browser dialog forbidden");
    void d.dismiss();
  });
  await page.goto(server.url);
  await page.waitForSelector(".story-scene");
  await page.screenshot({ path: ".artifacts/v2/story.png" });
  const first = await page.locator(".story-line").innerText();
  await page.locator('[data-action="story-next"]').click();
  assert.notEqual(await page.locator(".story-line").innerText(), first);
  await page.locator('[data-action="story-skip"]').click();
  await page.waitForSelector(".story-scene", { state: "hidden" });
  assert.equal(await page.locator('[data-id="training"]').count(), 0);
  assert.equal(await page.locator("#defense-alerts").count(), 0);
  const initial = await record(page);
  await page.keyboard.down("d");
  let moved;
  try {
    moved = await waitSave(
      page,
      (s) => s.x > initial.x + 35,
      "WASD must move and persist the party",
    );
  } finally {
    await page.keyboard.up("d");
  }
  assert.ok(moved.x > initial.x + 35, "WASD must move the actual saved party");
  const density = await page
    .locator("canvas")
    .evaluate((c) => c.width / c.clientWidth);
  assert.ok(
    density >= 1.99 && density <= 2.01,
    "battle canvas must render at DPR 2",
  );
  await page.screenshot({ path: ".artifacts/v2/explore.png" });
  await page.locator('[data-action="view"]').click();
  await page.waitForFunction(() =>
    document
      .querySelector('[data-action="view"]')
      ?.textContent.includes("銀河航行"),
  );
  assert.ok(
    (await page.locator('[data-action="view"]').innerText()).includes(
      "銀河航行",
    ),
  );
  await page.locator('[data-action="view"]').click();
  await page.locator(".squad-card").first().click();
  await page.waitForSelector(".character-detail");
  assert.ok(
    (await page.locator(".skill-detail").innerText()).includes("80 點護盾"),
  );
  await page.screenshot({ path: ".artifacts/v2/character.png" });
  await page
    .locator('.modal [data-id="formation"][data-action="panel"]')
    .click();
  await page.waitForSelector(".formation-slots");
  assert.equal(await page.locator(".formation-slots > div").count(), 3);
  await page.locator('[data-action="close"]').first().click();
  await page.locator('[data-id="summon"][data-action="panel"]').click();
  const before = await record(page);
  await page.locator('[data-action="summon"]').click();
  await page.getByRole("alertdialog").waitFor();
  await page.screenshot({ path: ".artifacts/v2/confirmation.png" });
  await page.keyboard.press("Escape");
  await page.getByRole("alertdialog").waitFor({ state: "hidden" });
  await page.locator('[data-action="summon"]').click();
  await page.locator('[data-answer="no"]').click();
  assert.deepEqual((await record(page)).wallet, before.wallet);
  await page.locator('[data-action="summon"]').click();
  await page.locator('[data-answer="yes"]').click();
  await waitSave(
    page,
    (s) => s.jobs.filter((j) => j.kind === "summon").length === 1,
    "summon must be durably queued",
  );
  assert.equal(
    (await record(page)).jobs.filter((j) => j.kind === "summon").length,
    1,
  );
  await page.clock.install();
  await page.clock.fastForward(37000);
  await page.waitForSelector(".acquisition-screen");
  await page.screenshot({ path: ".artifacts/v2/acquisition.png" });
  assert.equal((await record(page)).acquisitionQueue.length, 1);
  await page.locator('[data-action="acquisition-next"]').click();
  await page.waitForSelector(".acquisition-screen", { state: "hidden" });
  assert.equal((await record(page)).acquisitionQueue.length, 0);
  await page.clock.resume();
  await page.locator('[data-action="close"]').first().click();
  // Stop the game before installing a safe, reproducible patrol approach fixture.
  await page.goto(server.url + "#/art");
  await page.waitForSelector(".art-gallery");
  const patrol = pack.regions[0].patrols[0];
  await page.evaluate(async ({ x, y }) => {
    const r = indexedDB.open("stella-maiden-m1", 1);
    await new Promise((resolve) => (r.onsuccess = resolve));
    const tx = r.result.transaction("records", "readwrite"),
      store = tx.objectStore("records"),
      q = store.get("save:main");
    q.onsuccess = () => {
      const s = q.result;
      s.x = x - 230;
      s.y = y;
      s.encounter = null;
      s.revision++;
      store.put(s, "save:main");
    };
    await new Promise((resolve) => (tx.oncomplete = resolve));
  }, patrol);
  const prior = page;
  page = await context.newPage();
  await prior.close();
  page.setDefaultTimeout(15000);
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => {
    errors.push("Native browser dialog");
    void d.dismiss();
  });
  await page.goto(server.url + "#/play");
  await page.waitForSelector("canvas");
  const arrived = await record(page);
  for (const q of pack.quests.filter(
    (q) =>
      q.condition === "summoned" &&
      q.count <= arrived.summoned &&
      !arrived.storySeen.includes(q.id),
  )) {
    await page.locator('[data-action="story-skip"]').waitFor();
    await page.locator('[data-action="story-skip"]').click();
    await waitSave(
      page,
      (s) => s.storySeen.includes(q.id),
      "arrival dialogue must finish before resuming patrol travel",
    );
  }
  await page.keyboard.down("d");
  await page.waitForSelector(".in-battle", { timeout: 60000 });
  await page.keyboard.up("d");
  assert.equal((await record(page)).encounter.kind, "patrol");
  await page.screenshot({ path: ".artifacts/v2/patrol.png" });
  await page.locator('[data-action="view"]').click();
  await page.waitForFunction(() =>
    document
      .querySelector('[data-action="view"]')
      ?.textContent.includes("銀河航行"),
  );
  assert.ok(
    (await page.locator('[data-action="view"]').innerText()).includes(
      "銀河航行",
    ),
  );
  await page.screenshot({ path: ".artifacts/v2/patrol-map.png" });
  await page.locator('[data-action="view"]').click();
  await page.locator('[data-action="panel"][data-id="roster"]').click();
  await page.locator('.modal [data-action="character"]').first().click();
  await page.waitForSelector(".character-detail");
  await page.locator('[data-action="close"]').first().click();
  await page.locator('[data-action="retreat"]').click();
  await page.getByRole("alertdialog").waitFor();
  await page.locator('[data-answer="yes"]').click();
  await page.getByRole("heading", { name: "已撤離交戰區" }).waitFor();
  assert.equal((await record(page)).cleared.length, 0);
  await page.goto(server.url + "#/catalog");
  await page.waitForSelector("#roster-rows tr");
  assert.equal(await page.locator("#roster-rows tr").count(), 120);
  await page.locator("#roster-filter").selectOption("priority");
  assert.equal(await page.locator("#roster-rows tr").count(), 12);
  await page.screenshot({ path: ".artifacts/v2/roster.png" });
  await page.goto(server.url + "#/play");
  await page.waitForSelector("canvas");
  const beforeReset = await record(page);
  await page.locator('[data-id="archive"][data-action="panel"]').click();
  await page.locator('[data-action="new-voyage"]').click();
  await page.locator('[data-answer="yes"]').click();
  await page.waitForSelector(".story-scene");
  const reset = await record(page);
  assert.equal(reset.summoned, 0);
  await waitSave(
    page,
    (s) => s.revision > reset.revision,
    "new voyage must autosave",
  );
  const protectedBackup = await record(page, "save:main:restore-point");
  assert.equal(protectedBackup.summoned, beforeReset.summoned);
  assert.equal(
    protectedBackup.roster.length,
    beforeReset.roster.length,
    "autosave must not overwrite the protected pre-reset progress",
  );
  assert.deepEqual(errors, []);
  const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    }),
    m = await mobileContext.newPage();
  m.on("pageerror", (e) => errors.push(e.message));
  await m.goto(server.url);
  await m.locator('[data-action="story-skip"]').click();
  await m.waitForSelector(".story-scene", { state: "hidden" });
  await m.screenshot({ path: ".artifacts/v2/mobile.png" });
  assert.ok(
    await m.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  );
  assert.equal(
    await m.locator("#planet-card").isVisible(),
    false,
    "planet cards must not obscure mobile exploration by default",
  );
  const box = await m.locator("canvas").boundingBox();
  await m.touchscreen.tap(box.x + box.width * 0.75, box.y + box.height * 0.3);
  const ms = await waitSave(
    m,
    (s) => s.x !== pack.regions[0].startX || s.y !== pack.regions[0].startY,
    "touch must move and persist the party",
  );
  assert.ok(
    ms.x !== pack.regions[0].startX || ms.y !== pack.regions[0].startY,
    "touch must move actual party at DPR2",
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS exploration: dialogue, WASD/touch, DPR2 canvas, map toggle, character/formation/skill descriptions, custom confirmations, cancel atomicity, persistent summon reveal, natural patrol collision/retreat, 120 future art targets and 12 priority entries, no native dialogs or mobile obstruction.",
  );
} finally {
  await browser.close();
  await server.close();
}
