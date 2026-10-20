import "./style.css";
import { published } from "./content";
import { validatePack, type Pack } from "./content/schema";
import { Game } from "./application/game";
import { read, download } from "./platform/storage";
import { mountGame, esc } from "./presentation/ui";
import { mountArtGallery } from "./presentation/art-gallery";
import { mountStudio } from "./presentation/studio";
const root = document.querySelector<HTMLElement>("#app")!;
let dispose: (() => void | Promise<void>) | undefined,
  loading = false,
  pending = false;
async function route() {
  if (loading) {
    pending = true;
    return;
  }
  loading = true;
  await dispose?.();
  dispose = undefined;
  root.innerHTML =
    '<div class="loading"><span>✧</span><p>正在連接星海航跡…</p></div>';
  try {
    if (location.hash.startsWith("#/art")) dispose = mountArtGallery(root);
    else if (location.hash.startsWith("#/studio"))
      dispose = await mountStudio(root);
    else {
      const test = location.hash.startsWith("#/test");
      const candidate = test ? await read<Pack>("content:test") : published;
      const checked = validatePack(candidate);
      if (!checked.pack)
        throw Error("測試內容無效，請回工坊校驗：" + checked.errors.join("\n"));
      const game = await Game.load(checked.pack, test);
      dispose = mountGame(root, game, test);
    }
  } catch (e) {
    root.innerHTML = `<main class="recovery"><span class="eyebrow">RECOVERY</span><h1>航跡需要重新連接</h1><p>${esc(e instanceof Error ? e.message : String(e))}</p><p>原進度保留，尚未覆蓋。可先匯出存檔，再恢復相容內容包。</p><button id="recover-export">匯出原存檔</button> <a href="#/studio">返回內容工坊</a> <button id="reload">重新載入</button></main>`;
    root
      .querySelector("#recover-export")
      ?.addEventListener("click", async () => {
        const s = await read(
          location.hash.startsWith("#/test") ? "save:test" : "save:main",
        );
        download("stella-recovery.json", JSON.stringify(s));
      });
    root
      .querySelector("#reload")
      ?.addEventListener("click", () => location.reload());
  } finally {
    loading = false;
    if (pending) {
      pending = false;
      void route();
    }
  }
}
window.addEventListener("hashchange", () => void route());
void route();
