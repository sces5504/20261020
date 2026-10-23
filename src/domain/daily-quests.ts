import type { Pack } from "../content/schema";
import type { Save } from "./model";
type Quest = Pack["quests"][number];
/** The same configurable KST midnight convention as daily mothership encounters. */
export function questPeriod(q: Quest, now: number) {
  return new Date(now + (q.utcOffsetMinutes - q.resetHour * 60) * 60000)
    .toISOString()
    .slice(0, 10);
}
export function questResetAt(q: Quest, now: number) {
  return (
    Date.parse(questPeriod(q, now) + "T00:00:00Z") +
    86400000 -
    (q.utcOffsetMinutes - q.resetHour * 60) * 60000
  );
}
export function questProgress(s: Save, q: Quest, now: number) {
  const task = s.dailyTasks?.[q.id];
  return task?.period === questPeriod(q, now) ? task.progress : 0;
}
export function questClaimed(s: Save, q: Quest, now: number) {
  if (q.repeat !== "daily") return s.quests.includes(q.id);
  const task = s.dailyTasks?.[q.id];
  return (
    !!task &&
    (task.period > questPeriod(q, now) ||
      (task.period === questPeriod(q, now) && task.claimed))
  );
}
/** Called only by successful domain events. Clock rollback never resets a future ledger. */
export function advanceDaily(
  p: Pack,
  s: Save,
  event: Quest["condition"],
  now: number,
) {
  s.dailyTasks ??= {};
  for (const q of p.quests.filter(
    (q) => q.repeat === "daily" && q.condition === event,
  )) {
    const period = questPeriod(q, now),
      previous = s.dailyTasks[q.id];
    if (previous && previous.period > period) continue;
    const entry =
      previous?.period === period
        ? previous
        : { period, progress: 0, claimed: false };
    entry.progress = Math.min(q.count, entry.progress + 1);
    s.dailyTasks[q.id] = entry;
  }
}
