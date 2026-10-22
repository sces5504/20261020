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
  assert.equal(c.mechanics.stat(u, "attack"), 1);
  assert.equal(c.mechanics.stat(u, "defense"), 1.6);
  advance(c, 3);
  assert.equal(c.mechanics.stat(u, "defense"), 1);
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
