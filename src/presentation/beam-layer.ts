import Phaser from "phaser";
import type { Combat } from "../domain/combat";
import type { Field } from "../domain/mechanics";
import { beamArt } from "./beam-art";

/** Soft textured emission. Combat still owns every field, hit and lifetime. */
export class BeamLayer {
  private combat?: Combat;
  private fields = new Map<
    number,
    {
      body: Phaser.GameObjects.Image;
      haze: Phaser.GameObjects.Image;
      source: Phaser.GameObjects.Image;
    }
  >();
  private charges = new Map<string, Phaser.GameObjects.Image>();
  private impacts: Phaser.GameObjects.Image[] = [];
  constructor(private scene: Phaser.Scene) {
    if (!scene.textures.exists(beamArt.glowKey)) {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 128;
      const ctx = canvas.getContext("2d")!;
      const glow = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      glow.addColorStop(0, "rgba(255,255,255,.95)");
      glow.addColorStop(0.13, "rgba(255,255,255,.65)");
      glow.addColorStop(0.38, "rgba(255,255,255,.17)");
      glow.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, 128, 128);
      scene.textures.addCanvas(beamArt.glowKey, canvas);
    }
    if (!scene.textures.exists(beamArt.key)) {
      const image = new Image();
      image.onload = () => {
        if (!scene.sys?.isActive() || scene.textures.exists(beamArt.key))
          return;
        const canvas = document.createElement("canvas");
        canvas.width = 1536;
        canvas.height = 512;
        const ctx = canvas.getContext("2d")!;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(image, 0, 0, 1536, 512);
        scene.textures.addCanvas(beamArt.key, canvas);
      };
      image.src = beamArt.url;
    }
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.clear());
  }
  private image(key: string, depth = 1) {
    return this.scene.add
      .image(0, 0, key)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(depth);
  }
  private clear() {
    for (const v of this.fields.values()) {
      v.body.destroy();
      v.haze.destroy();
      v.source.destroy();
    }
    this.fields.clear();
    for (const v of this.charges.values()) v.destroy();
    this.charges.clear();
    for (const v of this.impacts) v.destroy();
    this.impacts = [];
  }
  draw(combat: Combat | undefined, reduced: boolean) {
    if (this.combat !== combat) {
      this.clear();
      this.combat = combat;
    }
    if (!combat) return;
    const beams = combat.mechanics.fields.filter(
      (f) => f.action.kind === "beam",
    );
    const active = new Set(beams.map((f) => f.id)),
      t = combat.time;
    for (const [id, v] of this.fields)
      if (!active.has(id)) {
        v.body.destroy();
        v.haze.destroy();
        v.source.destroy();
        this.fields.delete(id);
      }
    for (const f of beams) {
      if (!this.scene.textures.exists(beamArt.key)) continue;
      let v = this.fields.get(f.id);
      if (!v) {
        v = {
          haze: this.image(beamArt.key),
          body: this.image(beamArt.key),
          source: this.image(beamArt.glowKey, 3),
        };
        v.body.setOrigin(0, 0.5);
        v.haze.setOrigin(0, 0.5);
        this.fields.set(f.id, v);
      }
      const c =
        f.side === "enemy"
          ? 0xff92a6
          : Phaser.Display.Color.HexStringToColor(f.color).color;
      const reach = f.reach ?? f.action.radius,
        start = Math.min(16, reach * 0.1);
      const age = t - (f.born ?? t - 0.2),
        tail = Math.min(1, Math.max(0.25, (f.until - t) / 0.15));
      const pulse = reduced
        ? 0.78
        : 0.76 + Math.sin(age * 11) * 0.035 + Math.sin(age * 19) * 0.02;
      const x = f.x + Math.cos(f.angle) * start,
        y = f.y + Math.sin(f.angle) * start;
      v.body
        .setPosition(x, y)
        .setRotation(f.angle)
        .setDisplaySize(Math.max(1, reach - start), f.action.width * 0.7)
        .setTint(c)
        .setAlpha(pulse * tail);
      v.haze
        .setVisible(!reduced)
        .setPosition(x, y)
        .setRotation(f.angle)
        .setDisplaySize(
          Math.max(1, reach - start),
          f.action.width * (1.1 + Math.sin(age * 4) * 0.025),
        )
        .setTint(c)
        .setAlpha(0.14 * tail);
      v.source
        .setVisible(!reduced)
        .setPosition(x, y)
        .setTint(c)
        .setDisplaySize(80, 80)
        .setAlpha(0.65 * tail);
    }
    // Charging comes from pending simulation actions, not a second gameplay timer.
    const pendingOwners = new Set<string>();
    if (!reduced)
      for (const p of combat.mechanics.pending) {
        if (p.action.kind !== "beam" || p.at <= t || p.at - t > 0.4) continue;
        const owner = combat.units.find((u) => u.id === p.owner && u.hp > 0);
        if (!owner) continue;
        pendingOwners.add(owner.id);
        let glow = this.charges.get(owner.id);
        if (!glow) {
          glow = this.image(beamArt.glowKey, 3);
          this.charges.set(owner.id, glow);
        }
        const phase = 1 - (p.at - t) / 0.4;
        glow
          .setPosition(
            owner.x + Math.cos(owner.aim) * 16,
            owner.y + Math.sin(owner.aim) * 16,
          )
          .setTint(owner.side === "enemy" ? 0xff92a6 : 0xb3f5ff)
          .setDisplaySize(30 + phase * 40, 30 + phase * 40)
          .setAlpha(0.3 + phase * 0.4);
      }
    for (const [id, glow] of this.charges)
      if (!pendingOwners.has(id)) {
        glow.destroy();
        this.charges.delete(id);
      }
    // Actual hit flashes inside an active beam receive a short soft contact flare.
    this.impacts.forEach((v) => v.setVisible(false));
    let index = 0;
    if (!reduced)
      for (const hit of combat.flashes.slice(-16)) {
        if (!hit.side || hit.life <= 0) continue;
        const field = beams.find(
          (f) => hit.side !== f.side && this.contains(f, hit.x, hit.y),
        );
        if (!field) continue;
        let glow = this.impacts[index++];
        if (!glow) {
          glow = this.image(beamArt.glowKey, 4);
          this.impacts.push(glow);
        }
        glow
          .setVisible(true)
          .setPosition(hit.x, hit.y)
          .setDisplaySize(64, 64)
          .setTint(field.side === "enemy" ? 0xff92a6 : 0xcefbff)
          .setAlpha(Math.min(0.8, hit.life * 4));
      }
  }
  private contains(f: Field, x: number, y: number) {
    const dx = x - f.x,
      dy = y - f.y,
      c = Math.cos(f.angle),
      s = Math.sin(f.angle);
    const along = dx * c + dy * s,
      across = -dx * s + dy * c;
    return (
      along >= 0 &&
      along <= (f.reach ?? f.action.radius) &&
      Math.abs(across) <= f.action.width / 2
    );
  }
}
