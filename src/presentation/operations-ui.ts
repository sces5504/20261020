import type { Pack } from "../content/schema";
import type { Save } from "../domain/model";
import { costScale } from "../domain/model";
import { production } from "../domain/economy";
import { nodeUnlocked } from "../domain/world";
import { esc, button, amounts, entityImage } from "./common";
import { personnelArt } from "./personnel-ui";
export function formationPage(p: Pack, s: Save, combat: boolean) {
  const occupied = s.team
    .map((id, i) => {
      const o = s.roster.find((v) => v.id === id)!,
        c = p.characters.find((c) => c.id === o.definition)!;
      return `<div class="formation-slot"><span class="formation-index">${String(i + 1).padStart(2, "0")}</span>${i === 0 ? '<span class="formation-leader">隊長</span>' : ""}${button("移出", "team", id, "remove-member", combat || s.team.length <= 1)}<button class="formation-portrait" data-action="character" data-id="${esc(id)}" aria-label="查看${esc(c.name)}"><img src="${esc(personnelArt(p, c, true))}" alt="${esc(c.name)}"></button><div class="formation-identity"><strong>${esc(c.name)}</strong><small>Lv.${o.level} · 同調 ${o.resonance ?? 0}/5</small></div><div class="formation-order">${button("← 前移", "team-forward", id, "", combat || i === 0)}${button("後移 →", "team-back", id, "", combat || i === s.team.length - 1)}</div></div>`;
    })
    .join("");
  const empties = Array.from(
    { length: Math.max(0, p.rules.teamSize - s.team.length) },
    (_, j) =>
      `<div class="formation-empty"><span>${String(s.team.length + j + 1).padStart(2, "0")}</span>${button("<b>＋</b><small>選擇少女</small>", "panel", "roster", "formation-empty-add", combat)}</div>`,
  ).join("");
  const reserve = s.roster.filter((o) => !s.team.includes(o.id));
  return `<div class="operations-page"><div class="ops-summary"><div><span class="eyebrow">DEPLOYMENT ORDER</span><h3>出擊編隊</h3><p>01 為隊長 · 隊伍沿航跡跟隨</p></div><div class="ops-metric"><strong>${String(s.team.length).padStart(2, "0")}</strong><span>/ ${String(p.rules.teamSize).padStart(2, "0")}</span></div></div><div class="formation-deck"><div class="formation-slots">${occupied}</div><div class="formation-vacancies">${empties}</div></div><p class="ops-note">${combat ? "交戰中 · 編隊調整暫時鎖定" : "轉向時隊長先就位，後排等待後跟隨；掉隊時加速追上。"}</p><div class="ops-section-title"><h3>待命少女</h3><span>${reserve.length} 位</span></div><div class="reserve-grid">${
    reserve
      .map((o) => {
        const c = p.characters.find((c) => c.id === o.definition)!,
          busy = s.jobs.some((j) => j.owner === o.id),
          assigned = Object.values(s.colonies).some((v) => v.assigned === o.id);
        return `<article class="reserve-card"><img src="${esc(personnelArt(p, c, true))}" alt="${esc(c.name)}"><div><strong>${esc(c.name)}</strong><small>Lv.${o.level} · ${assigned ? "派駐中" : busy ? "工作中" : "待命"}</small>${button(s.team.length >= p.rules.teamSize ? "編隊已滿" : "加入編隊", "team", o.id, "", combat || s.team.length >= p.rules.teamSize || busy || assigned)}</div></article>`;
      })
      .join("") || '<p class="ops-empty">目前沒有待命少女。</p>'
  }</div></div>`;
}
export function researchPage(p: Pack, s: Save, jobs: string) {
  return `<div class="operations-page"><div class="ops-summary research-summary"><div><span class="eyebrow">RESEARCH DIVISION</span><h3>共振技術</h3><p>已完成 ${s.research.length} / ${p.research.length} 項 · 加成於下一場戰鬥生效</p></div></div><div class="research-tree">${p.research
    .map((r, i) => {
      const done = s.research.includes(r.id),
        job = s.jobs.find(
          (j) => j.kind === "research" && j.definition === r.id,
        ),
        missing = r.requires.filter((id) => !s.research.includes(id));
      return `<article class="research-node ${done ? "is-complete" : job ? "is-working" : missing.length ? "is-locked" : "is-available"} ${p.research[i + 1]?.requires.includes(r.id) ? "has-dependent" : ""}"><div class="research-node-marker"><span>${String(i + 1).padStart(2, "0")}</span></div><div class="research-node-main"><div class="research-node-heading">${entityImage(p, r, "research-node-art")}<div><span class="ops-state">${done ? "已完成" : job ? "研究進行中" : missing.length ? "等待前置" : "可研究"}</span><h3>${esc(r.name)}</h3><small>${r.seconds} SEC</small></div></div><p>${esc(r.description)}</p>${missing.length ? `<p class="research-prerequisite">前置：${missing.map((id) => esc(p.research.find((v) => v.id === id)?.name ?? id)).join("、")}</p>` : ""}<div class="research-node-action"><div class="costs">${amounts(p, r.cost)}</div>${button(done ? "研究完成" : job ? "研究中" : "開始研究", "research", r.id, done || job || missing.length ? "" : "primary", done || !!job || missing.length > 0)}</div></div></article>`;
    })
    .join(
      "",
    )}</div><div class="ops-section-title"><h3>工作進度</h3><span>OPERATIONS</span></div><div id="jobs">${jobs}</div></div>`;
}
export function territoriesPage(
  p: Pack,
  s: Save,
  stationed: (id?: string) => string,
) {
  const worlds = p.planets.filter(
    (v) =>
      v.kind === "planet" &&
      (s.cleared.includes(v.id) ||
        s.colonies[v.id] ||
        (v.initiallyCleared && v.region === s.region && nodeUnlocked(s, v, p))),
  );
  const rate = Object.fromEntries(
    Object.entries(production(p, s)).map(([id, n]) => [id, n * 60]),
  );
  return `<div class="operations-page"><div class="ops-summary"><div><span class="eyebrow">PLANETARY NETWORK</span><h3>領地生產網路</h3><p>${Object.values(s.colonies).filter((c) => c.active).length} 顆星球運作中 · 產量 / 分鐘</p></div></div><div class="production-rail">${amounts(p, rate)}</div><div class="territory-list">${
    worlds
      .map((v) => {
        const col = s.colonies[v.id];
        return `<article class="territory-row"><div class="territory-world">${entityImage(p, v)}<span class="ops-state">${col?.active ? "ONLINE" : "待啟動"}</span></div><div class="territory-information"><span class="eyebrow">${esc(p.regions.find((r) => r.id === v.region)?.name ?? "")}</span><h3>${esc(v.name)}</h3><p>${esc(v.description)}</p><div class="costs">${amounts(p, Object.fromEntries(Object.entries(col?.active ? production(p, { ...s, colonies: { [v.id]: col } }) : v.production).map(([id, n]) => [id, n * 60])))}</div>${stationed(col?.assigned)}</div><div class="territory-controls">${button(col?.active ? "管理建設" : "啟動星球", col?.active ? "manage-planet" : "activate", v.id, "primary")}${button("導航至星球", "navigate", v.id, "")}</div></article>`;
      })
      .join("") ||
    '<p class="ops-empty">探索並解放第一顆星球後，即可在此管理領地。</p>'
  }</div></div>`;
}
export function colonyPage(
  p: Pack,
  s: Save,
  id: string,
  stationed: string,
  jobs: string,
) {
  const v = p.planets.find((v) => v.id === id)!,
    col = s.colonies[id];
  if (!col) return "<p>請先啟動星球。</p>";
  const rate = Object.fromEntries(
    Object.entries(production(p, { ...s, colonies: { [id]: col } })).map(
      ([key, n]) => [key, n * 60],
    ),
  );
  return `<div class="operations-page">${button("← 返回領地總覽", "panel", "planets", "text-button")}<div class="colony-control-header">${entityImage(p, v)}<div><span class="eyebrow">COLONY OPERATIONS</span><h3>${esc(v.name)}</h3><span class="ops-state">${col.lost ? "產能停產中" : "生產運作中"}</span><p>每分鐘產量</p><div class="costs">${amounts(p, rate)}</div></div></div><div class="ops-section-title"><h3>建設設施</h3><span>${Object.values(col.buildings).reduce((a, b) => a + b, 0)} 級總建設</span></div><div class="facility-list">${p.buildings
    .map((b) => {
      const level = col.buildings[b.id] ?? 0,
        working = s.jobs.some(
          (j) => j.kind === "build" && j.owner === id && j.definition === b.id,
        );
      return `<article class="facility-row">${entityImage(p, b)}<div class="facility-info"><span class="eyebrow">LEVEL ${level} / ${b.maxLevel}</span><h3>${esc(b.name)}</h3><p>${esc(b.description)}</p><small>${b.seconds} SEC</small><div class="costs">${amounts(p, costScale(b.cost, level + 1))}</div></div>${button(working ? "建設中" : level >= b.maxLevel ? "已達上限" : "建造／升級", "build", b.id, working || level >= b.maxLevel ? "" : "primary", col.lost || level >= b.maxLevel || s.jobs.some((j) => j.kind === "build" && j.owner === id))}</article>`;
    })
    .join(
      "",
    )}</div><div class="ops-section-title"><h3>少女派駐</h3><span>採集站產出 +20%</span></div>${stationed}<div class="station-roster">${
    s.roster
      .filter((o) => !s.team.includes(o.id))
      .map((o) => {
        const c = p.characters.find((c) => c.id === o.definition)!;
        return `<div class="station-candidate"><img src="${esc(personnelArt(p, c, true))}" alt="${esc(c.name)}"><span><strong>${esc(c.name)}</strong><small>Lv.${o.level}</small></span>${button(col.assigned === o.id ? "撤回" : "派駐", "assign", o.id, "")}</div>`;
      })
      .join("") ||
    '<p class="ops-empty">目前無待命少女，可在編隊中移出成員。</p>'
  }</div><div class="ops-section-title"><h3>工作進度</h3><span>OPERATIONS</span></div><div id="jobs">${jobs}</div></div>`;
}
