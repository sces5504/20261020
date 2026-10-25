import assert from "node:assert/strict";
import { readFile, mkdir } from "node:fs/promises";
import { chromium } from "../node_modules/playwright/index.mjs";
import { serveBuilt } from "./serve-built.mjs";
import { newSave, addCharacter } from "../../src/domain/model.ts";
import { patrolPosition } from "../../src/domain/navigation.ts";
const p = JSON.parse(await readFile("content/generated/runtime.json", "utf8"));
const server = await serveBuilt(),
  browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
await mkdir(".artifacts/v4", { recursive: true });
const errors = [];
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
async function waitSave(page, predicate, label) {
  const end = Date.now() + 15000;
  while (Date.now() < end) {
    const s = await record(page);
    if (s && predicate(s)) return s;
    await page.waitForTimeout(100);
  }
  throw Error(
    label +
      ": " +
      JSON.stringify({
        save: await record(page),
        toast: await page.locator("#toast").textContent(),
      }),
  );
}
async function install(page, pack, s) {
  await page.goto(server.url + "#/art");
  await page.waitForSelector(".art-gallery", { timeout: 60000 });
  await page.evaluate(
    async ({ pack, s }) => {
      const r = indexedDB.open("stella-maiden-m1", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("records");
      await new Promise((resolve) => (r.onsuccess = resolve));
      const tx = r.result.transaction("records", "readwrite"),
        store = tx.objectStore("records");
      store.put(pack, "content:test");
      store.put(s, "save:test");
      await new Promise((resolve) => (tx.oncomplete = resolve));
      r.result.close();
    },
    { pack, s },
  );
  await page.goto(server.url + "#/test");
  await page.waitForSelector("canvas", { timeout: 60000 });
}
function fixture(pack) {
  const s = newSave(pack, Date.now(), "test");
  s.storySeen = pack.quests.map((q) => q.id);
  s.wallet = Object.fromEntries(pack.resources.map((r) => [r.id, 5000]));
  return s;
}
try {
  const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    }),
    page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => {
    errors.push("Native dialog forbidden");
    void d.dismiss();
  });
  const pack = structuredClone(p);
  pack.characters.forEach((c, i) => (c.summonable = i === 0));
  pack.rules.summonSeconds = 1;
  const s = fixture(pack);
  s.x = 100;
  s.y = 100;
  const target = s.team[0];
  for (let i = 0; i < 5; i++) addCharacter(pack, s, s.roster[0].definition);
  await install(page, pack, s);
  assert.equal(await page.title(), "Galaxy Angel · 星河戰姬");
  await page.locator(".squad-card").first().click();
  await page.waitForSelector(".character-detail");
  for (let rank = 1; rank <= 5; rank++) {
    await page.locator('[data-action="open-feed"]').click();
    await page.locator('[data-action="feed"]').first().click();
    await page.getByRole("alertdialog").waitFor();
    if (rank === 1) {
      await page.locator('[data-answer="no"]').click();
      assert.equal((await record(page)).roster.length, 8);
      await page.locator('[data-action="feed"]').first().click();
    }
    await page.locator('[data-answer="yes"]').click();
    await page.waitForFunction(
      (rank) =>
        document
          .querySelector(".resonance-info")
          ?.textContent.includes(`同調 ${rank}/5`),
      rank,
    );
    const saved = await record(page);
    assert.equal(saved.roster.find((o) => o.id === target).resonance, rank);
    assert.equal(saved.roster.length, 8 - rank);
  }
  assert.equal(await page.locator(".profile-copy .awakened-star").count(), 1);
  assert.ok(await page.locator('[data-action="open-feed"]').isDisabled());
  await page.screenshot({
    path: ".artifacts/v4/purple-star.png",
    animations: "disabled",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    "mobile profile must not overflow",
  );
  await page.locator('[data-action="open-feed"]').scrollIntoViewIfNeeded();
  await page.screenshot({
    path: ".artifacts/v4/mobile-resonance.png",
    animations: "disabled",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator('[data-action="close"]').first().click();
  await page.locator('[data-action="panel"][data-id="summon"]').click();
  const recipe = [101, 203, 307, 409];
  for (let i = 0; i < 4; i++)
    await page.locator(".recipe").nth(i).fill(String(recipe[i]));
  const before = await record(page);
  await page.locator('[data-action="summon"]').click();
  await page.locator('[data-answer="yes"]').click();
  await page.locator('[data-action="summon-claim"]').click({ timeout: 60000 });
  const converted = await waitSave(
    page,
    (s) => s.duplicateConversions === 1,
    "full-rank duplicate must convert once",
  );
  for (let i = 0; i < 4; i++)
    assert.equal(
      converted.wallet[pack.resources[i].id],
      before.wallet[pack.resources[i].id] - recipe[i] * 0.75,
    );
  assert.equal(converted.roster.length, 3);
  assert.equal(await page.locator(".acquisition-screen").count(), 0);
  assert.equal(await record(page, "save:main"), undefined);
  console.log(
    "PASS refinement: five manual feeds, cancel atomicity, one purple star, actual-recipe quarter refund, no extra owned copy",
  );
  const weak = structuredClone(p);
  weak.enemies.forEach((e) => {
    e.hp = 1;
    e.attack = 1;
  });
  const roam = fixture(weak),
    v = weak.regions[0].patrols[0],
    pos = patrolPosition(v, 0);
  roam.x = pos.x - 20;
  roam.y = pos.y;
  await install(page, weak, roam);
  const won = await waitSave(
    page,
    (s) => (s.patrolCooldowns[v.id] ?? 0) > 0 && s.encounter === null,
    "nearby patrol must engage and finish",
  );
  assert.deepEqual(won.cleared, []);
  assert.equal(await page.locator(".result-screen").count(), 0);
  await page.waitForFunction(() =>
    document.querySelector("#toast")?.textContent.includes("巡邏隊已擊破"),
  );
  for (const [id, n] of Object.entries(v.reward))
    assert.equal(won.wallet[id], roam.wallet[id] + n);
  console.log(
    "PASS refinement: immediate patrol contact, nonblocking victory toast and exact reward",
  );
  const arena = structuredClone(p);
  arena.enemies.forEach((e) => {
    e.hp = 100000;
    e.attack = 1;
  });
  // Only the three starter skills are accelerated for this feedback fixture.
  // Source enemies keep their cooldowns and the complete world stays within
  // its declared simultaneous-unit budget.
  const rapidSkills = new Set(
    arena.characters.filter((c) => c.starter).map((c) => c.skill),
  );
  arena.skills
    .filter((s) => rapidSkills.has(s.id))
    .forEach((s) => {
      s.cooldown = 1;
      s.duration = 0.5;
    });
  const battle = fixture(arena),
    planet = arena.planets[0];
  battle.x = planet.x - 300;
  battle.y = planet.y;
  await install(page, arena, battle);
  await page.waitForSelector(".in-battle");
  const entry = await waitSave(
    page,
    (s) => !!s.encounter,
    "proximity encounter",
  );
  assert.equal(await page.locator('[data-action="battle"]').count(), 0);
  await page.locator(".squad-card.skill-ready").first().waitFor();
  await page.locator(".squad-card").first().click();
  await page.waitForFunction(
    () =>
      document.querySelector(".squad-card")?.getAttribute("data-ready") ===
      "false",
  );
  await page.waitForFunction(
    () =>
      document.querySelector(".squad-card")?.getAttribute("data-ready") ===
      "true",
  );
  await page.screenshot({ path: ".artifacts/v4/skill-ready.png" });
  await page.keyboard.down("a");
  try {
    await page.locator(".leash-warning").waitFor();
    await page.screenshot({ path: ".artifacts/v4/leash-warning.png" });
    await waitSave(
      page,
      (s) =>
        s.encounter === null &&
        s.receipts.includes("encounter-" + entry.encounter.seed),
      "leaving arena must reset",
    );
  } finally {
    await page.keyboard.up("a");
  }
  await page.waitForFunction(() =>
    document.querySelector("#toast")?.textContent.includes("重置"),
  );
  assert.equal(await page.locator(".result-screen").count(), 0);
  assert.deepEqual((await record(page)).cleared, []);
  await page.keyboard.down("d");
  try {
    await waitSave(
      page,
      (s) => !!s.encounter && s.encounter.seed !== entry.encounter.seed,
      "reapproach must start fresh encounter",
    );
  } finally {
    await page.keyboard.up("d");
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS refinement: automatic single-wave planet contact, skill-ready glow/cooldown/re-ready, warning/reset/re-entry without teleport or rewards",
  );
} finally {
  await browser.close();
  await server.close();
}
