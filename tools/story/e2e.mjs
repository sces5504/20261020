import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "../node_modules/playwright/index.mjs";
import { serveBuilt } from "../game/serve-built.mjs";
import { unlockStudio } from "../game/studio-access.mjs";
import { storyFixture } from "./fixture.mts";
import { newSave } from "../../src/domain/model.ts";
const server = await serveBuilt(),
  browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
await mkdir(".artifacts/story", { recursive: true });
const errors = [],
  results = [];
const record = (page, key) =>
  page.evaluate(
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
try {
  for (const mobile of [false, true]) {
    const context = await browser.newContext({
      viewport: { width: mobile ? 390 : 1440, height: mobile ? 844 : 1000 },
      hasTouch: mobile,
      isMobile: mobile,
      deviceScaleFactor: mobile ? 2 : 1,
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(server.url + "gallery.html");
    await page.waitForSelector("[data-gallery-character]");
    assert.equal(await page.locator("[data-gallery-character]").count(), 72);
    await page.locator("#gallery-search").fill("盾牌座UY");
    assert.equal(await page.locator("[data-gallery-character]").count(), 1);
    await page.locator("#gallery-mode").click();
    await page.locator('img[alt="盾牌座UY Q版"]').waitFor();
    await page.locator("img").evaluate(async (img) => {
      await img.decode();
    });
    await page.screenshot({
      path: `.artifacts/story/${mobile ? "mobile" : "desktop"}-gallery.png`,
      fullPage: true,
    });
    const pack = storyFixture(),
      save = newSave(pack, Date.now(), "story-browser");
    save.storySeen = pack.quests.filter((q) => !q.story).map((q) => q.id);
    await page.evaluate(
      async ({ pack, save }) => {
        const r = indexedDB.open("stella-maiden-m1", 1);
        r.onupgradeneeded = () => r.result.createObjectStore("records");
        await new Promise((res) => (r.onsuccess = res));
        const tx = r.result.transaction("records", "readwrite"),
          store = tx.objectStore("records");
        store.put(pack, "content:test");
        store.put(save, "save:test");
        store.put({ marker: "untouched-main" }, "save:main");
        await new Promise((res) => (tx.oncomplete = res));
        r.result.close();
      },
      { pack, save },
    );
    await page.goto(server.url + "#/test");
    await page.waitForSelector(".bridge");
    await page
      .locator('.deck-nav [data-action="panel"][data-id="quests"]')
      .click();
    await page
      .locator(
        `[data-action="journal-chapter"][data-id="${pack.quests.find((q) => q.id === "fixture:quest").story.chapter}"]`,
      )
      .click();
    await page
      .locator('[data-action="flow-open"][data-id="fixture:quest"]')
      .click();
    await page.locator('[data-action="flow-skip"]').click();
    // A battle step closes the dialogue; the fleet is already at the field, so the
    // tracker offers the sortie (fields far away are reached by flying, never teleporting).
    const sortie = page.locator(".mainline-card button", { hasText: "出擊" });
    await sortie.waitFor();
    let s = await record(page, "save:test");
    assert.equal(s.story.counters["event:fixture:initialized"], 1);
    const count = s.roster.length;
    await page.reload();
    await sortie.waitFor();
    assert.equal((await record(page, "save:test")).roster.length, count);
    await page.evaluate(() => {
      window.__sceneInBattle = false;
      new MutationObserver(() => {
        if (document.querySelector(".bridge.in-battle .story-scene"))
          window.__sceneInBattle = true;
      }).observe(document.body, { subtree: true, childList: true });
    });
    await sortie.click();
    try {
      // In-battle lines are a non-blocking radio feed, never a paused dialogue.
      await page
        .locator(".story-radio")
        .getByText("測試：戰中通訊。", { exact: true })
        .waitFor();
    } catch (e) {
      await page.screenshot({ path: ".artifacts/story/failure.png" });
      console.log(
        "BROWSER DEBUG",
        errors,
        await record(page, "save:test"),
        await page.locator("#overlay").innerText(),
      );
      throw e;
    }
    await page.screenshot({
      path: `.artifacts/story/${mobile ? "mobile" : "desktop"}-radio.png`,
    });
    for (
      let i = 0;
      i < 120 &&
      !(await page
        .getByText("測試：戰後對話，領獎獨立。", { exact: true })
        .count());
      i++
    ) {
      const close = page.locator(
        '.result-screen [data-action="close"]:visible, #overlay [data-action="close"]:visible',
      );
      if (await close.count()) await close.first().click().catch(() => {});
      await page.waitForTimeout(500);
    }
    await page
      .getByText("測試：戰後對話，領獎獨立。", { exact: true })
      .waitFor();
    assert.equal(
      await page.evaluate(() => window.__sceneInBattle),
      false,
      "no dialogue scene opens during combat",
    );
    await page.locator('[data-action="flow-skip"]').click();
    await page.waitForFunction(
      () => !document.querySelector('[data-action="flow-next"]'),
    );
    // Dismiss the regular result / acquisition presentation and claim from the chapter ledger.
    await page.reload();
    await page.waitForSelector(".bridge");
    if (await page.locator('[data-action="acquisition-next"]').count())
      await page.locator('[data-action="acquisition-next"]').click();
    await page
      .locator('.deck-nav [data-action="panel"][data-id="quests"]')
      .click();
    await page
      .locator(
        `[data-action="journal-chapter"][data-id="${pack.quests.find((q) => q.id === "fixture:quest").story.chapter}"]`,
      )
      .click();
    await page
      .locator('[data-action="quest"][data-id="fixture:quest"]')
      .click();
    await page.waitForFunction(
      () =>
        document.querySelector('[data-action="quest"][data-id="fixture:quest"]')
          ?.disabled,
    );
    s = await record(page, "save:test");
    assert.ok(s.quests.includes("fixture:quest"));
    const wallet = s.wallet,
      storyState = structuredClone(s.story),
      seen = s.storySeen,
      claims = s.quests,
      receipts = s.receipts.filter(
        (id) => id.startsWith("story:") || id.startsWith("encounter-"),
      );
    await page
      .locator('[data-action="flow-replay"][data-id="fixture:quest"]')
      .click();
    await page.locator('[data-action="flow-skip"]').click();
    const after = await record(page, "save:test");
    assert.deepEqual(after.wallet, wallet);
    assert.deepEqual(
      after.receipts.filter(
        (id) => id.startsWith("story:") || id.startsWith("encounter-"),
      ),
      receipts,
    );
    assert.deepEqual(after.story, storyState);
    assert.deepEqual(after.storySeen, seen);
    assert.deepEqual(after.quests, claims);
    assert.equal(after.roster.length, count);
    await page.locator('[data-action="panel"][data-id="challenges"]').click();
    assert.ok(
      await page
        .getByRole("heading", { name: "類星體母艦", exact: true })
        .count(),
    );
    await page
      .locator('[data-action="challenge-tab"][data-id="hard"]')
      .click();
    assert.ok(
      await page
        .getByRole("heading", { name: "太陽系 · 高難", exact: true })
        .count(),
    );
    await page.screenshot({
      path: `.artifacts/story/${mobile ? "mobile" : "desktop"}-challenges.png`,
      fullPage: true,
    });
    assert.deepEqual(await record(page, "save:main"), {
      marker: "untouched-main",
    });
    await page.goto(server.url + "#/studio");
    await unlockStudio(page);
    await page.locator('[data-action="kind"][data-id="actors"]').click();
    await page.locator('[data-action="new"]').click();
    await page.locator('[data-field="portrait"]').waitFor();
    assert.equal(await page.locator('[data-field="variants"]').count(), 1);
    results.push({
      mobile,
      gallery: 72,
      skipInitialization: true,
      reloadNoDuplicate: true,
      actualBattleAndCue: true,
      claimAndReplay: true,
      challengeEntries: true,
      npcWorkshop: true,
      mainSaveUntouched: true,
    });
    await context.close();
  }
  assert.deepEqual(errors, []);
  await writeFile(
    ".artifacts/story/browser.json",
    JSON.stringify(
      { passed: true, results, errors, physicalDevice: false },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ passed: true, results, errors }));
} finally {
  await browser.close();
  await server.close();
}
