import type { Pack } from "../content/schema";
import type { Save } from "../domain/model";
import { esc } from "./common";
const operations = new URL(
  "../../art/ui/interface-suite-v1/operations.webp",
  import.meta.url,
).href;
const sortie = new URL(
  "../../art/ui/interface-suite-v1/sortie.webp",
  import.meta.url,
).href;
/** Shared painted mastheads, with current save data; no progression or probabilities. */
export function menuScene(panel: string, p: Pack, s: Save) {
  const table: Record<string, [string, string, string, string]> = {
    roster: [
      "PERSONNEL ARCHIVE",
      "少女名冊",
      `${new Set(s.roster.map((o) => o.definition)).size} 位少女 · ${s.roster.length} 位持有`,
      operations,
    ],
    formation: [
      "FLEET ORGANIZATION",
      "隊伍配置",
      `${s.team.length} / ${p.rules.teamSize} 人 · 01 為隊長`,
      operations,
    ],
    research: [
      "RESEARCH DIVISION",
      "研究計畫",
      `已完成 ${s.research.length} / ${p.research.length} 項研究`,
      operations,
    ],
    planets: [
      "COLONY NETWORK",
      "生產網路",
      `${Object.values(s.colonies).filter((c) => c.active).length} 顆啟動中 · 工作持續結算`,
      operations,
    ],
    colony: [
      "PLANETARY OPERATIONS",
      "星球建設",
      "管理建設、產能與派駐少女",
      operations,
    ],
    challenges: [
      "EXPEDITION ORDERS",
      "挑戰航線",
      "高難・活動・每日母艦",
      sortie,
    ],
    regions: [
      "STELLAR NAVIGATION",
      "星域躍遷",
      `目前星域：${p.regions.find((r) => r.id === s.region)?.name ?? ""}`,
      sortie,
    ],
    skills: [
      "COMBAT INTELLIGENCE",
      "技能檔案",
      "施放條件、作用方式與冷卻情報",
      sortie,
    ],
    "enemy-intel": [
      "HOSTILE IDENTIFICATION",
      "敵群識別",
      "編隊、裝備與接敵情報",
      sortie,
    ],
    archive: [
      "VOYAGE PREFERENCES",
      "航行偏好",
      "存檔、音效與操作設定",
      operations,
    ],
    guide: ["COMMANDER HANDBOOK", "操作手冊", "探索・戰鬥・經營・收集", sortie],
    feed: [
      "RESONANCE SYNCHRONIZATION",
      "同調強化",
      "同角色的星光，在此交會",
      operations,
    ],
  };
  const entry = table[panel];
  if (!entry) return "";
  return `<section class="panel-masthead"><img src="${esc(entry[3])}" alt="" aria-hidden="true"><div><span class="eyebrow">${entry[0]}</span><h3>${esc(entry[1])}</h3><p>${esc(entry[2])}</p></div></section>`;
}
