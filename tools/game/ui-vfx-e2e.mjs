import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { chromium } from "../node_modules/playwright/index.mjs";
import { serveBuilt } from "./serve-built.mjs";
import { newSave, stats } from "../../src/domain/model.ts";
import { apply } from "../../src/domain/economy.ts";
import { vfxFamily } from "../../src/presentation/combat-vfx.ts";

const pack = JSON.parse(
  await readFile("content/generated/runtime.json", "utf8"),
);
const out = ".artifacts/ui-polish";
await mkdir(out, { recursive: true });
const server = await serveBuilt(),
  browser = await chromium.launch({ args: ["--no-sandbox"] });
const errors = [],
  results = [];
async function seed(page, p, s) {
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
        { marker: "ui-polish-main-untouched" },
        "save:main",
      );
      await new Promise((resolve) => (tx.oncomplete = resolve));
      r.result.close();
    },
    { p, s },
  );
  await page.goto(server.url + "#/test");
  await page.waitForSelector("canvas", { timeout: 60000 });
}
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
async function geometry(page) {
  await page.evaluate(() => {
    for (const el of document.querySelectorAll(
      ".story-scene, .story-line, .story-scene > .portrait",
    ))
      for (const a of el.getAnimations())
        if (a.effect?.getComputedTiming().iterations !== Infinity) a.finish();
  });
  const result = await page.evaluate(() => {
    const rect = (el) => el.getBoundingClientRect().toJSON();
    const story = document.querySelector(".story-scene");
    return {
      width: innerWidth,
      height: innerHeight,
      scroll: document.documentElement.scrollWidth,
      story: story
        ? Object.fromEntries(
            [
              ".story-chapter",
              ".story-line",
              ".story-box",
              ".story-controls",
            ].map((sel) => [sel, rect(story.querySelector(sel))]),
          )
        : null,
      buttons: [
        ...document.querySelectorAll(
          ".story-controls button, .deck-nav button, .modal-heading button",
        ),
      ].map((el) => rect(el)),
      canvas: document.querySelector("#space")
        ? rect(document.querySelector("#space"))
        : null,
      tools: document.querySelector(".battle-tools")
        ? rect(document.querySelector(".battle-tools"))
        : null,
    };
  });
  assert.ok(result.scroll <= result.width + 1, "no page horizontal overflow");
  if (result.story) {
    assert.ok(
      result.story[".story-line"].bottom <=
        result.story[".story-controls"].top + 1,
      "text clear of actions",
    );
    assert.ok(
      result.story[".story-controls"].bottom <= result.height,
      "story controls visible",
    );
    assert.ok(
      result.story[".story-chapter"].bottom < result.story[".story-box"].top,
      "separate title/dialogue areas",
    );
  }
  for (const b of result.buttons) {
    assert.ok(b.height >= 43, "44px touch height");
    assert.ok(
      b.left >= -1 && b.right <= result.width + 1,
      "button fits viewport",
    );
  }
  return result;
}
function quietSave(p) {
  const s = newSave(p, Date.now(), "ui-polish");
  s.storySeen = p.quests.filter((q) => !q.story).map((q) => q.id);
  s.wallet = Object.fromEntries(p.resources.map((r) => [r.id, 50000]));
  return s;
}
try {
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 390, height: 700 },
    { width: 320, height: 568 },
    { width: 844, height: 390 },
  ]) {
    if (
      process.env.UI_VIEWPORTS &&
      !process.env.UI_VIEWPORTS.split(",").includes(
        `${viewport.width}x${viewport.height}`,
      )
    )
      continue;
    const mobile = viewport.width < 800,
      name = `${viewport.width}x${viewport.height}`;
    const context = await browser.newContext({
      viewport,
      hasTouch: mobile,
      isMobile: mobile,
      deviceScaleFactor: mobile ? 2 : 1,
      recordVideo:
        process.env.UI_DETAILS_ONLY && viewport.width === 390
          ? { dir: `${out}/video`, size: viewport }
          : undefined,
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("dialog", (d) => {
      errors.push("native dialog");
      void d.dismiss();
    });
    const p = structuredClone(pack);
    p.regions.forEach((r) => (r.patrols = []));
    const close = () => page.locator('#overlay [data-action="close"]').click();
    if (!process.env.UI_DETAILS_ONLY) {
      await page.goto(server.url);
      await page.waitForSelector('[data-action="story-skip"]', {
        timeout: 60000,
      });
      await page.locator(".story-scene > img").evaluate((i) => i.decode());
      await geometry(page);
      await page.screenshot({ path: `${out}/${name}-dialogue.png` });
      const s = quietSave(p);
      await seed(page, p, s);
      const bridge = await geometry(page);
      if (mobile)
        assert.ok(
          bridge.canvas.bottom <= bridge.tools.top + 1,
          "controls never cover the canvas",
        );
      await page.screenshot({ path: `${out}/${name}-bridge.png` });
      const open = async (id) => {
        await page
          .locator(`.deck-nav [data-action="panel"][data-id="${id}"]`)
          .click();
        await page.waitForSelector(`.modal[data-panel="${id}"]`);
        await geometry(page);
      };
      await open("quests");
      assert.equal(
        await page.locator('[data-story-quest="chronicle:quest.01"]').count(),
        1,
      );
      await page.screenshot({ path: `${out}/${name}-chapters.png` });
      await page
        .locator(
          '[data-action="journal-chapter"][data-id="chronicle:chapter.solar"]',
        )
        .click();
      const next = page.locator('[data-story-quest="chronicle:quest.02"]');
      assert.match(await next.innerText(), /開放條件/);
      assert.match(await next.innerText(), /水晶/);
      assert.equal(
        await next.locator('[data-action="flow-open"]').isDisabled(),
        true,
      );
      await page
        .locator('[data-action="journal-tab"][data-id="daily"]')
        .click();
      assert.equal(await page.locator(".daily-quests article").count(), 7);
      assert.equal(
        await page.locator('.daily-quests [role="progressbar"]').count(),
        7,
      );
      await page.screenshot({ path: `${out}/${name}-daily.png` });
      await page
        .locator('[data-action="journal-tab"][data-id="voyage"]')
        .click();
      assert.ok(await page.locator('[data-action="story"]').count());
      await close();
      // Screens that share the visual system: functional opens, layout, artwork decode.
      if (viewport.width === 390 || viewport.width === 1440) {
        for (const id of [
          "roster",
          "summon",
          "research",
          "planets",
          "challenges",
          "formation",
        ]) {
          if (id === "formation") {
            await open("roster");
            await page
              .locator('.modal [data-action="panel"][data-id="formation"]')
              .first()
              .click();
            await geometry(page);
          } else await open(id);
          await page.screenshot({ path: `${out}/${name}-${id}.png` });
          await close();
        }
      }
    }
    if (viewport.width === 390 || viewport.width === 1440) {
      // The real author-provided chapter player, including single-actor scaling.
      const q = p.quests.find((q) => q.id === "chronicle:quest.02"),
        storySave = quietSave(p);
      storySave.story.completed = ["chronicle:quest.01"];
      storySave.storySeen.push("chronicle:quest.01");
      let started = apply(
        p,
        storySave,
        { type: "story-start", id: q.id },
        Date.now(),
        "ui-preview",
      );
      started.story.session.cursor = q.story.steps.findIndex(
        (step) => step.kind === "say" && step.actor,
      );
      await seed(page, p, started);
      await page
        .locator(".story-actor img")
        .first()
        .evaluate((i) => i.decode());
      await geometry(page);
      await page.screenshot({ path: `${out}/${name}-story.png` });
      // Long authored text stays scrollable with all controls outside its scroll box.
      const long = structuredClone(p),
        cursor = started.story.session.cursor;
      long.quests.find((v) => v.id === q.id).story.steps[cursor].text =
        "星海航行的紀錄，請保持通訊暢通。".repeat(150);
      // Fresh signature through the real domain initializer, then an explicit preview cursor.
      started = apply(
        long,
        storySave,
        { type: "story-start", id: q.id },
        Date.now(),
        "ui-long-preview",
      );
      started.story.session.cursor = cursor;
      await seed(page, long, started);
      await page.waitForFunction(
        () =>
          (document.querySelector(".story-line")?.textContent?.length ?? 0) >
          1000,
      );
      await geometry(page);
      await page.screenshot({
        path: `${out}/${name}-long-dialogue.png`,
        animations: "disabled",
      });
      const longGeometry = await page
        .locator(".story-line")
        .evaluate((el) => ({
          scroll: el.scrollHeight,
          client: el.clientHeight,
          length: el.textContent.length,
          box: el.getBoundingClientRect().toJSON(),
          scene: getComputedStyle(el.closest(".story-scene")).opacity,
          display: getComputedStyle(el).display,
        }));
      assert.ok(
        longGeometry.scroll > longGeometry.client,
        JSON.stringify(longGeometry),
      );
      await page.locator(".story-line").evaluate((el) => {
        el.scrollTop = 100;
        el.dataset.scrollProbe = "retained";
      });
      await page.waitForTimeout(1300);
      assert.ok(
        await page
          .locator(".story-line")
          .evaluate(
            (el) => el.dataset.scrollProbe === "retained" && el.scrollTop >= 99,
          ),
        "economy checkpoints preserve the reader's scroll position",
      );
      // Regression: finished-but-unclaimed prologue must not strand the user there.
      const completedSave = quietSave(p);
      completedSave.story.completed = [
        "chronicle:quest.01",
        "chronicle:quest.02",
      ];
      completedSave.storySeen.push(...completedSave.story.completed);
      await seed(page, p, completedSave);
      await page.locator('.deck-nav [data-id="quests"]').click();
      const claim = page.locator(
        '[data-action="quest"][data-id="chronicle:quest.02"]',
      );
      await claim.scrollIntoViewIfNeeded();
      await claim.click();
      await page.waitForFunction(
        () =>
          document.querySelector(
            '[data-action="quest"][data-id="chronicle:quest.02"]',
          )?.disabled,
      );
      const claimed = await record(page, "save:test");
      assert.ok(claimed.quests.includes("chronicle:quest.02"));
      await page
        .locator('[data-action="flow-replay"][data-id="chronicle:quest.02"]')
        .click();
      await page.waitForSelector('[data-action="flow-skip"]');
      await page.locator('[data-action="flow-skip"]').click();
      await page.waitForFunction(
        () => !document.querySelector('[data-action="flow-skip"]'),
      );
      assert.deepEqual(
        (await record(page, "save:test")).wallet,
        claimed.wallet,
      );
      await page.locator(".journal-shortcut").click();
      assert.equal(
        await page
          .locator('[data-action="quest"][data-id="chronicle:quest.01"]')
          .count(),
        1,
        "reward shortcut opens outstanding prologue",
      );
      await close();
      // Six-unit actual combat: cast, cooling state, full and low effects.
      const battlePack = structuredClone(p),
        battleSave = quietSave(battlePack),
        planet = battlePack.planets.find((v) => v.id === "m1:gaia");
      const target = planet ?? battlePack.planets.find((v) => v.enemies.length);
      battleSave.region = target.region;
      battleSave.x = target.x - 170;
      battleSave.y = target.y;
      battleSave.encounter = { planet: target.id, seed: 42 };
      battleSave.roster = [
        "m1:earth",
        "solar10:character.pluto",
        "solar10:character.jupiter",
        "m1:venus",
        "story10:character.izar",
        "solar10:character.nemesis",
      ]
        .map((id) => battlePack.characters.find((c) => c.id === id))
        .map((c, i) => {
          const o = {
            id: "visual-" + i,
            definition: c.id,
            level: 20,
            resonance: 0,
            hp: 1,
          };
          o.hp = stats(battlePack, o).hp;
          return o;
        });
      battleSave.team = battleSave.roster.map((o) => o.id);
      for (const e of battlePack.enemies) {
        e.hp = 50000;
        e.attack = 1;
      }
      await seed(page, battlePack, battleSave);
      for (let i = 0; i < 6; i++)
        await page.locator(".squad-card").nth(i).click();
      await page.waitForSelector(".squad-card.skill-cooling");
      await geometry(page);
      await page.waitForTimeout(200);
      await page.screenshot({ path: `${out}/${name}-combat.png` });
      await page.locator('.top-actions [data-id="archive"]').click();
      await page
        .getByRole("button", { name: "特效：完整", exact: true })
        .click();
      await close();
      await page.screenshot({ path: `${out}/${name}-combat-low.png` });
      if (process.env.UI_DETAILS_ONLY) await page.waitForTimeout(1200);
    }
    assert.deepEqual(await record(page, "save:main"), {
      marker: "ui-polish-main-untouched",
    });
    results.push({
      viewport,
      touch: mobile,
      physicalDevice: false,
      checks: process.env.UI_DETAILS_ONLY
        ? [
            "chapter-actor",
            "long-text-scroll",
            "six-real-skill-casts",
            "chapter-default-claim-replay",
            "reward-shortcut",
            "low-effects-toggle",
            "formal-save-isolated",
          ]
        : [
            "legacy-dialogue",
            "no-overflow",
            "safe-controls",
            "chapter-locks-rewards",
            "three-journal-tabs",
            "seven-dailies",
            "formal-save-isolated",
          ],
    });
    await writeFile(
      `${out}/${name}-receipt.json`,
      JSON.stringify(results.at(-1), null, 2) + "\n",
    );
    console.log("PASS", name);
    const video = page.video();
    await context.close();
    if (video) await video.saveAs(`${out}/${name}-preview.webm`);
  }
  assert.deepEqual(errors, []);
  const families = {};
  for (const s of pack.skills) (families[vfxFamily(s)] ??= []).push(s.id);
  await writeFile(
    `${out}/browser.json`,
    JSON.stringify(
      { results, families, errors, physicalDevice: false },
      null,
      2,
    ) + "\n",
  );
} finally {
  await browser.close();
  await server.close();
}
