import { emptyStory, type StoryState } from "./story";
import type { Pack } from "../content/schema";
export type Wallet = Record<string, number>;
export type Owned = {
  id: string;
  definition: string;
  level: number;
  hp: number;
  resonance?: number;
  skillLevel?: number;
};
export type Colony = {
  active: boolean;
  lost: boolean;
  buildings: Record<string, number>;
  assigned: string;
  raidRemaining: number;
};
export type Job = {
  id: string;
  kind: "build" | "research" | "summon" | "heal";
  owner: string;
  definition: string;
  ends: number;
  payload: string;
  production: Wallet;
  cost: Wallet;
};
/** Save-scoped chapter facility; battle-scoped facilities never reach the save. */
export type FacilityState = { hp: number; destroyed: boolean };
export type Save = {
  story: StoryState;
  facilities: Record<string, FacilityState>;
  schemaVersion: 1;
  contentHash: string;
  migrationHistory: string[];
  trainingBest: number; // legacy save field; feature removed
  discovered: string[];
  storySeen: string[];
  acquisitionQueue: string[];
  voyageSeconds: number;
  patrolCooldowns: Record<string, number>;
  dailyTasks: Record<
    string,
    { period: string; progress: number; claimed: boolean }
  >;
  dailyClaims: Record<string, string>;
  dailyAttempts: Record<string, { period: string; count: number }>;
  disengagedPlanets: string[];
  heading: number;
  duplicateConversions: number;
  ownedSequence: number;
  duplicateRefunds: Wallet;
  orphanedJobs: Job[];
  orphanedColonies: Record<string, Colony>;
  orphanedWallet: Wallet;
  id: string;
  revision: number;
  contentId: string;
  contentVersion: string;
  settledAt: number;
  rng: number;
  wallet: Wallet;
  roster: Owned[];
  team: string[];
  region: string;
  x: number;
  y: number;
  cleared: string[];
  colonies: Record<string, Colony>;
  research: string[];
  jobs: Job[];
  receipts: string[];
  quests: string[];
  summoned: number;
  built: number;
  encounter: {
    planet: string;
    seed: number;
    kind?: "planet" | "patrol";
    cues?: number[];
    period?: string;
  } | null;
  orphans: Owned[];
};
export function stats(p: Pack, o: Owned) {
  const c = p.characters.find((c) => c.id === o.definition)!;
  const scale =
    (1 + (Math.min(p.rules.maxLevel, o.level) - 1) * c.growth) *
    (1 + (o.resonance ?? 0) * p.rules.duplicateStatBonus);
  return {
    hp: Math.round(c.hp * scale),
    attack: c.attack * scale,
    defense: c.defense * scale,
  };
}
export function newSave(p: Pack, now: number, id = "voyager"): Save {
  const roster = p.characters
    .filter((c) => c.starter && c.status === "active")
    .map((c, i) => ({
      id: `owned-${i + 1}`,
      definition: c.id,
      level: 1,
      hp: c.hp,
      resonance: 0,
    }));
  return {
    story: emptyStory(),
    facilities: {},
    schemaVersion: 1,
    contentHash: "",
    migrationHistory: [],
    trainingBest: 0,
    discovered: [],
    storySeen: [],
    acquisitionQueue: [],
    voyageSeconds: 0,
    patrolCooldowns: {},
    dailyTasks: {},
    dailyClaims: {},
    dailyAttempts: {},
    disengagedPlanets: [],
    heading: 0,
    duplicateConversions: 0,
    ownedSequence: 0,
    duplicateRefunds: {},
    orphanedJobs: [],
    orphanedColonies: {},
    orphanedWallet: {},
    id,
    revision: 0,
    contentId: p.id,
    contentVersion: p.version,
    settledAt: now,
    rng: 8712345,
    wallet: Object.fromEntries(p.resources.map((r) => [r.id, r.initial])),
    roster,
    team: roster.slice(0, p.rules.teamSize).map((c) => c.id),
    region: (
      p.regions.find((r) => r.id === p.rules.startRegion) ?? p.regions[0]
    ).id,
    x: (p.regions.find((r) => r.id === p.rules.startRegion) ?? p.regions[0])
      .startX,
    y: (p.regions.find((r) => r.id === p.rules.startRegion) ?? p.regions[0])
      .startY,
    cleared: [],
    colonies: {},
    research: [],
    jobs: [],
    receipts: [],
    quests: [],
    summoned: 0,
    built: 0,
    encounter: null,
    orphans: [],
  };
}
export function random(s: { rng: number }) {
  s.rng = (Math.imul(s.rng, 1664525) + 1013904223) >>> 0;
  return s.rng / 4294967296;
}
export const maxSkillLevel = 10;
/** Character level needed before researching skill level `next`. */
export const skillResearchGate = (next: number) => (next - 1) * 4;
export function skillAtLevel<T extends { levels?: Partial<T>[] }>(
  skill: T,
  level: number,
): T {
  const l = Math.max(1, Math.min(maxSkillLevel, Math.trunc(level) || 1));
  const override = l > 1 ? skill.levels?.[l - 2] : undefined;
  return override ? { ...skill, ...override } : skill;
}
export function skillResearchCost(p: Pack, o: Owned): Wallet {
  return costScale(
    p.rules.skillResearchCost ?? costScale(p.rules.levelCost, 3),
    o.skillLevel ?? 1,
  );
}
export function costScale(c: Wallet, n: number): Wallet {
  return Object.fromEntries(Object.entries(c).map(([k, v]) => [k, v * n]));
}
export function canAfford(s: Save, c: Wallet) {
  return Object.entries(c).every(([k, v]) => (s.wallet[k] ?? 0) >= v);
}
export function money(s: Save, c: Wallet, sign = 1) {
  for (const [k, v] of Object.entries(c))
    s.wallet[k] = (s.wallet[k] ?? 0) + v * sign;
}
export function addCharacter(p: Pack, s: Save, id: string, invested?: Wallet) {
  const c = p.characters.find((c) => c.id === id);
  if (!c) throw Error("角色內容不存在");
  if (s.roster.some((o) => o.definition === id && (o.resonance ?? 0) >= 5)) {
    const basis =
      invested ??
      Object.fromEntries(p.resources.map((r, i) => [r.id, c.recipe[i]]));
    const refund = Object.fromEntries(
      Object.entries(basis).map(([r, n]) => [
        r,
        n * p.rules.duplicateRefundRate,
      ]),
    );
    money(s, refund);
    s.duplicateConversions = (s.duplicateConversions ?? 0) + 1;
    s.duplicateRefunds ??= {};
    for (const [r, n] of Object.entries(refund))
      s.duplicateRefunds[r] = (s.duplicateRefunds[r] ?? 0) + n;
    return null;
  }
  s.ownedSequence ??= 0;
  let ownedId = "";
  do {
    ownedId = `owned-extra-${++s.ownedSequence}`;
  } while ([...s.roster, ...s.orphans].some((o) => o.id === ownedId));
  const o: Owned = {
    id: ownedId,
    definition: id,
    level: 1,
    hp: c.hp,
    resonance: 0,
  };
  s.roster.push(o);
  return o;
}
/** 4.3.2 bounded Q16 path, not the entire native hit/RNG/modifier pipeline. */
export function damage(
  attack: number,
  defense: number,
  k: number,
  critical = false,
  evaded = false,
) {
  const input = Math.floor(attack),
    def = Math.max(0, Math.floor(defense)),
    armorK = Math.floor(k);
  if (
    !Number.isFinite(input) ||
    input < 0 ||
    input >= 32768 ||
    def >= 32768 ||
    armorK <= 0 ||
    def + armorK >= 32768
  )
    throw Error("傷害超出已驗證 Q16 範圍，需要另註冊公式策略。");
  const q = 65536n;
  let d = BigInt(input) * q;
  if (evaded) d = (d * (q - 65n * 750n)) / q;
  if (critical) d = (d * (q + 65n * 1500n)) / q;
  if (def >= 1) {
    const fraction = (BigInt(def) * q) / BigInt(def + armorK);
    d = (d * (q - fraction)) / q;
  }
  return Math.max(1, Number(d / q));
}
