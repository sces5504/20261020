import presets from "../../content/source/stella-projectiles.json";
import {
  actionSchema,
  modifierSchema,
  patternTypes,
  statusTypes,
  type Action,
  type Modifier,
} from "../content/mechanics";
import { patternNames } from "../content/descriptions";
import { esc } from "./common";
const actionNames: Record<Action["kind"], string> = {
  status: "狀態增減／抗性",
  projectile: "發射彈體",
  zone: "持續範圍場",
  beam: "持續光束",
  summon: "召喚單位",
  heal: "治療",
  shield: "生命護盾",
  dash: "位移穿越",
  cooldown: "技能冷卻縮減",
  timeStop: "時間停止",
  bomb: "隨機轟炸",
  dispel: "清除狀態",
  detonate: "釋放蓄積傷害",
};
const labels: Record<string, string> = {
  kind: "動作",
  target: "作用目標",
  radius: "範圍／射程",
  duration: "持續秒數",
  travelTime: "移動秒數（0為瞬移）",
  power: "攻擊／能力倍率",
  count: "發射／召喚數",
  interval: "每次間隔秒數",
  delay: "蓄力秒數",
  pattern: "彈幕類型",
  speed: "彈體速度",
  spread: "彈體夾角（弧度）",
  width: "判定寬度",
  pierce: "額外穿透次數",
  splash: "爆破半徑",
  pull: "牽引速度／距離",
  summon: "召喚類型",
  follow: "跟隨施法者",
  track: "追蹤目標方向",
  origin: "產生位置",
  targeting: "選取方式",
  cancelOnTargetDeath: "目標死亡時取消",
  cadence: "逐發間隔（0為同時）",
  chain: "額外追擊次數",
  splitCount: "分裂子彈數",
  splitAfter: "最晚自動分裂秒數（0僅命中）",
  splitPower: "子彈傷害倍率",
  splashPower: "濺射傷害倍率",
  knockback: "擊退距離",
  rotation: "旋轉速度",
  startAngle: "起始角度",
  randomSpread: "隨機散射",
  spawnRadius: "彈體生成半徑",
  inward: "向生成中心收束",
  salvos: "齊射批數",
  salvoInterval: "齊射間隔",
  interruptible: "可被暈眩打斷",
  bypassEvasion: "無視迴避",
  suppressCritical: "不可暴擊",
};
const enumFields: Record<string, readonly string[]> = {
  kind: Object.keys(actionNames),
  target: ["self", "allies", "enemies", "target"],
  pattern: patternTypes,
  summon: ["clone", "turret", "drone", "decoy"],
  origin: ["owner", "target"],
  targeting: ["single", "spread", "random"],
};
const optionNames: Record<string, string> = {
  self: "自身",
  allies: "友軍",
  enemies: "敵軍",
  target: "目前目標",
  clone: "分身",
  turret: "砲台",
  drone: "無人機",
  decoy: "誘敵裝置",
  owner: "施法者位置",
  single: "單一目標",
  spread: "分配目標",
  random: "隨機目標",
  multiply: "倍率",
  add: "增加",
  set: "設為",
};
function options(
  list: readonly string[],
  selected: unknown,
  names: Record<string, string> = {},
) {
  return list
    .map(
      (v) =>
        `<option value="${v}" ${v === selected ? "selected" : ""}>${esc(names[v] ?? optionNames[v] ?? v)}</option>`,
    )
    .join("");
}
function actionFields(a: Action) {
  const fields: Record<Action["kind"], string[]> = {
    status: ["target", "radius", "modifiers"],
    projectile: [
      "target",
      "radius",
      "pattern",
      "power",
      "duration",
      "count",
      "speed",
      "spread",
      "width",
      "pierce",
      "splash",
      "pull",
      "targeting",
      "cancelOnTargetDeath",
      "cadence",
      "chain",
      "splitCount",
      "splitAfter",
      "splitPower",
      "splashPower",
      "knockback",
      "rotation",
      "startAngle",
      "randomSpread",
      "salvos",
      "salvoInterval",
      "spawnRadius",
      "inward",
      "modifiers",
      "bypassEvasion",
      "suppressCritical",
    ],
    zone: [
      "expanding",
      "once",
      "salvos",
      "salvoInterval",
      "target",
      "radius",
      "duration",
      "power",
      "interval",
      "pull",
      "follow",
      "origin",
      "modifiers",
      "bypassEvasion",
      "suppressCritical",
    ],
    beam: [
      "count",
      "spread",
      "rotation",
      "startAngle",
      "salvos",
      "salvoInterval",
      "target",
      "radius",
      "duration",
      "power",
      "interval",
      "width",
      "follow",
      "origin",
      "track",
      "cancelOnTargetDeath",
      "modifiers",
      "bypassEvasion",
      "suppressCritical",
    ],
    summon: ["duration", "count", "power", "summon", "modifiers"],
    heal: ["target", "radius", "power"],
    shield: ["target", "radius", "power", "duration"],
    dash: [
      "travelTime",
      "target",
      "radius",
      "width",
      "power",
      "modifiers",
      "bypassEvasion",
      "suppressCritical",
    ],
    cooldown: ["target", "radius", "power"],
    timeStop: ["duration"],
    bomb: [
      "target",
      "radius",
      "duration",
      "power",
      "count",
      "cadence",
      "interval",
      "modifiers",
      "bypassEvasion",
      "suppressCritical",
    ],
    dispel: ["target", "radius"],
    detonate: [
      "duration",
      "expanding",
      "once",
      "interval",
      "target",
      "radius",
      "power",
      "modifiers",
      "bypassEvasion",
      "suppressCritical",
    ],
  };
  const result = new Set(["kind", "delay", "interruptible", ...fields[a.kind]]);
  if (a.kind === "projectile" && a.pattern.startsWith("melee"))
    return new Set([
      "kind",
      "delay",
      "interruptible",
      "target",
      "radius",
      "pattern",
      "power",
      "width",
      "spread",
      "splash",
      "modifiers",
      "bypassEvasion",
      "suppressCritical",
    ]);
  return result;
}
function modifierFields(stat: Modifier["stat"]) {
  const result = new Set(["stat", "duration", "immune", "nullify"]);
  if (!["stun", "invisible", "invincible", "taunt", "decoy"].includes(stat))
    result.add("value");
  if (
    [
      "attack",
      "defense",
      "attackSpeed",
      "moveSpeed",
      "projectileSpeed",
      "critical",
      "evasion",
      "damageTaken",
      "penetration",
      "scale",
      "attackPattern",
    ].includes(stat)
  )
    result.add("mode");
  if (stat === "attackPattern") result.add("pattern");
  if (stat === "corrosion" || stat === "blaze") result.add("tick");
  if (["directional", "offset", "reflect", "deflect"].includes(stat))
    result.add("interceptRadius");
  if (stat === "decoy") result.add("categories");
  return result;
}
export function refreshMechanicFields(root: HTMLElement) {
  for (const row of root.querySelectorAll<HTMLElement>(".mechanic-row")) {
    const kind = row.querySelector<HTMLSelectElement>(
      '[data-action-prop="kind"]',
    )!.value;
    const pattern = row.querySelector<HTMLSelectElement>(
      '[data-action-prop="pattern"]',
    )!.value;
    const fields = actionFields(actionSchema.parse({ kind, pattern }));
    row
      .querySelectorAll<HTMLElement>("[data-action-control]")
      .forEach((el) => (el.hidden = !fields.has(el.dataset.actionControl!)));
  }
  for (const row of root.querySelectorAll<HTMLElement>(".modifier-row")) {
    const stat = row.querySelector<HTMLSelectElement>('[data-modifier="stat"]')!
      .value as Modifier["stat"];
    const fields = modifierFields(stat);
    row
      .querySelectorAll<HTMLElement>("[data-modifier-control]")
      .forEach((el) => (el.hidden = !fields.has(el.dataset.modifierControl!)));
  }
}
export function mechanicRow(raw: unknown = { kind: "projectile" }) {
  const a = actionSchema.parse(raw),
    fields = actionFields(a);
  return `<section class="mechanic-row"><label>原作彈幕家族模板<select data-projectile-preset><option value="">自訂動作</option>${presets.map((p) => `<option value="${p.id}">${p.table}[${p.row}] · ${esc(p.key)}</option>`).join("")}</select></label><div class="mechanic-grid">${Object.entries(
    a,
  )
    .filter(([k]) => k !== "modifiers")
    .map(
      ([k, v]) =>
        `<label data-action-control="${k}" ${fields.has(k) ? "" : "hidden"}>${esc(labels[k] ?? k)}${enumFields[k] ? `<select data-action-prop="${k}">${options(enumFields[k], v, k === "kind" ? actionNames : k === "pattern" ? patternNames : {})}</select>` : typeof v === "boolean" ? `<input type="checkbox" data-action-prop="${k}" ${v ? "checked" : ""}>` : `<input type="number" data-action-prop="${k}" value="${v}" step="any">`}</label>`,
    )
    .join(
      "",
    )}</div><details data-action-control="modifiers" ${fields.has("modifiers") ? "" : "hidden"} ${a.modifiers.length ? "open" : ""}><summary>附加狀態／抗性</summary><div class="modifier-rows">${a.modifiers.map(modifierRow).join("")}</div><button type="button" data-action="add-modifier">＋ 附加狀態</button></details><button type="button" class="danger-button" data-action="remove-row">移除此動作</button></section>`;
}
export function modifierRow(
  raw: unknown = { stat: "attack", value: 1.3, duration: 3 },
) {
  const m = modifierSchema.parse(raw),
    fields = modifierFields(m.stat);
  const wrap = (key: string, text: string, control: string) =>
    `<label data-modifier-control="${key}" ${fields.has(key) ? "" : "hidden"}>${text}${control}</label>`;
  return `<section class="modifier-row"><div class="mechanic-grid">${wrap("stat", "狀態", `<select data-modifier="stat">${options(statusTypes, m.stat)}</select>`)}${(
    [
      ["value", "數值（1＝100%）"],
      ["duration", "秒數"],
      ["tick", "週期間隔"],
      ["interceptRadius", "屏障半徑／定向寬度"],
    ] as const
  )
    .map(([key, label]) =>
      wrap(
        key,
        label,
        `<input data-modifier="${key}" type="number" step="any" value="${m[key]}">`,
      ),
    )
    .join(
      "",
    )}${wrap("mode", "計算方式", `<select data-modifier="mode">${options(["multiply", "add", "set"], m.mode)}</select>`)}${wrap("pattern", "變更普攻", `<select data-modifier="pattern"><option value="">沿用</option>${options(patternTypes, m.pattern, patternNames)}</select>`)}</div>${(
    [
      [
        "immune",
        [
          "stun",
          "corrosion",
          "blaze",
          "laser",
          "melee",
          "taunt",
          "piercing",
          "splash",
        ],
      ],
      ["nullify", ["piercing", "splash"]],
      [
        "categories",
        ["melee", "normal", "piercing", "splash", "homing", "laser"],
      ],
    ] as const
  )
    .map(
      ([key, values]) =>
        `<fieldset data-modifier-control="${key}" ${fields.has(key) ? "" : "hidden"}><legend>${{ immune: "抵抗傷害／異常", nullify: "使彈體附加效果無效", categories: "誘敵作用類型" }[key]}</legend><div class="checkbox-grid">${values.map((v) => `<label><input type="checkbox" data-modifier-array="${key}" value="${v}" ${(m[key] as readonly string[]).includes(v) ? "checked" : ""}>${esc(v)}</label>`).join("")}</div></fieldset>`,
    )
    .join(
      "",
    )}<button type="button" data-action="remove-row">移除此狀態</button></section>`;
}
export function collectActions(root: HTMLElement) {
  return [...root.querySelectorAll<HTMLElement>(".mechanic-row")].map((row) => {
    const a: Record<string, unknown> = {};
    for (const el of row.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
      "[data-action-prop]",
    ))
      a[el.dataset.actionProp!] =
        el instanceof HTMLInputElement
          ? el.type === "checkbox"
            ? el.checked
            : Number(el.value)
          : el.value;
    a.modifiers = [...row.querySelectorAll<HTMLElement>(".modifier-row")].map(
      (r) => {
        const m: Record<string, unknown> = {};
        for (const el of r.querySelectorAll<
          HTMLInputElement | HTMLSelectElement
        >("[data-modifier]"))
          if (el.value !== "")
            m[el.dataset.modifier!] =
              el instanceof HTMLInputElement ? Number(el.value) : el.value;
        for (const key of ["immune", "nullify", "categories"])
          m[key] = [
            ...r.querySelectorAll<HTMLInputElement>(
              `[data-modifier-array="${key}"]:checked`,
            ),
          ].map((i) => i.value);
        const parsed = modifierSchema.parse(m),
          fields = modifierFields(parsed.stat);
        return modifierSchema.parse({
          ...Object.fromEntries(
            Object.entries(parsed).filter(([k]) => fields.has(k)),
          ),
          value: fields.has("value") ? parsed.value : 1,
        });
      },
    );
    const parsed = actionSchema.parse(a),
      fields = actionFields(parsed);
    return actionSchema.parse(
      Object.fromEntries(Object.entries(parsed).filter(([k]) => fields.has(k))),
    );
  });
}
