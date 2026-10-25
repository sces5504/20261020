import { z } from "zod";
const ref = z.string().regex(/^[a-z][a-z0-9.-]*:[a-z][a-z0-9._-]*$/);
const finite = z.number().finite();
export const factTypes = [
  "region",
  "position",
  "cleared",
  "activated",
  "character",
  "research",
  "building",
  "completed",
  "read",
  "claimed",
  "event",
  "battleWon",
  "summoned",
  "built",
  "leveled",
  "healed",
  "constructed",
  "upgraded",
  "facility",
  "facilityDestroyed",
  "facilityActivated",
] as const;
/** Attack categories a story shield can block; "status" covers damage-over-time ticks. */
export const shieldCategories = [
  "melee",
  "normal",
  "piercing",
  "splash",
  "homing",
  "laser",
  "status",
] as const;
const tag = z.string().regex(/^[a-z][a-z0-9-]{0,31}$/);
export type Condition =
  | {
      fact: (typeof factTypes)[number];
      target: string;
      count: number;
      x: number;
      y: number;
      radius: number;
    }
  | { all: Condition[] }
  | { any: Condition[] };
export const conditionSchema: z.ZodType<Condition, z.ZodTypeDef, unknown> =
  z.lazy(() =>
    z.union([
      z
        .object({
          fact: z.enum(factTypes),
          target: z.string().default(""),
          count: z.number().int().min(1).max(1000000).default(1),
          x: finite.default(0),
          y: finite.default(0),
          radius: finite.min(1).max(2000).default(100),
        })
        .strict(),
      z.object({ all: z.array(conditionSchema).min(1).max(32) }).strict(),
      z.object({ any: z.array(conditionSchema).min(1).max(32) }).strict(),
    ]),
  );
export const presentationStep = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("say"),
      speaker: z.string(),
      text: z.string().min(1).max(3000),
      actor: ref.optional(),
      portrait: ref.optional(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("stage"),
      actor: ref,
      visible: z.boolean(),
      slot: z.enum(["left", "center", "right"]),
      portrait: ref.optional(),
    })
    .strict(),
  z.object({ kind: z.literal("background"), asset: ref }).strict(),
  z
    .object({
      kind: z.literal("camera"),
      x: finite,
      y: finite,
      zoom: finite.min(0.5).max(2),
      seconds: finite.min(0).max(10),
    })
    .strict(),
  z
    .object({
      kind: z.literal("fade"),
      opacity: finite.min(0).max(1),
      seconds: finite.min(0).max(10),
    })
    .strict(),
  z
    .object({ kind: z.literal("wait"), seconds: finite.min(0).max(30) })
    .strict(),
]);
export const storyStep = z.union([
  presentationStep,
  z.object({ kind: z.literal("acquire"), character: ref }).strict(),
  z.object({ kind: z.literal("event"), event: ref }).strict(),
  // Story-granted facility change: runs on skip/reload exactly once (receipt).
  z
    .object({
      kind: z.literal("facility"),
      facility: ref,
      op: z.enum(["grant", "repair", "remove"]),
    })
    .strict(),
  z
    .object({
      kind: z.literal("encounter"),
      planet: ref,
      resumeIf: conditionSchema.optional(),
    })
    .strict(),
  z.object({ kind: z.literal("await"), condition: conditionSchema }).strict(),
]);
export const storySchema = z
  .object({
    chapter: ref,
    autoStart: z.boolean().default(false),
    chapterRequires: z.array(ref).max(24).default([]),
    requires: conditionSchema.optional(),
    objective: conditionSchema.optional(),
    steps: z.array(storyStep).min(1).max(512),
  })
  .strict();
export const actorSchema = z
  .object({
    id: ref,
    name: z.string().min(1).max(100),
    portrait: ref,
    variants: z.record(ref).default({}),
  })
  .strict();
export const storyEncounterSchema = z
  .object({
    mode: z.enum(["eliminate", "escort", "protect", "survive", "defend"]),
    seconds: finite.min(1).max(1800).optional(),
    actors: z
      .array(
        z
          .object({
            id: ref,
            character: ref.optional(),
            enemy: ref.optional(),
            x: finite,
            y: finite,
            side: z.enum(["ally", "enemy"]),
            level: z.number().int().min(1).max(120).default(1),
            required: z.boolean().default(false),
            spawnAt: finite.min(0).max(1800).default(0),
            destination: z
              .object({ x: finite, y: finite, radius: finite.min(10).max(300) })
              .strict()
              .optional(),
          })
          .strict(),
      )
      .max(12)
      .default([]),
    waves: z
      .array(
        z
          .object({
            at: finite.min(0).max(1800),
            enemies: z
              .array(
                z
                  .object({
                    enemy: ref,
                    count: z.number().int().min(1).max(30),
                    level: z.number().int().min(1).max(120).default(1),
                  })
                  .strict(),
              )
              .min(1)
              .max(8),
          })
          .strict(),
      )
      .max(24)
      .default([]),
    timeline: z
      .array(
        z
          .object({
            at: finite.min(0).max(1800).optional(),
            hpBelow: finite.min(0).max(1).optional(),
            actor: ref,
            action: z.enum(["retreat", "team", "move", "setHp"]),
            side: z.enum(["ally", "enemy"]).optional(),
            x: finite.optional(),
            y: finite.optional(),
            ratio: finite.min(0).max(1).optional(),
          })
          .strict(),
      )
      .max(64)
      .default([]),
    cues: z
      .array(
        z
          .object({
            at: finite.min(0).max(1800).optional(),
            hpBelow: finite.min(0).max(1).optional(),
            actor: ref.optional(),
            steps: z.array(presentationStep).min(1).max(32),
          })
          .strict(),
      )
      .max(24)
      .default([]),
    /** Author-placed chapter facilities (definitions live in pack.facilities). */
    facilities: z
      .array(
        z
          .object({
            id: ref,
            facility: ref,
            x: finite,
            y: finite,
            // A destroyed placement either fails the battle or only stops working.
            onDestroyed: z.enum(["fail", "disable"]).default("disable"),
          })
          .strict(),
      )
      .max(8)
      .default([]),
    shields: z
      .array(
        z
          .object({
            id: ref,
            name: z.string().min(1).max(40),
            tags: z.array(tag).max(8).default([]),
            // Story actor ids and/or enemy definitions (every unit of that kind).
            units: z.array(ref).max(12).default([]),
            enemies: z.array(ref).max(12).default([]),
            blocks: z.array(z.enum(shieldCategories)).min(1).max(7),
            // Damage multiplier for blocked categories while up; 0 cancels the hit.
            multiplier: finite.min(0).max(1).default(0),
            // 0 = no layer accounting; otherwise each layer soaks `capacity` blocked damage.
            layers: z.number().int().min(0).max(99).default(0),
            capacity: finite.positive().max(10000000).default(1),
            startsActive: z.boolean().default(true),
            duration: finite.positive().max(1800).optional(),
            restoreAfter: finite.positive().max(1800).optional(),
            refillOnRestore: z.boolean().default(true),
          })
          .strict(),
      )
      .max(8)
      .default([]),
    triggers: z
      .array(
        z
          .object({
            at: finite.min(0).max(1800).optional(),
            hpBelow: finite.min(0).max(1).optional(),
            actor: ref.optional(),
            defeated: ref.optional(),
            facility: ref.optional(),
            state: z.enum(["activated", "destroyed"]).optional(),
            shieldDown: ref.optional(),
            repeat: z.boolean().default(false),
            then: z
              .array(
                z
                  .object({
                    op: z.enum([
                      "enableShield",
                      "suspendShield",
                      "removeShield",
                      "activateFacility",
                    ]),
                    shield: ref.optional(),
                    facility: ref.optional(),
                    seconds: finite.positive().max(1800).optional(),
                  })
                  .strict(),
              )
              .min(1)
              .max(8),
          })
          .strict(),
      )
      .max(32)
      .default([]),
  })
  .strict();
export type PresentationStep = z.infer<typeof presentationStep>;
export type StoryStep = z.infer<typeof storyStep>;
export type Story = z.infer<typeof storySchema>;
export type StoryEncounter = z.infer<typeof storyEncounterSchema>;
