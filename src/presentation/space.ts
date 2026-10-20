import Phaser from "phaser";
import { planetMaterial, enemyMaterial } from "./materials";
import type { AudioMixer } from "../platform/audio";
import type { Game } from "../application/game";
export function mountSpace(
  host: HTMLElement,
  model: Game,
  onPlanet: (id: string) => void,
  audio?: AudioMixer,
) {
  class Space extends Phaser.Scene {
    ink!: Phaser.GameObjects.Graphics;
    labels: Phaser.GameObjects.Text[] = [];
    labelIndex = 0;
    selected = "";
    overview = false;
    starfield: { x: number; y: number; r: number; a: number }[] = [];
    loaded = new Set<string>();
    elapsed = 0;
    acc = 0;
    zoomFactor = 1;
    panX = 0;
    panY = 0;
    drag: { x: number; y: number; startX: number; startY: number } | null =
      null;
    pinch = 0;
    cancelTap = false;
    lastBattle = false;
    lastSequence = 0;
    lastFlashCount = 0;

    create() {
      this.ink = this.add.graphics();
      const r = model.pack.regions.find((v) => v.id === model.save.region)!;
      for (let i = 0; i < 420; i++) {
        const n = Math.sin(i * 127.1 + 77) * 43758.5453,
          frac = n - Math.floor(n),
          m = Math.sin(i * 311.7 + 27) * 17319.24;
        this.starfield.push({
          x: frac * r.width,
          y: (m - Math.floor(m)) * r.height,
          r: i % 11 === 0 ? 1.8 : 0.7,
          a: 0.15 + (i % 6) * 0.08,
        });
      }
      this.input.addPointer(1);
      this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        this.drag = {
          x: pointer.x,
          y: pointer.y,
          startX: pointer.x,
          startY: pointer.y,
        };
        this.cancelTap = false;
      });
      this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
        if (!this.drag || !pointer.isDown) return;
        const pointers = this.input.manager.pointers.filter((p) => p.isDown);
        if (pointers.length > 1) {
          const dist = Phaser.Math.Distance.Between(
            pointers[0].x,
            pointers[0].y,
            pointers[1].x,
            pointers[1].y,
          );
          if (this.pinch)
            this.zoomFactor = Phaser.Math.Clamp(
              (this.zoomFactor * dist) / this.pinch,
              0.65,
              2.8,
            );
          this.pinch = dist;
          this.cancelTap = true;
          return;
        }
        const dx = pointer.x - this.drag.x,
          dy = pointer.y - this.drag.y;
        if (
          Phaser.Math.Distance.Between(
            pointer.x,
            pointer.y,
            this.drag.startX,
            this.drag.startY,
          ) > 8
        ) {
          this.cancelTap = true;
          this.panX -= dx / this.cameras.main.zoom;
          this.panY -= dy / this.cameras.main.zoom;
        }
        this.drag.x = pointer.x;
        this.drag.y = pointer.y;
      });
      this.input.on(
        "wheel",
        (_pointer: unknown, _targets: unknown, _dx: number, dy: number) => {
          this.zoomFactor = Phaser.Math.Clamp(
            this.zoomFactor * (dy > 0 ? 0.9 : 1.1),
            0.65,
            2.8,
          );
        },
      );
      this.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
        const cancelled = this.cancelTap;
        this.drag = null;
        this.pinch = 0;
        if (cancelled) return;
        if (model.pause.size) return;
        const p = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        const enemy = model.combat?.units.find(
          (u) =>
            u.side === "enemy" &&
            u.hp > 0 &&
            Math.hypot(u.x - p.x, u.y - p.y) < 60,
        );
        if (enemy && model.combat) {
          model.combat.target = enemy.id;
          return;
        }
        const planet = model.pack.planets.find(
          (v) =>
            Math.hypot(v.x - p.x, v.y - p.y) <
            Math.max(v.radius + 35, 24 / this.cameras.main.zoom),
        );
        if (planet && !model.combat) {
          this.selected = planet.id;
          onPlanet(planet.id);
          return;
        }
        model.move(p.x, p.y);
      });
      this.game.canvas.addEventListener("pointercancel", () => {
        this.drag = null;
        this.pinch = 0;
        this.cancelTap = true;
      });
      for (const [i, p] of model.pack.planets.entries())
        planetMaterial(this, `planet:${p.id}`, p.color, i * 1751);
      for (const e of model.pack.enemies)
        enemyMaterial(this, `enemy:${e.id}`, e.color, e.boss, e.pattern);
      const used = new Set(
        model.save.team.map(
          (id) =>
            model.pack.characters.find(
              (c) =>
                c.id === model.save.roster.find((o) => o.id === id)?.definition,
            )?.sprite,
        ),
      );
      model.pack.assets
        .filter((a) => used.has(a.id))
        .forEach((a) => this.ensureAsset(a.id));
    }
    private ensureAsset(id: string) {
      if (this.textures.exists(id) || this.loaded.has(id)) return;
      const a = model.pack.assets.find((a) => a.id === id);
      if (!a) return;
      this.loaded.add(id);
      const image = new Image();
      image.onload = () => {
        if (this.sys?.isActive() && !this.textures.exists(a.id))
          this.textures.addImage(a.id, image);
      };
      image.onerror = () => {
        model.notice = `素材未能載入：${a.name}`;
      };
      image.src = a.src;
    }

    private text(
      x: number,
      y: number,
      text: string,
      size = 14,
      color = "#8daab5",
      align = "center",
    ) {
      let t = this.labels[this.labelIndex++];
      if (!t) {
        t = this.add.text(x, y, text, {
          fontFamily: '"Noto Sans TC", "PingFang TC", sans-serif',
          fontSize: size,
          color,
          align,
        });
        this.labels.push(t);
      }
      if (t.text !== text) t.setText(text);
      if (t.style.fontSize !== `${size}px`) t.setFontSize(size);
      if (t.style.color !== color) t.setColor(color);
      t.setPosition(x, y).setOrigin(0.5, 0).setVisible(true);
    }
    private disc(x: number, y: number, r: number, color: number) {
      const g = this.ink;
      for (let i = 5; i >= 1; i--) {
        g.fillStyle(color, 0.014 * i);
        g.fillCircle(x, y, r + i * 9);
      }
      g.fillStyle(0x09151f, 1);
      g.fillCircle(x, y, r);
      for (let i = 8; i >= 0; i--) {
        g.fillStyle(color, 0.035);
        g.fillCircle(x - r * 0.12, y - r * 0.2, (r * (i + 1)) / 10);
      }
      g.lineStyle(1, color, 0.65);
      g.strokeCircle(x, y, r);
      g.lineStyle(1, 0xffffff, 0.2);
      g.beginPath();
      g.arc(x, y, r - 3, Math.PI * 1.05, Math.PI * 1.6);
      g.strokePath();
    }
    update(_time: number, delta: number) {
      const dt = Math.min(delta / 1000, 0.08);
      this.elapsed += dt;
      this.acc = Math.min(this.acc + dt, 0.15);
      while (this.acc >= 1 / 60) {
        model.step(1 / 60);
        this.acc -= 1 / 60;
      }
      const g = this.ink,
        camera = this.cameras.main,
        r = model.pack.regions.find((v) => v.id === model.save.region)!;
      const w = this.scale.width,
        h = this.scale.height,
        battle = !!model.combat;
      if (battle !== this.lastBattle) {
        this.lastBattle = battle;
        this.panX = 0;
        this.panY = 0;
        this.zoomFactor = 1;
      }
      const zoom =
        (battle
          ? w < 650
            ? 0.78
            : 1
          : Math.min(w / r.width, h / r.height) * 0.9) * this.zoomFactor;
      camera.setZoom(zoom);
      camera.centerOn(
        (battle ? model.x : r.width / 2) + this.panX,
        (battle ? model.y : r.height / 2) + this.panY,
      );
      g.clear();
      this.labelIndex = 0;
      this.sprites.forEach((image) => image.setVisible(false));
      // Nebulae and a stable starfield: presentation-only, independent from simulation RNG.
      for (let i = model.lowEffects ? 3 : 8; i > 0; i--) {
        g.fillStyle(0x40335f, 0.012);
        g.fillEllipse(1600, 850, i * 175, i * 92);
        g.fillStyle(0x164f60, 0.014);
        g.fillEllipse(600, 450, i * 145, i * 100);
      }
      g.lineStyle(0.7, 0x638b9c, 0.1);
      for (let x = 0; x <= r.width; x += 200) g.lineBetween(x, 0, x, r.height);
      for (let y = 0; y <= r.height; y += 200) g.lineBetween(0, y, r.width, y);
      for (const s of this.starfield) {
        g.fillStyle(0xc3deeb, s.a);
        g.fillCircle(s.x, s.y, (s.r / zoom) * 0.6);
      }
      g.lineStyle(1, 0x79a3ae, 0.16);
      g.strokeEllipse(
        r.width / 2,
        r.height / 2,
        r.width * 0.83,
        r.height * 0.72,
      );
      g.strokeEllipse(
        r.width / 2,
        r.height / 2,
        r.width * 0.5,
        r.height * 0.43,
      );
      for (const p of model.pack.planets.filter(
        (p) => p.region === model.save.region,
      )) {
        for (const dep of p.requires) {
          const a = model.pack.planets.find((v) => v.id === dep)!;
          g.lineStyle(
            1.2,
            0x83c9cb,
            model.save.cleared.includes(dep) ? 0.4 : 0.12,
          );
          g.lineBetween(a.x, a.y, p.x, p.y);
        }
        const color = Phaser.Display.Color.HexStringToColor(p.color).color;
        const drawR = Math.max(p.radius, 24 / zoom);
        this.disc(p.x, p.y, drawR, color);
        this.drawAsset(
          p.id + ":material",
          `planet:${p.id}`,
          p.x,
          p.y,
          drawR * 2.2,
        );
        const col = model.save.colonies[p.id];
        const locked = !p.requires.every((id) =>
          model.save.cleared.includes(id),
        );
        if (p.id === this.selected) {
          g.lineStyle(1.6, 0xf4d9a2, 0.8);
          g.strokeCircle(p.x, p.y, drawR + 20 + Math.sin(this.elapsed) * 2);
          g.lineStyle(1, 0xf4d9a2, 0.3);
          g.strokeCircle(p.x, p.y, drawR + 28);
        }
        if (p.sprite) this.ensureAsset(p.sprite);
        if (p.sprite && this.textures.exists(p.sprite))
          this.drawAsset(p.id, p.sprite, p.x, p.y, drawR * 2);
        this.text(
          p.x,
          p.y + drawR + 12 / zoom,
          p.name,
          13 / zoom,
          locked ? "#637983" : "#dce8e8",
        );
        this.text(
          p.x,
          p.y + drawR + 29 / zoom,
          locked
            ? "◇ 航路未解鎖"
            : col?.lost
              ? "⚠ 防線失守"
              : col?.active
                ? "◈ 生產中"
                : model.save.cleared.includes(p.id)
                  ? "◇ 已解放"
                  : "◆ 敵方訊號",
          10 / zoom,
          col?.lost ? "#ffab91" : "#81a8ae",
        );
      }
      if (!battle) {
        const d = model.destination;
        g.lineStyle(1.2, 0x87d8d5, 0.4);
        g.lineBetween(model.x, model.y, d.x, d.y);
        g.strokeCircle(d.x, d.y, 12);
        for (let i = 0; i < model.save.team.length; i++)
          this.ship(
            model.x + (i - 1) * 40,
            model.y + (i % 2) * 45,
            0x9bdfd4,
            16,
          );
        this.text(
          model.x,
          model.y + 75,
          "航行小隊",
          (12 / zoom) * 0.7,
          "#a4dbd7",
        );
      }
      if (model.combat) {
        const combat = model.combat;
        if (combat.sequence > this.lastSequence) {
          audio?.cue("shot");
          this.lastSequence = combat.sequence;
        }
        if (combat.flashes.length > this.lastFlashCount) audio?.cue("hit");
        this.lastFlashCount = combat.flashes.length;
        for (const b of combat.bullets) {
          g.fillStyle(
            Phaser.Display.Color.HexStringToColor(b.color).color,
            0.2,
          );
          g.fillCircle(b.x, b.y, b.side === "enemy" ? 10 : 6);
          g.fillStyle(Phaser.Display.Color.HexStringToColor(b.color).color, 1);
          g.fillCircle(b.x, b.y, b.side === "enemy" ? 4 : 2.7);
        }
        for (const u of combat.units) {
          if (u.hp <= 0) continue;
          if (u.sprite) this.ensureAsset(u.sprite);
          const color = Phaser.Display.Color.HexStringToColor(u.color).color;
          const size = u.boss ? 42 : u.turretUntil ? 14 : 18;
          if (u.side === "ally") {
            if (!u.sprite || !this.textures.exists(u.sprite))
              this.ship(u.x, u.y, color, size);
          } else {
            this.drawAsset(
              u.id + ":hull",
              `enemy:${u.def}`,
              u.x,
              u.y,
              u.boss ? 150 : 75,
            );
          }
          if (u.side === "enemy" && u.windup > 0) {
            g.lineStyle(2, 0xffbc85, 0.65);
            g.strokeCircle(u.x, u.y, 60 + (1 - u.windup / 0.55) * 25);
            g.lineBetween(
              u.x,
              u.y,
              u.x + Math.cos(u.aim) * 250,
              u.y + Math.sin(u.aim) * 250,
            );
          }
          if (u.sprite && this.textures.exists(u.sprite))
            this.drawAsset(u.id, u.sprite, u.x, u.y, 96);
          if (u.shield > 0) {
            g.lineStyle(1.5, 0x87ede1, 0.8);
            g.strokeCircle(u.x, u.y, size + 10);
          }
          g.fillStyle(0x172c36);
          g.fillRect(u.x - 25, u.y - size - 15, 50, 3);
          g.fillStyle(color);
          g.fillRect(u.x - 25, u.y - size - 15, (50 * u.hp) / u.maxHp, 3);
          if (combat.target === u.id) {
            g.lineStyle(1, 0xf0d3a2);
            g.strokeCircle(u.x, u.y, size + 12);
          }
          if (u.boss) this.text(u.x, u.y - 80, u.name, 15, "#e8c2ff");
        }
        for (const f of combat.flashes) {
          g.lineStyle(
            2,
            Phaser.Display.Color.HexStringToColor(f.color).color,
            Math.min(1, f.life * 2),
          );
          g.strokeCircle(f.x, f.y, f.radius * (1.3 - f.life));
          this.text(f.x, f.y - 45, f.label, 13, f.color);
        }
        // Direction markers keep offscreen threats discoverable on portrait displays.
        for (const u of combat.units.filter(
          (u) => u.side === "enemy" && u.hp > 0,
        )) {
          const bounds = camera.worldView;
          if (!bounds.contains(u.x, u.y)) {
            const cx = Phaser.Math.Clamp(
                u.x,
                bounds.left + 25 / zoom,
                bounds.right - 25 / zoom,
              ),
              cy = Phaser.Math.Clamp(
                u.y,
                bounds.top + 25 / zoom,
                bounds.bottom - 25 / zoom,
              );
            g.fillStyle(0xff9d85, 0.9);
            g.fillTriangle(cx, cy - 9, cx - 7, cy + 5, cx + 7, cy + 5);
          }
        }
      }
      for (let i = this.labelIndex; i < this.labels.length; i++)
        this.labels[i].setVisible(false);
    }
    sprites = new Map<string, Phaser.GameObjects.Image>();
    private drawAsset(
      key: string,
      id: string,
      x: number,
      y: number,
      size: number,
    ) {
      let image = this.sprites.get(key);
      if (!image) {
        image = this.add.image(x, y, id);
        this.sprites.set(key, image);
      }
      const a = model.pack.assets.find((a) => a.id === id);
      const ratio = a ? a.width / a.height : 1;
      if (image.texture.key !== id) image.setTexture(id);
      image
        .setPosition(x, y)
        .setDisplaySize(size * Math.min(1, ratio), size / Math.max(1, ratio))
        .setVisible(true);
    }

    recenter() {
      this.panX = 0;
      this.panY = 0;
      this.zoomFactor = 1;
    }
    private ship(x: number, y: number, color: number, size: number) {
      const g = this.ink;
      g.fillStyle(color, 0.08);
      g.fillCircle(x, y, size * 2);
      g.lineStyle(1.6, color, 1);
      g.fillStyle(0x10262f, 1);
      g.fillTriangle(
        x,
        y - size,
        x - size * 0.7,
        y + size * 0.65,
        x + size * 0.7,
        y + size * 0.65,
      );
      g.strokeTriangle(
        x,
        y - size,
        x - size * 0.7,
        y + size * 0.65,
        x + size * 0.7,
        y + size * 0.65,
      );
      g.fillStyle(color, 0.7);
      g.fillCircle(x, y, 3);
      g.lineStyle(1, color, 0.3);
      g.lineBetween(x, y + size * 0.6, x, y + size * 1.8);
    }
  }
  const scene = new Space();
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: host,
    backgroundColor: "#071019",
    transparent: false,
    antialias: true,
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: host.clientWidth,
      height: host.clientHeight,
    },
    scene,
    render: { powerPreference: "low-power" },
  });
  return {
    select: (id: string) => (scene.selected = id),
    destroy: () => game.destroy(true),
    recenter: () => scene.recenter(),
  };
}
