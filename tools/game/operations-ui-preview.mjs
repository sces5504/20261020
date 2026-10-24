import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { chromium } from "../node_modules/playwright/index.mjs";
import { serveBuilt } from "./serve-built.mjs";
import { checkSave } from "../../src/platform/storage.ts";
import { newSave, stats } from "../../src/domain/model.ts";
const pack = JSON.parse(
  await readFile("content/generated/runtime.json", "utf8"),
);
const out = ".artifacts/ui-operations-actions";
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
  for (const [name, width, height] of [["mobile", 390, 844]]) {
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
    const world = p.planets.find(
      (v) => v.kind === "planet" && v.region === s.region,
    );
    s.cleared = [world.id];
    s.discovered = [world.id];
    s.colonies[world.id] = {
      active: true,
      lost: false,
      buildings: {},
      assigned: "",
      raidRemaining: 0,
    };
    checkSave(s, p);
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

    async function open(id) {
      if (await page.locator(".modal").count())
        await page.locator('.modal-heading [data-action="close"]').click();
      if (id === "formation") {
        await page.locator('.deck-nav [data-id="roster"]').click();
        await page.locator('.personnel-toolbar [data-id="formation"]').click();
      } else
        await page
          .locator(`[data-action="panel"][data-id="${id}"]`)
          .filter({ visible: true })
          .first()
          .click();
    }
    await open("formation");
    await page
      .locator('[data-action="team-back"][data-id="dossier-0"]')
      .click();
    await page.waitForFunction(
      () =>
        document
          .querySelector('.formation-slot [data-action="character"]')
          ?.getAttribute("data-id") === "dossier-1",
    );
    assert.deepEqual((await record(page)).team, [
      "dossier-1",
      "dossier-0",
      "dossier-2",
    ]);
    await page
      .locator('[data-action="team-forward"][data-id="dossier-0"]')
      .click();
    await page.waitForFunction(
      () =>
        document
          .querySelector('.formation-slot [data-action="character"]')
          ?.getAttribute("data-id") === "dossier-0",
    );
    await page.locator('.remove-member[data-id="dossier-2"]').click();
    await page.waitForFunction(
      () => document.querySelectorAll(".formation-slot").length === 2,
    );
    await page
      .locator('.reserve-card [data-action="team"][data-id="dossier-2"]')
      .click();
    await page.waitForFunction(
      () => document.querySelectorAll(".formation-slot").length === 3,
    );
    assert.deepEqual((await record(page)).team, [
      "dossier-0",
      "dossier-1",
      "dossier-2",
    ]);
    await shot(page, name, "formation-vacancies");
    await open("research");
    const research = p.research.find((r) => r.requires.length === 0);
    const before = await record(page);
    await page
      .locator(`[data-action="research"][data-id="${research.id}"]`)
      .click();
    await page.waitForSelector(".research-node.is-working");
    const started = await record(page);
    assert.ok(
      started.jobs.some(
        (j) => j.kind === "research" && j.definition === research.id,
      ),
    );
    for (const [id, n] of Object.entries(research.cost))
      assert.equal(started.wallet[id], before.wallet[id] - n);
    await shot(page, name, "research-working");
    await open("planets");
    await page.locator('[data-action="manage-planet"]').first().click();
    const building = p.buildings[0];
    await page
      .locator(`[data-action="build"][data-id="${building.id}"]`)
      .click();
    await page.waitForFunction(() =>
      [...document.querySelectorAll(".facility-row button")].some(
        (b) => b.textContent === "建設中",
      ),
    );
    assert.ok(
      (await record(page)).jobs.some(
        (j) =>
          j.kind === "build" &&
          j.owner === world.id &&
          j.definition === building.id,
      ),
    );
    await page.locator('[data-action="assign"][data-id="dossier-7"]').click();
    await page.waitForFunction(
      () =>
        document.querySelector('[data-action="assign"][data-id="dossier-7"]')
          ?.textContent === "撤回",
    );
    assert.equal((await record(page)).colonies[world.id].assigned, "dossier-7");
    await shot(page, name, "colony-working");
    await page.locator('[data-action="assign"][data-id="dossier-7"]').click();
    await page.waitForFunction(
      () =>
        document.querySelector('[data-action="assign"][data-id="dossier-7"]')
          ?.textContent === "派駐",
    );
    assert.equal((await record(page)).colonies[world.id].assigned, "");
    await open("archive");
    for (const action of ["sound", "effects", "auto"]) {
      const b = page.locator(`.settings-page [data-action="${action}"]`);
      const label = await b.innerText();
      await b.click();
      assert.notEqual(await b.innerText(), label);
    }
    assert.equal(
      (await record(page, "save:main")).marker,
      "personnel-main-untouched",
    );
    results.push({
      name,
      key: "actual-operations",
      checks: [
        "reorder forward/back",
        "remove and restore member",
        "research creates job and deducts actual recipe",
        "building creates job",
        "station and withdraw",
        "settings toggles",
        "production save isolated",
      ],
    });
    await writeFile(
      `${out}/browser.json`,
      JSON.stringify({ results, errors }, null, 2) + "\n",
    );
    await ctx.close();
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
  await server.close();
}
