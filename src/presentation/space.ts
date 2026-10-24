import { drawCombatVfx } from "./combat-vfx";
import { turretArt } from "./summon-art";
import { SummonCues } from "./summon-cues";
import { BeamLayer } from "./beam-layer";
import {
  nodeUnlocked,
  nodeCleared,
  nodeAvailability,
  nodeKindNames,
  nodeVisible,
} from "../domain/world";
import { barrierEnds } from "../domain/mechanics";
import Phaser from "phaser";
import { SimulationClock } from "../application/simulation-clock";
import { guardianPositions, patrolPosition } from "../domain/navigation";
import { planetMaterial, enemyMaterial } from "./materials";
import type { AudioMixer } from "../platform/audio";
/** World units per backdrop pixel in the first sector (3600x2400 over 1672x941 art). */
const backdropDensity = 2.55;
import type { Game } from "../application/game";
export function mountSpace(
  host: HTMLElement,
  model: Game,
  onPlanet: (id: string) => void,
  audio?: AudioMixer,
) {
  const density = Math.min(window.devicePixelRatio || 1, 2);
  const held = new Set<string>();
  const directional = (e: KeyboardEvent, down: boolean) => {
    if (
      down &&
      ((e.target as HTMLElement)?.closest(
        "input,textarea,select,[contenteditable=true]",
      ) ||
        e.ctrlKey ||
        e.metaKey ||
        e.altKey)
    )
      return;
    const key = e.key.toLowerCase();
    if (
      ![
        "w",
        "a",
        "s",
        "d",
        "arrowup",
        "arrowdown",
        "arrowleft",
        "arrowright",
      ].includes(key)
    )
      return;
    e.preventDefault();
    if (down) held.add(key);
    else held.delete(key);
    model.movement = {
      x:
        Number(held.has("d") || held.has("arrowright")) -
        Number(held.has("a") || held.has("arrowleft")),
      y:
        Number(held.has("s") || held.has("arrowdown")) -
        Number(held.has("w") || held.has("arrowup")),
    };
  };
  const keydown = (e: KeyboardEvent) => directional(e, true),
    keyup = (e: KeyboardEvent) => directional(e, false);
  const blur = () => {
    held.clear();
    model.movement = { x: 0, y: 0 };
  };
  document.addEventListener("keydown", keydown);
  document.addEventListener("keyup", keyup);
  window.addEventListener("blur", blur);
  class Space extends Phaser.Scene {
    ink!: Phaser.GameObjects.Graphics;
    hud!: Phaser.GameObjects.Graphics;
    light!: Phaser.GameObjects.Graphics;
    labels: Phaser.GameObjects.Text[] = [];
    labelIndex = 0;
    selected = "";
    overview = false;
    starfield: { x: number; y: number; r: number; a: number }[] = [];
    loaded = new Set<string>();
    elapsed = 0;
    clock = new SimulationClock();
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
    lastHits = 0;
    lastShake = 0;
    summonCues = new SummonCues();
    beamLayer?: BeamLayer;

    create() {
      this.beamLayer = new BeamLayer(this);
      this.ensureTurretArt();
      this.ink = this.add.graphics();
      this.hud = this.add.graphics().setDepth(20);
      this.light = this.add
        .graphics()
        .setDepth(2)
        .setBlendMode(Phaser.BlendModes.ADD);
      const r = model.pack.regions.find((v) => v.id === model.save.region)!;
      for (let i = 0; i < 420; i++) {
        const n = Math.sin(i * 127.1 + 77) * 43758.5453,
          frac = n - Math.floor(n),
          m = Math.sin(i * 311.7 + 27) * 17319.24;
        this.starfield.push({
          x: frac,
          y: m - Math.floor(m),
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
        const planet = model.pack.planets
          .filter(
            (v) =>
              v.region === model.save.region &&
              nodeVisible(model.save, v, model.pack, Date.now()) &&
              Math.hypot(v.x - p.x, v.y - p.y) <
                Math.max(
                  v.radius + 35,
                  (v.kind === "planet" ? 20 : 14) / this.cameras.main.zoom,
                ),
          )
          .sort(
            (a, b) =>
              Math.hypot(a.x - p.x, a.y - p.y) -
              Math.hypot(b.x - p.x, b.y - p.y),
          )[0];
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
        if (!p.sprite)
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
    private ensureTurretArt() {
      if (this.textures.exists(turretArt.key)) return;
      const image = new Image();
      image.onload = () => {
        if (!this.sys?.isActive() || this.textures.exists(turretArt.key))
          return;
        const canvas = document.createElement("canvas");
        canvas.width = 512;
        canvas.height = Math.round((512 * turretArt.height) / turretArt.width);
        const ctx = canvas.getContext("2d")!;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        this.textures.addCanvas(turretArt.key, canvas);
      };
      image.src = turretArt.url;
    }
    private ensureAsset(id: string) {
      if (this.textures.exists(id) || this.loaded.has(id)) return;
      const a = model.pack.assets.find((a) => a.id === id);
      if (!a) return;
      this.loaded.add(id);
      const image = new Image();
      image.onload = () => {
        if (!this.sys?.isActive() || this.textures.exists(a.id)) return;
        // Render sprites at a bounded texture density; source art and studio previews stay intact.
        const background = model.pack.regions.some(
          (r) => r.background === a.id,
        );
        const limit = background ? (model.lowEffects ? 1024 : 1800) : 512;
        if (Math.max(image.width, image.height) > limit) {
          const canvas = document.createElement("canvas");
          const ratio = limit / Math.max(image.width, image.height);
          canvas.width = Math.round(image.width * ratio);
          canvas.height = Math.round(image.height * ratio);
          const ctx = canvas.getContext("2d")!;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
          this.textures.addCanvas(a.id, canvas);
        } else this.textures.addImage(a.id, image);
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
          resolution: density,
          fontFamily: '"Noto Sans TC", "PingFang TC", sans-serif',
          fontSize: size,
          color,
          align,
        });
        t.setDepth(21);
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
    update() {
      // Phaser smoothDelta replaces slow frames with old values. Use its raw elapsed time instead.
      const dt = this.clock.advance(
        this.game.loop.rawDelta,
        !!model.pause.size,
        (dt) => model.step(dt),
      );
      this.elapsed += dt;
      const g = this.ink,
        camera = this.cameras.main,
        r = model.pack.regions.find((v) => v.id === model.save.region)!;
      const w = this.scale.width / density,
        h = this.scale.height / density,
        battle = !!model.combat;
      if (battle !== this.lastBattle) {
        this.lastBattle = battle;

        this.panX = 0;
        this.panY = 0;
        this.zoomFactor = 1;
      }
      // Portrait combat frames the living team, including the rear formation slots.
      // This is camera-only; unit positions and combat rules remain untouched.
      const team =
        battle && w < 650 && model.viewMode === "explore"
          ? model.combat!.units.filter(
              (u) => u.side === "ally" && u.hp > 0 && !u.summonOwner,
            )
          : [];
      const teamBounds = team.length
        ? {
            left: Math.min(...team.map((u) => u.x)),
            right: Math.max(...team.map((u) => u.x)),
            top: Math.min(...team.map((u) => u.y)),
            bottom: Math.max(...team.map((u) => u.y)),
          }
        : undefined;
      const portraitZoom = teamBounds
        ? Math.min(
            0.72,
            w / (teamBounds.right - teamBounds.left + 280),
            h / (teamBounds.bottom - teamBounds.top + 200),
          )
        : 0.72;
      const zoom =
        (model.viewMode === "explore"
          ? w < 650
            ? portraitZoom
            : 0.95
          : Math.min(w / r.width, h / r.height) * 0.88) * this.zoomFactor;
      const cinematic = model.storyCamera;
      const progress = cinematic
        ? Math.min(
            1,
            Math.max(
              0,
              (performance.now() - cinematic.startedAt) /
                Math.max(1, cinematic.seconds * 1000),
            ),
          )
        : 1;
      const ease = progress * progress * (3 - 2 * progress);
      const mix = (from: number, to: number) => from + (to - from) * ease;
      camera.setZoom(
        (cinematic ? mix(cinematic.fromZoom, cinematic.zoom) : zoom) * density,
      );
      const viewX =
          (cinematic ? mix(cinematic.fromX, cinematic.x) : undefined) ??
          (model.viewMode === "explore"
            ? teamBounds
              ? (teamBounds.left + teamBounds.right) / 2
              : model.x
            : r.width / 2) + this.panX,
        viewY =
          (cinematic ? mix(cinematic.fromY, cinematic.y) : undefined) ??
          (model.viewMode === "explore"
            ? teamBounds
              ? (teamBounds.top + teamBounds.bottom) / 2
              : model.y
            : r.height / 2) + this.panY;
      camera.centerOn(viewX, viewY);
      this.sprites.forEach((image) => image.setVisible(false));
      g.clear();
      if (r.background) {
        this.ensureAsset(r.background);
        if (this.textures.exists(r.background)) {
          this.drawAsset(
            "region-background",
            r.background,
            r.width / 2,
            r.height / 2,
            Math.max(r.width, r.height),
          );
          const im = this.sprites.get("region-background")!;
          const asset = model.pack.assets.find((a) => a.id === r.background)!;
          // Every sector keeps the first sector's texel density; large sectors
          // pan the backdrop as parallax instead of stretching one image 4x.
          const viewW = camera.width / camera.zoom,
            viewH = camera.height / camera.zoom;
          const scale = Math.max(
            backdropDensity,
            viewW / asset.width,
            viewH / asset.height,
          );
          const bw = asset.width * scale,
            bh = asset.height * scale;
          const u = Math.min(1, Math.max(0, viewX / r.width)),
            v = Math.min(1, Math.max(0, viewY / r.height));
          im.setDisplaySize(bw, bh)
            .setPosition(
              viewX + (0.5 - u) * (bw - viewW),
              viewY + (0.5 - v) * (bh - viewH),
            )
            .setDepth(-2)
            .setAlpha(0.58);
        }
      }
      this.hud.clear();
      this.light.clear();
      this.beamLayer?.draw(
        model.combat ?? undefined,
        model.lowEffects ||
          matchMedia("(prefers-reduced-motion: reduce)").matches,
      );
      this.labelIndex = 0;
      // Nebulae and a stable starfield: presentation-only, independent from simulation RNG.
      for (let i = r.background ? 0 : model.lowEffects ? 3 : 8; i > 0; i--) {
        g.fillStyle(0x40335f, 0.012);
        g.fillEllipse(1600, 850, i * 175, i * 92);
        g.fillStyle(0x164f60, 0.014);
        g.fillEllipse(600, 450, i * 145, i * 100);
      }
      g.lineStyle(0.7, 0x638b9c, 0.1);
      for (let x = 0; x <= r.width; x += 200) g.lineBetween(x, 0, x, r.height);
      for (let y = 0; y <= r.height; y += 200) g.lineBetween(0, y, r.width, y);
      for (const s of this.starfield.slice(
        0,
        r.background ? (model.lowEffects ? 60 : 120) : this.starfield.length,
      )) {
        g.fillStyle(0xc3deeb, s.a);
        g.fillCircle(s.x * r.width, s.y * r.height, (s.r / zoom) * 0.6);
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
        (p) =>
          p.region === model.save.region &&
          nodeVisible(model.save, p, model.pack, Date.now()) &&
          (model.viewMode === "map" || model.discovered.has(p.id)),
      )) {
        for (const dep of [...p.requires, ...p.requiresActive]) {
          const a = model.pack.planets.find((v) => v.id === dep)!;
          if (a.region !== p.region) continue;
          g.lineStyle(
            1.2,
            0x83c9cb,
            (
              p.requiresActive.includes(dep)
                ? model.save.colonies[dep]?.active
                : nodeCleared(model.save, a)
            )
              ? 0.4
              : 0.12,
          );
          g.lineBetween(a.x, a.y, p.x, p.y);
        }
        const color = Phaser.Display.Color.HexStringToColor(p.color).color;
        const overview = model.viewMode === "map";
        const compact =
          overview &&
          zoom < 0.25 &&
          p.kind !== "planet" &&
          p.id !== this.selected;
        const drawR = Math.max(
          p.radius,
          (overview ? (p.kind === "planet" ? 16 : 8) : 24) / zoom,
        );
        this.disc(p.x, p.y, drawR, color);
        if (p.kind === "planet" && this.textures.exists(`planet:${p.id}`))
          this.drawAsset(
            p.id + ":material",
            `planet:${p.id}`,
            p.x,
            p.y,
            drawR * 2.2,
          );
        const col = model.save.colonies[p.id];
        const locked = !nodeUnlocked(model.save, p, model.pack);
        if (p.id === this.selected) {
          g.lineStyle(1.6, 0xf4d9a2, 0.8);
          g.strokeCircle(p.x, p.y, drawR + 20 + Math.sin(this.elapsed) * 2);
          g.lineStyle(1, 0xf4d9a2, 0.3);
          g.strokeCircle(p.x, p.y, drawR + 28);
        }
        if (p.sprite) this.ensureAsset(p.sprite);
        if (
          p.sprite &&
          this.textures.exists(p.sprite) &&
          !(battle && p.kind === "dailyBoss" && model.combat?.planetId === p.id)
        )
          this.drawAsset(p.id, p.sprite, p.x, p.y, drawR * 2);
        if (!compact || zoom >= 0.14)
          this.text(
            p.x,
            p.y + drawR + 12 / zoom,
            p.name,
            (w < 650 ? 11 : 13) / zoom,
            locked ? "#637983" : "#dce8e8",
          );
        if (!compact)
          this.text(
            p.x,
            p.y + drawR + 29 / zoom,
            locked
              ? "◇ 未解鎖"
              : col?.lost
                ? "◈ 生產中"
                : col?.active
                  ? "◈ 生產中"
                  : nodeCleared(model.save, p)
                    ? p.kind === "planet"
                      ? "◇ 已解放"
                      : "◇ " + nodeKindNames[p.kind]
                    : "◆ " + nodeKindNames[p.kind],
            10 / zoom,
            col?.lost ? "#ffab91" : "#81a8ae",
          );
      }
      if (!battle)
        for (const p of model.pack.planets.filter(
          (p) =>
            p.region === r.id &&
            nodeVisible(model.save, p, model.pack, Date.now()) &&
            !nodeCleared(model.save, p) &&
            nodeAvailability(model.save, p, Date.now()).open &&
            (model.viewMode === "map" || model.discovered.has(p.id)),
        )) {
          const active = nodeUnlocked(model.save, p, model.pack);
          for (const guard of guardianPositions(p)) {
            const e = model.pack.enemies.find((e) => e.id === guard.enemy)!;
            if (e.sprite) this.ensureAsset(e.sprite);
            const texture =
              e.sprite && this.textures.exists(e.sprite)
                ? e.sprite
                : `enemy:${e.id}`;
            this.drawAsset(
              "ambient:" + guard.id,
              texture,
              guard.x,
              guard.y + Math.sin(this.elapsed * 1.8 + guard.x) * 2,
              e.boss
                ? model.pack.rules.bossSpriteSize
                : model.pack.rules.enemySpriteSize,
            );
            this.sprites
              .get("ambient:" + guard.id)
              ?.setAlpha(active ? 1 : 0.3)
              .setFlipX(guard.x > model.x);
          }
          if (active) {
            g.lineStyle(1, 0xffb18c, 0.12);
            g.strokeCircle(p.x, p.y, p.engageRadius);
          }
        }
      if (!battle) {
        const d = model.destination;
        g.lineStyle(1.2, 0x87d8d5, 0.4);
        g.lineBetween(model.x, model.y, d.x, d.y);
        g.strokeCircle(d.x, d.y, 12);
        for (let i = 0; i < model.save.team.length; i++) {
          const o = model.save.roster.find((o) => o.id === model.save.team[i])!;
          const c = model.pack.characters.find((c) => c.id === o.definition)!;
          this.ensureAsset(c.sprite);
          const position = model.fleet.positions.get(o.id)!;
          const bob = Math.sin(this.elapsed * 2.2 + i * 1.7) * 3;
          if (this.textures.exists(c.sprite)) {
            this.drawAsset(
              o.id,
              c.sprite,
              position.x,
              position.y + bob,
              model.pack.rules.allySpriteSize,
            );
            this.sprites
              .get(o.id)
              ?.setRotation(Math.sin(this.elapsed * 1.6 + i) * 0.025);
          } else this.ship(position.x, position.y, 0x9bdfd4, 12);
        }
        for (const v of r.patrols) {
          if ((model.save.patrolCooldowns[v.id] ?? 0) > model.voyageSeconds)
            continue;
          const e = model.pack.enemies.find(
            (e) => e.id === v.enemies[0].enemy,
          )!;
          const pos = patrolPosition(v, model.voyageSeconds);
          if (e.sprite) this.ensureAsset(e.sprite);
          const texture =
            e.sprite && this.textures.exists(e.sprite)
              ? e.sprite
              : `enemy:${e.id}`;
          this.drawAsset(
            v.id,
            texture,
            pos.x,
            pos.y,
            model.pack.rules.enemySpriteSize,
          );
          g.lineStyle(1, 0xff9a8a, 0.18);
          g.strokeEllipse(v.x, v.y, v.patrolRadius * 2, v.patrolRadius * 1.24);
          g.lineStyle(1, 0xff9a8a, 0.22);
          g.strokeCircle(pos.x, pos.y, v.detectionRadius);
          this.text(pos.x, pos.y + 42, "巡邏敵艦", 11 / zoom, "#ffb39e");
        }
        if (model.viewMode === "explore") {
          const next = model.pack.planets.find(
            (v) =>
              v.region === r.id &&
              !nodeCleared(model.save, v) &&
              v.kind !== "camp" &&
              v.kind !== "dailyBoss" &&
              nodeUnlocked(model.save, v, model.pack),
          );
          if (next && !camera.worldView.contains(next.x, next.y)) {
            const b = camera.worldView,
              cx = Phaser.Math.Clamp(
                next.x,
                b.left + 55 / zoom,
                b.right - 55 / zoom,
              ),
              cy = Phaser.Math.Clamp(
                next.y,
                b.top + 45 / zoom,
                b.bottom - 80 / zoom,
              );
            g.lineStyle(1.5, 0xf1d39e, 0.8);
            g.strokeCircle(cx, cy, 15 / zoom);
            this.text(
              cx,
              cy + 22 / zoom,
              `${model.discovered.has(next.id) ? next.name : "未知星體"} · ${Math.round(Math.hypot(next.x - model.x, next.y - model.y))}u`,
              10 / zoom,
              "#f1d39e",
            );
          }
        }
        this.text(
          model.x,
          model.y + 75,
          "航行小隊",
          (12 / zoom) * 0.7,
          "#a4dbd7",
        );
      }
      if (!model.combat) {
        host.classList.remove("under-fire");
        this.lastHits = 0;
      }
      if (model.combat) {
        const combat = model.combat;
        if (combat.sequence > this.lastSequence) {
          audio?.cue("shot");
          this.lastSequence = combat.sequence;
        }
        if (combat.flashes.length > this.lastFlashCount) audio?.cue("hit");
        this.lastFlashCount = combat.flashes.length;
        if (combat.hitsReceived > this.lastHits) {
          if (
            !model.lowEffects &&
            !matchMedia("(prefers-reduced-motion: reduce)").matches &&
            this.elapsed - this.lastShake > 0.15
          ) {
            camera.shake(90, 0.0018);
            this.lastShake = this.elapsed;
          }
          this.lastHits = combat.hitsReceived;
        }
        const hurt = combat.allies.some((u) => u.hurtUntil > combat.time);
        host.classList.toggle("under-fire", hurt);
        if (model.save.encounter?.kind !== "patrol") {
          const p = model.pack.planets.find((p) => p.id === combat.planetId)!;
          const near =
            Math.hypot(model.x - p.x, model.y - p.y) > p.leashWarningRadius;
          g.lineStyle(
            near ? 3 : 1,
            near ? 0xff916e : 0xddbb77,
            near ? 0.65 : 0.16,
          );
          g.strokeCircle(p.x, p.y, p.leashRadius);
        }
        drawCombatVfx(
          g,
          this.light,
          this.hud,
          combat,
          model.pack,
          model.lowEffects ||
            matchMedia("(prefers-reduced-motion: reduce)").matches,
        );
        this.summonCues.draw(
          g,
          this.light,
          combat,
          model.lowEffects ||
            matchMedia("(prefers-reduced-motion: reduce)").matches,
        );
        if (
          !model.lowEffects &&
          !matchMedia("(prefers-reduced-motion: reduce)").matches
        ) {
          for (const d of combat.mechanics.dashes) {
            const u = combat.units.find((u) => u.id === d.owner);
            if (!u?.sprite || !this.textures.exists(u.sprite)) continue;
            for (let i = 1; i <= 3; i++) {
              const part = i * 0.22;
              const key = `${u.id}:dash-echo:${i}`;
              this.drawAsset(
                key,
                u.sprite,
                u.x + (d.from.x - u.x) * part,
                u.y + (d.from.y - u.y) * part,
                model.pack.rules.allySpriteSize,
              );
              this.sprites
                .get(key)
                ?.setAlpha(0.2 - i * 0.035)
                .setTint(u.side === "enemy" ? 0xff9baa : 0x9ee6ef);
            }
          }
        }
        for (const u of combat.units) {
          if (u.hp <= 0) continue;
          if (u.sprite) this.ensureAsset(u.sprite);
          const color = Phaser.Display.Color.HexStringToColor(u.color).color;
          const scale = combat.mechanics.stat(u, "scale");
          const size = (u.boss ? 42 : u.turretUntil ? 14 : 18) * scale;
          const texturedTurret =
            u.summonKind === "turret" && this.textures.exists(turretArt.key);
          if (texturedTurret) {
            this.drawAsset(
              u.id,
              turretArt.key,
              u.x,
              u.y,
              turretArt.worldWidth * scale,
            );
            this.sprites
              .get(u.id)
              ?.setOrigin(turretArt.pivot.x, turretArt.pivot.y);
          } else if (u.side === "ally") {
            if (!u.sprite || !this.textures.exists(u.sprite))
              this.ship(u.x, u.y, color, size);
          } else if (!u.sprite || !this.textures.exists(u.sprite)) {
            this.drawAsset(
              u.id + ":hull",
              `enemy:${u.def}`,
              u.x,
              u.y,
              u.boss
                ? model.pack.rules.bossSpriteSize
                : model.pack.rules.enemySpriteSize,
            );
          }
          if (u.side === "enemy" && u.windup > 0) {
            g.lineStyle(2, 0xffbc85, 0.65);
            g.strokeCircle(u.x, u.y, 60 + (1 - u.windup / 0.55) * 25);
            const { pattern, count, spread } = combat.volleyFor(u);
            if (pattern === "laser") {
              g.lineStyle(24, 0xff876b, 0.12);
              g.lineBetween(
                u.x,
                u.y,
                u.x + Math.cos(u.aim) * u.range,
                u.y + Math.sin(u.aim) * u.range,
              );
              g.lineStyle(1, 0xffbc85, 0.7);
            }
            const rays =
              pattern === "ring" ||
              pattern === "spiral" ||
              pattern === "fan" ||
              pattern === "shotgun"
                ? count
                : 1;
            for (let i = 0; i < rays; i++) {
              const a =
                pattern === "ring" || pattern === "spiral"
                  ? (i * Math.PI * 2) / rays
                  : u.aim + (i - (rays - 1) / 2) * spread;
              g.lineBetween(
                u.x,
                u.y,
                u.x + Math.cos(a) * u.range,
                u.y + Math.sin(a) * u.range,
              );
            }
          }
          if (u.sprite && this.textures.exists(u.sprite))
            this.drawAsset(
              u.id,
              u.sprite,
              u.x,
              u.y +
                Math.sin(this.elapsed * 2.2 + combat.units.indexOf(u) * 1.7) *
                  3,
              u.side === "ally"
                ? model.pack.rules.allySpriteSize * scale
                : u.boss
                  ? model.pack.rules.bossSpriteSize * scale
                  : model.pack.rules.enemySpriteSize * scale,
            );
          this.sprites
            .get(u.id)
            ?.setRotation(
              texturedTurret
                ? u.aim
                : Math.sin(this.elapsed * 1.6 + combat.units.indexOf(u)) *
                    0.025,
            );
          if (u.side === "enemy" && !texturedTurret)
            this.sprites.get(u.id)?.setFlipX(u.x > combat.center.x);
          const sprite =
            this.sprites.get(u.id) ?? this.sprites.get(u.id + ":hull");
          if (sprite) {
            if (u.hurtUntil > combat.time)
              sprite
                .setTint(0xffb6aa)
                .setAlpha(0.75 + Math.sin(combat.time * 65) * 0.25);
            else sprite.clearTint().setAlpha(1);
            if (
              texturedTurret &&
              u.side === "enemy" &&
              u.hurtUntil <= combat.time
            )
              sprite.setTint(0xffa2b1);
            if (combat.time - u.shotAt < 0.12) sprite.x -= Math.cos(u.aim) * 2;
          }
          const statuses = combat.mechanics.active(u);
          for (const s of statuses)
            if (s.interceptRadius && s.stat !== "directional") {
              g.lineStyle(2, color, 0.3);
              g.strokeCircle(u.x, u.y, s.interceptRadius);
            }
          if (statuses.length) {
            g.lineStyle(2, color, 0.55);
            g.strokeCircle(u.x, u.y, size + 14 + Math.sin(combat.time * 3) * 2);
            for (const status of statuses.filter(
              (s) => s.stat === "directional",
            )) {
              const p = barrierEnds(u, status.interceptRadius || 160);
              g.lineStyle(14, color, 0.12);
              g.lineBetween(p.x1, p.y1, p.x2, p.y2);
              g.lineStyle(4, color, 0.8);
              g.lineBetween(p.x1, p.y1, p.x2, p.y2);
              g.lineStyle(1, 0xffffff, 0.7);
              g.lineBetween(p.x1, p.y1, p.x2, p.y2);
            }
            if (statuses.some((s) => s.stat === "stun"))
              this.text(u.x, u.y - 45, "✦ 暈眩", 12, "#f8d888");
            if (statuses.some((s) => s.stat === "moveSpeed" && s.value < 1))
              this.text(u.x, u.y - 45, "▽ 減速", 12, "#b2b6ff");
          }
          if (sprite && u.summonKind === "clone") sprite.setAlpha(0.55);
          if (u.shield > 0) {
            this.hud.lineStyle(1.5, 0x87ede1, 0.8);
            this.hud.strokeCircle(u.x, u.y, size + 10);
          }
          this.hud.fillStyle(0x172c36);
          this.hud.fillRect(u.x - 25, u.y + (u.boss ? 64 : 43), 50, 3);
          this.hud.fillStyle(color);
          this.hud.fillRect(
            u.x - 25,
            u.y + (u.boss ? 64 : 43),
            (50 * u.hp) / u.maxHp,
            3,
          );
          if (combat.target === u.id) {
            this.hud.lineStyle(1, 0xf0d3a2);
            this.hud.strokeCircle(u.x, u.y, size + 12);
          }
          if (u.boss) this.text(u.x, u.y - 80, u.name, 15, "#e8c2ff");
        }
        // Event labels use the same simulation lifetime; limit numerical clutter.
        let hitLabels = 0;
        for (const f of combat.flashes) {
          if (!f.skillId && ++hitLabels > (model.lowEffects ? 6 : 16)) continue;
          const age = f.skillId ? 0.65 - f.life : 0.25 - f.life;
          this.text(
            f.x,
            f.y - 38 - Math.max(0, age) * 28,
            f.label,
            f.skillId ? 14 : 11,
            f.side === "ally" ? "#ffb2be" : f.color,
          );
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
      if (image.texture.key !== id) image.setTexture(id);
      const ratio = a
        ? a.width / a.height
        : image.frame.width / image.frame.height;
      image
        .clearTint()
        .setAlpha(1)
        .setFlipX(false)
        .setOrigin(0.5)
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
  const resetClock = () => scene.clock.reset();
  document.addEventListener("visibilitychange", resetClock);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: host,
    backgroundColor: "#071019",
    transparent: false,
    antialias: true,
    scale: {
      mode: Phaser.Scale.NONE,
      zoom: 1 / density,
      width: host.clientWidth * density,
      height: host.clientHeight * density,
    },
    scene,
    render: { powerPreference: "high-performance", roundPixels: false },
  });
  const resize = new ResizeObserver(() => {
    game.scale.resize(host.clientWidth * density, host.clientHeight * density);
    game.canvas.style.width = `${host.clientWidth}px`;
    game.canvas.style.height = `${host.clientHeight}px`;
  });
  resize.observe(host);
  return {
    select: (id: string) => (scene.selected = id),
    destroy: () => {
      resize.disconnect();
      document.removeEventListener("visibilitychange", resetClock);
      document.removeEventListener("keydown", keydown);
      document.removeEventListener("keyup", keyup);
      window.removeEventListener("blur", blur);
      game.destroy(true);
    },
    recenter: () => scene.recenter(),
  };
}
