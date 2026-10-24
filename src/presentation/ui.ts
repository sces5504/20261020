import { operatorCard, updateOperatorCard } from "./operator-card";
import { resonancePanel, resonanceAction } from "./resonance-ui";
import "./ui-polish.css";
import "./ui-mature.css";
import "./ui-resonance.css";
import { journalHtml } from "./journal";
import { mainlineHtml, missionCardsHtml } from "./mainline";
import { regionPath } from "../domain/navigation";
import { mountStoryPlayer, nearStoryPlanet } from "./story-player";
import { storyAvailable } from "../domain/story";
import { rosterGroups } from "./roster-groups";
import {
  questClaimed,
  questProgress,
  questResetAt,
} from "../domain/daily-quests";
import { resourceIcon } from "./common";
import { icon } from "./icons";
import { skillMechanic, patternNames } from "../content/descriptions";
import { ask } from "./dialog";
import { AudioMixer } from "../platform/audio";
import { acquisitionSources } from "../content/queries";
import type { Game } from "../application/game";
import type { Pack, Character } from "../content/schema";
import {
  stats,
  costScale,
  newSave,
  canAfford,
  maxSkillLevel,
  skillAtLevel,
  skillResearchCost,
  skillResearchGate,
  type Save,
} from "../domain/model";
import { production, questReady, summonCandidates } from "../domain/economy";
import {
  nodeUnlocked,
  nodeCleared,
  nodeAvailability,
  nodeKindNames,
  nodeVisible,
  nodePeriod,
  enemyStats,
  storyFields,
} from "../domain/world";
import { download, read } from "../platform/storage";
import { mountSpace } from "./space";
import { esc, button, amounts, portrait, entityImage, stars } from "./common";
export { esc } from "./common";
export function mountGame(root: HTMLElement, g: Game, test: boolean) {
  const p = g.pack;
  const audio = new AudioMixer(p);
  let intelOpen = g.viewMode === "map";
  const firstTarget = () =>
    p.planets.find(
      (v) =>
        v.region === g.save.region &&
        v.kind === "planet" &&
        v.initiallyCleared &&
        !g.save.colonies[v.id]?.active,
    ) ??
    p.planets.find(
      (v) =>
        v.region === g.save.region && nodeVisible(g.save, v, p, Date.now()),
    );
  let selected = firstTarget()?.id ?? "",
    panel = "",
    sub = "",
    storyId = "",
    storyIndex = 0,
    currentAcquisition = "",
    arrivalReturnPanel = "",
    timer: number;
  // Phones start with the side missions folded so the map stays open; the choice is remembered.
  let missionsCollapsed = (() => {
    try {
      const saved = localStorage.getItem("stella:missions-collapsed");
      return saved === null ? window.innerWidth < 760 : saved === "1";
    } catch {
      return window.innerWidth < 760;
    }
  })();
  let mainlineKey = "",
    missionsKey = "";
  let journalTab = "story",
    journalChapter = "";
  let recipe = p.characters[0].recipe.slice(),
    count = 1;
  let cleanup: () => void | Promise<void> = () => {};
  let disposed = false;
  root.innerHTML = `<main class="bridge"><header class="topbar"><a class="brand" href="#/play"><span class="brand-icon">✧</span><span>GALAXY ANGEL<small>星 河 戰 姬</small></span></a><div id="wallet" class="wallet"></div><div class="top-actions">${button("設定", "panel", "archive", "icon-button")}<a class="studio-link" href="gallery.html">角色圖鑑 ↗</a><a class="studio-link" href="#/studio">內容工坊 ↗</a></div></header>
 <div class="sector-heading"><div id="skill-splash" class="skill-splash" aria-live="polite"></div><div><span class="eyebrow">GALACTIC EXPEDITION</span><h1><b id="region-title">${esc(p.regions.find((r) => r.id === g.save.region)!.name)}</b><span>探索航線</span></h1></div><button class="journal-shortcut" data-action="journal-open" data-id="quests">${icon("journal")}<span id="journal-status">章節／任務</span> →</button><div id="mainline" class="mainline" aria-live="polite"></div><button id="missions-toggle" class="missions-toggle" data-action="missions-toggle"></button><div id="missions" class="missions"></div><div class="sector-status"><i></i> <span id="save-status">本機自動保存</span>${test ? "<strong>隔離測試</strong>" : ""}</div></div>
 <section class="viewport"><aside class="mission-rail"><div class="section-label">航行目標 <span>MISSION</span></div><div id="mission"></div><div class="rail-bottom"><span class="eyebrow">NAVIGATION</span><p>WASD／點擊星海航行<br>M 切換大星圖</p><div class="signal"><i></i><i></i><i></i><i></i><i></i></div><small>艦隊通訊連線中</small></div></aside>
 <div id="space" class="space" aria-label="星域戰場，點擊空白處移動，點擊星球查看情報" role="application"></div><div class="map-caption"><span>✧ 星域掃描</span><span id="coordinates"></span></div><div id="target-hud" class="target-hud" hidden aria-label="目前戰鬥目標"></div><div id="battle-state" class="battle-state"></div><div id="battle-tools" class="battle-tools"></div><div id="joystick" class="joystick" aria-hidden="true"><span></span></div><aside id="planet-card" class="planet-card"></aside></section>
 <footer class="flight-deck"><div class="squad-heading"><span class="eyebrow">YOUR CONSTELLATION</span><strong>航行編隊</strong>${button("編隊 ↗", "panel", "formation", "text-button")}</div><div class="squad" id="squad"></div><nav class="deck-nav" aria-label="艦隊功能">${navButton("星體共鳴", "共鳴", "RESONANCE", "resonance", "summon")}${navButton("共振研究", "研究", "RESEARCH", "research", "research")}${navButton("高難／活動", "挑戰", "SORTIE", "challenge", "challenges")}${navButton("航行紀錄", "紀錄", "CHRONICLE", "journal", "quests")}${navButton("領地", "領地", "COLONY", "planet", "planets")}${navButton("角色", "角色", "OPERATORS", "crew", "roster")}</nav></footer>
 <div class="build-note">v${p.version} · ${p.characters.filter((c) => c.status === "active").length} 位少女／${p.regions.filter((r) => r.status === "active").length} 個航區</div><div class="toast" id="toast" role="status" aria-live="polite"></div><div id="overlay"></div></main>`;
  function navButton(
    label: string,
    short: string,
    english: string,
    glyph: Parameters<typeof icon>[0],
    id: string,
    action = "panel",
  ) {
    return `<button data-action="${action}" data-id="${id}" aria-label="${label}"><span class="deck-symbol">${icon(glyph)}</span><span class="deck-label">${short}<small>${english}</small></span></button>`;
  }
  const $ = (s: string) => root.querySelector<HTMLElement>(s)!;
  const space = mountSpace(
    $("#space"),
    g,
    (id) => {
      selected = id;
      intelOpen = true;
      space.select(id);
      renderPlanet();
    },
    audio,
  );
  // Touch joystick: drives the same movement vector as WASD.
  const stick = $("#joystick"),
    knob = stick.querySelector<HTMLElement>("span")!;
  let stickId = -1;
  const steer = (e: PointerEvent) => {
    const r = stick.getBoundingClientRect(),
      dx = e.clientX - (r.left + r.width / 2),
      dy = e.clientY - (r.top + r.height / 2),
      max = r.width / 2,
      len = Math.hypot(dx, dy),
      k = len > max ? max / len : 1;
    knob.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
    g.movement = len > 10 ? { x: dx, y: dy } : { x: 0, y: 0 };
  };
  const release = () => {
    stickId = -1;
    knob.style.transform = "";
    g.movement = { x: 0, y: 0 };
  };
  stick.addEventListener("pointerdown", (e) => {
    stickId = e.pointerId;
    stick.setPointerCapture(e.pointerId);
    steer(e);
    e.preventDefault();
  });
  stick.addEventListener("pointermove", (e) => {
    if (e.pointerId === stickId) steer(e);
  });
  stick.addEventListener("pointerup", release);
  stick.addEventListener("pointercancel", release);
  const disposeStory = mountStoryPlayer(root, g, () => {
    panel = "";
    drawPanel();
  });
  space.select(selected);
  $("#planet-card").hidden = true;
  let planetKey = "";
  function renderPlanet() {
    root.querySelector(".bridge")?.classList.toggle("in-battle", !!g.combat);
    let v = p.planets.find(
      (v) => v.id === selected && v.region === g.save.region,
    );
    if (!v) {
      v = firstTarget();
      selected = v?.id ?? "";
    }
    if (!v) {
      $("#planet-card").hidden = true;
      return;
    }
    const s = g.save,
      col = s.colonies[v.id],
      locked = !nodeUnlocked(s, v, p),
      cleared = nodeCleared(s, v);
    $("#planet-card").hidden =
      !intelOpen ||
      !!g.combat ||
      (g.viewMode === "explore" && !g.discovered.has(v.id));
    if (!nodeVisible(s, v, p, Date.now())) $("#planet-card").hidden = true;
    const key = JSON.stringify([
      intelOpen,
      g.viewMode,
      g.discovered.has(v.id),
      v.id,
      col?.active,
      col?.lost,
      col?.buildings,
      p.resources.map((r) => Math.floor(s.wallet[r.id] ?? 0)),
      locked,
      cleared,
      !!g.combat,
      v.schedule ? nodeAvailability(s, v, Date.now()) : null,
      Math.hypot(g.x - v.x, g.y - v.y) <= v.engageRadius,
      v.kind === "camp"
        ? s.roster
            .filter((o) => s.team.includes(o.id))
            .map((o) => [
              o.id,
              o.hp,
              o.level,
              o.resonance,
              s.jobs.some((j) => j.owner === o.id),
            ])
        : null,
    ]);
    if (key === planetKey) return;
    planetKey = key;
    const levels = v.enemies.map((e) => e.level ?? 1);
    const threat = levels.length
      ? `敵群 Lv.${Math.min(...levels)}${Math.min(...levels) !== Math.max(...levels) ? "～" + Math.max(...levels) : ""} · ${v.enemies.reduce((n, e) => n + e.count, 0)} 艘`
      : "無守軍";
    if (v.kind !== "planet") {
      const availability = nodeAvailability(s, v, Date.now());
      const nearby = Math.hypot(g.x - v.x, g.y - v.y) <= v.engageRadius;
      const injured = s.roster.filter(
        (o) =>
          s.team.includes(o.id) &&
          o.hp < stats(p, o).hp &&
          !s.jobs.some((j) => j.owner === o.id),
      ).length;
      const serviceCost = Object.fromEntries(
        Object.entries(v.resupplyCost ?? p.rules.healCost).map(([id, n]) => [
          id,
          n * injured,
        ]),
      );
      const freeService = !Object.values(
        v.resupplyCost ?? p.rules.healCost,
      ).some((n) => n > 0);
      const text =
        (v.kind === "camp"
          ? `${freeService ? "免費停靠整補" : "停靠整補"}，需${p.rules.healSeconds}秒；不生產資源、不能建設。`
          : v.objective === "damage"
            ? `${v.timeLimitSeconds}秒內累積傷害，依實際傷害比例結算；管理面板與離線不推進挑戰。`
            : "清除單波守軍即可完成據點；不提供星球產能。") +
        " " +
        threat;
      $("#planet-card").innerHTML =
        `${button("✕", "intel-close", "", "intel-dismiss")}<div class="section-label">${esc(nodeKindNames[v.kind])}</div>${entityImage(p, v, "intel-planet-art")}<h2>${esc(v.name)}</h2><p class="intel-guidance">${locked ? "請先完成前置據點／星球啟動。" : esc(text)}</p><div class="tags"><span>${cleared && !v.schedule ? "已完成" : "可探索"}</span><span>${esc(availability.reason || nodeKindNames[v.kind])}</span></div><div class="costs">${amounts(p, v.kind === "camp" ? serviceCost : v.reward)}</div>${v.enemies.length ? button("敵群情報", "panel", "enemy-intel", "text-button") : ""}${button("導航接近 →", "navigate", v.id, "primary", locked || !!g.combat)}${v.kind === "camp" ? button("隊伍整補", "resupply", v.id, "primary", locked || !nearby || !!g.combat || !injured || !canAfford(s, serviceCost)) : storyFields(p).has(v.id) ? button("劇情出擊", "flow-open", s.story.session?.quest ?? "", "primary", !nearStoryPlanet(g, v.id) || !!g.combat) : button(cleared && !v.schedule ? "再次挑戰（無首勝獎勵）" : "開始挑戰", "battle", v.id, "primary", locked || !nearby || !availability.open || !!g.combat)}`;
      return;
    }
    const missing = Object.entries(v.activationCost)
      .filter(([id, n]) => (s.wallet[id] ?? 0) < n)
      .map(
        ([id, n]) =>
          `${p.resources.find((r) => r.id === id)?.name} ${(n - (s.wallet[id] ?? 0)).toFixed(0)}`,
      );
    $("#planet-card").innerHTML =
      `${button("✕", "intel-close", "", "intel-dismiss")}<div class="section-label">星球情報 <span>INTEL</span></div>${entityImage(p, v, "intel-planet-art")}<span class="eyebrow">${col?.active ? "COLONY" : "UNEXPLORED SIGNAL"}</span><h2>${esc(v.name)}</h2><div class="tags"><span>${locked ? "航線未開放" : col?.lost ? "生產待恢復" : cleared ? "已解放" : "敵方佔領"}</span><span>${v.enemies.some((e) => p.enemies.find((v) => v.id === e.enemy)?.boss) ? "首領訊號" : "一般據點"}</span></div><p class="${locked || !col?.active ? "intel-guidance" : ""}">${
        locked
          ? `完成 ${[
              ...v.requires.filter(
                (id) => !nodeCleared(s, p.planets.find((v) => v.id === id)!),
              ),
              ...v.requiresActive.filter((id) => !s.colonies[id]?.active),
            ]
              .map((id) => esc(p.planets.find((p) => p.id === id)?.name ?? id))
              .join("、")} 的解放／啟動前置以開啟航路。`
          : col?.lost
            ? "設施已停產。修復後即可恢復生產。"
            : col?.active
              ? "生產設施運作中。可於領地總覽統一管理全部星球。"
              : cleared
                ? "守軍已清除，可啟動星球生產。"
                : `靠近守軍自動交戰；清除所有守軍即可解放。離開交戰邊界${v.resetSeconds}秒會重置，畫面會事先警告。`
      }</p><div class="intel-row"><span>偵測敵群</span><strong>${v.enemies.reduce((a, b) => a + b.count, 0)} 組訊號</strong></div><div class="intel-row"><span>${col?.active ? "每分鐘產量" : "首次解放獎勵"}</span></div><div class="costs">${amounts(p, col?.active ? Object.fromEntries(Object.entries(v.production).map(([id, n]) => [id, n * 60])) : v.reward)}</div>${v.enemies.length ? button("敵群情報", "panel", "enemy-intel", "text-button") : ""}${col?.active ? button("管理星球 →", "panel", "colony", "primary") : cleared ? button("啟動星球 →", "activate", v.id, "primary", locked || missing.length > 0) : button("導航接近 · 自動交戰 →", "navigate", v.id, "primary", locked || !!g.combat)}${cleared && !col?.active ? `<div class="costs">${amounts(p, v.activationCost)}</div>${missing.length ? `<p class="intel-guidance" role="status">尚缺：${esc(missing.join("、"))}</p>` : ""}` : ""}`;
  }
  let missionKey = "";
  function renderMission() {
    const scheduled = p.planets.find(
      (v) => v.region === g.save.region && v.schedule,
    );
    const key = JSON.stringify([
      g.save.region,
      g.save.jobs.map((j) => [j.id, j.ends]),
      g.save.quests,
      g.save.cleared,
      g.save.dailyAttempts,
      scheduled ? nodePeriod(scheduled, Date.now()) : "",
      Object.entries(g.save.colonies).map(([id, c]) => [id, c.active, c.lost]),
    ]);
    if (key === missionKey) return;
    missionKey = key;
    const pending = g.save.jobs
      .map((j) => {
        const label =
          j.kind === "build"
            ? "等待建設中"
            : j.kind === "research"
              ? "等待研究中"
              : j.kind === "summon"
                ? "等待共鳴中"
                : "等待整補中";
        const name =
          p.buildings.find((b) => b.id === j.definition)?.name ??
          p.research.find((r) => r.id === j.definition)?.name ??
          (j.kind === "summon" ? "星體共鳴" : "少女整補");
        return `<div class="mission-waiting" data-job="${esc(j.id)}">${jobArt(j)}<strong>${label}</strong><span>${esc(name)}</span><small data-ends="${j.ends}"></small></div>`;
      })
      .join("");
    const ready = p.quests.find(
      (q) =>
        !questClaimed(g.save, q, Date.now()) &&
        questReady(g.save, q, Date.now()),
    );
    const next = p.planets.find(
      (v) =>
        v.region === g.save.region &&
        (!nodeCleared(g.save, v) ||
          (v.kind === "planet" && !g.save.colonies[v.id]?.active)) &&
        v.kind !== "camp" &&
        v.kind !== "dailyBoss" &&
        nodeUnlocked(g.save, v, p),
    );
    const regionPlanets = p.planets.filter(
      (v) =>
        v.region === g.save.region &&
        v.kind !== "camp" &&
        v.kind !== "dailyBoss",
    );
    const localCleared = regionPlanets.filter((v) =>
      nodeCleared(g.save, v),
    ).length;
    if (!regionPlanets.length) {
      const daily = p.planets.find(
        (v) =>
          v.region === g.save.region &&
          v.kind === "dailyBoss" &&
          nodeVisible(g.save, v, p, Date.now()),
      );
      if (daily?.schedule) {
        const attempt = g.save.dailyAttempts[g.save.region];
        const availability = nodeAvailability(g.save, daily, Date.now());
        const used =
          attempt?.period === availability.period ? attempt.count : 0;
        $("#mission").innerHTML =
          `<span class="eyebrow">DAILY BOSS</span><h3>每日母艦挑戰</h3><p>本日剩餘 ${Math.max(0, daily.schedule.attemptLimit - used)} / ${daily.schedule.attemptLimit} 次。抵達母艦後手動開始；限時累積傷害，依比例結算四資源。</p>${button("星域航路 →", "panel", "regions", "primary")}`;
        return;
      }
      $("#mission").innerHTML =
        `<span class="eyebrow">TEST SECTOR</span><h3>${esc(p.regions.find((r) => r.id === g.save.region)!.name)}</h3><p>此處目前沒有星球與敵人，可自由航行。開啟星域航路即可返回；後續由內容包擴充。</p>${button("星域航路 →", "panel", "regions", "primary")}<div class="mission-jobs">${pending}</div>`;
      return;
    }
    $("#mission").innerHTML =
      `<div class="mission-number">${String(Math.min(localCleared + 1, regionPlanets.length)).padStart(2, "0")}<span>／ ${String(regionPlanets.length).padStart(2, "0")}</span></div><h3>${ready ? "新的航行紀錄" : next ? "追尋下一道訊號" : "星域航路已開啟"}</h3><p>${ready ? esc(ready.name) : next ? `解放 ${esc(next.name)}<br>拓展我們的星海航跡` : "發展據點、收集少女，為下一段旅程準備。"}</p>${button(ready ? "查看紀錄 →" : "追蹤航路 →", ready ? "panel" : "track", ready ? "quests" : (next?.id ?? regionPlanets[0].id), "text-button")}${button("操作指南 ↗", "panel", "guide", "text-button")}<div class="progress-track"><span style="width:${(localCleared / regionPlanets.length) * 100}%"></span></div><small>星域解放 ${localCleared} / ${regionPlanets.length}</small><div class="mission-jobs">${pending}</div>`;
  }
  let squadKey = "";
  function renderSquad() {
    const s = g.save;
    const key = JSON.stringify([
      s.team,
      s.roster.map((o) => [o.id, o.level, o.resonance]),
      !!g.combat,
    ]);
    const operators = s.team.map((id, slot) => {
      const o = s.roster.find((o) => o.id === id)!,
        c = p.characters.find((c) => c.id === o.definition)!;
      const unit = g.combat?.allies.find((u) => u.id === id);
      const skill =
        (unit ? g.combat?.skillFor(unit) : undefined) ??
        skillAtLevel(p.skills.find((sk) => sk.id === c.skill)!, o.skillLevel ?? 1);
      return { o, c, unit, skill, slot };
    });
    if (key !== squadKey) {
      squadKey = key;
      $("#squad").style.setProperty("--team-count", String(s.team.length));
      $("#squad").innerHTML = operators
        .map((v) => operatorCard(p, v.c, v.o, v.skill, v.slot, !!g.combat))
        .join("");
    }
    for (const v of operators) {
      const card = root.querySelector<HTMLElement>(
        `.squad-card[data-id="${CSS.escape(v.o.id)}"]`,
      );
      if (card)
        updateOperatorCard(
          card,
          v.unit,
          v.unit?.hp ?? v.o.hp,
          v.unit?.maxHp ?? stats(p, v.o).hp,
          v.skill,
          !!g.combat,
        );
    }
  }
  function renderTargetHud() {
    const host = $("#target-hud"),
      combat = g.combat;
    // Only bosses earn the top health bar; regular enemies keep their in-field bars.
    const target =
      combat?.units.find(
        (u) => u.id === combat.target && u.hp > 0 && u.boss,
      ) ?? combat?.units.find((u) => u.side === "enemy" && u.hp > 0 && u.boss);
    host.hidden = !target;
    if (!target) {
      host.dataset.key = "";
      return;
    }
    const key = target.id + target.sprite;
    if (host.dataset.key !== key) {
      host.dataset.key = key;
      const art = p.assets.find((a) => a.id === target.sprite);
      host.innerHTML = `<span class="target-portrait">${art ? `<img src="${esc(art.src)}" alt="">` : icon("challenge")}</span><div class="target-copy"><div class="target-heading"><span>${target.boss ? "BOSS SIGNAL" : "HOSTILE SIGNAL"}</span><small class="target-health-numbers"></small></div><strong>${esc(target.name)}</strong><div class="target-health"><span></span></div></div><span class="target-lock" aria-hidden="true">${icon("challenge")}</span>`;
    }
    host.querySelector<HTMLElement>(".target-health > span")!.style.width =
      `${Math.max(0, (target.hp / target.maxHp) * 100)}%`;
    host.querySelector(".target-health-numbers")!.textContent =
      `${Math.ceil(target.hp).toLocaleString("zh-TW")} / ${Math.ceil(target.maxHp).toLocaleString("zh-TW")}`;
  }
  function jobArt(j: Save["jobs"][number]) {
    const entity =
      j.kind === "build"
        ? p.buildings.find((b) => b.id === j.definition)
        : j.kind === "research"
          ? p.research.find((r) => r.id === j.definition)
          : j.kind === "heal"
            ? p.characters.find(
                (c) =>
                  c.id ===
                  g.save.roster.find((o) => o.id === j.owner)?.definition,
              )
            : undefined;
    return `<span class="job-art" aria-label="${j.kind === "summon" ? "星體共鳴" : j.kind === "build" ? "建造中" : "工作中"}">${entity ? entityImage(p, entity) || icon("research") : icon("resonance")}</span>`;
  }
  function jobList() {
    return g.save.jobs.length
      ? g.save.jobs
          .map(
            (j) =>
              `<div class="job" data-job="${esc(j.id)}">${jobArt(j)}<span>${esc((j.kind === "build" ? "等待建設中 · " : j.kind === "research" ? "等待研究中 · " : j.kind === "heal" ? "等待整補中 · " : "等待共鳴中 · ") + (j.kind === "summon" ? "星體共鳴" : j.kind === "heal" ? "整補治療" : (p.buildings.find((v) => v.id === j.definition)?.name ?? p.research.find((v) => v.id === j.definition)?.name ?? j.kind)))}</span><strong data-ends="${j.ends}"></strong></div>`,
          )
          .join("")
      : '<p class="muted">目前沒有進行中的工作。</p>';
  }
  function heading(title: string, kicker: string) {
    return `<div class="modal-heading"><div><span class="eyebrow">${kicker}</span><h2>${esc(title)}</h2></div>${button("✕", "close", "", "icon-button")}</div>`;
  }
  function rosterHtml() {
    return `<div class="character-grid">${rosterGroups(g.save)
      .map(({ primary: o, copies }) => {
        const c = p.characters.find((c) => c.id === o.definition)!,
          st = stats(p, o),
          skill = skillAtLevel(
            p.skills.find((s) => s.id === c.skill)!,
            o.skillLevel ?? 1,
          ),
          assigned = Object.entries(g.save.colonies).find(
            ([, v]) => v.assigned === o.id,
          );
        return `<article class="character-card">${button(portrait(p, c, true), "character", o.id, "portrait-button")}<div class="character-info"><span class="rarity">${stars(c, o)}</span><h3>${esc(c.name)} <small>Lv.${o.level}</small></h3><small>持有 ${copies.length} 位${copies.length > 1 ? " · 重複角色可於詳情同調" : ""}</small><p>${esc(c.role)}</p><div class="stat-grid"><span>生命<strong>${Math.ceil(o.hp)} / ${st.hp}</strong></span><span>攻擊<strong>${Math.round(st.attack)}</strong></span><span>防禦<strong>${Math.round(st.defense)}</strong></span></div><p><strong>${esc(skill.name)}</strong> <small>技能Lv${o.skillLevel ?? 1}</small> · 冷卻 ${skill.cooldown}s</p><p class="skill-copy">${esc(skillMechanic(skill))}</p><div class="character-actions">${button(g.save.team.includes(o.id) ? "移出編隊" : "加入編隊", "team", o.id, "", !!assigned)}${button("強化 ↑", "level", o.id)}${button("整補", "heal", o.id, "", o.hp >= st.hp || g.save.jobs.some((j) => j.owner === o.id))}</div><small>${
          assigned
            ? "派駐於 " + esc(p.planets.find((v) => v.id === assigned[0])?.name)
            : `強化費用：${Object.entries(costScale(p.rules.levelCost, o.level))
                .map(
                  ([id, n]) =>
                    (p.resources.find((r) => r.id === id)?.name ?? id) +
                    " " +
                    n,
                )
                .join("／")}`
        }</small></div></article>`;
      })
      .join(
        "",
      )}</div><h3 class="collection-heading">待收集星體 · 已收集 ${new Set(g.save.roster.map((o) => o.definition)).size} / ${p.characters.length}</h3><div class="collection-grid">${p.characters
      .filter((c) => !g.save.roster.some((o) => o.definition === c.id))
      .map(
        (c) =>
          `<article class="collection-card ${g.save.roster.some((o) => o.definition === c.id) ? "owned" : "locked"}">${portrait(p, c, true)}<div><span class="rarity">${"★".repeat(c.rarity)}</span><h3>${esc(c.name)}</h3><p>${acquisitionSources(p, c.id).map(esc).join(" · ") || "目前無取得來源"}</p></div></article>`,
      )
      .join("")}</div>`;
  }
  function stationedArt(id?: string) {
    const o = g.save.roster.find((v) => v.id === id);
    const c = o && p.characters.find((v) => v.id === o.definition);
    return c
      ? `<div class="stationed-maiden">${portrait(p, c, true)}<div><span class="eyebrow">STATIONED MAIDEN</span><strong>${esc(c.name)}</strong><small>派駐中 · 採集站產出 +20%</small>${button("查看少女", "character", o!.id, "text-button")}</div></div>`
      : '<p class="muted">尚未派駐少女</p>';
  }
  function enemyIntel(id: string) {
    const v = p.planets.find((v) => v.id === id);
    if (!v) return "";
    return `<h3>${esc(v.name)} · 敵群情報</h3><div class="list-cards">${v.enemies
      .map((group) => {
        const e = p.enemies.find((e) => e.id === group.enemy)!,
          level = group.level ?? 1,
          st = enemyStats(e, level),
          skill = p.skills.find((s) => s.id === e.skill);
        return `<article>${entityImage(p, e)}<h3>${esc(e.name)} ×${group.count} · Lv.${level}</h3><p>生命 ${st.hp.toLocaleString()} · 攻擊 ${st.attack} · 防禦 ${st.defense}</p><p>普通攻擊：${patternNames[e.pattern]}</p>${skill ? `<strong>${esc(skill.name)} · ${skill.cooldown}s</strong><p>${esc(skillMechanic(skill))}</p>` : ""}</article>`;
      })
      .join("")}</div>`;
  }
  function drawPanel() {
    if (!panel) {
      $("#overlay").innerHTML = "";
      g.pause.delete("panel");
      return;
    }
    g.pause.add("panel");
    if (panel === "story") {
      const q = p.quests.find((q) => q.id === storyId)!;
      const line = q.dialogue[storyIndex];
      const actor = p.characters.find(
        (c) => c.name === line.speaker || c.id === line.speaker,
      );
      $("#overlay").innerHTML =
        `<div class="story-scene" role="dialog" aria-modal="true" aria-label="劇情對話"><div class="story-sky">${entityImage(p, q, "story-background")}</div><div class="story-chapter"><span class="eyebrow">VOYAGE CHRONICLE</span><h2>${esc(q.name)}</h2></div>${actor ? portrait(p, actor, true) : '<div class="story-signal">✧</div>'}<div class="story-box"><div class="story-speaker">${esc(line.speaker)}</div><p class="story-line">${esc(line.text)}</p><div class="story-controls"><small>${storyIndex + 1} / ${q.dialogue.length}</small>${button("略過", "story-skip", "", "text-button")}${button(storyIndex === q.dialogue.length - 1 ? "開始航行 →" : "繼續對話 →", "story-next", "", "primary")}</div></div></div>`;
      return;
    }
    let body = "",
      title = "",
      kick = "";
    const s = g.save;
    if (panel === "roster") {
      title = "星體少女";
      kick = "CONSTELLATION ARCHIVE";
      body = `${button("調整編隊 →", "panel", "formation", "primary")}<div class="section-gap"></div>${rosterHtml()}`;
    }
    if (panel === "character") {
      const o = s.roster.find((o) => o.id === sub)!;
      const c = p.characters.find((c) => c.id === o.definition)!;
      const st = stats(p, o),
        baseSkill = p.skills.find((sk) => sk.id === c.skill)!,
        skillLevel = o.skillLevel ?? 1,
        skill = skillAtLevel(baseSkill, skillLevel),
        nextSkill =
          skillLevel < maxSkillLevel
            ? skillAtLevel(baseSkill, skillLevel + 1)
            : undefined,
        gate = skillResearchGate(skillLevel + 1),
        researchCost = skillResearchCost(p, o);
      title = c.name;
      kick = "STELLAR PROFILE";
      const copies = s.roster.filter((v) => v.definition === o.definition);
      body = `${button("← 返回角色選單", "panel", "roster", "text-button")}${copies.length > 1 ? `<div class="copy-picker" aria-label="同角色持有實例">${copies.map((v) => button(`${portrait(p, c)}<span>Lv.${v.level} · 同調 ${v.resonance ?? 0}/5${s.team.includes(v.id) ? " · 編隊中" : Object.values(s.colonies).some((col) => col.assigned === v.id) ? " · 派駐中" : ""}</span>`, "character", v.id, v.id === o.id ? "selected" : "")).join("")}</div>` : ""}<div class="character-detail">${portrait(p, c, true)}<div class="profile-copy"><span class="rarity">${stars(c, o)}</span><h2>${esc(c.name)} <small>Lv.${o.level}</small></h2><p class="role-tag">${esc(c.role)}</p><p>${esc(c.description)}</p><div class="stat-grid"><span>生命<strong>${Math.ceil(o.hp)} / ${st.hp}</strong></span><span>攻擊<strong>${Math.round(st.attack)}</strong></span><span>防禦<strong>${Math.round(st.defense)}</strong></span></div><section class="skill-detail"><span class="eyebrow">ACTIVE SKILL · Lv${skillLevel}/${maxSkillLevel} · ${skill.cooldown}s</span><h3>${esc(skill.name)}</h3><p>${esc(skill.description)}</p><strong>${esc(skillMechanic(skill))}</strong>${
        nextSkill
          ? `<div class="skill-research"><span class="eyebrow">技能研究 → Lv${skillLevel + 1}</span><p class="muted">${esc(skillMechanic(nextSkill).replace(/。$/, ""))} · 冷卻 ${nextSkill.cooldown}s</p><div class="costs">${amounts(p, researchCost)}</div>${button(o.level < gate ? `角色需 Lv${gate}` : `研究技能 Lv${skillLevel + 1}`, "skill-research", o.id, "", !!g.combat || o.level < gate || !canAfford(s, researchCost))}</div>`
          : `<p class="muted">技能研究已達上限 Lv${maxSkillLevel}。</p>`
      }</section><div class="costs">${amounts(p, costScale(p.rules.levelCost, o.level))}</div><div class="inline-actions">${button("強化 +1", "level", o.id)}${button("整補", "heal", o.id, "", o.hp >= st.hp || g.save.jobs.some((j) => j.owner === o.id))}${button(`同調 ${o.resonance ?? 0}/5`, "open-feed", o.id, "", !!g.combat || (o.resonance ?? 0) >= 5 || s.jobs.some((j) => j.owner === o.id) || Object.values(s.colonies).some((col) => col.assigned === o.id))}${button(s.team.includes(o.id) ? "移出編隊" : "加入編隊", "team", o.id, "", !!g.combat || (s.team.includes(o.id) ? s.team.length <= 1 : s.team.length >= p.rules.teamSize) || s.jobs.some((j) => j.owner === o.id) || Object.values(s.colonies).some((col) => col.assigned === o.id))}${button("調整編隊 →", "panel", "formation", "primary")}</div><p class="resonance-info">同調 ${o.resonance ?? 0}/5 · 每次生命／攻擊／防禦 +${p.rules.duplicateStatBonus * 100}% · 5次追加紫星；滿階後新共鳴返還投入的${p.rules.duplicateRefundRate * 100}%四資源。</p><p class="muted">取得方式：${acquisitionSources(p, c.id).map(esc).join("／")}</p></div></div>`;
    }
    if (panel === "feed") {
      const target = s.roster.find((o) => o.id === sub)!;
      const c = p.characters.find((c) => c.id === target.definition)!;
      title = `${c.name} · 同調強化`;
      kick = "RESONANCE SYNCHRONIZATION";
      const copies = s.roster.filter(
        (o) =>
          o.id !== target.id &&
          o.definition === target.definition &&
          o.level === 1 &&
          !(o.resonance ?? 0) &&
          !s.team.includes(o.id) &&
          !s.jobs.some((j) => j.owner === o.id) &&
          !Object.values(s.colonies).some((col) => col.assigned === o.id),
      );
      body = `<p>目前 ${target.resonance ?? 0}/5。選擇一位未培養的重複角色，消耗後每項基礎數值 +${p.rules.duplicateStatBonus * 100}%。第五次追加一顆紫星。</p><div class="feed-copies">${copies.map((o) => button(`${portrait(p, c)}<span>${esc(c.name)} · Lv.${o.level}<small>選擇同調素材</small></span>`, "feed", o.id, "feed-copy", !!g.combat || (target.resonance ?? 0) >= 5)).join("") || '<p class="empty-state">沒有可消耗的同角色。編隊、派駐、治療中或已培養的角色不會列入。</p>'}</div>`;
    }
    if (panel === "regions") {
      title = "星域航路";
      kick = "INTERSTELLAR ROUTES";
      const here = p.regions.find((r) => r.id === s.region)!;
      const progress = (id: string) => {
        const nodes = p.planets.filter(
          (v) => v.region === id && v.status === "active" && v.kind !== "camp",
        );
        return nodes.length
          ? `${nodes.filter((v) => nodeCleared(s, v)).length}/${nodes.length}`
          : "";
      };
      // One compact row per route, grouped like the original galaxy menu.
      const groups = [
        ["campaign", "主要星域"],
        ["hard", "高難星域"],
        ["other", "挑戰航區"],
      ] as const;
      const rows = here.routes.map((route) => {
        const to = p.regions.find((r) => r.id === route.to)!;
        const missing = route.requires.filter((id) => !s.cleared.includes(id));
        const locked = to.status !== "active" || missing.length > 0;
        const group =
          to.category === "campaign" ? "campaign" : to.category === "hard" ? "hard" : "other";
        const done = progress(to.id);
        return {
          group,
          html: `<div class="route-row ${locked ? "is-locked" : ""}"><div><strong>${esc(to.name)}</strong><small>${locked ? `需先解放 ${missing.length} 處：${missing.slice(0, 2).map((id) => esc(p.planets.find((v) => v.id === id)?.name ?? id)).join("、")}${missing.length > 2 ? "…" : ""}` : done ? `解放進度 ${done}` : esc(route.label)}</small></div>${button(locked ? "未開放" : "躍遷", "travel", to.id, locked ? "" : "primary", locked || !!g.combat || g.encounterPending)}</div>`,
        };
      });
      body = `<div class="route-here"><span class="eyebrow">目前位置</span><strong>${esc(here.name)}</strong>${progress(here.id) ? `<small>解放進度 ${progress(here.id)}</small>` : ""}</div>${
        groups
          .map(([id, name]) => {
            const list = rows.filter((r) => r.group === id);
            return list.length
              ? `<section class="route-group"><h3>${name}</h3>${list.map((r) => r.html).join("")}</section>`
              : "";
          })
          .join("") || "<p>目前沒有可用航線。</p>"
      }<p class="muted">經營工作與已解放星球在躍遷後都會保留。</p>`;
    }
    if (panel === "formation") {
      title = "航行編隊";
      kick = "FLEET FORMATION";
      body = `<p class="muted">最多 ${p.rules.teamSize} 人。01 為隊長，建議配置坦克；戰鬥中面向敵人掩護後排，全隊同步閃避，航行時沿航跡跟隨。使用前移／後移調整順序，戰鬥中鎖定編隊。</p><div class="formation-slots">${s.team
        .map((id, i) => {
          const o = s.roster.find((o) => o.id === id)!;
          const c = p.characters.find((c) => c.id === o.definition)!;
          return `<div>${button("移出編隊", "team", id, "text-button remove-member", !!g.combat || s.team.length <= 1)}<span>0${i + 1}</span>${portrait(p, c)}<strong>${esc(c.name)}</strong>${button("詳細", "character", id, "text-button")}<small>${i === 0 ? "前鋒 · 優先接敵" : "後衛 · 支援火力"}</small><div class="inline-actions">${button("前移", "team-forward", id, "text-button", !!g.combat || i === 0)}${button("後移", "team-back", id, "text-button", !!g.combat || i === s.team.length - 1)}</div></div>`;
        })
        .join("")}</div>${rosterHtml()}`;
    }
    if (panel === "skills") {
      title = "技能情報";
      kick = "TACTICAL DATABASE";
      body = `<div class="list-cards">${s.team
        .map((id) => {
          const o = s.roster.find((o) => o.id === id)!;
          const c = p.characters.find((c) => c.id === o.definition)!;
          const sk = p.skills.find((sk) => sk.id === c.skill)!;
          return `<article><span class="eyebrow">${esc(c.name)} · CD ${sk.cooldown}s</span><h3>${esc(sk.name)}</h3><p>${esc(sk.description)}</p><p class="skill-copy">${esc(skillMechanic(sk))}</p></article>`;
        })
        .join("")}</div>`;
      if (g.combat) body += enemyIntel(g.combat.planetId);
    }
    if (panel === "enemy-intel") {
      title = "敵群情報";
      kick = "THREAT DATABASE";
      body = enemyIntel(g.combat?.planetId ?? selected);
    }
    if (panel === "planets") {
      title = "領地總覽";
      kick = "PLANETARY NETWORK";
      body = `<p class="muted">${Object.values(s.colonies).filter((c) => c.active).length} 顆已啟動星球。所有領地持續生產，不會遭受防衛襲擊。</p><div class="costs">${amounts(p, Object.fromEntries(Object.entries(production(p, s)).map(([id, n]) => [id, n * 60])))}<small>／分鐘，全部領地</small></div><div class="list-cards">${
        p.planets
          .filter(
            (v) =>
              v.kind === "planet" &&
              (s.cleared.includes(v.id) ||
                s.colonies[v.id] ||
                (v.initiallyCleared &&
                  v.region === s.region &&
                  nodeUnlocked(s, v, p))),
          )
          .map((v) => {
            const col = s.colonies[v.id];
            return `<article class="territory-card">${entityImage(p, v)}<span class="eyebrow">${col?.active ? "PRODUCTION ONLINE" : "AWAITING ACTIVATION"}</span><h3>${esc(v.name)}</h3><p>${esc(v.description)}</p><div class="costs">${amounts(p, Object.fromEntries(Object.entries(v.production).map(([id, n]) => [id, n * 60])))}</div>${stationedArt(col?.assigned)}${button(col?.active ? "管理建設 →" : "啟動星球 →", col?.active ? "manage-planet" : "activate", v.id, "primary")}${button("導航至星球", "navigate", v.id, "text-button")}</article>`;
          })
          .join("") ||
        '<p class="empty-state">尚無領地。探索並解放第一顆星球後，便能在這裡管理。</p>'
      }</div>`;
    }
    if (panel === "acquisition") {
      const o = s.roster.find((o) => o.id === currentAcquisition);
      const c = o && p.characters.find((c) => c.id === o.definition);
      title = "星體共鳴成功";
      kick = "STELLAR CONNECTION ESTABLISHED";
      body = c
        ? `<div class="acquisition-screen" style="--c:${c.color}"><div class="acquisition-rays"></div>${portrait(p, c, true)}<div class="acquisition-copy"><span class="eyebrow">${s.roster.filter((o) => o.definition === c.id).length > 1 ? "RESONANCE · 再次相遇" : "NEW MAIDEN"}</span><span class="rarity">${stars(c, o)}</span><h2>${esc(c.name)}</h2><p>${esc(c.role)}</p><p>${esc(c.description)}</p>${button("確認獲得 →", "acquisition-next", "", "primary")}</div></div>`
        : "<p>少女已加入編隊庫。</p>";
    }
    if (panel === "research") {
      title = "共振研究";
      kick = "RESONANCE LAB";
      body = `<p class="muted">研究持續進行，戰鬥期間完成的加成會在下場戰鬥生效。</p><div class="list-cards">${p.research.map((r) => `<article class="research-card">${entityImage(p, r, "research-art")}<span class="eyebrow">${s.jobs.some((j) => j.definition === r.id) ? "等待研究中" : r.seconds + " SEC"}</span><h3>${esc(r.name)}</h3><p>${esc(r.description)}</p><div class="costs">${amounts(p, r.cost)}</div>${button(s.research.includes(r.id) ? "研究完成" : s.jobs.some((j) => j.definition === r.id) ? "研究進行中" : "開始研究", "research", r.id, "primary", s.research.includes(r.id) || s.jobs.some((j) => j.definition === r.id) || !r.requires.every((id) => s.research.includes(id)))}</article>`).join("")}</div><h3>工作佇列</h3><div id="jobs">${jobList()}</div>`;
    }
    if (panel === "summon") {
      title = "星體共鳴";
      kick = "STELLAR RESONANCE";
      body = resonancePanel(p, s, recipe, count, jobList());
    }
    if (panel === "colony") {
      const v = p.planets.find((v) => v.id === selected)!,
        col = s.colonies[selected];
      title = v.name;
      kick = "PLANETARY OPERATIONS";
      body = !col
        ? "<p>請先啟動星球。</p>"
        : `${button("← 返回領地總覽", "panel", "planets", "text-button")}${stationedArt(col.assigned)}<div class="colony-summary">${entityImage(p, v)}<div><span class="eyebrow">${col.lost ? "PRODUCTION SUSPENDED" : "PRODUCTION ONLINE"}</span><h3>${col.lost ? "生產待恢復 · 停產中" : "生產運作中"}</h3><p>星球持續提供資源；可建造、升級與派駐，增加產能。</p></div></div><div class="costs">${amounts(p, Object.fromEntries(Object.entries(production(p, { ...s, colonies: { [selected]: col } })).map(([id, n]) => [id, n * 60])))}<small>／分鐘，此星球目前產量</small></div><div class="list-cards">${p.buildings.map((b) => `<article class="building-card">${entityImage(p, b)}<span class="eyebrow">LEVEL ${col.buildings[b.id] ?? 0} / ${b.maxLevel}</span><h3>${esc(b.name)}</h3><p>${esc(b.description)} · ${b.seconds}s</p><div class="costs">${amounts(p, costScale(b.cost, (col.buildings[b.id] ?? 0) + 1))}</div>${button("建造／升級", "build", b.id, "primary", col.lost || (col.buildings[b.id] ?? 0) >= b.maxLevel || s.jobs.some((j) => j.kind === "build" && j.owner === selected))}</article>`).join("")}</div><h3>派駐少女 <small>採集站產出 +20%</small></h3><div class="inline-actions">${
            s.roster
              .filter((o) => !s.team.includes(o.id))
              .map((o) =>
                button(
                  `${col.assigned === o.id ? "撤回" : "派駐"} ${esc(p.characters.find((c) => c.id === o.definition)?.name)}`,
                  "assign",
                  o.id,
                ),
              )
              .join("") ||
            '<p class="muted">目前無待命少女；可在編成中移出成員。</p>'
          }</div><h3>工作佇列</h3><div id="jobs">${jobList()}</div>`;
    }
    if (panel === "challenges") {
      title = "挑戰";
      kick = "SORTIE";
      body = challengeHtml();
    }
    if (panel === "quests") {
      title = "航行紀錄";
      kick = "VOYAGE JOURNAL";
      body =
        (s.jobs.length
          ? `<details class="journal-jobs"><summary>進行中的工作 · ${s.jobs.length}</summary>${jobList()}</details>`
          : "") + journalHtml(p, s, journalTab, journalChapter);
    }
    if (panel === "guide") {
      title = "航行指南";
      kick = "FLIGHT MANUAL";
      body = `<ol class="guide-steps"><li><strong>探索與出擊</strong><p>在銀河裡航行並靠近星球，或按 M 切換大星圖規劃航路。WASD／點空白處移動，拖曳平移鏡頭；滾輪或雙指可縮放，「跟隨」返回隊伍。</p></li><li><strong>走位與技能</strong><p>普通攻擊自動進行。將守護角色排第一，轉向時讓隊長先走到前方。點敵人鎖定，點下方角色或鍵盤1～6施放技能。紅色線條是敵方射擊預警，移動避開。</p></li><li><strong>啟動與經營</strong><p>解放星球後啟動生產，再建造採集站與研究。多數工作在數十秒至數分鐘內完成，管理面板只暫停戰鬥。序章與航行任務會提供額外補給，可先強化角色、開始研究。</p></li><li><strong>收集與編成</strong><p>四資源共鳴、首次解放與任務可取得少女。在編成中強化、整補與更換隊伍。</p></li><li><strong>領地與存檔</strong><p>領地總覽可管理所有星球、查看產能與進行建設。可於設定匯出／匯入存檔。</p></li><li><strong>星域航路</strong><p>銀河下方的「星域航路」可選擇目的地並躍遷。各星域的據點與解放前置可在情報中查看；原有領地與工作在跨區後仍會保留。</p></li></ol>`;
    }
    if (panel === "archive") {
      title = "航行設定";
      kick = "SAVE & PREFERENCES";
      body = `<div class="settings-list"><h3>本機進度</h3><p>進度自動保存在此瀏覽器。跨裝置時，請匯出後在另一裝置匯入。</p><div class="inline-actions">${button("匯出存檔", "export-save", "", "primary")}<label class="file-button">匯入存檔<input id="import-save" type="file" accept="application/json,.json"></label>${button("匯出還原備份", "export-backup")}</div>${button("開始新航跡（先備份）", "new-voyage")}${p.regions
        .filter((r) => r.campaignStart)
        .map((r) =>
          button(
            "開始「" + esc(r.name) + "」航跡（先備份）",
            "new-voyage",
            r.id,
          ),
        )
        .join(
          "",
        )}<h3>聲音與畫面</h3><div class="inline-actions">${button(audio.enabled ? "聲音：開啟" : "聲音：關閉", "sound")}${button(g.lowEffects ? "特效：精簡" : "特效：完整", "effects")}</div><label>音效音量<input id="audio-volume" type="range" min="0" max="1" step="0.05" value="${audio.volume}"></label><h3>戰鬥操作</h3><p>點空白處移動與閃躲；普通攻擊自動進行。點敵人優先鎖定，點下方角色施放技能。</p>${button(g.autoSkills ? "自動技能：開啟" : "自動技能：關閉", "auto")}<h3>角色圖鑑</h3><a href="gallery.html">瀏覽全部少女立繪／Q圖 ↗</a><h3>角色製作表</h3><a href="#/catalog">查看未來角色清單／下載 CSV ↗</a><h3>內容工坊</h3><p>瀏覽與調整內容，套用至隔離測試遊戲；完成後匯出內容包再發布。</p><a class="primary link-button" href="#/studio">進入內容工坊 ↗</a>${test ? '<p><a href="#/play">退出隔離測試，返回正式進度</a></p>' : ""}<details><summary>開發版狀態</summary><p>六張原始立繪已匯入，已套用原先六角色；原圖展示入口在內容工坊。音效採可編輯的程序合成，星球與敵艦為原創程序材質。M1的平衡／劇情與部分技能為明示的新設計；原作未知機制仍保留來源缺口。</p></details></div>`;
    }
    // Redrawing the same panel (claims, upgrades) keeps every scroll position and focus.
    const previous = $("#overlay").querySelector<HTMLElement>("section[data-panel]");
    const samePanel = previous?.dataset.panel === panel;
    const scrolls = samePanel
      ? [previous!, ...previous!.querySelectorAll<HTMLElement>("*")]
          .filter((el) => el.scrollTop || el.scrollLeft)
          .map((el) => ({
            path: elementPath(previous!, el),
            top: el.scrollTop,
            left: el.scrollLeft,
          }))
      : [];
    $("#overlay").innerHTML =
      `<div class="modal-backdrop"><section data-panel="${esc(panel)}" class="modal ${["roster", "formation", "character", "acquisition"].includes(panel) ? "wide" : ""}" role="dialog" aria-modal="true" aria-label="${esc(title)}">${heading(title, kick)}<div class="modal-body">${body}</div><div class="modal-footer ${panel === "summon" ? "resonance-action-footer" : ""}">${panel === "summon" ? `<span class="resonance-clock"><i></i> 戰鬥已暫停 · 經營計時持續</span>${resonanceAction()}` : "<i></i> 戰鬥已暫停 · 經營計時持續"}</div></section></div>`;
    if (panel === "summon") recipeInfo();
    refreshTimers();
    const section = $("#overlay").querySelector<HTMLElement>("section[data-panel]");
    if (section)
      for (const { path, top, left } of scrolls) {
        const el = path.reduce<Element | undefined>(
          (node, i) => node?.children[i],
          section,
        ) as HTMLElement | undefined;
        if (el) {
          el.scrollTop = top;
          el.scrollLeft = left;
        }
      }
    if (!samePanel)
      $("#overlay")
        .querySelector<HTMLButtonElement>('[data-action="close"]')
        ?.focus({ preventScroll: true });
  }
  function elementPath(root: Element, el: Element) {
    const path: number[] = [];
    for (let node = el; node !== root && node.parentElement; node = node.parentElement)
      path.unshift([...node.parentElement.children].indexOf(node));
    return path;
  }
  function recipeInfo() {
    const info = $("#recipe-info");
    if (!info) return;
    const pool = summonCandidates(p, recipe);
    const preset = $("#preset") as HTMLSelectElement;
    preset.value =
      p.characters.find((c) => c.recipe.every((v, i) => v === recipe[i]))?.id ??
      "";
    info.innerHTML = `<div class="resonance-cost-heading"><span>本次投入</span><small>${count} 組</small></div><div class="costs">${amounts(p, Object.fromEntries(p.resources.map((r, i) => [r.id, recipe[i] * count])))}</div><div class="resonance-signals"><span>共鳴接近</span><div>${pool
      .slice(0, 3)
      .map(
        (v) =>
          `<span>${portrait(p, v.character)}<b>${esc(v.character.name)}</b></span>`,
      )
      .join("")}</div></div>`;
  }
  // Original grouping: Quasar mothership (daily), battleship hunts, requested missions, hard galaxies.
  const challengeTabs = [
    ["daily", "類星體母艦", "每日限次・計分補給"],
    ["battleship", "戰艦討伐", "逐艘擊破敵方主力艦"],
    ["mission", "委託任務", "原作委託與特別任務"],
    ["hard", "高難星域", "強化版星域據點"],
    ["event", "劇情戰役", "主線章節的戰役航跡"],
  ] as const;
  let challengeTab: string = "daily";
  function challengeHtml() {
    const s = g.save,
      now = Date.now();
    const tabs = challengeTabs.filter(([id]) =>
      p.regions.some(
        (r) =>
          r.category === id &&
          r.status === "active" &&
          p.planets.some((v) => v.region === r.id && v.status === "active"),
      ),
    );
    if (!tabs.some(([id]) => id === challengeTab))
      challengeTab = tabs[0]?.[0] ?? "daily";
    const current = tabs.find(([id]) => id === challengeTab);
    const nav = `<div class="challenge-tabs" role="tablist">${tabs
      .map(([id, name]) =>
        button(
          esc(name),
          "challenge-tab",
          id,
          id === challengeTab ? "selected" : "",
        ),
      )
      .join("")}</div>`;
    const cards = p.regions
      .filter(
        (r) =>
          r.category === challengeTab &&
          r.status === "active" &&
          p.planets.some((v) => v.region === r.id && v.status === "active"),
      )
      .map((r) => {
        const nodes = p.planets.filter(
          (v) => v.region === r.id && v.status === "active",
        );
        const levels = nodes.flatMap((v) => v.enemies.map((e) => e.level ?? 1));
        const cleared = nodes.filter((v) => nodeCleared(s, v)).length;
        const path = regionPath(p, s.region, r.id);
        const blocked = path.slice(1).find((to, i) => {
          const route = p.regions
            .find((v) => v.id === path[i])
            ?.routes.find((v) => v.to === to);
          return !route || !route.requires.every((id) => s.cleared.includes(id));
        });
        const blockedRoute = blocked
          ? p.regions
              .find((v) => v.id === path[path.indexOf(blocked) - 1])
              ?.routes.find((v) => v.to === blocked)
          : undefined;
        const missing =
          blockedRoute?.requires.filter((id) => !s.cleared.includes(id)) ?? [];
        let status = `進度 ${cleared}/${nodes.length}`;
        if (r.category === "daily") {
          const today = nodes.filter((v) => nodeAvailability(s, v, now).open);
          const period = today[0] ? nodeAvailability(s, today[0], now).period : "";
          const attempt = s.dailyAttempts[r.id];
          const limit = today[0]?.schedule?.attemptLimit ?? 0;
          const used = attempt?.period === period ? attempt.count : 0;
          status = `今日剩餘 ${Math.max(0, limit - used)}/${limit} 次 · ${today.map((v) => v.name).join("、") || "今日無排程"}`;
        }
        const here = s.region === r.id;
        const action = here
          ? `<div class="challenge-nodes">${nodes
              .filter((v) => r.category !== "daily" || nodeAvailability(s, v, now).open)
              .map(
                (v) =>
                  `<div class="${nodeCleared(s, v) ? "is-cleared" : ""}"><strong>${esc(v.name)}</strong><small>${nodeCleared(s, v) ? "已擊破" : nodeUnlocked(s, v, p) ? `敵軍 Lv${Math.max(1, ...v.enemies.map((e) => e.level ?? 1))}` : "需先擊破前一戰"}</small>${button(nodeCleared(s, v) ? "再戰" : "出擊", "navigate", v.id, nodeCleared(s, v) ? "" : "primary", !nodeUnlocked(s, v, p) || !!g.combat)}</div>`,
              )
              .join("")}</div>`
          : !path.length
            ? `<small>尚無連通航路</small>`
            : missing.length
              ? `<small class="locked">需先解放：${missing
                  .slice(0, 3)
                  .map((id) => esc(p.planets.find((v) => v.id === id)?.name ?? id))
                  .join("、")}${missing.length > 3 ? ` 等 ${missing.length} 處` : ""}</small>`
              : button(
                  `前往 · ${path.length - 1} 次躍遷`,
                  "route-go",
                  r.id,
                  "primary",
                  !!g.combat,
                );
        return `<article class="challenge-card ${here ? "is-here" : ""} ${cleared === nodes.length ? "is-complete" : ""}"><div class="challenge-head"><h3>${esc(r.name)}</h3><span>${levels.length ? `建議 Lv${Math.min(...levels)}${Math.max(...levels) > Math.min(...levels) ? `–${Math.max(...levels)}` : ""}` : ""}</span></div><p>${esc(r.description)}</p><div class="challenge-meta"><small>${esc(status)}</small>${r.category === "daily" ? "" : `<div class="progress-track"><span style="width:${nodes.length ? (cleared / nodes.length) * 100 : 0}%"></span></div>`}</div>${action}</article>`;
      })
      .join("");
    return `${nav}<p class="challenge-lead">${esc(current?.[2] ?? "")}・選擇目標後自動沿已開放航路躍遷，不跳過任何解鎖條件。</p><div class="list-cards challenge-list">${cards || '<p class="muted">此分類目前沒有可挑戰的目標。</p>'}</div>`;
  }
  async function act(action: string, id: string) {
    if (action === "journal-open") {
      const ready = p.quests.filter(
        (q) =>
          q.status === "active" &&
          !questClaimed(g.save, q, Date.now()) &&
          questReady(g.save, q, Date.now()),
      );
      journalTab =
        g.save.story.session || ready.some((q) => q.story)
          ? "story"
          : ready.some((q) => q.repeat === "daily")
            ? "daily"
            : ready.length
              ? "voyage"
              : "story";
      journalChapter =
        p.quests.find((q) => q.id === g.save.story.session?.quest)?.story
          ?.chapter ??
        ready.find((q) => q.story)?.story?.chapter ??
        "";
      panel = "quests";
      drawPanel();
      return;
    }
    if (action === "missions-toggle") {
      missionsCollapsed = !missionsCollapsed;
      try {
        localStorage.setItem("stella:missions-collapsed", missionsCollapsed ? "1" : "0");
      } catch {
        // Storage unavailable: the fold still applies for this session.
      }
      return;
    }
    if (action === "journal-tab-open") {
      journalTab = id;
      panel = "quests";
      drawPanel();
      return;
    }
    if (action === "journal-tab" || action === "journal-chapter") {
      if (action === "journal-tab") journalTab = id;
      else {
        journalChapter = id;
        journalTab = "story";
      }
      drawPanel();
      root
        .querySelector<HTMLButtonElement>(
          `[data-action="${action}"][data-id="${CSS.escape(id)}"]`,
        )
        ?.focus();
      return;
    }
    if (action === "intel-close") {
      intelOpen = false;
      renderPlanet();
      return;
    }
    if (action === "view") {
      g.viewMode = g.viewMode === "map" ? "explore" : "map";
      intelOpen = g.viewMode === "map";
      localStorage.setItem("stella:view", g.viewMode);
      space.recenter();
      planetKey = "";
      renderPlanet();
      return;
    }
    if (action === "challenge-tab") {
      challengeTab = id;
      drawPanel();
      return;
    }
    if (action === "route-go") {
      if (g.combat || g.encounterPending) return;
      const path = regionPath(p, g.save.region, id);
      for (const to of path.slice(1)) {
        await g.command({ type: "travel", region: to });
        if (g.save.region !== to) return;
      }
      // Close the hub so the voyage resumes and the fleet can engage on arrival.
      panel = "";
      drawPanel();
      space.recenter();
      planetKey = "";
      renderPlanet();
      return;
    }
    if (action === "challenge-route") {
      panel = "regions";
      drawPanel();
      return;
    }
    if (action === "travel") {
      if (g.combat || g.encounterPending) return;
      const to = p.regions.find((r) => r.id === id)!;
      if (
        !(await ask(
          `前往 ${to.name}？隊伍將抵達該星域入口，原有領地與經營工作會保留。`,
          "確認躍遷",
        ))
      )
        return;
      await g.command({ type: "travel", region: id });
      if (g.save.region !== id) return;
      selected = p.planets.find((v) => v.region === id)?.id ?? "";
      panel = "";
      drawPanel();
      space.recenter();
      planetKey = "";
      missionKey = "";
      renderPlanet();
      renderMission();
      return;
    }
    if (action === "navigate") {
      const v = p.planets.find((v) => v.id === id)!;
      if (v.region !== g.save.region) {
        await g.command({ type: "travel", region: v.region });
        if (g.save.region !== v.region) return;
        space.recenter();
      }
      g.viewMode = "explore";
      g.move(v.x - 160, v.y + 120);
      panel = "";
      drawPanel();
      renderPlanet();
      return;
    }
    if (action === "manage-planet") {
      selected = id;
      panel = "colony";
      drawPanel();
      return;
    }
    if (action === "story") {
      storyId = id;
      storyIndex = 0;
      panel = "story";
      drawPanel();
      return;
    }
    if (action === "story-next" || action === "story-skip") {
      const q = p.quests.find((q) => q.id === storyId)!;
      if (action === "story-next" && storyIndex < q.dialogue.length - 1) {
        storyIndex++;
        drawPanel();
        return;
      }
      await g.command({ type: "seen-story", id: storyId });
      if (q.condition === "intro" && !g.save.quests.includes(q.id))
        await g.command({ type: "quest", id: q.id });
      panel = "";
      drawPanel();
      return;
    }
    if (action === "acquisition-next") {
      await g.command({ type: "ack-acquisition", id: currentAcquisition });
      panel = arrivalReturnPanel;
      drawPanel();
      return;
    }
    if (action === "sound") {
      audio.toggle();
      drawPanel();
      return;
    }
    if (action === "effects") {
      g.lowEffects = !g.lowEffects;
      localStorage.setItem("stella:effects", g.lowEffects ? "low" : "full");
      drawPanel();
      return;
    }
    if (action === "follow") {
      space.recenter();
      return;
    }
    if (action === "retreat") {
      if (
        await ask("撤離目前遭遇？戰鬥中的生命狀態會保留，未完成的獎勵不領取。")
      )
        g.retreat();
      return;
    }

    if (action === "panel") {
      panel = id;
      drawPanel();
      return;
    }
    if (action === "close") {
      if (panel === "acquisition")
        await g.command({ type: "ack-acquisition", id: currentAcquisition });
      panel = "";
      drawPanel();
      return;
    }
    if (action === "track") {
      selected = id;
      space.select(id);
      const v = p.planets.find((v) => v.id === id)!;
      g.move(v.x - 160, v.y + 120);
      renderPlanet();
      return;
    }
    if (action === "cast") {
      castSkill(id);
      return;
    }
    if (action === "character") {
      sub = id;
      panel = "character";
      drawPanel();
      return;
    }
    if (action === "auto") {
      g.autoSkills = !g.autoSkills;
      if (g.combat) g.combat.autoSkills = g.autoSkills;
      drawPanel();
      return;
    }
    if (action === "new-voyage") {
      if (
        await ask(
          "將目前進度保存在上一份備份，再以新版初始資源開始新航跡。建議先匯出存檔留存。",
          "開始新航跡",
        )
      ) {
        await g.replaceSave(
          newSave(
            id && p.regions.some((r) => r.id === id && r.campaignStart)
              ? { ...p, rules: { ...p.rules, startRegion: id } }
              : p,
            Date.now(),
            test ? "test" : "voyager",
          ),
        );
        if (!g.error) location.reload();
      }
      return;
    }
    if (action === "export-save") {
      await g.checkpoint();
      download("stella-save.json", JSON.stringify(g.save, null, 2));
      return;
    }
    if (action === "export-backup") {
      const backup =
        (await read<Save>(`${g.key}:restore-point`)) ??
        (await read<Save>(`${g.key}:backup`));
      if (backup)
        download("stella-backup.json", JSON.stringify(backup, null, 2));
      else g.notice = "尚無上一份備份。";
      return;
    }
    if (action === "battle") {
      await g.command({ type: "begin", planet: id });
      if (g.combat) {
        panel = "";
        drawPanel();
      }
      renderPlanet();
      renderSquad();
      return;
    }
    if (action === "activate")
      await g.command({ type: "activate", planet: id });
    if (action === "resupply")
      await g.command({ type: "resupply", planet: id });
    if (action === "repair") await g.command({ type: "repair", planet: id });
    if (action === "build")
      await g.command({ type: "build", planet: selected, building: id });
    if (action === "research") await g.command({ type: "research", id });
    if (action === "open-feed") {
      sub = id;
      panel = "feed";
      drawPanel();
      return;
    }
    if (action === "feed") {
      const target = g.save.roster.find((o) => o.id === sub)!;
      const c = p.characters.find((c) => c.id === target.definition)!;
      if (
        !(await ask(
          `消耗這位重複的${c.name}，讓${c.name}提升至同調 ${(target.resonance ?? 0) + 1}/5？生命、攻擊、防禦各增加基礎值${p.rules.duplicateStatBonus * 100}%。消耗後角色會從名單移除。`,
          "確認同調強化",
        ))
      )
        return;
      await g.command({ type: "feed", target: sub, source: id });
      panel = "character";
      audio.cue("arrival");
      drawPanel();
      renderSquad();
      return;
    }
    if (action === "team-forward" || action === "team-back")
      await g.command({
        type: "reorder-team",
        owned: id,
        direction: action === "team-forward" ? -1 : 1,
      });
    if (action === "team") await g.command({ type: "team", owned: id });
    if (action === "level") await g.command({ type: "level", owned: id });
    if (action === "skill-research")
      await g.command({ type: "skill-research", owned: id });
    if (action === "heal") await g.command({ type: "heal", owned: id });
    if (action === "assign")
      await g.command({ type: "assign", owned: id, planet: selected });
    if (action === "quest") await g.command({ type: "quest", id });
    if (action === "quest-claim-all")
      // Each claim stays its own receipt-checked transaction.
      for (const q of p.quests.filter(
        (q) =>
          q.status === "active" &&
          !questClaimed(g.save, q, Date.now()) &&
          questReady(g.save, q, Date.now()),
      ))
        await g.command({ type: "quest", id: q.id });
    if (action === "summon") {
      if (
        !(await ask(
          `投入 ${p.resources.map((r, i) => r.name + " " + recipe[i] * count).join("、")}，開始 ${count} 組共鳴？`,
        ))
      )
        return;
      await g.command({ type: "summon", recipe, count });
    }
    drawPanel();
    renderPlanet();
    renderMission();
    renderSquad();
  }
  const click = (e: Event) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>("[data-action]");
    if (b && !b.hasAttribute("disabled")) {
      void audio.unlock().then(() => audio.cue("ui"));
      void act(b.dataset.action!, b.dataset.id ?? "").catch(
        (e) => (g.error = String(e)),
      );
    }
  };
  const change = async (e: Event) => {
    const t = e.target as HTMLInputElement;
    if (t.id === "audio-volume") audio.setVolume(Number(t.value));
    if (t.id === "preset") {
      const c = p.characters.find((c) => c.id === t.value)!;
      recipe = c.recipe.slice();
      root
        .querySelectorAll<HTMLInputElement>(".recipe")
        .forEach((el, i) => (el.value = String(recipe[i])));
      recipeInfo();
    }
    if (t.classList.contains("recipe")) {
      recipe[Number(t.dataset.slot)] = Number(t.value);
      recipeInfo();
    }
    if (t.id === "batch-count") {
      count = Number(t.value);
      recipeInfo();
    }
    if (t.id === "import-save" && t.files?.[0]) {
      g.pause.add("import");
      try {
        const raw = JSON.parse(await t.files[0].text());
        if (await ask("將備份目前進度，並以所選存檔取代。確定匯入？")) {
          await g.replaceSave(raw);
          renderPlanet();
          renderMission();
          renderSquad();
          drawPanel();
        }
      } catch (e) {
        g.error = String(e);
      } finally {
        g.pause.delete("import");
      }
    }
  };
  function castSkill(id: string) {
    if (!g.pause.size && g.combat?.cast(id)) {
      audio.cue("skill");
      renderSquad();
    }
  }
  const keys = (e: KeyboardEvent) => {
    if (
      (e.target as HTMLElement).closest(
        "input,textarea,select,[contenteditable=true]",
      ) ||
      e.ctrlKey ||
      e.metaKey ||
      e.altKey ||
      e.repeat ||
      g.pause.has("confirm")
    )
      return;
    if (e.key.toLowerCase() === "m" && !panel) {
      e.preventDefault();
      void act("view", "");
      return;
    }
    if (e.key === "Escape") {
      if (panel) {
        if (panel === "story") void act("story-skip", "");
        else void act("close", "");
      } else void act("pause", "");
    }
    if (!panel && ["1", "2", "3", "4", "5", "6"].includes(e.key)) {
      const u = g.save.team[Number(e.key) - 1];
      if (u) castSkill(u);
    }
  };
  const dialogOpen = () => g.pause.add("confirm"),
    dialogClose = () => g.pause.delete("confirm");
  window.addEventListener("stella-dialog-open", dialogOpen);
  window.addEventListener("stella-dialog-close", dialogClose);
  const visibility = () => {
    audio.background(document.hidden);
    if (document.hidden) {
      g.pause.add("background");
      void g.checkpoint();
    } else {
      g.pause.delete("background");
      void g.tickEconomy();
    }
  };
  root.addEventListener("click", click);
  root.addEventListener("change", change);
  document.addEventListener("keydown", keys);
  document.addEventListener("visibilitychange", visibility);
  function refreshTimers() {
    root.querySelectorAll<HTMLElement>("[data-ends]").forEach((el) => {
      const seconds = Math.ceil((Number(el.dataset.ends) - Date.now()) / 1000);
      el.textContent = seconds > 0 ? `${seconds}s` : "完成處理中";
    });
  }
  const seenSkillFlashes = new WeakSet<object>();
  let splashTimer = 0;
  let ticks = 0,
    lastJobs = "",
    lastNotice = "",
    lastDailyState = "",
    noticeUntil = 0;
  timer = window.setInterval(() => {
    if (disposed) return;
    ticks++;
    for (const event of g.events.splice(0)) audio.cue(event);
    for (const flash of g.combat?.flashes ?? []) {
      const sk = p.skills.find((s) => s.id === flash.skillId);
      if (!sk || seenSkillFlashes.has(flash)) continue;
      seenSkillFlashes.add(flash);
      audio.cue("skill");
      const c = p.characters.find((c) => c.id === flash.sourceDefinition);
      const splash = $("#skill-splash");
      splash.innerHTML = `${c ? portrait(p, c) : ""}<div><small>SKILL ACTIVATED</small><strong>${esc(sk.name)}</strong></div>`;
      splash.classList.remove("show");
      void splash.offsetWidth;
      splash.classList.add("show");
      clearTimeout(splashTimer);
      splashTimer = window.setTimeout(
        () => splash.classList.remove("show"),
        1100,
      );
    }
    if (
      !g.combat &&
      !g.save.story.session &&
      !["story", "acquisition"].includes(panel) &&
      g.save.acquisitionQueue.length
    ) {
      arrivalReturnPanel = panel;
      audio.cue("arrival");
      currentAcquisition = g.save.acquisitionQueue[0];
      panel = "acquisition";
      drawPanel();
    }
    if (!panel && !g.combat && !g.save.story.session) {
      const q = p.quests.find(
        (q) =>
          questReady(g.save, q) &&
          q.repeat !== "daily" &&
          !q.story &&
          !g.save.storySeen.includes(q.id),
      );
      if (q) {
        storyId = q.id;
        storyIndex = 0;
        panel = "story";
        drawPanel();
      }
    }
    const battleTools = $("#battle-tools");
    const toolKey = String(!!g.combat) + g.viewMode + String(g.autoSkills);
    if (battleTools.dataset.key !== toolKey) {
      battleTools.dataset.key = toolKey;
      battleTools.innerHTML = `${button(g.viewMode === "map" ? "◈ 銀河航行" : "◇ 大星圖", "view")}${button("◎ 跟隨", "follow")}${!g.combat ? button("星域航路", "panel", "regions") : ""}${g.combat ? button(g.autoSkills ? "自動：開" : "自動：關", "auto") + button("技能情報", "panel", "skills") + button("撤離", "retreat") : ""}<small id="wave-clock"></small>`;
    }
    const wave = root.querySelector("#wave-clock");
    if (wave)
      wave.textContent = g.combat
        ? (p.planets.find((v) => v.id === g.combat!.planetId)
            ?.timeLimitSeconds ?? 0)
          ? `剩餘 ${Math.ceil(Math.max(0, (p.planets.find((v) => v.id === g.combat!.planetId)?.timeLimitSeconds ?? 0) - g.combat.time))}s · 傷害 ${(g.combat.damageRatio * 100).toFixed(2)}%`
          : `守軍剩餘 ${g.combat.units.filter((u) => u.side === "enemy" && u.hp > 0).length} · ${Math.floor(g.combat.time)}s`
        : g.movementSpeed > p.rules.travelSpeed
          ? "安全航行 · 巡航加速"
          : "偵測到敵方訊號";

    if (wave && g.combat?.storyEncounter) {
      const encounter = g.combat.storyEncounter;
      const mode = {
        eliminate: "清除敵軍",
        escort: "護送目標抵達",
        protect: "保護目標",
        survive: "存活至時限",
        defend: "守住防線",
      }[encounter.mode];
      const remaining = encounter.seconds
        ? ` · ${Math.ceil(Math.max(0, encounter.seconds - g.combat.time))}s`
        : "";
      const protectedUnits = encounter.actors
        .filter((a) => a.required)
        .map((a) => {
          const u = g.combat!.units.find((u) => u.id === a.id);
          return u
            ? `${u.name} ${Math.ceil((100 * u.hp) / u.maxHp)}%`
            : "等待目標入場";
        })
        .join("／");
      wave.textContent = `${mode}${remaining}${protectedUnits ? " · " + protectedUnits : ""} · ${wave.textContent}`;
    }

    const rates = production(p, g.save);
    $("#wallet").innerHTML = p.resources
      .map(
        (r) =>
          `<div class="resource" style="--c:${r.color}">${resourceIcon(p, r)}<div><small>${esc(r.name)}</small><strong>${Math.floor(g.save.wallet[r.id] ?? 0).toLocaleString("zh-TW")}</strong></div><em>+${((rates[r.id] ?? 0) * 60).toFixed(0)}/m</em></div>`,
      )
      .join("");
    $("#region-title").textContent = p.regions.find(
      (r) => r.id === g.save.region,
    )!.name;
    const rewards = p.quests.filter(
      (q) =>
        q.status === "active" &&
        !questClaimed(g.save, q, Date.now()) &&
        questReady(g.save, q, Date.now()),
    ).length;
    $("#journal-status").textContent = rewards
      ? `可領獎勵 ${rewards}`
      : g.save.story.session
        ? "接續劇情"
        : "章節／任務";
    root
      .querySelector(".journal-shortcut")
      ?.classList.toggle("has-rewards", rewards > 0);
    // Saving never disables the tracker: re-rendering mid-tap swallowed phone taps.
    const mainline = mainlineHtml(p, g.save, !!g.combat, (id) =>
      nearStoryPlanet(g, id),
    );
    if (mainline !== mainlineKey) {
      mainlineKey = mainline;
      $("#mainline").innerHTML = mainline;
    }
    const toggle = `${missionsCollapsed ? "▸" : "▾"} 任務${rewards ? ` · 可領 ${rewards}` : ""}`;
    if ($("#missions-toggle").textContent !== toggle)
      $("#missions-toggle").textContent = toggle;
    root
      .querySelector(".bridge")
      ?.classList.toggle("missions-collapsed", missionsCollapsed);
    const missions = missionCardsHtml(p, g.save, Date.now());
    if (missions !== missionsKey) {
      missionsKey = missions;
      $("#missions").innerHTML = missions;
    }
    $("#coordinates").textContent = `X ${g.x.toFixed(0)} / Y ${g.y.toFixed(0)}`;
    $("#save-status").textContent = g.error
      ? "進度尚未保存"
      : g.busy
        ? "正在保存…"
        : "本機自動保存";
    if (g.notice !== lastNotice) {
      lastNotice = g.notice;
      noticeUntil = Date.now() + 4200;
    }
    $("#toast").textContent = g.error || g.notice;
    $("#toast").classList.toggle("is-error", !!g.error);
    $("#toast").classList.toggle(
      "is-ambient",
      /^(發現星球|內容版本已更新)/.test(g.notice),
    );
    $("#toast").classList.toggle(
      "visible",
      !!g.error || (!!g.notice && Date.now() < noticeUntil),
    );
    const arena =
      g.combat && g.save.encounter?.kind !== "patrol"
        ? p.planets.find((p) => p.id === g.combat!.planetId)
        : undefined;
    const nearBoundary =
      arena &&
      Math.hypot(g.x - arena.x, g.y - arena.y) > arena.leashWarningRadius;
    $("#battle-state").innerHTML = g.pause.size
      ? `<span>Ⅱ ${panel ? "管理中" : g.pause.has("background") ? "背景暫停" : "已暫停"}</span>`
      : g.combat
        ? nearBoundary
          ? `<span class="leash-warning" role="status">${g.combat.outsideSeconds > 0 ? `已越界 · ${(arena!.resetSeconds - g.combat.outsideSeconds).toFixed(1)} 秒後守軍重置，請返回！` : `接近交戰邊界 · 離開邊界${arena!.resetSeconds}秒會重置守軍`}</span>`
          : '<span class="danger">◆ 交戰中 · WASD／點擊閃躲</span>'
        : g.encounterPending
          ? '<span class="danger">敵艦接觸 · 進入交戰</span>'
          : "";

    renderSquad();
    renderTargetHud();
    refreshTimers();
    if (g.dirty) {
      g.dirty = false;
      renderPlanet();
      renderMission();
    }
    const dailyState = JSON.stringify([
      g.save.dailyTasks,
      p.quests
        .filter((q) => q.repeat === "daily")
        .map((q) => questResetAt(q, Date.now())),
    ]);
    if (dailyState !== lastDailyState) {
      lastDailyState = dailyState;
      if (panel === "quests") drawPanel();
      missionKey = "";
      renderMission();
    }
    const jobState = g.save.jobs.map((j) => j.id).join(",");
    if (jobState !== lastJobs) {
      lastJobs = jobState;
      if (
        panel &&
        [
          "research",
          "summon",
          "colony",
          "roster",
          "character",
          "feed",
        ].includes(panel)
      )
        drawPanel();
    }
    if (ticks % 4 === 0) void g.tickEconomy();
    if (ticks % 12 === 0) void g.checkpoint();
  }, 250);
  renderPlanet();
  renderMission();
  renderSquad();
  cleanup = async () => {
    disposed = true;
    clearInterval(timer);
    clearTimeout(splashTimer);
    space.destroy();
    audio.destroy();
    root.removeEventListener("click", click);
    root.removeEventListener("change", change);
    document.removeEventListener("keydown", keys);
    document.removeEventListener("visibilitychange", visibility);
    disposeStory();
    window.removeEventListener("stella-dialog-open", dialogOpen);
    window.removeEventListener("stella-dialog-close", dialogClose);
    g.pause.add("unmounted");
    await g.checkpoint();
  };
  return cleanup;
}
