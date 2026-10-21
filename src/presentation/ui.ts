import { icon } from "./icons";
import { skillMechanic } from "../content/descriptions";
import { ask } from "./dialog";
import { AudioMixer } from "../platform/audio";
import { acquisitionSources } from "../content/queries";
import type { Game } from "../application/game";
import type { Pack, Character } from "../content/schema";
import { stats, costScale, newSave, type Save } from "../domain/model";
import { production, questReady, summonCandidates } from "../domain/economy";
import { download, read } from "../platform/storage";
import { mountSpace } from "./space";
import { esc, button, amounts, portrait, entityImage } from "./common";
export { esc } from "./common";
export function mountGame(root: HTMLElement, g: Game, test: boolean) {
  const p = g.pack;
  const audio = new AudioMixer(p);
  let intelOpen = g.viewMode === "map";
  let selected = p.planets[0].id,
    panel = "",
    sub = "",
    storyId = "",
    storyIndex = 0,
    currentAcquisition = "",
    arrivalReturnPanel = "",
    timer: number;
  let recipe = p.characters[0].recipe.slice(),
    count = 1;
  let cleanup: () => void | Promise<void> = () => {};
  let disposed = false;
  root.innerHTML = `<main class="bridge"><header class="topbar"><a class="brand" href="#/play"><span class="brand-icon">✧</span><span>GALAXY ANGEL<small>星 海 航 跡</small></span></a><div id="wallet" class="wallet"></div><div class="top-actions">${button("設定", "panel", "archive", "icon-button")}<a class="studio-link" href="#/studio">內容工坊 ↗</a></div></header>
 <div class="sector-heading"><div><span class="eyebrow">HELIOS EXPEDITION / 01</span><h1>${esc(p.regions[0].name)}<span>探索航線</span></h1></div><div class="sector-status"><i></i> <span id="save-status">本機自動保存</span>${test ? "<strong>隔離測試</strong>" : ""}</div></div>
 <section class="viewport"><aside class="mission-rail"><div class="section-label">航行目標 <span>MISSION</span></div><div id="mission"></div><div class="rail-bottom"><span class="eyebrow">NAVIGATION</span><p>WASD／點擊星海航行<br>靠近星球自動掃描</p><div class="signal"><i></i><i></i><i></i><i></i><i></i></div><small>艦隊通訊連線中</small></div></aside>
 <div id="space" class="space" aria-label="星域戰場，點擊空白處移動，點擊星球查看情報" role="application"></div><div class="map-caption"><span>✧ 星域掃描</span><span id="coordinates"></span></div><div id="battle-state" class="battle-state"></div><div id="battle-tools" class="battle-tools"></div><aside id="planet-card" class="planet-card"></aside></section>
 <footer class="flight-deck"><div class="squad-heading"><span class="eyebrow">YOUR CONSTELLATION</span><strong>航行編隊</strong>${button("編隊 ↗", "panel", "formation", "text-button")}</div><div class="squad" id="squad"></div><nav class="deck-nav">${button(icon("resonance") + "星體共鳴", "panel", "summon")}${button(icon("research") + "共振研究", "panel", "research")}${button(icon("journal") + "航行紀錄", "panel", "quests")}${button(icon("planet") + "領地", "panel", "planets")}${button(icon("crew") + "角色", "panel", "roster")}${button(icon("pause") + "暫停", "pause", "", "pause-button")}</nav></footer>
 <div class="build-note">M1 試玩版 · 六位少女／一個星域</div><div class="toast" id="toast" role="status" aria-live="polite"></div><div id="skill-splash" class="skill-splash" aria-live="polite"></div><div id="overlay"></div></main>`;
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
  space.select(selected);
  $("#planet-card").hidden = true;
  let planetKey = "";
  function renderPlanet() {
    root.querySelector(".bridge")?.classList.toggle("in-battle", !!g.combat);
    const v = p.planets.find((v) => v.id === selected)!;
    const s = g.save,
      col = s.colonies[v.id],
      locked = !v.requires.every((id) => s.cleared.includes(id)),
      cleared = s.cleared.includes(v.id);
    $("#planet-card").hidden =
      !intelOpen ||
      !!g.combat ||
      (g.viewMode === "explore" && !g.discovered.has(v.id));
    const key = JSON.stringify([
      intelOpen,
      g.viewMode,
      g.discovered.has(v.id),
      v.id,
      col?.active,
      col?.lost,
      col?.buildings,
      locked,
      cleared,
      !!g.combat,
    ]);
    if (key === planetKey) return;
    planetKey = key;
    $("#planet-card").innerHTML =
      `${button("✕", "intel-close", "", "intel-dismiss")}<div class="section-label">星球情報 <span>INTEL</span></div>${entityImage(p, v, "intel-planet-art")}<span class="eyebrow">${col?.active ? "COLONY" : "UNEXPLORED SIGNAL"}</span><h2>${esc(v.name)}</h2><div class="tags"><span>${locked ? "航線未開放" : col?.lost ? "生產待恢復" : cleared ? "已解放" : "敵方佔領"}</span><span>${v.enemies.some((e) => p.enemies.find((v) => v.id === e.enemy)?.boss) ? "首領訊號" : "一般據點"}</span></div><p>${locked ? "解放前一個據點以開啟航路。" : col?.lost ? "設施已停產。修復後即可恢復生產。" : col?.active ? "生產設施運作中。可於領地總覽統一管理全部星球。" : "追蹤陌生的星體訊號，建立新的前進據點。"}</p><div class="intel-row"><span>偵測敵群</span><strong>${v.enemies.reduce((a, b) => a + b.count, 0)} 組訊號</strong></div><div class="intel-row"><span>${col?.active ? "每分鐘產量" : "首次解放獎勵"}</span></div><div class="costs">${amounts(p, col?.active ? Object.fromEntries(Object.entries(v.production).map(([id, n]) => [id, n * 60])) : v.reward)}</div>${col?.active ? button("管理星球 →", "panel", "colony", "primary") : cleared ? button("啟動星球 →", "activate", v.id, "primary") : button("出擊 · 解放星球 →", "battle", v.id, "primary", locked || !!g.combat)}${cleared && !col?.active ? `<div class="costs">${amounts(p, v.activationCost)}</div>` : ""}`;
  }
  let missionKey = "";
  function renderMission() {
    const key = JSON.stringify([
      g.save.quests,
      g.save.cleared,
      Object.entries(g.save.colonies).map(([id, c]) => [id, c.active, c.lost]),
    ]);
    if (key === missionKey) return;
    missionKey = key;
    const ready = p.quests.find(
      (q) => !g.save.quests.includes(q.id) && questReady(g.save, q),
    );
    const next = p.planets.find(
      (v) =>
        !g.save.cleared.includes(v.id) &&
        v.requires.every((id) => g.save.cleared.includes(id)),
    );
    $("#mission").innerHTML =
      `<div class="mission-number">${String(Math.min(g.save.cleared.length + 1, p.planets.length)).padStart(2, "0")}<span>／ ${String(p.planets.length).padStart(2, "0")}</span></div><h3>${ready ? "新的航行紀錄" : next ? "追尋下一道訊號" : "星域航路已開啟"}</h3><p>${ready ? esc(ready.name) : next ? `解放 ${esc(next.name)}<br>拓展我們的星海航跡` : "發展據點、收集少女，為下一段旅程準備。"}</p>${button(ready ? "查看紀錄 →" : "追蹤航路 →", ready ? "panel" : "track", ready ? "quests" : (next?.id ?? p.planets[0].id), "text-button")}${button("操作指南 ↗", "panel", "guide", "text-button")}<div class="progress-track"><span style="width:${(g.save.cleared.length / p.planets.length) * 100}%"></span></div><small>星域解放 ${g.save.cleared.length} / ${p.planets.length}</small>`;
  }
  let squadKey = "";
  function renderSquad() {
    const s = g.save;
    const key = JSON.stringify([
      s.team,
      s.roster.map((o) => [o.id, o.level]),
      !!g.combat,
    ]);
    if (key === squadKey) {
      s.team.forEach((id) => {
        const o = s.roster.find((o) => o.id === id)!,
          c = p.characters.find((c) => c.id === o.definition)!,
          unit = g.combat?.allies.find((u) => u.id === id),
          card = root.querySelector<HTMLElement>(
            `.squad-card[data-id="${CSS.escape(id)}"]`,
          );
        if (!card) return;
        const hp = card.querySelector<HTMLElement>(".hp-bar span");
        if (hp)
          hp.style.width = `${Math.max(0, ((unit?.hp ?? o.hp) / (unit?.maxHp ?? stats(p, o).hp)) * 100)}%`;
        const label = card.querySelector<HTMLElement>(".skill-label");
        if (label)
          label.textContent = g.combat
            ? `${p.skills.find((sk) => sk.id === c.skill)!.name} · ${unit && unit.skillCooldown > 0 ? unit.skillCooldown.toFixed(1) + "s" : "就緒"}`
            : c.role;
      });
      return;
    }
    squadKey = key;
    $("#squad").innerHTML = s.team
      .map((id) => {
        const o = s.roster.find((o) => o.id === id)!,
          c = p.characters.find((c) => c.id === o.definition)!,
          unit = g.combat?.allies.find((u) => u.id === id),
          hp = unit?.hp ?? o.hp,
          max = unit?.maxHp ?? stats(p, o).hp,
          skill = p.skills.find((sk) => sk.id === c.skill)!;
        return `<button class="squad-card" style="--c:${c.color}" data-action="${g.combat ? "cast" : "character"}" data-id="${esc(id)}">${portrait(p, c)}<div><span class="rarity">${"★".repeat(c.rarity)}</span><strong>${esc(c.name)} <small>Lv.${o.level}</small></strong><div class="hp-bar"><span style="width:${Math.max(0, (hp / max) * 100)}%"></span></div><small class="skill-label">${g.combat ? `${esc(skill.name)} · ${unit && unit.skillCooldown > 0 ? unit.skillCooldown.toFixed(1) + "s" : "就緒"}` : esc(c.role)}</small></div></button>`;
      })
      .join("");
  }
  function jobList() {
    return g.save.jobs.length
      ? g.save.jobs
          .map(
            (j) =>
              `<div class="job"><span>${esc(j.kind === "summon" ? "星體共鳴" : j.kind === "heal" ? "整補治療" : (p.buildings.find((v) => v.id === j.definition)?.name ?? p.research.find((v) => v.id === j.definition)?.name ?? j.kind))}</span><strong data-ends="${j.ends}"></strong></div>`,
          )
          .join("")
      : '<p class="muted">目前沒有進行中的工作。</p>';
  }
  function heading(title: string, kicker: string) {
    return `<div class="modal-heading"><div><span class="eyebrow">${kicker}</span><h2>${esc(title)}</h2></div>${button("✕", "close", "", "icon-button")}</div>`;
  }
  function rosterHtml() {
    return `<div class="character-grid">${g.save.roster
      .map((o) => {
        const c = p.characters.find((c) => c.id === o.definition)!,
          st = stats(p, o),
          skill = p.skills.find((s) => s.id === c.skill)!,
          assigned = Object.entries(g.save.colonies).find(
            ([, v]) => v.assigned === o.id,
          );
        return `<article class="character-card">${button(portrait(p, c, true), "character", o.id, "portrait-button")}<div class="character-info"><span class="rarity">${"★".repeat(c.rarity)}</span><h3>${esc(c.name)} <small>Lv.${o.level}</small></h3><p>${esc(c.role)}</p><div class="stat-grid"><span>生命<strong>${Math.ceil(o.hp)} / ${st.hp}</strong></span><span>攻擊<strong>${Math.round(st.attack)}</strong></span><span>防禦<strong>${Math.round(st.defense)}</strong></span></div><p><strong>${esc(skill.name)}</strong> · 冷卻 ${skill.cooldown}s</p><p class="skill-copy">${esc(skillMechanic(skill))}</p><div class="character-actions">${button(g.save.team.includes(o.id) ? "移出編隊" : "加入編隊", "team", o.id, "", !!assigned)}${button("強化 ↑", "level", o.id)}${button("整補", "heal", o.id, "", o.hp >= st.hp)}</div><small>${
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
      )}</div><h3 class="collection-heading">星體圖鑑 · ${new Set(g.save.roster.map((o) => o.definition)).size} / ${p.characters.length}</h3><div class="collection-grid">${p.characters.map((c) => `<article class="collection-card ${g.save.roster.some((o) => o.definition === c.id) ? "owned" : "locked"}">${portrait(p, c, true)}<div><span class="rarity">${"★".repeat(c.rarity)}</span><h3>${esc(c.name)}</h3><p>${acquisitionSources(p, c.id).map(esc).join(" · ") || "目前無取得來源"}</p></div></article>`).join("")}</div>`;
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
      body = rosterHtml();
    }
    if (panel === "character") {
      const o = s.roster.find((o) => o.id === sub)!;
      const c = p.characters.find((c) => c.id === o.definition)!;
      const st = stats(p, o),
        skill = p.skills.find((sk) => sk.id === c.skill)!;
      title = c.name;
      kick = "STELLAR PROFILE";
      body = `<div class="character-detail">${portrait(p, c, true)}<div class="profile-copy"><span class="rarity">${"★".repeat(c.rarity)}</span><h2>${esc(c.name)} <small>Lv.${o.level}</small></h2><p class="role-tag">${esc(c.role)}</p><p>${esc(c.description)}</p><div class="stat-grid"><span>生命<strong>${Math.ceil(o.hp)} / ${st.hp}</strong></span><span>攻擊<strong>${Math.round(st.attack)}</strong></span><span>防禦<strong>${Math.round(st.defense)}</strong></span></div><section class="skill-detail"><span class="eyebrow">ACTIVE SKILL · ${skill.cooldown}s</span><h3>${esc(skill.name)}</h3><p>${esc(skill.description)}</p><strong>${esc(skillMechanic(skill))}</strong></section><div class="costs">${amounts(p, costScale(p.rules.levelCost, o.level))}</div><div class="inline-actions">${button("強化 +1", "level", o.id)}${button("整補", "heal", o.id, "", o.hp >= st.hp)}${button("調整編隊 →", "panel", "formation", "primary")}</div><p class="muted">取得方式：${acquisitionSources(p, c.id).map(esc).join("／")}</p></div></div>`;
    }
    if (panel === "formation") {
      title = "航行編隊";
      kick = "FLEET FORMATION";
      body = `<p class="muted">最多 ${p.rules.teamSize} 人。01 為前鋒，較容易先接敵，建議配置坦克；後續站位為錯開的後衛。使用前移／後移調整順序，戰鬥中鎖定編隊。</p><div class="formation-slots">${s.team
        .map((id, i) => {
          const o = s.roster.find((o) => o.id === id)!;
          const c = p.characters.find((c) => c.id === o.definition)!;
          return `<div><span>0${i + 1}</span>${portrait(p, c)}<strong>${esc(c.name)}</strong>${button("詳細", "character", id, "text-button")}<small>${i === 0 ? "前鋒 · 優先接敵" : "後衛 · 支援火力"}</small><div class="inline-actions">${button("前移", "team-forward", id, "text-button", !!g.combat || i === 0)}${button("後移", "team-back", id, "text-button", !!g.combat || i === s.team.length - 1)}</div></div>`;
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
    }
    if (panel === "planets") {
      title = "領地總覽";
      kick = "PLANETARY NETWORK";
      body = `<p class="muted">${Object.values(s.colonies).filter((c) => c.active).length} 顆已啟動星球。所有領地持續生產，不會遭受防衛襲擊。</p><div class="costs">${amounts(p, Object.fromEntries(Object.entries(production(p, s)).map(([id, n]) => [id, n * 60])))}<small>／分鐘，全部領地</small></div><div class="list-cards">${
        p.planets
          .filter((v) => s.cleared.includes(v.id) || s.colonies[v.id])
          .map((v) => {
            const col = s.colonies[v.id];
            return `<article class="territory-card">${entityImage(p, v)}<span class="eyebrow">${col?.active ? "PRODUCTION ONLINE" : "AWAITING ACTIVATION"}</span><h3>${esc(v.name)}</h3><p>${esc(v.description)}</p><div class="costs">${amounts(p, Object.fromEntries(Object.entries(v.production).map(([id, n]) => [id, n * 60])))}</div>${button(col?.active ? "管理建設 →" : "啟動星球 →", col?.active ? "manage-planet" : "activate", v.id, "primary")}${button("導航至星球", "navigate", v.id, "text-button")}</article>`;
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
        ? `<div class="acquisition-screen" style="--c:${c.color}"><div class="acquisition-rays"></div>${portrait(p, c, true)}<div class="acquisition-copy"><span class="eyebrow">${s.roster.filter((o) => o.definition === c.id).length > 1 ? "RESONANCE · 再次相遇" : "NEW MAIDEN"}</span><span class="rarity">${"★".repeat(c.rarity)}</span><h2>${esc(c.name)}</h2><p>${esc(c.role)}</p><p>${esc(c.description)}</p>${button("確認獲得 →", "acquisition-next", "", "primary")}</div></div>`
        : "<p>少女已加入編隊庫。</p>";
    }
    if (panel === "research") {
      title = "共振研究";
      kick = "RESONANCE LAB";
      body = `<p class="muted">研究持續進行，戰鬥期間完成的加成會在下場戰鬥生效。</p><div class="list-cards">${p.research.map((r) => `<article><span class="eyebrow">${r.seconds} SEC</span><h3>${esc(r.name)}</h3><p>${esc(r.description)}</p><div class="costs">${amounts(p, r.cost)}</div>${button(s.research.includes(r.id) ? "研究完成" : "開始研究", "research", r.id, "primary", s.research.includes(r.id) || s.jobs.some((j) => j.definition === r.id) || !r.requires.every((id) => s.research.includes(id)))}</article>`).join("")}</div><h3>工作佇列</h3><div id="jobs">${jobList()}</div>`;
    }
    if (panel === "summon") {
      title = "星體共鳴";
      kick = "STELLAR RESONANCE";
      body = `<div class="summon-layout"><div class="resonance-orb">✧<span>CONNECTING THE STARS</span></div><div><p>調整四資源投入，尋找與少女相近的共鳴訊號。</p><label>配方預設<select id="preset">${p.characters.map((c) => `<option value="${esc(c.id)}">${esc(c.name)}的共鳴配方</option>`).join("")}</select></label><div class="recipe-inputs">${p.resources.map((r, i) => `<label style="--c:${r.color}">${esc(r.name)}<input class="recipe" data-slot="${i}" type="number" min="1" max="999" value="${recipe[i]}"></label>`).join("")}</div><div id="recipe-info"></div><label>批次數量<input id="batch-count" type="number" min="1" max="${p.rules.summonSlots}" value="${count}"></label>${button("確認投入並共鳴 →", "summon", "", "primary")}<p class="muted">${p.rules.summonSeconds} 秒完成 · 可同時 ${p.rules.summonSlots} 組 · 結果在開工時確定</p></div></div><h3>共鳴工作</h3><div id="jobs">${jobList()}</div>`;
    }
    if (panel === "colony") {
      const v = p.planets.find((v) => v.id === selected)!,
        col = s.colonies[selected];
      title = v.name;
      kick = "PLANETARY OPERATIONS";
      body = !col
        ? "<p>請先啟動星球。</p>"
        : `<div class="colony-summary">${entityImage(p, v)}<div><span class="eyebrow">${col.lost ? "PRODUCTION SUSPENDED" : "PRODUCTION ONLINE"}</span><h3>${col.lost ? "生產待恢復 · 停產中" : "生產運作中"}</h3><p>星球持續提供資源；可建造、升級與派駐，增加產能。</p></div></div><div class="costs">${amounts(p, Object.fromEntries(Object.entries(production(p, { ...s, colonies: { [selected]: col } })).map(([id, n]) => [id, n * 60])))}<small>／分鐘，此星球目前產量</small></div><div class="list-cards">${p.buildings.map((b) => `<article class="building-card">${entityImage(p, b)}<span class="eyebrow">LEVEL ${col.buildings[b.id] ?? 0} / ${b.maxLevel}</span><h3>${esc(b.name)}</h3><p>${esc(b.description)} · ${b.seconds}s</p><div class="costs">${amounts(p, costScale(b.cost, (col.buildings[b.id] ?? 0) + 1))}</div>${button("建造／升級", "build", b.id, "primary", col.lost || (col.buildings[b.id] ?? 0) >= b.maxLevel || s.jobs.some((j) => j.kind === "build" && j.owner === selected))}</article>`).join("")}</div><h3>派駐少女 <small>採集站產出 +20%</small></h3><div class="inline-actions">${
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
    if (panel === "quests") {
      title = "航行紀錄";
      kick = "VOYAGE JOURNAL";
      body = `<div class="list-cards">${p.quests.map((q) => `<article><span class="eyebrow">${s.quests.includes(q.id) ? "ARCHIVED" : questReady(s, q) ? "SIGNAL RECEIVED" : "AWAITING SIGNAL"}</span><h3>${esc(q.name)}</h3><p>${esc(q.description || q.dialogue[0].text)}</p>${button("閱讀對話 →", "story", q.id, "text-button")}<div class="costs">${amounts(p, q.reward)}</div>${button(s.quests.includes(q.id) ? "已收錄" : "收錄並領取獎勵", "quest", q.id, "primary", s.quests.includes(q.id) || !questReady(s, q))}</article>`).join("")}</div>`;
    }
    if (panel === "guide") {
      title = "航行指南";
      kick = "FLIGHT MANUAL";
      body = `<ol class="guide-steps"><li><strong>探索與出擊</strong><p>在銀河裡航行並靠近星球，或切換大星圖規劃航路。WASD／點空白處移動，拖曳平移鏡頭；滾輪或雙指可縮放，「跟隨」返回隊伍。</p></li><li><strong>走位與技能</strong><p>普通攻擊自動進行。點敵人鎖定，點下方角色或鍵盤1～6施放技能。紅色線條是敵方射擊預警，移動避開。</p></li><li><strong>啟動與經營</strong><p>解放星球後啟動生產，再建造採集站與研究。多數工作在數十秒至數分鐘內完成，管理面板只暫停戰鬥。</p></li><li><strong>收集與編成</strong><p>四資源共鳴、首次解放與任務可取得少女。在編成中強化、整補與更換隊伍。</p></li><li><strong>領地與存檔</strong><p>領地總覽可管理所有星球、查看產能與進行建設。可於設定匯出／匯入存檔。</p></li></ol>`;
    }
    if (panel === "result" && g.report) {
      title = g.report.title;
      kick = g.report.victory ? "MISSION COMPLETE" : "FLIGHT REPORT";
      body = `<div class="result-screen"><span>${g.report.victory ? "✧" : "◇"}</span><p>${esc(g.report.message)}</p>${g.report.planet && g.report.victory && !s.colonies[g.report.planet]?.active ? button("啟動剛解放的星球", "result-activate", g.report.planet, "primary") : ""}${button("返回航線 →", "close", "", "primary")}</div>`;
    }
    if (panel === "archive") {
      title = "航行設定";
      kick = "SAVE & PREFERENCES";
      body = `<div class="settings-list"><h3>本機進度</h3><p>進度自動保存在此瀏覽器。跨裝置時，請匯出後在另一裝置匯入。</p><div class="inline-actions">${button("匯出存檔", "export-save", "", "primary")}<label class="file-button">匯入存檔<input id="import-save" type="file" accept="application/json,.json"></label>${button("匯出還原備份", "export-backup")}</div>${button("開始新航跡（先備份）", "new-voyage")}<h3>聲音與畫面</h3><div class="inline-actions">${button(audio.enabled ? "聲音：開啟" : "聲音：關閉", "sound")}${button(g.lowEffects ? "特效：精簡" : "特效：完整", "effects")}</div><label>音效音量<input id="audio-volume" type="range" min="0" max="1" step="0.05" value="${audio.volume}"></label><h3>戰鬥操作</h3><p>點空白處移動與閃躲；普通攻擊自動進行。點敵人優先鎖定，點下方角色施放技能。</p>${button(g.autoSkills ? "自動技能：開啟" : "自動技能：關閉", "auto")}<h3>角色製作表</h3><a href="#/catalog">查看未來角色清單／下載 CSV ↗</a><h3>內容工坊</h3><p>瀏覽與調整內容，套用至隔離測試遊戲；完成後匯出內容包再發布。</p><a class="primary link-button" href="#/studio">進入內容工坊 ↗</a>${test ? '<p><a href="#/play">退出隔離測試，返回正式進度</a></p>' : ""}<details><summary>開發版狀態</summary><p>六張原始立繪已匯入，已套用原先六角色；原圖展示入口在內容工坊。音效採可編輯的程序合成，星球與敵艦為原創程序材質。M1的平衡／劇情與部分技能為明示的新設計；原作未知機制仍保留來源缺口。</p></details></div>`;
    }
    $("#overlay").innerHTML =
      `<div class="modal-backdrop"><section class="modal ${["roster", "formation", "character", "acquisition"].includes(panel) ? "wide" : ""}" role="dialog" aria-modal="true" aria-label="${esc(title)}">${heading(title, kick)}<div class="modal-body">${body}</div><div class="modal-footer"><i></i> 戰鬥已暫停 · 經營計時持續</div></section></div>`;
    if (panel === "summon") recipeInfo();
    refreshTimers();
    $("#overlay")
      .querySelector<HTMLButtonElement>('[data-action="close"]')
      ?.focus();
  }
  function recipeInfo() {
    const info = $("#recipe-info");
    if (!info) return;
    const pool = summonCandidates(p, recipe);
    info.innerHTML = `<div class="costs">${amounts(p, Object.fromEntries(p.resources.map((r, i) => [r.id, recipe[i] * count])))}</div><small class="muted">共鳴接近：${pool
      .slice(0, 3)
      .map((v) => esc(v.character.name))
      .join("、")} · 配方不保證取得</small>`;
  }
  async function act(action: string, id: string) {
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
    if (action === "navigate") {
      const v = p.planets.find((v) => v.id === id)!;
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
    if (action === "result-activate") {
      await g.command({ type: "activate", planet: id });
      selected = id;
      g.report = null;
      panel = "colony";
      drawPanel();
      renderPlanet();
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
      g.report = null;
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
    if (action === "pause") {
      if (g.pause.has("user")) g.pause.delete("user");
      else g.pause.add("user");
      return;
    }
    if (action === "cast") {
      if (!g.pause.size && g.combat?.cast(id)) audio.cue("skill");
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
        await g.replaceSave(newSave(p, Date.now(), test ? "test" : "voyager"));
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
    if (action === "repair") await g.command({ type: "repair", planet: id });
    if (action === "build")
      await g.command({ type: "build", planet: selected, building: id });
    if (action === "research") await g.command({ type: "research", id });
    if (action === "team-forward" || action === "team-back")
      await g.command({
        type: "reorder-team",
        owned: id,
        direction: action === "team-forward" ? -1 : 1,
      });
    if (action === "team") await g.command({ type: "team", owned: id });
    if (action === "level") await g.command({ type: "level", owned: id });
    if (action === "heal") await g.command({ type: "heal", owned: id });
    if (action === "assign")
      await g.command({ type: "assign", owned: id, planet: selected });
    if (action === "quest") await g.command({ type: "quest", id });
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
  const keys = (e: KeyboardEvent) => {
    if ((e.target as HTMLElement).matches("input,textarea,select")) return;
    if (e.key === "Escape") {
      if (panel) {
        if (panel === "story") void act("story-skip", "");
        else void act("close", "");
      } else void act("pause", "");
    }
    if (!panel && ["1", "2", "3", "4", "5", "6"].includes(e.key)) {
      const u = g.save.team[Number(e.key) - 1];
      if (u) g.combat?.cast(u);
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
    root
      .querySelectorAll<HTMLElement>("[data-ends]")
      .forEach(
        (el) =>
          (el.textContent = `${Math.max(0, Math.ceil((Number(el.dataset.ends) - Date.now()) / 1000))}s`),
      );
  }
  const seenSkillFlashes = new WeakSet<object>();
  let splashTimer = 0;
  let ticks = 0,
    lastJobs = "",
    lastNotice = "",
    noticeUntil = 0;
  timer = window.setInterval(() => {
    if (disposed) return;
    ticks++;
    for (const event of g.events.splice(0)) audio.cue(event);
    for (const flash of g.combat?.flashes ?? []) {
      const sk = p.skills.find((s) => s.name === flash.label);
      if (!sk || seenSkillFlashes.has(flash)) continue;
      seenSkillFlashes.add(flash);
      audio.cue("skill");
      const c = p.characters.find((c) => c.skill === sk.id);
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
      !g.report &&
      !["story", "acquisition"].includes(panel) &&
      g.save.acquisitionQueue.length
    ) {
      arrivalReturnPanel = panel;
      audio.cue("arrival");
      currentAcquisition = g.save.acquisitionQueue[0];
      panel = "acquisition";
      drawPanel();
    }
    if (!panel && !g.combat && !g.report) {
      const q = p.quests.find(
        (q) => questReady(g.save, q) && !g.save.storySeen.includes(q.id),
      );
      if (q) {
        storyId = q.id;
        storyIndex = 0;
        panel = "story";
        drawPanel();
      }
    }
    if (
      g.report &&
      panel !== "result" &&
      !["story", "acquisition"].includes(panel)
    ) {
      panel = "result";
      drawPanel();
    }
    const battleTools = $("#battle-tools");
    const toolKey = String(!!g.combat) + g.viewMode + String(g.autoSkills);
    if (battleTools.dataset.key !== toolKey) {
      battleTools.dataset.key = toolKey;
      battleTools.innerHTML = `${button(g.viewMode === "map" ? "◈ 銀河航行" : "◇ 大星圖", "view")}${button("◎ 跟隨", "follow")}${g.combat ? button(g.autoSkills ? "自動技能：開" : "自動技能：關", "auto") + button("技能情報", "panel", "skills") + button("撤離", "retreat") : ""}<small id="wave-clock"></small>`;
    }
    const wave = root.querySelector("#wave-clock");
    if (wave)
      wave.textContent = g.combat
        ? `波次 ${g.combat.waveIndex + 1}/${g.combat.waveGroups.length} · ${Math.floor(g.combat.time)}s${g.combat.nextWaveAt ? " · 增援接近" : ""}`
        : "";

    const rates = production(p, g.save);
    $("#wallet").innerHTML = p.resources
      .map(
        (r) =>
          `<div class="resource" style="--c:${r.color}"><span>◆</span><div><small>${esc(r.name)}</small><strong>${Math.floor(g.save.wallet[r.id] ?? 0).toLocaleString()}</strong></div><em>+${((rates[r.id] ?? 0) * 60).toFixed(0)}/m</em></div>`,
      )
      .join("");
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
    $("#toast").classList.toggle(
      "visible",
      !!g.error || (!!g.notice && Date.now() < noticeUntil),
    );
    $("#battle-state").innerHTML = g.pause.size
      ? `<span>Ⅱ ${panel ? "管理中" : g.pause.has("background") ? "背景暫停" : "已暫停"}</span>`
      : g.combat
        ? '<span class="danger">◆ 交戰中 · WASD／點擊閃躲</span>'
        : "";
    renderSquad();
    refreshTimers();
    if (g.dirty) {
      g.dirty = false;
      renderPlanet();
      renderMission();
    }
    const jobState = g.save.jobs.map((j) => j.id).join(",");
    if (jobState !== lastJobs) {
      lastJobs = jobState;
      if (panel && ["research", "summon", "colony"].includes(panel))
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
    window.removeEventListener("stella-dialog-open", dialogOpen);
    window.removeEventListener("stella-dialog-close", dialogClose);
    g.pause.add("unmounted");
    await g.checkpoint();
  };
  return cleanup;
}
