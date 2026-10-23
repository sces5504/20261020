import { test } from "node:test";
import assert from "node:assert/strict";
import { storyFixture } from "../tools/story/fixture.mjs";
import { newSave, addCharacter } from "../src/domain/model";
import { apply, questReady } from "../src/domain/economy";
import { Combat } from "../src/domain/combat";
import { checkSave } from "../src/platform/storage";
import { conditionSchema } from "../src/content/story";
import { validatePack } from "../src/content/schema";
import {
  conditionMet,
  storyAvailable,
  refreshStory,
} from "../src/domain/story";
import { regionPath } from "../src/domain/navigation";
const now = 1700000000000;
const fixture = () => storyFixture();
let seq = 0;
const cmd = (
  p: ReturnType<typeof fixture>,
  s: ReturnType<typeof newSave>,
  c: Parameters<typeof apply>[2],
  id = `story-test-${++seq}`,
) => apply(p, s, c, now, id);
test("story skip initializes exactly once, encounter gates completion, reload/result/claim are idempotent", () => {
  const p = fixture(),
    q = p.quests.find((q) => q.id === "fixture:quest")!;
  let s = newSave(p, now);
  const before = s.roster.length;
  s = cmd(p, s, { type: "story-start", id: q.id });
  assert.equal(s.story.session?.cursor, 0);
  s = cmd(p, s, { type: "story-next", skip: true });
  assert.equal(s.roster.length, before + 1);
  assert.equal(s.story.counters["event:fixture:initialized"], 1);
  assert.equal(s.story.session?.cursor, 4);
  assert.equal(questReady(s, q), false);
  assert.equal(s.storySeen.includes(q.id), false);
  s = checkSave(JSON.parse(JSON.stringify(s)), p);
  s = cmd(p, s, { type: "story-next", skip: true });
  assert.equal(s.roster.length, before + 1);
  s = cmd(p, s, { type: "story-battle" });
  assert.equal(s.encounter?.planet, "fixture:encounter");
  s = checkSave(JSON.parse(JSON.stringify(s)), p);
  const combat = new Combat(p, s, s.encounter!.planet);
  while (!combat.ended && combat.time < 3) combat.step(0.1);
  assert.equal(combat.victory, true);
  assert.equal(combat.units.filter((u) => u.def === "fixture:enemy").length, 2);
  s = cmd(p, s, {
    type: "result",
    planet: "fixture:encounter",
    victory: combat.victory,
    hp: combat.result(),
    receipt: "fixture:result",
  });
  assert.equal(s.story.session?.cursor, 5);
  assert.equal(s.storySeen.includes(q.id), false);
  s = cmd(p, s, { type: "story-next", skip: true });
  assert.ok(s.storySeen.includes(q.id));
  assert.ok(s.story.completed.includes(q.id));
  assert.ok(!s.quests.includes(q.id));
  const old = s.wallet[p.resources[0].id];
  s = cmd(p, s, { type: "quest", id: q.id }, "fixture:claim");
  const loaded = checkSave(JSON.parse(JSON.stringify(s)), p);
  assert.equal(loaded.wallet[p.resources[0].id], old + 25);
  assert.deepEqual(
    cmd(p, loaded, { type: "quest", id: q.id }, "fixture:claim"),
    loaded,
  );
  assert.throws(() => cmd(p, loaded, { type: "quest", id: q.id }), /已領取/);
  assert.throws(
    () => cmd(p, loaded, { type: "story-start", id: q.id }),
    /回看/,
  );
  assert.equal(loaded.story.counters["battleWon:fixture:encounter"], 1);
});
test("legacy save reconnects from cleared/research/build/owned evidence without a duplicate character or world reset", () => {
  const p = fixture();
  let s = newSave(p, now);
  const q = p.quests.find((q) => q.id === "fixture:quest")!;
  addCharacter(p, s, p.characters.find((c) => !c.starter)!.id);
  s.cleared.push(p.planets[0].id);
  s.research.push(p.research[0].id);
  s.colonies[p.planets[0].id] = {
    active: true,
    lost: false,
    buildings: { [p.buildings[0].id]: 2 },
    assigned: "",
    raidRemaining: 0,
  };
  const raw = structuredClone(s) as any;
  delete raw.story;
  s = checkSave(raw, p);
  const before = s.roster.length,
    world = structuredClone(s.colonies);
  assert.ok(
    conditionMet(
      s,
      conditionSchema.parse({
        all: [
          { fact: "cleared", target: p.planets[0].id },
          {
            fact: "character",
            target: p.characters.find((c) => !c.starter)!.id,
          },
          { fact: "research", target: p.research[0].id },
          { fact: "building", target: p.buildings[0].id, count: 2 },
          {
            any: [
              { fact: "region", target: s.region },
              { fact: "built", count: 999 },
            ],
          },
        ],
      }),
    ),
  );
  s = cmd(p, s, { type: "story-start", id: q.id });
  s = cmd(p, s, { type: "story-next", skip: true });
  assert.equal(s.roster.length, before);
  assert.deepEqual(s.colonies, world);
  assert.ok(s.cleared.includes(p.planets[0].id));
  q.story!.steps[4] = {
    kind: "encounter",
    planet: "fixture:encounter",
    resumeIf: conditionSchema.parse({
      fact: "cleared",
      target: p.planets[0].id,
    }),
  };
  const fresh = newSave(p, now);
  fresh.cleared.push(p.planets[0].id);
  let bridged = cmd(p, fresh, { type: "story-start", id: q.id });
  bridged = cmd(p, bridged, { type: "story-next", skip: true });
  assert.equal(bridged.encounter, null);
  assert.ok(bridged.storySeen.includes(q.id));
  assert.ok(!bridged.cleared.includes("fixture:encounter"));
});
test("story objectives, completion/read/claim prerequisites and chapters remain distinct and monotonic", () => {
  const p = fixture(),
    q = p.quests.find((q) => q.id === "fixture:quest")!;
  q.story!.objective = conditionSchema.parse({
    fact: "research",
    target: p.research[0].id,
  });
  const next = structuredClone(q);
  next.id = "fixture:next";
  next.story!.chapter = "fixture:next-chapter";
  next.story!.chapterRequires = ["fixture:chapter"];
  p.quests.push(next);
  const s = newSave(p, now);
  s.storySeen.push(q.id);
  refreshStory(p, s);
  assert.ok(!s.story.completed.includes(q.id));
  s.research.push(p.research[0].id);
  refreshStory(p, s);
  assert.ok(s.story.completed.includes(q.id));
  assert.ok(!s.quests.includes(q.id));
  assert.ok(storyAvailable(p, s, next.id));
  assert.equal(
    conditionMet(s, conditionSchema.parse({ fact: "claimed", target: q.id })),
    false,
  );
  s.research = [];
  refreshStory(p, s);
  assert.ok(s.story.completed.includes(q.id));
});
test("story Combat supports escort, protect, survive/defend, required target defeat and an ordinary eliminate result", () => {
  for (const mode of ["escort", "protect", "survive", "defend", "eliminate"]) {
    const p = storyFixture(mode),
      s = newSave(p, now),
      v = p.planets.find((v) => v.id === "fixture:encounter")!;
    s.x = v.x;
    s.y = v.y;
    s.encounter = { planet: v.id, seed: 42 };
    const combat = new Combat(p, s, v.id);
    combat.step(0.1);
    if (["eliminate", "protect"].includes(mode)) {
      combat.step(0.25);
      combat.step(0.25);
      for (const u of combat.units.filter((u) => u.side === "enemy")) u.hp = 0;
    }
    while (!combat.ended && combat.time < 3) combat.step(0.1);
    assert.ok(combat.victory, mode);
    assert.equal(combat.result()["fixture:escort"], undefined);
    const failed = new Combat(p, s, v.id);
    failed.units.find((u) => u.id === "fixture:escort")!.hp = 0;
    failed.step(0.1);
    assert.ok(failed.ended && !failed.victory, mode);
  }
});
test("story timeline spawns, changes team, moves and retreats through the existing Combat without save mutation", () => {
  const p = fixture(),
    v = p.planets.find((v) => v.id === "fixture:encounter")!,
    e = v.storyEncounter!;
  e.actors[0].required = false;
  e.actors[0].spawnAt = 0.3;
  e.timeline = [
    { at: 0.4, actor: e.actors[0].id, action: "team", side: "enemy" },
    { at: 0.6, actor: e.actors[0].id, action: "move", x: v.x + 80, y: v.y },
    { at: 0.8, actor: e.actors[0].id, action: "setHp", ratio: 0.25 },
    { at: 1, actor: e.actors[0].id, action: "retreat" },
  ];
  const s = newSave(p, now);
  s.x = v.x;
  s.y = v.y;
  s.encounter = { planet: v.id, seed: 1 };
  const original = structuredClone(s),
    c = new Combat(p, s, v.id);
  assert.ok(!c.units.some((u) => u.id === e.actors[0].id));
  c.step(0.2);
  c.step(0.2);
  const actor = c.units.find((u) => u.id === e.actors[0].id)!;
  assert.equal(actor.side, "enemy");
  while (c.time < 0.9) c.step(0.1);
  assert.ok(actor.x > v.x + 30);
  assert.ok(actor.hp <= actor.maxHp * 0.25);
  c.step(0.2);
  assert.equal(actor.hp, 0);
  assert.deepEqual(s, original);
});
test("invalid story contracts, cycles, missing assets/opcodes and modified in-flight scripts reject explicitly", () => {
  const p = fixture(),
    q = p.quests.find((q) => q.id === "fixture:quest")!;
  for (const mutate of [
    (v: any) => v.quests.at(-1).story.steps.push({ kind: "eval", code: "1" }),
    (v: any) => (v.actors[0].portrait = "missing:image"),
    (v: any) =>
      (v.quests.at(-1).story.requires = {
        fact: "completed",
        target: "fixture:quest",
      }),
    (v: any) =>
      v.planets.at(-1).storyEncounter.timeline.push({
        actor: "fixture:escort",
        at: 1,
        action: "move",
      }),
  ]) {
    const copy = structuredClone(p);
    mutate(copy);
    assert.equal(validatePack(copy).pack, undefined);
  }
  let s = cmd(p, newSave(p, now), { type: "story-start", id: q.id });
  q.story!.steps.push({ kind: "say", speaker: "測試", text: "改動測試" });
  assert.throws(() => checkSave(s, p), /改版/);
});
test("challenge route discovery preserves declarations and reports real connected paths", () => {
  const p = fixture(),
    from = p.rules.startRegion ?? p.regions[0].id;
  for (const r of p.regions.filter((r) => r.category !== "campaign")) {
    const path = regionPath(p, from, r.id);
    assert.equal(path[0], from);
    assert.equal(path.at(-1), r.id);
    for (let i = 1; i < path.length; i++)
      assert.ok(
        p.regions
          .find((r) => r.id === path[i - 1])!
          .routes.some((r) => r.to === path[i]),
      );
  }
});

test("a region prerequisite gates acceptance, while accepted flow can travel and complete elsewhere", () => {
  const p = fixture(),
    q = p.quests.find((q) => q.id === "fixture:quest")!;
  let s = newSave(p, now);
  q.story!.requires = conditionSchema.parse({
    fact: "region",
    target: s.region,
  });
  q.story!.steps = [
    { kind: "say", speaker: "測試", text: "測試：跨區後仍可接續。" },
  ];
  const route = p.regions.find((r) => r.id === s.region)!.routes[0];
  s = cmd(p, s, { type: "story-start", id: q.id });
  s = cmd(p, s, { type: "travel", region: route.to });
  assert.ok(storyAvailable(p, s, q.id));
  s = cmd(p, s, { type: "story-next" });
  assert.ok(s.storySeen.includes(q.id));
  assert.ok(s.story.completed.includes(q.id));
  const unaccepted = newSave(p, now);
  unaccepted.region = route.to;
  assert.ok(!storyAvailable(p, unaccepted, q.id));
});

test("non-collectible enemy definitions can be named story actors without adding a playable girl", () => {
  const p = fixture(),
    v = p.planets.find((v) => v.id === "fixture:encounter")!;
  v.storyEncounter!.actors = [
    {
      id: "fixture:noncollectible",
      enemy: "fixture:enemy",
      side: "ally",
      x: v.x + 20,
      y: v.y,
      level: 1,
      required: true,
      spawnAt: 0,
    },
  ];
  const valid = validatePack(p);
  assert.ok(valid.pack, valid.errors.join(";"));
  const s = newSave(p, now);
  s.x = v.x;
  s.y = v.y;
  s.encounter = { planet: v.id, seed: 42 };
  const c = new Combat(valid.pack!, s, v.id),
    a = c.units.find((u) => u.id === "fixture:noncollectible")!;
  assert.equal(a.def, "fixture:enemy");
  assert.equal(a.hp, 100000);
  assert.ok(!s.roster.some((o) => o.definition === "fixture:enemy"));
  a.hp = 0;
  c.step(0.1);
  assert.ok(c.ended && !c.victory);
});
