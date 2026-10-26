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
  assert.equal(s.acquisitionQueue.length, 0, "waits for the player to open it");
  s = apply(p, s, { type: "summon-claim" }, t + 40000, "claim");
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
  q.planets[0].waves = [[{ enemy: "bad:missing", count: 1 }]];
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

test("sub-five-unit keyboard steps move living allies in combat, and movement stops at release", async () => {
  const { Combat } = await import("../src/domain/combat");
  const s = newSave(p, t),
    c = new Combat(p, s, p.planets[0].id);
  const start = c.allies.map((u) => ({ x: u.x, y: u.y }));
  for (let i = 0; i < 90; i++) {
    c.destination = { x: c.anchor.x + 190 / 60, y: c.anchor.y };
    c.step(1 / 60);
  }
  c.allies.forEach((u, i) =>
    assert.ok(
      u.x > start[i].x + 180,
      "each ally must actually move, not only the camera",
    ),
  );
  // 01/02 are abreast vanguards; the third member is the first rear slot.
  const captain = c.allies[0],
    rear = c.allies[2];
  const enemy = c.units
    .filter((u) => u.side === "enemy" && u.hp > 0)
    .sort(
      (a, b) =>
        Math.hypot(a.x - captain.x, a.y - captain.y) -
        Math.hypot(b.x - captain.x, b.y - captain.y),
    )[0];
  const facing = Math.atan2(enemy.y - captain.y, enemy.x - captain.x);
  assert.ok(
    (captain.x - rear.x) * Math.cos(facing) +
      (captain.y - rear.y) * Math.sin(facing) >
      30,
    "vanguards hold the threat-facing side during a strafe",
  );
  assert.ok(
    Math.hypot(c.allies[1].x - c.allies[2].x, c.allies[1].y - c.allies[2].y) >
      60,
    "rear slots remain separated",
  );
  const at = c.anchor.x;
  for (let i = 0; i < 60; i++) c.step(1 / 60);
  assert.ok(c.anchor.x - at < 4, "released input must stop the fleet anchor");
});
test("patrols travel within bounds and detect at their visible position, with configurable radius", async () => {
  const { patrolPosition } = await import("../src/domain/navigation");
  const v = p.regions[0].patrols[0],
    a = patrolPosition(v, 0),
    b = patrolPosition(v, 4);
  assert.ok(Math.hypot(a.x - b.x, a.y - b.y) > 50);
  for (let t = 0; t < 300; t++) {
    const pos = patrolPosition(v, t);
    assert.ok(Math.abs(pos.x - v.x) <= v.patrolRadius + 0.001);
    assert.ok(Math.abs(pos.y - v.y) <= v.patrolRadius * 0.62 + 0.001);
  }
  assert.ok(v.detectionRadius >= 260);
  const q = structuredClone(p);
  q.regions[0].patrols[0].patrolRadius = 500;
  q.regions[0].patrols[0].x = 10;
  assert.ok(validatePack(q).errors.some((x) => x.includes("路線超出")));
});
test("formation order persists, changes the front unit, and cannot be edited in combat", () => {
  let s = newSave(p, t),
    original = [...s.team];
  s = apply(
    p,
    s,
    { type: "reorder-team", owned: original[1], direction: -1 },
    t,
    "reorder",
  );
  assert.equal(s.team[0], original[1]);
  assert.deepEqual(new Set(s.team), new Set(original));
  s = apply(p, s, { type: "begin", planet: p.planets[0].id }, t, "begin");
  assert.throws(
    () =>
      apply(
        p,
        s,
        { type: "reorder-team", owned: original[1], direction: 1 },
        t,
        "bad",
      ),
    /遭遇結束/,
  );
});

test("shipped expansion example assembles against the current core and all new visual references validate", async () => {
  const { readFile } = await import("node:fs/promises");
  const { assemble } = await import("../src/content/loader");
  const example = JSON.parse(
    await readFile("content/extensions/comet.example.json", "utf8"),
  );
  const full = assemble(p, [example]);
  assert.equal(full.characters.length, p.characters.length + 1);
  const q = structuredClone(p);
  q.buildings[0].sprite = "bad:building";
  q.quests[0].background = "bad:background";
  q.regions[0].background = "bad:cosmos";
  const errors = validatePack(q).errors;
  for (const id of ["bad:building", "bad:background", "bad:cosmos"])
    assert.ok(errors.some((e) => e.includes(id)));
});

test("foreground fixed-step clock preserves elapsed time across slow frames and discards paused or hidden time", async () => {
  const { SimulationClock } = await import(
    "../src/application/simulation-clock"
  );
  const run = (frames: number[]) => {
    const c = new SimulationClock();
    let ticks = 0;
    c.advance(0, false, () => ticks++);
    for (const ms of frames) c.advance(ms, false, () => ticks++);
    return ticks;
  };
  assert.equal(run([500, 500]), 60);
  assert.equal(run(Array(10).fill(100)), 60);
  const c = new SimulationClock();
  let ticks = 0;
  c.advance(0, false, () => ticks++);
  c.advance(500, true, () => ticks++);
  assert.equal(ticks, 0);
  c.reset();
  c.advance(60000, false, () => ticks++);
  assert.equal(ticks, 0, "visibility resume must discard the hidden interval");
  c.advance(100, false, () => ticks++);
  assert.equal(ticks, 6);
  c.advance(20000, false, () => ticks++);
  assert.equal(
    ticks,
    66,
    "foreground stalls remain bounded to 60 catch-up steps",
  );
});

test("ordinary asynchronous autosave does not freeze foreground navigation; explicit panels still pause", async () => {
  const descriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "localStorage",
  );
  Object.defineProperty(globalThis, "localStorage", {
    value: { getItem: () => null },
    configurable: true,
  });
  try {
    const { Game } = await import("../src/application/game");
    const g = new Game(p, "test:clock", newSave(p, t));
    const x = g.x;
    g.busy = true;
    g.movement = { x: 1, y: 0 };
    g.step(1 / 60);
    assert.ok(
      g.x > x,
      "an in-flight routine save must not discard movement time",
    );
    const moved = g.x;
    g.pause.add("panel");
    g.step(1 / 60);
    assert.equal(g.x, moved);
  } finally {
    if (descriptor)
      Object.defineProperty(globalThis, "localStorage", descriptor);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});
