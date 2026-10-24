import type Phaser from "phaser";
import type { Combat } from "../domain/combat";
import type { Pack, Skill } from "../content/schema";

type Ink = Phaser.GameObjects.Graphics;
export type VfxFamily =
  | "beam"
  | "gravity"
  | "shield"
  | "heal"
  | "dash"
  | "summon"
  | "time"
  | "burst"
  | "enhance"
  | "projectile";
export function vfxFamily(s: Skill): VfxFamily {
  const a = s.actions ?? [];
  if (a.some((v) => v.pull > 0)) return "gravity";
  if (a.some((v) => v.kind === "beam")) return "beam";
  if (s.effect === "heal" || a.some((v) => v.kind === "heal")) return "heal";
  if (
    s.effect === "shield" ||
    a.some(
      (v) =>
        v.kind === "shield" ||
        v.modifiers.some((m) =>
          [
            "directional",
            "reflect",
            "deflect",
            "redirect",
            "offset",
            "invincible",
            "absorb",
          ].includes(m.stat),
        ),
    )
  )
    return "shield";
  if (a.some((v) => v.kind === "timeStop")) return "time";
  if (a.some((v) => v.kind === "dash")) return "dash";
  if (a.some((v) => v.kind === "summon")) return "summon";
  if (a.some((v) => ["zone", "bomb", "detonate"].includes(v.kind)))
    return "burst";
  if (a.some((v) => v.kind === "status")) return "enhance";
  return "projectile";
}
const color = (s: string) => Number.parseInt(s.replace("#", ""), 16);
const cyan = 0x8aede3,
  threat = 0xff758f;
function ring(
  g: Ink,
  x: number,
  y: number,
  r: number,
  c: number,
  alpha: number,
  width = 2,
) {
  g.lineStyle(width, c, alpha);
  g.strokeCircle(x, y, Math.max(1, r));
}
function polygon(
  g: Ink,
  x: number,
  y: number,
  r: number,
  c: number,
  alpha: number,
  rotation = 0,
  sides = 6,
) {
  g.lineStyle(1.5, c, alpha);
  g.beginPath();
  for (let i = 0; i <= sides; i++) {
    const a = rotation + (i * Math.PI * 2) / sides;
    if (!i) g.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    else g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  g.strokePath();
}
function ray(
  g: Ink,
  x: number,
  y: number,
  a: number,
  from: number,
  to: number,
) {
  g.lineBetween(
    x + Math.cos(a) * from,
    y + Math.sin(a) * from,
    x + Math.cos(a) * to,
    y + Math.sin(a) * to,
  );
}

/** Read-only, stateless renderer: all lifetimes and hit geometry belong to Combat.
 * base=NORMAL ground detail, light=ADD decoration, danger=NORMAL above sprites.
 * Reduced effects suppress ornaments only. No timers, RNG or damage callbacks.
 */
export function drawCombatVfx(
  base: Ink,
  light: Ink,
  danger: Ink,
  combat: Combat,
  pack: Pack,
  reduced: boolean,
) {
  const t = combat.time;
  for (const f of combat.mechanics.fields) {
    const a = f.action,
      hostile = f.side === "enemy",
      c = color(f.color),
      edge = hostile ? threat : cyan;
    if (a.kind === "beam") {
      const reach = f.reach ?? a.radius,
        ex = f.x + Math.cos(f.angle) * reach,
        ey = f.y + Math.sin(f.angle) * reach;
      base.lineStyle(a.width, edge, hostile ? 0.22 : 0.12);
      base.lineBetween(f.x, f.y, ex, ey);
      danger.lineStyle(Math.max(1, a.width * 0.08), edge, 0.8);
      danger.lineBetween(f.x, f.y, ex, ey);
      // The two boundary rails describe the actual beam width, including on low effects.
      const nx = (-Math.sin(f.angle) * a.width) / 2,
        ny = (Math.cos(f.angle) * a.width) / 2;
      danger.lineStyle(1.2, edge, 0.65);
      danger.lineBetween(f.x + nx, f.y + ny, ex + nx, ey + ny);
      danger.lineBetween(f.x - nx, f.y - ny, ex - nx, ey - ny);
      if (!reduced) {
        light.lineStyle(a.width * 0.5, c, 0.18);
        light.lineBetween(f.x, f.y, ex, ey);
        light.lineStyle(Math.max(2, a.width * 0.1), 0xe7ffff, 0.65);
        light.lineBetween(f.x, f.y, ex, ey);
        for (let i = 0; i < 6; i++) {
          const d = (t * 220 + (i * reach) / 6) % Math.max(1, reach);
          light.fillStyle(c, 0.65);
          light.fillCircle(
            f.x + Math.cos(f.angle) * d,
            f.y + Math.sin(f.angle) * d,
            3,
          );
        }
      }
    } else {
      const r = f.radius ?? a.radius;
      base.fillStyle(edge, hostile ? 0.07 : 0.025);
      base.fillCircle(f.x, f.y, r);
      ring(danger, f.x, f.y, r, edge, 0.8, hostile ? 2.5 : 1.5);
      // Tick marks distinguish hostile fields by shape as well as color.
      if (hostile) {
        danger.lineStyle(2, edge, 0.85);
        for (let i = 0; i < 16; i++)
          ray(danger, f.x, f.y, (i * Math.PI) / 8, r - 9, r);
      }
      if (a.pull) {
        base.fillStyle(0x040713, 0.93);
        base.fillCircle(f.x, f.y, Math.min(r, 35));
        ring(base, f.x, f.y, Math.min(r, 39), 0xdec5ff, 0.9, 3);
        if (!reduced) {
          light.lineStyle(2, c, 0.5);
          for (let arm = 0; arm < 3; arm++) {
            light.beginPath();
            for (let i = 0; i <= 28; i++) {
              const rr = 35 + ((Math.max(35, r * 0.85) - 35) * i) / 28,
                a = t * 0.7 + (arm * Math.PI * 2) / 3 + i * 0.14;
              if (!i)
                light.moveTo(f.x + Math.cos(a) * rr, f.y + Math.sin(a) * rr);
              else light.lineTo(f.x + Math.cos(a) * rr, f.y + Math.sin(a) * rr);
            }
            light.strokePath();
          }
          ring(light, f.x, f.y, 42, c, 0.15, 16);
        }
      } else if (!reduced) {
        polygon(light, f.x, f.y, r * 0.75, c, 0.18, t * 0.12);
        ring(light, f.x, f.y, r * ((t * 0.35) % 1), c, 0.15);
      }
    }
  }
  for (const d of combat.mechanics.dashes) {
    const u = combat.units.find((u) => u.id === d.owner);
    if (!u) continue;
    const c = color(u.color);
    base.lineStyle(d.action.width, u.side === "enemy" ? threat : cyan, 0.15);
    base.lineBetween(d.from.x, d.from.y, u.x, u.y);
    if (!reduced) {
      light.lineStyle(3, c, 0.8);
      light.lineBetween(d.from.x, d.from.y, u.x, u.y);
      for (let i = 1; i <= 4; i++)
        polygon(
          light,
          u.x + ((d.from.x - u.x) * i) / 5,
          u.y + ((d.from.y - u.y) * i) / 5,
          15 + i * 2,
          c,
          0.4 / i,
          u.aim,
          4,
        );
    }
  }
  for (const b of combat.bullets) {
    const hostile = b.side === "enemy",
      c = hostile ? threat : color(b.color),
      length = hostile ? 14 : 22,
      speed = Math.hypot(b.vx, b.vy) || 1,
      dx = b.vx / speed,
      dy = b.vy / speed;
    base.lineStyle(hostile ? 3 : 2, c, 0.75);
    base.lineBetween(b.x, b.y, b.x - dx * length, b.y - dy * length);
    // Bright hostile cores remain above every unit and every decorative effect.
    danger.fillStyle(hostile ? 0xffdce3 : 0xd9fffa, 1);
    danger.fillCircle(b.x, b.y, hostile ? 3.4 : 1.8);
    if (hostile)
      polygon(
        danger,
        b.x,
        b.y,
        b.pattern === "mine" ? 10 : 6,
        c,
        0.95,
        Math.PI / 4,
        4,
      );
    if (!reduced) {
      light.fillStyle(c, 0.12);
      light.fillCircle(b.x, b.y, hostile ? 9 : 5);
      if (b.pattern === "homing") {
        light.lineStyle(1, c, 0.4);
        light.lineBetween(
          b.x - dy * 4,
          b.y + dx * 4,
          b.x - dx * 18,
          b.y - dy * 18,
        );
      }
    }
  }
  for (const f of combat.flashes) {
    const s = f.skillId
        ? pack.skills.find((s) => s.id === f.skillId)
        : undefined,
      c = color(f.color),
      family = s ? vfxFamily(s) : "burst",
      duration = s ? 0.65 : f.side ? 0.25 : 1.2,
      phase = Math.max(0, Math.min(1, 1 - f.life / duration)),
      fade = Math.min(1, f.life / 0.15);
    if (s) {
      const r = 22 + phase * 70;
      ring(base, f.x, f.y, r, c, fade * 0.65, 2);
      if (!reduced) {
        ring(light, f.x, f.y, r, c, fade * 0.12, 14);
        if (["shield", "summon", "time"].includes(family)) {
          polygon(
            light,
            f.x,
            f.y,
            r * 0.9,
            c,
            fade * 0.8,
            phase * 0.3,
            family === "time" ? 12 : 6,
          );
          polygon(light, f.x, f.y, r * 0.65, c, fade * 0.4, -phase * 0.3);
        } else if (family === "heal" || family === "enhance") {
          light.lineStyle(2, family === "heal" ? 0xa5ffd2 : c, fade * 0.9);
          for (let i = 0; i < 5; i++) {
            const x = f.x + Math.cos(i * 2.4) * 45,
              y = f.y + Math.sin(i * 2.4) * 30 - phase * 40;
            light.lineBetween(x - 4, y, x + 4, y);
            light.lineBetween(x, y - 4, x, y + 4);
          }
        } else {
          light.lineStyle(2, c, fade * 0.75);
          for (let i = 0; i < 10; i++)
            ray(
              light,
              f.x,
              f.y,
              (i * Math.PI) / 5 + phase * 0.15,
              r * 0.75,
              r + 12,
            );
        }
      }
    } else {
      // Short impact sparks, rather than expanding screen-sized circles per pellet.
      const r = 3 + phase * Math.min(26, f.radius);
      ring(base, f.x, f.y, r, f.side === "ally" ? threat : c, fade * 0.6, 1);
      if (!reduced) {
        light.fillStyle(0xfff4da, fade * 0.75);
        light.fillCircle(f.x, f.y, 2 + (1 - phase) * 3);
        light.lineStyle(1.4, c, fade * 0.85);
        for (let i = 0; i < 5; i++)
          ray(light, f.x, f.y, i * Math.PI * 0.4 + 0.3, r * 0.5, r + 7);
      }
    }
  }
  for (const u of combat.units) {
    if (u.hp <= 0) continue;
    const statuses = combat.mechanics.active(u),
      c = color(u.color);
    if (
      t < combat.mechanics.stoppedUntil &&
      u.side === combat.mechanics.stoppedSide
    ) {
      polygon(danger, u.x, u.y, 32, 0xc7b9ff, 0.75, 0, 12);
      danger.lineStyle(2, 0xc7b9ff, 0.85);
      danger.lineBetween(u.x, u.y - 12, u.x, u.y);
      danger.lineBetween(u.x, u.y, u.x + 8, u.y + 4);
    }
    if (u.shield > 0 && !reduced) {
      polygon(light, u.x, u.y, 34, cyan, 0.5, Math.PI / 6);
      ring(light, u.x, u.y, 36, cyan, 0.1, 8);
    }
    if (!reduced && (statuses.length || u.buffUntil > t)) {
      base.lineStyle(1.5, c, 0.4);
      base.strokeEllipse(u.x, u.y + 28, 60, 18);
      for (let i = 0; i < 3; i++) {
        const a = t * 0.7 + (i * Math.PI * 2) / 3;
        light.fillStyle(c, 0.6);
        light.fillCircle(u.x + Math.cos(a) * 30, u.y + 15 + Math.sin(a) * 8, 2);
      }
    }
    if (!reduced && t - u.shotAt < 0.08) {
      const x = u.x + Math.cos(u.aim) * 18,
        y = u.y + Math.sin(u.aim) * 18;
      light.fillStyle(c, 0.7);
      light.fillTriangle(
        x + Math.cos(u.aim) * 12,
        y + Math.sin(u.aim) * 12,
        x - Math.sin(u.aim) * 4,
        y + Math.cos(u.aim) * 4,
        x + Math.sin(u.aim) * 4,
        y - Math.cos(u.aim) * 4,
      );
    }
  }
}
