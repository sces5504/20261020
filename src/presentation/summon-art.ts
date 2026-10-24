/** Candidate summon artwork. Presentation only; this never changes a Unit's
 * simulation sprite, radius, duration, aim, attacks or save representation. */
export const turretArt = {
  key: "presentation:summon.turret-v1",
  url: new URL(
    "../../art/vfx/summons-v1/turret-v1-candidate.webp",
    import.meta.url,
  ).href,
  width: 1536,
  height: 1024,
  pivot: { x: 0.31, y: 0.5 },
  worldWidth: 64,
  reviewStatus: "candidate",
} as const;
