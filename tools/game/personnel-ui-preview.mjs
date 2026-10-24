import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { chromium } from "../node_modules/playwright/index.mjs";
import { serveBuilt } from "./serve-built.mjs";
import { newSave, stats } from "../../src/domain/model.ts";
const pack = JSON.parse(
  await readFile("content/generated/runtime.json", "utf8"),
);
const out = ".artifacts/personnel-dossier";
await mkdir(out, { recursive: true });
const server = await serveBuilt(),
  browser = await chromium.launch({ args: ["--no-sandbox"] });
const results = [],
  errors = [];
async function record(page, key = "save:test") {
  return page.evaluate(
    (key) =>
      new Promise((resolve) => {
        const r = indexedDB.open("stella-maiden-m1", 1);
        r.onsuccess = () => {
          const tx = r.result.transaction("records"),
            q = tx.objectStore("records").get(key);
          q.onsuccess = () => resolve(q.result);
          tx.oncomplete = () => r.result.close();
        };
      }),
    key,
  );
}
async function ready(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    for (const el of document.querySelectorAll(".modal"))
      await Promise.all(
        el
          .getAnimations()
          .filter((a) =>
            Number.isFinite(a.effect?.getComputedTiming().iterations),
          )
          .map((a) => a.finished.catch(() => {})),
      );
    const imgs = [...document.querySelectorAll(".modal img")].filter((i) => {
      const r = i.getBoundingClientRect();
      return r.top < innerHeight && r.bottom > 0;
    });
    await Promise.all(imgs.map((i) => i.decode()));
  });
}
async function shot(page, name, key) {
  await ready(page);
  const g = await page.evaluate(() => {
    const m = document.querySelector(".modal"),
      r = (el) => el.getBoundingClientRect().toJSON();
    return {
      width: innerWidth,
      height: innerHeight,
      scroll: document.documentElement.scrollWidth,
      modal: r(m),
      cards: [...m.querySelectorAll(".personnel-card")].map(r),
      badText: [
        ...m.querySelectorAll("h2,h3,p,.eyebrow,.personnel-card-copy strong"),
      ]
        .filter((e) => e.clientWidth && e.scrollWidth > e.clientWidth + 2)
        .map((e) => e.textContent),
      smallButtons: [...m.querySelectorAll("button")]
        .filter((e) => e.getClientRects().length)
        .filter((e) => r(e).width < 43 || r(e).height < 43)
        .map((e) => ({ text: e.textContent, rect: r(e) })),
    };
  });
  await page.screenshot({
    path: `${out}/${name}-${key}.png`,
    animations: "disabled",
  });
  assert.ok(g.scroll <= g.width + 1);
  assert.deepEqual(g.badText, []);
  assert.deepEqual(g.smallButtons, []);
  assert.ok(g.modal.top >= -1 && g.modal.bottom <= g.height + 1);
  results.push({ name, key, geometry: g, physicalDevice: false });
  await writeFile(
    `${out}/browser.json`,
    JSON.stringify({ results, errors }, null, 2) + "\n",
  );
}
try {
  for (const [name, width, height] of [
    ["desktop", 1440, 1000],
    ["mobile", 390, 844],
    ["narrow", 320, 568],
  ]) {
    const ctx = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: width < 500 ? 2 : 1,
      hasTouch: width < 500,
      isMobile: width < 500,
    });
    const page = await ctx.newPage();
    page.setDefaultTimeout(25000);
    page.on("pageerror", (e) => errors.push(e.message));
    await page.clock.setFixedTime(Date.now());
    const p = structuredClone(pack);
    p.regions.forEach((r) => (r.patrols = []));
    const s = newSave(p, Date.now(), "personnel-dossier");
    s.storySeen = p.quests.map((q) => q.id);
    s.story.completed = ["chronicle:quest.01"];
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
        id: `dossier-${i}`,
        definition: id,
        level: i === 6 ? 1 : 20,
        hp: 1,
        resonance: 0,
      };
      o.hp = stats(p, o).hp;
      return o;
    });
    s.team = s.roster.slice(0, 3).map((o) => o.id);
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
          { marker: "personnel-main-untouched" },
          "save:main",
        );
        await new Promise((a) => (tx.oncomplete = a));
        r.result.close();
      },
      { p, s },
    );
    await page.goto(server.url + "#/test");
    await page.waitForSelector("canvas", { timeout: 60000 });
    await page.locator('.deck-nav [data-id="roster"]').click();
    await shot(page, name, "roster");
    assert.equal(
      await page.locator(".personnel-card").count(),
      7,
      "one card per character, duplicate retained",
    );
    await page.locator('[data-action="roster-tab"][data-id="all"]').click();
    assert.equal(
      await page.locator(".personnel-card").count(),
      p.characters.filter((c) => c.status === "active").length,
    );
    await page.locator("#roster-query").fill("地球");
    assert.equal(await page.locator(".personnel-card").count(), 1);
    await page.locator("#roster-query").fill("");
    await page
      .locator('[data-action="roster-category"][data-id="防護"]')
      .click();
    assert.ok((await page.locator(".personnel-card").count()) > 0);
    await page.locator('[data-action="roster-category"][data-id=""]').click();
    await page.locator(".personnel-card.is-locked").first().click();
    await page.locator('.modal[data-panel="dossier"]').waitFor();
    assert.equal(
      await page.locator('.dossier-actions [data-action="level"]').count(),
      0,
      "unowned is read-only",
    );
    await shot(page, name, "unowned");
    await page.locator(".dossier-back").click();
    await page.locator('[data-action="roster-tab"][data-id="owned"]').click();
    await page.locator('.personnel-card[data-id="dossier-0"]').click();
    await shot(page, name, "profile");
    await page.locator('.dossier-tabs [data-id="skill"]').click();
    assert.match(await page.locator(".dossier-skill").innerText(), /偏折/);
    await shot(page, name, "skill");
    await page.locator('.dossier-tabs [data-id="source"]').click();
    assert.ok((await page.locator(".dossier-source").innerText()).length > 10);
    await page.locator('.dossier-tabs [data-id="stats"]').click();
    await page.locator(".profile-instance-picker summary").click();
    assert.equal(await page.locator(".copy-picker button").count(), 2);
    await page.locator(".copy-picker button").last().click();
    assert.equal(
      await page
        .locator('.dossier-actions [data-action="team"]')
        .getAttribute("data-id"),
      "dossier-6",
    );
    await page.locator('.dossier-actions [data-action="team"]').click();
    await page.waitForFunction(
      () =>
        document.querySelector('.dossier-actions [data-action="team"]')
          ?.textContent === "移出編隊",
    );
    assert.ok((await record(page)).team.includes("dossier-6"));
    await page.locator('.dossier-actions [data-action="team"]').click();
    await page.waitForFunction(
      () =>
        document.querySelector('.dossier-actions [data-action="team"]')
          ?.textContent === "加入編隊",
    );
    await page.locator(".profile-instance-picker summary").click();
    await page.locator(".copy-picker button").first().click();
    const before = await record(page);
    await page.locator('.dossier-actions [data-action="level"]').click();
    await page.waitForFunction(
      () =>
        document.querySelector(".dossier-level")?.textContent === "LEVEL 21",
    );
    const after = await record(page);
    assert.equal(
      after.roster.find((o) => o.id === "dossier-0").level,
      before.roster.find((o) => o.id === "dossier-0").level + 1,
    );
    await page.locator('.dossier-actions [data-action="open-feed"]').click();
    assert.equal(await page.locator(".feed-copy").count(), 1);
    await page.locator(".feed-copy").click();
    await page.locator('[data-answer="no"]').click();
    assert.equal(
      (await record(page)).roster.length,
      8,
      "cancel consumes no duplicate",
    );
    assert.equal(
      (await record(page, "save:main")).marker,
      "personnel-main-untouched",
    );
    results.push({
      name,
      key: "interaction-checks",
      checks: [
        "owned/all counts and one card per definition",
        "search",
        "skill-category filter",
        "unowned read-only",
        "skill/source tabs",
        "duplicate instance selection",
        "real team add/remove",
        "real level upgrade",
        "manual resonance cancel without consumption",
        "production save sentinel unchanged",
      ],
    });
    await writeFile(
      `${out}/browser.json`,
      JSON.stringify({ results, errors }, null, 2) + "\n",
    );
    console.log("PASS personnel/dossier", name);
    await ctx.close();
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
  await server.close();
}
