import { z } from "zod";
import { actionSchema, patternTypes, defaultVolleyCount } from "./mechanics";
const id = z.string().regex(/^[a-z][a-z0-9.-]*:[a-z][a-z0-9._-]*$/);
const positive = z.number().finite().positive();
const amount = z.record(id, z.number().finite().nonnegative());
const base = {
  id,
  name: z.string().min(1).max(100),
  description: z.string().max(3000),
  status: z.enum(["active", "retired"]),
  provenance: z.enum(["research", "inferred", "m1-design"]),
  sourceRef: z.string().max(500).optional(),
};
export const effectTypes = [
  "shield",
  "barrage",
  "fortify",
  "turret",
  "accelerate",
  "weaken",
  "heal",
  "program",
] as const;
const skill = z
  .object({
    ...base,
    effect: z.enum(effectTypes),
    actions: z.array(actionSchema).min(1).max(32).optional(),
    levels: z
      .array(
        z
          .object({
            cooldown: positive,
            actions: z.array(actionSchema).min(1).max(32),
          })
          .strict(),
      )
      .max(9)
      .optional(),
    sourceSkill: z.number().int().min(1).max(226).optional(),
    fidelity: z.enum(["description", "native-verified"]).optional(),
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
    critical: z.number().min(0).max(0.95).optional(),
    evasion: z.number().min(0).max(0.95).optional(),
    skill: id,
    pattern: z.enum(patternTypes).optional(),
    projectileSpeed: positive.optional(),
    volleyCount: z.number().int().min(1).max(64).optional(),
    volleySpread: z.number().min(0).max(6.284).optional(),
    color: z.string().regex(/^#[0-9a-f]{6}$/i),
    portrait: z.string(),
    avatar: z.string(),
    sprite: z.string(),
    recipe: z.array(z.number().finite().min(1).max(999)).length(4),
    starter: z.boolean(),
    role: z.string(),
    sourceRow: z.number().int().nonnegative(),
    summonable: z.boolean().optional(),
  })
  .strict();
const enemy = z
  .object({
    ...base,
    hp: positive,
    growthReference: z
      .object({
        attack: positive,
        defense: z.number().finite().nonnegative(),
        hp: positive,
      })
      .strict()
      .optional(),
    attack: positive,
    defense: z.number().finite().nonnegative(),
    speed: positive,
    range: positive,
    interval: positive,
    projectileSpeed: positive,
    critical: z.number().min(0).max(0.95).optional(),
    evasion: z.number().min(0).max(0.95).optional(),
    orbitSpeed: z.number().min(0).max(2).default(0.45),
    strafeSpeed: z.number().min(0).max(300).default(14),
    pattern: z.enum(patternTypes),
    skill: id.optional(),
    volleyCount: z.number().int().min(1).max(64).optional(),
    volleySpread: z.number().min(0).max(6.284).optional(),
    boss: z.boolean(),
    phaseAt: z.number().min(0).max(1),
    phasePattern: z.enum(patternTypes).default("ring"),
    color: z.string().regex(/^#[0-9a-f]{6}$/i),
    sprite: z.string(),
  })
  .strict();
const group = z
  .object({
    enemy: id,
    count: z.number().int().min(1).max(30),
    level: z.number().int().min(1).max(150).optional(),
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
    kind: z
      .enum(["planet", "stronghold", "camp", "event", "dailyBoss", "gate"])
      .default("planet"),
    initiallyCleared: z.boolean().default(false),
    requiresActive: z.array(id).default([]),
    hiddenUntilUnlocked: z.boolean().default(false),
    encounterPolicy: z.enum(["auto", "manual"]).default("auto"),
    timeLimitSeconds: z.number().finite().min(0).max(3600).default(0),
    objective: z.enum(["eliminate", "damage"]).default("eliminate"),
    schedule: z
      .object({
        weekdays: z.array(z.number().int().min(0).max(6)).min(1).max(7),
        utcOffsetMinutes: z.number().int().min(-720).max(840).default(540),
        resetHour: z.number().int().min(0).max(23).default(0),
        attemptLimit: z.number().int().min(1).max(20).default(3),
      })
      .strict()
      .optional(),
    requires: z.array(id),
    enemies: z.array(group),
    waves: z.array(z.array(group).min(1)).default([]),
    engageRadius: z.number().min(180).max(700).default(360),
    guardRadius: z.number().min(60).max(320).default(180),
    leashRadius: z.number().min(400).max(1400).default(780),
    leashWarningRadius: z.number().min(300).max(1300).default(640),
    resetSeconds: z.number().min(1).max(10).default(3),
    waveDelay: z.number().min(1).max(20).default(4),
    reward: amount,
    resupplyCost: amount.optional(),
    activationCost: amount,
    production: amount,
    dropCharacters: z.array(id),
  })
  .strict();
const region = z
  .object({
    ...base,
    campaignStart: z.boolean().default(false),
    background: z.string().default(""),
    sprite: z.string().default(""),
    width: positive,
    height: positive,
    startX: z.number().finite(),
    startY: z.number().finite(),
    routes: z
      .array(
        z
          .object({
            to: id,
            label: z.string().min(1).max(100).default("星門躍遷"),
            requires: z.array(id).default([]),
          })
          .strict(),
      )
      .default([]),
    discoveryRadius: z.number().min(100).max(1000).default(450),
    patrols: z
      .array(
        z
          .object({
            id,
            x: z.number().finite(),
            y: z.number().finite(),
            enemies: z.array(group).min(1),
            reward: amount,
            detectionRadius: z.number().min(100).max(600).default(290),
            patrolRadius: z.number().min(0).max(500).default(0),
            patrolSpeed: z.number().min(5).max(120).default(38),
            phase: z.number().min(0).max(6.284).default(0),
            respawnSeconds: z.number().min(30).max(3600),
          })
          .strict(),
      )
      .default([]),
  })
  .strict();
const resource = z
  .object({
    ...base,
    iconFrame: z.number().int().min(0).max(3).optional(),
    sprite: z.string().default(""),
    color: z.string().regex(/^#[0-9a-f]{6}$/i),
    initial: z.number().finite().nonnegative(),
    capacity: positive,
  })
  .strict();
const building = z
  .object({
    ...base,
    sprite: z.string().default(""),
    cost: amount,
    seconds: positive,
    production: amount,
    maxLevel: z.number().int().min(1).max(20),
  })
  .strict();
const research = z
  .object({
    ...base,
    sprite: z.string().default(""),
    cost: amount,
    seconds: positive,
    attackBonus: z.number().min(0).max(2),
    requires: z.array(id),
  })
  .strict();
const quest = z
  .object({
    ...base,
    background: z.string().default(""),
    condition: z.enum([
      "cleared",
      "activated",
      "summoned",
      "built",
      "intro",
      "battleWon",
      "leveled",
      "healed",
      "constructed",
      "upgraded",
      "eventWon",
    ]),
    repeat: z.enum(["once", "daily"]).default("once"),
    utcOffsetMinutes: z.number().int().min(-720).max(840).default(540),
    resetHour: z.number().int().min(0).max(23).default(0),
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
const audioCue = z
  .object({
    ...base,
    category: z.enum([
      "ui",
      "shot",
      "hit",
      "skill",
      "victory",
      "defeat",
      "arrival",
      "alert",
    ]),
    waveform: z.enum(["sine", "triangle", "sawtooth", "square"]),
    startHz: z.number().min(30).max(6000),
    endHz: z.number().min(30).max(6000),
    seconds: z.number().min(0.03).max(3),
    gain: z.number().min(0).max(0.4),
    noise: z.number().min(0).max(1),
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
  audio: audioCue,
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
  audio: "音效",
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
    audio: z.array(audioCue).optional().default([]),
    rules: z
      .object({
        duplicateStatBonus: z.number().min(0.001).max(0.1).default(0.02),
        duplicateRefundRate: z.number().min(0).max(1).default(0.25),
        cruiseSpeed: z.number().min(180).max(500).default(255),
        travelSpeed: z.number().min(100).max(300).default(180),
        formationSpacing: z.number().min(60).max(180).default(106),
        allySpriteSize: z.number().min(40).max(120).default(78),
        enemySpriteSize: z.number().min(30).max(120).default(55),
        bossSpriteSize: z.number().min(60).max(220).default(112),
        teamSize: z.number().int().min(1).max(6),
        maxLevel: z.number().int().min(1).max(120),
        startRegion: id.optional(),
        offlineCapSeconds: positive,
        raidSeconds: positive.optional().default(240),
        summonSeconds: positive,
        summonSlots: z.number().int().min(1).max(20),
        defenseK: positive,
        healSeconds: positive,
        healCost: amount,
        levelCost: amount,
        trainingSeconds: z.number().min(5).max(120).optional().default(30),
        raidWarningSeconds: z.number().min(5).max(120).optional().default(45),
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
  for (const planet of parsed.data.planets)
    if (planet.waves.length) {
      planet.enemies.push(...planet.waves.flat());
      planet.waves = [];
    }
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
    if (
      v.leashRadius <= v.engageRadius ||
      v.leashWarningRadius >= v.leashRadius ||
      v.leashWarningRadius <= v.engageRadius
    )
      errors.push(`${v.id}: 交戰／警告／重置半徑必須依序增加`);
    v.requires.forEach((x) => has("planets", x, v.id));
    v.requiresActive.forEach((x) => has("planets", x, v.id));
    if (!v.enemies.length && !v.initiallyCleared && v.kind !== "camp")
      errors.push(`${v.id}: 無守軍節點必須明示初始解放或臨時基地`);
    if (
      v.kind !== "planet" &&
      (Object.values(v.production).some((n) => n > 0) ||
        Object.values(v.activationCost).some((n) => n > 0))
    )
      errors.push(`${v.id}: 非生產星球不能設定啟動費或產能`);
    if (
      v.requiresActive.some(
        (id) => p.planets.find((v) => v.id === id)?.kind !== "planet",
      )
    )
      errors.push(`${v.id}: 啟動前置必須引用生產星球`);
    if ((v.kind === "dailyBoss") !== !!v.schedule)
      errors.push(`${v.id}: 每日 Boss 必須配置排程，其他節點不能配置每日排程`);
    if (
      v.objective === "damage" &&
      (!v.timeLimitSeconds || v.kind !== "dailyBoss")
    )
      errors.push(`${v.id}: 累積傷害目標需要限時每日 Boss`);
    for (const wave of [v.enemies, ...v.waves])
      wave.forEach((e) => has("enemies", e.enemy, v.id));
    v.dropCharacters.forEach((x) => has("characters", x, v.id));
    money(v.reward, v.id);
    money(v.activationCost, v.id);
    money(v.production, v.id);
    if (v.resupplyCost) {
      money(v.resupplyCost, v.id);
      if (v.kind !== "camp") errors.push(`${v.id}: 整補費用只能設定於臨時基地`);
    }
    if (v.sprite) has("assets", v.sprite, v.id);
    const r = p.regions.find((r) => r.id === v.region);
    if (r && (v.x < 0 || v.y < 0 || v.x > r.width || v.y > r.height))
      errors.push(`${v.id}: 座標超出星域`);
  });
  for (const e of [...p.regions, ...p.research, ...p.resources])
    if (e.sprite) has("assets", e.sprite, e.id);
  for (const r of p.regions)
    if (r.background) has("assets", r.background, r.id);
  for (const r of p.regions) {
    const targets = new Set<string>();
    for (const route of r.routes) {
      has("regions", route.to, r.id);
      if (route.to === r.id || targets.has(route.to))
        errors.push(`${r.id}: 星域航路重複或指向自身`);
      targets.add(route.to);
      route.requires.forEach((v) => has("planets", v, r.id));
    }
    if (
      r.startX < 20 ||
      r.startY < 20 ||
      r.startX > r.width - 20 ||
      r.startY > r.height - 20
    )
      errors.push(`${r.id}: 星域起點超出航行範圍`);
  }
  const patrolIds = new Set<string>();
  for (const r of p.regions)
    for (const v of r.patrols) {
      if (patrolIds.has(v.id) || ids.has(v.id))
        errors.push(`${v.id}: 巡邏ID重複`);
      patrolIds.add(v.id);
      v.enemies.forEach((e) => has("enemies", e.enemy, v.id));
      money(v.reward, v.id);
      if (
        v.x - v.patrolRadius < 0 ||
        v.y - v.patrolRadius * 0.62 < 0 ||
        v.x + v.patrolRadius > r.width ||
        v.y + v.patrolRadius * 0.62 > r.height
      )
        errors.push(`${v.id}: 巡邏路線超出星域`);
    }
  for (const e of [...p.buildings, ...p.research]) money(e.cost, e.id);
  p.buildings.forEach((b) => {
    money(b.production, b.id);
    if (b.sprite) has("assets", b.sprite, b.id);
  });
  p.research.forEach((r) =>
    r.requires.forEach((v) => has("research", v, r.id)),
  );
  p.quests.forEach((q) => {
    if (
      q.repeat === "daily" &&
      (![
        "battleWon",
        "leveled",
        "healed",
        "constructed",
        "upgraded",
        "eventWon",
        "summoned",
        "built",
      ].includes(q.condition) ||
        q.character)
    )
      errors.push(`${q.id}: 每日任務必須使用事件計數且不可發放角色`);
    if (
      q.repeat !== "daily" &&
      [
        "battleWon",
        "leveled",
        "healed",
        "constructed",
        "upgraded",
        "eventWon",
      ].includes(q.condition)
    )
      errors.push(`${q.id}: 此條件僅供每日任務`);
    money(q.reward, q.id);
    if (q.background) has("assets", q.background, q.id);
    if (q.character) has("characters", q.character, q.id);
    if (["cleared", "activated"].includes(q.condition))
      has("planets", q.target, q.id);
  });
  money(p.rules.healCost, "rules.healCost");
  money(p.rules.levelCost, "rules.levelCost");

  for (const s of p.skills) {
    if (s.effect === "program" && !s.actions?.length)
      errors.push(`${s.id}: program 必須有技能動作`);
    if (s.effect !== "program" && s.actions)
      errors.push(`${s.id}: 舊效果不可夾帶未執行動作`);
  }
  for (const e of p.enemies) if (e.skill) has("skills", e.skill, e.id);
  // Validate active encounters before runtime; unused source recipes remain editable.
  const peak = (s: Skill | undefined, interval: number) => {
    if (!s) return { bullets: 0, units: 0, fields: 0 };
    if (s.effect === "barrage")
      return { bullets: 12 * Math.ceil(2 / s.cooldown), units: 0, fields: 0 };
    if (s.effect === "turret") {
      const units = Math.ceil(s.duration / s.cooldown);
      return { bullets: units * 10, units, fields: 0 };
    }
    return [
      { actions: s.actions ?? [], cooldown: s.cooldown },
      ...(s.levels ?? []),
    ].reduce(
      (max, v) => {
        let bullets = 0,
          units = 0,
          fields = 0;
        for (const a of v.actions) {
          const copies = Math.max(1, Math.ceil(a.duration / v.cooldown));
          if (a.kind === "projectile")
            bullets += a.count * a.salvos * (1 + a.splitCount) * copies;
          if (a.kind === "summon") {
            units += a.count * copies;
            bullets += a.count * copies * Math.ceil(5 / interval);
          }
          if (a.kind === "beam" || a.kind === "zone" || a.kind === "bomb")
            fields +=
              (a.kind === "bomb" || a.kind === "beam" ? a.count : 1) *
              a.salvos *
              copies;
        }
        return {
          bullets: Math.max(max.bullets, bullets),
          units: Math.max(max.units, units),
          fields: Math.max(max.fields, fields),
        };
      },
      { bullets: 0, units: 0, fields: 0 },
    );
  };
  const allyPeaks = p.characters
    .filter((c) => c.status === "active")
    .map((c) => {
      const s = p.skills.find((s) => s.id === c.skill),
        v = peak(s, c.interval);
      const changed = (s?.actions ?? [])
        .flatMap((a) => a.modifiers)
        .find((m) => m.stat === "attackPattern")?.pattern;
      return {
        ...v,
        bullets:
          v.bullets +
          (c.volleyCount ?? defaultVolleyCount(changed ?? c.pattern ?? "aim")) *
            Math.ceil(5 / c.interval),
      };
    });
  const allyBudget = {
    bullets: Math.max(0, ...allyPeaks.map((v) => v.bullets)) * p.rules.teamSize,
    units:
      Math.max(0, ...allyPeaks.map((v) => v.units)) * p.rules.teamSize +
      p.rules.teamSize,
    fields: Math.max(0, ...allyPeaks.map((v) => v.fields)) * p.rules.teamSize,
  };
  const encounterBudget = (
    groups: { enemy: string; count: number }[],
    owner: string,
  ) => {
    const total = { ...allyBudget };
    for (const group of groups) {
      const e = p.enemies.find((e) => e.id === group.enemy);
      if (!e) continue;
      const value = peak(
        p.skills.find((s) => s.id === e.skill),
        e.interval,
      );
      const count =
        e.volleyCount ??
        Math.max(
          defaultVolleyCount(e.pattern),
          e.boss ? defaultVolleyCount(e.phasePattern) : 0,
        );
      total.bullets +=
        group.count *
        (value.bullets +
          (e.pattern === "laser"
            ? 0
            : count * Math.ceil(5 / (e.interval + 0.55))));
      total.units += group.count * (1 + value.units);
      total.fields += group.count * value.fields;
    }
    if (total.bullets > 3000 || total.units > 256 || total.fields > 128)
      errors.push(
        `${owner}: 遭遇預算超限（彈體${total.bullets}/3000，單位${total.units}/256，持續場${total.fields}/128），請在測試場縮減並驗證`,
      );
  };
  for (const v of p.planets) encounterBudget(v.enemies, v.id);
  for (const r of p.regions)
    for (const v of r.patrols) encounterBudget(v.enemies, v.id);
  const maxGrowth =
    (1 + 5 * p.rules.duplicateStatBonus) *
    Math.max(
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
  if (p.rules.startRegion)
    has("regions", p.rules.startRegion, "rules.startRegion");
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
      [
        ...v.requires,
        ...("requiresActive" in v ? v.requiresActive : []),
      ].forEach((x) => {
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
