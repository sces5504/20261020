import type { Pack, Character } from "../content/schema";
export const esc = (v: unknown) =>
  String(v).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export const button = (
  label: string,
  action: string,
  id = "",
  cls = "",
  disabled = false,
) =>
  `<button class="${cls}" data-action="${action}" data-id="${esc(id)}" ${disabled ? "disabled" : ""}>${label}</button>`;
export function amounts(p: Pack, c: Record<string, number>) {
  return Object.entries(c)
    .map(
      ([id, n]) =>
        `<span class="cost" style="--c:${p.resources.find((r) => r.id === id)?.color ?? "#fff"}">◆ ${esc(p.resources.find((r) => r.id === id)?.name ?? id)} ${Number(n.toFixed(3)).toLocaleString("zh-TW", { maximumFractionDigits: 3 })}</span>`,
    )
    .join("");
}
export function portrait(p: Pack, c: Character, large = false) {
  const a = p.assets.find((a) => a.id === (large ? c.portrait : c.avatar));
  return a
    ? large
      ? `<img class="portrait large" src="${esc(a.src)}" alt="${esc(c.name)}" loading="lazy">`
      : `<div class="portrait avatar-window"><img src="${esc(a.src)}" alt="${esc(c.name)}" loading="lazy"></div>`
    : `<div class="portrait celestial ${large ? "large" : ""}" style="--c:${c.color}"><span>✧</span><small>${esc(c.name)}</small></div>`;
}

export function entityImage(
  p: Pack,
  e: { name: string; sprite?: string; background?: string; portrait?: string },
  cls = "entity-image",
) {
  const a = p.assets.find(
    (a) => a.id === (e.portrait || e.sprite || e.background),
  );
  return a
    ? `<img class="${esc(cls)}" src="${esc(a.src)}" alt="${esc(e.name)}" loading="lazy">`
    : "";
}
