import assert from "node:assert/strict";
import { readFile, mkdir, writeFile, rm } from "node:fs/promises";
import { chromium } from "../node_modules/playwright/index.mjs";
import { serveBuilt } from "./serve-built.mjs";
import { newSave } from "../../src/domain/model.ts";
const pack = JSON.parse(
  await readFile("content/generated/runtime.json", "utf8"),
);
const server = await serveBuilt(),
  browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const out = ".artifacts/skills";
await mkdir(out, { recursive: true });
await rm(`${out}/browser.json`, { force: true });
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
    await page.goto(server.url + "#/art");
    await page.waitForSelector(".art-gallery", { timeout: 60000 });
    const official = newSave(pack, Date.now());
    official.storySeen = pack.quests.map((q) => q.id);
    await page.evaluate(async (save) => {
      const r = indexedDB.open("stella-maiden-m1", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("records");
      await new Promise((resolve) => (r.onsuccess = resolve));
      const tx = r.result.transaction("records", "readwrite");
      tx.objectStore("records").put(save, "save:main");
      await new Promise((resolve) => (tx.oncomplete = resolve));
      r.result.close();
    }, official);
    await page.goto(server.url + "#/studio");
    await page.locator("#studio-password").fill("1126");
    await page.locator("#studio-access-form button[type=submit]").click();
    await page.waitForSelector(".studio");
    await page.locator("[data-action=laboratory]").click();
    await page.waitForSelector(".laboratory", { timeout: 60000 });
    const allies = page.locator(".lab-ally"),
      enemies = page.locator(".lab-enemy");
    for (let i = 0; i < 6; i++)
      await allies
        .nth(i)
        .locator("[data-character]")
        .selectOption(i === 0 ? "solar10:character.nemesis" : "");
    await allies.nth(0).locator("[data-level]").fill("17");
    await allies.nth(0).locator("[data-skill-level]").fill("10");
    await enemies.nth(0).locator("[data-enemy-level]").fill("60");
    await enemies.nth(0).locator("[data-count]").fill("3");
    await enemies.nth(0).locator("[data-pattern]").selectOption("spiral");
    await page.locator("[data-lab=start]").click();
    let debug = JSON.parse(await page.locator("#lab-debug").textContent());
    assert.equal(debug.config.allies[0].level, 17);
    assert.equal(debug.config.allies[0].skillLevel, 10);
    assert.equal(debug.config.enemies[0].count, 3);
    assert.equal(debug.config.enemies[0].pattern, "spiral");
    await page.locator("[data-lab=cast]").first().click();
    await page.locator("[data-lab=step]").click();
    debug = JSON.parse(await page.locator("#lab-debug").textContent());
    assert(Math.abs(debug.time - 1 / 60) < 1e-8);
    await page.locator("[data-lab=pause]").click();
    await page.waitForTimeout(700);
    await page.locator("[data-lab=pause]").click();
    debug = JSON.parse(await page.locator("#lab-debug").textContent());
    assert(debug.time > 0.3);
    assert.match(
      await page.locator("#lab-metrics").textContent(),
      /復仇女神星/,
    );
    await page.locator(".laboratory").screenshot({
      path: `${out}/${mobile ? "mobile" : "desktop"}-homing.png`,
    });
    // Three different persistent skills use their actual character assets and geometry.
    for (const [i, id] of ["pluto", "jupiter", "ganymede"].entries()) {
      await allies
        .nth(i)
        .locator("[data-character]")
        .selectOption("solar10:character." + id);
      await allies.nth(i).locator("[data-level]").fill("5");
      await allies.nth(i).locator("[data-skill-level]").fill("1");
    }
    await enemies.nth(0).locator("[data-pattern]").selectOption("laser");
    await page.locator("[data-lab=start]").click();
    for (const b of await page.locator("[data-lab=cast]").all())
      await b.click();
    await page.locator("[data-lab=pause]").click();
    await page.waitForTimeout(650);
    await page.locator("[data-lab=pause]").click();
    debug = JSON.parse(await page.locator("#lab-debug").textContent());
    assert(debug.fields.some((f) => f.kind === "beam"));
    assert(debug.fields.some((f) => f.kind === "zone"));
    assert.match(await page.locator("#lab-metrics").textContent(), /分身/);
    await page.locator(".laboratory").screenshot({
      path: `${out}/${mobile ? "mobile" : "desktop"}-fields-clone.png`,
    });
    // Reset is repeatable, invalid level is rejected without replacing the running scene.
    await page.locator("[data-lab=start]").click();
    debug = JSON.parse(await page.locator("#lab-debug").textContent());
    assert.equal(debug.time, 0);
    await allies.nth(0).locator("[data-level]").fill("999");
    await page.locator("[data-lab=start]").click();
    assert.notEqual(
      await page.locator("#lab-error").textContent(),
      "已建立獨立戰鬥。",
    );
    assert.deepEqual(
      await record(page, "save:main"),
      official,
      "laboratory cannot mutate player progress",
    );
    await page.locator("[data-lab=close]").click();
    await page.waitForSelector(".laboratory", { state: "detached" });
    // Friendly action/status editors round trip through the actual draft store.
    await page.locator("[data-action=kind][data-id=skills]").click();
    await page.locator('[data-action=select][data-id="m1:dispersion"]').click();
    assert.equal(
      await page.locator('[data-field="power"]').count(),
      0,
      "programs must not offer ignored legacy power",
    );
    const kindControl = page.locator('[data-action-prop="kind"]').first();
    await kindControl.selectOption("heal");
    assert(
      await page.locator('[data-action-prop="power"]').first().isVisible(),
    );
    assert(await page.locator('[data-action-prop="speed"]').first().isHidden());
    assert(await page.locator(".mechanic-row details").first().isHidden());
    await kindControl.selectOption("status");
    assert(await page.locator('[data-action-prop="power"]').first().isHidden());
    await page
      .locator(".modifier-row [data-modifier=value]")
      .first()
      .fill(".5");
    await page.locator("[data-action=save-entity]").click();
    await page.waitForFunction(() =>
      document.querySelector("#report")?.textContent?.includes("保存"),
    );
    const draft = await record(page, "editor:project");
    assert.equal(
      draft.pack.skills.find((s) => s.id === "m1:dispersion").actions[0]
        .modifiers[0].value,
      0.5,
    );
    await page.locator("[data-action=laboratory]").click();
    await page.waitForSelector(".laboratory", { timeout: 60000 });
    await page
      .locator(".lab-ally")
      .nth(0)
      .locator("[data-skill]")
      .selectOption("stella:skill.222");
    await page.locator("[data-lab=start]").click();
    await page.locator("[data-lab=cast]").first().click();
    await page.locator("[data-lab=step]").click();
    assert.match(
      await page.locator("#lab-skill-info").textContent(),
      /停止敵方時間/,
    );
    assert.deepEqual(await record(page, "save:main"), official);
    await page.locator("[data-lab=close]").click();
    // Sustained 60-enemy ring barrage, with real collision/damage and laboratory-only health lock.
    await page.locator("[data-action=laboratory]").click();
    const stressAllies = page.locator(".lab-ally"),
      stressEnemies = page.locator(".lab-enemy");
    for (let i = 0; i < 6; i++) {
      await stressAllies
        .nth(i)
        .locator("[data-character]")
        .selectOption(pack.characters[i].id);
      await stressAllies
        .nth(i)
        .locator("[data-level]")
        .fill(String(pack.rules.maxLevel));
      await stressAllies.nth(i).locator("[data-skill]").selectOption("");
    }
    for (let i = 0; i < 2; i++) {
      await stressEnemies
        .nth(i)
        .locator("[data-enemy]")
        .selectOption("m1:scout");
      await stressEnemies.nth(i).locator("[data-count]").fill("30");
      await stressEnemies.nth(i).locator("[data-pattern]").selectOption("ring");
      await stressEnemies.nth(i).locator("[data-enemy-level]").fill("120");
    }
    await page.locator("#lab-lock-health").check();
    await page.locator("[data-lab=start]").click();
    await page.locator("[data-lab=pause]").click();
    await page.waitForTimeout(3500);
    const frameTimes = await page.evaluate(
      () =>
        new Promise((resolve) => {
          const values = [];
          let prior = 0;
          function sample(now) {
            if (prior) values.push(now - prior);
            prior = now;
            if (values.length < 90) requestAnimationFrame(sample);
            else resolve(values);
          }
          requestAnimationFrame(sample);
        }),
    );
    await page.locator("[data-lab=pause]").click();
    const stress = JSON.parse(await page.locator("#lab-debug").textContent());
    assert.equal(stress.config.lockHealth, true);
    assert(stress.time > 3);
    assert(!/超過|Error/.test(await page.locator("#lab-error").textContent()));
    const fps =
      1000 / (frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length);
    assert(fps >= 20, `sustained emulated FPS ${fps}`);
    assert.deepEqual(await record(page, "save:main"), official);
    await page.locator(".laboratory").screenshot({
      path: `${out}/${mobile ? "mobile" : "desktop"}-stress.png`,
    });
    await page.keyboard.press("Escape");
    await page.waitForSelector(".laboratory", { state: "detached" });
    // Official resource art resolves all four atlas frames in the gameplay wallet.
    await page.goto(server.url + "#/play");
    await page.waitForSelector("#wallet .resource-icon");
    assert.equal(await page.locator("#wallet .resource-icon").count(), 4);
    await page.waitForFunction(
      () =>
        new Set(
          [...document.querySelectorAll("#wallet .resource-icon")].map(
            (n) => getComputedStyle(n).backgroundPosition,
          ),
        ).size === 4,
    );
    const backgrounds = await page.evaluate(() =>
      [...document.querySelectorAll("#wallet .resource-icon")].map(
        (n) => getComputedStyle(n).backgroundPosition,
      ),
    );
    assert.equal(new Set(backgrounds).size, 4, JSON.stringify(backgrounds));
    await page.screenshot({
      path: `${out}/${mobile ? "mobile" : "desktop"}-resources.png`,
      fullPage: true,
    });
    results.push({
      mobile,
      viewport: mobile ? "390x844@2" : "1440x1000@1",
      seed: 77,
      characters: pack.characters.length,
      library: 226,
      core: pack.version,
      stress: {
        enemies: 60,
        pattern: "ring",
        fps,
        frames: 90,
        simulatedSeconds: stress.time,
        physicalDevice: false,
      },
      passed: [
        "gate",
        "levels",
        "enemy-pattern",
        "manual-cast",
        "fixed-step",
        "pause",
        "beam",
        "black-hole",
        "clone",
        "reset",
        "bounds",
        "draft-editor",
        "skill-override",
        "save-isolation",
        "four-resource-art",
        "sustained-60-enemy-barrage",
      ],
    });
    await context.close();
  }
  assert.deepEqual(errors, []);
  await writeFile(
    `${out}/browser.json`,
    JSON.stringify(
      {
        browser: browser.version(),
        build: JSON.parse(await readFile("dist/version.json", "utf8")),
        results,
        errors,
      },
      null,
      2,
    ),
  );
  console.log(
    "PASS skills browser: desktop/mobile, studio lab, mechanics editor, isolated saves and resource art",
  );
} finally {
  await browser.close();
  await server.close();
}
