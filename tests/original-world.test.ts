import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { published as p } from "../src/content";
import { validatePack } from "../src/content/schema";
import { newSave, stats } from "../src/domain/model";
import { apply, settle, production } from "../src/domain/economy";
import {
  enemyStats,
  nodeAvailability,
  nodeCleared,
  nodeUnlocked,
  nodeVisible,
} from "../src/domain/world";
import { Combat } from "../src/domain/combat";
import { patrolPosition } from "../src/domain/navigation";
import { checkSave } from "../src/platform/storage";
import { assemble } from "../src/content/loader";
const source = (name: string) =>
  JSON.parse(
    readFileSync(`content/source/original-world/${name}.json`, "utf8"),
  );
const nodes = p.planets.filter((v) => v.id.startsWith("original:"));
test("only root integration can add cross-pack routes, and every target/repetition is validated", () => {
  const base = JSON.parse(readFileSync("content/core/pack.json", "utf8"));
  const manifest = JSON.parse(readFileSync("content/manifest.json", "utf8"));
  const extensions = manifest.extensions.map((path: string) =>
    JSON.parse(readFileSync("content/" + path, "utf8")),
  );
  const q = assemble(base, extensions, [], [], manifest.regionRoutes);
  assert(
    q.regions
      .find((r) => r.id === "m1:frontier-test")!
      .routes.some((r) => r.to === "original:region.solar"),
  );
  assert.throws(() =>
    assemble(
      base,
      extensions,
      [],
      [],
      [{ region: "unknown:region", routes: [] }],
    ),
  );
  assert.throws(() =>
    assemble(
      base,
      extensions,
      [],
      [],
      [
        {
          region: "m1:frontier-test",
          routes: [{ to: "unknown:region", label: "missing", requires: [] }],
        },
      ],
    ),
  );
  assert.throws(() =>
    assemble(
      base,
      extensions,
      [],
      [],
      [
        {
          region: "m1:frontier-test",
          routes: [{ to: "m1:helios", label: "duplicate", requires: [] }],
        },
      ],
    ),
  );
});
const now = Date.parse("2026-10-22T03:00:00Z"); // Thursday KST
function fresh() {
  return newSave(p, now);
}
function at(id: string) {
  const s = fresh(),
    v = p.planets.find((v) => v.id === id)!;
  s.region = v.region;
  s.x = v.x;
  s.y = v.y;
  return s;
}
test("source coverage accounts for every nonempty Wave and preserves every original roster and level", () => {
  const coverage = source("coverage"),
    waves = source("waves");
  assert.equal(nodes.length, 754);
  assert.equal(
    p.enemies.filter((e) => e.id.startsWith("original:")).length,
    65,
  );
  assert.equal(
    p.regions.filter((e) => e.id.startsWith("original:")).length,
    48,
  );
  for (const w of waves.filter((w: any) => w.groups.length)) {
    const ids = coverage.runtimeWaves[w._row];
    if (!ids) {
      assert(
        coverage.excludedWaves.some((e: any) => e.waveRow === w._row),
        w.f00,
      );
      continue;
    }
    for (const id of ids) {
      const v = nodes.find((v) => v.id === id)!;
      assert.deepEqual(
        v.enemies,
        w.groups.map((g: any) => ({
          enemy: `original:enemy.${g.cid_row}`,
          count: g.count,
          level: Math.max(1, w.f02),
        })),
      );
    }
  }
  assert(!nodes.some((v) => /Defense|Dummy|Test/.test(v.name)));
});
test("native integer growth is exact at level 1, 100 and 128, including nested HP truncation", () => {
  for (const raw of source("enemies")) {
    const e = p.enemies.find((e) => e.id === `original:enemy.${raw._row}`)!;
    for (const level of [1, 100, 128]) {
      const n = level - 1;
      assert.deepEqual(enemyStats(e, level), {
        attack: Math.max(
          1,
          Math.trunc(raw.f15 / 10) + Math.trunc((9 * n * raw.f15) / 990),
        ),
        defense: Math.trunc(raw.f16 / 10) + Math.trunc((9 * n * raw.f16) / 990),
        hp:
          Math.trunc(raw.f17 / 10) +
          Math.trunc((Math.trunc((9 * raw.f17) / 10) * n) / 99),
      });
    }
  }
  const s = at("original:spawn.1"),
    v = nodes.find((v) => v.id === "original:spawn.1")!;
  const battle = new Combat(p, s, v.id),
    enemy = battle.units.find((u) => u.side === "enemy")!,
    g = v.enemies[0];
  assert.equal(
    enemy.maxHp,
    enemyStats(p.enemies.find((e) => e.id === g.enemy)!, g.level).hp,
  );
});
test("all new visuals have fixed source model identity, delivery hashes and real files", () => {
  const media = JSON.parse(
    readFileSync("art/world/original-world/media.json", "utf8"),
  );
  assert.equal(media.length, 165);
  for (const m of media) {
    const a = p.assets.find((a) => a.id === m.id)!;
    assert(a);
    assert.equal(
      a.hash,
      createHash("sha256").update(readFileSync(m.path)).digest("hex"),
    );
    assert.equal(a.src, m.runtime);
  }
  for (const model of source("visual-identities")) {
    for (const cid of model.cidRows)
      assert.equal(
        p.enemies.find((e) => e.id === `original:enemy.${cid}`)!.sprite,
        model.assetId,
      );
  }
  assert.equal(
    new Set(source("visual-identities").map((m: any) => m.assetId)).size,
    62,
  );
});
test("all worlds and nodes are reachable, return routes exist, mixed clear/activation cycles fail validation", () => {
  let s = fresh();
  const reached = new Set([s.region]);
  for (let n = 0; n < p.regions.length; n++)
    for (const r of p.regions.filter((r) => reached.has(r.id)))
      for (const to of r.routes) reached.add(to.to);
  assert.equal(reached.size, p.regions.length);
  for (const r of p.regions.filter((r) => r.id.startsWith("original:")))
    assert(r.routes.length, `exit ${r.id}`);
  for (let pass = 0; pass < nodes.length; pass++) {
    const pending = nodes.filter(
      (v) => !nodeCleared(s, v) && nodeUnlocked(s, v, p),
    );
    for (const v of pending) s.cleared.push(v.id);
    for (const v of nodes.filter(
      (v) => v.kind === "planet" && nodeCleared(s, v) && nodeUnlocked(s, v, p),
    ))
      s.colonies[v.id] = {
        active: true,
        lost: false,
        buildings: {},
        assigned: "",
        raidRemaining: 240,
      };
    if (!pending.length) break;
  }
  assert(
    nodes.every((v) => nodeUnlocked(s, v, p)),
    "all dependency targets eventually reachable",
  );
  const q = structuredClone(p),
    a = q.planets.find((v) => v.id === "original:planet.2")!,
    b = q.planets.find((v) => v.id === "original:planet.3")!;
  a.requires = [b.id];
  assert(validatePack(q).errors.some((e) => e.includes("循環")));
});
test("empty Earth starts free, Moon requires activation, resource shortage is atomic and nonplanets cannot produce", () => {
  let s = at("original:planet.2");
  const earth = nodes.find((v) => v.id === "original:planet.2")!,
    moon = nodes.find((v) => v.id === "original:planet.3")!;
  assert(nodeCleared(s, earth));
  assert(!nodeUnlocked(s, moon, p));
  assert(!nodeVisible(s, moon, p, now));
  s = apply(p, s, { type: "activate", planet: earth.id }, now, "earth");
  assert.equal(s.cleared.length, 0);
  assert(nodeUnlocked(s, moon, p));
  const before = structuredClone(s);
  s.wallet = {};
  assert.throws(
    () => apply(p, s, { type: "activate", planet: moon.id }, now, "poor"),
    /不足/,
  );
  assert.deepEqual(s.wallet, {});
  s = before;
  assert(production(p, s)["m1:crystal"] > 0);
  for (const v of nodes.filter((v) => v.kind !== "planet"))
    assert.throws(() =>
      apply(p, s, { type: "activate", planet: v.id }, now, "no-production"),
    );
  const raw = JSON.parse(JSON.stringify(s));
  delete raw.dailyClaims;
  assert.deepEqual(checkSave(raw, p).dailyClaims, {});
});
test("camps batch existing healing jobs atomically, charging only injured free team members", () => {
  const camp = nodes.find((v) => v.kind === "camp")!;
  const paid = structuredClone(p);
  paid.planets.find((v) => v.id === camp.id)!.resupplyCost = {
    ...p.rules.healCost,
  };
  let s = at(camp.id);
  s.roster.filter((o) => s.team.includes(o.id)).forEach((o) => (o.hp = 1));
  const old = structuredClone(s);
  s.wallet = {};
  assert.throws(() =>
    apply(paid, s, { type: "resupply", planet: camp.id }, now, "poor"),
  );
  assert.equal(s.jobs.length, 0);
  s = old;
  s = apply(paid, s, { type: "resupply", planet: camp.id }, now, "heal");
  assert.equal(s.jobs.length, s.team.length);
  settle(p, s, now + p.rules.healSeconds * 1000 + 1);
  assert(
    s.roster
      .filter((o) => s.team.includes(o.id))
      .every((o) => o.hp === stats(p, o).hp),
  );
});
test("an empty-wallet defeated expedition can recover at a base and earn all four resources from a foreground patrol", () => {
  const camp = nodes.find(
    (v) => v.kind === "camp" && v.region === "original:region.solar",
  )!;
  let s = at(camp.id);
  s.wallet = {};
  s.roster.forEach((o) => (o.hp = 0));
  s = apply(p, s, { type: "resupply", planet: camp.id }, now, "free-emergency");
  settle(p, s, now + p.rules.healSeconds * 1000 + 1);
  assert(
    s.roster
      .filter((o) => s.team.includes(o.id))
      .every((o) => o.hp === stats(p, o).hp),
  );
  assert.equal(s.wallet["m1:gas"] ?? 0, 0);
  assert.equal(s.wallet["m1:ether"] ?? 0, 0);
  const patrol = p.regions.find((r) => r.id === s.region)!.patrols[0];
  assert(patrol);
  Object.assign(s, patrolPosition(patrol, s.voyageSeconds));
  s = apply(p, s, { type: "patrol", id: patrol.id }, s.settledAt, "supplies");
  const combat = new Combat(p, s, patrol.id);
  combat.autoSkills = true;
  for (let tick = 0; tick < 1800 && !combat.ended; tick++) combat.step(1 / 60);
  assert(combat.victory);
  s = apply(
    p,
    s,
    {
      type: "result",
      planet: patrol.id,
      victory: true,
      hp: combat.result(),
      receipt: "patrol-supplies",
    },
    s.settledAt,
    "claim-supplies",
  );
  for (const r of p.resources)
    assert.equal(s.wallet[r.id], patrol.reward[r.id]);
  const before = structuredClone(s);
  settle(p, s, s.settledAt + 3600000);
  assert.deepEqual(s.wallet, before.wallet);
  assert.deepEqual(s.patrolCooldowns, before.patrolCooldowns);
});
test("daily schedule uses KST; cross-midnight results belong to entry date, cannot duplicate or roll back", () => {
  const v = nodes.find((v) => v.id === "original:daily.4-1")!;
  let s = at(v.id);
  assert(nodeAvailability(s, v, now).open);
  assert(!nodeVisible(s, v, p, now + 86400000));
  s = apply(p, s, { type: "begin", planet: v.id }, now, "begin");
  const initial = s.wallet["m1:crystal"];
  const result = {
    type: "result" as const,
    planet: v.id,
    victory: true,
    hp: {},
    scoreRatio: 0.25,
    receipt: "daily-result",
  };
  assert.throws(() => apply(p, s, { ...result, scoreRatio: NaN }, now, "bad"));
  assert.throws(() => apply(p, s, { ...result, scoreRatio: 0 }, now, "zero"));
  s = apply(p, s, result, now + 86400000, "result");
  assert.equal(s.dailyClaims[v.id], "2026-10-22");
  assert.equal(s.wallet["m1:crystal"], initial + 300);
  assert(!nodeAvailability(s, v, now).open);
  assert(!nodeAvailability(s, v, now - 7 * 86400000).open);
  assert(nodeAvailability(s, v, now + 7 * 86400000).open);
  const old = structuredClone(s);
  settle(p, s, now + 8 * 86400000);
  assert.deepEqual(
    s.dailyClaims,
    old.dailyClaims,
    "offline never resolves a battle",
  );
});
test("daily timeout measures simulation time, scores damage with surviving team, zero damage cannot win", () => {
  const v = nodes.find((v) => v.id === "original:daily.4-1")!;
  const s = at(v.id);
  const battle = new Combat(p, s, v.id);
  battle.time = 179.99;
  const enemy = battle.units.find((u) => u.side === "enemy")!;
  enemy.hp -= 100;
  battle.step(1 / 60);
  assert(battle.timedOut);
  assert(battle.victory);
  assert(battle.damageRatio > 0);
  const zero = new Combat(p, s, v.id);
  zero.time = 179.99;
  zero.units
    .filter((u) => u.side === "ally")
    .forEach((u) => (u.cooldown = 100));
  zero.step(1 / 60);
  assert(!zero.victory);
});
test("daily entries share three attempts per region/day and failed or abandoned entries consume an attempt", () => {
  const choices = nodes.filter((v) => v.schedule?.weekdays.includes(4));
  let s = at(choices[0].id);
  for (let i = 0; i < 3; i++) {
    s.x = choices[i].x;
    s.y = choices[i].y;
    s = apply(p, s, { type: "begin", planet: choices[i].id }, now, "try-" + i);
    s = apply(
      p,
      s,
      {
        type: "result",
        planet: choices[i].id,
        victory: false,
        hp: {},
        receipt: "failed-" + i,
      },
      now,
      "leave-" + i,
    );
  }
  assert.equal(s.dailyAttempts[s.region].count, 3);
  assert(!nodeAvailability(s, choices[3], now).open);
  assert(nodeAvailability(s, choices[3], now + 7 * 86400000).open);
  assert(!nodeAvailability(s, choices[3], now - 7 * 86400000).open);
});
test("source routes enforce first-clear unlocks, save destination, preserve economy and explicitly return", () => {
  let s = at("original:planet.2");
  s = apply(
    p,
    s,
    { type: "activate", planet: "original:planet.2" },
    now,
    "earth",
  );
  assert.throws(() =>
    apply(
      p,
      s,
      { type: "travel", region: "original:region.virgo" },
      now,
      "locked",
    ),
  );
  const route = p.regions
    .find((r) => r.id === s.region)!
    .routes.find((r) => r.to === "original:region.virgo")!;
  s.cleared.push(...route.requires);
  s = apply(p, s, { type: "travel", region: route.to }, now, "out");
  assert.equal(checkSave(s, p).region, "original:region.virgo");
  assert(s.colonies["original:planet.2"].active);
  s = apply(
    p,
    s,
    { type: "travel", region: "original:region.solar" },
    now,
    "back",
  );
  assert.equal(s.x, 5970);
  assert.equal(s.y, 5530);
  const v = nodes.find((v) => v.id === "original:spawn.1")!;
  s = apply(p, s, { type: "begin", planet: v.id }, now, "again");
  const before = s.wallet["m1:crystal"];
  s = apply(
    p,
    s,
    {
      type: "result",
      planet: v.id,
      victory: true,
      hp: {},
      receipt: "repeat-cleared",
    },
    now,
    "repeat",
  );
  assert.equal(s.wallet["m1:crystal"], before);
});
test("all ordinary new enemies can be hit by existing automatic attacks with native movement and evasion", () => {
  const template = nodes.find((v) => v.id === "original:spawn.1")!;
  for (const enemy of p.enemies.filter(
    (e) => e.id.startsWith("original:") && !e.boss,
  )) {
    const q = structuredClone(p),
      v = q.planets.find((v) => v.id === template.id)!;
    v.enemies = [{ enemy: enemy.id, count: 1, level: 10 }];
    const s = at(v.id);
    s.x = v.x - 200;
    s.encounter = { planet: v.id, seed: 42 };
    s.roster.forEach((o) => {
      o.level = 15;
      o.hp = stats(q, o).hp;
    });
    const c = new Combat(q, s, v.id);
    for (let n = 0; n < 60 * 30 && !c.ended; n++) c.step(1 / 60);
    assert(
      c.units.find((u) => u.side === "enemy")!.hp <
        c.units.find((u) => u.side === "enemy")!.maxHp,
      enemy.name + " automatic attacks must land",
    );
  }
});
