import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { chromium } from "../node_modules/playwright/index.mjs";
import { serveBuilt } from "./serve-built.mjs";
import { newSave, stats } from "../../src/domain/model.ts";
import { apply } from "../../src/domain/economy.ts";
const pack = JSON.parse(
  await readFile("content/generated/runtime.json", "utf8"),
);
const out = process.env.SUITE_OUTPUT ?? ".artifacts/ui-suite";
await mkdir(out, { recursive: true });
const server = await serveBuilt(),
  browser = await chromium.launch({ args: ["--no-sandbox"] });
const results = [],
  errors = [],
  layoutFailures = [];
const wanted = (key) =>
  !process.env.SUITE_CASES || process.env.SUITE_CASES.split(",").includes(key);
async function seed(page, p, s) {
  await page.goto(server.url + "gallery.html");
  await page.waitForSelector(".art-gallery");
  await page.evaluate(
    async ({ p, s }) => {
      const r = indexedDB.open("stella-maiden-m1", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("records");
      await new Promise((a) => (r.onsuccess = a));
      const tx = r.result.transaction("records", "readwrite");
      tx.objectStore("records").put(p, "content:test");
      tx.objectStore("records").put(s, "save:test");
      tx.objectStore("records").put(
        { marker: "ui-suite-main-untouched" },
        "save:main",
      );
      await new Promise((a) => (tx.oncomplete = a));
      r.result.close();
    },
    { p, s },
  );
  await page.goto(server.url + "#/test");
  await page.waitForSelector("canvas", { timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState("networkidle");
}
function save(p) {
  const s = newSave(p, Date.now(), "ui-suite");
  s.storySeen = p.quests.map((q) => q.id);
  s.story.completed = ["chronicle:quest.01"];
  s.quests = ["chronicle:quest.01"];
  s.wallet = Object.fromEntries(p.resources.map((r) => [r.id, 50000]));
  s.roster = [
    "m1:earth",
    "m1:mercury",
    "m1:venus",
    "solar10:character.pluto",
    "solar10:character.jupiter",
    "m1:uranus",
    "m1:earth",
    "m1:moon",
  ].map((id, i) => {
    const o = {
      id: "suite-" + i,
      definition: id,
      level: i === 6 ? 1 : 20,
      hp: 1,
      resonance: 0,
    };
    o.hp = stats(p, o).hp;
    return o;
  });
  s.team = s.roster.slice(0, 6).map((o) => o.id);
  const planet = p.planets.find(
    (v) => v.kind === "planet" && v.region === s.region,
  );
  s.cleared = [planet.id];
  s.discovered = [planet.id];
  s.colonies[planet.id] = {
    active: true,
    lost: false,
    buildings: {},
    assigned: "suite-7",
    raidRemaining: 0,
  };
  return s;
}
async function capture(page, name, key) {
  if (!wanted(key)) return;
  await page.evaluate(async () => {
    await document.fonts.ready;
    for (const el of document.querySelectorAll(".modal,.story-scene"))
      await Promise.all(
        el
          .getAnimations()
          .filter((a) =>
            Number.isFinite(a.effect?.getComputedTiming().iterations),
          )
          .map((a) => a.finished.catch(() => {})),
      );
  });
  const diag = await page.evaluate(() => {
    const modal = document.querySelector(".modal"),
      story = document.querySelector(".story-scene");
    const visible = (el) => !!el.getClientRects().length;
    const scope = modal ?? story ?? document.querySelector(".bridge");
    const rect = (el) => el.getBoundingClientRect().toJSON();
    const clips = [
      ...scope.querySelectorAll(
        "h1,h2,h3,h4,p,.character-info > small,.profile-copy > small,.eyebrow,.quest-state,.resonance-disclosure",
      ),
    ]
      .filter(visible)
      .filter((el) => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 2)
      .map((el) => ({
        text: el.textContent.slice(0, 100),
        class: el.className,
        width: el.clientWidth,
        scroll: el.scrollWidth,
      }));
    const buttons = [...scope.querySelectorAll("button")]
      .filter(visible)
      .filter(
        (el) =>
          !el.closest(".portrait-button") && !el.matches(".portrait-button"),
      );
    const badButtons = buttons
      .filter((el) => rect(el).width < 42 || rect(el).height < 42)
      .map((el) => ({ text: el.textContent, rect: rect(el) }));
    const canvas = document.querySelector("#space"),
      tools = document.querySelector("#battle-tools"),
      target = document.querySelector("#target-hud");
    return {
      width: innerWidth,
      height: innerHeight,
      scroll: document.documentElement.scrollWidth,
      modal: modal ? rect(modal) : null,
      clips,
      badButtons,
      unskinned: buttons
        .filter((el) => {
          const cs = getComputedStyle(el);
          return (
            cs.borderImageSource !== "none" ||
            /activation|frame-steel|frame-/.test(cs.backgroundImage)
          );
        })
        .map((el) => el.textContent),
      fontLoaded: document.fonts.check('14px "Galaxy TC"', "星體共鳴"),
      canvas: canvas ? rect(canvas) : null,
      tools: tools ? rect(tools) : null,
      target: target && !target.hidden ? rect(target) : null,
      story: story
        ? Object.fromEntries(
            [
              ".story-chapter",
              ".story-line",
              ".story-box",
              ".story-controls",
            ].map((sel) => [sel, rect(story.querySelector(sel))]),
          )
        : null,
    };
  });
  await page.screenshot({
    path: `${out}/${name}-${key}.png`,
    animations: "disabled",
  });
  const row = { viewport: name, key, diagnostics: diag, physicalDevice: false };
  results.push(row);
  await writeFile(
    `${out}/browser.json`,
    JSON.stringify({ results, errors, layoutFailures }, null, 2),
  );
  try {
    assert.ok(
      diag.scroll <= diag.width + 1,
      "page horizontal overflow: " + key,
    );
    assert.deepEqual(diag.clips, [], "text overflows its box: " + key);
    assert.deepEqual(diag.badButtons, [], "small touch targets: " + key);
    assert.ok(diag.fontLoaded, "TC web font ready");
    assert.deepEqual(
      diag.unskinned,
      [],
      "controls use current black/gold skin without retired ornate textures",
    );
    if (diag.modal) {
      assert.ok(
        diag.modal.left >= -1 && diag.modal.right <= diag.width + 1,
        "modal width",
      );
      assert.ok(
        diag.modal.top >= -1 && diag.modal.bottom <= diag.height + 1,
        "modal height",
      );
    }
    if (diag.story) {
      assert.ok(
        diag.story[".story-line"].bottom <=
          diag.story[".story-controls"].top + 1,
        "dialogue clear of actions",
      );
      assert.ok(
        diag.story[".story-controls"].bottom <= diag.height + 1,
        "story actions visible",
      );
    }
    if (key === "combat" && diag.width < 800) {
      assert.ok(
        diag.canvas.bottom <= diag.tools.top + 1,
        "controls outside camera",
      );
      assert.ok(
        diag.target.bottom <= diag.canvas.top + 1,
        "target outside camera",
      );
    }
  } catch (e) {
    layoutFailures.push({ viewport: name, key, message: e.message });
  }
  console.log(
    layoutFailures.some((f) => f.viewport === name && f.key === key)
      ? "LAYOUT ISSUE"
      : "PASS suite",
    name,
    key,
  );
}
async function close(page) {
  await page.locator('#overlay [data-action="close"]').click();
}
async function open(page, id) {
  if (id === "formation") {
    await open(page, "roster");
    await page
      .locator('.modal [data-action="panel"][data-id="formation"]')
      .click();
  } else if (id === "guide") {
    await open(page, "archive");
    await page.locator('.modal [data-action="panel"][data-id="guide"]').click();
  } else {
    const loc = page
      .locator(`[data-action="panel"][data-id="${id}"]`)
      .filter({ visible: true });
    await loc.first().click();
  }
  await page.locator(`.modal[data-panel="${id}"]`).waitFor();
}
try {
  for (const [name, width, height] of [
    ["desktop", 1440, 1000],
    ["mobile", 390, 844],
    ["narrow", 320, 568],
    ["landscape", 844, 390],
  ]) {
    if (
      process.env.SUITE_SIZES &&
      !process.env.SUITE_SIZES.split(",").includes(name)
    )
      continue;
    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: width < 500 ? 2 : 1,
      hasTouch: width < 900,
      isMobile: width < 500,
    });
    const page = await context.newPage();
    page.setDefaultTimeout(25000);
    page.on("pageerror", (e) => errors.push(e.message));
    await page.clock.setFixedTime(Date.now());
    const p = structuredClone(pack);
    p.regions.forEach((r) => (r.patrols = []));
    let s = save(p);
    await seed(page, p, s);
    await capture(page, name, "bridge");
    for (const id of [
      "quests",
      "roster",
      "formation",
      "research",
      "planets",
      "challenges",
      "regions",
      "archive",
      "guide",
      "summon",
    ]) {
      if (!wanted(id) && !["quests", "roster", "planets"].includes(id))
        continue;
      await open(page, id);
      await capture(page, name, id);
      if (id === "quests") {
        if (wanted("daily")) {
          await page
            .locator('[data-action="journal-tab"][data-id="daily"]')
            .click();
          await capture(page, name, "daily");
        }
        if (wanted("voyage")) {
          await page
            .locator('[data-action="journal-tab"][data-id="voyage"]')
            .click();
          await capture(page, name, "voyage");
        }
      }
      if (
        id === "roster" &&
        (wanted("character") || wanted("feed") || wanted("confirmation"))
      ) {
        await page
          .locator('.modal [data-action="character"][data-id="suite-0"]')
          .first()
          .click();
        await capture(page, name, "character");
        if (wanted("feed") || wanted("confirmation")) {
          await page.locator('[data-action="open-feed"]').click();
          await capture(page, name, "feed");
          if (wanted("confirmation")) {
            await page.locator(".feed-copy").first().click();
            await page.locator(".game-confirm").waitFor();
            await page.screenshot({
              path: `${out}/${name}-confirmation.png`,
              animations: "disabled",
            });
            await page.locator('[data-answer="no"]').click();
            results.push({
              viewport: name,
              key: "confirmation",
              cancelled: true,
            });
          }
        }
      }
      if (id === "planets" && wanted("colony")) {
        await page.locator('[data-action="manage-planet"]').first().click();
        await capture(page, name, "colony");
      }
      await close(page);
    }
    if (wanted("intel") || wanted("enemy-intel")) {
      await seed(page, p, s);
      await page.locator('#battle-tools [data-action="view"]').click();
      await page.locator(".planet-card:not([hidden])").waitFor();
      await capture(page, name, "intel");
      if (wanted("enemy-intel")) {
        await page.locator('.planet-card [data-id="enemy-intel"]').click();
        await capture(page, name, "enemy-intel");
        await close(page);
      }
    }
    if (wanted("old-story")) {
      const os = save(p);
      os.storySeen = p.quests
        .filter((q) => q.id !== "m1:awakening")
        .map((q) => q.id);
      await seed(page, p, os);
      await page.locator('[data-action="story-next"]').waitFor();
      await page.locator(".story-scene > img").evaluate((i) => i.decode());
      await capture(page, name, "old-story");
    }
    if (wanted("acquisition")) {
      const a = save(p);
      a.acquisitionQueue = ["suite-0"];
      await seed(page, p, a);
      await page.locator('.modal[data-panel="acquisition"]').waitFor();
      await capture(page, name, "acquisition");
    }
    if (wanted("story") || wanted("story-long")) {
      const q = p.quests.find((q) => q.id === "chronicle:quest.02");
      let ss = save(p);
      ss.storySeen = p.quests.filter((q) => !q.story).map((q) => q.id);
      ss.storySeen.push("chronicle:quest.01");
      let started = apply(
        p,
        ss,
        { type: "story-start", id: q.id },
        Date.now(),
        "suite-story",
      );
      const cursor = q.story.steps.findIndex(
        (t) => t.kind === "say" && t.actor,
      );
      started.story.session.cursor = cursor;
      await seed(page, p, started);
      await page
        .locator(".story-actor img")
        .first()
        .evaluate((i) => i.decode());
      await capture(page, name, "story");
      if (wanted("story-long")) {
        const lp = structuredClone(p);
        lp.quests.find((t) => t.id === q.id).story.steps[cursor].text =
          "星海航行的紀錄，請保持通訊暢通。".repeat(150);
        let l = apply(
          lp,
          ss,
          { type: "story-start", id: q.id },
          Date.now(),
          "suite-long",
        );
        l.story.session.cursor = cursor;
        await seed(page, lp, l);
        await page.waitForFunction(
          () =>
            document.querySelector(".story-line")?.textContent.length > 1000,
        );
        await capture(page, name, "story-long");
        const lg = await page.locator(".story-line").evaluate((el) => ({
          scroll: el.scrollHeight,
          height: el.clientHeight,
        }));
        assert.ok(lg.scroll > lg.height, "long text can scroll");
      }
    }
    if (wanted("combat") || wanted("skills")) {
      const cp = structuredClone(p);
      for (const e of cp.enemies) {
        e.hp = 100000;
        e.attack = 1;
      }
      const target = cp.planets[0];
      target.enemies = [{ enemy: cp.enemies[0].id, count: 1, level: 1 }];
      const cs = save(cp);
      cs.encounter = { planet: target.id, seed: 42 };
      cs.cleared = [];
      cs.x = target.x - 220;
      cs.y = target.y;
      await seed(page, cp, cs);
      await page.locator(".target-hud:not([hidden])").waitFor();
      await capture(page, name, "combat");
      if (wanted("skills")) {
        await page.locator('#battle-tools [data-id="skills"]').click();
        await capture(page, name, "skills");
      }
    }
    if (wanted("result")) {
      const rp = structuredClone(p);
      for (const e of rp.enemies) {
        e.hp = 1;
        e.attack = 1;
      }
      const target = rp.planets[0];
      target.enemies = [{ enemy: rp.enemies[0].id, count: 1, level: 1 }];
      const rs = save(rp);
      rs.encounter = { planet: target.id, seed: 42 };
      rs.cleared = [];
      rs.x = target.x - 220;
      rs.y = target.y;
      await seed(page, rp, rs);
      await page
        .locator('.modal[data-panel="result"]')
        .waitFor({ timeout: 30000 });
      await capture(page, name, "result");
    }
    await context.close();
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(layoutFailures, []);
  await writeFile(
    `${out}/browser.json`,
    JSON.stringify({ results, errors, layoutFailures }, null, 2) + "\n",
  );
} finally {
  await browser.close();
  await server.close();
}
