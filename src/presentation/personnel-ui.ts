import type { Pack, Character } from "../content/schema";
import type { Save, Owned } from "../domain/model";
import { stats, costScale } from "../domain/model";
import { acquisitionSources } from "../content/queries";
import { skillMechanic } from "../content/descriptions";
import { esc, button, amounts, stars } from "./common";
import { rosterGroups } from "./roster-groups";
import { skillGlyph } from "./operator-card";
import { vfxFamily } from "./combat-vfx";
const smallArt = import.meta.glob("../../art/ui/operator-portraits-v1/*.webp", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;
export type PersonnelState = {
  view: "owned" | "all";
  category: string;
  query: string;
};
export type ProfileTab = "stats" | "skill" | "source";
function image(p: Pack, c: Character, small = false) {
  const file = c.id.replace(/[^a-z0-9.-]/g, "_") + ".webp";
  return (
    (small && smallArt[`../../art/ui/operator-portraits-v1/${file}`]) ||
    p.assets.find((a) => a.id === c.portrait)?.src ||
    ""
  );
}
function category(p: Pack, c: Character) {
  const family = vfxFamily(p.skills.find((s) => s.id === c.skill)!);
  return family === "shield"
    ? "防護"
    : family === "gravity" || family === "time"
      ? "控制"
      : ["heal", "enhance", "summon"].includes(family)
        ? "支援"
        : "攻擊";
}
export function personnelEntries(p: Pack, s: Save, state: PersonnelState) {
  const groups = rosterGroups(s),
    q = state.query.trim().toLocaleLowerCase();
  return p.characters
    .filter((c) => c.status === "active")
    .filter(
      (c) =>
        state.view === "all" ||
        groups.some((g) => g.primary.definition === c.id),
    )
    .filter((c) => !state.category || category(p, c) === state.category)
    .filter((c) => !q || `${c.name} ${c.role}`.toLocaleLowerCase().includes(q))
    .map((c) => ({
      c,
      group: groups.find((g) => g.primary.definition === c.id),
    }));
}
export function personnelCards(p: Pack, s: Save, state: PersonnelState) {
  const entries = personnelEntries(p, s, state);
  return (
    entries
      .map(({ c, group }) => {
        const o = group?.primary,
          team = o && s.team.includes(o.id),
          assigned =
            o && Object.values(s.colonies).some((v) => v.assigned === o.id),
          sk = p.skills.find((v) => v.id === c.skill)!;
        return `<button class="character-card personnel-card ${o ? "is-owned" : "is-locked"} ${team ? "is-team" : ""}" data-action="${o ? "character" : "roster-preview"}" data-id="${esc(o?.id ?? c.id)}" data-character="${esc(c.id)}" aria-label="${esc(c.name)}${o ? `，等級 ${o.level}` : "，未取得"}"><span class="personnel-card-art"><img class="personnel-portrait" src="${esc(image(p, c, true))}" alt="" loading="lazy"></span><span class="personnel-card-shade" aria-hidden="true"></span><span class="personnel-card-level">${o ? `LV.${String(o.level).padStart(2, "0")}` : "LOCKED"}</span><span class="personnel-card-glyph" title="${esc(sk.name)}">${skillGlyph(sk)}</span>${team || assigned ? `<span class="personnel-card-status">${team ? "編隊中" : "派駐中"}</span>` : ""}<span class="personnel-card-copy"><span class="rarity">${stars(c, o)}</span><strong>${esc(c.name)}</strong><span class="personnel-card-class">${category(p, c)}${group && group.copies.length > 1 ? ` · ×${group.copies.length}` : ""}</span></span></button>`;
      })
      .join("") ||
    '<p class="personnel-empty">沒有符合條件的少女。可調整篩選或搜尋。</p>'
  );
}
export function personnelPage(p: Pack, s: Save, state: PersonnelState) {
  const owned = new Set(s.roster.map((o) => o.definition)).size,
    total = p.characters.filter((c) => c.status === "active").length;
  return `<div class="personnel-page"><div class="personnel-toolbar"><label class="personnel-search"><span aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></svg></span><input id="roster-query" type="search" value="${esc(state.query)}" placeholder="搜尋少女" aria-label="搜尋少女"></label>${button("編隊 →", "panel", "formation", "personnel-formation")}</div><div class="personnel-view-tabs" role="group" aria-label="名冊範圍">${button(`持有少女 <b>${String(owned).padStart(2, "0")}</b>`, "roster-tab", "owned", state.view === "owned" ? "is-selected" : "")}${button(`全部檔案 <b>${total}</b>`, "roster-tab", "all", state.view === "all" ? "is-selected" : "")}</div><div class="personnel-filter"><span>技能類型</span><nav aria-label="技能類型篩選">${["", "攻擊", "防護", "支援", "控制"].map((id) => button(id || "全部", "roster-category", id, state.category === id ? "is-selected" : "")).join("")}</nav><small id="roster-result-count">${personnelEntries(p, s, state).length} 位</small></div><section id="roster-cards" class="character-grid personnel-grid" aria-label="少女檔案">${personnelCards(p, s, state)}</section><p class="personnel-hint">點選檔案查看能力、戰技與培養方式</p></div>`;
}
export function profilePage(
  p: Pack,
  s: Save,
  c: Character,
  o: Owned | undefined,
  tab: ProfileTab,
) {
  const st = o
      ? stats(p, o)
      : { hp: c.hp, attack: c.attack, defense: c.defense },
    sk = p.skills.find((v) => v.id === c.skill)!;
  const copies = o ? s.roster.filter((v) => v.definition === c.id) : [];
  let detail =
    tab === "skill"
      ? `<section class="dossier-skill"><span class="dossier-skill-icon">${skillGlyph(sk)}</span><div><span class="eyebrow">ACTIVE SKILL · ${sk.cooldown}s</span><h3>${esc(sk.name)}</h3><p>${esc(sk.description)}</p><p class="dossier-mechanic">${esc(skillMechanic(sk))}</p></div></section>`
      : tab === "source"
        ? `<section class="dossier-source"><span class="eyebrow">ACQUISITION</span><h3>取得方式</h3><ul>${
            acquisitionSources(p, c.id)
              .map((t) => `<li>${esc(t)}</li>`)
              .join("") || "<li>目前無取得來源</li>"
          }</ul></section>`
        : `<section class="dossier-overview"><p>${esc(c.description)}</p>${o ? `<div class="dossier-training"><span>同調 <b>${o.resonance ?? 0} / 5</b></span><small>每次三項基礎能力 +${p.rules.duplicateStatBonus * 100}% · 第五次追加紫星<br>滿階後新共鳴依實際配方返還 ${p.rules.duplicateRefundRate * 100}% 四資源</small></div><div class="dossier-cost-label">強化所需資源</div><div class="costs">${amounts(p, costScale(p.rules.levelCost, o.level))}</div>` : '<p class="muted">未取得 · 此處顯示基礎能力</p>'}</section>`;
  return `<div class="dossier-page"><section class="dossier-viewport"><div class="dossier-environment" aria-hidden="true"></div><span class="dossier-index">STELLAR PERSONNEL / ${String(p.characters.findIndex((v) => v.id === c.id) + 1).padStart(3, "0")}</span><img class="dossier-portrait" src="${esc(image(p, c))}" alt="${esc(c.name)}"><div class="dossier-name"><span class="rarity">${stars(c, o)}</span><h2>${esc(c.name)}</h2><p>${esc(c.role)}</p><span class="dossier-level">${o ? `LEVEL ${String(o.level).padStart(2, "0")}` : "UNOBTAINED"}</span></div><div class="dossier-stat-rail"><div><small>${o ? "生命" : "基礎生命"}</small><strong>${Math.ceil(o?.hp ?? st.hp).toLocaleString()}</strong>${o ? `<span>/ ${st.hp.toLocaleString()}</span>` : ""}</div><div><small>攻擊</small><strong>${Math.round(st.attack).toLocaleString()}</strong></div><div><small>防禦</small><strong>${Math.round(st.defense).toLocaleString()}</strong></div></div></section><nav class="dossier-tabs" aria-label="角色情報">${(["stats", "skill", "source"] as const).map((id, i) => button(["能力／培養", "戰技情報", "取得方式"][i], "profile-tab", id, tab === id ? "is-selected" : "")).join("")}</nav><div class="dossier-sheet">${detail}${copies.length > 1 ? `<details class="profile-instance-picker"><summary>持有 ${copies.length} 位 · 選擇持有實例</summary><div class="copy-picker">${copies.map((v) => button(`Lv.${v.level} · 同調 ${v.resonance ?? 0}/5${s.team.includes(v.id) ? " · 編隊中" : ""}`, "character", v.id, v.id === o?.id ? "selected" : "")).join("")}</div></details>` : ""}</div></div>`;
}
export function profileActions(
  p: Pack,
  s: Save,
  o: Owned | undefined,
  combat: boolean,
) {
  if (!o)
    return `<div class="dossier-actions readonly">${button("返回名冊", "panel", "roster", "text-button")}${button("查看取得方式", "profile-tab", "source", "primary")}</div>`;
  const st = stats(p, o),
    working = s.jobs.some((j) => j.owner === o.id),
    assigned = Object.values(s.colonies).some((v) => v.assigned === o.id),
    teamed = s.team.includes(o.id);
  return `<div class="dossier-actions">${button("強化 +1", "level", o.id, "primary")}${button("整補", "heal", o.id, "", o.hp >= st.hp || working)}${button(teamed ? "移出編隊" : "加入編隊", "team", o.id, "", combat || (teamed ? s.team.length <= 1 : s.team.length >= p.rules.teamSize) || working || assigned)}${button(`同調 ${o.resonance ?? 0}/5`, "open-feed", o.id, "", combat || (o.resonance ?? 0) >= 5 || working || assigned)}</div>`;
}

export const personnelArt = image;
