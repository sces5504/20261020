import { test } from "node:test";
import assert from "node:assert/strict";
import { published as p } from "../src/content";
import { newSave } from "../src/domain/model";
import { apply } from "../src/domain/economy";
import { mainlineQuests, mainlineState } from "../src/domain/story";

test("main thread follows chapter nodes in order; the player starts each node", () => {
  const quests = mainlineQuests(p);
  assert.ok(quests.length >= 24);
  let s = newSave(p, 1);
  let m = mainlineState(p, s)!;
  assert.equal(m.quest.id, quests[0].id);
  assert.equal(m.status, "start");
  s = apply(p, s, { type: "story-start", id: quests[0].id }, 1, "a");
  assert.equal(mainlineState(p, s)!.status, "dialogue");
  s = apply(p, s, { type: "story-next", skip: true }, 1, "b");
  m = mainlineState(p, s)!;
  assert.equal(m.quest.id, quests[1].id);
  assert.equal(m.status, "start");
  s = apply(p, s, { type: "story-start", id: quests[1].id }, 1, "c");
  s = apply(p, s, { type: "story-next", skip: true }, 1, "d");
  m = mainlineState(p, s)!;
  // Skipping never passes an await gate: the node waits on its arrival goal.
  assert.equal(m.quest.id, quests[1].id);
  assert.equal(m.status, "await");
  assert.ok(m.condition && "fact" in m.condition && m.condition.fact === "region");
});
