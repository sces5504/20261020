import { published } from "../content";
import { esc } from "./common";
export function mountArtGallery(root: HTMLElement) {
  let query = "",
    mode: "portrait" | "sprite" = "portrait";
  const all = published.characters.filter((c) => c.status === "active");
  root.innerHTML = `<main class="art-gallery"><header class="studio-header"><a class="brand" href="./#/play">✧ GALAXY ANGEL</a><a href="./#/play">進入遊戲 ↗</a></header><div class="studio-title"><div><span class="eyebrow">CHARACTER GALLERY</span><h1>星河圖鑑 · ${all.length} 位少女</h1><p>與遊戲正式角色資料同步，欣賞主立繪與 Q 版。</p></div></div><div class="gallery-toolbar"><label>搜尋少女 <input id="gallery-search" type="search" placeholder="名稱、星級或角色 ID"></label><button id="gallery-mode">切換 Q 版</button><a href="./#/catalog">角色資料 ↗</a></div><section class="art-originals" id="gallery-grid"></section><p id="gallery-empty" hidden>沒有符合的少女</p></main>`;
  const draw = () => {
    const list = all.filter((c) =>
      `${c.name} ${c.id} ${c.rarity}星`.toLowerCase().includes(query),
    );
    root
      .querySelector("#gallery-empty")!
      .toggleAttribute("hidden", list.length > 0);
    root.querySelector("#gallery-grid")!.innerHTML = list
      .map((c) => {
        const a = published.assets.find((a) => a.id === c[mode]);
        return `<article data-gallery-character="${esc(c.id)}"><div class="section-label">${esc(c.name)} <span>${"★".repeat(c.rarity)}</span></div>${a ? `<a href="${esc(a.src)}" target="_blank" rel="noopener"><img src="${esc(a.src)}" alt="${esc(c.name)} ${mode === "portrait" ? "主立繪" : "Q版"}" loading="lazy"></a>` : "<p>素材製作中</p>"}<small>${mode === "portrait" ? "主立繪" : "Q版"} · ${esc(c.role)}</small></article>`;
      })
      .join("");
  };
  root.querySelector<HTMLInputElement>("#gallery-search")!.oninput = (e) => {
    query = (e.target as HTMLInputElement).value.trim().toLowerCase();
    draw();
  };
  root.querySelector<HTMLButtonElement>("#gallery-mode")!.onclick = (e) => {
    mode = mode === "portrait" ? "sprite" : "portrait";
    (e.target as HTMLElement).textContent =
      mode === "portrait" ? "切換 Q 版" : "切換主立繪";
    draw();
  };
  draw();
  return () => {};
}
