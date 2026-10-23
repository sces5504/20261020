import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { chromium } from "../node_modules/playwright/index.mjs";
import { serveBuilt } from "./serve-built.mjs";
import { newSave, addCharacter } from "../../src/domain/model.ts";
import { unlockStudio } from "./studio-access.mjs";
import { apply } from "../../src/domain/economy.ts";
const pack = JSON.parse(
  await readFile("content/generated/runtime.json", "utf8"),
);
const output = ".artifacts/v8";
await mkdir(output, { recursive: true });
const server = await serveBuilt();
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
});
const errors = [],
  results = [];
async function record(page, key) {
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
try {
  for (const mobile of [false, true]) {
    const context = await browser.newContext({
      viewport: { width: mobile ? 390 : 1440, height: mobile ? 844 : 1000 },
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
    let save = newSave(pack, Date.now(), "v8");
    save.x = 400;
    save.y = 400;
    save.wallet = Object.fromEntries(pack.resources.map((r) => [r.id, 5000]));
    save.storySeen = pack.quests.map((q) => q.id);
    for (const c of pack.characters)
      if (!save.roster.some((o) => o.definition === c.id))
        addCharacter(pack, save, c.id);
    const copy = addCharacter(pack, save, save.roster[0].definition);
    const stationed = save.roster.find(
      (o) => o.definition === "story10:character.arcturus",
    );
    save.colonies[pack.planets[0].id] = {
      active: true,
      lost: false,
      assigned: stationed.id,
      buildings: {},
      raidRemaining: 0,
    };
    save.cleared = [pack.planets[0].id];
    save = apply(
      pack,
      save,
      { type: "level", owned: save.team[0] },
      Date.now(),
      "daily-level",
    );
    save.acquisitionQueue = [];
    await page.goto(server.url + "#/art");
    await page.waitForSelector(".art-gallery", { timeout: 60000 });
    await page.evaluate(
      async ({ pack, save }) => {
        const r = indexedDB.open("stella-maiden-m1", 1);
        r.onupgradeneeded = () => r.result.createObjectStore("records");
        await new Promise((resolve) => (r.onsuccess = resolve));
        const tx = r.result.transaction("records", "readwrite"),
          store = tx.objectStore("records");
        store.put(pack, "content:test");
        store.put(save, "save:test");
        store.put({ sentinel: "v8-protected" }, "save:main");
        await new Promise((resolve) => (tx.oncomplete = resolve));
        r.result.close();
        localStorage.setItem("stella:view", "explore");
      },
      { pack, save },
    );
    await page.goto(server.url + "#/test");
    await page.waitForSelector("canvas", { timeout: 60000 });
    const open = async (panel) => {
      await page
        .locator(`.deck-nav [data-action="panel"][data-id="${panel}"]`)
        .click();
    };
    const close = async () => {
      await page.locator('.modal-heading [data-action="close"]').click();
    };
    await open("roster");
    assert.equal(
      await page.locator(".character-grid > .character-card").count(),
      pack.characters.length,
    );
    assert.equal((await record(page, "save:test")).roster.length, pack.characters.length + 1);
    assert.equal(await page.locator(".collection-card.owned").count(), 0);
    await page
      .locator(
        `.character-grid [data-action="character"][data-id="${save.team[0]}"]`,
      )
      .click();
    assert.equal(await page.locator(".copy-picker button").count(), 2);
    // A secondary instance remains operable even though the roster has only one card.
    await page.locator(".copy-picker button").last().click();
    await page.locator('.character-detail [data-action="team"]').click();
    await page.waitForFunction(
      () =>
        document.querySelector('.character-detail [data-action="team"]')
          .textContent === "移出編隊",
    );
    assert.equal((await record(page, "save:test")).team.length, 4);
    await page.locator('.character-detail [data-action="team"]').click();
    await page.waitForFunction(
      () =>
        document.querySelector('.character-detail [data-action="team"]')
          .textContent === "加入編隊",
    );
    await page.locator(".copy-picker button").first().click();
    await page.locator('[data-action="open-feed"]').click();
    assert.equal(await page.locator(".feed-copy").count(), 1);
    const feedBounds = await page.locator(".feed-copy .portrait").boundingBox();
    assert(feedBounds.width <= 50 && feedBounds.height <= 60);
    await close();
    await open("roster");
    await page
      .locator('.modal-body > [data-action="panel"][data-id="formation"]')
      .click();
    assert.equal(
      await page.locator(".formation-slots .remove-member").count(),
      3,
    );
    await page.locator(".formation-slots .remove-member").last().click();
    await page.waitForFunction(
      () => document.querySelectorAll(".formation-slots > div").length === 2,
    );
    assert.equal((await record(page, "save:test")).team.length, 2);
    await close();
    await open("planets");
    await page
      .locator(".stationed-maiden .portrait.large")
      .evaluate((im) => im.decode());
    assert.match(await page.locator(".stationed-maiden").innerText(), /大角星/);
    await page.screenshot({
      path: `${output}/${mobile ? "mobile" : "desktop"}-territory.png`,
    });
    await page.locator('[data-action="manage-planet"]').first().click();
    assert.match(await page.locator(".stationed-maiden").innerText(), /大角星/);
    await page.getByRole("button", { name: "← 返回領地總覽" }).click();
    assert.match(await page.locator(".modal-heading").innerText(), /領地總覽/);
    await close();
    await open("quests");
    assert.equal(await page.locator(".daily-quests article").count(), 7);
    const q = pack.quests.find((q) => q.condition === "leveled");
    const card = page.locator(`[data-daily-quest="${q.id}"]`);
    assert.match(await card.innerText(), /1 \/ 1/);
    await card.locator('[data-action="quest"]').click();
    await page.waitForFunction(
      (id) =>
        document.querySelector(`[data-daily-quest="${id}"] button`).disabled,
      q.id,
    );
    assert.equal(
      (await record(page, "save:test")).dailyTasks[q.id].claimed,
      true,
    );
    await page.screenshot({
      path: `${output}/${mobile ? "mobile" : "desktop"}-daily.png`,
    });
    await close();
    await open("roster");
    for (const c of pack.characters.filter(
      (c) =>
        c.id.startsWith("story10:") || c.id === "solar10:character.jupiter",
    )) {
      const owned = save.roster.find((o) => o.definition === c.id);
      await page
        .locator(
          `.character-grid [data-action="character"][data-id="${owned.id}"]`,
        )
        .click();
      const asset = pack.assets.find((a) => a.id === c.portrait);
      assert.equal(
        await page.locator(".character-detail > img").getAttribute("src"),
        asset.src,
      );
      await page
        .locator(".character-detail > img")
        .evaluate((im) => im.decode());
      if (c.id === "solar10:character.jupiter")
        await page.screenshot({
          path: `${output}/${mobile ? "mobile" : "desktop"}-jupiter.png`,
        });
      await page.getByRole("button", { name: "← 返回角色選單" }).click();
    }
    await close();
    const media = pack.assets.filter((a) => a.id.includes("20261023"));
    assert.equal(media.length, 51);
    await page.evaluate(async (assets) => {
      for (const a of assets) {
        const response = await fetch(a.src);
        if (!response.ok) throw Error(a.id + " HTTP " + response.status);
        const bytes = await response.arrayBuffer();
        const hash = Array.from(
          new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
        )
          .map((n) => n.toString(16).padStart(2, "0"))
          .join("");
        if (hash !== a.hash) throw Error(a.id + " hash");
        const image = new Image();
        image.src = a.src;
        await image.decode();
        if (image.naturalWidth !== a.width || image.naturalHeight !== a.height)
          throw Error(a.id + " dimensions");
      }
    }, media);
    await page.goto(server.url + "#/studio");
    await unlockStudio(page);
    assert.equal(
      await page.locator('[data-get-quest^="m1:daily."]').count(),
      0,
    );
    await page.locator('[data-action="laboratory"]').click();
    await page.waitForSelector(".laboratory", { timeout: 60000 });
    const allies = page.locator(".lab-ally");
    for (let i = 0; i < 6; i++)
      await allies.nth(i).locator("[data-character]").selectOption("");
    await page.locator("#lab-lock-health").check();
    for (const c of pack.characters.filter(
      (c) =>
        c.id.startsWith("story10:") || c.id === "solar10:character.jupiter",
    )) {
      await allies.nth(0).locator("[data-character]").selectOption(c.id);
      await page.locator('[data-lab="start"]').click();
      await page.locator('[data-lab="cast"]').first().click();
      for (let i = 0; i < 15; i++)
        await page.locator('[data-lab="step"]').click();
      const debug = JSON.parse(await page.locator("#lab-debug").textContent());
      assert.equal(debug.config.allies[0].character, c.id);
      assert(debug.time >= 0.24);
      if (c.id === "solar10:character.jupiter")
        await page.locator(".laboratory").screenshot({
          path: `${output}/${mobile ? "mobile" : "desktop"}-jupiter-combat.png`,
        });
    }
    await page.locator('[data-lab="close"]').click();
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    assert.deepEqual(await record(page, "save:main"), {
      sentinel: "v8-protected",
    });
    results.push({
      mobile,
      characters: pack.characters.length,
      instances: 27,
      dailyQuests: 7,
      passed: [
        "unique-cards",
        "copy-picker",
        "small-feed",
        "formation-remove",
        "stationed-portrait",
        "colony-back",
        "daily-claim",
        "all-new-portraits",
        "jupiter-update",
        "no-overflow",
        "main-save-isolation",
      ],
    });
    await context.close();
  }
  assert.deepEqual(errors, []);
  await writeFile(
    `${output}/browser.json`,
    JSON.stringify({ results, errors }, null, 2),
  );
  console.log("PASS v8 integration", JSON.stringify(results));
} finally {
  await browser.close();
  await server.close();
}
