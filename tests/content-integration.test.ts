import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { published as p } from "../src/content";
import { assemble } from "../src/content/loader";
import { newSave, addCharacter } from "../src/domain/model";
import { apply, settle, summonCandidates } from "../src/domain/economy";
import { Combat } from "../src/domain/combat";
import { checkSave } from "../src/platform/storage";
const base = JSON.parse(readFileSync("content/core/pack.json", "utf8"));
const manifest = JSON.parse(readFileSync("content/manifest.json", "utf8"));
const extensions = manifest.extensions.map((file: string) =>
  JSON.parse(readFileSync(`content/${file}`, "utf8")),
);

test("root presentation bindings resolve after additive packs, reject conflicts and cannot alter gameplay", () => {
  const region = p.regions.find((r) => r.id === "m1:frontier-test")!;
  assert.equal(p.characters.length, 32);
  assert.equal(
    p.planets.filter((v) => !v.id.startsWith("original:")).length,
    4,
  );
  assert.equal(region.background, "beacon:asset.frontier-v1");
  assert.equal(region.routes[0].to, "m1:helios");
  assert.equal(
    assemble(base, []).planets.length,
    3,
    "standalone core remains valid",
  );
  const bind = manifest.regionPresentation[0];
  assert.throws(() => assemble(base, extensions, [bind, bind]), /重複/);
  assert.throws(
    () => assemble(base, extensions, [{ ...bind, region: "missing:sector" }]),
    /缺失/,
  );
  assert.throws(() =>
    assemble(base, extensions, [{ ...bind, background: "missing:art" }]),
  );
  assert.throws(() => assemble(base, extensions, [{ ...bind, width: 1 }]));
});

test("all ten authored maidens remain actually summonable with the combined pool", () => {
  const characters = p.characters.filter((c) => c.id.startsWith("solar10:"));
  assert.equal(characters.length, 10);
  for (const c of characters) {
    assert(
      summonCandidates(p, c.recipe).some((v) => v.character.id === c.id),
      c.name,
    );
    let acquired = false;
    for (let seed = 1; seed <= 100 && !acquired; seed++) {
      let s = newSave(p, 0);
      s.rng = Math.imul(seed, 2654435761) >>> 0;
      s.wallet = Object.fromEntries(p.resources.map((r) => [r.id, 5000]));
      s = apply(
        p,
        s,
        { type: "summon", recipe: c.recipe, count: 1 },
        0,
        "summon",
      );
      const promised = s.jobs[0].payload;
      p.resources.forEach((r, i) =>
        assert.equal(s.wallet[r.id], 5000 - c.recipe[i]),
      );
      settle(p, s, p.rules.summonSeconds * 1000 + 1);
      assert(s.roster.some((o) => o.definition === promised));
      checkSave(s, p);
      acquired = s.roster.some((o) => o.definition === c.id);
    }
    assert(acquired, `actual acquisition: ${c.name}`);
  }
});

test("old second-sector save preserves position, colonies and committed summon results when both packs activate", () => {
  const core = assemble(base, []);
  let s = newSave(core, 1);
  s.wallet = Object.fromEntries(core.resources.map((r) => [r.id, 5000]));
  s.cleared = [core.planets[0].id];
  s.colonies[core.planets[0].id] = {
    active: true,
    lost: false,
    buildings: {},
    assigned: "",
    raidRemaining: 0,
  };
  s = apply(
    core,
    s,
    { type: "summon", recipe: core.characters[0].recipe, count: 1 },
    1,
    "old-job",
  );
  const promised = s.jobs[0].payload;
  s = apply(
    core,
    s,
    { type: "travel", region: "m1:frontier-test" },
    1,
    "outbound",
  );
  const before = structuredClone(s);
  const migrated = checkSave(JSON.parse(JSON.stringify(s)), p);
  assert.deepEqual(migrated, before);
  settle(p, migrated, core.rules.summonSeconds * 1000 + 2);
  assert(migrated.roster.some((o) => o.definition === promised));
  const home = apply(
    p,
    migrated,
    { type: "travel", region: "m1:helios" },
    migrated.settledAt,
    "return",
  );
  assert(home.colonies[core.planets[0].id].active);
  assert.equal(home.region, "m1:helios");
  assert.deepEqual(s, before, "migration leaves input untouched");
});

test("original skill programs expose the actual caster, stable ID and cooldown", () => {
  const s = newSave(p, 1);
  const sun = addCharacter(p, s, "solar10:character.sun")!;
  const mars = addCharacter(p, s, "m1:mars")!;
  s.team = [sun.id, mars.id];
  const battle = new Combat(p, s, p.planets[0].id);
  for (const u of battle.allies) {
    const skill = battle.skillFor(u)!;
    assert.equal(
      skill.id,
      u.def === "solar10:character.sun" ? "solar10:skill.sun" : "m1:armor",
    );
    assert(battle.cast(u.id));
    const flash = battle.flashes.at(-1)!;
    assert.equal(flash.sourceDefinition, u.def);
    assert.equal(flash.skillId, skill.id);
    if (u.def === "solar10:character.sun")
      assert.equal(battle.mechanics.stat(u, "defense"), 1.6);
    else assert.equal(battle.mechanics.stat(u, "defense"), 1.6 * 2.2);
    assert.equal(u.skillCooldown, skill.cooldown);
    assert(!battle.cast(u.id));
  }
});

test("character art bindings reject unknown targets, duplicate bindings and combat-field overrides", () => {
  const character = "solar10:character.sun";
  const binding = {
    character,
    portrait: base.characters[0].portrait,
    avatar: base.characters[0].avatar,
    sprite: base.characters[0].sprite,
  };
  const merged = assemble(base, extensions, [], [binding]);
  assert.equal(
    merged.characters.find((c) => c.id === character)!.portrait,
    binding.portrait,
  );
  assert.throws(
    () => assemble(base, extensions, [], [binding, binding]),
    /重複/,
  );
  assert.throws(
    () =>
      assemble(
        base,
        extensions,
        [],
        [{ ...binding, character: "missing:character" }],
      ),
    /缺失/,
  );
  assert.throws(() =>
    assemble(base, extensions, [], [{ ...binding, sprite: "missing:asset" }]),
  );
  assert.throws(() =>
    assemble(base, extensions, [], [{ ...binding, attack: 9999 }]),
  );
});
