import { z } from "zod";
// Closed declarative vocabulary. New content cannot silently fall back to a similar skill.
export const patternTypes = [
  "aim",
  "fan",
  "ring",
  "spiral",
  "cross",
  "burst",
  "homing",
  "sine",
  "accelerating",
  "piercing",
  "splash",
  "laser",
  "mine",
  "shotgun",
  "melee",
  "meleeFan",
  "meleeSplash",
  "meleeSpear",
] as const;
export const statusTypes = [
  "attack",
  "defense",
  "attackSpeed",
  "moveSpeed",
  "projectileSpeed",
  "critical",
  "evasion",
  "damageTaken",
  "penetration",
  "stun",
  "corrosion",
  "blaze",
  "invisible",
  "invincible",
  "taunt",
  "reflect",
  "deflect",
  "directional",
  "redirect",
  "charge",
  "scale",
  "absorb",
  "attackPattern",
  "decoy",
  "offset",
] as const;
const finite = z.number().finite();
export const modifierSchema = z
  .object({
    stat: z.enum(statusTypes),
    value: finite.min(0).max(100),
    interceptRadius: finite.min(0).max(4000).default(0),
    mode: z.enum(["multiply", "add", "set"]).default("multiply"),
    pattern: z.enum(patternTypes).optional(),
    tick: finite.min(0.05).max(30).default(1),
    categories: z
      .array(
        z.enum(["melee", "normal", "piercing", "splash", "homing", "laser"]),
      )
      .max(6)
      .default([]),
    nullify: z
      .array(z.enum(["piercing", "splash"]))
      .max(2)
      .default([]),
    duration: finite.positive().max(120),
    immune: z
      .array(
        z.enum([
          "stun",
          "corrosion",
          "blaze",
          "laser",
          "melee",
          "taunt",
          "piercing",
          "splash",
        ]),
      )
      .max(8)
      .default([]),
  })
  .strict();
export const actionSchema = z
  .object({
    kind: z.enum([
      "status",
      "projectile",
      "zone",
      "beam",
      "summon",
      "heal",
      "shield",
      "dash",
      "cooldown",
      "timeStop",
      "bomb",
      "dispel",
      "detonate",
    ]),
    target: z.enum(["self", "allies", "enemies", "target"]).default("target"),
    radius: finite.min(0).max(4000).default(800),
    duration: finite.positive().max(120).default(1),
    power: finite.min(0).max(100).default(1),
    count: z.number().int().min(1).max(64).default(1),
    interval: finite.min(0.05).max(30).default(0.2),
    delay: finite.min(0).max(30).default(0),
    pattern: z.enum(patternTypes).default("aim"),
    speed: finite.min(1).max(4000).default(520),
    spread: finite.min(0).max(6.284).default(0.22),
    rotation: finite.min(-10).max(10).default(0),
    startAngle: finite.min(-6.284).max(6.284).default(0),
    randomSpread: z.boolean().default(false),
    spawnRadius: finite.min(0).max(2000).default(0),
    inward: z.boolean().default(false),
    salvos: z.number().int().min(1).max(16).default(1),
    salvoInterval: finite.min(0.05).max(10).default(0.5),
    interruptible: z.boolean().default(true),
    bypassEvasion: z.boolean().default(false),
    suppressCritical: z.boolean().default(false),
    width: finite.min(1).max(1000).default(24),
    pierce: z.number().int().min(0).max(60).default(0),
    splash: finite.min(0).max(2000).default(0),
    pull: finite.min(0).max(2000).default(0),
    summon: z.enum(["clone", "turret", "drone", "decoy"]).default("clone"),
    follow: z.boolean().default(false),
    track: z.boolean().default(false),
    origin: z.enum(["owner", "target"]).default("owner"),
    targeting: z.enum(["single", "spread", "random"]).default("single"),
    cancelOnTargetDeath: z.boolean().default(false),
    cadence: finite.min(0).max(5).default(0),
    chain: z.number().int().min(0).max(16).default(0),
    splitCount: z.number().int().min(0).max(32).default(0),
    splitAfter: finite.min(0).max(10).default(0),
    splitPower: finite.min(0).max(10).default(0.5),
    splashPower: finite.min(0).max(10).default(1),
    knockback: finite.min(0).max(1000).default(0),
    modifiers: z.array(modifierSchema).max(16).default([]),
  })
  .strict();
export type Action = z.infer<typeof actionSchema>;
export type Modifier = z.infer<typeof modifierSchema>;
export type Pattern = (typeof patternTypes)[number];

export function defaultVolleyCount(pattern: Pattern) {
  return (
    (
      {
        ring: 14,
        fan: 3,
        cross: 4,
        shotgun: 7,
        spiral: 5,
        burst: 3,
      } as Partial<Record<Pattern, number>>
    )[pattern] ?? 1
  );
}
