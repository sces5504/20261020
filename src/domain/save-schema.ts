import { z } from "zod";
const num = z.number().finite();
const nonneg = num.nonnegative();
const owned = z
  .object({
    id: z.string(),
    definition: z.string(),
    level: z.number().int().min(1).max(120),
    hp: nonneg,
    resonance: z.number().int().min(0).max(5).default(0),
  })
  .strict();
export const saveSchema = z
  .object({
    story: z
      .object({
        completed: z.array(z.string()).default([]),
        counters: z.record(z.number().int().nonnegative()).default({}),
        session: z
          .object({
            quest: z.string(),
            signature: z.string(),
            cursor: z.number().int().nonnegative(),
            waiting: z.string(),
            battleWon: z.boolean(),
            cues: z.array(z.number().int().nonnegative()).default([]),
          })
          .strict()
          .nullable()
          .default(null),
      })
      .strict()
      .default({}),
    schemaVersion: z.literal(1),
    contentHash: z.string().default(""),
    migrationHistory: z.array(z.string()).default([]),
    discovered: z.array(z.string()).default([]),
    storySeen: z.array(z.string()).default([]),
    acquisitionQueue: z.array(z.string()).default([]),
    voyageSeconds: nonneg.default(0),
    disengagedPlanets: z.array(z.string()).default([]),
    patrolCooldowns: z.record(nonneg).default({}),
    dailyTasks: z
      .record(
        z
          .object({
            period: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
            progress: z.number().int().nonnegative(),
            claimed: z.boolean(),
          })
          .strict(),
      )
      .default({}),
    dailyClaims: z.record(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).default({}),
    dailyAttempts: z
      .record(
        z
          .object({
            period: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
            count: z.number().int().nonnegative(),
          })
          .strict(),
      )
      .default({}),
    heading: num.default(0),
    ownedSequence: z.number().int().nonnegative().default(0),
    duplicateConversions: z.number().int().nonnegative().default(0),
    duplicateRefunds: z.record(nonneg).default({}),
    trainingBest: z.number().int().min(0).max(100).default(0),
    orphanedJobs: z.array(z.any()).default([]),
    orphanedColonies: z.record(z.any()).default({}),
    orphanedWallet: z.record(nonneg).default({}),
    id: z.string(),
    revision: z.number().int().nonnegative(),
    contentId: z.string(),
    contentVersion: z.string(),
    settledAt: nonneg,
    rng: z.number().int().nonnegative(),
    wallet: z.record(nonneg),
    roster: z.array(owned).min(1),
    team: z.array(z.string()).min(1),
    region: z.string(),
    x: num,
    y: num,
    cleared: z.array(z.string()),
    colonies: z.record(
      z
        .object({
          active: z.boolean(),
          lost: z.boolean(),
          buildings: z.record(z.number().int().nonnegative()),
          assigned: z.string(),
          raidRemaining: nonneg,
        })
        .strict(),
    ),
    research: z.array(z.string()),
    jobs: z.array(
      z
        .object({
          id: z.string(),
          kind: z.enum(["build", "research", "summon", "heal"]),
          owner: z.string(),
          definition: z.string(),
          ends: nonneg,
          payload: z.string(),
          production: z.record(nonneg),
          cost: z.record(nonneg),
        })
        .strict(),
    ),
    receipts: z.array(z.string()),
    quests: z.array(z.string()),
    summoned: z.number().int().nonnegative(),
    built: z.number().int().nonnegative(),
    encounter: z
      .object({
        cues: z.array(z.number().int().nonnegative()).default([]),
        planet: z.string(),
        seed: z.number().int().nonnegative(),
        kind: z.enum(["planet", "patrol"]).optional(),
        period: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
      })
      .strict()
      .nullable(),
    orphans: z.array(owned),
  })
  .strict();
