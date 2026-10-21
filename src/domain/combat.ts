import { formationOffset, patrolPosition } from "./navigation";
import type { Pack, Character, Enemy, Skill } from "../content/schema";
import { type Save, stats, damage, random } from "./model";
export type Unit = {
  id: string;
  def: string;
  name: string;
  side: "ally" | "enemy";
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  range: number;
  interval: number;
  cooldown: number;
  skillCooldown: number;
  shield: number;
  buffUntil: number;
  buff: string;
  power: number;
  boss: boolean;
  color: string;
  sprite: string;
  turretUntil: number;
  windup: number;
  aim: number;
};
export type Bullet = {
  id: number;
  side: Unit["side"];
  x: number;
  y: number;
  vx: number;
  vy: number;
  attack: number;
  life: number;
  color: string;
};
export type Flash = {
  x: number;
  y: number;
  radius: number;
  color: string;
  life: number;
  label: string;
};
export class Combat {
  units: Unit[] = [];
  bullets: Bullet[] = [];
  flashes: Flash[] = [];
  time = 0;
  rng: number;
  sequence = 0;
  destination: { x: number; y: number };
  anchor: { x: number; y: number };
  target = "";
  autoSkills = false;
  ended = false;
  victory = false;
  hitsReceived = 0;
  waveIndex = 0;
  nextWaveAt = 0;
  waveGroups: { enemy: string; count: number }[][] = [];
  waveDelay = 4;
  constructor(
    readonly pack: Pack,
    readonly save: Save,
    readonly planetId: string,
  ) {
    const region = pack.regions.find((r) => r.id === save.region)!;
    const planet =
      save.encounter?.kind === "patrol"
        ? (() => {
            const v = region.patrols.find((v) => v.id === planetId)!;
            return { ...v, ...patrolPosition(v, save.voyageSeconds) };
          })()
        : pack.planets.find((v) => v.id === planetId)!;
    this.waveGroups = [
      planet.enemies,
      ...("waves" in planet ? planet.waves : []),
    ];
    this.waveDelay = "waveDelay" in planet ? planet.waveDelay : 3;
    this.rng = save.encounter?.seed ?? 1;
    this.destination = { x: save.x, y: save.y };
    this.anchor = { ...this.destination };
    const bonus = pack.research
      .filter((r) => save.research.includes(r.id))
      .reduce((n, r) => n + r.attackBonus, 1);
    save.team.forEach((id, i) => {
      const o = save.roster.find((v) => v.id === id)!;
      const c = pack.characters.find((v) => v.id === o.definition)!;
      const st = stats(pack, o);
      this.units.push(
        this.unit(
          c,
          id,
          "ally",
          save.x +
            formationOffset(i, save.team.length, pack.rules.formationSpacing).x,
          save.y +
            formationOffset(i, save.team.length, pack.rules.formationSpacing).y,
          o.hp,
          st.hp,
          st.attack * bonus,
          st.defense,
        ),
      );
    });
    this.spawnWave(planet.x, planet.y);
  }
  private spawnWave(x: number, y: number) {
    for (const g of this.waveGroups[this.waveIndex]) {
      const e = this.pack.enemies.find((e) => e.id === g.enemy)!;
      for (let i = 0; i < g.count; i++)
        this.units.push(
          this.unit(
            e,
            `enemy-${this.sequence++}`,
            "enemy",
            x + 140 + (random(this) - 0.5) * 260,
            y + (random(this) - 0.5) * 280,
            e.hp,
            e.hp,
            e.attack,
            e.defense,
          ),
        );
    }
  }
  private unit(
    c: Character | Enemy,
    id: string,
    side: Unit["side"],
    x: number,
    y: number,
    hp: number,
    maxHp: number,
    attack: number,
    defense: number,
  ): Unit {
    return {
      id,
      def: c.id,
      name: c.name,
      side,
      x,
      y,
      hp,
      maxHp,
      attack,
      defense,
      speed: c.speed,
      range: c.range,
      interval: c.interval,
      cooldown: 0.3,
      skillCooldown: 0,
      shield: 0,
      buffUntil: 0,
      buff: "",
      power: 1,
      boss: "boss" in c ? c.boss : false,
      color: c.color,
      sprite: c.sprite,
      turretUntil: 0,
      windup: 0,
      aim: 0,
    };
  }
  get allies() {
    return this.units.filter((u) => u.side === "ally" && !u.turretUntil);
  }
  get center() {
    return { ...this.anchor };
  }

  skillFor(u: Unit) {
    return this.pack.skills.find(
      (s) => s.id === this.pack.characters.find((c) => c.id === u.def)?.skill,
    );
  }
  cast(id: string) {
    const u = this.units.find((v) => v.id === id),
      s = u && this.skillFor(u);
    if (!u || !s || u.hp <= 0 || u.skillCooldown > 0 || this.ended)
      return false;
    u.skillCooldown = s.cooldown;
    this.effect(u, s);
    return true;
  }
  private effect(u: Unit, s: Skill) {
    const friends = this.units.filter((v) => v.side === u.side && v.hp > 0),
      foes = this.units.filter((v) => v.side !== u.side && v.hp > 0);
    this.flashes.push({
      x: u.x,
      y: u.y,
      radius: 110,
      color: s.color,
      life: 0.65,
      label: s.name,
    });
    if (s.effect === "shield")
      friends.forEach((v) => {
        v.shield = s.power;
        v.buffUntil = this.time + s.duration;
      });
    if (["accelerate", "fortify"].includes(s.effect)) {
      u.buff = s.effect;
      u.power = s.power;
      u.buffUntil = this.time + s.duration;
    }
    if (s.effect === "weaken")
      foes.forEach((v) => {
        v.buff = "weaken";
        v.power = s.power;
        v.buffUntil = this.time + s.duration;
      });
    if (s.effect === "heal")
      friends.forEach((v) => (v.hp = Math.min(v.maxHp, v.hp + s.power)));
    if (s.effect === "barrage")
      for (let i = 0; i < 12; i++) {
        const angle = (i * Math.PI * 2) / 12;
        this.bullets.push({
          id: this.sequence++,
          side: u.side,
          x: u.x,
          y: u.y,
          vx: Math.cos(angle) * 480,
          vy: Math.sin(angle) * 480,
          attack: u.attack * s.power,
          life: 2,
          color: s.color,
        });
      }
    if (s.effect === "turret") {
      this.units.push({
        ...u,
        id: `turret-${this.sequence++}`,
        name: "共鳴砲台",
        sprite: "",
        x: u.x + 45,
        y: u.y - 45,
        hp: 100,
        maxHp: 100,
        attack: u.attack * s.power,
        speed: 0,
        interval: 0.5,
        shield: 0,
        buff: "",
        turretUntil: this.time + s.duration,
      });
    }
  }
  step(dt: number) {
    if (this.ended) return;
    this.time += dt;
    const travel = Math.hypot(
      this.destination.x - this.anchor.x,
      this.destination.y - this.anchor.y,
    );
    const speed = Math.min(
      ...this.allies.filter((u) => u.hp > 0).map((u) => u.speed),
      180,
    );
    if (travel > 0) {
      const step = Math.min(travel, speed * dt);
      this.anchor.x += ((this.destination.x - this.anchor.x) / travel) * step;
      this.anchor.y += ((this.destination.y - this.anchor.y) / travel) * step;
    }
    for (const u of this.units) {
      if (u.hp <= 0) continue;
      if (u.turretUntil && this.time >= u.turretUntil) {
        u.hp = 0;
        continue;
      }
      if (u.buffUntil < this.time) {
        u.buff = "";
        u.shield = 0;
        u.power = 1;
      }
      u.cooldown -= dt * (u.buff === "accelerate" ? u.power : 1);
      u.skillCooldown = Math.max(0, u.skillCooldown - dt);
      if (this.autoSkills && u.side === "ally" && !u.turretUntil)
        this.cast(u.id);
      const foes = this.units
        .filter((v) => v.side !== u.side && v.hp > 0 && !v.turretUntil)
        .sort(
          (a, b) =>
            Math.hypot(a.x - u.x, a.y - u.y) - Math.hypot(b.x - u.x, b.y - u.y),
        );
      const priority = foes.find((v) => v.id === this.target);
      const t = priority && u.side === "ally" ? priority : foes[0];
      let dest = this.destination;
      if (u.side === "ally" && !u.turretUntil) {
        const i = this.allies.indexOf(u);
        const offset = formationOffset(
          i,
          this.allies.length,
          this.pack.rules.formationSpacing,
        );
        dest = { x: this.anchor.x + offset.x, y: this.anchor.y + offset.y };
      }
      if (u.side === "enemy" && t) dest = { x: t.x, y: t.y };
      const d = Math.hypot(dest.x - u.x, dest.y - u.y),
        move =
          u.side === "ally"
            ? !u.turretUntil && d > 0.05
            : t && d > u.range * 0.65;
      if (move && d > 0) {
        u.x +=
          ((dest.x - u.x) / d) *
          Math.min(
            d,
            u.side === "ally"
              ? Math.min(
                  u.speed * 1.65,
                  d / (0.12 + this.allies.indexOf(u) * 0.055),
                ) * dt
              : u.speed * dt,
          );
        u.y +=
          ((dest.y - u.y) / d) *
          Math.min(
            d,
            u.side === "ally"
              ? Math.min(
                  u.speed * 1.65,
                  d / (0.12 + this.allies.indexOf(u) * 0.055),
                ) * dt
              : u.speed * dt,
          );
        const r = this.pack.regions.find((r) => r.id === this.save.region)!;
        u.x = Math.max(15, Math.min(r.width - 15, u.x));
        u.y = Math.max(15, Math.min(r.height - 15, u.y));
      }
      if (u.side === "enemy" && t && u.cooldown <= 0) {
        if (!u.windup) {
          u.windup = 0.55;
          u.aim = Math.atan2(t.y - u.y, t.x - u.x);
        }
        u.windup -= dt;
        if (u.windup > 0) continue;
        u.windup = 0;
      }
      if (t && Math.hypot(t.x - u.x, t.y - u.y) <= u.range && u.cooldown <= 0) {
        u.cooldown = u.interval;
        const e = this.pack.enemies.find((e) => e.id === u.def);
        let pattern = e?.pattern ?? "aim";
        if (e?.boss && u.hp / u.maxHp < e.phaseAt) pattern = "ring";
        const count = pattern === "ring" ? 14 : pattern === "fan" ? 3 : 1;
        const angle =
            u.side === "enemy" ? u.aim : Math.atan2(t.y - u.y, t.x - u.x),
          speed = e?.projectileSpeed ?? 520;
        for (let i = 0; i < count; i++) {
          const a =
            pattern === "ring"
              ? (i * Math.PI * 2) / count + this.time * 0.2
              : angle + (i - (count - 1) / 2) * 0.22;
          this.bullets.push({
            id: this.sequence++,
            side: u.side,
            x: u.x,
            y: u.y,
            vx: Math.cos(a) * speed,
            vy: Math.sin(a) * speed,
            attack: u.attack * (u.buff === "weaken" ? u.power : 1),
            life: 5,
            color: u.side === "ally" ? u.color : "#ff8e7e",
          });
        }
      }
    }
    for (const b of this.bullets) {
      const oldX = b.x,
        oldY = b.y;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      for (const u of this.units) {
        if (u.hp <= 0 || u.side === b.side) continue;
        const dx = b.x - oldX,
          dy = b.y - oldY,
          den = dx * dx + dy * dy;
        const q = den
          ? Math.max(
              0,
              Math.min(1, ((u.x - oldX) * dx + (u.y - oldY) * dy) / den),
            )
          : 0;
        if (
          Math.hypot(oldX + q * dx - u.x, oldY + q * dy - u.y) <
          (u.boss ? 45 : 17)
        ) {
          let hit = damage(
            b.attack,
            u.defense * (u.buff === "fortify" ? u.power : 1),
            this.pack.rules.defenseK,
          );
          const absorb = Math.min(u.shield, hit);
          u.shield -= absorb;
          hit -= absorb;
          if (u.side === "ally" && hit > 0) this.hitsReceived++;
          u.hp = Math.max(0, u.hp - hit);
          b.life = 0;
          this.flashes.push({
            x: u.x,
            y: u.y,
            radius: 20,
            color: b.color,
            life: 0.2,
            label: hit ? String(hit) : "格擋",
          });
          break;
        }
      }
    }
    this.bullets = this.bullets.filter((b) => b.life > 0);
    this.flashes.forEach((f) => (f.life -= dt));
    this.flashes = this.flashes.filter((f) => f.life > 0);
    if (!this.allies.some((u) => u.hp > 0)) {
      this.ended = true;
      this.victory = false;
    } else if (!this.units.some((u) => u.side === "enemy" && u.hp > 0)) {
      if (this.waveIndex < this.waveGroups.length - 1) {
        if (!this.nextWaveAt) this.nextWaveAt = this.time + this.waveDelay;
        if (this.time >= this.nextWaveAt) {
          this.waveIndex++;
          this.nextWaveAt = 0;
          const pos = this.center;
          this.spawnWave(pos.x + 180, pos.y - 60);
          this.flashes.push({
            x: pos.x,
            y: pos.y - 150,
            radius: 130,
            color: "#f2bf82",
            life: 1.2,
            label: `增援抵達 · ${this.waveIndex + 1}/${this.waveGroups.length}`,
          });
        }
      } else {
        this.ended = true;
        this.victory = true;
      }
    }
  }
  result() {
    return Object.fromEntries(this.allies.map((u) => [u.id, u.hp]));
  }
}
