import { test } from "node:test";
import assert from "node:assert/strict";
import { published as p } from "../src/content";
import { newSave } from "../src/domain/model";
import { apply } from "../src/domain/economy";
import { compatibilityPlan } from "../src/domain/migration";
import { checkSave } from "../src/platform/storage";
import { fingerprint } from "../src/content/fingerprint";
const t = 1700000000000;
test("removed content quarantines owned characters and cancels/refunds unavailable jobs once", () => {
  let s = newSave(p, t);
  s = apply(
    p,
    s,
    { type: "summon", recipe: [100, 100, 100, 100], count: 1 },
    t,
    "summon",
  );
  const removed = s.jobs[0].payload;
  const changed = structuredClone(p);
  changed.characters = changed.characters.filter((c) => c.id !== removed);
  changed.characters[0].starter = true;
  changed.planets.forEach(
    (v) => (v.dropCharacters = v.dropCharacters.filter((id) => id !== removed)),
  );
  changed.quests.forEach((q) => {
    if (q.character === removed) q.character = "";
  });
  const before = s.wallet[p.resources[0].id],
    plan = compatibilityPlan(s, changed);
  assert.equal(plan.save.wallet[p.resources[0].id], before + 100);
  assert.equal(plan.save.jobs.length, 0);
  assert.equal(plan.save.orphanedJobs.length, 1);
  const again = compatibilityPlan(plan.save, changed);
  assert.equal(again.save.wallet[p.resources[0].id], before + 100);
  assert.doesNotThrow(() => checkSave(again.save, changed));
  const restored = compatibilityPlan(again.save, p);
  assert.equal(restored.save.orphans.length, 0);
  assert.ok(restored.save.roster.length >= s.roster.length);
});
test("removed region relocates safely and keeps balances, buildings and original save untouched", () => {
  let s = newSave(p, t);
  s.cleared = [p.planets[0].id];
  s = apply(p, s, { type: "activate", planet: p.planets[0].id }, t, "activate");
  const copy = structuredClone(s),
    q = structuredClone(p);
  q.regions[0].id = "addon:region";
  q.planets = q.planets
    .slice(1)
    .map((v) => ({ ...v, region: "addon:region", requires: [] }));
  const plan = compatibilityPlan(s, q);
  assert.equal(plan.save.region, "addon:region");
  assert.deepEqual(plan.save.wallet, s.wallet);
  assert.ok(plan.save.orphanedColonies[p.planets[0].id]);
  assert.deepEqual(s, copy);
  assert.doesNotThrow(() => checkSave(plan.save, q));
});
test("content fingerprint is deterministic and changes with effective gameplay data", async () => {
  const hash = await fingerprint(p);
  assert.equal(hash, await fingerprint(structuredClone(p)));
  const q = structuredClone(p);
  q.characters[0].attack++;
  assert.notEqual(hash, await fingerprint(q));
});
test("legacy schema 1 gains additive fields without losing progress; unknown future schemas stay rejected", () => {
  const old = JSON.parse(JSON.stringify(newSave(p, t)));
  delete old.contentHash;
  delete old.migrationHistory;
  delete old.trainingBest;
  delete old.orphanedJobs;
  delete old.orphanedColonies;
  delete old.orphanedWallet;
  const s = checkSave(old, p);
  assert.deepEqual(s.roster, old.roster);
  assert.equal(s.trainingBest, 0);
  assert.throws(() => compatibilityPlan({ ...old, schemaVersion: 99 }, p));
});
