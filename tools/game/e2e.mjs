import { unlockStudio } from "./studio-access.mjs";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, stat, mkdir } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { chromium } from "../node_modules/playwright/index.mjs";
const root = resolve("dist"),
  prefix = "/nested-project/";
const mime = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".webp": "image/webp",
};
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    if (!url.pathname.startsWith(prefix)) {
      res.writeHead(404).end();
      return;
    }
    const path = resolve(
      root,
      decodeURIComponent(url.pathname.slice(prefix.length)) || "index.html",
    );
    if (!path.startsWith(root + "/") || !(await stat(path)).isFile()) {
      res.writeHead(404).end();
      return;
    }
    res.setHeader(
      "Content-Type",
      mime[extname(path)] ?? "application/octet-stream",
    );
    res.end(await readFile(path));
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const url = `http://127.0.0.1:${server.address().port}${prefix}`;
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
});
const failures = [];
await mkdir(".artifacts/m1", { recursive: true });
const getRecord = async (page, key) =>
  page.evaluate(
    (key) =>
      new Promise((resolve, reject) => {
        const r = indexedDB.open("stella-maiden-m1", 1);
        r.onsuccess = () => {
          const tx = r.result.transaction("records", "readonly"),
            q = tx.objectStore("records").get(key);
          // Assertions need character/planet values, not every artwork byte
          // and the complete undo history over the browser protocol.
          q.onsuccess = () =>
            resolve(
              key === "editor:project"
                ? {
                    pack: {
                      characters: q.result.pack.characters,
                      planets: q.result.pack.planets,
                    },
                  }
                : q.result,
            );
          q.onerror = () => reject(q.error);
        };
      }),
    key,
  );
async function skipIntro(page) {
  await page.waitForSelector('[data-action="story-skip"]');
  await page.locator('[data-action="story-skip"]').click();
  await page.waitForSelector(".story-scene", { state: "hidden" });
}
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  await context.addInitScript(() => localStorage.setItem("stella:view", "map"));
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  page.on("pageerror", (e) => failures.push(e.message));
  page.on("dialog", (d) => {
    failures.push("Unexpected native browser dialog");
    void d.dismiss();
  });
  const coldStart = Date.now();
  await page.goto(url);
  await page.waitForSelector(".bridge canvas", { timeout: 60000 });
  console.log(`E2E: full catalog cold startup ${Date.now() - coldStart}ms`);
  await skipIntro(page);
  await page.waitForTimeout(500);
  assert.equal(await page.locator(".resource").count(), 4);
  assert.equal(await page.locator(".squad-card").count(), 3);
  await page.screenshot({ path: ".artifacts/m1/desktop.png" });
  console.log("E2E: battle");
  await page.locator('[data-action="navigate"]').first().click();
  await page.waitForFunction(() =>
    document.querySelector(".bridge")?.classList.contains("in-battle"),
  );
  await page.locator(".squad-card").first().click();
  await page.locator('[data-id="research"][data-action="panel"]').click();
  await page.waitForSelector('[role="dialog"]');
  const bars = await page
    .locator(".hp-bar span")
    .evaluateAll((es) => es.map((e) => e.getAttribute("style")));
  await page.waitForTimeout(600);
  assert.deepEqual(
    await page
      .locator(".hp-bar span")
      .evaluateAll((es) => es.map((e) => e.getAttribute("style"))),
    bars,
    "management panel pauses battle",
  );
  await page.locator('[data-action="research"]').first().click();
  await page.waitForTimeout(250);
  assert.equal(
    (await getRecord(page, "save:main")).jobs.filter(
      (j) => j.kind === "research",
    ).length,
    1,
  );
  await page.locator('[data-action="close"]').first().click();
  await page.reload();
  await page.waitForSelector(".in-battle", { timeout: 60000 });
  assert.ok(
    (await getRecord(page, "save:main")).encounter,
    "checkpoint restores encounter after reload",
  );
  console.log("E2E: studio");
  await page.locator('a[href="#/studio"]').first().click();
  await unlockStudio(page);
  await page.waitForSelector("#entity-form", { timeout: 60000 });
  await page.locator('[data-field="attack"]').fill("200");
  await page.locator('[data-field="rarity"]').fill("4");
  await page.locator('[data-action="save-entity"]').click();
  await page.waitForTimeout(300);
  let project = await getRecord(page, "editor:project");
  assert.equal(project.pack.characters[0].attack, 200);
  assert.equal(project.pack.characters[0].rarity, 4);
  await page.locator('[data-action="undo"]').click();
  await page.waitForTimeout(150);
  assert.equal(
    (await getRecord(page, "editor:project")).pack.characters[0].attack,
    28,
  );
  await page.locator('[data-action="redo"]').click();
  await page.waitForTimeout(150);
  await page.reload();
  await page.waitForSelector("#entity-form", { timeout: 60000 });
  assert.equal(await page.locator('[data-field="attack"]').inputValue(), "200");
  const skillBefore = await page.locator('[data-field="skill"]').inputValue();
  await page.locator('[data-field="skill"]').selectOption("m1:dispersion");
  await page.locator('[data-get-planet="m1:vein"]').check();
  await page.locator('[data-action="save-entity"]').click();
  await page.waitForTimeout(200);
  project = await getRecord(page, "editor:project");
  assert.equal(project.pack.characters[0].skill, "m1:dispersion");
  assert.ok(
    project.pack.planets
      .find((v) => v.id === "m1:vein")
      .dropCharacters.includes("m1:earth"),
  );
  await page.locator('[data-field="skill"]').selectOption(skillBefore);
  await page.locator('[data-action="save-entity"]').click();
  await page.screenshot({ path: ".artifacts/m1/studio.png" });
  // Finish the previous asynchronous project save before starting a download clock.
  await page.waitForFunction(
    () => document.querySelector("#app")?.getAttribute("aria-busy") !== "true",
    undefined,
    { timeout: 30000 },
  );
  assert.equal(
    (await getRecord(page, "editor:project")).pack.characters[0].skill,
    skillBefore,
  );
  // Full 0.8 snapshot verifies and compresses 256 images; keep the bulk export
  // bounded separately from the 8-second ordinary-interaction timeout.
  const exportStart = Date.now();
  const downloadPromise = page.waitForEvent("download", { timeout: 60000 });
  await page.locator('[data-action="export-pack"]').click();
  let dl;
  try {
    dl = await downloadPromise;
  } catch (error) {
    throw Error(
      `Archive export failed: ${await page.locator("#report").innerText()} / ${error}`,
    );
  }
  console.log(`E2E: full archive export ${Date.now() - exportStart}ms`);
  await dl.saveAs(".artifacts/m1/content.zip");
  await page
    .locator("#import-project")
    .setInputFiles(".artifacts/m1/content.zip");
  // A complete 0.8 archive now carries 256 decoded/hash-verified images.
  // Keep this bulk operation bounded without weakening ordinary UI timeouts.
  const importStart = Date.now();
  try {
    await page.locator('[data-answer="yes"]').click({ timeout: 60000 });
  } catch (e) {
    throw Error(
      `Import confirmation failed: ${await page.locator("#report").innerText()} / ${e}`,
    );
  }
  console.log(
    `E2E: full archive import validation ${Date.now() - importStart}ms`,
  );
  await page.waitForFunction(
    () => document.querySelector('[aria-busy="true"]') === null,
  );
  assert.equal(
    (await getRecord(page, "editor:project")).pack.characters[0].attack,
    200,
  );
  console.log("E2E: isolated game");
  const original = (await getRecord(page, "save:main")).roster;
  const testLoadStart = Date.now();
  await page.locator('[data-action="test"]').click();
  // Imported media is stored as complete data URLs; materializing the full
  // snapshot and its isolated save is a bulk load, separate from normal input.
  try {
    await page.waitForSelector(".bridge canvas", { timeout: 60000 });
  } catch (error) {
    throw Error(
      `Full snapshot test startup failed: ${(await page.locator("body").innerText()).slice(0, 1500)} / ${error}`,
    );
  }
  console.log(`E2E: imported snapshot startup ${Date.now() - testLoadStart}ms`);
  await skipIntro(page);
  assert.ok(
    (await page.locator(".sector-status").innerText()).includes("隔離測試"),
  );
  assert.equal((await getRecord(page, "save:test")).roster.length, 3);
  await page.locator('[data-id="summon"][data-action="panel"]').click();
  await page.locator('[data-action="summon"]').click();
  await page.locator('[data-answer="yes"]').click();
  await page.waitForTimeout(400);
  assert.equal(
    (await getRecord(page, "save:test")).jobs.filter((j) => j.kind === "summon")
      .length,
    1,
  );
  assert.deepEqual(
    (await getRecord(page, "save:main")).roster,
    original,
    "test progress does not alter official roster",
  );
  await page.locator('[data-action="close"]').first().click();
  await page.locator('[data-action="navigate"]').first().click();
  await page.waitForSelector(".in-battle");
  await page.waitForTimeout(500);
  await page.screenshot({ path: ".artifacts/m1/battle.png" });
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
  });
  await mobileContext.addInitScript(() =>
    localStorage.setItem("stella:view", "map"),
  );
  const mobile = await mobileContext.newPage();
  mobile.on("pageerror", (e) => failures.push(e.message));
  mobile.on("dialog", (d) => {
    failures.push("Unexpected native mobile browser dialog");
    void d.dismiss();
  });
  await mobile.goto(url);
  await mobile.waitForSelector("canvas", { timeout: 60000 });
  await skipIntro(mobile);
  await mobile.waitForTimeout(500);
  assert.ok(
    await mobile.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "no horizontal mobile overflow",
  );
  const canvas = mobile.locator("canvas");
  const box = await canvas.boundingBox();
  await mobile.touchscreen.tap(
    box.x + box.width * 0.38,
    box.y + box.height * 0.65,
  );
  await mobile.waitForTimeout(400);
  await mobile.screenshot({ path: ".artifacts/m1/mobile.png" });
  await mobile.locator('[data-id="archive"][data-action="panel"]').click();
  await mobile.locator('[data-action="sound"]').click();
  assert.equal(
    await mobile.evaluate(() => localStorage.getItem("stella:muted")),
    "true",
  );
  await mobile.locator('[data-action="sound"]').click();
  await mobile.locator('[data-action="effects"]').click();
  assert.equal(
    await mobile.evaluate(() => localStorage.getItem("stella:effects")),
    "low",
  );
  await mobile.locator('[data-action="close"]').first().click();
  await mobile.locator('[data-id="planets"][data-action="panel"]').click();
  await mobile.getByRole("heading", { name: "領地總覽" }).waitFor();
  await mobile.locator('[data-action="close"]').first().click();
  assert.equal(await mobile.locator('[data-id="training"]').count(), 0);
  assert.equal(await mobile.locator("#defense-alerts").count(), 0);
  await mobile.setViewportSize({ width: 844, height: 390 });
  await mobile.waitForTimeout(100);
  assert.ok(
    await mobile.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await mobile.setViewportSize({ width: 390, height: 844 });
  await mobile.goto(url + "#/studio");
  await unlockStudio(mobile);
  await mobile.waitForSelector("#entity-form", { timeout: 60000 });
  assert.ok(
    await mobile.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "studio has no horizontal mobile overflow",
  );
  await mobile.screenshot({ path: ".artifacts/m1/mobile-studio.png" });
  await page.goto(url + "#/art");
  await page.waitForSelector(".art-originals img");
  const galleryPack = JSON.parse(
    await readFile("content/generated/runtime.json", "utf8"),
  );
  assert.equal(
    await page.locator(".art-originals img").count(),
    galleryPack.characters.filter((c) => c.status === "active").length,
  );
  for (const image of await page.locator(".art-originals img").all()) {
    await image.scrollIntoViewIfNeeded();
    await image.evaluate((el) => el.decode());
    const src = await image.getAttribute("src");
    const asset = galleryPack.assets.find((a) => a.src === src);
    assert.ok(asset, `gallery asset ${src}`);
    assert.equal(await image.evaluate((el) => el.naturalWidth), asset.width);
  }
  await page.screenshot({
    path: ".artifacts/m1/original-art.png",
    fullPage: true,
  });
  const other = await context.newPage();
  other.on("pageerror", (e) => failures.push(e.message));
  await other.goto(url);
  await other.waitForSelector(".bridge", { timeout: 60000 });
  const rival = await context.newPage();
  rival.on("pageerror", (e) => failures.push(e.message));
  await rival.goto(url);
  await rival.waitForSelector(".bridge", { timeout: 60000 });
  await page.waitForTimeout(1600);
  const statuses = await Promise.all([
    other.locator("#save-status").innerText(),
    rival.locator("#save-status").innerText(),
  ]);
  assert.ok(
    statuses.some((s) => s.includes("尚未保存")),
    "stale tab must not overwrite newer revision",
  );
  await other.close();
  await rival.close();
  assert.deepEqual(failures, []);
  console.log(
    "PASS Chromium: nested base path, live battle/pause/recovery, research, editor persistence/undo/redo, ZIP import/export, isolated test saves, mobile touch/layout, six original art files decode, multi-tab revision protection. Real Android/iOS and art/audio quality remain unverified.",
  );
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
