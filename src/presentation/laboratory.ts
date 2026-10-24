import { barrierEnds } from "../domain/mechanics";
import { turretArt } from "./summon-art";
import { SimulationClock } from "../application/simulation-clock";
import { patternNames, skillMechanic } from "../content/descriptions";
import { laboratory, type LaboratoryConfig } from "../domain/laboratory";
import type { Pack } from "../content/schema";
import type { Combat } from "../domain/combat";
import { patternTypes } from "../content/mechanics";
import { esc } from "./common";
export function mountLaboratory(parent: HTMLElement, pack: Pack) {
  const root = document.createElement("section");
  root.className = "laboratory";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  const previousFocus = document.activeElement as HTMLElement | null;
  const background = parent.querySelector<HTMLElement>("main");
  if (background) background.inert = true;
  root.setAttribute("aria-label", "技能測試訓練場");
  root.innerHTML = `<header><div><span class="eyebrow">COMBAT LAB / ISOLATED SIMULATION</span><h2>技能測試訓練場</h2><p>使用已保存草稿。無獎勵、不消耗資源；正式玩家進度不會改變。</p></div><button data-lab="close">關閉測試場</button></header><div class="lab-layout"><form class="lab-config"><h3>我方編隊</h3>${Array.from(
    { length: 6 },
    (_, i) =>
      `<div class="lab-ally"><label>位置 ${i + 1}<select data-character><option value="">不出戰</option>${pack.characters
        .filter((c) => c.status === "active")
        .map(
          (c, j) =>
            `<option value="${esc(c.id)}" ${j === i && i < 3 ? "selected" : ""}>${esc(c.name)}</option>`,
        )
        .join(
          "",
        )}</select></label><label>角色等級<input data-level type="number" min="1" max="${pack.rules.maxLevel}" value="1"></label><label>技能等級<input data-skill-level type="number" min="1" max="10" value="1"></label><label class="lab-skill-select">技能覆寫<select data-skill><option value="">角色原技能</option>${pack.skills
        .filter((s) => s.status === "active")
        .map(
          (s) =>
            `<option value="${esc(s.id)}">${esc(s.name)} · ${esc(s.id)}</option>`,
        )
        .join("")}</select></label></div>`,
  ).join("")}<h3>敵方配置</h3>${Array.from(
    { length: 3 },
    (_, i) =>
      `<div class="lab-enemy"><label>敵人 ${i + 1}<select data-enemy><option value="">不配置</option>${pack.enemies
        .filter((e) => e.status === "active")
        .map(
          (e, j) =>
            `<option value="${esc(e.id)}" ${i === 0 && j === 0 ? "selected" : ""}>${esc(e.name)}</option>`,
        )
        .join(
          "",
        )}</select></label><label>等級<input data-enemy-level type="number" min="1" max="120" value="1"></label><label>數量<input data-count type="number" min="1" max="30" value="1"></label><label>彈幕覆寫<select data-pattern><option value="">沿用內容</option>${patternTypes.map((p) => `<option value="${p}">${patternNames[p]}</option>`).join("")}</select></label></div>`,
  ).join(
    "",
  )}<label>隨機種子<input id="lab-seed" type="number" min="0" max="4294967295" value="77"></label><p class="muted">敵方測試等級採本作線性成長 8%／級。技能等級可獨立測試1–10級。</p><button data-lab="start" class="primary">建立／重置戰鬥</button><p id="lab-error" role="status"></p></form><div class="lab-main"><div class="lab-controls"><button data-lab="pause">開始／暫停</button><button data-lab="step">單步 1/60 秒</button><label><input id="lab-auto" type="checkbox">自動技能</label><label><input id="lab-lock-health" type="checkbox">鎖定雙方生命（保留傷害統計）</label><label>速度<select id="lab-speed"><option value=".25">¼×</option><option value="1" selected>1×</option><option value="2">2×</option></select></label></div><p>點擊空地移動編隊，點擊敵人鎖定。暫停時仍可施放技能後單步觀察。</p><canvas id="lab-canvas" width="1100" height="660" tabindex="0" aria-label="技能實測戰場"></canvas><div id="lab-casts" class="lab-casts"></div><div id="lab-skill-info"></div><output id="lab-metrics" aria-live="off"></output><details><summary>狀態與判定資料</summary><pre id="lab-debug"></pre></details></div></div>`;
  parent.append(root);
  const $ = <T extends HTMLElement = HTMLElement>(s: string) =>
    root.querySelector<T>(s)!;
  const canvas = $<HTMLCanvasElement>("#lab-canvas"),
    ctx = canvas.getContext("2d")!;
  const images = new Map<string, HTMLImageElement>();
  const imageFor = (id: string) => {
    let img = images.get(id);
    if (!img) {
      const asset = pack.assets.find((a) => a.id === id);
      const src = id === turretArt.key ? turretArt.url : asset?.src;
      if (!src) return undefined;
      img = new Image();
      img.src = src;
      images.set(id, img);
    }
    return img;
  };
  let combat: Combat | undefined,
    paused = true,
    disposed = false,
    frame = 0,
    last = 0,
    lastReport = 0,
    origin = { x: 0, y: 0 };
  const clock = new SimulationClock();
  let profile = "";
  let config: LaboratoryConfig | undefined;
  function start() {
    try {
      const nextConfig: LaboratoryConfig = {
        allies: [...root.querySelectorAll<HTMLElement>(".lab-ally")].flatMap(
          (r) => {
            const character =
              r.querySelector<HTMLSelectElement>("[data-character]")!.value;
            return character
              ? [
                  {
                    character,
                    level: Number(
                      r.querySelector<HTMLInputElement>("[data-level]")!.value,
                    ),
                    skill:
                      r.querySelector<HTMLSelectElement>("[data-skill]")
                        ?.value || undefined,
                    skillLevel: Number(
                      r.querySelector<HTMLInputElement>("[data-skill-level]")!
                        .value,
                    ),
                  },
                ]
              : [];
          },
        ),
        enemies: [...root.querySelectorAll<HTMLElement>(".lab-enemy")].flatMap(
          (r) => {
            const enemy =
              r.querySelector<HTMLSelectElement>("[data-enemy]")!.value;
            const pattern = r.querySelector<HTMLSelectElement>(
              "[data-pattern]",
            )!.value as LaboratoryConfig["enemies"][number]["pattern"];
            return enemy
              ? [
                  {
                    enemy,
                    level: Number(
                      r.querySelector<HTMLInputElement>("[data-enemy-level]")!
                        .value,
                    ),
                    count: Number(
                      r.querySelector<HTMLInputElement>("[data-count]")!.value,
                    ),
                    ...(pattern ? { pattern } : {}),
                  },
                ]
              : [];
          },
        ),
        seed: Number($<HTMLInputElement>("#lab-seed").value),
        lockHealth: $<HTMLInputElement>("#lab-lock-health").checked,
      };
      const nextCombat = laboratory(pack, nextConfig);
      config = nextConfig;
      combat = nextCombat;
      origin = { x: combat.anchor.x - 450, y: combat.anchor.y - 330 };
      paused = true;
      profile = "";
      clock.reset();
      $("#lab-error").textContent = "已建立獨立戰鬥。";
      report();
      draw();
    } catch (e) {
      $("#lab-error").textContent = e instanceof Error ? e.message : String(e);
    }
  }
  function report() {
    if (!combat) return;
    const c = combat;
    $("[data-lab=pause]").textContent = paused
      ? c.time
        ? "繼續戰鬥"
        : "開始戰鬥"
      : "暫停戰鬥";
    const nextProfile = c.allies
      .map((u) => `${u.id}:${u.def}:${u.skillLevel}:${u.skillOverride}`)
      .join("|");
    if (profile !== nextProfile) {
      profile = nextProfile;
      $("#lab-casts").innerHTML = c.allies
        .map(
          (u) =>
            `<button data-lab="cast" data-unit="${esc(u.id)}" ${u.hp <= 0 || u.skillCooldown > 0 || c.ended ? "disabled" : ""}>${esc(u.name)} · ${esc(c.skillFor(u)?.name ?? "無技能")} ${u.skillCooldown > 0 ? u.skillCooldown.toFixed(1) + "s" : "施放"}</button>`,
        )
        .join("");
      $("#lab-skill-info").innerHTML = c.allies
        .map((u) => {
          const s = c.skillFor(u);
          return `<details><summary>${esc(u.name)} · 技能Lv${u.skillLevel ?? 1}</summary><p>${esc(s ? skillMechanic(s) : "無技能")}</p></details>`;
        })
        .join("");
    }
    for (const u of c.allies) {
      const b = root.querySelector<HTMLButtonElement>(
        `[data-lab="cast"][data-unit="${u.id}"]`,
      );
      if (b) {
        b.disabled = u.hp <= 0 || u.skillCooldown > 0 || c.ended;
        b.textContent = `${u.name} · ${c.skillFor(u)?.name ?? "無技能"} ${u.skillCooldown > 0 ? u.skillCooldown.toFixed(1) + "s" : "施放"}`;
      }
    }
    $("#lab-metrics").innerHTML =
      `<p>${paused ? "暫停" : "運行"} · ${c.time.toFixed(2)}s · seed ${config?.seed} · 彈體 ${c.bullets.length} · 範圍場 ${c.mechanics.fields.length} ${c.ended ? (c.victory ? " · 我方勝利" : " · 我方敗北") : ""}</p><table><thead><tr><th>單位</th><th>生命</th><th>造成傷害</th><th>技能次數</th></tr></thead><tbody>${c.units.map((u) => `<tr><td>${esc(u.name)}</td><td>${Math.ceil(u.hp)} / ${Math.ceil(u.maxHp)}</td><td>${c.mechanics.damageDealt[u.id] ?? 0}</td><td>${c.mechanics.casts[u.id] ?? 0}</td></tr>`).join("")}</tbody></table>`;
    $("#lab-debug").textContent = JSON.stringify(
      {
        time: c.time,
        units: c.units.map((u) => ({
          id: u.id,
          definition: u.def,
          hp: u.hp,
          maxHp: u.maxHp,
          x: u.x,
          y: u.y,
          attack: u.attack * c.mechanics.stat(u, "attack"),
          defense: u.defense * c.mechanics.stat(u, "defense"),
          cooldown: u.skillCooldown,
        })),
        storedDamage: Object.fromEntries(c.mechanics.storedDamage),
        dashes: c.mechanics.dashes,
        pending: c.mechanics.pending.map((p) => ({
          at: p.at,
          owner: p.owner,
          kind: p.action.kind,
          target: p.target,
        })),
        statuses: Object.fromEntries(c.mechanics.statuses),
        fields: c.mechanics.fields.map((f) => ({
          kind: f.action.kind,
          radius: f.action.radius,
          width: f.action.width,
          until: f.until,
        })),
        content: pack.version,
        config,
      },
      null,
      2,
    );
  }
  function draw() {
    ctx.fillStyle = "#071522";
    ctx.fillRect(0, 0, 1100, 660);
    if (!combat) return;
    const c = combat;
    origin = { x: c.anchor.x - 450, y: c.anchor.y - 330 };
    ctx.save();
    ctx.translate(-origin.x, -origin.y);
    ctx.strokeStyle = "#173241";
    ctx.lineWidth = 1;
    for (let x = origin.x; x < origin.x + 1100; x += 55) {
      ctx.beginPath();
      ctx.moveTo(x, origin.y);
      ctx.lineTo(x, origin.y + 660);
      ctx.stroke();
    }
    for (let y = origin.y; y < origin.y + 660; y += 55) {
      ctx.beginPath();
      ctx.moveTo(origin.x, y);
      ctx.lineTo(origin.x + 1100, y);
      ctx.stroke();
    }
    for (const f of c.mechanics.fields) {
      ctx.save();
      ctx.strokeStyle = f.color;
      ctx.fillStyle = f.color + "0b";
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (f.action.kind === "beam") {
        ctx.translate(f.x, f.y);
        ctx.rotate(f.angle);
        const beam = ctx.createLinearGradient(
          0,
          -f.action.width / 2,
          0,
          f.action.width / 2,
        );
        beam.addColorStop(0, f.color + "00");
        beam.addColorStop(0.35, f.color + "55");
        beam.addColorStop(0.5, "#ffffffaa");
        beam.addColorStop(0.65, f.color + "55");
        beam.addColorStop(1, f.color + "00");
        ctx.fillStyle = beam;
        ctx.fillRect(
          0,
          -f.action.width / 2,
          f.reach ?? f.action.radius,
          f.action.width,
        );

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, -2, f.reach ?? f.action.radius, 4);
      } else {
        ctx.arc(f.x, f.y, f.radius ?? f.action.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        if (f.action.pull) {
          for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            ctx.arc(
              f.x,
              f.y,
              15 + ((c.time * 90 + i * 35) % 140),
              0,
              Math.PI * 2,
            );
            ctx.stroke();
          }
          for (let arm = 0; arm < 3; arm++) {
            ctx.beginPath();
            for (let i = 0; i < 30; i++) {
              const radius = 48 + i * 3,
                angle = c.time * 2 + (arm * Math.PI * 2) / 3 + i * 0.15;
              const x = f.x + Math.cos(angle) * radius,
                y = f.y + Math.sin(angle) * radius * 0.65;
              i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
            }
            ctx.stroke();
          }
          ctx.strokeStyle = "#dfceff";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.ellipse(f.x, f.y, 56, 35, -0.4, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = "#02030a";
          ctx.beginPath();
          ctx.arc(f.x, f.y, 50, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }
    for (const d of c.mechanics.dashes) {
      const u = c.units.find((u) => u.id === d.owner);
      if (!u) continue;
      ctx.strokeStyle = u.color;
      ctx.globalAlpha = 0.15;
      ctx.lineWidth = d.action.width;
      ctx.beginPath();
      ctx.moveTo(d.from.x, d.from.y);
      ctx.lineTo(u.x, u.y);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    for (const b of c.bullets) {
      ctx.strokeStyle = b.color;
      ctx.lineWidth = b.pattern === "piercing" ? 5 : 3;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      const speed = Math.hypot(b.vx, b.vy) || 1;
      ctx.lineTo(b.x - (b.vx / speed) * 20, b.y - (b.vy / speed) * 20);
      ctx.stroke();
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.pattern === "homing" ? 5 : 3, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const u of c.units) {
      if (u.hp <= 0) continue;
      if (u.windup > 0) {
        const v = c.volleyFor(u);
        ctx.strokeStyle = "#ffb68a";
        ctx.globalAlpha = 0.45;
        ctx.lineWidth = v.pattern === "laser" ? 24 : 1;
        ctx.beginPath();
        ctx.moveTo(u.x, u.y);
        ctx.lineTo(
          u.x + Math.cos(u.aim) * u.range,
          u.y + Math.sin(u.aim) * u.range,
        );
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.globalAlpha = u.summonKind === "clone" ? 0.6 : 1;
      const texturedTurret = u.summonKind === "turret";
      const img = imageFor(texturedTurret ? turretArt.key : u.sprite);
      if (texturedTurret && img?.complete && img.naturalWidth) {
        const w = turretArt.worldWidth * c.mechanics.stat(u, "scale"),
          h = (w * img.naturalHeight) / img.naturalWidth;
        ctx.save();
        ctx.translate(u.x, u.y);
        ctx.rotate(u.aim);
        ctx.drawImage(
          img,
          -w * turretArt.pivot.x,
          -h * turretArt.pivot.y,
          w,
          h,
        );
        ctx.restore();
      } else if (img?.complete && img.naturalWidth) {
        const h = (u.boss ? 110 : 70) * c.mechanics.stat(u, "scale"),
          w = (h * img.naturalWidth) / img.naturalHeight;
        ctx.drawImage(img, u.x - w / 2, u.y - h / 2, w, h);
      } else {
        ctx.fillStyle = u.color;
        ctx.beginPath();
        ctx.arc(u.x, u.y, u.boss ? 35 : 16, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.strokeStyle = u.color;
      ctx.lineWidth = 2;
      for (const s of c.mechanics.active(u)) {
        if (s.interceptRadius && s.stat !== "directional") {
          ctx.globalAlpha = 0.3;
          ctx.beginPath();
          ctx.arc(u.x, u.y, s.interceptRadius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        ctx.beginPath();
        if (s.stat === "directional") {
          const ends = barrierEnds(u, s.interceptRadius || 160);
          ctx.lineWidth = 4;
          ctx.moveTo(ends.x1, ends.y1);
          ctx.lineTo(ends.x2, ends.y2);
        } else if (s.stat === "stun") {
          for (let i = 0; i < 3; i++) {
            const a = c.time * 3 + (i * Math.PI * 2) / 3;
            ctx.moveTo(u.x + Math.cos(a) * 25, u.y - 32 + Math.sin(a) * 7);
            ctx.lineTo(u.x + Math.cos(a) * 25 + 4, u.y - 36 + Math.sin(a) * 7);
          }
        } else {
          ctx.arc(u.x, u.y, 29 + Math.sin(c.time * 3) * 3, 0, Math.PI * 2);
        }
        ctx.stroke();
      }
      ctx.fillStyle = "#152936";
      ctx.fillRect(u.x - 25, u.y + 40, 50, 4);
      ctx.fillStyle = u.side === "ally" ? "#8ce6d7" : "#ff8e7e";
      ctx.fillRect(u.x - 25, u.y + 40, (50 * u.hp) / u.maxHp, 4);
      ctx.font = "13px sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "#e5f1ee";
      ctx.fillText(u.name, u.x, u.y + 60);
      if (c.target === u.id) {
        ctx.strokeStyle = "#f8d48b";
        ctx.strokeRect(u.x - 28, u.y - 30, 56, 60);
      }
    }
    for (const f of c.flashes) {
      ctx.globalAlpha = Math.min(1, f.life * 3);
      ctx.strokeStyle = f.color;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.radius * (1 - f.life / 2), 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
  function tick(now: number) {
    if (disposed) return;
    const raw = last ? Math.max(0, now - last) : 0;
    last = now;
    if (combat) {
      combat.autoSkills = $<HTMLInputElement>("#lab-auto").checked;
      try {
        clock.advance(
          raw * Number($<HTMLSelectElement>("#lab-speed").value),
          paused || document.hidden || combat.ended,
          (dt) => combat!.step(dt),
        );
      } catch (e) {
        paused = true;
        clock.reset();
        $("#lab-error").textContent = String(e);
      }
    }
    draw();
    if (now - lastReport > 150) {
      report();
      lastReport = now;
    }
    frame = requestAnimationFrame(tick);
  }
  root.addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>("[data-lab]");
    if (!b) return;
    e.preventDefault();
    if (b.dataset.lab === "close") destroy();
    if (b.dataset.lab === "start") start();
    if (b.dataset.lab === "pause") paused = !paused;
    if (b.dataset.lab === "step") {
      paused = true;
      try {
        combat?.step(1 / 60);
      } catch (e) {
        $("#lab-error").textContent = String(e);
      }
    }
    if (b.dataset.lab === "cast") {
      try {
        combat?.cast(b.dataset.unit!);
      } catch (e) {
        paused = true;
        $("#lab-error").textContent = String(e);
      }
    }
    report();
    draw();
  });
  root.addEventListener("change", (e) => {
    if ((e.target as HTMLElement).id === "lab-lock-health" && combat) {
      combat.lockHealth = $<HTMLInputElement>("#lab-lock-health").checked;
      if (config) config.lockHealth = combat.lockHealth;
    }
  });
  canvas.addEventListener("pointerdown", (e) => {
    if (!combat) return;
    const box = canvas.getBoundingClientRect(),
      x = ((e.clientX - box.left) * 1100) / box.width + origin.x,
      y = ((e.clientY - box.top) * 660) / box.height + origin.y;
    const t = combat.units.find(
      (u) =>
        u.side === "enemy" && u.hp > 0 && Math.hypot(u.x - x, u.y - y) < 45,
    );
    if (t) combat.target = t.id;
    else combat.destination = { x, y };
  });
  const keydown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      destroy();
      return;
    }
    if (e.key === "Tab") {
      const focusable = [
        ...root.querySelectorAll<HTMLElement>(
          "button,input,select,summary,canvas[tabindex]",
        ),
      ].filter(
        (el) => el.offsetParent !== null && !(el as HTMLButtonElement).disabled,
      );
      const first = focusable[0],
        last = focusable.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
  };
  const visibility = () => {
    clock.reset();
    last = 0;
  };
  document.addEventListener("visibilitychange", visibility);
  root.addEventListener("keydown", keydown);
  root.querySelector<HTMLButtonElement>("[data-lab=close]")?.focus();
  function destroy() {
    disposed = true;
    cancelAnimationFrame(frame);
    root.removeEventListener("keydown", keydown);
    document.removeEventListener("visibilitychange", visibility);
    if (background) background.inert = false;
    previousFocus?.focus();
    root.remove();
  }
  start();
  frame = requestAnimationFrame(tick);
  return destroy;
}
