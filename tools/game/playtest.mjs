import { unlockStudio } from "./studio-access.mjs";
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
  await unlockStudio(page);
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
  await page.waitForSelector("canvas", { timeout: 60000 });
  await page.locator('[data-action="story-skip"]').click();
  await page.locator('[data-action="view"]').click();
  await page.locator('[data-action="navigate"]').first().click();
  await page.locator('[data-action="auto"]').click();
  // Proximity starts at the guard perimeter; use real WASD to enter weapon range.
  await page.waitForSelector(".in-battle");
  const haven = project.pack.planets.find((v) => v.id === "m1:haven");
  await page.keyboard.down("d");
  try {
    await page.waitForFunction(
      (x) =>
        Number(
          document
            .querySelector("#coordinates")
            ?.textContent?.match(/X ([\d.]+)/)?.[1],
        ) >= x,
      haven.x - 30,
    );
  } finally {
    await page.keyboard.up("d");
  }
  await page.keyboard.down("w");
  try {
    await page.waitForFunction(
      (y) =>
        Number(
          document
            .querySelector("#coordinates")
            ?.textContent?.match(/Y ([\d.]+)/)?.[1],
        ) <= y,
      haven.y + 30,
    );
  } finally {
    await page.keyboard.up("w");
  }

  const progress = setInterval(async () => {
    try {
      console.log(
        "Playtest battle:",
        await page.locator("#battle-tools").innerText(),
        "overlay:",
        await page.locator("#overlay").innerText(),
      );
    } catch {}
  }, 15000);
  try {
    await page
      .getByRole("heading", { name: "航跡已開拓" })
      .waitFor({ timeout: 120000 });
  } catch (e) {
    console.log(
      "Battle failure:",
      await record(page, "save:test"),
      await page.locator("#squad").innerText(),
    );
    await page.screenshot({ path: ".artifacts/v2/playtest-failure.png" });
    throw e;
  } finally {
    clearInterval(progress);
  }
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
  await page
    .locator(".mission-waiting strong")
    .filter({ hasText: "等待建設中" })
    .waitFor();
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
  // Both first-liberation and activation dialogues become available here.
  // Read each scene and wait for its durable receipt rather than racing a 250ms UI tick.
  const readyStories = project.pack.quests.filter(
    (q) =>
      ["cleared", "activated"].includes(q.condition) && q.target === "m1:haven",
  );
  for (const q of readyStories) {
    if ((await record(page, "save:test")).storySeen.includes(q.id)) continue;
    await page.locator('[data-action="story-skip"]').waitFor();
    await page.locator('[data-action="story-skip"]').click();
    await waitSave(
      page,
      (s) => s.storySeen.includes(q.id),
      "dialogue must be acknowledged before continuing",
    );
  }
  console.log("Playtest: character profile, dialogue and content acquisition");
  await page.locator(".squad-card").first().click();
  await page.waitForSelector(".character-detail");
  assert.match(await page.locator(".skill-detail").innerText(), /40%機率偏折/);
  assert.match(await page.locator(".skill-detail").innerText(), /3秒/);
  await page.screenshot({ path: ".artifacts/m1/profile.png" });
  await page.locator('[data-action="close"]').first().click();
  await page.locator('[data-id="planets"][data-action="panel"]').click();
  assert.ok(
    (await page.locator(".modal-body").innerText()).includes("蔚藍前哨"),
  );
  await page.locator('[data-action="close"]').first().click();
  await page.locator('[data-id="planets"][data-action="panel"]').click();
  await page
    .locator(".territory-card .entity-image")
    .first()
    .evaluate(async (im) => {
      await im.decode();
      if (!im.naturalWidth) throw Error("territory image missing");
    });
  await page.locator('[data-action="manage-planet"]').first().click();
  await page
    .locator(".building-card .entity-image")
    .first()
    .evaluate(async (im) => {
      await im.decode();
      if (!im.naturalWidth) throw Error("building image missing");
    });
  await page.evaluate(async () => {
    await Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
        .map((a) => a.finished.catch(() => {})),
    );
  });
  await page.screenshot({ path: ".artifacts/v2/building-management.png" });
  assert.deepEqual(errors, []);
  console.log(
    "PASS: original media replacement, seventh character/skill/star/acquisition edit, single-wave proximity battle win/drop, colony build while paused, character profile and planet management; official save isolated.",
  );
} finally {
  await browser.close();
  await server.close();
}
