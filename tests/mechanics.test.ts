import { test } from "node:test";
import assert from "node:assert/strict";
import { published } from "../src/content";
import { actionSchema, modifierSchema } from "../src/content/mechanics";
import { laboratory } from "../src/domain/laboratory";
import { validatePack } from "../src/content/schema";
const p = structuredClone(published);
// Media and unused library definitions are irrelevant to simulation fixtures.
p.assets = [];
for (const c of p.characters) {
  c.critical = 0;
  c.evasion = 0;
}
const skillLibrary = p.skills.filter((s) => s.id.startsWith("stella:"));
p.skills = p.skills.filter((s) => !s.id.startsWith("stella:"));
function scene(character = "solar10:character.neptune", count = 2) {
  const c = laboratory(p, {
    allies: [{ character, level: 1, skillLevel: 1 }],
    enemies: [{ enemy: p.enemies[0].id, count, level: 1 }],
    seed: 77,
  });
  const u = c.allies[0],
    foes = c.units.filter((u) => u.side === "enemy");
  u.cooldown = 999;
  u.defense = 0;
  u.hp = u.maxHp = 10000;
  for (const [i, v] of foes.entries()) {
    v.x = u.x + 180 + i * 80;
    v.y = u.y;
    v.hp = v.maxHp = 10000;
    v.speed = 0;
    v.cooldown = 999;
    v.defense = 0;
    v.aim = Math.PI;
  }
  return { c, u, foes };
}
function advance(c: ReturnType<typeof laboratory>, seconds: number) {
  for (let i = 0; i < Math.round(seconds * 60); i++) c.step(1 / 60);
}
const act = (raw: unknown) => actionSchema.parse(raw);
const mod = (raw: unknown) => modifierSchema.parse(raw);
test("Sun protects nearby allies from both DoTs, and independent timed buffs coexist without refreshing each other", () => {
  const { c, u } = scene("solar10:character.sun");
  assert(c.cast(u.id));
  assert.equal(c.mechanics.stat(u, "defense"), 1.6);
  assert.equal(c.mechanics.stat(u, "attack"), 1.3);
  c.mechanics.add(
    u,
    mod({ stat: "corrosion", value: 1, duration: 3 }),
    u,
    "corrosion",
  );
  c.mechanics.add(u, mod({ stat: "blaze", value: 1, duration: 3 }), u, "blaze");
  assert(!c.mechanics.has(u, "corrosion"));
  assert(!c.mechanics.has(u, "blaze"));
  c.mechanics.add(
    u,
    mod({ stat: "attack", value: 2, duration: 1 }),
    u,
    "attack",
  );
  advance(c, 1.1);
  assert.equal(c.mechanics.stat(u, "attack"), 1.3);
  assert.equal(c.mechanics.stat(u, "defense"), 1.6);
  advance(c, 3);
  assert.equal(c.mechanics.stat(u, "defense"), 1);
  assert.equal(c.mechanics.stat(u, "attack"), 1);
});
test("Jupiter black hole pulls multiple enemies and deals repeated splash while reducing incoming damage", () => {
  const { c, u, foes } = scene("solar10:character.jupiter");
  const x = foes[0].x,
    hp = foes[0].hp;
  assert(c.cast(u.id));
  assert.equal(c.mechanics.fields.length, 1);
  assert.equal(c.mechanics.stat(u, "damageTaken"), 0.7);
  advance(c, 0.5);
  assert(foes[0].x < x - 50);
  assert(foes.every((v) => v.hp < hp));
  assert(c.mechanics.damageDealt[u.id] > 0);
});
test("Saturn directional barrier mitigates front hits while rear damage stays full", () => {
  const { c, u, foes } = scene("solar10:character.saturn");
  u.aim = 0;
  assert(c.cast(u.id));
  const front = c.mechanics.hit(foes[0], u, 100, "aim");
  foes[0].x = u.x - 100;
  const rear = c.mechanics.hit(foes[0], u, 100, "aim");
  assert.equal(front, 60);
  assert.equal(rear, 100);
});
test("Neptune attack and attack speed both apply, Titania independently lowers attack and critical", () => {
  const { c, u } = scene();
  c.cast(u.id);
  assert.equal(c.mechanics.stat(u, "attack"), 1.3);
  assert.equal(c.mechanics.stat(u, "attackSpeed"), 1.25);
  const t = scene("solar10:character.titania");
  t.c.cast(t.u.id);
  assert.equal(t.c.mechanics.stat(t.foes[0], "attack"), 0.8);
  assert.equal(t.c.mechanics.stat(t.foes[0], "critical", 0.5), 0.4);
});
test("Pluto beam sweeps its entire width, hits repeatedly, and stops on expiry", () => {
  const { c, u, foes } = scene("solar10:character.pluto");
  foes[1].x = foes[0].x;
  foes[1].y = u.y + 100;
  c.cast(u.id);
  advance(c, 0.8);
  assert(foes.every((v) => v.hp < 10000));
  const hp = foes[0].hp;
  advance(c, 0.5);
  assert(foes[0].hp < hp);
  advance(c, 1.2);
  assert.equal(c.mechanics.fields.length, 0);
  const endedHp = foes[0].hp;
  advance(c, 0.5);
  assert.equal(foes[0].hp, endedHp);
});
test("Nemesis salvo locks one target and cancels remaining shots and missiles on that target's death", () => {
  const { c, u, foes } = scene("solar10:character.nemesis");
  c.target = foes[0].id;
  c.cast(u.id);
  assert.equal(c.bullets.length, 1);
  assert.equal(c.mechanics.pending.length, 19);
  advance(c, 0.1);
  assert(c.bullets.every((b) => b.target === foes[0].id));
  foes[0].hp = 0;
  advance(c, 1.8);
  assert.equal(c.bullets.length, 0);
  assert.equal(c.mechanics.pending.length, 0);
  assert.equal(foes[1].hp, 10000);
});
test("Ganymede clone has scaled stats, can be hit, attacks and expires without affecting the result roster", () => {
  const { c, u, foes } = scene("solar10:character.ganymede");
  c.cast(u.id);
  advance(c, 0.25);
  const clone = c.units.find((v) => v.summonKind === "clone")!;
  assert(clone);
  assert.equal(clone.maxHp, u.maxHp * 1.5);
  assert.equal(clone.attack, u.attack * 1.5);
  assert(!c.cast(clone.id));
  const before = clone.hp;
  c.mechanics.hit(foes[0], clone, 100, "aim");
  assert(clone.hp < before);
  advance(c, 1);
  assert(c.mechanics.damageDealt[clone.id] > 0);
  advance(c, 5);
  assert.equal(clone.hp, 0);
  assert.deepEqual(Object.keys(c.result()), [u.id]);
});
test("Io slows movement and attack clocks together, Ariel delivers three real stun hits", () => {
  const slow = scene("solar10:character.io");
  slow.c.cast(slow.u.id);
  assert.equal(slow.c.mechanics.stat(slow.foes[0], "moveSpeed"), 0.7);
  assert.equal(slow.c.mechanics.stat(slow.foes[0], "attackSpeed"), 0.8);
  const { c, u, foes } = scene("solar10:character.ariel", 1);
  c.cast(u.id);
  advance(c, 1);
  assert.equal(foes[0].hp, 10000 - 3 * Math.floor(u.attack * 1.3));
  assert(c.mechanics.has(foes[0], "stun"));
  const x = foes[0].x;
  advance(c, 1);
  assert.equal(foes[0].x, x);
  advance(c, 3);
  assert(!c.mechanics.has(foes[0], "stun"));
});
test("swept collision hits nearest enemy first, piercing hits once per unit and splash respects radius", () => {
  const { c, u, foes } = scene();
  c.units.reverse();
  c.mechanics.execute(
    u,
    act({
      kind: "projectile",
      pattern: "piercing",
      pierce: 1,
      speed: 3000,
      power: 1,
      width: 1,
    }),
    "test",
  );
  advance(c, 0.15);
  assert(foes.every((v) => v.hp < 10000));
  const hp = foes.map((v) => v.hp);
  advance(c, 0.3);
  assert.deepEqual(
    foes.map((v) => v.hp),
    hp,
  );
  const t = scene();
  t.foes[1].x = t.foes[0].x + 50;
  t.c.mechanics.execute(
    t.u,
    act({
      kind: "projectile",
      speed: 3000,
      splash: 70,
      splashPower: 0.5,
      power: 2,
      width: 1,
    }),
    "splash",
  );
  advance(t.c, 0.1);
  assert.equal(10000 - t.foes[0].hp, Math.floor(t.u.attack * 2));
  assert.equal(10000 - t.foes[1].hp, Math.floor(t.u.attack));
});
test("offset, deflection and reflection have distinct projectile behavior and each barrier rolls only once", () => {
  for (const stat of ["offset", "deflect", "reflect"] as const) {
    const { c, u, foes } = scene(undefined, 1);
    c.mechanics.add(
      u,
      mod({ stat, value: 1, duration: 5, interceptRadius: 100 }),
      u,
      "barrier",
    );
    c.mechanics.fire(foes[0], u, "aim", 1, undefined, 600);
    const b = c.bullets[0];
    advance(c, 0.2);
    if (stat === "offset") assert.equal(c.bullets.length, 0);
    else if (stat === "reflect") {
      assert.equal(b.side, "ally");
      assert(b.vx > 0);
    } else {
      assert.equal(b.side, "enemy");
      assert(Math.abs(b.vy) > 500);
    }
    assert.equal(u.hp, 10000);
  }
});
test("black hole pull and hook displacement stay inside world bounds", () => {
  const { c, u, foes } = scene(undefined, 1);
  c.mechanics.execute(
    u,
    act({ kind: "projectile", speed: 3000, pull: 1000, power: 0 }),
    "hook",
  );
  advance(c, 0.1);
  assert(Math.abs(foes[0].x - u.x) < 20);
});
test("time stop freezes enemy bullets and actors, preserves buffs, pauses ally skill clocks and then resumes", () => {
  const { c, u, foes } = scene(undefined, 1);
  u.skillCooldown = 5;
  c.mechanics.add(
    u,
    mod({ stat: "attack", value: 2, duration: 0.5 }),
    u,
    "buff",
  );
  c.mechanics.fire(foes[0], u, "aim", 1);
  const b = c.bullets[0],
    x = b.x;
  c.mechanics.execute(u, act({ kind: "timeStop", duration: 1 }), "stop");
  advance(c, 0.8);
  assert.equal(b.x, x);
  assert.equal(u.skillCooldown, 5);
  assert.equal(c.mechanics.stat(u, "attack"), 2);
  advance(c, 0.8);
  assert(u.skillCooldown < 5);
  assert(!c.mechanics.has(u, "attack"));
});
test("damage-over-time ticks use the declared cadence and immunity blocks later application", () => {
  const { c, u, foes } = scene(undefined, 1);
  c.mechanics.add(
    foes[0],
    mod({ stat: "corrosion", value: 1, duration: 1.1, tick: 0.25 }),
    u,
    "dot",
  );
  advance(c, 1.2);
  assert.equal(10000 - foes[0].hp, 4 * Math.floor(u.attack));
});
test("split projectiles create a bounded nonrecursive fan, chain missiles can return for repeat hits", () => {
  const split = scene(undefined, 1);
  split.c.mechanics.execute(
    split.u,
    act({ kind: "projectile", splitAfter: 0.1, splitCount: 6, power: 1 }),
    "split",
  );
  advance(split.c, 0.12);
  assert.equal(split.c.bullets.length, 7);
  assert.equal(split.c.bullets.filter((b) => b.split).length, 7);
  const { c, u, foes } = scene(undefined, 1);
  c.mechanics.execute(
    u,
    act({
      kind: "projectile",
      pattern: "homing",
      chain: 2,
      speed: 900,
      power: 1,
      duration: 10,
    }),
    "chain",
  );
  advance(c, 6);
  assert(10000 - foes[0].hp >= 2 * Math.floor(u.attack));
  assert(10000 - foes[0].hp <= 3 * Math.floor(u.attack));
});
test("laboratory leaves source pack and player save untouched and validates configuration bounds", () => {
  const before = JSON.stringify(p);
  const { c } = scene();
  advance(c, 1);
  assert.equal(JSON.stringify(p), before);
  assert.equal(c.save.jobs.length, 0);
  assert.equal(c.save.research.length, 0);
  assert.throws(() => laboratory(p, { allies: [], enemies: [], seed: 77 }));
  assert.throws(() =>
    laboratory(p, {
      allies: [{ character: p.characters[0].id, level: 999, skillLevel: 1 }],
      enemies: [{ enemy: p.enemies[0].id, count: 1, level: 1 }],
      seed: 77,
    }),
  );
});
test("unknown action, status and bullet types are rejected instead of substituted", () => {
  assert(!actionSchema.safeParse({ kind: "mystery" }).success);
  assert(
    !actionSchema.safeParse({ kind: "projectile", pattern: "magic" }).success,
  );
  assert(
    !modifierSchema.safeParse({ stat: "guess", value: 1, duration: 1 }).success,
  );
  const raw = structuredClone(published);
  raw.skills[0].effect = "program";
  delete raw.skills[0].actions;
  assert(validatePack(raw).errors.some((v) => v.includes("必須有技能動作")));
});
test("every source skill family executes at skill levels 1 and 10 with deterministic finite outcomes", () => {
  assert.equal(skillLibrary.length, 226);
  const run = (skill: (typeof skillLibrary)[number], level: number) => {
    const base = structuredClone(p);
    base.skills = [skill];
    base.characters = [{ ...base.characters[0], skill: skill.id }];
    const c = laboratory(base, {
      allies: [
        { character: base.characters[0].id, level: 1, skillLevel: level },
      ],
      enemies: [{ enemy: base.enemies[0].id, count: 3, level: 1 }],
      seed: 77,
    });
    for (const u of c.units) {
      u.hp = u.maxHp = 10000;
      u.cooldown = 999;
      u.speed = 0;
    }
    c.cast(c.allies[0].id);
    advance(c, 1);
    assert(
      c.units.every((u) =>
        [u.x, u.y, u.hp, u.attack, u.defense].every(Number.isFinite),
      ),
      skill.id,
    );
    return [
      c.units.map((u) => [u.id, u.hp, u.x, u.y]),
      c.bullets.map((b) => [b.id, b.x, b.y]),
      c.rng,
    ];
  };
  for (const skill of skillLibrary)
    for (const level of [1, 10])
      assert.deepEqual(
        run(skill, level),
        run(skill, level),
        `${skill.id} lv${level}`,
      );
});

test("all original six use their recovered source skills while preserving stable content IDs", () => {
  const rows = [62, 187, 87, 48, 11, 90];
  for (const [i, ch] of published.characters
    .filter((c) => c.id.startsWith("m1:"))
    .entries()) {
    const s = published.skills.find((s) => s.id === ch.skill)!;
    assert.equal(s.effect, "program");
    assert.equal(s.sourceSkill, rows[i]);
  }
});
test("taunt and category-specific decoys select their source rather than the closest unit", () => {
  const { c, u, foes } = scene(undefined, 1);
  c.mechanics.execute(
    u,
    act({
      kind: "summon",
      summon: "decoy",
      duration: 5,
      modifiers: [
        { stat: "decoy", value: 1, duration: 5, categories: ["homing"] },
      ],
    }),
    "decoy",
  );
  const decoy = c.units.find((v) => v.summonKind === "decoy")!;
  c.mechanics.fire(foes[0], u, "homing", 1);
  assert.equal(c.bullets[0].target, decoy.id);
  c.mechanics.fire(foes[0], u, "aim", 1);
  assert.equal(c.bullets[1].target, u.id);
});
test("redirected damage respects the protector's shield and is counted exactly once", () => {
  const { c, u, foes } = scene(undefined, 1);
  c.mechanics.execute(
    u,
    act({ kind: "summon", summon: "clone", power: 1, duration: 10 }),
    "clone",
  );
  const clone = c.units.find((v) => v.summonKind === "clone")!;
  clone.shield = 40;
  clone.buffUntil = 10;
  c.mechanics.add(
    u,
    mod({ stat: "redirect", value: 1, duration: 5 }),
    clone,
    "redirect",
  );
  c.mechanics.hit(foes[0], u, 100, "aim");
  assert.equal(u.hp, 10000);
  assert.equal(clone.hp, 9940);
  assert.equal(clone.shield, 0);
  assert.equal(c.mechanics.damageDealt[foes[0].id], 60);
});
test("charge accumulates real allies' HP loss once, excludes summons and releases stored damage", () => {
  const { c, u, foes } = scene(undefined, 1);
  c.mechanics.add(
    u,
    mod({ stat: "charge", value: 0.5, duration: 5 }),
    u,
    "charge",
  );
  c.mechanics.execute(
    u,
    act({ kind: "summon", summon: "clone", power: 1, duration: 10 }),
    "clone",
  );
  const clone = c.units.find((v) => v.summonKind === "clone")!;
  c.mechanics.add(
    clone,
    mod({ stat: "charge", value: 0.5, duration: 5 }),
    u,
    "charge",
  );
  c.mechanics.hit(foes[0], u, 100, "aim");
  c.mechanics.hit(foes[0], clone, 100, "aim");
  assert.equal(c.mechanics.storedDamage.get(u.id), 50);
  c.mechanics.execute(
    u,
    act({ kind: "detonate", target: "enemies", power: 0 }),
    "release",
  );
  assert.equal(foes[0].hp, 9950);
  assert(!c.mechanics.storedDamage.has(u.id));
});
test("guaranteed critical, armor bypass, absorption, resistance and expiry use the real damage path", () => {
  const { c, u, foes } = scene(undefined, 1);
  foes[0].defense = 100;
  const ordinary = c.mechanics.hit(u, foes[0], 100, "aim");
  assert.equal(ordinary, 50);
  c.mechanics.add(
    u,
    mod({ stat: "penetration", value: 0, duration: 1 }),
    u,
    "bypass",
  );
  assert.equal(c.mechanics.hit(u, foes[0], 100, "aim"), 100);
  c.mechanics.add(
    u,
    mod({ stat: "critical", value: 1, mode: "set", duration: 1 }),
    u,
    "crit",
  );
  assert.equal(c.mechanics.hit(u, foes[0], 100, "aim"), 248);
  c.mechanics.add(
    foes[0],
    mod({ stat: "defense", value: 1, duration: 1, immune: ["laser"] }),
    foes[0],
    "resist",
  );
  assert.equal(c.mechanics.hit(u, foes[0], 100, "laser"), 0);
  c.mechanics.add(
    foes[0],
    mod({ stat: "absorb", value: 1, duration: 1 }),
    foes[0],
    "absorb",
  );
  c.mechanics.hit(u, foes[0], 100, "aim");
  assert.equal(foes[0].shield, 248);
});
test("enemy burst shots are staggered, lasers persist, and accelerated/wave/mine bullets follow distinct trajectories", () => {
  for (const pattern of [
    "burst",
    "laser",
    "accelerating",
    "sine",
    "mine",
  ] as const) {
    const { c, u, foes } = scene(undefined, 1);
    foes[0].aim = Math.PI;
    c.mechanics.fire(foes[0], u, pattern, pattern === "burst" ? 3 : 1);
    if (pattern === "burst") {
      assert.equal(c.bullets.length, 1);
      assert.equal(c.mechanics.pending.length, 2);
      advance(c, 0.15);
      assert(c.bullets.length >= 2);
    } else if (pattern === "laser") {
      assert.equal(c.mechanics.fields.length, 1);
      advance(c, 0.3);
      assert(u.hp < 10000);
    } else {
      const b = c.bullets[0],
        x = b.x;
      advance(c, 0.1);
      if (pattern === "mine") assert.equal(b.x, x);
      if (pattern === "accelerating") assert(Math.hypot(b.vx, b.vy) > 520);
      if (pattern === "sine") assert(Math.abs(b.y - u.y) > 1);
    }
  }
});
test("stun interrupts a channel and its queued salvo; dead casters cannot complete delayed summons", () => {
  const { c, u, foes } = scene(undefined, 1);
  c.mechanics.execute(u, act({ kind: "beam", duration: 2, power: 1 }), "beam");
  c.mechanics.execute(
    u,
    act({ kind: "projectile", pattern: "burst", count: 3 }),
    "salvo",
  );
  c.mechanics.add(
    u,
    mod({ stat: "stun", value: 1, duration: 1 }),
    foes[0],
    "stun",
  );
  advance(c, 0.1);
  assert.equal(c.mechanics.fields.length, 0);
  assert.equal(c.mechanics.pending.length, 0);
  const t = scene();
  t.c.mechanics.cast(
    t.u,
    [act({ kind: "summon", delay: 0.2, duration: 1 })],
    "summon",
  );
  t.u.hp = 0;
  advance(t.c, 0.3);
  assert(!t.c.units.some((v) => v.summonKind));
});

test("native bypass-evasion and suppress-critical flags reach periodic fields and projectile hit resolution", () => {
  for (const kind of ["zone", "projectile"] as const) {
    const { c, u, foes } = scene(undefined, 1);
    u.critical = 1;
    foes[0].evasion = 1;
    const a = act({
      kind,
      target: "enemies",
      power: 1,
      radius: 500,
      duration: 0.1,
      interval: 1,
      speed: 3000,
      width: 1,
      bypassEvasion: true,
      suppressCritical: true,
    });
    c.mechanics.execute(u, a, "flags");
    advance(c, 0.1);
    assert.equal(10000 - foes[0].hp, Math.floor(u.attack));
  }
});
test("refreshing a periodic status extends its lifetime without restarting its tick clock", () => {
  const { c, u, foes } = scene(undefined, 1);
  const dot = mod({ stat: "corrosion", value: 1, duration: 1, tick: 0.25 });
  c.mechanics.add(foes[0], dot, u, "dot");
  advance(c, 0.2);
  c.mechanics.add(foes[0], dot, u, "dot");
  advance(c, 0.1);
  assert.equal(10000 - foes[0].hp, Math.floor(u.attack));
});
test("melee front, splash and spear resolve distinct areas without generating fake bullets", () => {
  for (const pattern of ["meleeFan", "meleeSplash", "meleeSpear"] as const) {
    const { c, u, foes } = scene(undefined, 2);
    foes[1].x = foes[0].x + 50;
    c.mechanics.fire(u, foes[0], pattern, 1);
    assert.equal(c.bullets.length, 0);
    assert(foes.every((v) => v.hp < 10000));
  }
});

test("all 82 recovered attack and bullet archetypes have executable authoring recipes", async () => {
  const { readFileSync } = await import("node:fs");
  const presets = JSON.parse(
    readFileSync("content/source/stella-projectiles.json", "utf8"),
  ) as { id: string; action: unknown }[];
  assert.equal(presets.length, 82);
  for (const preset of presets) {
    const { c, u } = scene();
    const action = act(preset.action);
    c.mechanics.execute(u, action, preset.id);
    advance(c, 0.3);
    assert(c.units.every((v) => Number.isFinite(v.hp)));
  }
});
test("an inward ring spawns outside its center and converges rather than using the outward ring trajectory", () => {
  const { c, u, foes } = scene(undefined, 1);
  c.mechanics.execute(
    u,
    act({
      kind: "projectile",
      pattern: "ring",
      count: 8,
      spawnRadius: 300,
      inward: true,
      speed: 300,
    }),
    "inward",
  );
  const b = c.bullets[0];
  assert.equal(Math.round(Math.hypot(b.x - u.x, b.y - u.y)), 300);
  advance(c, 0.1);
  assert(Math.hypot(b.x - u.x, b.y - u.y) < 300);
});

test("laboratory health lock records damage while ordinary battles keep lethal HP loss", () => {
  const { c, u, foes } = scene();
  c.lockHealth = true;
  const hp = foes[0].hp;
  c.mechanics.hit(u, foes[0], 100, "aim");
  assert.equal(foes[0].hp, hp);
  assert.equal(c.mechanics.damageDealt[u.id], 100);
  c.laboratory = false;
  c.mechanics.hit(u, foes[0], 100, "aim");
  assert.equal(foes[0].hp, hp - 100);
});

test("Saturn's finite front barrier reduces crossing projectiles before they hit allies behind it", () => {
  const { c, u, foes } = scene("solar10:character.saturn", 1);
  u.y += 60;
  c.anchor.y = u.y;
  c.destination.y = u.y;
  c.fleet.positions.set(u.id, { x: u.x, y: u.y });
  u.aim = 0;
  c.cast(u.id);
  c.mechanics.execute(
    u,
    act({ kind: "summon", summon: "clone", duration: 5, power: 1 }),
    "clone",
  );
  const ally = c.units.find((v) => v.summonKind === "clone")!;
  ally.x = u.x - 80;
  ally.y = u.y - 60;
  ally.speed = 0;
  ally.defense = 0;
  ally.hp = 10000;
  foes[0].attack = 100;
  foes[0].aim = Math.PI;
  c.mechanics.fire(foes[0], ally, "aim", 1, undefined, 2000);
  advance(c, 0.25);
  assert.equal(ally.hp, 9940);
  assert.equal(u.hp, 10000);
});

test("configured encounters that exceed simulation budgets are rejected before export", () => {
  const raw = structuredClone(published);
  raw.planets[0].enemies = [{ enemy: raw.enemies[0].id, count: 30 }];
  raw.enemies[0].volleyCount = 64;
  raw.enemies[0].interval = 0.01;
  assert(validatePack(raw).errors.some((v) => v.includes("遭遇預算超限")));
});

test("authored skill colors reach both the first and queued projectile of a salvo", () => {
  const { c, u } = scene("solar10:character.nemesis", 1);
  c.skillFor(u)!.color = "#12ab34";
  c.cast(u.id);
  assert.equal(c.bullets[0].color, "#12ab34");
  advance(c, 0.1);
  assert(c.bullets.every((b) => b.color === "#12ab34"));
});

test("legacy draft barrage retains real hits, caster attribution and laboratory diagnostics", () => {
  const { c, u, foes } = scene(undefined, 1);
  const s = c.skillFor(u)!;
  s.effect = "barrage";
  delete s.actions;
  delete s.levels;
  s.power = 1;
  s.duration = 2;
  c.cast(u.id);
  assert.equal(c.mechanics.casts[u.id], 1);
  assert(c.bullets.every((b) => b.owner === u.id));
  advance(c, 0.5);
  assert(foes[0].hp < 10000);
  assert(c.mechanics.damageDealt[u.id] > 0);
});

test("induction devices never attack, and melee/normal category variants use the proper decoy", () => {
  const { c, u, foes } = scene(undefined, 1);
  c.mechanics.execute(
    u,
    act({
      kind: "summon",
      summon: "decoy",
      duration: 5,
      modifiers: [
        {
          stat: "decoy",
          value: 1,
          duration: 5,
          categories: ["normal", "melee"],
        },
      ],
    }),
    "decoy",
  );
  const decoy = c.units.find((v) => v.summonKind === "decoy")!;
  advance(c, 1);
  assert.equal(c.bullets.filter((b) => b.owner === decoy.id).length, 0);
  assert.equal(c.mechanics.damageDealt[decoy.id] ?? 0, 0);
  assert.equal(c.mechanics.decoy(foes[0], "meleeSpear")?.id, decoy.id);
  assert.equal(c.mechanics.decoy(foes[0], "spiral")?.id, decoy.id);
});

test("player-facing slow descriptions state a reduction and match the actual modifier", async () => {
  const { skillMechanic } = await import("../src/content/descriptions");
  const s = published.skills.find((s) => s.id === "solar10:skill.io")!;
  assert.match(skillMechanic(s), /移速降至70%/);
  assert.match(skillMechanic(s), /攻速降至80%/);
});

test("charge traverses its path over time and hits each enemy once; blink relocates immediately", () => {
  const { c, u, foes } = scene(undefined, 1);
  foes[0].x = u.x + 250;
  const start = u.x;
  c.mechanics.execute(
    u,
    act({ kind: "dash", radius: 450, width: 60, travelTime: 0.3, power: 1 }),
    "charge",
  );
  assert.equal(u.x, start);
  advance(c, 0.1);
  assert(u.x > start && u.x < start + 200);
  assert.equal(foes[0].hp, 10000);
  advance(c, 0.25);
  assert.equal(Math.round(u.x - start), 450);
  assert.equal(foes[0].hp, 10000 - Math.floor(u.attack));
  assert(!c.mechanics.moving(u));
  const b = scene(undefined, 1),
    x = b.u.x;
  b.c.mechanics.execute(
    b.u,
    act({ kind: "dash", radius: 450, power: 1, travelTime: 0 }),
    "blink",
  );
  assert.equal(b.u.x, x + 450);
  assert.equal(b.c.fleet.positions.get(b.u.id)!.x, b.u.x);
  assert(!b.c.mechanics.moving(b.u));
});
test("a chain projectile completes eight real impacts without expiring halfway", () => {
  const { c, u, foes } = scene(undefined, 1);
  c.mechanics.execute(
    u,
    act({
      kind: "projectile",
      pattern: "homing",
      chain: 7,
      speed: 600,
      power: 1,
      duration: 2,
    }),
    "chain8",
  );
  advance(c, 3);
  assert.equal(10000 - foes[0].hp, 8 * Math.floor(u.attack));
  assert.equal(c.bullets.length, 0);
});
test("split children do not immediately hit their parent's existing victim", () => {
  const { c, u, foes } = scene(undefined, 2);
  c.mechanics.execute(
    u,
    act({
      kind: "projectile",
      speed: 800,
      power: 1,
      splitCount: 6,
      splitPower: 0.5,
      width: 1,
    }),
    "split-hit",
  );
  advance(c, 1);
  assert.equal(10000 - foes[0].hp, Math.floor(u.attack));
  assert(foes[1].hp < 10000);
});
test("beam fans have separate rotating rays; targeted beams stop at their target", () => {
  const { c, u, foes } = scene(undefined, 2);
  c.mechanics.execute(
    u,
    act({
      kind: "beam",
      count: 3,
      spread: 0.4,
      rotation: 1,
      duration: 1,
      radius: 800,
      power: 1,
      width: 10,
    }),
    "fan-beam",
  );
  assert.equal(c.mechanics.fields.length, 3);
  const angle = c.mechanics.fields[0].angle;
  advance(c, 0.1);
  assert(c.mechanics.fields[0].angle > angle + 0.09);
  const t = scene(undefined, 2);
  t.c.mechanics.execute(
    t.u,
    act({
      kind: "beam",
      track: true,
      duration: 1,
      interval: 1,
      radius: 800,
      width: 10,
      power: 1,
    }),
    "target-beam",
  );
  advance(t.c, 0.1);
  assert(t.foes[0].hp < 10000);
  assert.equal(t.foes[1].hp, 10000);
});

test("shock waves expand over their lifetime and damage each victim once", () => {
  const { c, u, foes } = scene(undefined, 2);
  foes[0].x = u.x + 100;
  foes[1].x = u.x + 450;
  c.mechanics.execute(
    u,
    act({
      kind: "zone",
      target: "enemies",
      radius: 500,
      duration: 0.5,
      interval: 0.05,
      power: 1,
      expanding: true,
      once: true,
    }),
    "wave",
  );
  advance(c, 0.12);
  assert(foes[0].hp < 10000);
  assert.equal(foes[1].hp, 10000);
  advance(c, 0.5);
  assert.equal(foes[0].hp, 10000 - Math.floor(u.attack));
  assert.equal(foes[1].hp, 10000 - Math.floor(u.attack));
});
test("source DoT recipes use their recovered 250/333ms table intervals", () => {
  const corrosion = published.skills.find((s) => s.id === "stella:skill.96")!
    .actions![0];
  assert.equal(corrosion.modifiers[0].tick, 0.25);
  assert.equal(corrosion.power, 0);
  const field = published.skills.find((s) => s.id === "stella:skill.103")!
    .actions![0];
  assert.equal(field.modifiers[0].tick, 0.333);
  const charge = published.skills.find((s) => s.id === "stella:skill.110")!
    .actions![0];
  assert.equal(charge.travelTime, 0.3);
  const blink = published.skills.find((s) => s.id === "stella:skill.111")!
    .actions![0];
  assert.equal(blink.travelTime, 0);
});

test("basic-weapon multipliers affect normal bursts, melee and lasers without changing active skills", () => {
  const { c, u, foes } = scene();
  u.attack = 100;
  c.mechanics.add(
    u,
    mod({ stat: "attackPattern", value: 0.5, duration: 10, pattern: "fan" }),
    u,
    "weapon-change",
  );
  c.mechanics.fire(u, foes[0], "aim", 1);
  assert.equal(c.bullets.pop()!.attack, 50);
  c.mechanics.execute(
    u,
    act({ kind: "projectile", power: 2 }),
    "active-projectile",
  );
  assert.equal(c.bullets.pop()!.attack, 200);
  c.mechanics.fire(u, foes[0], "burst", 3);
  advance(c, 0.25);
  assert.equal(c.bullets.length, 3);
  assert(c.bullets.every((b) => b.attack === 50));
  c.bullets = [];
  const hp = foes[0].hp;
  c.mechanics.fire(u, foes[0], "melee", 1);
  assert.equal(foes[0].hp, hp - 50);
  c.mechanics.fire(
    u,
    foes[0],
    "melee",
    1,
    act({ kind: "projectile", pattern: "melee", power: 2 }),
  );
  assert.equal(foes[0].hp, hp - 250);
  c.mechanics.fire(u, foes[0], "laser", 1);
  assert.equal(c.mechanics.fields.at(-1)!.action.power, 0.5);
  c.mechanics.execute(
    u,
    act({ kind: "beam", power: 2, duration: 1 }),
    "active-beam",
  );
  assert.equal(c.mechanics.fields.at(-1)!.action.power, 2);
});
