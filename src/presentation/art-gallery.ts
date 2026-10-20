import { published } from "../content";
import bindings from "../../content/core/art-bindings.json";
import { esc } from "./common";
export function mountArtGallery(root: HTMLElement) {
  root.innerHTML = `<main class="art-gallery"><header class="studio-header"><a class="brand" href="#/play"><span class="brand-icon">✧</span><span>STELLA MAIDEN<small>角 色 標 準 原 圖</small></span></a><a href="#/studio">返回工坊 ↗</a></header><div class="studio-title"><div><span class="eyebrow">ORIGINAL CHARACTER REFERENCES</span><h1>六位少女 · 原始立繪</h1><p>原檔直接展示，保留原本比例、髮型、服裝與配件。</p></div></div><section class="art-originals">${bindings.bindings
    .map((b, i) => {
      const c = published.characters.find((c) => c.id === b.gameCharacterId)!,
        a = published.assets.find((a) => a.id === b.runtimeAssetId)!;
      return `<article><div class="section-label">${esc(c.name)} · 少女 ${String(i + 1).padStart(2, "0")} <span>ORIGINAL v1</span></div><img src="${esc(a.src)}" alt="${esc(c.name)} 標準立繪原圖" loading="lazy"><small>原圖版本 v1 · ${esc(c.id)}</small></article>`;
    })
    .join("")}</section></main>`;
  return () => {};
}
