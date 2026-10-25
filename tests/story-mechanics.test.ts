import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { assemble } from "../src/content/loader";
import { validatePack } from "../src/content/schema";
import { newSave, type Save } from "../src/domain/model";
import { apply } from "../src/domain/economy";
import { Combat, type Unit } from "../src/domain/combat";
import { checkSave } from "../src/platform/storage";

const base = JSON.parse(readFileSync("content/core/pack.json", "utf8"));
const demo = JSON.parse(
  readFileSync("content/examples/story-mechanics-demo.json", "utf8"),
);
const p = assemble(base, [demo]);
let seq = 0;
const run = (s: Save, c: Parameters<typeof apply>[2], id = `t-${++seq}`) =>
  apply(p, s, c, 1000, id);
const battle = (s: Save, planet: string) => {
  const v = p.planets.find((x) => x.id === planet)!;
  s.region = v.region;
  s.x = v.x - 120;
  s.y = v.y;
  s.encounter = { planet, seed: 7, cues: [] };
  const c = new Combat(p, s, planet);
  c.laboratory = true;
  return c;
};

test("demo pack validates, unknown fields are rejected and references are checked", () => {
  assert.equal(p.facilities.length, 2);
  const broken = structuredClone(demo);
  broken.definitions.planets[0].storyEncounter.shields[0].hits = 3;
  assert.throws(() => assemble(base, [broken]), /hits|Unrecognized/);
  const missing = structuredClone(demo);
  missing.definitions.planets[0].storyEncounter.shields[0].units = ["demo:actor.nobody"];
  assert.throws(() => assemble(base, [missing]), /缺少演員/);
  const wrongTag = structuredClone(demo);
  wrongTag.definitions.facilities[0].effect.jams = ["kinetic"];
  assert.throws(() => assemble(base, [wrongTag]), /找不到標籤/);
  const badTrigger = structuredClone(demo);
  badTrigger.definitions.planets[0].storyEncounter.triggers[0].at = 3;
  assert.throws(() => assemble(base, [badTrigger]), /恰好一種觸發門檻/);
  assert.ok(validatePack(p).pack);
});

test("shield: ranged energy is blocked layer by layer, melee passes, jammer opens a timed window, then it restores", () => {
  const s = newSave(p, 0);
  const c = battle(s, "demo:planet.shield-trial");
  const warden = c.units.find((u) => u.id === "demo:actor.warden")!;
  const earth = c.allies[0];
  const before = warden.hp;
  // Ranged hits are cancelled but wear down the layers (3 x 400 capacity).
  assert.equal(c.mechanics.hit(earth, warden, 200, "aim", [], true), 0);
  assert.equal(warden.hp, before);
  assert.match(c.story!.hints()[0].text, /三重護盾生效 · 3\/3層/);
  // Melee is not blocked by this shield's configured categories.
  assert.ok(c.mechanics.hit(earth, warden, 200, "melee", [], true) > 0);
  // Captain holds position at the jammer for its channel time → window opens.
  const jammer = c.units.find((u) => u.id === "demo:place.jammer")!;
  for (const u of c.allies) {
    c.fleet.positions.set(u.id, { x: jammer.x, y: jammer.y });
    u.x = jammer.x;
    u.y = jammer.y;
  }
  c.destination = { x: jammer.x, y: jammer.y };
  c.fleet.anchor.x = jammer.x;
  c.fleet.anchor.y = jammer.y;
  for (let i = 0; i < 120 && c.story!.shields.get("demo:shield.triple")!.status === "up"; i++)
    c.story!.step(1 / 60), (c.time += 1 / 60);
  const shield = c.story!.shields.get("demo:shield.triple")!;
  assert.equal(shield.status, "suspended");
  assert.ok(c.story!.hints().some((h) => /受干擾 · 突破窗口 8 秒/.test(h.text)));
  assert.equal(c.story!.activated["demo:facility.jammer"], 1);
  const hp = warden.hp;
  assert.ok(c.mechanics.hit(earth, warden, 200, "aim", [], true) > 0);
  assert.ok(warden.hp < hp);
  // Window expiry restores the shield (layers refilled by default).
  c.time += 8.01;
  c.story!.step(0);
  assert.equal(shield.status, "up");
  assert.equal(shield.layers, 3);
  // Breaking all layers drops it; restoreAfter brings it back.
  for (let i = 0; i < 6 && shield.status === "up"; i++)
    c.mechanics.hit(earth, warden, 400, "laser", [], true);
  assert.equal(shield.status, "down");
  c.time += 10.01;
  c.story!.step(0);
  assert.equal(shield.status, "up");
  // Data trigger: warden below 50% re-enables (already up → stays up, refilled).
  warden.hp = warden.maxHp * 0.4;
  c.story!.step(0);
  assert.equal(shield.layers, 3);
});

test("facility: built by a real transaction once, defended across a battle, defeat restores, destruction fails, story removes it", () => {
  let s = newSave(p, 0);
  s.wallet = { "m1:crystal": 100, "m1:gas": 0, "m1:metal": 100, "m1:ether": 0 };
  assert.throws(() => run(s, { type: "facility-build", facility: "demo:facility.barricade" }), /沒有要求/);
  s = run(s, { type: "story-start", id: "demo:quest.defense" });
  // Skipping dialogue still stops at the facility gate.
  s = run(s, { type: "story-next", skip: true });
  assert.equal(s.story.session?.cursor, 1);
  s = run(s, { type: "facility-build", facility: "demo:facility.barricade" }, "build-1");
  assert.deepEqual(s.facilities["demo:facility.barricade"], { hp: 3000, destroyed: false });
  assert.equal(s.wallet["m1:metal"], 40);
  // Reload/replay of the same command never charges twice; a second build is refused.
  s = run(s, { type: "facility-build", facility: "demo:facility.barricade" }, "build-1");
  assert.equal(s.wallet["m1:metal"], 40);
  assert.throws(() => run(s, { type: "facility-build", facility: "demo:facility.barricade" }), /已建成|沒有要求/);
  s = run(s, { type: "story-next" });
  assert.equal(p.quests.find((q) => q.id === "demo:quest.defense")!.story!.steps[s.story.session!.cursor].kind, "encounter");
  // Battle: facility spawns from the save; destroying it fails a required placement.
  const lost = structuredClone(s);
  const c = battle(lost, "demo:planet.defense-line");
  const tower = c.units.find((u) => u.id === "demo:place.barricade") as Unit;
  assert.equal(tower.hp, 3000);
  tower.hp = 0;
  c.step(1 / 60);
  assert.equal(c.ended, true);
  assert.equal(c.victory, false);
  // retry=restore: the defeat result does not carry the damage into the retry.
  lost.encounter = { planet: "demo:planet.defense-line", seed: 7, cues: [] };
  const after = run(lost, {
    type: "result",
    planet: "demo:planet.defense-line",
    victory: false,
    hp: c.result(),
    receipt: "encounter-lost",
    ...c.facilityResults(),
  });
  assert.deepEqual(after.facilities["demo:facility.barricade"], { hp: 3000, destroyed: false });
  // Victory keeps the battle's facility HP and continues the story.
  const won = structuredClone(s);
  const c2 = battle(won, "demo:planet.defense-line");
  const t2 = c2.units.find((u) => u.id === "demo:place.barricade")!;
  t2.hp = 1800;
  won.encounter = { planet: "demo:planet.defense-line", seed: 7, cues: [] };
  won.story.session!.waiting = "demo:planet.defense-line";
  const done = run(won, {
    type: "result",
    planet: "demo:planet.defense-line",
    victory: true,
    hp: c2.result(),
    receipt: "encounter-won",
    ...c2.facilityResults(),
  });
  // The story's facility step removed it after the win (chapter-scoped cleanup).
  assert.equal(done.facilities["demo:facility.barricade"], undefined);
  assert.ok(done.storySeen.includes("demo:quest.defense") || done.story.session);
});

test("battle-scoped facilities reset every battle and old saves load without facilities", () => {
  const s = newSave(p, 0);
  const a = battle(structuredClone(s), "demo:planet.shield-trial");
  a.units.find((u) => u.id === "demo:place.jammer")!.hp = 10;
  const b = battle(structuredClone(s), "demo:planet.shield-trial");
  assert.equal(b.units.find((u) => u.id === "demo:place.jammer")!.hp, 2400);
  assert.deepEqual(b.facilityResults().facilities, {});
  const legacy = structuredClone(s) as Partial<Save>;
  delete legacy.facilities;
  assert.deepEqual(checkSave(legacy, p).facilities, {});
});

test("defend: a built turret really fires and holding the line until the time limit wins", () => {
  const s = newSave(p, 0);
  s.facilities = { "demo:facility.barricade": { hp: 3000, destroyed: false } };
  for (const o of s.roster) o.level = 30;
  const c = battle(s, "demo:planet.defense-line");
  c.autoSkills = true;
  for (let i = 0; i < 60 * 40 && !c.ended; i++) c.step(1 / 60);
  assert.equal(c.ended, true);
  assert.equal(c.victory, true);
  assert.ok((c.mechanics.damageDealt["demo:place.barricade"] ?? 0) > 0, "turret dealt damage");
  const r = c.facilityResults();
  assert.equal(r.facilities!["demo:facility.barricade"].destroyed, false);
});
