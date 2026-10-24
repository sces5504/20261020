export type Point = { x: number; y: number };
/** Members follow a sampled travel history, preserving identity and positions through turns/reordering. */
export class FleetMotion {
  anchor: Point;
  heading: number;
  members: string[] = [];
  positions = new Map<string, Point>();
  private trail: Point[] = [];
  readonly waiting = new Set<string>();
  constructor(
    x: number,
    y: number,
    heading: number,
    ids: string[],
    readonly spacing: number,
  ) {
    this.anchor = { x, y };
    this.heading = heading;
    for (let i = 20; i >= 0; i--)
      this.trail.push({
        x: x - (Math.cos(heading) * i * spacing) / 2,
        y: y - (Math.sin(heading) * i * spacing) / 2,
      });
    this.setMembers(ids);
  }
  setMembers(ids: string[]) {
    this.members = [...ids];
    for (const [id] of this.positions)
      if (!ids.includes(id)) {
        this.positions.delete(id);
        this.waiting.delete(id);
      }
    ids.forEach((id, i) => {
      if (!this.positions.has(id)) this.positions.set(id, this.target(i));
    });
  }
  private target(index: number): Point {
    if (index === 0) return { ...this.anchor };
    let remaining = index * this.spacing * 0.9;
    for (let i = this.trail.length - 1; i > 0; i--) {
      const b = this.trail[i],
        a = this.trail[i - 1],
        length = Math.hypot(b.x - a.x, b.y - a.y);
      if (length <= 0) continue;
      if (remaining <= length || i === 1) {
        const q = Math.min(1, remaining / length),
          side = (index % 2 ? -1 : 1) * this.spacing * 0.44;
        return {
          x: b.x + (a.x - b.x) * q - ((b.y - a.y) / length) * side,
          y: b.y + (a.y - b.y) * q + ((b.x - a.x) / length) * side,
        };
      }
      remaining -= length;
    }
    return { ...this.anchor };
  }
  /** Explicit skill displacement records a new trail point; followers still walk it. */
  relocate(point: Point) {
    const dx = point.x - this.anchor.x,
      dy = point.y - this.anchor.y;
    if (Math.hypot(dx, dy) > 0.001) {
      const heading = Math.atan2(dy, dx);
      if (Math.cos(heading - this.heading) < -0.35)
        this.members.slice(1).forEach((id) => this.waiting.add(id));
      this.heading = heading;
    }
    this.anchor.x = point.x;
    this.anchor.y = point.y;
    this.trail.push({ ...point });
    if (this.trail.length > 1200)
      this.trail.splice(0, this.trail.length - 1200);
    if (this.members[0]) this.positions.set(this.members[0], { ...point });
  }
  private guardHeading?: number;
  /** Deterministic combat clock for the cluster's slow drift (no wall time, no randomness). */
  private guardClock = 0;
  /**
   * Original-style battle cluster: members spread loosely around the captain facing the
   * threat (flanks first, then a rear arc) and drift slowly, instead of a single file.
   */
  private clusterSlot(i: number): Point {
    if (i === 0) return { ...this.anchor };
    const s = this.spacing,
      ring = i <= 2 ? 0 : i <= 4 ? 1 : 2,
      side = i % 2 ? 1 : -1,
      back = [0.32, 0.9, 1.35][ring] * s,
      lateral = (ring === 2 ? 0 : [0.78, 0.42][ring] * side) * s,
      drift = 0.16 * s,
      bx = -back + Math.sin(this.guardClock * 0.7 + i * 1.9) * drift,
      by = lateral + Math.cos(this.guardClock * 0.55 + i * 2.4) * drift,
      c = Math.cos(this.guardHeading!),
      n = Math.sin(this.guardHeading!);
    return {
      x: this.anchor.x + bx * c - by * n,
      y: this.anchor.y + bx * n + by * c,
    };
  }
  /** Combat: the captain faces the threat with the team clustered around her; every member receives the same dodge input.
   * Offsets converge with bounded movement; neither entering combat nor turning teleports units.
   */
  advanceGuarded(destination: Point, speed: number, dt: number, threat: Point) {
    const desired = Math.atan2(
      threat.y - this.anchor.y,
      threat.x - this.anchor.x,
    );
    this.guardHeading ??= this.heading;
    const turn = Math.atan2(
      Math.sin(desired - this.guardHeading),
      Math.cos(desired - this.guardHeading),
    );
    this.guardHeading += Math.max(-2.4 * dt, Math.min(2.4 * dt, turn));
    this.guardClock += dt;
    const old = { ...this.anchor };
    // Record the same travel history for a continuous return to exploration after combat.
    const held = new Map([...this.positions].map(([id, p]) => [id, { ...p }]));
    this.advance(destination, speed, dt);
    this.waiting.clear();
    const dx = this.anchor.x - old.x,
      dy = this.anchor.y - old.y;
    this.members.forEach((id, i) => {
      const before = held.get(id)!;
      const target = this.clusterSlot(i);
      const translated = { x: before.x + dx, y: before.y + dy };
      const gap = Math.hypot(target.x - translated.x, target.y - translated.y);
      const correction = Math.min(gap, speed * 1.1 * dt);
      const next =
        gap > 0.001
          ? {
              x: translated.x + ((target.x - translated.x) / gap) * correction,
              y: translated.y + ((target.y - translated.y) / gap) * correction,
            }
          : translated;
      // Regrouping must never cancel the player's dodge, even on rapid reversals.
      const travel2 = dx * dx + dy * dy;
      if (travel2 > 0.000001) {
        const opposing =
          ((next.x - translated.x) * dx + (next.y - translated.y) * dy) /
          travel2;
        if (opposing < 0) {
          next.x -= opposing * dx;
          next.y -= opposing * dy;
        }
      }
      // Preserve object identity: renderers and domain fixtures may hold member positions.
      Object.assign(this.positions.get(id)!, next);
    });
  }
  advance(destination: Point, speed: number, dt: number) {
    const dx = destination.x - this.anchor.x,
      dy = destination.y - this.anchor.y,
      d = Math.hypot(dx, dy);
    if (d > 0.001) {
      const nextHeading = Math.atan2(dy, dx);
      if (Math.cos(nextHeading - this.heading) < -0.35)
        this.members.slice(1).forEach((id) => this.waiting.add(id));
      this.heading = nextHeading;
      const step = Math.min(d, speed * dt);
      this.anchor.x += (dx / d) * step;
      this.anchor.y += (dy / d) * step;
      const last = this.trail.at(-1)!;
      if (Math.hypot(this.anchor.x - last.x, this.anchor.y - last.y) >= 1)
        this.trail.push({ ...this.anchor });
      else this.trail[this.trail.length - 1] = { ...this.anchor };
      if (this.trail.length > 1200)
        this.trail.splice(0, this.trail.length - 1200);
    }
    this.members.forEach((id, i) => {
      const target = this.target(i),
        pos = this.positions.get(id)!,
        gap = Math.hypot(target.x - pos.x, target.y - pos.y);
      if (this.waiting.has(id)) {
        const leader = this.positions.get(this.members[0])!;
        const lead =
          (leader.x - pos.x) * Math.cos(this.heading) +
          (leader.y - pos.y) * Math.sin(this.heading);
        const forward =
          (target.x - pos.x) * Math.cos(this.heading) +
          (target.y - pos.y) * Math.sin(this.heading);
        if (lead < i * this.spacing * 0.7 || forward < -this.spacing * 0.08)
          return;
        this.waiting.delete(id);
      }
      if (gap > 0.025) {
        const catchup =
          i === 0
            ? 1.7
            : 1.12 +
              Math.min(
                1.08,
                Math.max(0, gap - this.spacing * 0.25) / this.spacing,
              );
        const step = Math.min(
          gap,
          Math.min(speed * catchup, gap / (0.14 + i * 0.045)) * dt,
        );
        pos.x += ((target.x - pos.x) / gap) * step;
        pos.y += ((target.y - pos.y) / gap) * step;
      }
    });
  }
}
