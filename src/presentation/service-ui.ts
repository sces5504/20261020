import type { Pack, Character } from "../content/schema";
import type { Save, Owned } from "../domain/model";
import { button, esc, stars } from "./common";
import { personnelArt } from "./personnel-ui";
export function settingsPage(
  p: Pack,
  s: Save,
  o: {
    sound: boolean;
    volume: number;
    effects: boolean;
    auto: boolean;
    test: boolean;
  },
) {
  return `<div class="service-page settings-page"><section class="settings-section"><div class="settings-section-heading"><span>01</span><h3>聲音與畫面</h3><small>AUDIO / DISPLAY</small></div><div class="preference-row"><span><strong>遊戲音效</strong><small>介面與戰鬥音效</small></span>${button(o.sound ? "開啟" : "關閉", "sound", "", "preference-toggle " + (o.sound ? "is-on" : ""))}</div><label class="preference-row volume-row"><span><strong>音效音量</strong><small>調整播放音量</small></span><input id="audio-volume" type="range" min="0" max="1" step="0.05" value="${o.volume}" aria-label="音效音量"></label><div class="preference-row"><span><strong>戰鬥特效</strong><small>精簡模式保留有效危險提示</small></span>${button(o.effects ? "精簡" : "完整", "effects", "", "preference-toggle")}</div><div class="preference-row"><span><strong>自動技能</strong><small>手動點選下方角色仍可施放</small></span>${button(o.auto ? "開啟" : "關閉", "auto", "", "preference-toggle " + (o.auto ? "is-on" : ""))}</div></section><section class="settings-section"><div class="settings-section-heading"><span>02</span><h3>進度與存檔</h3><small>VOYAGE DATA</small></div><p class="service-note">進度自動保存在此瀏覽器。跨裝置時，可匯出後於另一裝置匯入。</p><div class="save-action-grid">${button("匯出存檔", "export-save", "", "primary")}<label class="file-button">匯入存檔<input id="import-save" type="file" accept="application/json,.json"></label>${button("匯出還原備份", "export-backup", "", "")}</div><details class="voyage-reset"><summary>開始其他航跡</summary><p>開始前會先備份目前進度。</p><div>${button("開始新航跡（先備份）", "new-voyage")}${p.regions
    .filter((r) => r.campaignStart)
    .map((r) => button(`開始「${esc(r.name)}」航跡`, "new-voyage", r.id))
    .join(
      "",
    )}</div></details></section><section class="settings-section"><div class="settings-section-heading"><span>03</span><h3>航行支援</h3><small>SUPPORT</small></div><div class="support-links">${button("操作指南 →", "panel", "guide")}<a href="gallery.html">少女圖鑑 <span>↗</span></a><a href="#/catalog">角色資料 <span>↗</span></a><a href="#/studio">內容工坊 <span>↗</span></a>${o.test ? '<a href="#/play">返回正式進度 <span>↗</span></a>' : ""}</div><div class="build-caption"><span>GALAXY ANGEL</span><small>核心 ${esc(p.version)} · 本機航跡</small></div></section></div>`;
}
export function battleResult(
  p: Pack,
  s: Save,
  r: { victory: boolean; title: string; message: string; planet?: string },
) {
  const v = p.planets.find((v) => v.id === r.planet);
  return `<div class="sortie-result ${r.victory ? "is-victory" : "is-report"}"><div class="sortie-result-art" aria-hidden="true"></div><span class="result-overline">${r.victory ? "MISSION COMPLETE" : "VOYAGE REPORT"}</span><div class="result-word">${r.victory ? "VICTORY" : "REPORT"}</div><h3>${esc(r.title)}</h3><div class="result-divider"></div><p>${esc(r.message)}</p><div class="result-command">${v && r.victory && v.kind === "planet" && !s.colonies[v.id]?.active ? button("啟動剛解放的星球", "result-activate", v.id, "primary") : ""}${button("返回航線 →", "close", "", "primary")}</div></div>`;
}
export function arrivalPage(p: Pack, s: Save, c: Character, o: Owned) {
  const repeated = s.roster.filter((v) => v.definition === c.id).length > 1;
  return `<div class="arrival-page"><div class="arrival-environment" aria-hidden="true"></div><div class="arrival-watermark" aria-hidden="true">CONNECTION</div><img class="arrival-portrait" src="${esc(personnelArt(p, c))}" alt="${esc(c.name)}"><div class="arrival-copy"><span class="arrival-kicker">${repeated ? "RESONANCE" : "NEW CONNECTION"}</span><span class="rarity">${stars(c, o)}</span><h2>${esc(c.name)}</h2><p class="arrival-role">${esc(c.role)}</p><p>${esc(c.description)}</p><small>${repeated ? "再次相遇 · 少女已加入持有名冊" : "新的星光 · 少女已加入持有名冊"}</small></div><span class="arrival-queue">待確認 ${s.acquisitionQueue.length} 位</span></div>`;
}
