import { mechanicRow, collectActions } from "./skill-editor";
import type { Kind, Pack } from "../content/schema";
import { esc } from "./common";
const moneyFields = new Set([
  "cost",
  "reward",
  "activationCost",
  "production",
  "healCost",
  "resupplyCost",
  "levelCost",
]);
export function complexField(
  p: Pack,
  kind: Kind,
  k: string,
  v: unknown,
  label: string,
): string | null {
  const wrap = (body: string) =>
    `<fieldset class="field full complex-field" data-complex="${k}"><legend>${esc(label)}</legend>${body}</fieldset>`;
  if (k === "actions" && Array.isArray(v))
    return wrap(
      `<p>依序執行各動作；蓄力與逐發間隔可獨立設定。數值保存時會校驗。</p><div class="mechanic-rows">${v.map(mechanicRow).join("")}</div><button type="button" data-action="add-mechanic">＋ 新增動作</button>`,
    );
  if (moneyFields.has(k) && v && typeof v === "object" && !Array.isArray(v))
    return wrap(
      `<div class="resource-fields">${p.resources.map((r) => `<label>${esc(r.name)}<input type="number" min="0" step="any" data-resource="${esc(r.id)}" value="${(v as Record<string, number>)[r.id] ?? 0}"></label>`).join("")}</div>`,
    );
  if (k === "recipe" && Array.isArray(v))
    return wrap(
      `<div class="resource-fields">${p.resources.map((r, i) => `<label>${esc(r.name)}<input type="number" min="1" max="999" data-index="${i}" value="${v[i]}"></label>`).join("")}</div>`,
    );
  if (
    (k === "requires" || k === "requiresActive" || k === "dropCharacters") &&
    Array.isArray(v)
  ) {
    const list =
      k === "dropCharacters"
        ? p.characters
        : kind === "research"
          ? p.research
          : p.planets;
    return wrap(
      `<div class="checkbox-grid">${list.map((e) => `<label><input type="checkbox" data-reference="${esc(e.id)}" ${v.includes(e.id) ? "checked" : ""}>${esc(e.name)}</label>`).join("")}</div>`,
    );
  }
  if (k === "enemies" && Array.isArray(v))
    return wrap(
      `<div class="spawn-rows">${v.map((row) => spawnRow(p, row.enemy, row.count, row.level ?? 1)).join("")}</div><button data-action="add-spawn" type="button">＋ 新增敵群</button>`,
    );
  if (k === "dialogue" && Array.isArray(v))
    return wrap(
      `<div class="dialogue-rows">${v.map((row) => dialogueRow(row.speaker, row.text)).join("")}</div><button data-action="add-dialogue" type="button">＋ 新增對白</button>`,
    );
  return null;
}
export function spawnRow(p: Pack, id: string, count: number, level = 1) {
  return `<div class="spawn-row"><select data-spawn-enemy>${p.enemies.map((e) => `<option value="${esc(e.id)}" ${e.id === id ? "selected" : ""}>${esc(e.name)}</option>`).join("")}</select><input type="number" min="1" max="30" data-spawn-count value="${count}" aria-label="敵人數量"><input type="number" min="1" max="150" data-spawn-level value="${level}" aria-label="敵人等級"><button data-action="remove-row" type="button">移除</button></div>`;
}
export function dialogueRow(speaker: string, text: string) {
  return `<div class="dialogue-row"><label>發言者<input data-speaker value="${esc(speaker)}"></label><label>對白<textarea data-line-text rows="3">${esc(text)}</textarea></label><button data-action="remove-row" type="button">移除</button></div>`;
}
export function collectComplex(
  root: HTMLElement,
  raw: Record<string, unknown>,
) {
  for (const group of root.querySelectorAll<HTMLElement>("[data-complex]")) {
    const k = group.dataset.complex!;
    if (k === "actions") {
      const actions = collectActions(group);
      if (actions.length) raw[k] = actions;
      else delete raw[k];
    } else if (moneyFields.has(k))
      raw[k] = Object.fromEntries(
        [...group.querySelectorAll<HTMLInputElement>("[data-resource]")].map(
          (i) => [i.dataset.resource!, Number(i.value)],
        ),
      );
    else if (k === "recipe")
      raw[k] = [
        ...group.querySelectorAll<HTMLInputElement>("[data-index]"),
      ].map((i) => Number(i.value));
    else if (
      k === "requires" ||
      k === "requiresActive" ||
      k === "dropCharacters"
    )
      raw[k] = [
        ...group.querySelectorAll<HTMLInputElement>("[data-reference]:checked"),
      ].map((i) => i.dataset.reference);
    else if (k === "enemies")
      raw[k] = [...group.querySelectorAll<HTMLElement>(".spawn-row")].map(
        (row) => ({
          enemy:
            row.querySelector<HTMLSelectElement>("[data-spawn-enemy]")!.value,
          count: Number(
            row.querySelector<HTMLInputElement>("[data-spawn-count]")!.value,
          ),
          level: Number(
            row.querySelector<HTMLInputElement>("[data-spawn-level]")?.value ??
              1,
          ),
        }),
      );
    else if (k === "dialogue")
      raw[k] = [...group.querySelectorAll<HTMLElement>(".dialogue-row")].map(
        (row) => ({
          speaker: row.querySelector<HTMLInputElement>("[data-speaker]")!.value,
          text: row.querySelector<HTMLTextAreaElement>("[data-line-text]")!
            .value,
        }),
      );
  }
}
export function acquisitionFields(p: Pack, id: string) {
  return `<fieldset class="field full"><legend>取得方式 · 修改後實際生效</legend><p class="muted">共鳴、初始隊伍與配方由上方欄位控制。以下設定首次解放掉落與任務獎勵。</p><div class="checkbox-grid">${p.planets.map((v) => `<label><input type="checkbox" data-get-planet="${esc(v.id)}" ${v.dropCharacters.includes(id) ? "checked" : ""}>${esc(v.name)} 首次解放</label>`).join("")}${p.quests.map((q) => `<label><input type="checkbox" data-get-quest="${esc(q.id)}" ${q.character === id ? "checked" : ""}>${esc(q.name)} 獎勵${q.character && q.character !== id ? "（替換原獎勵角色）" : ""}</label>`).join("")}</div></fieldset>`;
}
