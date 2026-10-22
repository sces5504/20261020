import { z } from "zod";
import type { Pack } from "../content/schema";
import { patternTypes } from "../content/mechanics";
import { newSave, stats } from "./model";
import { Combat } from "./combat";
export const laboratorySchema = z
  .object({
    allies: z
      .array(
        z
          .object({
            character: z.string(),
            level: z.number().int().min(1).max(120),
            skillLevel: z.number().int().min(1).max(10),
            skill: z.string().optional(),
          })
          .strict(),
      )
      .min(1)
      .max(6),
    enemies: z
      .array(
        z
          .object({
            enemy: z.string(),
            level: z.number().int().min(1).max(120),
            count: z.number().int().min(1).max(30),
            pattern: z.enum(patternTypes).optional(),
          })
          .strict(),
      )
      .min(1)
      .max(3),
    seed: z.number().int().min(0).max(4294967295),
  })
  .strict();
export type LaboratoryConfig = z.infer<typeof laboratorySchema>;
/** No storage, production jobs, rewards or settlement. Both pack and save are isolated copies. */
export function laboratory(pack: Pack, config: LaboratoryConfig) {
  const v = laboratorySchema.parse(config),
    p = structuredClone(pack);
  if (v.allies.some((v) => v.level > p.rules.maxLevel))
    throw Error("角色等級超出內容上限");
  if (v.enemies.reduce((n, v) => n + v.count, 0) > 60)
    throw Error("測試敵人總數上限60");
  const region = p.regions[0],
    planet = p.planets[0];
  const sx = region.width / 2,
    sy = region.height / 2;
  planet.region = region.id;
  planet.x = sx + 230;
  planet.y = sy;
  planet.enemies = v.enemies.map((g, i) => {
    const source = p.enemies.find((e) => e.id === g.enemy);
    if (!source) throw Error("找不到測試敵人");
    const e = {
      ...source,
      id: `laboratory:enemy.${i}`,
      hp: source.hp * (1 + (g.level - 1) * 0.08),
      attack: source.attack * (1 + (g.level - 1) * 0.08),
      defense: source.defense * (1 + (g.level - 1) * 0.08),
      pattern: g.pattern ?? source.pattern,
    };
    p.enemies.push(e);
    return { enemy: e.id, count: g.count };
  });
  const save = newSave(p, 0, "laboratory");
  save.roster = v.allies.map((g, i) => {
    const c = p.characters.find((c) => c.id === g.character);
    if (!c) throw Error("找不到測試角色");
    const o = {
      id: `lab-${i}`,
      definition: c.id,
      level: g.level,
      hp: 0,
      resonance: 0,
    };
    o.hp = stats(p, o).hp;
    return o;
  });
  save.team = save.roster.map((o) => o.id);
  save.region = region.id;
  save.x = sx;
  save.y = sy;
  save.research = [];
  save.encounter = { planet: planet.id, seed: v.seed };
  const combat = new Combat(p, save, planet.id);
  combat.laboratory = true;
  combat.allies.forEach((u, i) => {
    u.skillLevel = v.allies[i].skillLevel;
    if (v.allies[i].skill) {
      if (!p.skills.some((s) => s.id === v.allies[i].skill))
        throw Error("測試技能不存在");
      u.skillOverride = v.allies[i].skill;
    }
  });
  return combat;
}
