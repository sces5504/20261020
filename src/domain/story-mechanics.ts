import type { Facility } from "../content/schema";
import type { StoryEncounter } from "../content/story";
import type { Combat, Unit } from "./combat";

type ShieldDef = StoryEncounter["shields"][number];
type Placement = StoryEncounter["facilities"][number];
type Trigger = StoryEncounter["triggers"][number];
export type ShieldStatus = "up" | "down" | "suspended" | "removed" | "off";
export type ShieldState = {
  def: ShieldDef;
  status: ShieldStatus;
  layers: number;
  capacityLeft: number;
  /** Duration end while up. */
  until?: number;
  /** Jam window end while suspended. */
  resumeAt?: number;
  /** When it broke or expired (for restoreAfter). */
  downAt?: number;
};
export type PlacementState = {
  placement: Placement;
  def: Facility;
  unit?: Unit;
  activations: number;
  channel: number;
  readyAt: number;
  auraAt: number;
};
export type StoryHint = { text: string; tone: "shield" | "jam" | "facility" };

/** Attack kind passed to Mechanics.hit → shield category. */
export function attackCategory(kind: string) {
  if (kind.startsWith("melee")) return "melee";
  if (["piercing", "splash", "homing", "laser"].includes(kind)) return kind;
  if (["corrosion", "blaze"].includes(kind)) return "status";
  return "normal";
}

/**
 * Story-only combat rules: multi-layer shields, timed jam windows and author-placed
 * chapter facilities. Everything is driven by encounter data; no content IDs here.
 */
export class StoryMechanics {
  shields = new Map<string, ShieldState>();
  placements = new Map<string, PlacementState>();
  activated: Record<string, number> = {};
  private fired = new Set<number>();
  private previous = new Map<number, boolean>();
  private seenActivations = new Map<number, number>();
  constructor(
    readonly c: Combat,
    readonly e: StoryEncounter,
  ) {
    for (const def of e.shields)
      this.shields.set(def.id, {
        def,
        status: def.startsActive ? "up" : "off",
        layers: def.layers,
        capacityLeft: def.capacity,
        until: def.startsActive && def.duration ? def.duration : undefined,
      });
    for (const placement of e.facilities) {
      const def = c.pack.facilities.find((f) => f.id === placement.facility)!;
      const state: PlacementState = {
        placement,
        def,
        activations: 0,
        channel: 0,
        readyAt: 0,
        auraAt: 0,
      };
      this.placements.set(placement.id, state);
      const saved = c.save.facilities?.[def.id];
      // Save-scoped facilities only appear once built, with the HP they kept.
      if (def.scope === "save" && (!saved || saved.destroyed)) continue;
      state.unit = this.spawn(placement, def, saved?.hp ?? def.hp);
    }
  }
  private spawn(placement: Placement, def: Facility, hp: number): Unit {
    const turret = def.effect.kind === "turret" ? def.effect : undefined;
    const unit: Unit = {
      id: placement.id,
      def: def.id,
      name: def.name,
      side: def.side,
      x: placement.x,
      y: placement.y,
      hp,
      maxHp: def.hp,
      attack: turret?.attack ?? 0,
      defense: def.defense,
      critical: 0,
      evasion: 0,
      speed: 0,
      range: turret?.range ?? 0,
      interval: turret?.interval ?? 1,
      cooldown: 0.5,
      skillCooldown: 0,
      shield: 0,
      buffUntil: 0,
      buff: "",
      power: 1,
      boss: false,
      color: def.color,
      sprite: def.sprite,
      turretUntil: 0,
      windup: 0,
      aim: 0,
      hurtUntil: 0,
      shotAt: -1,
      storyActor: true,
      facility: placement.id,
      untargetable: !def.targetable,
    };
    this.c.units.push(unit);
    return unit;
  }
  covers(s: ShieldState, u: Unit) {
    return (
      (s.def.units.includes(u.id) && !!u.storyActor) ||
      (s.def.enemies.includes(u.def) && u.side === "enemy" && !u.facility)
    );
  }
  /** Applies every active shield on `u` to a hit of `kind`; returns the damage that passes. */
  filter(u: Unit, kind: string, hit: number) {
    const category = attackCategory(kind);
    for (const s of this.shields.values()) {
      if (s.status !== "up" || !this.covers(s, u)) continue;
      if (!s.def.blocks.includes(category as ShieldDef["blocks"][number]))
        continue;
      const raw = hit;
      hit = Math.round(hit * s.def.multiplier);
      if (s.def.layers > 0) {
        s.capacityLeft -= raw;
        while (s.capacityLeft <= 0 && s.layers > 0) {
          s.layers--;
          s.capacityLeft += s.def.capacity;
          this.c.flashes.push({
            x: u.x,
            y: u.y - 40,
            radius: 46,
            color: "#8fd8ff",
            life: 0.9,
            label: s.layers
              ? `${s.def.name}破損 · 剩${s.layers}層`
              : `${s.def.name}擊破`,
          });
        }
        if (s.layers <= 0) {
          s.status = "down";
          s.downAt = this.c.time;
          s.capacityLeft = s.def.capacity;
        }
      }
    }
    return hit;
  }
  /** True while any shield on `u` would block `kind` (for presentation). */
  shielded(u: Unit) {
    return [...this.shields.values()].some(
      (s) => s.status === "up" && this.covers(s, u),
    );
  }
  private refill(s: ShieldState) {
    s.layers = s.def.layers;
    s.capacityLeft = s.def.capacity;
  }
  enable(id: string) {
    const s = this.shields.get(id);
    if (!s || s.status === "removed") return;
    s.status = "up";
    this.refill(s);
    s.resumeAt = undefined;
    s.until = s.def.duration ? this.c.time + s.def.duration : undefined;
  }
  suspend(id: string, seconds?: number) {
    const s = this.shields.get(id);
    if (!s || s.status === "removed" || s.status === "off") return;
    s.status = "suspended";
    s.resumeAt = seconds ? this.c.time + seconds : undefined;
  }
  remove(id: string) {
    const s = this.shields.get(id);
    if (s) s.status = "removed";
  }
  /** Facility effect fired by the captain's channel or a trigger. */
  activate(p: PlacementState) {
    if (!p.unit || p.unit.hp <= 0) return false;
    p.activations++;
    this.activated[p.def.id] = (this.activated[p.def.id] ?? 0) + 1;
    const effect = p.def.effect;
    if (effect.kind === "jammer") {
      for (const s of this.shields.values())
        if (
          (!effect.jams.length || s.def.tags.some((t) => effect.jams.includes(t))) &&
          (s.status === "up" || s.status === "suspended")
        )
          this.suspend(s.def.id, effect.seconds);
      p.readyAt = this.c.time + effect.seconds + effect.cooldown;
      this.c.flashes.push({
        x: p.unit.x,
        y: p.unit.y - 60,
        radius: 90,
        color: "#ffe08a",
        life: 1.6,
        label: `${p.def.name}啟動 · 突破窗口 ${effect.seconds} 秒`,
      });
    }
    return true;
  }
  private captain() {
    return this.c.allies.find((u) => u.hp > 0);
  }
  /** Returns true when the battle ended (a required facility fell). */
  step(dt: number): boolean {
    const time = this.c.time;
    for (const s of this.shields.values()) {
      if (s.status === "up" && s.until !== undefined && time >= s.until) {
        s.status = "down";
        s.downAt = time;
        s.until = undefined;
      }
      if (s.status === "suspended" && s.resumeAt !== undefined && time >= s.resumeAt) {
        s.status = "up";
        s.resumeAt = undefined;
        if (s.def.refillOnRestore) this.refill(s);
        s.until = s.def.duration ? time + s.def.duration : undefined;
      }
      if (
        s.status === "down" &&
        s.def.restoreAfter &&
        s.downAt !== undefined &&
        time >= s.downAt + s.def.restoreAfter
      )
        this.enable(s.def.id);
    }
    const captain = this.captain();
    for (const p of this.placements.values()) {
      const u = p.unit;
      if (!u) continue;
      if (u.hp <= 0) {
        if (p.placement.onDestroyed === "fail") {
          this.c.ended = true;
          this.c.victory = false;
          return true;
        }
        continue;
      }
      const effect = p.def.effect;
      if (effect.kind === "aura" && time >= p.auraAt) {
        p.auraAt = time + 0.5;
        for (const v of this.c.units)
          if (
            v.hp > 0 &&
            v.side === u.side &&
            !v.facility &&
            Math.hypot(v.x - u.x, v.y - u.y) <= effect.radius
          )
            for (const m of effect.modifiers)
              this.c.mechanics.add(
                v,
                { ...m, duration: Math.min(m.duration, 1) },
                u,
                `facility:${p.placement.id}`,
              );
      }
      if (effect.kind === "jammer" && u.side === "ally") {
        const spent = effect.charges > 0 && p.activations >= effect.charges;
        const near =
          !!captain && Math.hypot(captain.x - u.x, captain.y - u.y) <= effect.reach;
        if (spent || time < p.readyAt || !near) p.channel = 0;
        else {
          p.channel += dt;
          if (p.channel >= effect.channel) {
            p.channel = 0;
            this.activate(p);
          }
        }
      }
    }
    this.e.triggers.forEach((t, i) => this.check(t, i));
    return false;
  }
  private check(t: Trigger, i: number) {
    if (!t.repeat && this.fired.has(i)) return;
    const unit = (id?: string) => this.c.units.find((u) => u.id === id);
    let met = false;
    if (t.at !== undefined) met = this.c.time >= t.at;
    else if (t.hpBelow !== undefined) {
      const u = unit(t.actor);
      met = !!u && u.hp / u.maxHp <= t.hpBelow;
    } else if (t.defeated) {
      const u = unit(t.defeated);
      met = !!u && u.hp <= 0;
    } else if (t.facility) {
      const p = this.placements.get(t.facility);
      if (t.state === "destroyed") met = !!p?.unit && p.unit.hp <= 0;
      else {
        const seen = this.seenActivations.get(i) ?? 0;
        met = (p?.activations ?? 0) > seen;
        if (met) this.seenActivations.set(i, p!.activations);
      }
    } else if (t.shieldDown) {
      const s = this.shields.get(t.shieldDown);
      met = !!s && s.status !== "up";
    }
    const rising = met && (t.state === "activated" || !this.previous.get(i));
    this.previous.set(i, met);
    if (!rising) return;
    this.fired.add(i);
    for (const x of t.then) {
      if (x.op === "enableShield") this.enable(x.shield!);
      if (x.op === "suspendShield") this.suspend(x.shield!, x.seconds);
      if (x.op === "removeShield") this.remove(x.shield!);
      if (x.op === "activateFacility") {
        const p = this.placements.get(x.facility!);
        if (p) this.activate(p);
      }
    }
  }
  /** Non-blocking status lines for the battle HUD. */
  hints(): StoryHint[] {
    const out: StoryHint[] = [];
    const time = this.c.time;
    for (const s of this.shields.values()) {
      if (!this.c.units.some((u) => u.hp > 0 && this.covers(s, u))) continue;
      if (s.status === "up")
        out.push({
          tone: "shield",
          text: `${s.def.name}生效${s.def.layers ? ` · ${s.layers}/${s.def.layers}層` : ""}${s.until !== undefined ? ` · ${Math.ceil(s.until - time)}秒` : ""}`,
        });
      else if (s.status === "suspended")
        out.push({
          tone: "jam",
          text: `${s.def.name}受干擾${s.resumeAt !== undefined ? ` · 突破窗口 ${Math.ceil(s.resumeAt - time)} 秒` : ""}`,
        });
      else if (s.status === "down" && s.def.restoreAfter && s.downAt !== undefined)
        out.push({
          tone: "jam",
          text: `${s.def.name}失效 · ${Math.ceil(s.downAt + s.def.restoreAfter - time)} 秒後恢復`,
        });
    }
    for (const p of this.placements.values()) {
      const u = p.unit,
        effect = p.def.effect;
      if (!u) continue;
      if (u.hp <= 0) {
        out.push({ tone: "facility", text: `${p.def.name}已被摧毀` });
        continue;
      }
      if (effect.kind === "jammer" && u.side === "ally") {
        if (effect.charges > 0 && p.activations >= effect.charges) continue;
        out.push({
          tone: "facility",
          text:
            time < p.readyAt
              ? `${p.def.name}冷卻 · ${Math.ceil(p.readyAt - time)} 秒`
              : p.channel > 0
                ? `${p.def.name}啟動中 ${Math.round((p.channel / Math.max(0.01, effect.channel)) * 100)}%`
                : `靠近${p.def.name}即可啟動`,
        });
      }
    }
    return out;
  }
  /** Save-scoped facility HP and activations for the battle result. */
  results() {
    const facilities: Record<string, { hp: number; destroyed: boolean }> = {};
    for (const p of this.placements.values())
      if (p.def.scope === "save" && p.unit)
        facilities[p.def.id] = {
          hp: Math.max(0, Math.round(p.unit.hp)),
          destroyed: p.unit.hp <= 0,
        };
    return { facilities, activated: { ...this.activated } };
  }
}
