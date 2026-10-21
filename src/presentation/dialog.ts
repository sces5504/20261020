import { esc } from "./common";
let active: (() => void) | undefined;
/** In-game confirmation. Never opens a browser-native prompt. */
export function ask(message: string, title = "確認操作"): Promise<boolean> {
  if (active) return Promise.resolve(false);
  return new Promise((resolve) => {
    const before = document.activeElement as HTMLElement | null;
    const layer = document.createElement("div");
    layer.className = "game-confirm-layer";
    layer.innerHTML = `<section class="game-confirm" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title"><span class="eyebrow">COMMAND CONFIRMATION</span><h2 id="confirm-title">${esc(title)}</h2><p>${esc(message)}</p><div class="inline-actions"><button data-answer="no">取消</button><button data-answer="yes" class="primary">確認</button></div></section>`;
    const finish = (ok: boolean) => {
      layer.remove();
      document.removeEventListener("keydown", keys, true);
      window.removeEventListener("hashchange", cancel);
      active = undefined;
      window.dispatchEvent(new Event("stella-dialog-close"));
      before?.focus();
      resolve(ok);
    };
    const cancel = () => finish(false);
    const keys = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopImmediatePropagation();
        finish(false);
      }
      if (e.key === "Tab") {
        e.preventDefault();
        const buttons = [
          ...layer.querySelectorAll<HTMLButtonElement>("button"),
        ];
        buttons[document.activeElement === buttons[0] ? 1 : 0].focus();
      }
    };
    layer.addEventListener("click", (e) => {
      const a = (e.target as HTMLElement).closest<HTMLElement>("[data-answer]");
      if (a) finish(a.dataset.answer === "yes");
    });
    active = cancel;
    document.body.append(layer);
    document.addEventListener("keydown", keys, true);
    window.addEventListener("hashchange", cancel);
    window.dispatchEvent(new Event("stella-dialog-open"));
    layer.querySelector<HTMLButtonElement>("button")!.focus();
  });
}
