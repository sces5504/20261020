import { test } from "node:test";
import assert from "node:assert/strict";
import { published as p } from "../src/content";
import { newSave, stats } from "../src/domain/model";
import { apply, settle, questReady } from "../src/domain/economy";
import { Combat } from "../src/domain/combat";
test("fresh campaign reaches the boss, starts production, resolves research and collects all six maidens", () => {
  let now = 1700000000000,
    s = newSave(p, now),
    n = 0;
  const cmd = (c: Parameters<typeof apply>[2]) =>
    (s = apply(p, s, c, now, `campaign-${n++}`));
  for (const v of p.planets) {
    for (const o of [...s.roster]) {
      if (s.team.includes(o.id)) cmd({ type: "level", owned: o.id });
      const current = s.roster.find((v) => v.id === o.id)!;
      if (current.hp < stats(p, current).hp) cmd({ type: "heal", owned: o.id });
    }
    now += 30000;
    settle(p, s, now);
    cmd({ type: "begin", planet: v.id });
    const battle = new Combat(p, s, v.id);
    battle.autoSkills = true;
    for (let tick = 0; tick < 12000 && !battle.ended; tick++) {
      const e = battle.units
        .filter((u) => u.side === "enemy" && u.hp > 0)
        .sort(
          (a, b) =>
            Math.hypot(a.x - battle.center.x, a.y - battle.center.y) -
            Math.hypot(b.x - battle.center.x, b.y - battle.center.y),
        )[0];
      if (e)
        battle.destination = {
          x: e.x - 240 + Math.cos(tick / 80) * 90,
          y: e.y + Math.sin(tick / 80) * 130,
        };
      battle.step(1 / 60);
    }
    assert.ok(battle.victory, v.name + " must be beatable");
    now += battle.time * 1000;
    cmd({
      type: "result",
      planet: v.id,
      victory: true,
      hp: battle.result(),
      receipt: `encounter-${n++}`,
    });
    cmd({ type: "activate", planet: v.id });
    if (v.id === p.planets[0].id) {
      cmd({ type: "build", planet: v.id, building: p.buildings[0].id });
      cmd({ type: "research", id: p.research[0].id });
    }
    for (const q of p.quests)
      if (!s.quests.includes(q.id) && questReady(s, q))
        cmd({ type: "quest", id: q.id });
  }
  now += 100000;
  settle(p, s, now);
  assert.equal(s.cleared.length, 3);
  assert.equal(Object.values(s.colonies).filter((c) => c.active).length, 3);
  assert.equal(new Set(s.roster.map((o) => o.definition)).size, 6);
  assert.ok(s.research.includes(p.research[0].id));
  assert.equal(s.built, 1);
  assert.ok(Object.values(s.wallet).every((n) => n >= 0));
});
test("training combat never edits its input save and ally normal attacks are disabled", () => {
  const s = newSave(p, 1),
    original = structuredClone(s),
    c = new Combat(p, s, p.planets[0].id, true);
  for (let i = 0; i < 180; i++) c.step(1 / 60);
  assert.deepEqual(s, original);
  assert.ok(c.bullets.every((b) => b.side === "enemy"));
  assert.ok(c.units.every((u) => u.side === "ally" || u.hp === u.maxHp));
});
test("retired or summon-disabled maidens leave the summon pool without deleting owned instances", async () => {
  const { summonCandidates } = await import("../src/domain/economy");
  const q = structuredClone(p),
    s = newSave(q, 1);
  q.characters[0].summonable = false;
  assert.ok(
    !summonCandidates(q, q.characters[0].recipe).some(
      (v) => v.character.id === q.characters[0].id,
    ),
  );
  assert.ok(s.roster.some((v) => v.definition === q.characters[0].id));
});
