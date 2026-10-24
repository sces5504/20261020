import { test } from "node:test";
import assert from "node:assert/strict";
import { published as p } from "../src/content";
import { newSave } from "../src/domain/model";
import { apply, production } from "../src/domain/economy";
import { validatePack } from "../src/content/schema";
import { checkSave } from "../src/platform/storage";
import { FleetMotion } from "../src/domain/formation";
import { Combat } from "../src/domain/combat";

test("quest supplies enable early upgrades/research and outweigh passive production; claims remain once only", () => {
  let s = newSave(p, 1);
  const intro = p.quests.find((q) => q.condition === "intro")!;
  s = apply(p, s, { type: "quest", id: intro.id }, 1, "intro-gift");
  const after = structuredClone(s.wallet);
  assert.throws(() =>
    apply(p, s, { type: "quest", id: intro.id }, 1, "another-claim"),
  );
  assert.deepEqual(
    apply(p, s, { type: "quest", id: intro.id }, 1, "intro-gift").wallet,
    after,
  );
  for (const id of s.team)
    for (let i = 0; i < 2; i++)
      s = apply(p, s, { type: "level", owned: id }, 1, `upgrade-${id}-${i}`);
  s = apply(
    p,
    s,
    { type: "research", id: p.research[0].id },
    1,
    "early-research",
  );
  assert.ok(Object.values(s.wallet).every((v) => v >= 0));
  s.colonies[p.planets[0].id] = {
    active: true,
    lost: false,
    buildings: {},
    assigned: "",
    raidRemaining: 0,
  };
  const rates = production(p, s);
  for (const q of p.quests.filter((q) => q.repeat !== "daily"))
    for (const r of p.resources)
      assert.ok(
        (q.reward[r.id] ?? 0) >= (rates[r.id] ?? 0) * 60 * 10,
        `${q.id}/${r.id}: meaningful 10+ minutes first-colony production`,
      );
});

test("rear members wait through a reversal, then follow after the captain passes; lag closes without jumps", () => {
  const f = new FleetMotion(1000, 1000, 0, ["tank", "rear", "support"], 106);
  for (let i = 0; i < 180; i++) f.advance({ x: 3000, y: 1000 }, 180, 1 / 60);
  const before = structuredClone([...f.positions]);
  for (let i = 0; i < 12; i++) f.advance({ x: 0, y: 1000 }, 180, 1 / 60);
  for (const [id, pos] of before.slice(1))
    assert.deepEqual(
      f.positions.get(id),
      pos,
      `${id} must wait rather than swing around`,
    );
  assert.equal(f.waiting.size, 2);
  for (let i = 0; i < 240; i++) {
    const prev = structuredClone([...f.positions]);
    f.advance({ x: 0, y: 1000 }, 180, 1 / 60);
    for (const [id, pos] of prev)
      assert.ok(
        Math.hypot(
          f.positions.get(id)!.x - pos.x,
          f.positions.get(id)!.y - pos.y,
        ) <=
          (180 * 2.2) / 60 + 0.001,
      );
  }
  assert.equal(f.waiting.size, 0);
  assert.ok(f.positions.get("tank")!.x + 60 < f.positions.get("rear")!.x);
  const rear = f.positions.get("support")!;
  rear.x += 450;
  const oldGap = Math.hypot(rear.x - f.anchor.x, rear.y - f.anchor.y);
  for (let i = 0; i < 180; i++) f.advance({ x: -1000, y: 1000 }, 180, 1 / 60);
  assert.ok(
    Math.hypot(rear.x - f.anchor.x, rear.y - f.anchor.y) < oldGap - 100,
    "straggler must catch up while captain moves",
  );
});

test("data-driven travel works both ways, persists position and keeps economy; locked/missing/battle routes reject atomically", () => {
  let s = newSave(p, 1);
  const first = p.regions[0],
    second = p.regions[1];
  s = apply(p, s, { type: "research", id: p.research[0].id }, 1, "job");
  const jobs = structuredClone(s.jobs),
    wallet = structuredClone(s.wallet);
  s = apply(p, s, { type: "travel", region: second.id }, 1, "outbound");
  assert.equal(s.region, second.id);
  assert.equal(s.x, second.startX);
  assert.equal(s.y, second.startY);
  assert.deepEqual(s.jobs, jobs);
  assert.deepEqual(s.wallet, wallet);
  assert.equal(checkSave(JSON.parse(JSON.stringify(s)), p).region, second.id);
  // Retain empty-region compatibility as a separate valid content fixture.
  const empty = structuredClone(p);
  empty.planets = empty.planets.filter((v) => v.region !== second.id);
  assert.ok(validatePack(empty).pack);
  const emptyArrival = apply(
    empty,
    newSave(empty, 1),
    { type: "travel", region: second.id },
    1,
    "empty",
  );
  assert.equal(checkSave(emptyArrival, empty).region, second.id);
  assert.equal(empty.planets.filter((v) => v.region === second.id).length, 0);
  assert.equal(second.patrols.length, 0);
  s = apply(p, s, { type: "travel", region: first.id }, 1, "return");
  assert.equal(s.region, first.id);
  assert.throws(() =>
    apply(p, s, { type: "travel", region: "test:absent" }, 1, "no"),
  );
  const locked = structuredClone(p);
  locked.regions[0].routes[0].requires = [p.planets[0].id];
  assert.throws(() =>
    apply(locked, s, { type: "travel", region: second.id }, 1, "locked"),
  );
  s.encounter = { planet: p.planets[0].id, seed: 1 };
  assert.throws(() =>
    apply(p, s, { type: "travel", region: second.id }, 1, "battle"),
  );
  const invalid = structuredClone(p);
  invalid.regions[0].routes[0].to = "test:missing";
  assert.equal(validatePack(invalid).pack, undefined);
});

test("enemies strafe while within firing range instead of freezing at their stopping radius", () => {
  const pack = structuredClone(p);
  for (const e of pack.enemies) {
    e.attack = 1;
    e.hp = 100000;
  }
  const s = newSave(pack, 1);
  s.x = 1000;
  s.y = 1000;
  s.encounter = { planet: p.planets[0].id, seed: 1 };
  const c = new Combat(pack, s, p.planets[0].id),
    e = c.units.find((u) => u.side === "enemy")!,
    a = c.allies[0];
  c.units = c.units.filter((u) => u.side === "ally" || u.id === e.id);
  e.x = a.x + e.range * 0.65;
  e.y = a.y;
  const start = { x: e.x, y: e.y };
  for (let i = 0; i < 120; i++) c.step(1 / 60);
  assert.ok(Math.hypot(e.x - start.x, e.y - start.y) > 20);
  assert.ok(
    c.bullets.length > 0 || c.sequence > 0,
    "movement must not disable normal attacks",
  );
});

test("results never hold back the next contact: a patrol in range engages at once", async () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", {
    value: { getItem: () => null },
    configurable: true,
  });
  try {
    const { Game } = await import("../src/application/game");
    const { patrolPosition } = await import("../src/domain/navigation");
    const s = newSave(p, 1),
      v = p.regions[0].patrols[0],
      pos = patrolPosition(v, 0);
    s.x = pos.x;
    s.y = pos.y;
    const g = new Game(p, "test", s),
      commands: unknown[] = [];
    g.command = async (c) => {
      commands.push(c);
    };
    g.step(1 / 60);
    assert.equal((commands[0] as { type: string }).type, "patrol");
  } finally {
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});
