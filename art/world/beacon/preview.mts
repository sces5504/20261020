// Real studio import/replace/undo, plus a contact sheet from the delivered assets.
// Run after verify.mts and npm run build, from the repository root.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium } from "../../../tools/node_modules/playwright/index.mjs";
import { serveBuilt } from "../../../tools/game/serve-built.mjs";
import { unlockStudio } from "../../../tools/game/studio-access.mjs";
const pack = JSON.parse(
  await readFile(".artifacts/frontier-beacon/art-preview.json", "utf8"),
);
const entries = JSON.parse(
  await readFile("art/world/beacon/assets.json", "utf8"),
);
const server = await serveBuilt();
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
});
const errors: string[] = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  page.setDefaultTimeout(30000);
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(server.url + "#/studio");
  await unlockStudio(page);
  await page
    .locator("#import-project")
    .setInputFiles(".artifacts/frontier-beacon/frontier-art-preview.zip");
  await page.locator('[data-answer="yes"]').click();
  await page.waitForFunction(
    () =>
      !document.querySelector(".studio")?.hasAttribute("aria-busy") ||
      document.querySelector(".studio")?.getAttribute("aria-busy") === "false",
  );
  await page.locator('[data-action="kind"][data-id="enemies"]').click();
  for (const entry of entries.filter((e: any) => e.kind === "sprite")) {
    if (entry.entity.startsWith("beacon:planet"))
      await page.locator('[data-action="kind"][data-id="planets"]').click();
    await page
      .locator(`[data-action="select"][data-id="${entry.entity}"]`)
      .click();
    assert.equal(
      await page.locator('[data-field="sprite"]').inputValue(),
      entry.id,
    );
    await page
      .locator(".asset-preview img")
      .evaluate(async (im: HTMLImageElement) => {
        await im.decode();
        if (!im.naturalWidth) throw Error("missing preview");
      });
  }
  await page.locator('[data-action="kind"][data-id="enemies"]').click();
  await page
    .locator('[data-action="select"][data-id="beacon:enemy.anchor"]')
    .click();
  await page.screenshot({
    path: ".artifacts/frontier-beacon/art-studio-boss.png",
  });
  await page
    .locator('[data-field="sprite"]')
    .selectOption("m1art:destroyer-v1");
  await page.locator('[data-action="save-entity"]').click();
  await page.waitForFunction(() =>
    document.querySelector("#report")?.textContent?.includes("已保存"),
  );
  await page.locator('[data-action="undo"]').click();
  await page.waitForFunction(
    () =>
      (document.querySelector('[data-field="sprite"]') as HTMLSelectElement)
        ?.value === "beacon:asset.anchor-v1",
  );
  await page.locator('[data-action="kind"][data-id="assets"]').click();
  await page
    .locator('[data-action="select"][data-id="beacon:asset.frontier-v1"]')
    .click();
  await page
    .locator(".asset-preview img")
    .evaluate(async (im: HTMLImageElement) => im.decode());
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  );
  await page.screenshot({
    path: ".artifacts/frontier-beacon/art-studio-mobile.png",
    fullPage: true,
  });
  // Static visual review sheet; no new product page or core UI is introduced.
  const sheet = await browser.newPage({
    viewport: { width: 1500, height: 1200 },
    deviceScaleFactor: 1,
  });
  const images = entries.map((e: any) => ({
    ...e,
    src: pack.assets.find((a: any) => a.id === e.id).src,
  }));
  await sheet.setContent(
    `<html><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;background:#07131f;color:#e6edf5;font:18px system-ui;padding:38px}header{margin-bottom:28px}h1{font-size:30px;margin:0 0 8px}p{color:#94abbc;margin:0}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}.card{background:#101f30;border:1px solid #2f4658;padding:20px;text-align:center;border-radius:8px}.card img{width:100%;height:250px;object-fit:contain}.card:nth-child(4){grid-column:span 1}.card:last-child{grid-column:span 2}.card:last-child img{object-fit:cover;height:300px}.card:nth-child(4) img{height:300px}h2{font-size:20px;margin:14px 0 5px}small{color:#90a6b8}</style><header><h1>GALAXY ANGEL · 邊境信標</h1><p>新增內容專屬美術 · 同 ID 固定外觀 · 既有敵人不修改 · Candidate v1</p></header><div class="grid">${images.map((e: any) => `<div class="card"><img src="${e.src}"><h2>${pack.assets.find((a: any) => a.id === e.id).name}</h2><small>${e.id}</small></div>`).join("")}</div></html>`,
  );
  await sheet
    .locator("img")
    .evaluateAll(async (images: HTMLImageElement[]) =>
      Promise.all(images.map((im) => im.decode())),
    );
  await sheet.screenshot({
    path: "art/world/beacon/preview.png",
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  console.log(
    "PASS real studio ZIP import/media verification, four bound sprite previews, replace/undo, background preview, mobile layout and contact sheet",
  );
} finally {
  await browser.close();
  await server.close();
}
