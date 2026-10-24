import type { Enemy, Pack, Planet } from "../content/schema";
import type { Save } from "./model";

/** Recovered CID growth; keep integer truncation steps separate. */
export function enemyStats(e: Enemy, level = 1) {
  if (!e.growthReference)
    return { hp: e.hp, attack: e.attack, defense: e.defense };
  const n = Math.max(1, Math.min(150, Math.trunc(level))) - 1;
  const { attack: a, defense: d, hp: h } = e.growthReference;
  return {
    attack: Math.max(1, Math.trunc(a / 10) + Math.trunc((9 * n * a) / 990)),
    defense: Math.trunc(d / 10) + Math.trunc((9 * n * d) / 990),
    hp: Math.trunc(h / 10) + Math.trunc((Math.trunc((9 * h) / 10) * n) / 99),
  };
}
export function nodeCleared(s: Save, v: Planet) {
  return v.initiallyCleared || s.cleared.includes(v.id);
}
export function nodeUnlocked(s: Save, v: Planet, pack?: Pack): boolean {
  return (
    v.requires.every(
      (id) =>
        s.cleared.includes(id) ||
        !!pack?.planets.find((p) => p.id === id)?.initiallyCleared,
    ) && v.requiresActive.every((id) => !!s.colonies[id]?.active)
  );
}
export function nodePeriod(v: Planet, now: number) {
  const schedule = v.schedule;
  if (!schedule) return "";
  const date = new Date(
    now + (schedule.utcOffsetMinutes - schedule.resetHour * 60) * 60000,
  );
  return date.toISOString().slice(0, 10);
}
export function nodeAvailability(s: Save, v: Planet, now: number) {
  if (!v.schedule) return { open: true, period: "", reason: "" };
  const date = new Date(
    now + (v.schedule.utcOffsetMinutes - v.schedule.resetHour * 60) * 60000,
  );
  const period = nodePeriod(v, now);
  if (!v.schedule.weekdays.includes(date.getUTCDay()))
    return { open: false, period, reason: "尚未到此 Boss 的開放日" };
  if ((s.dailyClaims?.[v.id] ?? "") >= period)
    return { open: false, period, reason: "本日獎勵已領取" };
  const attempts = s.dailyAttempts?.[v.region];
  if (
    attempts &&
    (attempts.period > period ||
      (attempts.period === period && attempts.count >= v.schedule.attemptLimit))
  )
    return { open: false, period, reason: "本日挑戰次數已用完" };
  return { open: true, period, reason: "" };
}
const storyFieldCache = new WeakMap<Pack, Set<string>>();
/** Planets that only exist as a story node's battlefield. */
export function storyFields(p: Pack) {
  let set = storyFieldCache.get(p);
  if (!set) {
    set = new Set(
      p.quests.flatMap((q) =>
        (q.story?.steps ?? []).flatMap((st) =>
          st.kind === "encounter" ? [st.planet] : [],
        ),
      ),
    );
    storyFieldCache.set(p, set);
  }
  return set;
}
/** The story field the current node is waiting to fight at, if any. */
export function activeStoryField(s: Save, p: Pack) {
  const session = s.story?.session;
  const step = session
    ? p.quests.find((q) => q.id === session.quest)?.story?.steps[session.cursor]
    : undefined;
  return step?.kind === "encounter" ? step.planet : undefined;
}
export function nodeVisible(s: Save, v: Planet, p: Pack, now: number) {
  if (v.hiddenUntilUnlocked && !nodeUnlocked(s, v, p)) return false;
  // Like original EventSpots: a story battlefield appears on the map only for its own scene.
  if (storyFields(p).has(v.id) && activeStoryField(s, p) !== v.id) return false;
  if (!v.schedule) return true;
  const day = new Date(
    now + (v.schedule.utcOffsetMinutes - v.schedule.resetHour * 60) * 60000,
  ).getUTCDay();
  return v.schedule.weekdays.includes(day);
}
export const nodeKindNames: Record<Planet["kind"], string> = {
  planet: "生產星球",
  stronghold: "敵方據點",
  camp: "臨時基地",
  event: "事件遭遇",
  dailyBoss: "每日 Boss",
  gate: "星門守軍",
};
