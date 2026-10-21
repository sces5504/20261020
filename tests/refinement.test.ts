import { test } from "node:test";
import assert from "node:assert/strict";
import { published as p } from "../src/content";
import { newSave, addCharacter, stats } from "../src/domain/model";
import { apply, settle } from "../src/domain/economy";
import { Combat } from "../src/domain/combat";
import { FleetMotion } from "../src/domain/formation";
import { guardianPositions, patrolPosition } from "../src/domain/navigation";
import { validatePack } from "../src/content/schema";
import { stars } from "../src/presentation/common";
const t = 1700000000000;
test("five deliberate feeds raise stats, preserve identity, add one purple star and cannot repeat a consumed transaction", () => {
  let s = newSave(p, t);
  const id = s.team[0],
    target = s.roster[0],
    base = stats(p, target);
  for (let i = 0; i < 5; i++) {
    const copy = addCharacter(p, s, target.definition)!;
    s = apply(
      p,
      s,
      { type: "feed", target: id, source: copy.id },
      t,
      "feed-" + i,
    );
    assert.equal(s.roster.find((o) => o.id === id)!.resonance, i + 1);
    assert.ok(!s.roster.some((o) => o.id === copy.id));
    assert.deepEqual(
      apply(
        p,
        s,
        { type: "feed", target: id, source: copy.id },
        t,
        "feed-" + i,
      ),
      s,
    );
  }
  const master = s.roster.find((o) => o.id === id)!;
  assert.equal(stats(p, master).hp, Math.round(base.hp * 1.1));
  assert.ok(Math.abs(stats(p, master).attack - base.attack * 1.1) < 1e-8);
  assert.ok(stars(p.characters[0], master).includes("awakened-star"));
  const count = s.roster.length;
  assert.equal(addCharacter(p, s, master.definition), null);
  assert.equal(s.roster.length, count);
  assert.equal(s.duplicateConversions, 1);
});
test("feeding rejects party, trained, wrong-definition and same-instance sources without mutating the save", () => {
  let s = newSave(p, t);
  const id = s.team[0];
  const source = addCharacter(p, s, s.roster[0].definition)!;
  source.level = 2;
  const before = structuredClone(s);
  assert.throws(
    () =>
      apply(
        p,
        s,
        { type: "feed", target: id, source: source.id },
        t,
        "trained",
      ),
    /已培養/,
  );
  assert.deepEqual(s, before);
  assert.throws(
    () => apply(p, s, { type: "feed", target: id, source: id }, t, "self"),
    /另一位/,
  );
  assert.throws(
    () =>
      apply(
        p,
        s,
        { type: "feed", target: id, source: s.team[1] },
        t,
        "different",
      ),
    /相同/,
  );
  source.level = 1;
  s.team = [source.id, ...s.team.slice(1)];
  assert.throws(
    () =>
      apply(p, s, { type: "feed", target: id, source: source.id }, t, "party"),
    /編隊/,
  );
});
test("post-cap summons refund the actual four-resource recipe at one quarter, once, including fractional amounts", () => {
  const pack = structuredClone(p);
  pack.characters.forEach((c, i) => (c.summonable = i === 0));
  let s = newSave(pack, t);
  s.roster[0].resonance = 5;
  for (const r of pack.resources) s.wallet[r.id] = 2000;
  const recipe = [101, 203, 307, 409];
  const before = { ...s.wallet };
  s = apply(pack, s, { type: "summon", recipe, count: 2 }, t, "batch");
  settle(pack, s, t + pack.rules.summonSeconds * 1000 + 1);
  for (const [i, r] of pack.resources.entries())
    assert.equal(
      s.wallet[r.id],
      before[r.id] - recipe[i] * 2 + recipe[i] * 0.25 * 2,
    );
  assert.equal(s.duplicateConversions, 2);
  assert.equal(s.roster.length, 3);
  assert.deepEqual(s.acquisitionQueue, []);
  const once = structuredClone(s.wallet);
  settle(pack, s, t + 100000);
  assert.deepEqual(s.wallet, once);
});
test("consumption never reuses an owned identity and existing copies remain after another reaches the cap", () => {
  let s = newSave(p, t),
    id = s.team[0];
  const old = addCharacter(p, s, s.roster[0].definition)!;
  const second = addCharacter(p, s, s.roster[0].definition)!;
  s = apply(p, s, { type: "feed", target: id, source: old.id }, t, "once");
  const next = addCharacter(p, s, s.roster[0].definition)!;
  assert.notEqual(next.id, old.id);
  assert.ok(s.roster.some((o) => o.id === second.id));
});
test("followers turn along their travel history in all directions without position jumps; order determines the leader", () => {
  const f = new FleetMotion(2000, 2000, 0, ["tank", "support", "gunner"], 106);
  for (const [dx, dy] of [
    [1, 0],
    [0, 1],
    [-1, 0],
    [0, -1],
  ]) {
    const dest = { x: f.anchor.x + dx * 900, y: f.anchor.y + dy * 900 };
    for (let tick = 0; tick < 300; tick++) {
      const old = new Map([...f.positions].map(([id, p]) => [id, { ...p }]));
      f.advance(dest, 180, 1 / 60);
      for (const [id, p] of f.positions)
        assert.ok(
          Math.hypot(p.x - old.get(id)!.x, p.y - old.get(id)!.y) <=
            (180 * 2.2) / 60 + 0.01,
          "no teleport on turns",
        );
    }
    const front = f.positions.get("tank")!;
    for (const id of ["support", "gunner"]) {
      const back = f.positions.get(id)!;
      assert.ok(
        (front.x - back.x) * dx + (front.y - back.y) * dy > 60,
        "leader is physically in front along travel direction",
      );
    }
  }
  const before = { ...f.positions.get("gunner")! };
  f.setMembers(["gunner", "support", "tank"]);
  assert.deepEqual(f.positions.get("gunner"), before);
});
test("ambient guardians and a single encounter share exact spawn positions; leaving the arena resets without liberation", () => {
  const s = newSave(p, t),
    v = p.planets[0];
  s.x = v.x - v.engageRadius + 20;
  s.y = v.y;
  const c = new Combat(p, s, v.id);
  const guards = guardianPositions(v);
  assert.equal(c.waveGroups.length, 1);
  assert.deepEqual(
    c.units.filter((u) => u.side === "enemy").map((u) => ({ x: u.x, y: u.y })),
    guards.map((u) => ({ x: u.x, y: u.y })),
  );
  c.units.find((u) => u.side === "enemy")!.hp = 1;
  c.anchor.x = v.x + v.leashRadius + 10;
  c.anchor.y = v.y;
  c.destination = { ...c.anchor };
  for (let i = 0; i < Math.ceil(v.resetSeconds * 60) + 1; i++) c.step(1 / 60);
  assert.equal(c.reset, true);
  assert.equal(c.victory, false);
  assert.deepEqual(s.cleared, []);
  const restarted = new Combat(p, s, v.id);
  assert.ok(
    restarted.units
      .filter((u) => u.side === "enemy")
      .every((u) => u.hp === u.maxHp),
  );
});
test("legacy waves are folded into one enemy group and invalid leash ordering is rejected", () => {
  const raw = structuredClone(p);
  raw.planets[0].waves = [[{ enemy: raw.enemies[0].id, count: 2 }]];
  const oldCount = raw.planets[0].enemies.reduce((n, g) => n + g.count, 0);
  const out = validatePack(raw).pack!;
  assert.equal(out.planets[0].waves.length, 0);
  assert.equal(
    out.planets[0].enemies.reduce((n, g) => n + g.count, 0),
    oldCount + 2,
  );
  raw.planets[0].leashWarningRadius = raw.planets[0].leashRadius;
  assert.ok(validatePack(raw).errors.some((e) => e.includes("依序增加")));
});
test("hits expose side-specific feedback without altering the damage rules", () => {
  const s = newSave(p, t),
    v = p.planets[0];
  s.x = v.x - 300;
  s.y = v.y;
  const c = new Combat(p, s, v.id);
  const ally = c.allies[0],
    enemy = c.units.find((u) => u.side === "enemy")!;
  c.bullets.push({
    id: 999,
    side: "enemy",
    x: ally.x,
    y: ally.y,
    vx: 0,
    vy: 0,
    attack: 20,
    life: 1,
    color: "#ff7777",
  });
  c.bullets.push({
    id: 1000,
    side: "ally",
    x: enemy.x,
    y: enemy.y,
    vx: 0,
    vy: 0,
    attack: 20,
    life: 1,
    color: "#77ffff",
  });
  c.step(1 / 60);
  assert.ok(ally.hurtUntil > c.time);
  assert.ok(enemy.hurtUntil > c.time);
  assert.ok(c.flashes.some((f) => f.side === "ally"));
  assert.ok(c.flashes.some((f) => f.side === "enemy"));
});
test("nearby patrols trigger even during the former global grace period; unthreatened travel is faster", async () => {
  const old = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", {
    value: { getItem: () => null },
    configurable: true,
  });
  try {
    const { Game } = await import("../src/application/game");
    const s = newSave(p, t),
      r = p.regions[0],
      v = r.patrols[0],
      pos = patrolPosition(v, 0);
    s.x = pos.x;
    s.y = pos.y;
    const g = new Game(p, "test", s),
      commands: unknown[] = [];
    g.command = async (c) => {
      commands.push(c);
    };
    g.safeUntil = 99999;
    g.step(1 / 60);
    assert.equal((commands[0] as { type: string }).type, "patrol");
    const quiet = newSave(p, t);
    quiet.x = 100;
    quiet.y = 100;
    const q = new Game(p, "test", quiet);
    assert.equal(q.movementSpeed, p.rules.cruiseSpeed);
    assert.ok(q.movementSpeed > g.movementSpeed);
  } finally {
    if (old) Object.defineProperty(globalThis, "localStorage", old);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});
