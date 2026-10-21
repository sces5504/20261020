import { test } from "node:test";
import assert from "node:assert/strict";
import { published as p } from "../src/content";
import { newSave } from "../src/domain/model";
import { apply, settle, production } from "../src/domain/economy";
import { validatePack } from "../src/content/schema";
const t = 1700000000000;
test("patrol rewards never liberate a planet; encounter cooldown prevents repeated farming", () => {
  let s = newSave(p, t);
  const v = p.regions[0].patrols[0];
  s = apply(p, s, { type: "patrol", id: v.id }, t, "patrol");
  const before = s.wallet[p.resources[0].id];
  s = apply(
    p,
    s,
    { type: "result", planet: v.id, victory: true, hp: {}, receipt: "roam-1" },
    t,
    "win",
  );
  assert.equal(s.cleared.length, 0);
  assert.equal(Object.keys(s.colonies).length, 0);
  assert.equal(
    s.wallet[p.resources[0].id],
    before + v.reward[p.resources[0].id],
  );
  assert.throws(
    () => apply(p, s, { type: "patrol", id: v.id }, t, "again"),
    /消散/,
  );
});
test("summon completion persists an acquisition screen queue once and confirmation is idempotent", () => {
  let s = apply(
    p,
    newSave(p, t),
    { type: "summon", recipe: [100, 100, 100, 100], count: 1 },
    t,
    "summon",
  );
  settle(p, s, t + 40000);
  assert.equal(s.acquisitionQueue.length, 1);
  const id = s.acquisitionQueue[0];
  settle(p, s, t + 50000);
  assert.equal(s.acquisitionQueue.length, 1);
  s = apply(p, s, { type: "ack-acquisition", id }, t + 50000, "ack");
  assert.equal(s.acquisitionQueue.length, 0);
  assert.equal(s.roster.length, 4);
});
test("new colonies noticeably expand scarce production; resources do not fill within minutes", () => {
  const s = newSave(p, t),
    first = p.planets[0],
    second = p.planets[1],
    metal = p.resources[2].id;
  assert.ok(p.resources.every((r) => r.initial < 300));
  for (const v of [first, second]) {
    s.cleared.push(v.id);
    s.colonies[v.id] = {
      active: true,
      lost: false,
      assigned: "",
      buildings: {},
      raidRemaining: 0,
    };
  }
  const both = production(p, s)[metal];
  delete s.colonies[second.id];
  const one = production(p, s)[metal];
  assert.ok(both / one >= 3 && both / one <= 6);
  assert.ok(first.production[p.resources[0].id] * 300 < 50);
});
test("additional waves and roaming definitions reject missing enemy references", () => {
  const q = structuredClone(p);
  q.planets[0].waves[0][0].enemy = "bad:missing";
  assert.ok(validatePack(q).errors.some((e) => e.includes("bad:missing")));
  const r = structuredClone(p);
  r.regions[0].patrols[0].enemies[0].enemy = "bad:patrol";
  assert.ok(validatePack(r).errors.some((e) => e.includes("bad:patrol")));
});

test("battle formation stays centered during horizontal movement instead of drifting down", async () => {
  const { Combat } = await import("../src/domain/combat");
  const s = newSave(p, t),
    c = new Combat(p, s, p.planets[0].id);
  assert.ok(Math.abs(c.center.y - s.y) < 0.001);
  for (let i = 0; i < 60; i++) {
    const pos = c.center;
    c.destination = { x: pos.x + 8, y: pos.y };
    c.step(1 / 60);
  }
  assert.ok(
    Math.abs(c.center.y - s.y) < 1,
    "WASD horizontal travel must preserve the fleet center",
  );
});
