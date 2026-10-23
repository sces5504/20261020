/** TEST DATA ONLY. No approved story, speaker attribution, or source timing. */
import { published } from "../../src/content";
import { validatePack, type Pack } from "../../src/content/schema";
export function storyFixture(mode = "defend"): Pack {
  const p = structuredClone(published);
  const source = p.planets[0],
    region = p.regions.find((r) => r.id === source.region)!;
  p.actors.push({
    id: "fixture:npc",
    name: "測試NPC（非正式故事）",
    portrait: p.characters[0].portrait,
    variants: { neutral: p.characters[0].portrait },
  });
  p.enemies.push({
    ...p.enemies[0],
    id: "fixture:enemy",
    name: "測試守軍",
    hp: 100000,
    attack: 1,
    defense: 0,
    skill: undefined,
    growthReference: undefined,
  });
  const q = {
    ...p.quests[0],
    id: "fixture:quest",
    name: "測試流程（非正式劇情）",
    repeat: "once",
    condition: "intro",
    target: "",
    count: 1,
    reward: { [p.resources[0].id]: 25 },
    character: "",
    dialogue: [{ speaker: "測試", text: "測試資料，非正式故事。" }],
    story: {
      chapter: "fixture:chapter",
      chapterRequires: [],
      steps: [
        { kind: "stage", actor: "fixture:npc", visible: true, slot: "center" },
        {
          kind: "say",
          speaker: "測試NPC",
          actor: "fixture:npc",
          text: "測試：略過呈現仍初始化。",
        },
        {
          kind: "acquire",
          character: p.characters.find((c) => !c.starter)!.id,
        },
        { kind: "event", event: "fixture:initialized" },
        { kind: "encounter", planet: "fixture:encounter" },
        { kind: "say", speaker: "測試", text: "測試：戰後對話，領獎獨立。" },
      ],
    },
  };
  p.planets.push({
    ...source,
    id: "fixture:encounter",
    name: "測試戰場",
    kind: "event",
    x: region.startX,
    y: region.startY,
    requires: [],
    requiresActive: [],
    initiallyCleared: false,
    activationCost: {},
    production: {},
    reward: {},
    dropCharacters: [],
    enemies: [{ enemy: "fixture:enemy", count: 1, level: 1 }],
    encounterPolicy: "manual",
    storyEncounter: {
      mode,
      seconds: 2,
      actors: [
        {
          id: "fixture:escort",
          character: p.characters[0].id,
          x: region.startX + 30,
          y: region.startY,
          side: "ally",
          level: 1,
          required: true,
          destination: { x: region.startX + 50, y: region.startY, radius: 10 },
        },
      ],
      waves: [
        { at: 0.5, enemies: [{ enemy: "fixture:enemy", count: 1, level: 1 }] },
      ],
      timeline: [],
      cues: [
        {
          at: 0.5,
          steps: [
            {
              kind: "say",
              speaker: "測試NPC",
              actor: "fixture:npc",
              text: "測試：戰中通訊。",
            },
            {
              kind: "camera",
              x: region.startX + 40,
              y: region.startY,
              zoom: 1.2,
              seconds: 0.1,
            },
            { kind: "fade", opacity: 0.5, seconds: 0.1 },
            { kind: "fade", opacity: 0, seconds: 0.1 },
          ],
        },
      ],
    },
  } as unknown as Pack["planets"][number]);
  p.quests.push(q as unknown as Pack["quests"][number]);
  const checked = validatePack(p);
  if (!checked.pack) throw Error(checked.errors.join("\n"));
  return checked.pack;
}
