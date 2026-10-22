import { defaultVolleyCount } from "../content/mechanics";
import { Mechanics } from "./mechanics";
import type { Action, Modifier, Pattern } from "../content/mechanics";
import { FleetMotion } from "./formation";
import { guardianPositions, patrolPosition } from "./navigation";
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
  hurtUntil: number;
  shotAt: number;
  critical?: number;
  evasion?: number;
  skillLevel?: number;
  skillOverride?: string;
  summonOwner?: string;
  summonKind?: string;
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
  owner?: string;
  pattern?: Pattern;
  target?: string;
  age?: number;
  angle?: number;
  speed?: number;
  pierce?: number;
  splash?: number;
  pull?: number;
  width?: number;
  modifiers?: Modifier[];
  hitIds?: string[];
  action?: Action;
  chain?: number;
  nextHitAt?: number;
  split?: boolean;
  barrierIds?: string[];
};
export type Flash = {
  x: number;
  y: number;
  radius: number;
  color: string;
  life: number;
  label: string;
  side?: Unit["side"];
  skillId?: string;
  sourceDefinition?: string;
};
export class Combat {
  mechanics = new Mechanics(this);
  laboratory = false;
  lockHealth = false;
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
  reset = false;
  outsideSeconds = 0;
  fleet: FleetMotion;
  constructor(
    readonly pack: Pack,
    readonly save: Save,
    readonly planetId: string,
    fleet?: FleetMotion,
  ) {
    const region = pack.regions.find((r) => r.id === save.region)!;
    const planet =
      save.encounter?.kind === "patrol"
        ? (() => {
            const v = region.patrols.find((v) => v.id === planetId)!;
            return { ...v, ...patrolPosition(v, save.voyageSeconds) };
          })()
        : pack.planets.find((v) => v.id === planetId)!;
    this.waveGroups = [planet.enemies];
    this.waveDelay = "waveDelay" in planet ? planet.waveDelay : 3;
    this.rng = save.encounter?.seed ?? 1;
    this.destination = { x: save.x, y: save.y };
    this.fleet =
      fleet ??
      new FleetMotion(
        save.x,
        save.y,
        save.heading ?? 0,
        save.team,
        pack.rules.formationSpacing,
      );
    this.anchor = this.fleet.anchor;
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
          this.fleet.positions.get(id)!.x,
          this.fleet.positions.get(id)!.y,
          o.hp,
          st.hp,
          st.attack * bonus,
          st.defense,
        ),
      );
    });
    if (save.encounter?.kind === "patrol") this.spawnWave(planet.x, planet.y);
    else
      for (const guard of guardianPositions(
        planet as Pack["planets"][number],
      )) {
        const e = pack.enemies.find((e) => e.id === guard.enemy)!;
        this.units.push(
          this.unit(
            e,
            guard.id,
            "enemy",
            guard.x,
            guard.y,
            e.hp,
            e.hp,
            e.attack,
            e.defense,
          ),
        );
      }
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
            x + (i === 0 ? 0 : (random(this) - 0.5) * 150),
            y + (i === 0 ? 0 : (random(this) - 0.5) * 150),
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
      critical: c.critical ?? 0,
      evasion: c.evasion ?? 0,
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
      hurtUntil: 0,
      shotAt: -1,
    };
  }
  get allies() {
    return this.units.filter((u) => u.side === "ally" && !u.turretUntil);
  }
  get center() {
    return { ...this.anchor };
  }

  skillFor(u: Unit) {
    const definition =
      this.pack.characters.find((c) => c.id === u.def) ??
      this.pack.enemies.find((e) => e.id === u.def);
    if (!u.skillOverride && !definition?.skill) return undefined;
    const skill = this.pack.skills.find(
      (s) => s.id === (u.skillOverride ?? definition?.skill),
    );
    const level = Math.max(1, Math.min(10, u.skillLevel ?? 1));
    const override = level > 1 ? skill?.levels?.[level - 2] : undefined;
    return skill && override ? { ...skill, ...override } : skill;
  }

  patternFor(u: Unit): Pattern {
    const enemy = this.pack.enemies.find((e) => e.id === u.def);
    if (enemy?.boss && u.hp / u.maxHp < enemy.phaseAt)
      return enemy.phasePattern;
    return (
      this.mechanics.active(u).find((s) => s.stat === "attackPattern")
        ?.pattern ??
      enemy?.pattern ??
      this.pack.characters.find((c) => c.id === u.def)?.pattern ??
      "aim"
    );
  }
  volleyFor(u: Unit) {
    const definition =
      this.pack.enemies.find((e) => e.id === u.def) ??
      this.pack.characters.find((c) => c.id === u.def);
    const pattern = this.patternFor(u);
    const count = definition?.volleyCount ?? defaultVolleyCount(pattern);
    return {
      pattern,
      count,
      speed: definition?.projectileSpeed ?? 520,
      spread: definition?.volleySpread ?? 0.22,
    };
  }
  cast(id: string) {
    const u = this.units.find((v) => v.id === id),
      s = u && this.skillFor(u);
    if (
      !u ||
      !s ||
      u.hp <= 0 ||
      u.skillCooldown > 0 ||
      this.ended ||
      this.mechanics.frozen(u) ||
      u.turretUntil
    )
      return false;
    if (s.effect !== "program")
      this.mechanics.casts[u.id] = (this.mechanics.casts[u.id] ?? 0) + 1;
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
      skillId: s.id,
      sourceDefinition: u.def,
    });
    if (s.effect === "program") this.mechanics.cast(u, s.actions!, s.id);
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
          owner: u.id,
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
        summonOwner: u.id,
        summonKind: "turret",
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
    if (!Number.isFinite(dt) || dt <= 0 || dt > 0.25)
      throw Error("戰鬥步進必須為 0 < dt ≤ 0.25 秒");
    if (this.ended) return;
    this.time += dt;
    const leaderFrozen =
      this.allies[0] && this.mechanics.frozen(this.allies[0]);
    const speed = leaderFrozen
      ? 0
      : Math.min(
          ...this.allies
            .filter((u) => u.hp > 0 && !this.mechanics.frozen(u))
            .map((u) => u.speed * this.mechanics.stat(u, "moveSpeed")),
          this.pack.rules.travelSpeed,
        );
    this.fleet.advance(this.destination, speed, dt);
    if (!this.laboratory && this.save.encounter?.kind !== "patrol") {
      const planet = this.pack.planets.find((p) => p.id === this.planetId)!;
      this.outsideSeconds =
        Math.hypot(this.anchor.x - planet.x, this.anchor.y - planet.y) >
        planet.leashRadius
          ? this.outsideSeconds + dt
          : 0;
      if (this.outsideSeconds >= planet.resetSeconds) {
        this.reset = true;
        this.ended = true;
        this.victory = false;
        return;
      }
    }
    this.mechanics.step(dt);
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
      if (this.mechanics.frozen(u)) {
        if (u.side === "ally" && !u.turretUntil)
          this.fleet.positions.set(u.id, { x: u.x, y: u.y });
        continue;
      }
      u.cooldown -=
        dt *
        (u.buff === "accelerate" ? u.power : 1) *
        this.mechanics.stat(u, "attackSpeed");
      if (this.time >= this.mechanics.stoppedUntil)
        u.skillCooldown = Math.max(0, u.skillCooldown - dt);
      if ((this.autoSkills || u.side === "enemy") && !u.turretUntil)
        this.cast(u.id);
      const foes = this.units
        .filter(
          (v) =>
            v.side !== u.side &&
            v.hp > 0 &&
            !this.mechanics.has(v, "invisible"),
        )
        .sort(
          (a, b) =>
            Math.hypot(a.x - u.x, a.y - u.y) - Math.hypot(b.x - u.x, b.y - u.y),
        );
      const priority = foes.find((v) => v.id === this.target);
      const taunt = this.mechanics.active(u).find((s) => s.stat === "taunt");
      let t =
        (taunt && foes.find((v) => v.id === taunt.source)) ||
        (priority && u.side === "ally" ? priority : foes[0]);
      const decoy = this.mechanics.decoy(
        u,
        this.pack.enemies.find((e) => e.id === u.def)?.pattern ?? "aim",
      );
      if (decoy) t = decoy;
      let dest = this.destination;
      let enemySpeed = u.speed * this.mechanics.stat(u, "moveSpeed");
      if (u.side === "ally" && !u.turretUntil) {
        const pos = this.fleet.positions.get(u.id)!;
        u.x = pos.x;
        u.y = pos.y;
        dest = { x: u.x, y: u.y };
      }
      if (u.side === "enemy" && t) {
        const e = this.pack.enemies.find((e) => e.id === u.def)!;
        const distance = Math.hypot(u.x - t.x, u.y - t.y);
        if (e.orbitSpeed > 0 && distance <= u.range * 0.9) {
          enemySpeed =
            Math.min(u.speed, e.strafeSpeed) *
            this.mechanics.stat(u, "moveSpeed");
          const direction = this.units.indexOf(u) % 2 ? 1 : -1;
          const a =
            Math.atan2(u.y - t.y, u.x - t.x) +
            e.orbitSpeed *
              Math.cos(this.time * 0.8 + this.units.indexOf(u) * 1.6) *
              dt *
              direction;
          const radius = Math.min(distance, u.range * 0.65);
          dest = {
            x: t.x + Math.cos(a) * radius,
            y: t.y + Math.sin(a) * radius,
          };
        } else dest = { x: t.x, y: t.y };
      }
      const d = Math.hypot(dest.x - u.x, dest.y - u.y),
        move =
          u.side === "ally"
            ? !u.turretUntil && d > 0.05
            : t &&
              d >
                (this.pack.enemies.find((e) => e.id === u.def)!.orbitSpeed > 0
                  ? 0.05
                  : u.range * 0.65);
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
              : enemySpeed * dt,
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
              : enemySpeed * dt,
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
        u.shotAt = this.time;
        const volley = this.volleyFor(u);
        this.mechanics.fire(
          u,
          t,
          volley.pattern,
          volley.count,
          undefined,
          volley.speed,
          volley.spread,
        );
      }
    }
    this.mechanics.bullets(dt);
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
