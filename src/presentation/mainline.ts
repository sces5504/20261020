import type { Pack } from "../content/schema";
import type { Condition } from "../content/story";
import type { Save } from "../domain/model";
import { conditionMet, mainlineState } from "../domain/story";
import { regionPath } from "../domain/navigation";
import { questReady } from "../domain/economy";
import { canAfford } from "../domain/model";
import { questClaimed, questProgress } from "../domain/daily-quests";
import { esc, button } from "./common";

const leaves = (c: Condition): Extract<Condition, { fact: string }>[] =>
  "all" in c ? c.all.flatMap(leaves) : "any" in c ? c.any.flatMap(leaves) : [c];

/** Player-facing objective text; names come from content, never from ids. */
export function conditionLabel(p: Pack, s: Save, c: Condition): string {
  const name = (list: { id: string; name: string }[], id: string) =>
    list.find((v) => v.id === id)?.name ?? id;
  if ("all" in c || "any" in c) {
    const parts = "all" in c ? c.all : c.any;
    const cleared = parts.every((v) => "fact" in v && v.fact === "cleared");
    if (cleared) {
      const done = parts.filter((v) => conditionMet(s, v)).length;
      return `解放指定據點 ${done}/${parts.length}`;
    }
    const open = parts.filter((v) => !conditionMet(s, v));
    return (open.length ? open : parts)
      .slice(0, 2)
      .map((v) => conditionLabel(p, s, v))
      .join("all" in c ? "、" : "／");
  }
  switch (c.fact) {
    case "region":
      return `前往「${name(p.regions, c.target)}」`;
    case "position":
      return `抵達「${name(p.regions, c.target)}」指定座標`;
    case "cleared":
      return `解放「${name(p.planets, c.target)}」`;
    case "activated":
      return `啟動「${name(p.planets, c.target)}」`;
    case "completed":
    case "read":
    case "claimed":
      return `完成「${name(p.quests, c.target)}」`;
    case "character":
      return `取得 ${name(p.characters, c.target)}`;
    case "research":
      return `完成研究「${name(p.research, c.target)}」`;
    case "facility":
      return `建成「${name(p.facilities, c.target)}」`;
    case "facilityActivated":
      return `啟動「${name(p.facilities, c.target)}」`;
    default:
      return c.target ? `${c.fact}：${c.target}` : c.fact;
  }
}

function routeTo(p: Pack, s: Save, region: string, planet?: Pack["planets"][number]) {
  if (region !== s.region) {
    const path = regionPath(p, s.region, region, s.cleared);
    const next = p.regions.find((r) => r.id === path[1]);
    return next ? button(`躍遷 → ${esc(next.name)}`, "travel", next.id, "primary") : "";
  }
  return planet ? button(`導航 · ${esc(planet.name)}`, "navigate", planet.id, "primary") : "";
}

/** First unmet navigable leaf: a region to reach or a planet to clear. */
function guide(p: Pack, s: Save, c: Condition | undefined) {
  if (!c) return "";
  // Chapter facilities are built through a real transaction from the tracker.
  const build = leaves(c).find((v) => v.fact === "facility" && !conditionMet(s, v));
  const facility = build && p.facilities.find((f) => f.id === build.target);
  if (facility && facility.scope === "save") {
    const cost = Object.entries(facility.cost)
      .map(([id, n]) => `${p.resources.find((r) => r.id === id)?.name ?? id} ${n}`)
      .join("、");
    return button(
      `建造 · ${esc(facility.name)}${cost ? `（${esc(cost)}）` : ""}`,
      "facility-build",
      facility.id,
      "primary",
      !canAfford(s, facility.cost),
    );
  }
  const leaf = leaves(c).find(
    (v) =>
      !conditionMet(s, v) && ["region", "position", "cleared"].includes(v.fact),
  );
  if (!leaf) return "";
  const planet =
    leaf.fact === "cleared" ? p.planets.find((v) => v.id === leaf.target) : undefined;
  return routeTo(p, s, planet?.region ?? leaf.target, planet);
}

/** `near` reports whether the fleet has flown to a story battlefield. */
export function mainlineHtml(
  p: Pack,
  s: Save,
  busy: boolean,
  near: (planet: string) => boolean,
) {
  const m = mainlineState(p, s);
  if (!m) return "";
  const chapter = m.quest.name;
  const progress = `${Math.min(m.total, m.index + (m.status === "done" ? 1 : 0))}/${m.total}`;
  const planet = m.planet ? p.planets.find((v) => v.id === m.planet) : undefined;
  const settled = m.status === "encounter" && !!m.settled;
  const arrived = m.status === "encounter" && !settled && near(m.planet!);
  const reached =
    m.status === "await" && !!m.condition && conditionMet(s, m.condition);
  const objective =
    m.status === "done"
      ? "目前主線已全部完成，可於航行紀錄回看。"
      : reached
        ? "目標已達成，可接續劇情"
        : settled
          ? `「${planet?.name ?? "劇情戰場"}」已完成，可接續劇情`
        : m.status === "await" || m.status === "locked"
          ? m.condition
            ? conditionLabel(p, s, m.condition)
            : "完成前一章節"
          : m.status === "encounter"
            ? arrived
              ? `已抵達「${planet?.name ?? "劇情戰場"}」，可出擊`
              : `前往「${planet?.name ?? "劇情戰場"}」迎戰`
            : m.status === "dialogue"
              ? "劇情進行中"
              : "新的劇情已解鎖";
  const ready =
    m.status === "start" ||
    m.status === "dialogue" ||
    arrived ||
    reached ||
    settled;
  const action = ready
    ? button(
        arrived ? "出擊" : m.status === "start" ? "開始" : "接續",
        "flow-open",
        m.quest.id,
        "primary",
        busy,
      )
    : m.status === "encounter" && planet
      ? routeTo(p, s, planet.region, planet)
      : m.status === "await" || m.status === "locked"
        ? guide(p, s, m.condition)
        : "";
  return `<div class="mainline-card is-${ready ? "ready" : m.status}" data-quest="${esc(m.quest.id)}"><span class="eyebrow">主線 ${progress}</span><strong>${esc(chapter)}</strong><p>${esc(objective)}</p>${action ? `<div class="mainline-actions">${action}</div>` : ""}</div>`;
}

/** Original-style side trackers: one main mission and up to two daily missions. */
export function missionCardsHtml(p: Pack, s: Save, now: number) {
  const active = p.quests.filter((q) => q.status === "active" && !q.story);
  const main = active.find(
    (q) => q.repeat !== "daily" && !questClaimed(s, q, now),
  );
  const dailies = active
    .filter((q) => q.repeat === "daily" && !questClaimed(s, q, now))
    .slice(0, 2);
  const card = (
    kind: string,
    tab: string,
    q: Pack["quests"][number],
    progress: string,
  ) =>
    `<button class="mission-card is-${kind}${questReady(s, q, now) ? " is-ready" : ""}" data-action="journal-tab-open" data-id="${tab}"><span class="eyebrow">${kind === "main" ? "主要任務" : "每日任務"}</span><strong>${esc(q.name)}</strong><small>${questReady(s, q, now) ? "可領取獎勵" : esc(progress)}</small></button>`;
  return (
    (main ? card("main", "voyage", main, main.description || "進行中") : "") +
    dailies
      .map((q) =>
        card("daily", "daily", q, `${questProgress(s, q, now)} / ${q.count}`),
      )
      .join("")
  );
}
