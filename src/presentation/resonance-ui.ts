import type { Pack } from "../content/schema";
import type { Save } from "../domain/model";
import { button, esc, resourceIcon } from "./common";

/** A presentation-only representative; values and actions keep the existing contracts. */
export function resonancePanel(
  p: Pack,
  s: Save,
  recipe: number[],
  count: number,
  jobs: string,
) {
  const occupied = s.jobs.filter((j) => j.kind === "summon").length;
  return `<div class="resonance-workbench">
    <section class="resonance-visual" aria-label="星體共鳴艙美術候選">
      <div class="resonance-visual-art" role="img" aria-label="金屬軌道環與藍色星核構成的星艦共鳴機構"></div>
      <div class="resonance-visual-kicker"><span></span> STELLAR CONNECTION <span></span></div>
      <div class="resonance-visual-copy"><span class="eyebrow">THE ECHOES OF DISTANT STARS</span><h3>循著星光，與妳相遇</h3><p>投入資源，接續星海另一端的訊號。</p></div>
      <div class="resonance-corner resonance-corner-a" aria-hidden="true"></div><div class="resonance-corner resonance-corner-b" aria-hidden="true"></div>
    </section>
    <div class="resonance-console">
      <div class="resonance-console-heading"><div><span class="eyebrow">RESONANCE CONTROL</span><h3>共鳴參數</h3></div><span class="resonance-slots"><i></i> 席位 ${occupied} / ${p.rules.summonSlots}</span></div>
      <label class="resonance-preset"><span>配方預設</span><select id="preset" aria-label="配方預設"><option value="" disabled>自訂配方</option>${p.characters.map((c) => `<option value="${esc(c.id)}" ${c.recipe.every((v, i) => v === recipe[i]) ? "selected" : ""}>${esc(c.name)}的共鳴配方</option>`).join("")}</select></label>
      <div class="resonance-input-heading"><span>單組資源投入</span><small>RESOURCE INPUT</small></div>
      <div class="recipe-inputs resonance-resources">${p.resources.map((r, i) => `<label style="--c:${r.color}"><span class="resonance-resource-art">${resourceIcon(p, r)}</span><span class="resonance-resource-name">${esc(r.name)}</span><input class="recipe" data-slot="${i}" aria-label="${esc(r.name)}單組投入" type="number" min="1" max="999" value="${recipe[i]}"><small>持有 ${Math.floor(s.wallet[r.id] ?? 0).toLocaleString("zh-TW")}</small></label>`).join("")}</div>
      <label class="resonance-batch"><span>批次數量<small>每組 ${p.rules.summonSeconds} 秒</small></span><input id="batch-count" aria-label="批次數量" type="number" min="1" max="${p.rules.summonSlots}" value="${count}"></label>
      <div id="recipe-info" class="resonance-recipe-info" aria-live="polite"></div>

    </div>
  </div><section class="resonance-job-section"><div class="resonance-job-title"><h3>進行中的工作</h3><span>OPERATION LOG</span></div><div id="jobs">${jobs}</div></section>`;
}

export function resonanceAction() {
  return `<div class="resonance-action-content">${button('<span>確認投入並共鳴</span><b aria-hidden="true">→</b>', "summon", "", "primary resonance-activate")}<p class="resonance-disclosure">配方不保證取得指定少女 · 結果在開工時確定</p></div>`;
}
