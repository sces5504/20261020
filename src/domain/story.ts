import type { Pack } from "../content/schema";
import type { Condition } from "../content/story";
import { type Save, addCharacter } from "./model";
export type StoryState = {
  completed: string[];
  counters: Record<string, number>;
  session: {
    quest: string;
    cursor: number;
    waiting: string;
    battleWon: boolean;
    cues: number[];
    signature: string;
  } | null;
};
export function storySignature(value: unknown) {
  let hash = 2166136261;
  for (const c of JSON.stringify(value))
    hash = Math.imul(hash ^ c.charCodeAt(0), 16777619) >>> 0;
  return hash.toString(16);
}
export const emptyStory = (): StoryState => ({
  completed: [],
  counters: {},
  session: null,
});
export function storyFact(s: Save, fact: string, target = "", count = 1) {
  s.story ??= emptyStory();
  for (const key of new Set([fact, `${fact}:${target}`]))
    s.story.counters[key] = (s.story.counters[key] ?? 0) + count;
}
export function conditionMet(s: Save, c: Condition): boolean {
  if ("all" in c) return c.all.every((v) => conditionMet(s, v));
  if ("any" in c) return c.any.some((v) => conditionMet(s, v));
  switch (c.fact) {
    case "region":
      return s.region === c.target;
    case "position":
      return (
        s.region === c.target && Math.hypot(s.x - c.x, s.y - c.y) <= c.radius
      );
    case "cleared":
      return s.cleared.includes(c.target);
    case "activated":
      return !!s.colonies[c.target]?.active;
    case "character":
      return (
        s.roster.filter((o) => o.definition === c.target).length >= c.count
      );
    case "research":
      return s.research.includes(c.target);
    case "building":
      return (
        Object.values(s.colonies).reduce(
          (n, col) => n + (col.buildings[c.target] ?? 0),
          0,
        ) >= c.count
      );
    case "completed":
      return (
        s.story.completed.includes(c.target) || s.quests.includes(c.target)
      );
    case "read":
      return s.storySeen.includes(c.target);
    case "claimed":
      return s.quests.includes(c.target);
    case "summoned":
      return (
        (c.target
          ? (s.story.counters[`summoned:${c.target}`] ?? 0)
          : s.summoned) >= c.count
      );
    case "built":
      return (
        (c.target
          ? Math.max(
              s.story.counters[`built:${c.target}`] ?? 0,
              Object.values(s.colonies).reduce(
                (n, col) => n + (col.buildings[c.target] ?? 0),
                0,
              ),
            )
          : s.built) >= c.count
      );
    case "battleWon":
      return (
        Math.max(
          s.story.counters[c.target ? `battleWon:${c.target}` : "battleWon"] ??
            0,
          c.target && s.cleared.includes(c.target) ? 1 : 0,
        ) >= c.count
      );
    default:
      return (
        (s.story.counters[c.target ? `${c.fact}:${c.target}` : c.fact] ?? 0) >=
        c.count
      );
  }
}
export function chapterComplete(p: Pack, s: Save, id: string) {
  const nodes = p.quests.filter(
    (q) => q.story?.chapter === id && q.status === "active",
  );
  return (
    nodes.length > 0 && nodes.every((q) => s.story.completed.includes(q.id))
  );
}
export function storyAvailable(p: Pack, s: Save, id: string): boolean {
  const q = p.quests.find((q) => q.id === id),
    story = q?.story;
  return (
    !!q &&
    q.status === "active" &&
    !!story &&
    (s.story.session?.quest === id ||
      (story.chapterRequires.every((ch) => chapterComplete(p, s, ch)) &&
        (!story.requires || conditionMet(s, story.requires))))
  );
}
export function refreshStory(p: Pack, s: Save) {
  s.story ??= emptyStory();
  // Existing cleared planets and acquired characters remain evidence; never reset world state.
  // Completion is monotonic and separate from reading and claiming.
  for (let pass = 0; pass <= p.quests.length; pass++) {
    let changed = false;
    for (const q of p.quests)
      if (
        q.story &&
        !s.story.completed.includes(q.id) &&
        (s.storySeen.includes(q.id) || s.quests.includes(q.id)) &&
        (!q.story.objective || conditionMet(s, q.story.objective))
      ) {
        s.story.completed.push(q.id);
        changed = true;
      }
    if (!changed) break;
  }
}
export function beginStory(p: Pack, s: Save, id: string) {
  refreshStory(p, s);
  if (s.encounter) throw Error("請先結束戰鬥。");
  if (s.story.session) {
    if (s.story.session.quest === id) return;
    throw Error("請先接續目前劇情。");
  }
  if (!storyAvailable(p, s, id)) throw Error("劇情前置尚未達成。");
  if (s.storySeen.includes(id)) throw Error("已讀章節請使用回看。");
  s.story.session = {
    quest: id,
    cursor: 0,
    waiting: "",
    battleWon: false,
    cues: [],
    signature: storySignature(p.quests.find((q) => q.id === id)!.story),
  };
  advanceStory(p, s, false, true);
}
/** Pure domain initialization. Presentation can be skipped; encounter/wait gates cannot. */
export function advanceStory(p: Pack, s: Save, skip = false, initial = false) {
  const session = s.story.session;
  if (!session) throw Error("沒有進行中的劇情。");
  const q = p.quests.find((q) => q.id === session.quest),
    story = q?.story;
  if (!story) throw Error("劇情內容缺失，請恢復內容包。");
  if (session.signature !== storySignature(story))
    throw Error("劇情流程版本已變動，請恢復原內容包後接續。");
  if (session.waiting) throw Error("請先完成劇情遭遇。");
  const current = story.steps[session.cursor];
  if (
    !initial &&
    current &&
    !["acquire", "event", "await", "encounter"].includes(current.kind)
  )
    session.cursor++;
  while (session.cursor < story.steps.length) {
    const step = story.steps[session.cursor];
    const receipt = `story:${q!.id}:${session.cursor}`;
    if (step.kind === "await") {
      if (!conditionMet(s, step.condition)) return;
    } else if (step.kind === "acquire") {
      if (!s.receipts.includes(receipt)) {
        // Reconnecting an old save never grants a second copy of an already owned actor.
        if (!s.roster.some((o) => o.definition === step.character)) {
          const o = addCharacter(p, s, step.character);
          if (o) s.acquisitionQueue.push(o.id);
        }
        s.receipts.push(receipt);
      }
    } else if (step.kind === "event") {
      if (!s.receipts.includes(receipt)) {
        storyFact(s, "event", step.event);
        s.receipts.push(receipt);
      }
    } else if (step.kind === "encounter") {
      if (!step.resumeIf || !conditionMet(s, step.resumeIf)) return;
    } else if (!skip) return;
    session.cursor++;
  }
  if (!s.storySeen.includes(q!.id)) s.storySeen.push(q!.id);
  s.story.session = null;
  refreshStory(p, s);
}
export function storyEncounterResult(
  p: Pack,
  s: Save,
  planet: string,
  victory: boolean,
) {
  const session = s.story.session;
  if (!session || session.waiting !== planet) return;
  session.waiting = "";
  session.cues = [];
  if (victory) {
    session.cursor++;
    session.battleWon = true;
    advanceStory(p, s, false, true);
  }
}
export type MainlineState = {
  quest: Pack["quests"][number];
  index: number;
  total: number;
  status: "start" | "dialogue" | "await" | "encounter" | "locked" | "done";
  condition?: Condition;
  planet?: string;
  /** An encounter whose result is already on record continues without refighting. */
  settled?: boolean;
};
/** Original QuestS-style single main thread: chapter nodes in pack order. */
export function mainlineQuests(p: Pack) {
  return p.quests.filter((q) => q.status === "active" && q.story?.chapter);
}
export function mainlineState(p: Pack, s: Save): MainlineState | undefined {
  const quests = mainlineQuests(p);
  if (!quests.length) return undefined;
  const session = s.story.session;
  const at = (q: Pack["quests"][number]) => quests.indexOf(q);
  if (session) {
    const quest = quests.find((q) => q.id === session.quest);
    if (quest) {
      const step = quest.story!.steps[session.cursor];
      const base = { quest, index: at(quest), total: quests.length };
      if (step?.kind === "await")
        return { ...base, status: "await", condition: step.condition };
      if (step?.kind === "encounter")
        return {
          ...base,
          status: "encounter",
          planet: step.planet,
          settled: !!step.resumeIf && conditionMet(s, step.resumeIf),
        };
      return { ...base, status: "dialogue" };
    }
  }
  const quest = quests.find((q) => !s.storySeen.includes(q.id));
  if (!quest)
    return {
      quest: quests[quests.length - 1],
      index: quests.length - 1,
      total: quests.length,
      status: "done",
    };
  return {
    quest,
    index: at(quest),
    total: quests.length,
    status: storyAvailable(p, s, quest.id) ? "start" : "locked",
    condition: quest.story!.requires,
  };
}
