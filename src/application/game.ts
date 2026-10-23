import type { Pack } from "../content/schema";
import { snapshot } from "../content/schema";
import { newSave, stats, type Save } from "../domain/model";
import { apply, settle, type Command } from "../domain/economy";
import { patrolPosition } from "../domain/navigation";
import {
  nodeCleared,
  nodeUnlocked,
  nodeAvailability,
  nodeVisible,
} from "../domain/world";
import { FleetMotion } from "../domain/formation";
import { Combat } from "../domain/combat";
import { fingerprint } from "../content/fingerprint";
import { compatibilityPlan } from "../domain/migration";
import { read, commit, checkSave } from "../platform/storage";
export class Game {
  save: Save;
  combat: Combat | null = null;
  pack: Pack;
  pause = new Set<string>();
  x: number;
  y: number;
  destination: { x: number; y: number };
  viewMode: "explore" | "map" =
    localStorage.getItem("stella:view") === "map" ? "map" : "explore";
  discovered = new Set<string>();
  voyageSeconds = 0;
  encounterPending = false;
  safeUntil = 0; // legacy only; encounter cooldowns are per target
  fleet: FleetMotion;
  disengagedPlanets = new Set<string>();
  movement = { x: 0, y: 0 };
  error = "";
  notice = "";
  busy = false;
  private simulationLocked = false;
  dirty = false;
  autoSkills = false;
  lowEffects = localStorage.getItem("stella:effects") === "low";
  contentHash = "";

  report: {
    title: string;
    message: string;
    victory: boolean;
    planet: string;
  } | null = null;

  storyCamera: {
    x: number;
    y: number;
    zoom: number;
    seconds: number;
    startedAt: number;
    fromX: number;
    fromY: number;
    fromZoom: number;
  } | null = null;
  events: string[] = [];
  private serial = Promise.resolve();
  private storageRevision: number | null = null;
  constructor(
    p: Pack,
    readonly key: string,
    s: Save,
  ) {
    this.pack = snapshot(p);
    this.save = s;
    this.x = s.x;
    this.y = s.y;
    this.destination = { x: s.x, y: s.y };
    this.discovered = new Set(s.discovered);
    this.disengagedPlanets = new Set(s.disengagedPlanets ?? []);
    this.voyageSeconds = s.voyageSeconds;
    this.fleet = new FleetMotion(
      s.x,
      s.y,
      s.heading ?? 0,
      s.team,
      p.rules.formationSpacing,
    );
    if (s.encounter) {
      this.combat = new Combat(this.pack, s, s.encounter.planet, this.fleet);
      this.viewMode = "explore";
    }
  }
  static async load(p: Pack, test = false) {
    const key = test ? "save:test" : "save:main",
      old = await read<Save>(key);
    const s = old
      ? checkSave(old, p)
      : newSave(p, Date.now(), test ? "test" : "voyager");
    if (old && compatibilityPlan(old, p).changes.length)
      throw Error("內容更新需要確認相容性修復，請先查看下方預覽。");
    for (const col of Object.values(s.colonies)) col.lost = false;
    const g = new Game(p, key, s);
    g.storageRevision = old?.revision ?? null;
    g.contentHash = await fingerprint(p);
    if (old && s.contentHash !== g.contentHash) {
      g.notice = "內容版本已更新；舊進度已保留，戰鬥使用目前內容快照。";
      g.save.migrationHistory.push(`content:${g.contentHash}`);
    }

    await g.tickEconomy();
    return g;
  }
  private enqueue(fn: () => Promise<void>, blocksSimulation = true) {
    this.serial = this.serial
      .then(async () => {
        this.busy = true;
        this.simulationLocked = blocksSimulation;
        try {
          await fn();
          this.error = "";
        } catch (e) {
          this.error = e instanceof Error ? e.message : String(e);
          throw e;
        } finally {
          this.busy = false;
          this.simulationLocked = false;
        }
      })
      .catch(() => {});
    return this.serial;
  }
  command(c: Command) {
    return this.enqueue(async () => {
      const base = structuredClone(this.save);
      base.discovered = [...this.discovered];
      base.voyageSeconds = this.voyageSeconds;
      base.x = this.x;
      base.y = this.y;
      base.heading = this.fleet.heading;
      base.disengagedPlanets = [...this.disengagedPlanets];
      const s = apply(this.pack, base, c, Date.now(), crypto.randomUUID());
      s.contentHash = this.contentHash;
      s.contentVersion = this.pack.version;
      await commit(this.key, s, this.storageRevision);
      this.save = s;
      this.storageRevision = s.revision;
      this.fleet.setMembers(s.team);
      this.conversionNotice(base, s);
      if (c.type === "travel") {
        this.x = s.x;
        this.y = s.y;
        this.destination = { x: s.x, y: s.y };
        this.movement = { x: 0, y: 0 };
        this.fleet = new FleetMotion(
          s.x,
          s.y,
          s.heading,
          s.team,
          this.pack.rules.formationSpacing,
        );
        this.report = null;
        this.notice = `已抵達 ${this.pack.regions.find((r) => r.id === s.region)!.name}`;
      }
      if (
        c.type === "begin" ||
        c.type === "patrol" ||
        (c.type === "story-battle" && s.encounter)
      ) {
        this.viewMode = "explore";
        if (c.type === "story-battle") {
          this.fleet = new FleetMotion(
            s.x,
            s.y,
            s.heading,
            s.team,
            this.pack.rules.formationSpacing,
          );
        }
        this.combat = new Combat(this.pack, s, s.encounter!.planet, this.fleet);
        this.combat.autoSkills = this.autoSkills;
        this.x = s.x;
        this.y = s.y;
      }
      if (c.type === "story-cue") this.pause.delete("story-cue-ready");
      if (c.type === "result") {
        const patrol = base.encounter?.kind === "patrol";
        this.events.push(c.victory ? "victory" : "defeat");
        this.report =
          (patrol && c.victory) || c.reset
            ? null
            : {
                title: c.victory ? "航跡已開拓" : "已撤離交戰區",
                message: c.victory
                  ? this.pack.planets.find((v) => v.id === c.planet)?.kind ===
                    "planet"
                    ? "星球守軍已全部清除。啟動星球，建立新的生產據點。"
                    : "遭遇已完成，獎勵與通關進度已保存；此據點不提供生產。"
                  : "角色生命已保存，可整補後再挑戰。",
                victory: c.victory,
                planet: patrol ? "" : c.planet,
              };
        this.disengagedPlanets = new Set(s.disengagedPlanets);
        this.combat = null;
        if (!(patrol && c.victory)) this.destination = { x: this.x, y: this.y };
        if (c.reset)
          this.notice =
            "已離開交戰範圍 · 守軍生命與位置已重置，重新靠近即可再戰。";
        else if (patrol && c.victory) {
          const patrol = this.pack.regions
            .find((r) => r.id === s.region)!
            .patrols.find((v) => v.id === c.planet)!;
          this.notice =
            "巡邏隊已擊破 · " +
            Object.entries(patrol.reward)
              .map(
                ([id, n]) =>
                  (this.pack.resources.find((r) => r.id === id)?.name ?? id) +
                  " +" +
                  n,
              )
              .join(" ／ ");
        } else
          this.notice = c.victory
            ? "星球已解放 · 航跡更新"
            : "已撤離交戰區，整補後可再出發。";
      }
      this.dirty = true;
    }, c.type !== "checkpoint");
  }
  tickEconomy() {
    return this.enqueue(async () => {
      const s = structuredClone(this.save);
      s.contentHash = this.contentHash;
      s.contentVersion = this.pack.version;
      const before = this.save;
      const ownedCount = s.roster.length;
      settle(this.pack, s, Date.now());
      s.revision = this.save.revision + 1;
      await commit(this.key, s, this.storageRevision);
      this.save = s;
      this.storageRevision = s.revision;
      if (s.roster.length > ownedCount) {
        this.events.push("arrival");
        this.notice = `共鳴完成 · 新增 ${s.roster.length - ownedCount} 位少女，前往編成查看。`;
      }
      this.conversionNotice(before, s);
      this.dirty = true;
    }, false);
  }
  checkpoint() {
    return this.command({
      type: "checkpoint",
      x: this.x,
      y: this.y,
      discovered: [...this.discovered],
      voyageSeconds: this.voyageSeconds,
      heading: this.fleet.heading,
    });
  }
  pendingStoryCue() {
    const combat = this.combat;
    if (!combat) return -1;
    return (combat.storyEncounter?.cues ?? []).findIndex(
      (c, i) =>
        !this.save.encounter?.cues?.includes(i) &&
        (c.at === undefined || combat.time >= c.at) &&
        (c.hpBelow === undefined ||
          (() => {
            const a = combat.units.find((u) => u.id === c.actor);
            return !!a && a.hp / a.maxHp <= c.hpBelow!;
          })()),
    );
  }
  step(dt: number) {
    if (this.pause.size || this.simulationLocked || this.error) return;
    this.fleet.setMembers(this.save.team);
    const speed = this.movementSpeed;
    if (this.movement.x || this.movement.y) {
      const n = Math.hypot(this.movement.x, this.movement.y);
      this.move(
        (this.combat?.anchor.x ?? this.x) +
          (this.movement.x / n) * (speed + 10) * dt,
        (this.combat?.anchor.y ?? this.y) +
          (this.movement.y / n) * (speed + 10) * dt,
      );
    }
    if (this.combat) {
      this.combat.step(dt);
      const center = this.combat.center;
      if (center.x || center.y) {
        this.x = center.x;
        this.y = center.y;
      }
      if (this.pendingStoryCue() >= 0) {
        this.pause.add("story-cue-ready");
        return;
      }
      if (this.combat.ended && !this.encounterPending) {
        const c = this.combat;
        this.encounterPending = true;
        this.command({
          type: "result",
          planet: c.planetId,
          victory: c.victory,
          reset: c.reset,
          hp: c.result(),
          scoreRatio: c.damageRatio,
          receipt: `encounter-${this.save.encounter?.seed}`,
        }).finally(() => (this.encounterPending = false));
      }
    } else {
      this.fleet.advance(this.destination, speed, dt);
      this.x = this.fleet.anchor.x;
      this.y = this.fleet.anchor.y;
    }
    this.voyageSeconds += dt;
    const r = this.pack.regions.find((r) => r.id === this.save.region)!;
    for (const p of this.pack.planets.filter((p) => p.region === r.id)) {
      if (
        !this.discovered.has(p.id) &&
        nodeVisible(this.save, p, this.pack, Date.now()) &&
        Math.hypot(p.x - this.x, p.y - this.y) < r.discoveryRadius
      ) {
        this.discovered.add(p.id);
        this.notice = `發現星球 · ${p.name}`;
        this.events.push("arrival");
        this.dirty = true;
      }
    }
    for (const p of this.pack.planets)
      if (Math.hypot(p.x - this.x, p.y - this.y) > p.engageRadius + 30)
        this.disengagedPlanets.delete(p.id);
    if (
      !this.combat &&
      !this.report &&
      !this.encounterPending &&
      this.save.team.some(
        (id) => (this.save.roster.find((o) => o.id === id)?.hp ?? 0) > 0,
      )
    ) {
      const contacts = [
        ...r.patrols
          .filter(
            (v) => (this.save.patrolCooldowns[v.id] ?? 0) <= this.voyageSeconds,
          )
          .map((v) => {
            const pos = patrolPosition(v, this.voyageSeconds);
            return {
              kind: "patrol" as const,
              id: v.id,
              d: Math.hypot(pos.x - this.x, pos.y - this.y),
              radius: v.detectionRadius,
            };
          }),
        ...this.pack.planets
          .filter(
            (p) =>
              p.region === r.id &&
              p.status === "active" &&
              !nodeCleared(this.save, p) &&
              p.enemies.length > 0 &&
              p.encounterPolicy === "auto" &&
              nodeAvailability(this.save, p, Date.now()).open &&
              !this.disengagedPlanets.has(p.id) &&
              nodeUnlocked(this.save, p, this.pack),
          )
          .map((p) => ({
            kind: "begin" as const,
            id: p.id,
            d: Math.hypot(p.x - this.x, p.y - this.y),
            radius: p.engageRadius,
          })),
      ]
        .filter((c) => c.d <= c.radius)
        .sort((a, b) => a.d / a.radius - b.d / b.radius);
      const contact = contacts[0];
      if (contact) {
        this.encounterPending = true;
        this.notice =
          contact.kind === "patrol"
            ? "巡邏敵艦接觸 · 進入交戰"
            : "接近星球守軍 · 進入交戰";
        this.command(
          contact.kind === "patrol"
            ? { type: "patrol", id: contact.id }
            : { type: "begin", planet: contact.id },
        ).finally(() => (this.encounterPending = false));
      }
    }
  }
  get movementSpeed() {
    if (this.combat) return this.pack.rules.travelSpeed;
    const r = this.pack.regions.find((r) => r.id === this.save.region)!;
    const threat =
      r.patrols.some((v) => {
        const pos = patrolPosition(v, this.voyageSeconds);
        return (
          (this.save.patrolCooldowns[v.id] ?? 0) <= this.voyageSeconds &&
          Math.hypot(pos.x - this.x, pos.y - this.y) < 700
        );
      }) ||
      this.pack.planets.some(
        (p) =>
          p.region === r.id &&
          !nodeCleared(this.save, p) &&
          p.enemies.length > 0 &&
          nodeUnlocked(this.save, p, this.pack) &&
          p.encounterPolicy === "auto" &&
          Math.hypot(p.x - this.x, p.y - this.y) < p.engageRadius + 250,
      );
    return threat ? this.pack.rules.travelSpeed : this.pack.rules.cruiseSpeed;
  }
  private conversionNotice(before: Save, after: Save) {
    const count = after.duplicateConversions - before.duplicateConversions;
    if (count <= 0) return;
    this.events.push("arrival");
    this.notice =
      `${count} 位滿同調重複角色已轉換 · ` +
      this.pack.resources
        .map(
          (r) =>
            `${r.name} +${Number(((after.duplicateRefunds[r.id] ?? 0) - (before.duplicateRefunds[r.id] ?? 0)).toFixed(2))}`,
        )
        .join(" ／ ");
  }
  retreat() {
    if (!this.combat) return;
    this.combat.victory = false;
    this.combat.ended = true;
  }
  move(x: number, y: number) {
    const r = this.pack.regions.find((r) => r.id === this.save.region)!;
    const pos = {
      x: Math.max(20, Math.min(r.width - 20, x)),
      y: Math.max(20, Math.min(r.height - 20, y)),
    };
    if (this.combat) this.combat.destination = pos;
    else this.destination = pos;
  }
  async replaceSave(raw: unknown) {
    await this.enqueue(async () => {
      const s = checkSave(raw, this.pack);
      for (const col of Object.values(s.colonies)) col.lost = false;
      s.revision = this.save.revision + 1;
      await commit(this.key, s, this.storageRevision, true);
      this.save = s;
      this.storageRevision = s.revision;
      this.x = s.x;
      this.y = s.y;
      this.destination = { x: s.x, y: s.y };
      this.discovered = new Set(s.discovered);
      this.voyageSeconds = s.voyageSeconds;
      this.fleet = new FleetMotion(
        s.x,
        s.y,
        s.heading ?? 0,
        s.team,
        this.pack.rules.formationSpacing,
      );
      this.disengagedPlanets = new Set(s.disengagedPlanets ?? []);
      this.combat = s.encounter
        ? new Combat(this.pack, s, s.encounter.planet, this.fleet)
        : null;
      this.dirty = true;
    });
  }
}
