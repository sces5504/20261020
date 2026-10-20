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
  raids: Record<string, number> = {};
  losses = new Set<string>();
  error = "";
  notice = "";
  busy = false;
  dirty = false;
  autoSkills = false;
  lowEffects = localStorage.getItem("stella:effects") === "low";
  contentHash = "";
  training = false;
  report: {
    title: string;
    message: string;
    victory: boolean;
    planet: string;
  } | null = null;
  raidWarned = new Set<string>();
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
    this.resetRaids();
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
  private resetRaids() {
    this.raids = Object.fromEntries(
      Object.entries(this.save.colonies).map(([id, c]) => [
        id,
        c.raidRemaining,
      ]),
    );
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
      for (const [id, t] of Object.entries(this.raids))
        if (base.colonies[id]) base.colonies[id].raidRemaining = t;
      for (const id of this.losses)
        if (base.colonies[id]) base.colonies[id].lost = true;
      const s = apply(this.pack, base, c, Date.now(), crypto.randomUUID());
      s.contentHash = this.contentHash;
      s.contentVersion = this.pack.version;
      await commit(this.key, s, this.storageRevision);
      this.save = s;
      this.storageRevision = s.revision;
      if (c.type === "repair") this.losses.delete(c.planet);
      if (c.type === "result" && c.victory) this.losses.delete(c.planet);
      if (c.type !== "checkpoint") this.resetRaids();
      if (c.type === "begin") {
        this.combat = new Combat(this.pack, s, c.planet);
        this.combat.autoSkills = this.autoSkills;
        this.x = s.x;
        this.y = s.y;
      }
      if (c.type === "result") {
        this.events.push(c.victory ? "victory" : "defeat");
        this.report = {
          title: c.victory ? "航跡已開拓" : "已撤離交戰區",
          message: c.victory
            ? "敵方訊號已排除。啟動星球，建立新的生產與防衛據點。"
            : "角色生命已保存。可在編隊中整補，完成後再挑戰。",
          victory: c.victory,
          planet: c.planet,
        };
        this.raidWarned.delete(c.planet);
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
      raids: { ...this.raids },
      losses: [...this.losses],
    });
  }
  step(dt: number) {
    if (this.pause.size || this.busy || this.error) return;
    if (this.combat) {
      this.combat.step(dt);
      const center = this.combat.center;
      if (center.x || center.y) {
        this.x = center.x;
        this.y = center.y;
      }
      if (
        this.training &&
        this.combat.time >= this.pack.rules.trainingSeconds
      ) {
        this.combat.ended = true;
        this.combat.victory = true;
      }
      if (this.combat.ended) {
        const c = this.combat;
        if (this.training) {
          const score = c.victory ? Math.max(0, 100 - c.hitsReceived * 5) : 0;
          this.training = false;
          this.combat = null;
          this.command({ type: "training", score });
          this.report = {
            title: "避彈訓練完成",
            message: `持續 ${c.time.toFixed(1)} 秒，受到 ${c.hitsReceived} 次有效命中。評分 ${score}／100，最好紀錄會保留。`,
            victory: c.victory,
            planet: "",
          };
          this.events.push(c.victory ? "victory" : "defeat");
          this.x = this.save.x;
          this.y = this.save.y;
          this.destination = { x: this.x, y: this.y };
          return;
        }

        this.command({
          type: "result",
          planet: c.planetId,
          victory: c.victory,
          hp: c.result(),
          receipt: `encounter-${this.save.encounter?.seed}`,
        });
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
    for (const [id, col] of Object.entries(this.save.colonies)) {
      if (!col.active || col.lost || this.losses.has(id)) continue;
      this.raids[id] = Math.max(0, (this.raids[id] ?? col.raidRemaining) - dt);
      if (
        this.raids[id] <= this.pack.rules.raidWarningSeconds &&
        !this.raidWarned.has(id)
      ) {
        this.raidWarned.add(id);
        this.events.push("alert");
        this.notice = `${this.pack.planets.find((v) => v.id === id)?.name} 偵測到襲擊！請在倒數結束前出擊防衛。`;
      }
      if (this.combat?.planetId === id && !this.training) continue;
      if (this.raids[id] === 0) {
        this.losses.add(id);
        this.notice = `${this.pack.planets.find((v) => v.id === id)?.name} 防線失守，生產暫停，可修復。`;
        this.checkpoint();
      }
    }
  }
  startTraining() {
    return this.enqueue(async () => {
      if (this.combat) throw Error("請先結束目前遭遇。");
      const s = structuredClone(this.save),
        p = this.pack.planets[0];
      s.x = p.x - 220;
      s.y = p.y + 170;
      s.encounter = { planet: p.id, seed: 71623 };
      for (const o of s.roster) o.hp = stats(this.pack, o).hp;
      this.combat = new Combat(this.pack, s, p.id, true);
      this.combat.autoSkills = this.autoSkills;
      this.training = true;
      this.report = null;
      this.dirty = true;
    });
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
      this.resetRaids();
      this.losses.clear();
      this.combat = s.encounter
        ? new Combat(this.pack, s, s.encounter.planet)
        : null;
      this.dirty = true;
    });
  }
}
