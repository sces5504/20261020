import projectilePresets from "../../content/source/stella-projectiles.json";
import {
  mechanicRow,
  modifierRow,
  refreshMechanicFields,
} from "./skill-editor";
import { ARCHIVE_BYTES } from "../platform/budgets";
import { mountLaboratory } from "./laboratory";
import { patternTypes } from "../content/mechanics";
import { effectTypes } from "../content/schema";
import { lockStudio } from "./studio-access";
import { ask } from "./dialog";
import {
  complexField,
  collectComplex,
  acquisitionFields,
  spawnRow,
  dialogueRow,
} from "./editor-fields";
import { AudioMixer } from "../platform/audio";
import { verifyMedia } from "../platform/media";
import { stats } from "../domain/model";
import { published } from "../content";
import {
  type Pack,
  type Kind,
  type Entity,
  kinds,
  kindNames,
  validatePack,
  references,
  entitySchemas,
} from "../content/schema";
import {
  read,
  write,
  download,
  parseProject,
  type Project,
} from "../platform/storage";
import { exportPack, importPack } from "../platform/packages";
import { esc, button, entityImage } from "./common";
export async function mountStudio(root: HTMLElement) {
  let project = (await read<Project>("editor:project")) ?? {
    schemaVersion: 1 as const,
    revision: 0,
    pack: structuredClone(published),
    past: [],
    future: [],
  };
  project = parseProject(project);
  const previewMixers: AudioMixer[] = [];
  let closeLab: (() => void) | undefined;
  let storageError = false;
  let kind: Kind = "characters",
    selected = project.pack.characters[0].id,
    search = "",
    message = "",
    disposed = false;
  let queue = Promise.resolve();
  let operationPending = false;
  function busy(on: boolean) {
    operationPending = on;
    if (disposed) return;
    root.setAttribute("aria-busy", String(on));
    root.querySelectorAll<HTMLButtonElement>("button").forEach((b) => {
      if (on) {
        b.dataset.previousDisabled = String(b.disabled);
        b.disabled = true;
      } else if (b.dataset.previousDisabled !== undefined) {
        b.disabled = b.dataset.previousDisabled === "true";
        delete b.dataset.previousDisabled;
      }
    });
  }

  root.innerHTML = `<main class="studio"><header class="studio-header"><a class="brand" href="#/play"><span class="brand-icon">✧</span><span>GALAXY ANGEL STUDIO<small>星 河 戰 姬 · 內 容 工 坊</small></span></a><div class="inline-actions"><a href="#/art">全部角色圖鑑 ↗</a><a href="#/play">返回遊戲 ↗</a></div></header><div class="studio-title"><div><span class="eyebrow">CONTENT WORKSPACE / LOCAL DRAFT</span><h1>每一道星光，由你定義。</h1><p>瀏覽、調整、試玩，再將你的星海匯出。</p></div><div class="studio-actions">${button("技能測試訓練場", "laboratory")}${button("復原", "undo")}${button("重做", "redo")}${button("套用至測試遊戲 ↗", "test", "", "primary")}</div></div><div class="studio-toolbar"><span id="project-status"></span><div>${button("從新版正式內容建立草稿", "use-published")}${button("新增項目", "new")}${button("校驗內容", "validate")}${button("鎖定工坊", "lock-studio")}${button("專案備份", "backup-project")}<label class="file-button">匯入專案／內容包<input id="import-project" type="file" accept=".json,.zip"></label>${button("匯出內容 ZIP", "export-pack")}</div></div><div class="studio-grid"><aside class="catalog-nav" id="catalog-nav"></aside><section class="catalog"><label class="search">搜尋內容<input id="catalog-search" type="search" placeholder="名稱或穩定 ID"></label><div id="catalog-list"></div></section><section class="inspector" id="inspector"></section></div><div class="studio-report" id="report" role="status"></div></main>`;
  const $ = (s: string) => root.querySelector<HTMLElement>(s)!;
  function status() {
    if (disposed) return;
    $("#project-status").textContent =
      `${project.pack.name} · v${project.pack.version} · 草稿修訂 ${project.revision} · 僅保存在本機`;
    $("#report").textContent =
      message ||
      (project.pack.version !== published.version
        ? `目前是 v${project.pack.version} 舊草稿；正式版 v${published.version} 已有原作技能、圖片與彈幕設定。請先備份，再選「從新版正式內容建立草稿」，不會自動覆蓋你的修改。`
        : "選擇內容可檢視外觀，修改後先套用至隔離測試遊戲。");
  }
  async function save() {
    project.revision++;
    const value = structuredClone(project);
    queue = queue
      .then(() => write("editor:project", value))
      .then(() => {
        storageError = false;
        message = "草稿已保存，正式遊戲與玩家進度未變更。";
        status();
      })
      .catch((e) => {
        storageError = true;
        message = `草稿保存失敗：${String(e)}。請匯出專案保留內容。`;
        status();
      });
    await queue;
  }
  function checkpoint() {
    project.past.push(structuredClone(project.pack));
    if (project.past.length > 30) project.past.shift();
    while (
      project.past.length > 1 &&
      project.past.reduce(
        (n, p) => n + p.assets.reduce((a, b) => a + b.src.length, 0),
        0,
      ) >
        30 * 1024 * 1024
    )
      project.past.shift();
    project.future = [];
  }
  function drawList() {
    const list = (project.pack[kind] as Entity[]).filter((e) =>
      `${e.name} ${e.id}`.toLowerCase().includes(search.toLowerCase()),
    );
    $("#catalog-nav").innerHTML = kinds
      .map((k) =>
        button(
          `${kindNames[k]} <small>${project.pack[k].length}</small>`,
          "kind",
          k,
          k === kind ? "selected" : "",
        ),
      )
      .join("");
    $("#catalog-list").innerHTML = list
      .map(
        (e) =>
          `<button data-action="select" data-id="${esc(e.id)}" class="catalog-item ${selected === e.id ? "selected" : ""}">${entityImage(project.pack, e)}<span class="catalog-dot" style="--c:${"color" in e ? esc(e.color) : "#a5c7ce"}">${kind === "characters" ? "✧" : kind === "planets" ? "◉" : "◇"}</span><span><strong>${esc(e.name)}</strong><small>${esc(e.id)}</small></span><span class="entity-status">${"status" in e && e.status === "retired" ? "退休" : "素材" in e ? "素材" : "配置"}</span></button>`,
      )
      .join("");
  }
  const labels: Record<string, string> = {
    story: "劇情流程（嚴格JSON；欄位說明見 story-core-authoring.md）",
    storyEncounter: "劇情戰鬥：目標、演員、增援與戰中對話",
    variants: "NPC差分名稱 → 素材 ID",
    id: "穩定 ID",
    kind: "世界節點類型",
    initiallyCleared: "初始已解放（無首勝獎勵）",
    resupplyCost: "基地每人整補費用（{}為免費，未設沿用全域）",
    requiresActive: "需要先啟動的星球",
    hiddenUntilUnlocked: "前置未完成時隱藏",
    encounterPolicy: "接敵方式（auto／manual）",
    timeLimitSeconds: "挑戰時限（有效戰鬥秒）",
    objective: "勝利目標（eliminate／damage）",
    schedule: "每日開放排程（星期0為週日）",
    growthReference: "原生CID成長基準（ATK／DEF／HP）",
    sourceRef: "原作來源與推定依據",
    campaignStart: "可選新航跡起點",
    summonable: "可透過共鳴取得",
    category: "分類（航區campaign／hard／event／daily；音效依選項）",
    waveform: "波形",
    startHz: "起始頻率 Hz",
    endHz: "結束頻率 Hz",
    gain: "音量（0～0.4）",
    noise: "噪音混合（0～1）",
    name: "名稱",
    description: "描述",
    status: "生命週期",
    provenance: "規則來源",
    rarity: "星級",
    hp: "基礎生命",
    attack: "基礎攻擊",
    defense: "基礎防禦",
    speed: "移動速度（世界單位／秒）",
    range: "射程（世界單位）",
    interval: "普通攻擊間隔（秒）",
    growth: "每級成長比例",
    skill: "技能",
    color: "主題色",
    portrait: "立繪素材",
    avatar: "頭像素材",
    sprite: "戰鬥／星球素材",
    recipe: "四資源配方（依資源列表順序）",
    starter: "新存檔起始角色",
    role: "定位",
    waves: "後續波次（每波敵群列表）",
    waveDelay: "增援間隔（秒）",
    discoveryRadius: "探索掃描半徑",
    patrols:
      "巡邏：座標、半徑 patrolRadius、速度 patrolSpeed、偵測 detectionRadius、相位 phase、敵群與獎勵",
    background: "對話情境背景",
    formationSpacing: "編隊間距（世界單位）",
    allySpriteSize: "少女顯示大小",
    enemySpriteSize: "敵人顯示大小",
    bossSpriteSize: "Boss 顯示大小",
    sourceRow: "來源 CID row（唯讀）",
    effect: "效果原語",
    power: "效果強度",
    duration: "效果持續（秒）",
    cooldown: "冷卻（秒）",
    region: "所屬星域",
    x: "世界 X",
    y: "世界 Y",
    radius: "顯示半徑",
    requires: "前置 ID 列表",
    enemies: "敵群配置",
    reward: "獎勵資源",
    activationCost: "啟動／修復費用",
    production: "每秒產量",
    dropCharacters: "首次解放取得角色 ID",
    cost: "費用",
    seconds: "完成時間（秒）",
    maxLevel: "等級上限",
    attackBonus: "全隊攻擊加成",
    condition: "達成條件",
    repeat: "重複週期",
    utcOffsetMinutes: "換日時區（UTC分鐘）",
    resetHour: "換日小時（0–23）",
    target: "目標 ID",
    count: "需求次數",
    character: "獎勵角色 ID",
    dialogue: "劇情對白",
    projectileSpeed: "彈速",
    orbitSpeed: "敵人側移角速上限（0為停止射擊）",
    strafeSpeed: "射程內側移速度上限",
    routes: "星域航線（目的地 to／顯示 label／前置 requires）",
    engageRadius: "星球自動交戰半徑",
    guardRadius: "守軍初始分布半徑",
    leashWarningRadius: "交戰邊界警告半徑",
    leashRadius: "守軍重置半徑",
    resetSeconds: "越界重置倒數（秒）",
    pattern: "彈幕模式",
    phasePattern: "第二階段彈幕",
    critical: "基礎暴擊率（0–0.95）",
    evasion: "基礎迴避率（0–0.95）",
    actions: "技能動作（第1級）",
    levels: "技能等級2–10覆寫",
    volleyCount: "每次齊射數量",
    volleySpread: "彈體夾角（弧度）",
    boss: "首領",
    phaseAt: "第二階段生命比例",
    width: "寬度",
    height: "高度",
    startX: "起點 X",
    startY: "起點 Y",
    src: "素材引用",
    hash: "素材 SHA-256",
    review: "審閱狀態",
  };
  const links: Record<string, Kind> = {
    skill: "skills",
    portrait: "assets",
    avatar: "assets",
    sprite: "assets",
    background: "assets",
    region: "regions",
    character: "characters",
  };
  function field(k: string, v: unknown) {
    const complex = complexField(project.pack, kind, k, v, labels[k] ?? k);
    if (complex) return complex;
    const attr = `data-field="${k}"`,
      disabled = [
        "id",
        "sourceRow",
        "hash",
        "src",
        ...(kind === "assets" ? ["width", "height"] : []),
      ].includes(k)
        ? "disabled"
        : "";
    let control = "";
    if (links[k]) {
      const choices = project.pack[links[k]] as Entity[];
      control = `<select ${attr}>${k !== "skill" && k !== "region" ? '<option value="">未指定</option>' : ""}${choices.map((e) => `<option value="${esc(e.id)}" ${v === e.id ? "selected" : ""}>${esc(e.name)}</option>`).join("")}</select>`;
    } else if (typeof v === "boolean")
      control = `<input ${attr} type="checkbox" ${v ? "checked" : ""}>`;
    else if (typeof v === "number")
      control = `<input ${attr} type="number" step="any" value="${v}" ${disabled}>`;
    else if (
      k === "status" ||
      k === "provenance" ||
      k === "review" ||
      k === "effect" ||
      k === "pattern" ||
      k === "phasePattern" ||
      k === "repeat" ||
      k === "condition"
    ) {
      const vals =
        k === "status"
          ? ["active", "retired"]
          : k === "provenance"
            ? ["research", "inferred", "m1-design"]
            : k === "review"
              ? ["candidate", "approved"]
              : k === "effect"
                ? effectTypes
                : k === "pattern" || k === "phasePattern"
                  ? patternTypes
                  : k === "repeat"
                    ? ["once", "daily"]
                    : [
                        "intro",
                        "cleared",
                        "activated",
                        "summoned",
                        "built",
                        "battleWon",
                        "leveled",
                        "healed",
                        "constructed",
                        "upgraded",
                        "eventWon",
                      ];
      control = `<select ${attr}>${vals.map((x) => `<option ${x === v ? "selected" : ""}>${x}</option>`).join("")}</select>`;
    } else if (typeof v === "object" || k === "description")
      control = `<textarea ${attr} rows="${typeof v === "object" ? Math.min(10, JSON.stringify(v, null, 2).split("\n").length) : 3}">${esc(typeof v === "object" ? JSON.stringify(v, null, 2) : v)}</textarea>`;
    else
      control = `<input ${attr} type="${k === "color" ? "color" : "text"}" value="${esc(k === "src" && String(v).startsWith("data:") ? "內嵌媒體（隨內容包匯出）" : v)}" ${disabled}>`;
    return `<label class="field ${typeof v === "object" ? "full" : ""}"><span>${esc(labels[k] ?? k)}</span>${control}</label>`;
  }
  function inspect() {
    const e = (project.pack[kind] as Entity[]).find((v) => v.id === selected);
    if (!e) {
      $("#inspector").innerHTML = '<p class="empty">此分類目前沒有內容。</p>';
      return;
    }
    const p = project.pack,
      refs = references(p, e.id),
      c =
        kind === "characters"
          ? p.characters.find((c) => c.id === e.id)
          : undefined,
      asset = c
        ? p.assets.find((a) => a.id === c.portrait)
        : kind === "assets"
          ? p.assets.find((a) => a.id === e.id)
          : p.assets.find(
              (a) =>
                a.id ===
                ("sprite" in e
                  ? e.sprite
                  : "background" in e
                    ? e.background
                    : ""),
            );
    $("#inspector").innerHTML =
      `<div class="inspector-heading"><div><span class="eyebrow">${kindNames[kind]} / INSPECTOR</span><h2>${esc(e.name)}</h2><small>${esc(e.id)}</small></div><div>${button("複製為新項目", "clone", e.id)}${button("移除", "delete", e.id, "danger-button")}</div></div>${asset ? `<div class="asset-preview"><img src="${esc(asset.src)}" alt="${esc(asset.name)}"></div>` : ""}${c ? `<div class="level-preview"><label>能力預覽等級<input id="preview-level" type="number" min="1" max="${p.rules.maxLevel}" value="1"></label><span id="effective-stats">生命 ${c.hp} · 攻擊 ${c.attack} · 防禦 ${c.defense}</span></div>` : ""}${kind === "audio" ? button("▶ 試聽此音效", "preview-audio") : ""}<form id="entity-form" class="entity-form">${Object.entries(
        e,
      )
        .filter(
          ([k]) =>
            ![
              "waves",
              "waveDelay",
              ...(kind === "skills" && "effect" in e && e.effect === "program"
                ? ["power", "duration"]
                : []),
            ].includes(k),
        )
        .map(([k, v]) => field(k, v))
        .join(
          "",
        )}${kind === "skills" && !("actions" in e) ? field("actions", []) : ""}${kind === "quests" && !("story" in e) ? field("story", null) : ""}${kind === "planets" && !("storyEncounter" in e) ? field("storyEncounter", null) : ""}${c ? acquisitionFields(p, c.id) : ""}<div class="form-actions full">${button("保存此項調整", "save-entity", "", "primary")}<span>保存草稿後，套用測試才影響試玩。</span></div></form><details><summary>引用影響 · ${refs.length} 項</summary><ul>${refs.map((v) => `<li>${esc(v)}</li>`).join("") || "<li>無其他定義引用</li>"}</ul><p>持有角色、所在星域或進行中工作缺失時，舊存檔會拒絕載入並保留原檔；退休比移除更適合既有內容。</p></details><div class="asset-import"><h3>匯入外觀素材</h3><p>PNG／JPEG／WebP，單張最多 8 MiB；媒體會隨 ZIP 匯出。立繪、頭像及 SD 分別引用，不改變碰撞與戰力。</p><label class="file-button">新增圖片到素材庫<input id="upload-asset" type="file" accept="image/png,image/jpeg,image/webp"></label></div><details><summary>進階：此項 JSON</summary><textarea id="raw-entity" rows="15">${esc(JSON.stringify(e, null, 2))}</textarea>${button("套用 JSON", "apply-json")}</details>`;
  }
  function draw() {
    drawList();
    inspect();
    status();
  }
  async function updateEntity(raw: unknown) {
    const old = (project.pack[kind] as Entity[]).find(
      (v) => v.id === selected,
    )!;
    const parsed = entitySchemas[kind].safeParse(raw);
    if (!parsed.success)
      throw Error(
        parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("\n"),
      );
    if (parsed.data.id !== old.id)
      throw Error("穩定 ID 不可直接修改，請複製為新項目。");
    checkpoint();
    const list = project.pack[kind] as Entity[];
    list[list.findIndex((v) => v.id === selected)] = parsed.data;
    if (kind === "characters") {
      root
        .querySelectorAll<HTMLInputElement>("[data-get-planet]")
        .forEach((el) => {
          const planet = project.pack.planets.find(
            (v) => v.id === el.dataset.getPlanet,
          )!;
          planet.dropCharacters = planet.dropCharacters.filter(
            (id) => id !== selected,
          );
          if (el.checked) planet.dropCharacters.push(selected);
        });
      root
        .querySelectorAll<HTMLInputElement>("[data-get-quest]")
        .forEach((el) => {
          const q = project.pack.quests.find(
            (v) => v.id === el.dataset.getQuest,
          )!;
          if (el.checked) q.character = selected;
          else if (q.character === selected) q.character = "";
        });
    }
    await save();
    draw();
  }
  function validate() {
    const r = validatePack(project.pack);
    message = r.errors.length
      ? r.errors.join("\n")
      : "內容結構、引用、前置與支援能力校驗通過。素材審閱／真機品質需另外驗收。";
    status();
    return r.pack;
  }
  async function act(action: string, id: string) {
    if (action === "laboratory") {
      const valid = validatePack(project.pack);
      if (!valid.pack) throw Error(valid.errors.join("\n"));
      closeLab?.();
      closeLab = mountLaboratory(root, valid.pack);
      return;
    }
    if (action === "lock-studio") {
      if (
        await ask("鎖定工坊？已保存的草稿會保留，尚未保存的表單調整會放棄。")
      ) {
        lockStudio();
        location.reload();
      }
      return;
    }
    if (action === "add-mechanic") {
      root
        .querySelector(".mechanic-rows")
        ?.insertAdjacentHTML("beforeend", mechanicRow());
      return;
    }
    if (action === "add-spawn") {
      root
        .querySelector(".spawn-rows")
        ?.insertAdjacentHTML(
          "beforeend",
          spawnRow(project.pack, project.pack.enemies[0]?.id ?? "", 1),
        );
      return;
    }
    if (action === "add-dialogue") {
      root
        .querySelector(".dialogue-rows")
        ?.insertAdjacentHTML("beforeend", dialogueRow("", ""));
      return;
    }
    if (action === "preview-audio") {
      const cue = project.pack.audio.find((c) => c.id === selected);
      if (cue) {
        const m = new AudioMixer({ ...project.pack, audio: [cue] });
        m.enabled = true;
        previewMixers.push(m);
        await m.unlock();
        m.cue(cue.category);
        setTimeout(() => m.destroy(), 3500);
      }
      return;
    }
    if (action === "use-published") {
      if (
        !(await ask(
          `先保留目前草稿於復原歷史，再改用正式內容 v${published.version}。自訂資料不會自動合併；可用復原取回。`,
          "更新草稿基底",
        ))
      )
        return;
      checkpoint();
      project.pack = structuredClone(published);
      selected = project.pack[kind][0]?.id ?? "";
      await save();
      draw();
      return;
    }
    if (action === "new") {
      const template =
        project.pack[kind][0] ??
        published[kind][0] ??
        (kind === "actors"
          ? {
              id: "draft:actor",
              name: "測試NPC（請替換）",
              portrait: project.pack.assets[0].id,
              variants: {},
            }
          : undefined);
      if (!template) throw Error("請先匯入此分類的資料範本。");
      checkpoint();
      const copy = structuredClone(template);
      copy.id = `${project.pack.id.split(":")[0]}:new-${crypto.randomUUID().slice(0, 8)}`;
      copy.name = "新增" + kindNames[kind];
      if ("starter" in copy) copy.starter = false;
      (project.pack[kind] as Entity[]).push(copy);
      selected = copy.id;
      await save();
      draw();
      return;
    }

    if (action === "kind") {
      kind = id as Kind;
      selected = project.pack[kind][0]?.id ?? "";
      draw();
      return;
    }
    if (action === "select") {
      selected = id;
      drawList();
      inspect();
      return;
    }
    if (action === "save-entity") {
      const e = (project.pack[kind] as Entity[]).find(
          (v) => v.id === selected,
        )!,
        raw = structuredClone(e) as Record<string, unknown>;
      root
        .querySelectorAll<
          HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
        >("[data-field]")
        .forEach((t) => {
          const key = t.dataset.field!;
          if (t.disabled) return;
          const old = raw[key];
          raw[key] =
            typeof old === "boolean"
              ? (t as HTMLInputElement).checked
              : typeof old === "number"
                ? Number(t.value)
                : typeof old === "object" ||
                    ["story", "storyEncounter"].includes(key)
                  ? JSON.parse(t.value)
                  : t.value;
        });
      if (raw.story === null) delete raw.story;
      if (raw.storyEncounter === null) delete raw.storyEncounter;
      collectComplex(root, raw);
      await updateEntity(raw);
      return;
    }
    if (action === "apply-json") {
      await updateEntity(
        JSON.parse(($("textarea#raw-entity") as HTMLTextAreaElement).value),
      );
      return;
    }
    if (action === "clone") {
      const old = (project.pack[kind] as Entity[]).find(
        (v) => v.id === selected,
      )!;
      const next = structuredClone(old);
      next.id = `${project.pack.id.split(":")[0]}:copy-${crypto.randomUUID().slice(0, 8)}`;
      next.name += " · 副本";
      if ("starter" in next) next.starter = false;
      checkpoint();
      (project.pack[kind] as Entity[]).push(next);
      selected = next.id;
      await save();
      draw();
      return;
    }
    if (action === "delete") {
      const e = (project.pack[kind] as Entity[]).find(
          (v) => v.id === selected,
        )!,
        refs = references(project.pack, e.id);
      if (refs.length)
        throw Error("此內容仍被引用，請先處理：\n" + refs.join("\n"));
      if (
        !(await ask(
          `移除「${e.name}」？持有此內容的舊存檔將需要恢復內容或提供遷移；建議優先改為 retired。`,
        ))
      )
        return;
      checkpoint();
      (project.pack[kind] as Entity[]) = (
        project.pack[kind] as Entity[]
      ).filter((v) => v.id !== id);
      selected = project.pack[kind][0]?.id ?? "";
      await save();
      draw();
      return;
    }
    if (action === "undo" && project.past.length) {
      project.future.push(structuredClone(project.pack));
      project.pack = project.past.pop()!;
      await save();
      draw();
      return;
    }
    if (action === "redo" && project.future.length) {
      project.past.push(structuredClone(project.pack));
      project.pack = project.future.pop()!;
      await save();
      draw();
      return;
    }
    if (action === "validate") {
      validate();
      return;
    }
    if (action === "backup-project") {
      await queue;
      download("stella-editor-project.json", JSON.stringify(project));
      return;
    }
    if (action === "export-pack") {
      const valid = validate();
      if (!valid) return;
      await verifyMedia(valid);
      const zip = await exportPack(valid);
      download(
        "stella-content.zip",
        new Uint8Array(zip).buffer,
        "application/zip",
      );
      message = "已匯出內容包；尚未發布至正式遊戲。";
      status();
      return;
    }
    if (action === "test") {
      const valid = validate();
      if (!valid) return;
      await verifyMedia(valid);
      await queue;
      if (storageError) throw Error("草稿尚未保存，請先匯出專案備份或重試。");
      await write("content:test", valid);
      await write("save:test", undefined);
      location.hash = "#/test";
    }
  }
  async function upload(file: File) {
    if (file.size > 8 * 1024 * 1024) throw Error("圖片超過 8 MiB。");
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
      throw Error("不支援此格式。");
    const bitmap = await createImageBitmap(file);
    if (bitmap.width > 8192 || bitmap.height > 8192) {
      bitmap.close();
      throw Error("圖片尺寸超過 8192px。");
    }
    const { width, height } = bitmap;
    bitmap.close();
    const bytes = await file.arrayBuffer(),
      hash = Array.from(
        new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
        (v) => v.toString(16).padStart(2, "0"),
      ).join("");
    const src = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(r.error);
      r.readAsDataURL(file);
    });
    checkpoint();
    const asset = {
      id: `${project.pack.id.split(":")[0]}:asset-${hash.slice(0, 16)}`,
      name: file.name,
      src,
      width,
      height,
      hash,
      review: "candidate" as const,
    };
    if (!project.pack.assets.some((a) => a.id === asset.id))
      project.pack.assets.push(asset);
    await save();
    inspect();
    message = `已加入素材 ${asset.id}。請在立繪／頭像／SD 欄位選取後保存。`;
    status();
  }
  const click = (e: Event) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>("[data-action]");
    if (!b || operationPending) return;
    e.preventDefault();
    if (b.dataset.action === "remove-row") {
      b
        .closest(".spawn-row,.dialogue-row,.mechanic-row,.modifier-row")
        ?.remove();
      return;
    }
    if (b.dataset.action === "add-modifier") {
      b
        .closest(".mechanic-row")
        ?.querySelector(".modifier-rows")
        ?.insertAdjacentHTML("beforeend", modifierRow());
      return;
    }
    busy(true);
    void act(b.dataset.action!, b.dataset.id ?? "")
      .catch((e) => {
        message = e instanceof Error ? e.message : String(e);
        status();
      })
      .finally(() => busy(false));
  };
  const change = async (e: Event) => {
    const t = e.target as HTMLInputElement;
    if (operationPending) return;
    if (
      t.dataset.actionProp === "kind" ||
      t.dataset.actionProp === "pattern" ||
      t.dataset.modifier === "stat"
    ) {
      refreshMechanicFields(root);
      return;
    }
    if (t.dataset.projectilePreset !== undefined && t.value) {
      const preset = projectilePresets.find((p) => p.id === t.value);
      if (preset)
        t.closest(".mechanic-row")!.outerHTML = mechanicRow(preset.action);
      return;
    }
    busy(true);
    try {
      if (t.id === "upload-asset" && t.files?.[0]) await upload(t.files[0]);
      if (t.id === "import-project" && t.files?.[0]) {
        const f = t.files[0];
        if (f.size > ARCHIVE_BYTES) throw Error("匯入檔案超過 64 MiB。");
        message = "正在讀取並驗證完整內容與圖片，完成後會顯示匯入確認。";
        status();
        const next = f.name.endsWith(".zip")
          ? {
              ...project,
              pack: importPack(new Uint8Array(await f.arrayBuffer())),
            }
          : parseProject(JSON.parse(await f.text()));
        await verifyMedia(next.pack);
        if (
          !(await ask(
            "將保留目前草稿於復原歷史，再匯入所選專案／內容包。確定繼續？",
          ))
        )
          return;
        checkpoint();
        project.pack = next.pack;
        await save();
        selected = project.pack[kind][0]?.id ?? "";
        draw();
      }
    } catch (e) {
      message = e instanceof Error ? e.message : String(e);
      status();
    } finally {
      busy(false);
    }
  };
  const input = (e: Event) => {
    const t = e.target as HTMLInputElement;
    if (t.id === "catalog-search") {
      search = t.value;
      drawList();
    }
    if (t.id === "preview-level") {
      const c = project.pack.characters.find((v) => v.id === selected);
      if (c) {
        const st = stats(project.pack, {
          id: "preview",
          definition: c.id,
          level: Math.max(
            1,
            Math.min(project.pack.rules.maxLevel, Number(t.value)),
          ),
          hp: 0,
        });
        $("#effective-stats").textContent =
          `生命 ${Math.round(st.hp)} · 攻擊 ${Math.round(st.attack)} · 防禦 ${Math.round(st.defense)}`;
      }
    }
  };
  root.addEventListener("click", click);
  root.addEventListener("change", change);
  root.addEventListener("input", input);
  root.addEventListener("submit", (e) => e.preventDefault());
  draw();
  return () => {
    disposed = true;
    closeLab?.();
    previewMixers.forEach((m) => m.destroy());
    root.removeEventListener("click", click);
    root.removeEventListener("change", change);
    root.removeEventListener("input", input);
  };
}
