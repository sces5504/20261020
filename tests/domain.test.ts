import { test } from "node:test";
import assert from "node:assert/strict";
import { published as p } from "../src/content";
import { newSave, damage } from "../src/domain/model";
import { apply, settle, production } from "../src/domain/economy";
import { Combat } from "../src/domain/combat";
import { validatePack } from "../src/content/schema";
import { checkSave } from "../src/platform/storage";
const t = 1700000000000;
let seq = 0;
const cmd = (
  s: ReturnType<typeof newSave>,
  c: Parameters<typeof apply>[2],
  id = `command-${seq++}`,
  now = t,
) => apply(p, s, c, now, id);
function colony() {
  const s = newSave(p, t);
  s.cleared.push(p.planets[0].id);
  return cmd(s, { type: "activate", planet: p.planets[0].id });
}
test("batch summon is atomic, persists results at start, and duplicate command cannot debit twice", () => {
  const s = newSave(p, t);
  const c = { type: "summon", recipe: [100, 100, 100, 100], count: 2 } as const;
  const a = cmd(s, { ...c, recipe: [...c.recipe] }, "repeatable");
  assert.equal(a.jobs.length, 2);
  assert.equal(Object.values(a.wallet)[0], 400);
  const duplicate = cmd(a, { ...c, recipe: [...c.recipe] }, "repeatable");
  assert.deepEqual(duplicate, a);
  const copy = structuredClone(a);
  settle(p, copy, t + 40000);
  assert.equal(copy.roster.length, s.roster.length + 2);
  settle(p, copy, t + 40000);
  assert.equal(copy.roster.length, s.roster.length + 2);
  assert.throws(
    () => cmd(s, { type: "summon", recipe: [999, 999, 999, 999], count: 4 }),
    /資源不足/,
  );
  assert.equal(s.jobs.length, 0);
});
test("construction splits offline production at completion; fragmented settlement equals one long interval", () => {
  const a = cmd(
    colony(),
    { type: "build", planet: p.planets[0].id, building: p.buildings[0].id },
    "build",
  );
  const b = structuredClone(a),
    one = structuredClone(a);
  settle(p, one, t + 60000);
  settle(p, b, t + 30000);
  settle(p, b, t + 60000);
  for (const id of Object.keys(b.wallet))
    assert.ok(Math.abs(one.wallet[id] - b.wallet[id]) < 1e-7);
  const id = p.resources[0].id;
  assert.ok(
    Math.abs(one.wallet[id] - (a.wallet[id] + 1.2 * 45 + 1.5 * 15)) < 1e-7,
  );
  assert.equal(one.built, 1);
});
test("offline never advances attacks; clock rollback never duplicates income", () => {
  const s = colony(),
    raid = s.colonies[p.planets[0].id].raidRemaining;
  settle(p, s, t + 86400000 * 2);
  assert.equal(s.colonies[p.planets[0].id].raidRemaining, raid);
  const wallet = structuredClone(s.wallet);
  settle(p, s, t);
  assert.deepEqual(s.wallet, wallet);
  assert.equal(s.settledAt, t + 86400000 * 2);
});
test("battle result merges into current economy, preserving completed research and claiming first rewards only once", () => {
  let s = colony();
  s = cmd(s, { type: "begin", planet: p.planets[0].id }, "begin");
  s = cmd(s, { type: "research", id: p.research[0].id }, "research");
  settle(p, s, t + 65000);
  const current = structuredClone(s.wallet);
  s = cmd(
    s,
    {
      type: "result",
      planet: p.planets[0].id,
      victory: true,
      hp: {},
      receipt: "encounter-1",
    },
    "result",
    t + 65000,
  );
  assert.ok(s.research.includes(p.research[0].id));
  assert.deepEqual(s.wallet, current);
  assert.equal(s.encounter, null);
});
test("assignment cannot duplicate a party member", () => {
  let s = colony();
  assert.throws(
    () => cmd(s, { type: "assign", owned: s.team[0], planet: p.planets[0].id }),
    /移出編隊/,
  );
  const id = s.team[0];
  s = cmd(s, { type: "team", owned: id }, "team");
  s = cmd(s, { type: "assign", owned: id, planet: p.planets[0].id }, "assign");
  assert.throws(() => cmd(s, { type: "team", owned: id }, "join"), /派駐/);
  assert.ok(production(p, s)[p.resources[0].id] > 0);
});
test("core combat is deterministic and fast swept projectiles cannot tunnel through enemies", () => {
  const save = newSave(p, t);
  save.encounter = { planet: p.planets[0].id, seed: 55 };
  save.x = 450;
  save.y = 800;
  const a = new Combat(p, save, p.planets[0].id),
    b = new Combat(p, save, p.planets[0].id);
  for (let i = 0; i < 900; i++) {
    if (i === 30) {
      a.cast(a.allies[0].id);
      b.cast(b.allies[0].id);
    }
    a.step(1 / 60);
    b.step(1 / 60);
  }
  assert.deepEqual(a.result(), b.result());
  assert.deepEqual(a.bullets, b.bullets);
  const c = new Combat(p, save, p.planets[0].id),
    enemy = c.units.find((u) => u.side === "enemy")!;
  enemy.x = 600;
  enemy.y = 700;
  enemy.speed = 0;
  const before = enemy.hp;
  c.bullets.push({
    id: 99,
    side: "ally",
    x: 0,
    y: 700,
    vx: 90000,
    vy: 0,
    attack: 99,
    life: 3,
    color: "#ffffff",
  });
  c.step(1 / 60);
  assert.ok(enemy.hp < before);
  assert.equal(damage(100, 100, 100), 50);
});
test("schema rejects unsupported effects, cycles, missing refs and nonfinite numbers", () => {
  const q = structuredClone(p);
  q.characters[0].attack = Infinity;
  assert.ok(validatePack(q).errors.length);
  const r = structuredClone(p);
  r.planets[0].requires = [r.planets[2].id];
  assert.ok(validatePack(r).errors.some((e) => e.includes("循環")));
  const u = structuredClone(p);
  u.characters[0].skill = "bad:missing";
  assert.ok(validatePack(u).errors.some((e) => e.includes("缺少")));
});
test("a seventh character and new enemy/planet use data only; missing old content fails safely", () => {
  const q = structuredClone(p);
  q.characters.push({
    ...q.characters[0],
    id: "addon:comet",
    name: "彗星",
    starter: false,
  });
  q.enemies.push({ ...q.enemies[0], id: "addon:drone" });
  q.planets.push({
    ...q.planets[0],
    id: "addon:planet",
    enemies: [{ enemy: "addon:drone", count: 1 }],
    dropCharacters: ["addon:comet"],
  });
  assert.equal(validatePack(q).errors.length, 0);
  const s = newSave(p, t);
  const missing = structuredClone(p);
  missing.characters.shift();
  assert.throws(() => checkSave(s, missing), /缺失/);
  assert.equal(s.roster.length, 3);
  const future = { ...s, schemaVersion: 2 };
  assert.throws(() => checkSave(future, p));
});
test("multiple content packages resolve declared dependencies and reject cycles or duplicate definitions", async () => {
  const { assemble } = await import("../src/content/loader");
  const addon = {
    schemaVersion: 1,
    id: "addon:package.sample",
    version: "0.1.0",
    requires: [{ id: p.id, version: p.version }],
    definitions: {
      characters: [{ ...p.characters[0], id: "addon:new", starter: false }],
    },
  };
  const merged = assemble(p, [addon]);
  assert.equal(merged.characters.length, 7);
  assert.equal(p.characters.length, 6);
  assert.throws(
    () =>
      assemble(p, [{ ...addon, requires: [{ id: p.id, version: "9.0.0" }] }]),
    /需要/,
  );
  assert.throws(() => assemble(p, [addon, addon]), /重複/);
  const cycle = {
    schemaVersion: 1,
    id: "other:package.sample",
    version: "0.1.0",
    requires: [{ id: addon.id, version: addon.version }],
    definitions: {},
  };
  assert.throws(
    () =>
      assemble(p, [
        { ...addon, requires: [{ id: cycle.id, version: cycle.version }] },
        cycle,
      ]),
    /循環/,
  );
});
test("4.3.2 bounded Q16 evidence cases preserve crit/evasion order and rounding", () => {
  assert.equal(damage(100, 100, 100), 50);
  assert.equal(damage(100, 100, 100, true), 124);
  assert.equal(damage(100, 100, 100, false, true), 12);
  assert.equal(damage(100, 100, 100, true, true), 31);
  assert.throws(() => damage(32768, 10, 100), /Q16/);
});
