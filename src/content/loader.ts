import { z } from "zod";
import {
  entitySchemas,
  validatePack,
  kinds,
  type Pack,
  type Entity,
} from "./schema";
const extensionSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string().regex(/^[a-z][a-z0-9.-]*:package\.[a-z0-9.-]+$/),
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    requires: z.array(
      z.object({ id: z.string(), version: z.string() }).strict(),
    ),
    definitions: z
      .object(
        Object.fromEntries(
          kinds
            .filter((k) => k !== "resources")
            .map((k) => [k, z.array(entitySchemas[k]).optional()]),
        ),
      )
      .strict(),
  })
  .strict();
// Only the root integration manifest may bind presentation across author packs.
// Extensions remain additive; these fields cannot alter gameplay or stable IDs.
const regionPresentationSchema = z.array(
  z
    .object({
      region: z.string(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      sprite: z.string().optional(),
      background: z.string().optional(),
    })
    .strict(),
);
const characterPresentationSchema = z.array(
  z
    .object({
      character: z.string(),
      portrait: z.string(),
      avatar: z.string(),
      sprite: z.string(),
    })
    .strict(),
);
export function assemble(
  base: unknown,
  extensions: unknown[],
  regionPresentation: unknown = [],
  characterPresentation: unknown = [],
  regionRoutes: unknown = [],
): Pack {
  const parsed = validatePack(base);
  if (!parsed.pack) throw Error(parsed.errors.join("\n"));
  const core = parsed.pack;
  const list = extensions.map((v) => extensionSchema.parse(v));
  const versions = new Map([[core.id, core.version]]);
  for (const e of list) {
    if (versions.has(e.id)) throw Error(`重複資料包 ${e.id}`);
    versions.set(e.id, e.version);
  }
  const done = new Set<string>([core.id]),
    visiting = new Set<string>();
  const visit = (e: (typeof list)[number]) => {
    if (done.has(e.id)) return;
    if (visiting.has(e.id)) throw Error(`資料包依賴循環：${e.id}`);
    visiting.add(e.id);
    for (const dep of e.requires) {
      if (versions.get(dep.id) !== dep.version)
        throw Error(`${e.id} 需要 ${dep.id}@${dep.version}`);
      const other = list.find((v) => v.id === dep.id);
      if (other) visit(other);
    }
    const ns = e.id.split(":")[0];
    for (const k of kinds) {
      if (k === "resources") continue;
      for (const v of (e.definitions[k] ?? []) as Entity[]) {
        if (v.id.split(":")[0] !== ns)
          throw Error(`${e.id}: 定義必須使用 ${ns}: 命名空間`);
        (core[k] as Entity[]).push(v);
      }
    }
    visiting.delete(e.id);
    done.add(e.id);
  };
  list.forEach(visit);
  // Integration-owned links only: author extensions cannot overwrite base routes.
  const linked = new Set<string>();
  for (const binding of z
    .array(
      z
        .object({
          region: z.string(),
          routes: entitySchemas.regions.shape.routes,
        })
        .strict(),
    )
    .parse(regionRoutes)) {
    const target = core.regions.find((r) => r.id === binding.region);
    if (!target || linked.has(binding.region))
      throw Error(`星域航路綁定缺失或重複：${binding.region}`);
    linked.add(binding.region);
    target.routes.push(...binding.routes);
  }
  const bound = new Set<string>();
  for (const { region, ...presentation } of regionPresentationSchema.parse(
    regionPresentation,
  )) {
    const target = core.regions.find((r) => r.id === region);
    if (!target || bound.has(region))
      throw Error(`星域呈現綁定缺失或重複：${region}`);
    bound.add(region);
    Object.assign(target, presentation);
  }
  const characters = new Set<string>();
  for (const {
    character,
    ...presentation
  } of characterPresentationSchema.parse(characterPresentation)) {
    const target = core.characters.find((c) => c.id === character);
    if (!target || characters.has(character))
      throw Error(`角色呈現綁定缺失或重複：${character}`);
    characters.add(character);
    Object.assign(target, presentation);
  }
  const checked = validatePack(core);
  if (!checked.pack) throw Error(checked.errors.join("\n"));
  return checked.pack;
}
