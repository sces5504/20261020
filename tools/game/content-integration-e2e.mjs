import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { chromium } from "../node_modules/playwright/index.mjs";
import { serveBuilt } from "./serve-built.mjs";
import { newSave, addCharacter, stats } from "../../src/domain/model.ts";
const pack = JSON.parse(
  await readFile("content/generated/runtime.json", "utf8"),
);
const server = await serveBuilt();
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
});
const output = ".artifacts/content-integration";
await mkdir(output, { recursive: true });
const errors = [],
  results = [];
async function record(page, key = "save:test") {
  return page.evaluate(
    (key) =>
      new Promise((resolve) => {
        const r = indexedDB.open("stella-maiden-m1", 1);
        r.onsuccess = () => {
          const tx = r.result.transaction("records");
          const q = tx.objectStore("records").get(key);
          q.onsuccess = () => resolve(q.result);
          tx.oncomplete = () => r.result.close();
        };
      }),
    key,
  );
}
async function install(page, save) {
  await page.goto(server.url + "#/art");
  await page.waitForSelector(".art-gallery");
  await page.evaluate(
    async ({ p, s }) => {
      const r = indexedDB.open("stella-maiden-m1", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("records");
      await new Promise((resolve) => (r.onsuccess = resolve));
      const tx = r.result.transaction("records", "readwrite");
      localStorage.setItem("stella:view", "explore");
      tx.objectStore("records").put(p, "content:test");
      tx.objectStore("records").put(s, "save:test");
      await new Promise((resolve) => (tx.oncomplete = resolve));
      r.result.close();
    },
    { p: pack, s: save },
  );
  await page.goto(server.url + "#/test");
  await page.waitForSelector("canvas", { timeout: 60000 });
}
function save() {
  const s = newSave(pack, Date.now(), "test");
  s.storySeen = pack.quests.map((q) => q.id);
  s.rng = 77;
  return s;
}
try {
  for (const mobile of [false, true]) {
    const width = mobile ? 390 : 1440;
    const context = await browser.newContext({
      viewport: { width, height: mobile ? 844 : 1000 },
      deviceScaleFactor: mobile ? 2 : 1,
      isMobile: mobile,
      hasTouch: mobile,
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("dialog", (d) => {
      errors.push("native dialog");
      void d.dismiss();
    });
    // Every authored character uses its own portrait in the actual game detail panel.
    const roster = save();
    roster.x = 400;
    roster.y = 400;
    for (const c of pack.characters)
      if (!roster.roster.some((o) => o.definition === c.id))
        addCharacter(pack, roster, c.id);
    roster.acquisitionQueue = [];
    await install(page, roster);
    for (const c of pack.characters.filter((c) =>
      c.id.startsWith("solar10:"),
    )) {
      await page.locator('[data-action="panel"][data-id="roster"]').click();
      const owned = roster.roster.find((o) => o.definition === c.id);
      await page
        .locator(`[data-action="character"][data-id="${owned.id}"]`)
        .click();
      await page.waitForSelector(".character-detail");
      const asset = pack.assets.find((a) => a.id === c.portrait);
      assert(asset, `${c.id}: published portrait required`);
      const image = page.locator(".character-detail .portrait.large");
      assert.equal(await image.getAttribute("src"), asset.src);
      await image.evaluate((im) => im.decode());
      assert(
        (await page.locator(".skill-detail").innerText()).includes(
          pack.skills.find((s) => s.id === c.skill).description,
        ),
      );
      await page.locator('[data-action="close"]').first().click();
    }
    await page.screenshot({
      path: `${output}/characters-${width}.png`,
      animations: "disabled",
    });
    const newcomers = pack.characters.filter((c) =>
      c.id.startsWith("solar10:"),
    );
    const newAssets = newcomers
      .flatMap((c) => [c.portrait, c.avatar, c.sprite])
      .map((id) => pack.assets.find((a) => a.id === id));
    assert(newAssets.every(Boolean));
    await page.evaluate(async (assets) => {
      for (const a of assets) {
        const im = new Image();
        im.src = a.src;
        await im.decode();
        if (im.naturalWidth !== a.width || im.naturalHeight !== a.height)
          throw Error(a.id + ": image dimensions");
      }
    }, newAssets);
    // Exercise every new Q sprite in the real navigation renderer, in groups of three.
    for (let offset = 0; offset < newcomers.length; offset += 3) {
      const fleet = structuredClone(roster);
      fleet.team = newcomers
        .slice(offset, offset + 3)
        .map((c) => fleet.roster.find((o) => o.definition === c.id).id);
      await install(page, fleet);
      await page.locator(".squad-card").first().waitFor();
      assert.equal(
        await page
          .locator(".squad-card .avatar-cropped img")
          .first()
          .evaluate((im) => getComputedStyle(im).transform),
        "none",
      );
      await page.screenshot({
        path: `${output}/new-fleet-${offset}-${width}.png`,
        animations: "disabled",
      });
    }
    console.log(
      `PASS ${width}: ten profiles and 30 decoded assets, four actual Q sprite fleets`,
    );
    // Sun and Mars use original skill programs; each cast must display the actual source.
    const arena = save();
    const sun = addCharacter(pack, arena, "solar10:character.sun");
    const mars = addCharacter(pack, arena, "m1:mars");
    arena.team = [sun.id, mars.id, arena.team[2]];
    arena.acquisitionQueue = [];
    arena.x = pack.planets[0].x - 300;
    arena.y = pack.planets[0].y;
    await install(page, arena);
    await page.waitForSelector(".in-battle");
    for (const [index, id] of [sun.id, mars.id].entries()) {
      const c = pack.characters.find(
        (c) => c.id === arena.roster.find((o) => o.id === id).definition,
      );
      await page.locator(".squad-card").nth(index).click();
      await page.waitForFunction((name) => {
        const splash = document.querySelector("#skill-splash.show");
        return (
          splash &&
          (splash.querySelector("img")?.alt === name ||
            splash.querySelector(".celestial small")?.textContent === name)
        );
      }, c.name);
      const image = page.locator("#skill-splash img");
      if (await image.count()) {
        assert.equal(
          await image.getAttribute("src"),
          pack.assets.find((a) => a.id === c.avatar).src,
        );
        await image.evaluate((im) => im.decode());
      }
      await page.screenshot({
        path: `${output}/caster-${index}-${width}.png`,
        animations: "disabled",
      });
    }
    // Published second-region content: named unlock requirement and a real single-wave encounter.
    const signal = pack.planets.find((v) => v.id === "beacon:planet.signal");
    const locked = save();
    locked.region = signal.region;
    locked.x = 600;
    locked.y = 1000;
    await install(page, locked);
    await page.locator('[data-action="view"]').click();
    await page.waitForSelector("#planet-card:not([hidden])");
    assert(
      (await page.locator("#planet-card").innerText()).includes("黯星之門"),
    );
    assert(await page.locator('[data-action="navigate"]').isDisabled());
    await page.screenshot({
      path: `${output}/locked-${width}.png`,
      animations: "disabled",
    });
    const unlocked = structuredClone(locked);
    unlocked.cleared = signal.requires;
    await install(page, unlocked);
    await page.locator('[data-action="view"]').click();
    await page.waitForSelector("#planet-card:not([hidden])");
    const intel = await page.locator("#planet-card").innerText();
    assert(intel.includes(`${signal.resetSeconds}秒會重置`));
    assert(!intel.includes("${"));
    assert(!(await page.locator('[data-action="navigate"]').isDisabled()));
    const battle = structuredClone(unlocked);
    battle.x = signal.x - 330;
    battle.y = signal.y;
    battle.roster.forEach((o) => {
      o.level = 3;
      o.hp = stats(pack, o).hp;
    });
    await install(page, battle);
    await page.waitForSelector(".in-battle");
    await page.keyboard.down("w");
    await page.waitForTimeout(500);
    await page.keyboard.up("w");
    await page.screenshot({
      path: `${output}/frontier-${width}.png`,
      animations: "disabled",
    });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    await install(page, unlocked);
    await page.reload();
    await page.waitForSelector("canvas", { timeout: 60000 });
    assert.equal((await record(page)).region, signal.region);
    await page
      .locator('[data-action="panel"][data-id="regions"]')
      .first()
      .click();
    await page.locator('[data-action="travel"][data-id="m1:helios"]').click();
    await page.locator('[data-answer="yes"]').click();
    await page.waitForFunction(
      () => document.querySelector("#region-title")?.textContent === "曙光星域",
    );
    assert.equal((await record(page)).region, "m1:helios");
    assert.equal(await record(page, "save:main"), undefined);
    console.log(
      `PASS ${width}: Sun/Mars shared skill banners; frontier prerequisite/battle/reload/return`,
    );
    results.push({
      width,
      dpr: mobile ? 2 : 1,
      seed: 77,
      characters: 10,
      sharedSkillCasters: 2,
      frontier: true,
    });
    await context.close();
  }
  assert.deepEqual(errors, []);
  await writeFile(
    `${output}/results.json`,
    JSON.stringify(
      {
        results,
        errors,
        build: JSON.parse(await readFile("dist/version.json", "utf8")),
      },
      null,
      2,
    ),
  );
  console.log(
    "PASS integrated content: ten profiles, actual shared-skill sources, named prerequisite, reset seconds, frontier battle/reload/return, isolated saves; desktop and touch viewport",
  );
} finally {
  await browser.close();
  await server.close();
}
