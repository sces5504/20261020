/** A local convenience gate for static hosting, not server-side authorization. */
const sessionKey = "galaxy:studio-access";
export function studioUnlocked() {
  return sessionStorage.getItem(sessionKey) === "unlocked";
}
export function lockStudio() {
  sessionStorage.removeItem(sessionKey);
}
export function mountStudioAccess(root: HTMLElement, unlocked: () => void) {
  root.innerHTML = `<main class="studio-access"><span class="eyebrow">GALAXY ANGEL · CONTENT STUDIO</span><h1>內容工坊</h1><p>輸入工坊密碼以開啟本機內容編輯。</p><form id="studio-access-form"><label>工坊密碼<input id="studio-password" type="password" inputmode="numeric" autocomplete="off" required maxlength="32"></label><p id="studio-access-error" role="status" aria-live="polite"></p><button type="submit" class="primary">解鎖工坊</button> <a href="#/play">返回遊戲</a></form><small>此為前端入口鎖，不提供伺服器存取保護。解鎖只保留於此分頁工作階段。</small></main>`;
  const form = root.querySelector<HTMLFormElement>("form")!;
  const input = root.querySelector<HTMLInputElement>("input")!;
  const submit = (e: SubmitEvent) => {
    e.preventDefault();
    if (input.value !== "1126") {
      root.querySelector("#studio-access-error")!.textContent =
        "密碼不正確，請再試一次。";
      input.value = "";
      input.focus();
      return;
    }
    input.value = "";
    sessionStorage.setItem(sessionKey, "unlocked");
    unlocked();
  };
  form.addEventListener("submit", submit);
  input.focus();
  return () => form.removeEventListener("submit", submit);
}
