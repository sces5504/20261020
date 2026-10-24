import type { Pack } from "../content/schema";
import type { Condition } from "../content/story";
import type { Save } from "../domain/model";
import { conditionMet, mainlineState } from "../domain/story";
import { regionPath } from "../domain/navigation";
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
    default:
      return c.target ? `${c.fact}：${c.target}` : c.fact;
  }
}

/** First unmet navigable leaf: a region to reach or a planet to clear. */
function guide(p: Pack, s: Save, c: Condition | undefined) {
  if (!c) return "";
  const leaf = leaves(c).find(
    (v) =>
      !conditionMet(s, v) && ["region", "position", "cleared"].includes(v.fact),
  );
  if (!leaf) return "";
  const planet =
    leaf.fact === "cleared" ? p.planets.find((v) => v.id === leaf.target) : undefined;
  const region = planet?.region ?? leaf.target;
  if (region !== s.region) {
    const path = regionPath(p, s.region, region);
    const next = p.regions.find((r) => r.id === path[1]);
    return next ? button(`躍遷 → ${esc(next.name)}`, "travel", next.id, "primary") : "";
  }
  return planet ? button(`導航 · ${esc(planet.name)}`, "navigate", planet.id, "primary") : "";
}

export function mainlineHtml(p: Pack, s: Save, busy: boolean) {
  const m = mainlineState(p, s);
  if (!m) return "";
  const chapter = m.quest.name;
  const progress = `${Math.min(m.total, m.index + (m.status === "done" ? 1 : 0))}/${m.total}`;
  const objective =
    m.status === "done"
      ? "目前主線已全部完成，可於航行紀錄回看。"
      : m.status === "await" || m.status === "locked"
        ? m.condition
          ? conditionLabel(p, s, m.condition)
          : "完成前一章節"
        : m.status === "encounter"
          ? `迎戰「${p.planets.find((v) => v.id === m.planet)?.name ?? "劇情戰場"}」`
          : m.status === "dialogue"
            ? "劇情進行中"
            : "新的劇情已解鎖";
  const action =
    m.status === "start" || m.status === "dialogue" || m.status === "encounter"
      ? button(
          m.status === "encounter" ? "出擊" : m.status === "start" ? "開始" : "接續",
          "flow-open",
          m.quest.id,
          "primary",
          busy,
        )
      : m.status === "await" || m.status === "locked"
        ? guide(p, s, m.condition)
        : "";
  return `<div class="mainline-card is-${m.status}" data-quest="${esc(m.quest.id)}"><span class="eyebrow">主線 ${progress}</span><strong>${esc(chapter)}</strong><p>${esc(objective)}</p>${action ? `<div class="mainline-actions">${action}</div>` : ""}</div>`;
}
