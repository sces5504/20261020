import assert from "node:assert/strict";
import { readFile, mkdir } from "node:fs/promises";
import { chromium } from "../node_modules/playwright/index.mjs";
import { serveBuilt } from "./serve-built.mjs";
import { unlockStudio } from "./studio-access.mjs";
import { newSave } from "../../src/domain/model.ts";
import { apply } from "../../src/domain/economy.ts";
const pack = JSON.parse(
  await readFile("content/generated/runtime.json", "utf8"),
);
const server = await serveBuilt(),
  browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
await mkdir(".artifacts/v5", { recursive: true });
async function record(page, key = "save:test") {
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
async function waitSave(page, predicate) {
  const end = Date.now() + 15000;
  while (Date.now() < end) {
    const s = await record(page);
    if (s && predicate(s)) return s;
    await page.waitForTimeout(100);
  }
  throw Error("Save condition failed: " + JSON.stringify(await record(page)));
}
async function install(page, p, s) {
  await page.goto(server.url + "#/art");
  await page.waitForSelector(".art-gallery");
  await page.evaluate(
    async ({ p, s }) => {
      const r = indexedDB.open("stella-maiden-m1", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("records");
      await new Promise((resolve) => (r.onsuccess = resolve));
      const tx = r.result.transaction("records", "readwrite");
      tx.objectStore("records").put(p, "content:test");
      tx.objectStore("records").put(s, "save:test");
      await new Promise((resolve) => (tx.oncomplete = resolve));
      r.result.close();
    },
    { p, s },
  );
  await page.goto(server.url + "#/test");
  await page.waitForSelector("canvas");
}
try {
  const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    }),
    page = await context.newPage(),
    errors = [];
  page.setDefaultTimeout(15000);
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => {
    errors.push("Native dialog");
    void d.dismiss();
  });
  await page.goto(server.url + "#/studio");
  await page.waitForSelector("#studio-password");
  assert.equal(await page.locator("#entity-form").count(), 0);
  await page.locator("#studio-password").fill("wrong");
  await page.locator("#studio-access-form button").click();
  assert.ok(
    (await page.locator("#studio-access-error").textContent()).includes(
      "不正確",
    ),
  );
  assert.equal(await page.locator("#entity-form").count(), 0);
  await unlockStudio(page);
  await page.reload();
  await page.waitForSelector("#entity-form");
  await page.locator('[data-action="lock-studio"]').click();
  await page.getByRole("alertdialog").waitFor();
  await page.locator('[data-answer="yes"]').click();
  await page.waitForSelector("#studio-password");
  await page.screenshot({
    path: ".artifacts/v5/studio-lock.png",
    animations: "disabled",
  });
  await unlockStudio(page);
  let s = newSave(pack, Date.now(), "test");
  s.storySeen = pack.quests.map((q) => q.id);
  s.wallet = Object.fromEntries(pack.resources.map((r) => [r.id, 5000]));
  s.cleared = [pack.planets[0].id];
  s.colonies[pack.planets[0].id] = {
    active: true,
    lost: false,
    buildings: {},
    assigned: "",
    raidRemaining: 0,
  };
  s = apply(
    pack,
    s,
    {
      type: "build",
      planet: pack.planets[0].id,
      building: pack.buildings[0].id,
    },
    Date.now(),
    "v5-build",
  );
  s = apply(
    pack,
    s,
    { type: "summon", recipe: pack.characters[0].recipe, count: 1 },
    Date.now(),
    "v5-summon",
  );
  // Keep both pending across UI checks; no fake combat clock.
  for (const j of s.jobs) j.ends = Date.now() + 180000;
  const editable = structuredClone(pack);
  // The published second sector now has content; explicitly retain the empty-sector fixture.
  editable.planets = editable.planets.filter(
    (v) => v.region !== editable.regions[1].id,
  );
  editable.regions[0].routes[0].label = "<em>前往測試空域</em>";
  await install(page, editable, s);
  await page.locator(".mission-waiting .job-art img").waitFor();
  await page.locator(".mission-waiting .job-art svg").waitFor();
  await page.locator('[data-action="panel"][data-id="summon"]').click();
  await page.locator(".job .job-art img").evaluate(async (im) => {
    await im.decode();
    if (!im.naturalWidth) throw Error("build art missing");
  });
  assert.ok(await page.locator(".job .job-art svg").count());
  const label = await page.locator('[data-action="view"]').textContent();
  await page.locator(".recipe").first().focus();
  await page.keyboard.press("m");
  assert.equal(await page.locator('[data-action="view"]').textContent(), label);
  await page.screenshot({
    path: ".artifacts/v5/pending-jobs.png",
    animations: "disabled",
  });
  await page.locator('[data-action="close"]').first().click();
  await page.keyboard.down("m");
  await page.waitForFunction(
    (label) =>
      document.querySelector('[data-action="view"]')?.textContent !== label,
    label,
  );
  const once = await page.locator('[data-action="view"]').textContent();
  await page.keyboard.down("m");
  assert.equal(await page.locator('[data-action="view"]').textContent(), once);
  await page.keyboard.up("m");
  await page.keyboard.press("m");
  await page.waitForFunction(
    (label) =>
      document.querySelector('[data-action="view"]')?.textContent === label,
    label,
  );
  await page
    .locator('[data-action="panel"][data-id="regions"]')
    .first()
    .click();
  assert.equal(await page.locator(".region-route em").count(), 0);
  assert.ok(
    (await page.locator('[data-action="travel"]').innerText()).includes("<em>"),
  );
  await page.locator('[data-action="travel"]').click();
  await page.locator('[data-answer="no"]').click();
  assert.equal((await record(page)).region, pack.regions[0].id);
  await page.locator('[data-action="travel"]').click();
  await page.locator('[data-answer="yes"]').click();
  const away = await waitSave(page, (s) => s.region === pack.regions[1].id);
  assert.equal(away.jobs.length, 2);
  await page.waitForFunction(
    (name) => document.querySelector("#region-title")?.textContent === name,
    pack.regions[1].name,
  );
  assert.equal(await page.locator("#planet-card").isVisible(), false);
  assert.equal(await page.locator(".mission-waiting").count(), 2);
  await page.screenshot({
    path: ".artifacts/v5/second-sector.png",
    animations: "disabled",
  });
  await page.reload();
  await page.waitForSelector("canvas");
  assert.equal((await record(page)).region, pack.regions[1].id);
  // Empty-sector clicks must navigate even at another region's planet coordinates.
  await page.keyboard.press("m");
  await page.waitForFunction(() =>
    document
      .querySelector('[data-action="view"]')
      ?.textContent.includes("銀河航行"),
  );
  const canvas = await page.locator("canvas").boundingBox(),
    sector = pack.regions[1],
    ghost = pack.planets[0];
  const zoom =
    Math.min(canvas.width / sector.width, canvas.height / sector.height) * 0.88;
  const oldPosition = await record(page);
  await page.mouse.click(
    canvas.x + canvas.width / 2 + (ghost.x - sector.width / 2) * zoom,
    canvas.y + canvas.height / 2 + (ghost.y - sector.height / 2) * zoom,
  );
  const navigated = await waitSave(page, (s) => s.x > oldPosition.x + 25);
  assert.equal(navigated.encounter, null);
  assert.equal(await page.locator("#planet-card").isVisible(), false);

  await page
    .locator('[data-action="panel"][data-id="regions"]')
    .first()
    .click();
  await page.locator('[data-action="travel"]').click();
  await page.locator('[data-answer="yes"]').click();
  const home = await waitSave(page, (s) => s.region === pack.regions[0].id);
  assert.ok(home.colonies[pack.planets[0].id].active);
  assert.deepEqual(
    home.jobs.map((j) => j.id),
    away.jobs.map((j) => j.id),
  );
  assert.equal(await record(page, "save:main"), undefined);
  console.log(
    "PASS polish: password wrong/correct/session/relock, pending construction art and resonance icon, M toggle/repeat/input guard, travel cancel/outbound/reload/return with jobs/colonies and main-save isolation",
  );
  const strong = structuredClone(pack);
  for (const e of strong.enemies) {
    e.hp = 100000;
    e.attack = 1;
  }
  for (const sk of strong.skills) sk.cooldown = 5;
  const fight = newSave(strong, Date.now(), "test");
  fight.storySeen = strong.quests.map((q) => q.id);
  fight.x = strong.planets[0].x - 300;
  fight.y = strong.planets[0].y;
  await install(page, strong, fight);
  await page.waitForSelector(".in-battle");
  await page.locator(".squad-card.skill-ready").first().waitFor();
  await page.locator(".squad-card").first().click();
  const cooling = await page
    .locator(".squad-card")
    .first()
    .evaluate((el) => ({
      ready: el.classList.contains("skill-ready"),
      cooling: el.classList.contains("skill-cooling"),
      animation: getComputedStyle(el).animationName,
      shadow: getComputedStyle(el).boxShadow,
    }));
  assert.equal(cooling.ready, false);
  assert.equal(cooling.cooling, true);
  assert.equal(cooling.animation, "none");
  assert.equal(cooling.shadow, "none");
  await page.waitForFunction(
    () =>
      document.querySelector(".squad-card")?.getAttribute("data-ready") ===
      "true",
  );
  await page.keyboard.press("1");
  assert.equal(
    await page.locator(".squad-card").first().getAttribute("data-ready"),
    "false",
  );
  await page.keyboard.press("m");
  await page.waitForFunction(() =>
    document
      .querySelector('[data-action="view"]')
      ?.textContent.includes("銀河航行"),
  );
  assert.ok((await record(page)).encounter);
  console.log(
    "PASS polish: mouse-hover and keyboard casts clear actual ready glow immediately, then re-ready; combat M toggle",
  );
  const mobile = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    }),
    mp = await mobile.newPage();
  mp.on("pageerror", (e) => errors.push(e.message));
  mp.on("dialog", (d) => {
    errors.push("Native dialog");
    void d.dismiss();
  });
  await mp.goto(server.url + "#/studio");
  await mp.waitForSelector("#studio-password");
  assert.ok(
    await mp.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  );
  await unlockStudio(mp);
  const empty = newSave(pack, Date.now(), "test");
  empty.region = pack.regions[1].id;
  empty.x = pack.regions[1].startX;
  empty.y = pack.regions[1].startY;
  empty.storySeen = pack.quests.map((q) => q.id);
  await install(mp, pack, empty);
  await mp.locator('[data-action="panel"][data-id="regions"]').first().click();
  await mp.locator('[data-action="travel"]').waitFor();
  assert.ok(
    await mp.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  );
  await mp.screenshot({
    path: ".artifacts/v5/mobile-travel.png",
    fullPage: true,
    animations: "disabled",
  });
  await mobile.close();
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
  await server.close();
}
