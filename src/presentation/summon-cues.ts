import type Phaser from "phaser";
import type { Combat, Unit } from "../domain/combat";

/** Observes visual transitions only. Expiry/death and all attacks belong to Combat. */
export class SummonCues {
  private combat?: Combat;
  private seen = new Map<
    Unit,
    { born: number; alive: boolean; gone?: number }
  >();
  draw(
    ink: Phaser.GameObjects.Graphics,
    light: Phaser.GameObjects.Graphics,
    c: Combat,
    reduced: boolean,
  ) {
    if (this.combat !== c) {
      this.combat = c;
      this.seen.clear();
    }
    for (const u of c.units) {
      if (!u.summonKind) continue;
      let state = this.seen.get(u);
      if (!state) {
        if (u.hp <= 0) continue;
        state = { born: c.time, alive: true };
        this.seen.set(u, state);
      }
      if (state.alive && u.hp <= 0) {
        state.alive = false;
        state.gone = c.time;
      }
      if (reduced) continue;
      const color = u.side === "enemy" ? 0xff758f : 0x9fe8e2;
      const age = c.time - state.born;
      if (state.alive && age < 0.32) {
        const phase = age / 0.32;
        ink.lineStyle(1.5, color, 1 - phase);
        ink.strokeEllipse(u.x, u.y, 70 - phase * 15, 34 - phase * 8);
        light.lineStyle(2, color, (1 - phase) * 0.7);
        for (let i = 0; i < 6; i++) {
          const a = (i * Math.PI) / 3,
            r = 40 - phase * 12;
          light.lineBetween(
            u.x + Math.cos(a) * r,
            u.y + Math.sin(a) * r,
            u.x + Math.cos(a) * (r + 10),
            u.y + Math.sin(a) * (r + 10),
          );
        }
      }
      if (state.gone !== undefined && c.time - state.gone < 0.3) {
        const phase = (c.time - state.gone) / 0.3;
        light.lineStyle(1.5, color, (1 - phase) * 0.65);
        for (let i = 0; i < 6; i++) {
          const a = (i * Math.PI) / 3 + 0.2,
            r = 12 + phase * 22;
          light.lineBetween(
            u.x + Math.cos(a) * r,
            u.y + Math.sin(a) * r,
            u.x + Math.cos(a) * (r + 6),
            u.y + Math.sin(a) * (r + 6),
          );
        }
      }
    }
  }
}
