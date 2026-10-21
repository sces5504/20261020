import type { Pack } from "../content/schema";
import { snapshot } from "../content/schema";
import { newSave, stats, type Save } from "../domain/model";
import { apply, settle, type Command } from "../domain/economy";
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
  safeUntil = 0;
  movement = { x: 0, y: 0 };
  error = "";
  notice = "";
  busy = false;
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
    this.voyageSeconds = s.voyageSeconds;
    if (s.encounter) this.combat = new Combat(this.pack, s, s.encounter.planet);
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
  private enqueue(fn: () => Promise<void>) {
    this.serial = this.serial
      .then(async () => {
        this.busy = true;
        try {
          await fn();
          this.error = "";
        } catch (e) {
          this.error = e instanceof Error ? e.message : String(e);
          throw e;
        } finally {
          this.busy = false;
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
      const s = apply(this.pack, base, c, Date.now(), crypto.randomUUID());
      s.contentHash = this.contentHash;
      s.contentVersion = this.pack.version;
      await commit(this.key, s, this.storageRevision);
      this.save = s;
      this.storageRevision = s.revision;
      if (c.type === "begin" || c.type === "patrol") {
        this.combat = new Combat(
          this.pack,
          s,
          c.type === "begin" ? c.planet : c.id,
        );
        this.combat.autoSkills = this.autoSkills;
        this.x = s.x;
        this.y = s.y;
      }
      if (c.type === "result") {
        const patrol = base.encounter?.kind === "patrol";
        this.events.push(c.victory ? "victory" : "defeat");
        this.report = {
          title: c.victory
            ? patrol
              ? "航路已肅清"
              : "航跡已開拓"
            : "已撤離交戰區",
          message: c.victory
            ? patrol
              ? "巡邏敵艦已擊退，取得補給。繼續探索，尋找新的星球訊號。"
              : "全波次敵群已排除。啟動星球，建立新的生產據點。"
            : "角色生命已保存。可在編隊中整補，完成後再挑戰。",
          victory: c.victory,
          planet: patrol ? "" : c.planet,
        };
        this.safeUntil = this.voyageSeconds + 8;
        this.combat = null;
        this.destination = { x: this.x, y: this.y };
        this.notice = c.victory
          ? "星球已解放 · 航跡更新"
          : "已撤回安全航線，請整補後再出發。";
      }
      this.dirty = true;
    });
  }
  tickEconomy() {
    return this.enqueue(async () => {
      const s = structuredClone(this.save);
      s.contentHash = this.contentHash;
      s.contentVersion = this.pack.version;
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
      this.dirty = true;
    });
  }
  checkpoint() {
    return this.command({
      type: "checkpoint",
      x: this.x,
      y: this.y,
      discovered: [...this.discovered],
      voyageSeconds: this.voyageSeconds,
    });
  }
  step(dt: number) {
    if (this.pause.size || this.busy || this.error) return;
    if (this.movement.x || this.movement.y) {
      const n = Math.hypot(this.movement.x, this.movement.y);
      this.move(
        this.x + (this.movement.x / n) * 190 * dt,
        this.y + (this.movement.y / n) * 190 * dt,
      );
    }
    if (this.combat) {
      this.combat.step(dt);
      const center = this.combat.center;
      if (center.x || center.y) {
        this.x = center.x;
        this.y = center.y;
      }
      if (this.combat.ended && !this.encounterPending) {
        const c = this.combat;
        this.encounterPending = true;
        this.command({
          type: "result",
          planet: c.planetId,
          victory: c.victory,
          hp: c.result(),
          receipt: `encounter-${this.save.encounter?.seed}`,
        }).finally(() => (this.encounterPending = false));
      }
    } else {
      const d = Math.hypot(
        this.destination.x - this.x,
        this.destination.y - this.y,
      );
      if (d > 2) {
        this.x += ((this.destination.x - this.x) / d) * Math.min(d, 180 * dt);
        this.y += ((this.destination.y - this.y) / d) * Math.min(d, 180 * dt);
      }
    }
    this.voyageSeconds += dt;
    const r = this.pack.regions.find((r) => r.id === this.save.region)!;
    for (const p of this.pack.planets.filter((p) => p.region === r.id)) {
      if (
        !this.discovered.has(p.id) &&
        Math.hypot(p.x - this.x, p.y - this.y) < r.discoveryRadius
      ) {
        this.discovered.add(p.id);
        this.notice = `發現星球 · ${p.name}`;
        this.events.push("arrival");
        this.dirty = true;
      }
    }
    if (
      !this.combat &&
      !this.encounterPending &&
      this.voyageSeconds >= this.safeUntil
    ) {
      const patrol = r.patrols.find(
        (v) =>
          Math.hypot(v.x - this.x, v.y - this.y) < 130 &&
          (this.save.patrolCooldowns[v.id] ?? 0) <= this.voyageSeconds,
      );
      if (patrol) {
        this.encounterPending = true;
        this.command({ type: "patrol", id: patrol.id }).finally(
          () => (this.encounterPending = false),
        );
      }
    }
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
      s.revision = this.save.revision + 1;
      await commit(this.key, s, this.storageRevision);
      this.save = s;
      this.storageRevision = s.revision;
      this.x = s.x;
      this.y = s.y;
      this.destination = { x: s.x, y: s.y };
      this.discovered = new Set(s.discovered);
      this.voyageSeconds = s.voyageSeconds;
      this.combat = s.encounter
        ? new Combat(this.pack, s, s.encounter.planet)
        : null;
      this.dirty = true;
    });
  }
}
