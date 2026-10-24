import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { chromium } from "../node_modules/playwright/index.mjs";
import { serveBuilt } from "./serve-built.mjs";
import { newSave, stats } from "../../src/domain/model.ts";
const pack = JSON.parse(
  await readFile("content/generated/runtime.json", "utf8"),
);
const out = ".artifacts/vfx-direction";
await mkdir(out, { recursive: true });
const server = await serveBuilt(),
  browser = await chromium.launch({ args: ["--no-sandbox"] });
const results = [],
  errors = [];
const cases = [
  {
    key: "beam",
    character: "solar10:character.pluto",
    label: "冥王星 · 滅絕之光",
  },
  {
    key: "gravity",
    character: "solar10:character.jupiter",
    label: "木星 · 重力集中",
  },
  { key: "shield", character: "m1:earth", label: "地球 · 偏折領域" },
  {
    key: "turret",
    character: "m1:venus",
    label: "金星 · 設置砲台（新貼圖候選）",
  },
];
try {
  for (const item of cases) {
    if (
      process.env.VFX_CASES &&
      !process.env.VFX_CASES.split(",").includes(item.key)
    )
      continue;
    const p = structuredClone(pack),
      target = p.planets[0],
      c = p.characters.find((c) => c.id === item.character);
    p.regions.forEach((r) => (r.patrols = []));
    target.enemies = [{ enemy: p.enemies[0].id, count: 1, level: 1 }];
    p.enemies[0].hp = 100000;
    p.enemies[0].attack = 1;
    const s = newSave(p, Date.now(), "vfx-preview");
    s.storySeen = p.quests.filter((q) => !q.story).map((q) => q.id);
    s.roster = [
      { id: "vfx-review", definition: c.id, level: 20, hp: 1, resonance: 0 },
    ];
    s.roster[0].hp = stats(p, s.roster[0]).hp;
    s.team = [s.roster[0].id];
    s.region = target.region;
    s.x = target.x - 220;
    s.y = target.y;
    s.encounter = { planet: target.id, seed: 42 };
    const videoContext = await browser.newContext({
      viewport: { width: 1024, height: 768 },
      recordVideo: { dir: `${out}/raw`, size: { width: 1024, height: 768 } },
    });
    const page = await videoContext.newPage();
    page.setDefaultTimeout(20000);
    page.on("pageerror", (e) => errors.push(e.message));
    // Seed only the isolated test slot; the production slot is a sentinel.
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
          { marker: "vfx-preview-untouched" },
          "save:main",
        );
        await new Promise((resolve) => (tx.oncomplete = resolve));
        r.result.close();
      },
      { p, s },
    );
    await page.goto(server.url + "#/test");
    await page.waitForSelector("canvas", { timeout: 60000 });
    await page.locator(".squad-card img").evaluate((i) => i.decode());
    await page.waitForTimeout(800);
    await page.locator(".squad-card").click();
    await page.waitForSelector(".squad-card.skill-cooling");
    // Freeze through the real pause control before PNG encoding, which can take
    // longer than a short skill's entire lifetime on a shared cloud GPU.
    await page.evaluate(async () => {
      await new Promise((resolve) => setTimeout(resolve, 350));
      document.querySelector('.deck-nav [data-action="pause"]').click();
    });
    await page.locator("#space").screenshot({ path: `${out}/${item.key}.png` });
    await page.locator('.deck-nav [data-action="pause"]').click();
    await page.waitForTimeout(6200);
    const video = page.video();
    await videoContext.close();
    await video.saveAs(`${out}/${item.key}-full.webm`);
    results.push({
      ...item,
      viewport: "1024x768",
      skill: c.skill,
      effect: p.skills.find((s) => s.id === c.skill).actions,
      reviewStatus: "candidate",
      fixture:
        "one actual character with its original skill; one enemy with 100000HP/1ATK, no patrols",
      screenshot: `${out}/${item.key}.png`,
      video: `${out}/${item.key}-full.webm`,
      physicalDevice: false,
    });
    console.log("CAPTURED", item.key);
  }
  assert.deepEqual(errors, []);
  await writeFile(
    `${out}/capture.json`,
    JSON.stringify(
      {
        results,
        errors,
        note: "Real Game / Combat / Phaser renderer, not an independent animation mockup.",
      },
      null,
      2,
    ) + "\n",
  );
} finally {
  await browser.close();
  await server.close();
}
