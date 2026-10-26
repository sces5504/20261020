import type { Pack, Character, Skill } from "../content/schema";
import type { Owned } from "../domain/model";
import type { Unit } from "../domain/combat";
import { portrait, esc, stars } from "./common";
import { vfxFamily } from "./combat-vfx";
const portraits = import.meta.glob(
  "../../art/ui/operator-portraits-v1/*.webp",
  { eager: true, query: "?url", import: "default" },
) as Record<string, string>;
import cropManifest from "../../art/ui/operator-portraits-v1/manifest.json";
// A layout crop is only valid while the character still uses the art it was cut from.
const cropSource = new Map(
  (cropManifest as { character: string; sourceAsset: string }[]).map((v) => [
    v.character,
    v.sourceAsset,
  ]),
);
export function skillGlyph(s: Skill) {
  const paths: Record<string, string> = {
    beam: '<path d="M3 8h6l12-5v18L9 16H3zM9 8v8M12 10h7M12 14h7"/>',
    gravity:
      '<ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-25 12 12)"/><circle cx="12" cy="12" r="4"/><path d="m3 4 3 1-2 3M21 20l-3-1 2-3"/>',
    shield: '<path d="m12 2 8 4-1 9-7 7-7-7-1-9zM8 11l3 3 6-6"/>',
    projectile:
      '<path d="m4 20 7-7m-9 1 6-6m2 13 6-6M11 5l5-3 6 6-3 5zM14 8l4-4M17 11l4-4"/>',
    burst: '<path d="m12 1 3 7 7-2-5 6 5 6-7-2-3 7-3-7-7 2 5-6-5-6 7 2z"/>',
    dash: '<path d="m14 3 8 9-8 9M3 8h11M1 12h17M3 16h11"/>',
    summon:
      '<path d="m12 2 9 5v10l-9 5-9-5V7zM3 7l9 5 9-5M12 12v10M8 5l9 5M9 14h6"/>',
    enhance: '<path d="m12 3 7 8h-4v10H9V11H5zM3 15v5M21 15v5"/>',
    time: '<circle cx="12" cy="13" r="9"/><path d="M12 7v6l4 2M8 1h8M12 1v3"/>',
    heal: '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/>',
  };
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[vfxFamily(s)]}</svg>`;
}
export function operatorCard(
  p: Pack,
  c: Character,
  o: Owned,
  s: Skill,
  slot: number,
  combat: boolean,
) {
  const file = c.id.replace(/[^a-z0-9.-]/g, "_") + ".webp",
    src =
      cropSource.get(c.id) === c.portrait
        ? portraits[`../../art/ui/operator-portraits-v1/${file}`]
        : undefined,
    // Dedicated head crop for the phone strip; framing differs per portrait.
    face =
      !src && c.avatar ? p.assets.find((a) => a.id === c.avatar)?.src : undefined;
  return `<button class="squad-card operator-card" style="--c:${c.color}" data-action="${combat ? "cast" : "character"}" data-id="${esc(o.id)}" aria-label="${esc(c.name)} · ${esc(s.name)}"><span class="operator-art">${src ? `<img src="${esc(src)}" alt="${esc(c.name)}" loading="eager">` : portrait(p, c, true)}${face ? `<img class="operator-face" src="${esc(face)}" alt="" loading="eager">` : ""}</span><span class="operator-shade" aria-hidden="true"></span><span class="operator-slot">${String(slot + 1).padStart(2, "0")}</span><span class="operator-glyph">${skillGlyph(s)}</span><span class="operator-level">Lv.${o.level}</span><span class="operator-cd-ring"><b class="operator-cd"></b></span><span class="operator-heal" hidden></span><div class="operator-copy"><span class="rarity">${stars(c, o)}</span><strong>${esc(c.name)}</strong><div class="hp-bar"><span></span></div><small class="skill-label">${esc(s.name)}</small><span class="operator-state">${combat ? "戰技就緒" : "檢視檔案"}</span></div></button>`;
}
export function updateOperatorCard(
  card: HTMLElement,
  unit: Unit | undefined,
  hp: number,
  max: number,
  skill: Skill,
  combat: boolean,
  healEnds = 0,
) {
  // Repair countdown stays visible on the card while a heal job runs.
  const heal = card.querySelector<HTMLElement>(".operator-heal")!,
    left = Math.ceil((healEnds - Date.now()) / 1000);
  heal.hidden = left <= 0;
  if (left > 0)
    heal.textContent = `整補 ${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
  const cooling = !!unit && unit.skillCooldown > 0,
    ready = !!unit && unit.hp > 0 && !cooling;
  card.classList.toggle("skill-cooling", cooling);
  card.classList.toggle("skill-ready", ready);
  card.classList.toggle("operator-down", hp <= 0);
  card.dataset.ready = String(ready);
  const fraction = unit
    ? Math.min(1, Math.max(0, unit.skillCooldown / skill.cooldown))
    : 0;
  card.style.setProperty("--cd", String(fraction));
  card.querySelector<HTMLElement>(".hp-bar span")!.style.width =
    `${Math.max(0, (hp / max) * 100)}%`;
  card.querySelector(".operator-cd")!.textContent = cooling
    ? String(Math.ceil(unit!.skillCooldown))
    : combat
      ? "✓"
      : "＋";
  card.querySelector(".operator-state")!.textContent =
    hp <= 0
      ? "無法戰鬥"
      : cooling
        ? "冷卻中"
        : combat
          ? "戰技就緒"
          : "檢視檔案";
}
