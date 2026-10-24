import { test } from "node:test";
import assert from "node:assert/strict";
import { published as p } from "../src/content";
import {
  newSave,
  addCharacter,
  skillResearchGate,
  skillAtLevel,
} from "../src/domain/model";
import { apply } from "../src/domain/economy";
import { checkSave } from "../src/platform/storage";
import { Combat } from "../src/domain/combat";

test("skill research raises the formal skill level and lengthens source summon duration", () => {
  const venus = p.characters.find(
    (c) =>
      p.skills.find((s) => s.id === c.skill)?.actions?.[0]?.kind === "summon",
  )!;
  let s = newSave(p, 1);
  s.wallet = Object.fromEntries(p.resources.map((r) => [r.id, 1e6]));
  const owned = addCharacter(p, s, venus.id)!;
  s.team = [owned.id];
  assert.throws(
    () => apply(p, s, { type: "skill-research", owned: owned.id }, 1, "early"),
    /Lv4/,
  );
  const id = owned.id;
  const level = () => s.roster.find((v) => v.id === id)!.level;
  while (level() < skillResearchGate(3))
    s = apply(p, s, { type: "level", owned: id }, 1, `lv-${level()}`);
  s = apply(p, s, { type: "skill-research", owned: id }, 1, "sr-1");
  s = apply(p, s, { type: "skill-research", owned: id }, 1, "sr-2");
  const o = s.roster.find((v) => v.id === id)!;
  assert.equal(o.skillLevel, 3);
  assert.equal(checkSave(structuredClone(s), p).roster.find((v) => v.id === id)?.skillLevel, 3);

  const base = p.skills.find((sk) => sk.id === venus.skill)!;
  s.encounter = { planet: p.planets[0].id, kind: "planet", seed: 1 } as typeof s.encounter;
  const combat = new Combat(p, s, p.planets[0].id);
  const unit = combat.allies.find((u) => u.id === id)!;
  const live = combat.skillFor(unit)!;
  assert.deepEqual(live.actions, skillAtLevel(base, 3).actions);
  assert.ok(live.actions![0].duration! > base.actions![0].duration!);
});

test("old saves without skill level load at Lv1", () => {
  const s = newSave(p, 1) as unknown as { roster: Record<string, unknown>[] };
  for (const o of s.roster) delete o.skillLevel;
  const loaded = checkSave(s, p);
  assert.ok(loaded.roster.every((o) => (o.skillLevel ?? 1) === 1));
});
