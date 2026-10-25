import { test } from "node:test";
import assert from "node:assert/strict";
import { published as p } from "../src/content";
import { newSave, addCharacter } from "../src/domain/model";
import {
  apply,
  settle,
  questReady,
  summonCandidates,
} from "../src/domain/economy";
import { questClaimed, questProgress } from "../src/domain/daily-quests";
import { checkSave } from "../src/platform/storage";
import { FleetMotion } from "../src/domain/formation";
import { Combat } from "../src/domain/combat";
import { rosterGroups } from "../src/presentation/roster-groups";
const midnight = Date.parse("2026-10-23T15:00:00Z"); // KST midnight / Taiwan 23:00

test("daily events, claim, midnight, clock rollback and old saves keep an atomic ledger", () => {
  const q = p.quests.find((q) => q.condition === "leveled")!;
  let s = newSave(p, midnight - 10000);
  s.wallet = Object.fromEntries(p.resources.map((r) => [r.id, 5000]));
  const event = { type: "level" as const, owned: s.team[0] };
  s = apply(p, s, event, midnight - 9000, "level");
  assert.equal(questProgress(s, q, midnight - 8000), 1);
  assert(questReady(s, q, midnight - 8000));
  s = apply(p, s, { type: "quest", id: q.id }, midnight - 8000, "claim");
  const wallet = { ...s.wallet };
  assert(questClaimed(s, q, midnight - 8000));
  assert.deepEqual(
    apply(p, s, { type: "quest", id: q.id }, midnight - 8000, "claim").wallet,
    wallet,
  );
  assert.throws(() =>
    apply(p, s, { type: "quest", id: q.id }, midnight - 8000, "claim-again"),
  );
  assert.equal(questProgress(s, q, midnight), 0);
  assert(!questReady(s, q, midnight));
  s = apply(p, s, event, midnight + 1, "next-day-level");
  s = apply(p, s, { type: "quest", id: q.id }, midnight + 2, "next-day-claim");
  assert.throws(() =>
    apply(p, s, { type: "quest", id: q.id }, midnight - 1, "rollback-claim"),
  );
  s = apply(p, s, event, midnight - 1, "rollback-event");
  assert.equal(s.dailyTasks[q.id].period, "2026-10-24");
  const old = JSON.parse(JSON.stringify(newSave(p, 1)));
  delete old.dailyTasks;
  assert.deepEqual(checkSave(old, p).dailyTasks, {});
});

test("offline job completion belongs to its completion day, and settlement cannot count twice", () => {
  const q = p.quests.find(
    (q) => q.repeat === "daily" && q.condition === "summoned",
  )!;
  let s = newSave(p, midnight - 100000);
  s.wallet = Object.fromEntries(p.resources.map((r) => [r.id, 5000]));
  s = apply(
    p,
    s,
    { type: "summon", recipe: p.characters[0].recipe, count: 1 },
    midnight - 100000,
    "summon",
  );
  assert(s.jobs[0].ends < midnight);
  settle(p, s, midnight + 5000);
  s = apply(p, s, { type: "summon-claim" }, midnight + 5000, "claim");
  assert.equal(questProgress(s, q, midnight - 1), 1);
  assert.equal(questProgress(s, q, midnight + 1), 0);
  settle(p, s, midnight + 6000);
  assert.equal(questProgress(s, q, midnight - 1), 1);
});

test("battle receipt counts actual wins once, excludes loss and reset, and event victory advances both tasks", () => {
  const q = p.quests.find((q) => q.condition === "battleWon")!;
  const event = p.planets.find((v) => v.kind === "event")!;
  for (const [victory, reset, expected] of [
    [true, false, 1],
    [false, false, 0],
    [true, true, 0],
  ] as const) {
    let s = newSave(p, midnight);
    s.encounter = { planet: event.id, seed: 77 };
    const result = {
      type: "result" as const,
      planet: event.id,
      victory,
      reset,
      hp: {},
      receipt: "win",
    };
    s = apply(p, s, result, midnight + 1, "result");
    assert.equal(questProgress(s, q, midnight + 1), expected);
    assert.equal(
      questProgress(
        s,
        p.quests.find((v) => v.condition === "eventWon")!,
        midnight + 1,
      ),
      expected,
    );
    assert.deepEqual(
      apply(p, s, result, midnight + 1, "result").dailyTasks,
      s.dailyTasks,
    );
  }
});

test("duplicate grouping keeps a single card and retains developed, deployed and stationed instances", () => {
  const s = newSave(p, 1),
    original = s.roster[0];
  const copy = addCharacter(p, s, original.definition)!;
  copy.level = 5;
  const group = rosterGroups(s).find(
    (g) => g.primary.definition === original.definition,
  )!;
  assert.equal(group.primary.id, original.id);
  assert.equal(group.copies.length, 2);
  assert(group.copies.includes(copy));
  assert.equal(
    rosterGroups(s).length,
    new Set(s.roster.map((o) => o.definition)).size,
  );
});

test("story ten and updated Jupiter bind unique art without changing character identity or summon access", () => {
  const chars = p.characters.filter((c) => c.id.startsWith("story10:"));
  assert.equal(chars.length, 10);
  for (const c of chars) {
    for (const field of ["portrait", "avatar", "sprite"] as const)
      assert(p.assets.some((a) => a.id === c[field]));
    assert(summonCandidates(p, c.recipe).some((v) => v.character.id === c.id));
    assert.equal(
      p.skills.find((s) => s.id === c.skill)?.sourceSkill,
      Number(c.skill.split(".").at(-1)),
    );
  }
  assert.equal(
    p.characters.filter((c) => c.id === "solar10:character.jupiter").length,
    1,
  );
  assert.match(
    p.characters.find((c) => c.id === "solar10:character.jupiter")!.portrait,
    /20261023/,
  );
});

test("combat strafe and reversal translate the cluster immediately around a threat-facing captain", () => {
  const f = new FleetMotion(1000, 1000, 0, ["captain", "rear", "support"], 106);
  const threat = { x: 3000, y: 1000 };
  for (let i = 0; i < 180; i++) f.advanceGuarded(f.anchor, 180, 1 / 60, threat);
  for (const direction of [1, -1]) {
    const before = structuredClone([...f.positions]);
    f.advanceGuarded(
      { x: f.anchor.x, y: f.anchor.y + direction * 1000 },
      180,
      1 / 60,
      threat,
    );
    for (const [id, pos] of before) {
      const after = f.positions.get(id)!;
      assert(
        direction * (after.y - pos.y) > 2.8,
        `${id} dodges on the first frame`,
      );
      assert(
        Math.hypot(after.x - pos.x, after.y - pos.y) <=
          (180 * 2.2) / 60 + 0.001,
      );
      if (id !== "captain") {
        const captain = f.positions.get("captain")!;
        // Original-style cluster: flanks and rear around the captain, never ahead of her.
        assert(after.x < captain.x - 10);
        assert(Math.hypot(after.x - captain.x, after.y - captain.y) < 106 * 1.8);
      }
    }
  }
});

test("a real aimed enemy projectile reaches the captain before aligned rear members", () => {
  const s = newSave(p, 1);
  s.x = 1000;
  s.y = 1000;
  const c = new Combat(p, s, p.planets[0].id);
  c.laboratory = true;
  const enemy = c.units.find((u) => u.side === "enemy")!;
  c.units = [...c.allies, enemy];
  enemy.x = 1500;
  enemy.y = 1000;
  enemy.speed = 0;
  enemy.cooldown = 1e6;
  enemy.skillCooldown = 1e6;
  c.allies.forEach((u) => {
    u.cooldown = 1e6;
    u.skillCooldown = 1e6;
    u.evasion = 0;
  });
  for (let i = 0; i < 180; i++) c.step(1 / 60);
  const hp = c.allies.map((u) => u.hp),
    captain = c.allies[0];
  c.bullets.push({
    id: 999,
    side: "enemy",
    owner: enemy.id,
    x: captain.x + 250,
    y: captain.y,
    vx: -350,
    vy: 0,
    attack: 50,
    life: 3,
    color: "#f00",
  });
  for (let i = 0; i < 100; i++) c.step(1 / 60);
  assert(c.allies[0].hp < hp[0]);
  c.allies.slice(1).forEach((u, i) => assert.equal(u.hp, hp[i + 1]));
});

test("new ten cast their original skills at Lv1/10 through the same combat runtime", async () => {
  const { laboratory } = await import("../src/domain/laboratory");
  for (const character of p.characters.filter((c) =>
    c.id.startsWith("story10:"),
  )) {
    for (const skillLevel of [1, 10]) {
      const battle = laboratory(p, {
        allies: [{ character: character.id, level: 1, skillLevel }],
        enemies: [{ enemy: p.enemies[0].id, level: 1, count: 2 }],
        seed: 77,
        lockHealth: true,
      });
      const caster = battle.allies[0];
      caster.cooldown = 999;
      battle.units
        .filter((u) => u.side === "enemy")
        .forEach((u, i) => {
          u.x = caster.x + 180 + i * 40;
          u.y = caster.y;
          u.cooldown = 999;
          u.skillCooldown = 999;
          u.speed = 0;
          u.evasion = 0;
          u.maxHp = u.hp = 100000;
        });
      assert(battle.cast(caster.id));
      assert(!battle.cast(caster.id));
      for (let i = 0; i < 30; i++) battle.step(1 / 60);
      const source = p.skills.find(
        (s) => s.id === character.skill,
      )!.sourceSkill!;
      if (source === 85)
        assert.equal(
          battle.units.filter((u) => u.summonKind === "drone").length,
          4,
        );
      if (source === 58)
        assert(battle.mechanics.stat(caster, "directional") < 1);
      if ([16, 27, 32, 35].includes(source))
        assert(battle.mechanics.stat(caster, "attack") > 1);
      if (source === 9)
        assert(battle.mechanics.stat(caster, "attackSpeed") > 1);
      if (source === 39)
        assert(
          battle.mechanics.stat(caster, "critical", character.critical) >= 0.95,
        );
      if ([102, 113].includes(source))
        assert((battle.mechanics.damageDealt[caster.id] ?? 0) > 0);
    }
  }
});

test("daily healing, construction and upgrades count completed jobs rather than payment or cancelled work", () => {
  const now = midnight + 1000;
  let s = newSave(p, now);
  s.wallet = Object.fromEntries(p.resources.map((r) => [r.id, 5000]));
  const planet = p.planets[0],
    building = p.buildings[0];
  s.colonies[planet.id] = {
    active: true,
    lost: false,
    assigned: "",
    buildings: {},
    raidRemaining: 0,
  };
  s.roster[0].hp = 1;
  s = apply(p, s, { type: "heal", owned: s.roster[0].id }, now, "heal-start");
  const healing = p.quests.find((q) => q.condition === "healed")!;
  assert.equal(questProgress(s, healing, now), 0);
  settle(p, s, now + p.rules.healSeconds * 1000 + 1);
  assert.equal(questProgress(s, healing, s.settledAt), 1);
  let at = s.settledAt;
  s = apply(
    p,
    s,
    { type: "build", planet: planet.id, building: building.id },
    at,
    "build-start",
  );
  settle(p, s, at + building.seconds * 1000 + 1);
  const constructed = p.quests.find((q) => q.condition === "constructed")!,
    upgraded = p.quests.find((q) => q.condition === "upgraded")!;
  assert.equal(questProgress(s, constructed, s.settledAt), 1);
  assert.equal(questProgress(s, upgraded, s.settledAt), 0);
  at = s.settledAt;
  s = apply(
    p,
    s,
    { type: "build", planet: planet.id, building: building.id },
    at,
    "upgrade-start",
  );
  settle(p, s, at + building.seconds * 1000 + 1);
  assert.equal(questProgress(s, upgraded, s.settledAt), 1);
  const before = structuredClone(s.dailyTasks);
  settle(p, s, s.settledAt + 1);
  assert.deepEqual(s.dailyTasks, before);
});
