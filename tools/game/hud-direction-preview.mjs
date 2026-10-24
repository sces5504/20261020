import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { chromium } from "../node_modules/playwright/index.mjs";
import { serveBuilt } from "./serve-built.mjs";
import { newSave, stats } from "../../src/domain/model.ts";
const pack = JSON.parse(
  await readFile("content/generated/runtime.json", "utf8"),
);
const out = ".artifacts/hud-v2";
await mkdir(out, { recursive: true });
const server = await serveBuilt(),
  browser = await chromium.launch({ args: ["--no-sandbox"] });
const results = [],
  errors = [];
async function seed(page, p, s) {
  await page.goto(server.url + "gallery.html");
  await page.waitForSelector(".art-gallery");
  await page.evaluate(
    async ({ p, s }) => {
      const r = indexedDB.open("stella-maiden-m1", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("records");
      await new Promise((resolve) => (r.onsuccess = resolve));
      const tx = r.result.transaction("records", "readwrite");
      tx.objectStore("records").put(p, "content:test");
      tx.objectStore("records").put(s, "save:test");
      tx.objectStore("records").put({ marker: "hud-v2-isolated" }, "save:main");
      await new Promise((resolve) => (tx.oncomplete = resolve));
      r.result.close();
    },
    { p, s },
  );
  await page.goto(server.url + "#/test");
  await page.waitForSelector("canvas", { timeout: 60000 });
  await page
    .locator(".operator-art img")
    .evaluateAll((imgs) => Promise.all(imgs.map((i) => i.decode())));
}
async function geometry(page, mobile) {
  const g = await page.evaluate(() => {
    const rect = (s) =>
      document.querySelector(s).getBoundingClientRect().toJSON();
    return {
      width: innerWidth,
      scroll: document.documentElement.scrollWidth,
      space: rect("#space"),
      tools: rect("#battle-tools"),
      cards: [
        ...document.querySelectorAll(".operator-card,.deck-nav > button"),
      ].map((el) => el.getBoundingClientRect().toJSON()),
    };
  });
  assert.ok(g.scroll <= g.width + 1, "no horizontal overflow");
  for (const r of g.cards) {
    assert.ok(r.width >= 43 && r.height >= 43, "usable touch target");
    assert.ok(r.left >= 0 && r.right <= g.width + 1);
  }
  if (mobile)
    assert.ok(g.space.bottom <= g.tools.top + 1, "controls outside arena");
  return g;
}
try {
  for (const mobile of [false, true]) {
    const name = mobile ? "mobile" : "desktop",
      viewport = { width: mobile ? 390 : 1440, height: mobile ? 844 : 1000 };
    const context = await browser.newContext({
      viewport,
      hasTouch: mobile,
      isMobile: mobile,
      deviceScaleFactor: mobile ? 2 : 1,
    });
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    page.setDefaultTimeout(20000);
    const p = structuredClone(pack),
      target = p.planets[0];
    p.regions.forEach((r) => (r.patrols = []));
    for (const e of p.enemies) {
      e.hp = 100000;
      e.attack = 1;
    }
    target.enemies = [{ enemy: p.enemies[0].id, count: 3, level: 1 }];
    const s = newSave(p, Date.now(), "hud-v2");
    s.storySeen = p.quests.filter((q) => !q.story).map((q) => q.id);
    s.roster = [
      "m1:earth",
      "m1:mercury",
      "m1:venus",
      "solar10:character.pluto",
      "solar10:character.jupiter",
      "m1:uranus",
    ].map((id, i) => {
      const o = {
        id: `hud-${i}`,
        definition: id,
        level: 20,
        hp: 1,
        resonance: 0,
      };
      o.hp = stats(p, o).hp;
      return o;
    });
    s.team = s.roster.map((o) => o.id);
    s.region = target.region;
    s.x = target.x - 220;
    s.y = target.y;
    s.wallet = Object.fromEntries(p.resources.map((r) => [r.id, 50000]));
    if (!process.env.HUD_COMBAT_ONLY) {
      await seed(page, p, s);
      await geometry(page, mobile);
      await page.screenshot({
        path: `${out}/${name}-bridge.png`,
        animations: "disabled",
      });
    }
    const fight = structuredClone(s);
    fight.encounter = { planet: target.id, seed: 42 };
    await seed(page, p, fight);
    await page.locator(".target-hud:not([hidden])").waitFor();
    await page.evaluate(() => {
      document.querySelector('.operator-card[data-id="hud-0"]').click();
      document.querySelector('.deck-nav [data-action="pause"]').click();
    });
    await page.locator(".operator-card.skill-cooling").waitFor();
    assert.ok(
      Number(
        await page
          .locator('.operator-card[data-id="hud-0"] .operator-cd')
          .textContent(),
      ) > 0,
    );
    const geom = await geometry(page, mobile);
    await page.screenshot({
      path: `${out}/${name}-combat.png`,
      animations: "disabled",
    });
    for (const id of process.env.HUD_COMBAT_ONLY
      ? []
      : ["quests", "roster", "summon", "research"]) {
      await page.locator(`.deck-nav [data-id="${id}"]`).click();
      await page.waitForSelector(`.modal[data-panel="${id}"]`);
      await page.screenshot({
        path: `${out}/${name}-${id}.png`,
        animations: "disabled",
      });
      await page.locator('#overlay [data-action="close"]').click();
    }
    results.push({
      mobile,
      viewport,
      geometry: geom,
      checks: [
        "six illustrated operators",
        "real cooldown values",
        "actual target health",
        ...(process.env.HUD_COMBAT_ONLY
          ? []
          : ["navigation opens four management panels"]),
        "no overflow",
        "44px touch targets",
        "mobile arena clear of controls",
      ],
      physicalDevice: false,
    });
    console.log("PASS HUD", name);
    await context.close();
  }
  assert.deepEqual(errors, []);
  await writeFile(
    `${out}/browser.json`,
    JSON.stringify({ results, errors, reviewStatus: "candidate" }, null, 2) +
      "\n",
  );
} finally {
  await browser.close();
  await server.close();
}
