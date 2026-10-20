import type { Pack } from "./schema";
export function acquisitionSources(p: Pack, id: string) {
  const c = p.characters.find((v) => v.id === id);
  if (!c) return [];
  return [
    ...(c.starter ? ["初始隊伍"] : []),
    ...(c.status === "active" && c.summonable !== false ? ["四資源共鳴"] : []),
    ...p.planets
      .filter((v) => v.dropCharacters.includes(id))
      .map((v) => `${v.name} 首次解放`),
    ...p.quests
      .filter((q) => q.character === id)
      .map((q) => `任務「${q.name}」`),
  ];
}
