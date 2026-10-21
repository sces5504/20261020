import { mountCharacterRoster } from "./presentation/character-roster";
import { ask } from "./presentation/dialog";
import "./style.css";
import { published } from "./content";
import { validatePack, type Pack } from "./content/schema";
import { Game } from "./application/game";
import { compatibilityPlan } from "./domain/migration";
import { read, download, commit } from "./platform/storage";
import { esc } from "./presentation/common";
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
    if (location.hash.startsWith("#/catalog"))
      dispose = await mountCharacterRoster(root);
    else if (location.hash.startsWith("#/art")) dispose = mountArtGallery(root);
    else if (location.hash.startsWith("#/studio"))
      dispose = await mountStudio(root);
    else {
      const test = location.hash.startsWith("#/test");
      const candidate = test ? await read<Pack>("content:test") : published;
      const checked = validatePack(candidate);
      if (!checked.pack)
        throw Error("測試內容無效，請回工坊校驗：" + checked.errors.join("\n"));
      const game = await Game.load(checked.pack, test);
      const { mountGame } = await import("./presentation/ui");
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
    try {
      const key = location.hash.startsWith("#/test")
        ? "save:test"
        : "save:main";
      const original = await read(key);
      if (original) {
        const p = location.hash.startsWith("#/test")
          ? await read<Pack>("content:test")
          : published;
        if (p) {
          const plan = compatibilityPlan(original, p);
          if (plan.changes.length) {
            const section = document.createElement("section");
            section.innerHTML = `<h2>相容性修復預覽</h2><ul>${plan.changes.map((c) => `<li>${esc(c)}</li>`).join("")}</ul><p>原存檔將先備份；隔離資料不會被刪除。</p><button id="accept-migration">備份並套用修復</button>`;
            root.querySelector("main")?.append(section);
            section.querySelector("button")!.onclick = async () => {
              if (
                !(await ask(
                  "依預覽修復？原存檔會保存在備份，缺失內容會保留於隔離區。",
                ))
              )
                return;
              try {
                plan.save.revision++;
                plan.save.migrationHistory.push(`compat:${p.version}`);
                await commit(key, plan.save, plan.save.revision - 1, true);
                location.reload();
              } catch (e) {
                section.append(String(e));
              }
            };
          }
        }
      }
    } catch {
      /* Unknown schemas remain exportable and are never guessed. */
    }
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
