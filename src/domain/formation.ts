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
