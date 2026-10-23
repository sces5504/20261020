import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { chromium } from "../node_modules/playwright/index.mjs";
import { serveBuilt } from "../game/serve-built.mjs";
import { newSave, stats, addCharacter } from "../../src/domain/model.ts";
const pack = JSON.parse(
  await readFile("content/generated/runtime.json", "utf8"),
);
const server = await serveBuilt(),
  browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
await mkdir(".artifacts/world", { recursive: true });
async function save(page) {
  return page.evaluate(
    () =>
      new Promise((resolve) => {
        const r = indexedDB.open("stella-maiden-m1", 1);
        r.onsuccess = () => {
          const tx = r.result.transaction("records"),
            q = tx.objectStore("records").get("save:test");
          q.onsuccess = () => resolve(q.result);
        };
      }),
  );
}
async function install(page, p, s) {
  await page.goto(server.url + "#/art");
  await page.waitForSelector(".art-gallery", { timeout: 60000 });
  await page.evaluate(
    async ({ p, s }) => {
      localStorage.setItem("stella:view", "map");
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
  try {
    await page.waitForSelector("canvas", { timeout: 60000 });
  } catch (e) {
    await page.screenshot({
      path: ".artifacts/world/load-failure.png",
      fullPage: true,
    });
    throw Error(
      "World load failed: " + (await page.locator("body").innerText()),
    );
  }
  await page.waitForTimeout(500);
}
async function waitSave(page, predicate) {
  for (let i = 0; i < 100; i++) {
    const s = await save(page);
    if (s && predicate(s)) return s;
    await page.waitForTimeout(100);
  }
  throw Error("Save predicate timed out");
}
function fixture(id) {
  const p = structuredClone(pack),
    v = p.planets.find((v) => v.id === id);
  p.planets = [v, ...p.planets.filter((x) => x.id !== id)];
  const s = newSave(p, Date.now());
  s.storySeen = p.quests.map((q) => q.id);
  s.region = v.region;
  s.x = v.x;
  s.y = v.y;
  s.discovered = p.planets
    .filter((x) => x.region === v.region)
    .map((x) => x.id);
  return { p, s, v };
}
try {
  const errors = [];
  for (const [name, viewport, touch] of [
    ["desktop", { width: 1440, height: 1000 }, false],
    ["mobile", { width: 390, height: 844 }, true],
  ]) {
    const context = await browser.newContext({
        viewport,
        hasTouch: touch,
        isMobile: touch,
        deviceScaleFactor: 1,
      }),
      page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    page.setDefaultTimeout(15000);
    let f = fixture("original:planet.2");
    await install(page, f.p, f.s);
    await page.locator('[data-action="panel"][data-id="planets"]').click();
    assert((await page.locator(".modal").innerText()).includes("Earth"));
    assert(
      !(await page.locator(".modal").innerText()).includes("Moon"),
      "locked empty Moon does not leak into territory management",
    );
    await page.locator('.modal [data-action="close"]').first().click();
    await page
      .locator('[data-action="activate"][data-id="original:planet.2"]')
      .click();
    await waitSave(page, (s) => s.colonies["original:planet.2"]?.active);
    await page.screenshot({ path: `.artifacts/world/${name}-solar.png` });
    await page
      .locator('[data-action="panel"][data-id="regions"]')
      .first()
      .click();
    assert((await page.locator(".modal").innerText()).includes("處女座"));
    assert(
      (await page.locator('[data-action="travel"]:disabled').count()) > 0,
      "actual gate prerequisites",
    );
    await page.locator('.modal [data-action="close"]').first().click();
    f = fixture("original:planet.4");
    f.s.cleared.push(f.v.id);
    f.s.wallet = {};
    for (const id of ["original:planet.2", "original:planet.3"])
      f.s.colonies[id] = {
        active: true,
        lost: false,
        buildings: {},
        assigned: "",
        raidRemaining: 240,
      };
    await install(page, f.p, f.s);
    await page.waitForSelector('#planet-card [role="status"]');
    assert((await page.locator("#planet-card").innerText()).includes("尚缺"));
    assert(
      await page.locator('#planet-card [data-action="activate"]').isDisabled(),
    );
    const camp = pack.planets.find(
      (v) => v.kind === "camp" && v.region === "original:region.virgo",
    );
    f = fixture(camp.id);
    f.s.roster.forEach((o) => (o.hp = 0));
    f.s.wallet = {};
    await install(page, f.p, f.s);
    assert(
      (await page.locator("#planet-card").innerText()).includes("免費停靠整補"),
    );
    await page.locator('[data-action="resupply"]').click();
    await waitSave(page, (s) => s.jobs.some((j) => j.kind === "heal"));
    await page.screenshot({ path: `.artifacts/world/${name}-camp.png` });
    const day = new Date(Date.now() + 540 * 60000).getUTCDay();
    f = fixture(`original:daily.${day}-1`);
    f.v.timeLimitSeconds = 5;
    for (const id of [
      "m1:mars",
      "solar10:character.pluto",
      "solar10:character.nemesis",
    ])
      addCharacter(f.p, f.s, id);
    f.s.team = f.s.roster.map((o) => o.id);
    f.s.acquisitionQueue = [];
    f.s.roster.forEach((o) => {
      o.level = 100;
      o.hp = stats(f.p, o).hp;
    });
    await install(page, f.p, f.s);
    assert.equal(await page.locator("#squad .squad-card").count(), 6);
    const lastCard = await page
      .locator("#squad .squad-card")
      .last()
      .boundingBox();
    assert(
      lastCard && lastCard.y + lastCard.height <= viewport.height,
      "all six skill cards remain inside the viewport",
    );
    const controls = await page.locator(".deck-nav").boundingBox();
    for (const card of await page.locator("#squad .squad-card").all()) {
      const box = await card.boundingBox();
      assert(box && box.width >= 100, "six-person skill cards remain readable");
      assert(
        controls &&
          box &&
          (box.x + box.width <= controls.x ||
            controls.x + controls.width <= box.x ||
            box.y + box.height <= controls.y ||
            controls.y + controls.height <= box.y),
        "skill cards never cover management controls",
      );
    }
    const arenaBox = await page.locator("#space").boundingBox();
    assert(
      arenaBox && arenaBox.height >= 200,
      "six-person HUD preserves a playable battlefield",
    );
    await page.locator('[data-action="panel"][data-id="enemy-intel"]').click();
    assert((await page.locator(".modal").innerText()).includes("扇形"));
    assert((await page.locator(".modal").innerText()).includes("生命"));
    await page.locator('.modal [data-action="close"]').first().click();
    await page.locator('[data-action="battle"]').click();
    await waitSave(page, (s) => s.encounter?.planet === f.v.id);
    await page.waitForFunction(() =>
      document.querySelector("#wave-clock")?.textContent.includes("傷害"),
    );
    await page.waitForTimeout(1200);
    await page.screenshot({
      path: `.artifacts/world/${name}-daily-warning.png`,
    });
    await page.locator('[data-action="panel"][data-id="archive"]').click();
    const before = await page.locator("#wave-clock").innerText();
    await page.waitForTimeout(500);
    assert.equal(
      await page.locator("#wave-clock").innerText(),
      before,
      "management pauses challenge",
    );
    await page.locator('.modal [data-action="close"]').first().click();
    await page.waitForSelector(".result-screen", { timeout: 15000 });
    const result = await waitSave(page, (s) => !s.encounter);
    assert.equal(result.dailyAttempts[f.v.region].count, 1);
    assert.equal(Object.keys(result.dailyClaims).length, 1);
    await page.locator('.result-screen [data-action="close"]').click();
    assert(
      (await page.locator("#planet-card").innerText()).includes(
        "本日獎勵已領取",
      ),
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      "no horizontal overflow",
    );
    await page.locator('[data-action="panel"][data-id="archive"]').click();
    await page
      .locator('[data-action="new-voyage"][data-id="original:region.solar"]')
      .click();
    await page.locator('[data-answer="yes"]').click();
    await page.waitForSelector(".story-scene");
    const restarted = await waitSave(
      page,
      (s) =>
        s.region === "original:region.solar" &&
        !s.colonies["original:planet.2"],
    );
    assert.equal(restarted.x, 5970);
    assert.equal(restarted.y, 5530);
    await context.close();
    console.log(
      name,
      "world activation, route locks, shortage, camp, timed daily, pause and claim passed",
    );
  }
  const page = await browser.newPage({
    viewport: { width: 1280, height: 1800 },
  });
  for (const group of ["enemy", "planet"]) {
    const media = JSON.parse(
      await readFile("art/world/original-world/media.json", "utf8"),
    ).filter((v) => v.id.includes(`.${group}-`));
    await page.setContent(
      `<style>body{background:#091124;color:#bfe5ef;font:12px sans-serif;margin:12px}.grid{display:grid;grid-template-columns:repeat(8,1fr);gap:8px}article{background:#101c2d;text-align:center;min-width:0}img{width:130px;height:130px;object-fit:contain}p{margin:4px;overflow-wrap:anywhere}</style><div class=grid>${media.map((m) => `<article><img src="${server.url + m.runtime}"><p>${m.id}<br>${pack.assets.find((a) => a.id === m.id).name}</p></article>`).join("")}</div>`,
    );
    await page.waitForFunction(() =>
      Array.from(document.images).every(
        (i) => i.complete && i.naturalWidth > 0,
      ),
    );
    await page.screenshot({
      path: `.artifacts/world/${group}-preview.png`,
      fullPage: true,
    });
  }
  assert.deepEqual(errors, []);
  await writeFile(
    ".artifacts/world/browser.json",
    JSON.stringify(
      {
        viewports: ["1440x1000", "390x844"],
        errors,
        checks: [
          "activation-chain",
          "real-route-locks",
          "material-shortage",
          "free-camp-recovery",
          "six-readable-skill-cards",
          "management-controls-not-covered",
          "enemy-threat-intel",
          "native-campaign-restart-with-backup",
          "daily-entry",
          "countdown",
          "management-pause",
          "first-claim",
          "portable-art-preview",
        ],
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
  await server.close();
}
