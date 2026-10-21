import { esc } from "./common";
type Row = {
  cidRow: number;
  sourceKey: string;
  name: string;
  nameEn: string;
  nameJa: string;
  rarityCode: number;
  skillName: string;
  skillDescription: string;
  contentId: string;
  status: string;
  priority: number;
  category: string;
  artBrief: string;
};
export async function mountCharacterRoster(root: HTMLElement) {
  const response = await fetch("catalog/characters.json");
  if (!response.ok) throw Error("無法載入角色製作表。");
  const rows = (await response.json()) as Row[];
  root.innerHTML = `<main class="roster-page"><header class="studio-header"><a class="brand" href="#/play">✧ GALAXY ANGEL</a><a href="#/studio">內容工坊 ↗</a></header><div class="studio-title"><span class="eyebrow">CHARACTER ART PRODUCTION</span><h1>星體少女 · 製作對照表</h1><p>原作召喚表實際引用 ${rows.length} 個 CID 目標；其中 ${rows.filter((r) => r.priority === 0).length} 人已整合，${rows.filter((r) => r.priority !== 0).length} 個後續候選含造型／變體。不是把全部敵人或占位列當成可玩少女。</p><p>名稱、稀有度碼及技能為原作研究資料；future ID、優先順序是製作建議。未取得原作完整美術，未繪角色的髮型、服裝與配色仍待設計。</p><a class="primary link-button" href="catalog/future-characters.csv" download>下載完整 CSV（Excel 可開啟） ↓</a></div><div class="roster-filters"><input id="roster-search" placeholder="搜尋名稱、Key、技能…" aria-label="搜尋角色"><select id="roster-filter"><option value="future">待繪製／待實裝</option><option value="priority">建議下一批</option><option value="all">全部角色</option><option value="done">已整合角色</option></select><strong id="roster-count"></strong></div><div class="roster-table-wrap"><table class="roster-table"><thead><tr><th>順序／CID</th><th>角色對照</th><th>基礎碼</th><th>原作技能線索</th><th>美術與實裝</th></tr></thead><tbody id="roster-rows"></tbody></table></div></main>`;
  const draw = () => {
    const q = root
        .querySelector<HTMLInputElement>("#roster-search")!
        .value.toLowerCase(),
      filter = root.querySelector<HTMLSelectElement>("#roster-filter")!.value;
    const selected = rows
      .filter(
        (r) =>
          (filter === "all" ||
            (filter === "done" && r.priority === 0) ||
            (filter === "priority" && r.priority > 0 && r.priority < 99) ||
            (filter === "future" && r.priority !== 0)) &&
          JSON.stringify(r).toLowerCase().includes(q),
      )
      .sort((a, b) => a.priority - b.priority || a.cidRow - b.cidRow);
    root.querySelector("#roster-count")!.textContent =
      `${selected.length} 個目標`;
    root.querySelector("#roster-rows")!.innerHTML = selected
      .map(
        (r) =>
          `<tr><td>${r.priority === 99 ? "未排" : r.priority === 0 ? "已整合" : "P" + r.priority}<small>CID ${r.cidRow}</small></td><td><strong>${esc(r.name)}</strong><small>${esc(r.sourceKey)} · ${esc(r.nameEn)}</small><code>${esc(r.contentId)}</code></td><td>${r.rarityCode}<small>原作碼</small></td><td><strong>${esc(r.skillName)}</strong><p>${esc(r.skillDescription)}</p></td><td><span class="tags">${esc(r.status)}</span><small>${esc(r.category)}</small><p>${esc(r.artBrief)}</p></td></tr>`,
      )
      .join("");
  };
  root.querySelector("#roster-search")!.addEventListener("input", draw);
  root.querySelector("#roster-filter")!.addEventListener("change", draw);
  draw();
  return () => {};
}
