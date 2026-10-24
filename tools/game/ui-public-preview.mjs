import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "../node_modules/playwright/index.mjs";
import { serveBuilt } from "./serve-built.mjs";
const out = ".artifacts/ui-suite-public";
await mkdir(out, { recursive: true });
const server = await serveBuilt(),
  browser = await chromium.launch({ args: ["--no-sandbox"] });
const results = [],
  errors = [];
try {
  for (const [name, width, height] of [
    ["desktop", 1440, 1000],
    ["mobile", 390, 844],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: width < 500 ? 2 : 1,
    });
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    for (const [key, url, sel] of [
      ["gallery", "gallery.html", ".art-gallery"],
      ["catalog", "#/catalog", ".roster-page"],
      ["studio-access", "#/studio", ".studio-access"],
    ]) {
      await page.goto(server.url + url);
      await page.locator(sel).waitFor({ timeout: 60000 });
      await page.evaluate(() => document.fonts.ready);
      if (key === "gallery") {
        await page.locator("#gallery-search").fill("地球");
        assert.equal(await page.locator("[data-gallery-character]").count(), 1);
        await page.locator("article img").evaluate((i) => i.decode());
        await page.locator("#gallery-mode").click();
        assert.match(
          await page.locator("article img").getAttribute("alt"),
          /Q版/,
        );
        await page.locator("#gallery-mode").click();
        await page.locator("article img").evaluate((i) => i.decode());
      }
      if (key === "catalog") {
        await page.locator("#roster-filter").selectOption("done");
        assert.ok((await page.locator("#roster-rows tr").count()) > 0);
      }
      const g = await page.evaluate(() => ({
        width: innerWidth,
        scroll: document.documentElement.scrollWidth,
        font: document.fonts.check('14px "Galaxy TC"', "星河圖鑑"),
      }));
      assert.ok(g.scroll <= width + 1, key + " no page overflow");
      assert.ok(g.font);
      await page.screenshot({
        path: `${out}/${name}-${key}.png`,
        animations: "disabled",
      });
      results.push({
        viewport: { width, height },
        name,
        key,
        geometry: g,
        physicalDevice: false,
      });
    }
    await context.close();
  }
  assert.deepEqual(errors, []);
  await writeFile(
    `${out}/browser.json`,
    JSON.stringify({ results, errors }, null, 2) + "\n",
  );
  console.log(
    "PASS public gallery search/Q toggle, catalog filter, studio gate, desktop/mobile typography",
  );
} finally {
  await browser.close();
  await server.close();
}
