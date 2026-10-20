import { z } from "zod";
const id = z.string().regex(/^[a-z][a-z0-9.-]*:[a-z][a-z0-9._-]*$/);
const positive = z.number().finite().positive();
const amount = z.record(id, z.number().finite().nonnegative());
const base = {
  id,
  name: z.string().min(1).max(100),
  description: z.string().max(3000),
  status: z.enum(["active", "retired"]),
  provenance: z.enum(["research", "inferred", "m1-design"]),
};
export const effectTypes = [
  "shield",
  "barrage",
  "fortify",
  "turret",
  "accelerate",
  "weaken",
  "heal",
] as const;
const skill = z
  .object({
    ...base,
    effect: z.enum(effectTypes),
    power: positive,
    duration: positive,
    cooldown: positive,
    color: z.string().regex(/^#[0-9a-f]{6}$/i),
  })
  .strict();
const character = z
  .object({
    ...base,
    rarity: z.number().int().min(1).max(6),
    hp: positive,
    attack: positive,
    defense: z.number().finite().nonnegative(),
    speed: positive,
    range: positive,
    interval: positive,
    growth: z.number().finite().min(0).max(1),
    skill: id,
    color: z.string().regex(/^#[0-9a-f]{6}$/i),
    portrait: z.string(),
    avatar: z.string(),
    sprite: z.string(),
    recipe: z.array(z.number().finite().min(1).max(999)).length(4),
    starter: z.boolean(),
    role: z.string(),
    sourceRow: z.number().int().nonnegative(),
  })
  .strict();
const enemy = z
  .object({
    ...base,
    hp: positive,
    attack: positive,
    defense: z.number().finite().nonnegative(),
    speed: positive,
    range: positive,
    interval: positive,
    projectileSpeed: positive,
    pattern: z.enum(["aim", "fan", "ring"]),
    boss: z.boolean(),
    phaseAt: z.number().min(0).max(1),
    color: z.string().regex(/^#[0-9a-f]{6}$/i),
    sprite: z.string(),
  })
  .strict();
const planet = z
  .object({
    ...base,
    region: id,
    x: z.number().finite(),
    y: z.number().finite(),
    radius: positive,
    color: z.string().regex(/^#[0-9a-f]{6}$/i),
    sprite: z.string(),
    requires: z.array(id),
    enemies: z
      .array(
        z
          .object({ enemy: id, count: z.number().int().min(1).max(30) })
          .strict(),
      )
      .min(1),
    reward: amount,
    activationCost: amount,
    production: amount,
    dropCharacters: z.array(id),
  })
  .strict();
const region = z
  .object({
    ...base,
    width: positive,
    height: positive,
    startX: z.number().finite(),
    startY: z.number().finite(),
  })
  .strict();
const resource = z
  .object({
    ...base,
    color: z.string(),
    initial: z.number().finite().nonnegative(),
    capacity: positive,
  })
  .strict();
const building = z
  .object({
    ...base,
    cost: amount,
    seconds: positive,
    production: amount,
    maxLevel: z.number().int().min(1).max(20),
  })
  .strict();
const research = z
  .object({
    ...base,
    cost: amount,
    seconds: positive,
    attackBonus: z.number().min(0).max(2),
    requires: z.array(id),
  })
  .strict();
const quest = z
  .object({
    ...base,
    condition: z.enum(["cleared", "activated", "summoned", "built"]),
    target: z.string(),
    count: z.number().int().min(1),
    reward: amount,
    character: z.string(),
    dialogue: z
      .array(
        z.object({ speaker: z.string(), text: z.string().max(3000) }).strict(),
      )
      .min(1),
  })
  .strict();
const asset = z
  .object({
    id,
    name: z.string(),
    src: z
      .string()
      .refine(
        (s) =>
          /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(s) ||
          /^(?:\.\/)?assets\/[a-zA-Z0-9/_.-]+\.(png|webp|jpg)$/.test(s),
        "只接受內嵌點陣圖或 assets 相對路徑",
      ),
    width: positive,
    height: positive,
    hash: z.string(),
    review: z.enum(["candidate", "approved"]),
  })
  .strict();
export const entitySchemas = {
  resources: resource,
  skills: skill,
  characters: character,
  enemies: enemy,
  regions: region,
  planets: planet,
  buildings: building,
  research,
  quests: quest,
  assets: asset,
};
export type Kind = keyof typeof entitySchemas;
export const kindNames: Record<Kind, string> = {
  resources: "資源",
  skills: "技能",
  characters: "少女",
  enemies: "敵人／Boss",
  regions: "星域",
  planets: "星球",
  buildings: "建築",
  research: "研究",
  quests: "劇情／任務",
  assets: "素材",
};
export const packSchema = z
  .object({
    schemaVersion: z.literal(1),
    id,
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    name: z.string(),
    resources: z.array(resource).length(4),
    skills: z.array(skill),
    characters: z.array(character).min(1),
    enemies: z.array(enemy),
    regions: z.array(region).min(1),
    planets: z.array(planet).min(1),
    buildings: z.array(building),
    research: z.array(research),
    quests: z.array(quest),
    assets: z.array(asset),
    rules: z
      .object({
        teamSize: z.number().int().min(1).max(6),
        maxLevel: z.number().int().min(1).max(120),
        offlineCapSeconds: positive,
        raidSeconds: positive,
        summonSeconds: positive,
        summonSlots: z.number().int().min(1).max(20),
        defenseK: positive,
        healSeconds: positive,
        healCost: amount,
        levelCost: amount,
      })
      .strict(),
  })
  .strict();
export type Pack = z.infer<typeof packSchema>;
export type Character = z.infer<typeof character>;
export type Planet = z.infer<typeof planet>;
export type Enemy = z.infer<typeof enemy>;
export type Skill = z.infer<typeof skill>;
export type Entity = Pack[Kind][number];
export const kinds = Object.keys(entitySchemas) as Kind[];
export function validatePack(input: unknown): {
  pack?: Pack;
  errors: string[];
} {
  const parsed = packSchema.safeParse(input);
  if (!parsed.success)
    return {
      errors: parsed.error.issues.map(
        (i) => `${i.path.join(".")}: ${i.message}`,
      ),
    };
  const p = parsed.data,
    errors: string[] = [],
    ids = new Set<string>();
  for (const k of kinds)
    for (const e of p[k]) {
      if (ids.has(e.id)) errors.push(`${k}.${e.id}: 重複 ID`);
      ids.add(e.id);
    }
  const has = (k: Kind, v: string, path: string) => {
    if (!p[k].some((e) => e.id === v)) errors.push(`${path}: 缺少 ${v}`);
  };
  const money = (a: Record<string, number>, path: string) =>
    Object.keys(a).forEach((v) => has("resources", v, path));
  p.characters.forEach((c) => {
    has("skills", c.skill, c.id);
    for (const a of [c.portrait, c.avatar, c.sprite])
      if (a) has("assets", a, c.id);
  });
  p.enemies.forEach((e) => {
    if (e.sprite) has("assets", e.sprite, e.id);
  });
  p.planets.forEach((v) => {
    has("regions", v.region, v.id);
    v.requires.forEach((x) => has("planets", x, v.id));
    v.enemies.forEach((e) => has("enemies", e.enemy, v.id));
    v.dropCharacters.forEach((x) => has("characters", x, v.id));
    money(v.reward, v.id);
    money(v.activationCost, v.id);
    money(v.production, v.id);
    if (v.sprite) has("assets", v.sprite, v.id);
    const r = p.regions.find((r) => r.id === v.region);
    if (r && (v.x < 0 || v.y < 0 || v.x > r.width || v.y > r.height))
      errors.push(`${v.id}: 座標超出星域`);
  });
  for (const e of [...p.buildings, ...p.research]) money(e.cost, e.id);
  p.buildings.forEach((b) => money(b.production, b.id));
  p.research.forEach((r) =>
    r.requires.forEach((v) => has("research", v, r.id)),
  );
  p.quests.forEach((q) => {
    money(q.reward, q.id);
    if (q.character) has("characters", q.character, q.id);
    if (["cleared", "activated"].includes(q.condition))
      has("planets", q.target, q.id);
  });
  money(p.rules.healCost, "rules.healCost");
  money(p.rules.levelCost, "rules.levelCost");

  const maxGrowth = Math.max(
    1,
    ...p.characters.map((c) => 1 + (p.rules.maxLevel - 1) * c.growth),
  );
  const researchScale = 1 + p.research.reduce((n, r) => n + r.attackBonus, 0);
  const maxPower = Math.max(
    1,
    ...p.skills
      .filter((s) => s.effect === "barrage" || s.effect === "turret")
      .map((s) => s.power),
  );
  const maxDefenseScale = Math.max(
    1,
    ...p.skills.filter((s) => s.effect === "fortify").map((s) => s.power),
  );
  if (p.rules.defenseK < 1 || p.rules.defenseK >= 32768)
    errors.push("rules.defenseK: 超出有界 Q16 策略範圍");
  for (const c of p.characters)
    if (
      c.attack * maxGrowth * researchScale * maxPower >= 32768 ||
      c.defense * maxGrowth * maxDefenseScale + p.rules.defenseK >= 32768
    )
      errors.push(`${c.id}: 成長後數值超出有界 Q16 支援範圍`);
  for (const e of p.enemies)
    if (e.attack >= 32768 || e.defense + p.rules.defenseK >= 32768)
      errors.push(`${e.id}: 數值超出有界 Q16 支援範圍`);
  if (!p.characters.some((c) => c.starter && c.status === "active"))
    errors.push("需要至少一名可用起始角色");
  if (!p.characters.some((c) => c.status === "active"))
    errors.push("召喚池為空");
  if (!p.planets.some((v) => v.status === "active" && !v.requires.length))
    errors.push("沒有可進入的星球");
  for (const [name, list] of [
    ["planets", p.planets],
    ["research", p.research],
  ] as const) {
    const done = new Set<string>(),
      visiting = new Set<string>();
    const visit = (v: (typeof list)[number]) => {
      if (visiting.has(v.id)) {
        errors.push(`${name}.${v.id}: 前置循環`);
        return;
      }
      if (done.has(v.id)) return;
      visiting.add(v.id);
      v.requires.forEach((x) => {
        const n = list.find((e) => e.id === x);
        if (n) visit(n);
      });
      visiting.delete(v.id);
      done.add(v.id);
    };
    list.forEach(visit);
  }
  return { pack: errors.length ? undefined : p, errors };
}
export function snapshot(p: Pack): Pack {
  const copy = structuredClone(p);
  const freeze = (v: unknown): void => {
    if (v && typeof v === "object") {
      Object.values(v).forEach(freeze);
      Object.freeze(v);
    }
  };
  freeze(copy);
  return copy;
}
export function references(p: Pack, id: string): string[] {
  return kinds.flatMap((k) =>
    p[k]
      .filter((e) => e.id !== id && JSON.stringify(e).includes(`"${id}"`))
      .map((e) => `${kindNames[k]} · ${e.name}`),
  );
}
