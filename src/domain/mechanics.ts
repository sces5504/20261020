import { actionSchema } from "../content/mechanics";
import type { Action, Modifier, Pattern } from "../content/mechanics";
import type { Combat, Unit, Bullet } from "./combat";
import { damage, random } from "./model";
export type Status = Modifier & {
  key: string;
  source: string;
  until: number;
  nextTick: number;
};
export type Field = {
  id: number;
  owner: string;
  side: Unit["side"];
  x: number;
  y: number;
  angle: number;
  color: string;
  until: number;
  nextTick: number;
  action: Action;
  target?: string;
};
const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);
const angular = (a: number, b: number) =>
  Math.atan2(Math.sin(a - b), Math.cos(a - b));
export class Mechanics {
  statuses = new Map<string, Status[]>();
  fields: Field[] = [];
  pending: {
    at: number;
    owner: string;
    action: Action;
    key: string;
    target?: string;
  }[] = [];
  stoppedUntil = 0;
  stoppedSide: Unit["side"] = "enemy";
  damageDealt: Record<string, number> = {};
  casts: Record<string, number> = {};
  storedDamage = new Map<string, number>();
  constructor(readonly c: Combat) {}
  active(u: Unit) {
    return (this.statuses.get(u.id) ?? []).filter((s) => s.until > this.c.time);
  }
  has(u: Unit, stat: Modifier["stat"]) {
    return this.active(u).some((s) => s.stat === stat);
  }
  stat(u: Unit, stat: Modifier["stat"], base = 1) {
    return this.active(u)
      .filter((s) => s.stat === stat)
      .reduce(
        (n, s) =>
          s.mode === "set"
            ? s.value
            : s.mode === "add"
              ? n + s.value
              : n * s.value,
        base,
      );
  }
  nullifies(u: Unit, kind: "piercing" | "splash") {
    return this.active(u).some((s) => s.nullify.includes(kind));
  }
  decoy(u: Unit, kind: string) {
    const category =
      kind === "aim" || kind === "fan" || kind === "ring" ? "normal" : kind;
    return this.c.units.find(
      (v) =>
        v.hp > 0 &&
        v.side !== u.side &&
        this.active(v).some(
          (s) =>
            s.stat === "decoy" &&
            s.categories.includes(category as Modifier["categories"][number]),
        ),
    );
  }
  immune(u: Unit, kind: Modifier["immune"][number]) {
    return this.active(u).some((s) => s.immune.includes(kind));
  }
  frozen(u: Unit) {
    return (
      this.has(u, "stun") ||
      (this.c.time < this.stoppedUntil && u.side === this.stoppedSide)
    );
  }
  add(u: Unit, m: Modifier, source: Unit, key: string) {
    if (
      (m.stat === "stun" ||
        m.stat === "corrosion" ||
        m.stat === "blaze" ||
        m.stat === "taunt") &&
      this.immune(u, m.stat)
    )
      return;
    const list = this.active(u).filter(
      (s) => s.key !== key || s.stat !== m.stat || s.source !== source.id,
    );
    list.push({
      ...m,
      key,
      source: source.id,
      until: this.c.time + m.duration,
      nextTick: this.c.time + m.tick,
    });
    this.statuses.set(u.id, list);
  }
  targets(u: Unit, a: Action, at: { x: number; y: number } = u) {
    const pool = this.c.units.filter(
      (v) => v.hp > 0 && distance(v, at) <= a.radius,
    );
    if (a.target === "self") return [u];
    if (a.target === "allies") return pool.filter((v) => v.side === u.side);
    const foes = pool.filter(
      (v) => v.side !== u.side && !this.has(v, "invisible"),
    );
    foes.sort(
      (x, y) => distance(u, x) - distance(u, y) || x.id.localeCompare(y.id),
    );
    if (a.target === "target")
      return [foes.find((v) => v.id === this.c.target) ?? foes[0]].filter(
        (v): v is Unit => !!v,
      );
    return foes;
  }
  cast(u: Unit, actions: Action[], key: string) {
    this.casts[u.id] = (this.casts[u.id] ?? 0) + 1;
    for (const a of actions) {
      if (a.delay)
        this.pending.push({
          at: this.c.time + a.delay,
          owner: u.id,
          action: { ...a, delay: 0 },
          key,
        });
      else this.execute(u, a, key);
    }
  }
  execute(u: Unit, a: Action, key: string, locked?: string) {
    if (this.frozen(u)) {
      this.pending.push({
        at: this.c.time + 0.05,
        owner: u.id,
        action: a,
        key,
        target: locked,
      });
      return;
    }
    const targets = this.targets(u, a);
    const t = locked
      ? this.c.units.find((v) => v.id === locked && v.hp > 0)
      : targets[0];
    if (locked && !t && a.cancelOnTargetDeath) return;
    if (a.kind === "status")
      for (const v of targets)
        for (const m of a.modifiers) this.add(v, m, u, key);
    if (a.kind === "heal")
      for (const v of targets)
        v.hp = Math.min(v.maxHp, v.hp + u.attack * a.power);
    if (a.kind === "shield")
      for (const v of targets) {
        v.shield = Math.max(v.shield, u.attack * a.power);
        v.buffUntil = Math.max(v.buffUntil, this.c.time + a.duration);
      }
    if (a.kind === "dispel")
      for (const v of targets) this.statuses.delete(v.id);
    if (a.kind === "cooldown")
      for (const v of targets)
        if (!this.c.skillFor(v)?.actions?.some((a) => a.kind === "timeStop"))
          v.skillCooldown *= Math.max(0, 1 - a.power);
    if (a.kind === "timeStop") {
      this.stoppedUntil = this.c.time + a.duration;
      this.stoppedSide = u.side === "ally" ? "enemy" : "ally";
    }
    if (a.kind === "projectile") {
      const cadence = a.cadence || (a.pattern === "burst" ? a.interval : 0);
      const shot =
        a.pattern === "burst" ? { ...a, pattern: "aim" as const } : a;
      if (cadence && a.count > 1) {
        this.fire(u, t, shot.pattern, 1, { ...shot, count: 1, cadence: 0 });
        for (let i = 1; i < a.count; i++)
          this.pending.push({
            at: this.c.time + i * cadence,
            owner: u.id,
            action: { ...shot, count: 1, cadence: 0 },
            key,
            target: t?.id,
          });
      } else this.fire(u, t, shot.pattern, shot.count, shot);
    }
    if (a.kind === "zone" || a.kind === "beam")
      this.fields.push({
        id: this.c.sequence++,
        owner: u.id,
        side: u.side,
        x: a.origin === "target" && t ? t.x : u.x,
        y: a.origin === "target" && t ? t.y : u.y,
        target: t?.id,
        angle: t ? Math.atan2(t.y - u.y, t.x - u.x) : u.aim,
        color: u.color,
        until: this.c.time + a.duration,
        nextTick: this.c.time,
        action: a,
      });
    if (a.kind === "bomb") {
      const pool = [...targets];
      for (let i = 0; i < a.count && pool.length; i++) {
        const chosen = pool[Math.floor(random(this.c) * pool.length)];
        this.fields.push({
          id: this.c.sequence++,
          owner: u.id,
          side: u.side,
          x: chosen.x,
          y: chosen.y,
          angle: 0,
          color: u.color,
          until: this.c.time + a.duration,
          nextTick: this.c.time + a.duration - a.interval,
          action: { ...a, kind: "zone", target: "enemies" },
        });
      }
    }
    if (a.kind === "summon")
      for (
        let i = 0;
        i < a.count && this.c.units.filter((u) => u.hp > 0).length < 256;
        i++
      ) {
        const id = `summon-${this.c.sequence++}`;
        const summon: Unit = {
          ...u,
          id,
          name:
            a.summon === "clone"
              ? `${u.name}分身`
              : a.summon === "decoy"
                ? "誘餌"
                : a.summon === "drone"
                  ? "無人機"
                  : "砲台",
          x: u.x + 40 + i * 28,
          y: u.y - 40,
          hp: u.maxHp * a.power,
          maxHp: u.maxHp * a.power,
          attack: u.attack * a.power,
          defense: u.defense * a.power,
          speed: a.summon === "turret" || a.summon === "decoy" ? 0 : u.speed,
          shield: 0,
          buff: "",
          power: 1,
          cooldown: 0.3,
          skillCooldown: 999,
          turretUntil: this.c.time + a.duration,
          windup: 0,
          summonOwner: u.id,
          summonKind: a.summon,
          sprite: a.summon === "clone" ? u.sprite : "",
        };
        if (a.summon === "decoy") summon.attack = 0;
        this.c.units.push(summon);
        for (const m of a.modifiers) this.add(summon, m, u, key);
      }
    if (a.kind === "dash") {
      const angle = t ? Math.atan2(t.y - u.y, t.x - u.x) : u.aim;
      const x = u.x + Math.cos(angle) * a.radius,
        y = u.y + Math.sin(angle) * a.radius;
      for (const v of this.c.units.filter((v) => v.side !== u.side && v.hp > 0))
        if (segmentDistance(u.x, u.y, x, y, v.x, v.y) < a.width)
          this.hit(u, v, u.attack * a.power, "melee", a.modifiers);
      const r = this.c.pack.regions.find((r) => r.id === this.c.save.region)!;
      u.x = Math.max(20, Math.min(r.width - 20, x));
      u.y = Math.max(20, Math.min(r.height - 20, y));
      if (u.side === "ally" && !u.turretUntil) {
        this.c.fleet.positions.set(u.id, { x: u.x, y: u.y });
        if (this.c.allies[0] === u) {
          this.c.anchor.x = u.x;
          this.c.anchor.y = u.y;
          this.c.destination = { x: u.x, y: u.y };
        }
      }
    }
    if (a.kind === "detonate") {
      const stored = this.storedDamage.get(u.id) ?? 0;
      this.storedDamage.delete(u.id);
      for (const v of targets)
        this.hit(u, v, u.attack * a.power + stored, "splash", a.modifiers);
      this.statuses.set(
        u.id,
        this.active(u).filter((s) => s.stat !== "charge"),
      );
    }
  }
  fire(
    u: Unit,
    t: Unit | undefined,
    pattern: Pattern,
    count: number,
    action?: Action,
    speed = 520,
  ) {
    if (this.c.bullets.length >= 3000) return;
    t = this.decoy(u, pattern) ?? t;
    const base = t ? Math.atan2(t.y - u.y, t.x - u.x) : u.aim;
    u.aim = base;
    if (pattern === "laser") {
      const a =
        action ??
        actionSchema.parse({
          kind: "beam",
          target: "enemies",
          radius: u.range,
          duration: 0.65,
          power: 1,
          interval: 0.2,
          width: 24,
          follow: true,
        });
      this.fields.push({
        id: this.c.sequence++,
        owner: u.id,
        side: u.side,
        x: u.x,
        y: u.y,
        angle: base,
        color: u.color,
        until: this.c.time + a.duration,
        nextTick: this.c.time,
        action: { ...a, kind: "beam" },
      });
      return;
    }
    for (let i = 0; i < count; i++) {
      const a =
        pattern === "ring"
          ? (i * Math.PI * 2) / count + this.c.time * 0.2
          : pattern === "spiral"
            ? this.c.time * 2 + (i * Math.PI * 2) / count
            : pattern === "cross"
              ? base + (i * Math.PI) / 2
              : base +
                (i - (count - 1) / 2) *
                  (action?.spread ?? (pattern === "shotgun" ? 0.12 : 0.22));
      const velocity =
        (action?.speed ?? speed) * this.stat(u, "projectileSpeed");
      const candidates = this.c.units.filter(
        (v) => v.side !== u.side && v.hp > 0,
      );
      const chosen =
        action?.targeting === "spread"
          ? candidates[i % Math.max(1, candidates.length)]
          : action?.targeting === "random"
            ? candidates[Math.floor(random(this.c) * candidates.length)]
            : t;
      this.c.bullets.push({
        action,
        chain: action?.chain ?? 0,
        id: this.c.sequence++,
        side: u.side,
        x: u.x,
        y: u.y,
        vx: Math.cos(a) * velocity,
        vy: Math.sin(a) * velocity,
        attack:
          u.attack *
          this.stat(u, "attack") *
          (u.buff === "weaken" ? u.power : 1) *
          (action?.power ?? 1),
        life: action?.duration ?? 5,
        color: u.side === "ally" ? u.color : "#ff8e7e",
        owner: u.id,
        pattern,
        target: chosen?.id,
        age: 0,
        angle: a,
        speed: velocity,
        pierce: action?.pierce ?? (pattern === "piercing" ? 8 : 0),
        splash: action?.splash ?? (pattern === "splash" ? 100 : 0),
        modifiers: action?.modifiers ?? [],
        hitIds: [],
        width: action?.width ?? 5,
        pull: action?.pull ?? 0,
      });
    }
  }
  hit(
    source: Unit | undefined,
    u: Unit,
    attack: number,
    kind: string,
    mods: Modifier[] = [],
    bypass = false,
    incoming?: { x: number; y: number },
  ) {
    if (
      u.hp <= 0 ||
      this.has(u, "invisible") ||
      this.has(u, "invincible") ||
      this.immune(u, kind as Modifier["immune"][number])
    )
      return 0;
    let defense =
      u.defense *
      this.stat(u, "defense") *
      (u.buff === "fortify" ? u.power : 1);
    if (bypass || (source && this.stat(source, "penetration") === 0))
      defense = 0;
    else if (source) defense *= this.stat(source, "penetration");
    const critical = source
      ? Math.min(
          1,
          this.stat(
            source,
            "critical",
            this.c.pack.characters.find((c) => c.id === source.def)?.critical ??
              0,
          ),
        )
      : 0;
    const evade = Math.min(
      0.95,
      this.stat(
        u,
        "evasion",
        this.c.pack.characters.find((c) => c.id === u.def)?.evasion ?? 0,
      ),
    );
    let hit = damage(
      Math.min(30000, attack),
      Math.min(30000, defense),
      this.c.pack.rules.defenseK,
      random(this.c) < critical,
      random(this.c) < evade,
    );
    hit = Math.max(0, Math.round(hit * this.stat(u, "damageTaken")));
    for (const s of this.active(u).filter((s) => s.stat === "directional"))
      if (
        (incoming || source) &&
        Math.abs(
          angular(
            Math.atan2(
              (incoming ?? source!).y - u.y,
              (incoming ?? source!).x - u.x,
            ),
            u.aim,
          ),
        ) <=
          Math.PI / 2
      )
        hit = Math.round(hit * s.value);
    const redirect = this.active(u).find((s) => s.stat === "redirect"),
      protector =
        redirect &&
        this.c.units.find(
          (v) => v.id === redirect.source && v.hp > 0 && v.id !== u.id,
        );
    if (protector && redirect) {
      const part = Math.min(hit, Math.round(hit * redirect.value));
      protector.hp = Math.max(0, protector.hp - part);
      hit -= part;
    }
    const absorption = this.active(u).find((s) => s.stat === "absorb");
    if (absorption) {
      u.shield = Math.min(u.maxHp, u.shield + hit * absorption.value);
      hit = 0;
    }
    const absorb = Math.min(u.shield, hit);
    u.shield -= absorb;
    hit -= absorb;
    const dealt = Math.min(u.hp, hit);
    u.hp = Math.max(0, u.hp - hit);
    u.hurtUntil = this.c.time + 0.2;
    if (u.side === "ally" && dealt > 0) this.c.hitsReceived++;
    if (source)
      this.damageDealt[source.id] = (this.damageDealt[source.id] ?? 0) + dealt;
    if (!u.summonOwner)
      for (const ally of this.c.units.filter(
        (v) => v.side === u.side && v.hp > 0,
      )) {
        for (const status of this.active(ally).filter(
          (s) => s.stat === "charge",
        )) {
          const caster = this.c.units.find((v) => v.id === status.source);
          if (caster)
            this.storedDamage.set(
              caster.id,
              (this.storedDamage.get(caster.id) ?? 0) + dealt * status.value,
            );
        }
      }
    for (const m of mods)
      if (source) this.add(u, m, source, `hit:${source.def}:${m.stat}`);
    this.c.flashes.push({
      x: u.x,
      y: u.y,
      radius: 20,
      color: source?.color ?? u.color,
      life: 0.2,
      label: dealt ? String(dealt) : "格擋",
      side: u.side,
    });
    return dealt;
  }
  step(dt: number) {
    const c = this.c;
    const ready = this.pending.filter((p) => p.at <= c.time);
    this.pending = this.pending.filter((p) => p.at > c.time);
    for (const p of ready) {
      const u = c.units.find((u) => u.id === p.owner && u.hp > 0);
      if (u) this.execute(u, p.action, p.key, p.target);
    }
    for (const u of c.units) {
      const list = (this.statuses.get(u.id) ?? []).filter(
        (s) => s.until > c.time - dt,
      );
      if (c.time < this.stoppedUntil)
        for (const s of list) {
          s.until += dt;
          s.nextTick += dt;
        }

      for (const s of list)
        if (
          (s.stat === "corrosion" || s.stat === "blaze") &&
          s.nextTick <= c.time &&
          u.hp > 0
        ) {
          s.nextTick += s.tick;
          const source = c.units.find((v) => v.id === s.source);
          this.hit(source, u, (source?.attack ?? 1) * s.value, s.stat);
        }
      this.statuses.set(u.id, list);
      if (u.summonOwner && u.speed > 0 && u.hp > 0 && !this.frozen(u)) {
        const owner = c.units.find((v) => v.id === u.summonOwner);
        if (owner && distance(u, owner) > 80) {
          const a = Math.atan2(owner.y - u.y, owner.x - u.x);
          u.x += Math.cos(a) * u.speed * dt;
          u.y += Math.sin(a) * u.speed * dt;
        }
      }
    }
    for (const f of this.fields) {
      const owner = c.units.find((u) => u.id === f.owner),
        a = f.action;
      if (f.until < c.time || !owner || owner.hp <= 0) {
        f.until = 0;
        continue;
      }
      if (this.frozen(owner)) {
        f.until += dt;
        f.nextTick += dt;
        continue;
      }
      const target = c.units.find((v) => v.id === f.target && v.hp > 0);
      if (a.cancelOnTargetDeath && !target) {
        f.until = 0;
        continue;
      }
      if (a.track && target)
        f.angle = Math.atan2(target.y - f.y, target.x - f.x);
      if (a.follow) {
        f.x = owner.x;
        f.y = owner.y;
      }
      const foes = c.units.filter((v) => v.side !== f.side && v.hp > 0);
      if (a.pull)
        for (const v of foes) {
          const d = distance(v, f);
          if (d <= a.radius && d > 5 && !this.frozen(v)) {
            const move = Math.min(d - 5, a.pull * dt);
            v.x += ((f.x - v.x) / d) * move;
            v.y += ((f.y - v.y) / d) * move;
          }
        }
      if (c.time < f.nextTick) continue;
      f.nextTick += a.interval;
      const targets =
        a.kind === "beam"
          ? foes.filter(
              (v) =>
                segmentDistance(
                  f.x,
                  f.y,
                  f.x + Math.cos(f.angle) * a.radius,
                  f.y + Math.sin(f.angle) * a.radius,
                  v.x,
                  v.y,
                ) <=
                a.width / 2 + (v.boss ? 45 : 17),
            )
          : this.targets(owner, a, f);
      for (const v of targets) {
        if (a.power)
          this.hit(
            owner,
            v,
            owner.attack * this.stat(owner, "attack") * a.power,
            a.kind === "beam" ? "laser" : "splash",
            a.modifiers,
          );
        else
          for (const m of a.modifiers) this.add(v, m, owner, `field:${f.id}`);
      }
    }
    this.fields = this.fields.filter((f) => f.until > c.time);
  }
  intercept(b: Bullet, x: number, y: number) {
    for (const u of this.c.units.filter((u) => u.hp > 0 && u.side !== b.side))
      for (const s of this.active(u).filter((s) =>
        ["offset", "reflect", "deflect"].includes(s.stat),
      )) {
        const radius = s.interceptRadius || (u.boss ? 45 : 22);
        if (segmentDistance(x, y, b.x, b.y, u.x, u.y) > radius) continue;
        const id = `${u.id}:${s.key}:${s.until}`;
        if (b.barrierIds?.includes(id)) continue;
        (b.barrierIds ??= []).push(id);
        if (random(this.c) >= s.value) continue;
        const angle = Math.atan2(b.vy, b.vx),
          speed = Math.hypot(b.vx, b.vy);
        if (s.stat === "offset") b.life = 0;
        else if (s.stat === "reflect") {
          b.side = u.side;
          b.owner = u.id;
          b.target = this.c.units.find((v) => v.id === b.owner)?.id;
          b.vx = -b.vx;
          b.vy = -b.vy;
          b.hitIds = [];
        } else {
          const deflected =
            angle + ((random(this.c) < 0.5 ? -1 : 1) * Math.PI) / 2;
          b.vx = Math.cos(deflected) * speed;
          b.vy = Math.sin(deflected) * speed;
          b.target = undefined;
          b.pattern = "aim";
        }
        this.c.flashes.push({
          x: b.x,
          y: b.y,
          radius: 28,
          color: u.color,
          life: 0.25,
          label:
            s.stat === "offset"
              ? "抵消"
              : s.stat === "reflect"
                ? "反射"
                : "偏折",
          side: u.side,
        });
        return true;
      }
    return false;
  }
  splitBullet(b: Bullet) {
    if (!b.action?.splitCount || b.split) return;
    b.split = true;
    for (let i = 0; i < b.action.splitCount; i++) {
      const angle = (i * Math.PI * 2) / b.action.splitCount,
        speed = b.speed ?? 520;
      if (this.c.bullets.length >= 3000) break;
      this.c.bullets.push({
        ...b,
        id: this.c.sequence++,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        attack: b.attack * b.action.splitPower,
        pattern: "aim",
        life: 2,
        age: 0,
        hitIds: [],
        split: true,
        chain: 0,
      });
    }
  }
  bullets(dt: number) {
    const c = this.c;
    for (const b of c.bullets) {
      if (b.life <= 0) continue;
      if (c.time < this.stoppedUntil && b.side === this.stoppedSide) continue;
      b.age = (b.age ?? 0) + dt;
      if (
        b.action?.cancelOnTargetDeath &&
        !c.units.some((v) => v.id === b.target && v.hp > 0)
      ) {
        b.life = 0;
        continue;
      }
      if (b.action?.splitAfter && b.age >= b.action.splitAfter)
        this.splitBullet(b);

      const owner = c.units.find((v) => v.id === b.owner);
      let angle = Math.atan2(b.vy, b.vx),
        speed = Math.hypot(b.vx, b.vy);
      if (b.pattern === "homing") {
        let t = c.units.find((v) => v.id === b.target && v.hp > 0);
        if (!t && !b.action?.cancelOnTargetDeath) {
          t = c.units
            .filter((v) => v.side !== b.side && v.hp > 0)
            .sort((a, d) => distance(a, b) - distance(d, b))[0];
          b.target = t?.id;
        }
        if (t)
          angle += Math.max(
            -3 * dt,
            Math.min(3 * dt, angular(Math.atan2(t.y - b.y, t.x - b.x), angle)),
          );
      }
      if (b.pattern === "sine")
        angle = (b.angle ?? angle) + Math.sin(b.age * 7) * 0.45;
      if (b.pattern === "accelerating")
        speed = Math.min(1800, speed + dt * 200);
      if (b.pattern === "mine") speed = b.age < 1 ? 0 : (b.speed ?? 520);
      b.vx = Math.cos(angle) * speed;
      b.vy = Math.sin(angle) * speed;
      const x = b.x,
        y = b.y;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (this.intercept(b, x, y)) continue;
      const contacts = c.units
        .filter(
          (u) =>
            u.hp > 0 &&
            u.side !== b.side &&
            !b.hitIds?.includes(u.id) &&
            segmentDistance(x, y, b.x, b.y, u.x, u.y) <
              (u.boss ? 45 : 17) * this.stat(u, "scale") + (b.width ?? 0) / 2,
        )
        .sort((a, d) => distance(a, { x, y }) - distance(d, { x, y }));
      for (const u of contacts) {
        if (b.life <= 0) break;
        if ((b.nextHitAt ?? 0) > c.time) continue;
        this.hit(owner, u, b.attack, b.pattern ?? "aim", b.modifiers, false, {
          x,
          y,
        });
        if (b.pull && owner) {
          const d = distance(u, owner);
          if (d > 1) {
            const m = Math.min(d, b.pull);
            u.x += ((owner.x - u.x) / d) * m;
            u.y += ((owner.y - u.y) / d) * m;
          }
        }
        if (b.splash && !this.nullifies(u, "splash"))
          for (const v of c.units.filter(
            (v) =>
              v.hp > 0 &&
              v.side !== b.side &&
              v.id !== u.id &&
              distance(v, u) <= b.splash!,
          ))
            this.hit(
              owner,
              v,
              b.attack * (b.action?.splashPower ?? 1),
              "splash",
              b.modifiers,
            );
        (b.hitIds ??= []).push(u.id);
        if (b.action?.knockback && owner) {
          const a = Math.atan2(u.y - owner.y, u.x - owner.x);
          u.x += Math.cos(a) * b.action.knockback;
          u.y += Math.sin(a) * b.action.knockback;
        }
        this.splitBullet(b);
        if (b.chain) {
          b.chain--;
          b.hitIds = [];
          b.nextHitAt = c.time + 0.15;
          b.vx = -b.vx;
          b.vy = -b.vy;
          b.x -= Math.cos(angle) * 40;
          b.y -= Math.sin(angle) * 40;
          break;
        }
        if (b.pierce && !this.nullifies(u, "piercing")) b.pierce--;
        else b.life = 0;
      }
    }
    c.bullets = c.bullets.filter((b) => b.life > 0);
  }
}
export function segmentDistance(
  x: number,
  y: number,
  xx: number,
  yy: number,
  px: number,
  py: number,
) {
  const dx = xx - x,
    dy = yy - y,
    den = dx * dx + dy * dy,
    q = den
      ? Math.max(0, Math.min(1, ((px - x) * dx + (py - y) * dy) / den))
      : 0;
  return Math.hypot(x + q * dx - px, y + q * dy - py);
}
