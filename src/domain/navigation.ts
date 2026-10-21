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
