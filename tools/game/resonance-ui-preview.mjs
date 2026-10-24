import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { chromium } from "../node_modules/playwright/index.mjs";
import { serveBuilt } from "./serve-built.mjs";
import { newSave } from "../../src/domain/model.ts";
const pack = JSON.parse(
  await readFile("content/generated/runtime.json", "utf8"),
);
const out = ".artifacts/resonance-art-v1";
await mkdir(out, { recursive: true });
const server = await serveBuilt(),
  browser = await chromium.launch({ args: ["--no-sandbox"] });
const results = [],
  errors = [];
async function record(page, key) {
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
try {
  for (const [name, width, height] of [
    ["desktop", 1440, 1000],
    ["mobile", 390, 844],
    ["narrow", 320, 568],
    ["landscape", 844, 390],
  ]) {
    if (
      process.env.RESONANCE_VIEWPORTS &&
      !process.env.RESONANCE_VIEWPORTS.split(",").includes(name)
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
    const p = structuredClone(pack);
    p.regions.forEach((r) => (r.patrols = []));
    const s = newSave(p, Date.now(), "resonance-material-review");
    s.storySeen = p.quests.filter((q) => !q.story).map((q) => q.id);
    s.wallet = Object.fromEntries(p.resources.map((r) => [r.id, 50000]));
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
        tx.objectStore("records").put(
          { marker: "resonance-art-main-untouched" },
          "save:main",
        );
        await new Promise((resolve) => (tx.oncomplete = resolve));
        r.result.close();
      },
      { p, s },
    );
    await page.goto(server.url + "#/test");
    await page.waitForSelector("canvas");
    await page.locator('.deck-nav [data-id="summon"]').click();
    await page.locator('.modal[data-panel="summon"]').waitFor();
    await page.evaluate(async () => {
      const styles = [
        getComputedStyle(document.querySelector(".resonance-visual-art"))
          .backgroundImage,
        getComputedStyle(document.querySelector(".resonance-activate"))
          .backgroundImage,
      ];
      await Promise.all(
        styles.map(async (style) => {
          const src = style.match(/url\(["']?(.*?)["']?\)/)?.[1];
          if (!src) throw Error("Missing painted art URL");
          const img = new Image();
          img.src = src;
          await img.decode();
        }),
      );
      await Promise.all(
        [...document.querySelectorAll(".resonance-signals img")].map((i) =>
          i.decode(),
        ),
      );
    });
    await page.locator('.modal[data-panel="summon"]').evaluate(async (el) => {
      await Promise.all(
        el
          .getAnimations()
          .filter((a) =>
            Number.isFinite(a.effect?.getComputedTiming().iterations),
          )
          .map((a) => a.finished.catch(() => {})),
      );
    });
    const geom = await page.evaluate(() => {
      const modal = document.querySelector('.modal[data-panel="summon"]'),
        body = modal.querySelector(".modal-body");
      const r = (el) => el.getBoundingClientRect().toJSON();
      return {
        width: innerWidth,
        scroll: document.documentElement.scrollWidth,
        modal: r(modal),
        body: r(body),
        inputs: [...modal.querySelectorAll("input,select,button")].map(r),
        scrollHeight: body.scrollHeight,
        clientHeight: body.clientHeight,
      };
    });
    assert.ok(geom.scroll <= width + 1, "no page overflow");
    assert.ok(
      geom.modal.left >= -1 && geom.modal.right <= width + 1,
      "modal fits",
    );
    assert.ok(
      geom.modal.top >= -1 && geom.modal.bottom <= height + 1,
      "modal fits screen height",
    );
    assert.ok(
      geom.inputs.every((r) => r.width >= 43 && r.height >= 43),
      "44px class targets",
    );
    await page.screenshot({
      path: `${out}/${name}-top.png`,
      animations: "disabled",
    });
    await page.locator(".resonance-activate").scrollIntoViewIfNeeded();
    await page.screenshot({
      path: `${out}/${name}-controls.png`,
      animations: "disabled",
    });
    // Freeze wall time only during the transaction fixture, so slow screenshot
    // encoding cannot finish the real 35-second job before the assertion.
    await page.clock.setFixedTime(Date.now());
    const wanted = p.characters.find((c) => c.id === "m1:venus");
    await page.locator("#preset").selectOption(wanted.id);
    assert.deepEqual(
      await page
        .locator(".recipe")
        .evaluateAll((es) => es.map((e) => Number(e.value))),
      wanted.recipe,
    );
    await page.locator("#batch-count").fill("2");
    await page.locator("#batch-count").dispatchEvent("change");
    assert.equal(
      await page.locator(".resonance-cost-heading small").textContent(),
      "2 組",
    );
    const original = await record(page, "save:test");
    await page.locator(".resonance-activate").click();
    await page.locator('[data-answer="no"]').click();
    assert.deepEqual(
      (await record(page, "save:test")).jobs,
      original.jobs,
      "cancel creates no jobs",
    );
    await page.locator(".resonance-activate").click();
    await page.locator('[data-answer="yes"]').click();
    await page.waitForFunction(
      () => document.querySelectorAll("#jobs .job").length >= 2,
    );
    const after = await record(page, "save:test");
    assert.equal(
      after.jobs.filter((j) => j.kind === "summon").length,
      2,
      "actual jobs created",
    );
    for (let i = 0; i < p.resources.length; i++)
      assert.ok(
        after.wallet[p.resources[i].id] <=
          original.wallet[p.resources[i].id] - wanted.recipe[i] * 2 + 1,
        "actual resource debit",
      );
    assert.equal(
      (await record(page, "save:main")).marker,
      "resonance-art-main-untouched",
    );
    await page
      .locator("#jobs")
      .evaluate((el) => el.scrollIntoView({ block: "end" }));
    await page.screenshot({
      path: `${out}/${name}-jobs.png`,
      animations: "disabled",
    });
    results.push({
      name,
      viewport: { width, height },
      geometry: geom,
      checks: [
        "painted WebP and alpha button decoded",
        "actual recipe preset updates four inputs",
        "batch totals",
        "cancel is non-mutating",
        "two real jobs and correct four-resource debit",
        "production save sentinel unchanged",
        "no overflow and usable controls",
      ],
      physicalDevice: false,
      transactionClock:
        "Date.now frozen during transactions only; actual completion timing not tested",
    });
    await writeFile(
      `${out}/browser.json`,
      JSON.stringify({ results, errors, reviewStatus: "candidate" }, null, 2) +
        "\n",
    );
    console.log("PASS resonance art", name);
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
