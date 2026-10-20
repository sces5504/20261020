import { z } from "zod";
const num = z.number().finite();
const nonneg = num.nonnegative();
const owned = z
  .object({
    id: z.string(),
    definition: z.string(),
    level: z.number().int().min(1).max(120),
    hp: nonneg,
  })
  .strict();
export const saveSchema = z
  .object({
    schemaVersion: z.literal(1),
    contentHash: z.string().default(""),
    migrationHistory: z.array(z.string()).default([]),
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
      .object({ planet: z.string(), seed: z.number().int().nonnegative() })
      .strict()
      .nullable(),
    orphans: z.array(owned),
  })
  .strict();
