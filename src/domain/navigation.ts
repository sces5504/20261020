import type { Pack } from "../content/schema";
export type Patrol = Pack["regions"][number]["patrols"][number];
/** Foreground simulation time only; identical for drawing, detection and encounter spawn. */
export function patrolPosition(v: Patrol, seconds: number) {
  const angle =
    v.phase + (seconds * v.patrolSpeed) / Math.max(1, v.patrolRadius);
  return {
    x: v.x + Math.cos(angle) * v.patrolRadius,
    y: v.y + Math.sin(angle) * v.patrolRadius * 0.62,
  };
}
/** Slot one is the vanguard facing +X; subsequent slots form a centered staggered wedge. */
export function formationOffset(index: number, count: number, spacing: number) {
  const raw = (i: number) => ({
    x: -Math.ceil(i / 2) * spacing * 0.85,
    y:
      i === 0
        ? 0
        : (i % 2 ? -1 : 1) * spacing * (0.8 + Math.floor((i - 1) / 2) * 0.35),
  });
  const offsets = Array.from({ length: count }, (_, i) => raw(i));
  const mean = offsets.reduce(
    (a, b) => ({ x: a.x + b.x / count, y: a.y + b.y / count }),
    { x: 0, y: 0 },
  );
  const p = raw(index);
  return { x: p.x - mean.x, y: p.y - mean.y };
}

/** Stable world positions are shared by the ambient guardians and the encounter, without entry teleports. */
export function guardianPositions(planet: Pack["planets"][number]) {
  const total = planet.enemies.reduce((n, g) => n + g.count, 0);
  let index = 0;
  return planet.enemies.flatMap((group) =>
    Array.from({ length: group.count }, () => {
      const i = index++,
        angle = (i / Math.max(1, total)) * Math.PI * 2 + 0.35;
      const radius = planet.guardRadius * (0.8 + (i % 2) * 0.25);
      return {
        enemy: group.enemy,
        level: group.level ?? 1,
        id: `guard-${planet.id}-${i}`,
        x: planet.x + Math.cos(angle) * radius,
        y: planet.y + Math.sin(angle) * radius,
      };
    }),
  );
}

/** Shortest declared route, retaining locks so the UI can explain the next prerequisite. */
/** Shortest route chain; with `cleared`, prefers a chain whose gates are all open. */
export function regionPath(
  p: import("../content/schema").Pack,
  from: string,
  to: string,
  cleared?: string[],
): string[] {
  const search = (open: boolean) => {
    const queue = [[from]],
      seen = new Set([from]);
    while (queue.length) {
      const path = queue.shift()!;
      const last = path[path.length - 1];
      if (last === to) return path;
      for (const r of p.regions.find((r) => r.id === last)?.routes ?? [])
        if (
          !seen.has(r.to) &&
          (!open || r.requires.every((id) => cleared!.includes(id)))
        ) {
          seen.add(r.to);
          queue.push([...path, r.to]);
        }
    }
    return [];
  };
  const open = cleared ? search(true) : [];
  return open.length ? open : search(false);
}
