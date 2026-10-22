import type { Skill } from "./schema";
import type { Action, Modifier, Pattern } from "./mechanics";
export const patternNames: Record<Pattern, string> = {
  aim: "瞄準",
  fan: "扇形",
  ring: "環形",
  spiral: "螺旋",
  cross: "十字",
  burst: "連射",
  homing: "追蹤",
  sine: "波形",
  accelerating: "加速",
  piercing: "穿透",
  splash: "爆破",
  laser: "雷射",
  mine: "延時",
  shotgun: "散射",
  melee: "近戰",
  meleeFan: "近戰扇掃",
  meleeSplash: "近戰爆破",
  meleeSpear: "近戰突刺",
};
const statusNames: Record<Modifier["stat"], string> = {
  attack: "攻擊",
  defense: "防禦",
  attackSpeed: "攻速",
  moveSpeed: "移速",
  projectileSpeed: "彈速",
  critical: "暴擊率",
  evasion: "迴避率",
  damageTaken: "承受傷害",
  penetration: "敵方防禦",
  stun: "暈眩",
  corrosion: "侵蝕",
  blaze: "灼燒",
  invisible: "隱形",
  invincible: "無敵",
  taunt: "嘲諷",
  reflect: "反射",
  deflect: "偏折",
  directional: "前方減傷",
  redirect: "代受傷害",
  charge: "蓄積傷害",
  scale: "體型",
  absorb: "吸收",
  attackPattern: "普攻變更",
  decoy: "誘敵",
  offset: "抵消",
};
const n = (v: number) => Number(v.toFixed(2));
export function modifierDescription(m: Modifier) {
  let effect = ["stun", "invisible", "invincible", "taunt", "decoy"].includes(
    m.stat,
  )
    ? statusNames[m.stat]
    : ["reflect", "deflect", "offset"].includes(m.stat)
      ? `${n(m.value * 100)}%機率${statusNames[m.stat]}彈體`
      : m.stat === "attackPattern"
        ? `普攻改為${patternNames[m.pattern ?? "aim"]}`
        : m.stat === "directional"
          ? `前方傷害降低${n((1 - m.value) * 100)}%`
          : `${statusNames[m.stat]}${m.mode === "set" ? "設為" : m.mode === "add" ? "增加" : "提高至"}${n(m.value * 100)}%`;
  if (m.immune.length)
    effect += `，抵抗${m.immune.map((k) => ({ stun: "暈眩", corrosion: "侵蝕", blaze: "灼燒", laser: "雷射", melee: "近戰", taunt: "嘲諷", piercing: "穿透", splash: "濺射" })[k]).join("／")}`;
  return `${effect}（${n(m.duration)}秒）`;
}
export function actionDescription(a: Action) {
  const target = {
    self: "自身",
    allies: `範圍${n(a.radius)}內友軍`,
    enemies: `範圍${n(a.radius)}內敵人`,
    target: "鎖定目標",
  }[a.target];
  const atk = `自身攻擊${n(a.power * 100)}%`;
  let text = "";
  switch (a.kind) {
    case "status":
      text = `${target}：${a.modifiers.map(modifierDescription).join("；")}`;
      break;
    case "projectile":
      text = `發射${a.count}枚${patternNames[a.pattern]}彈，每枚造成${atk}傷害${a.pierce ? "，可穿透敵人" : ""}${a.splash ? `，爆破半徑${n(a.splash)}` : ""}${a.chain ? `，最多追擊${a.chain + 1}次` : ""}${a.splitCount ? `，分裂為${a.splitCount}枚子彈` : ""}${a.cancelOnTargetDeath ? "；鎖定目標死亡時取消" : ""}${a.modifiers.length ? `，命中附加${a.modifiers.map(modifierDescription).join("、")}` : ""}`;
      break;
    case "zone":
      text = `建立${a.follow ? "隨身" : "定點"}範圍場，半徑${n(a.radius)}、持續${n(a.duration)}秒${a.pull ? "，牽引範圍內敵人" : ""}${a.power ? `，每${n(a.interval)}秒造成${atk}傷害` : ""}${a.modifiers.length ? `，附加${a.modifiers.map(modifierDescription).join("、")}` : ""}`;
      break;
    case "beam":
      text = `施放${a.track ? "追蹤" : "直線"}雷射，寬${n(a.width)}、射程${n(a.radius)}、持續${n(a.duration)}秒，每${n(a.interval)}秒造成${atk}傷害`;
      break;
    case "summon":
      text = `召喚${a.count}個${{ clone: "分身", turret: "砲台", drone: "無人機", decoy: "誘敵裝置" }[a.summon]}，能力為自身${n(a.power * 100)}%，持續${n(a.duration)}秒`;
      break;
    case "heal":
      text = `${target}恢復${atk}的生命`;
      break;
    case "shield":
      text = `${target}獲得${atk}的護盾，持續${n(a.duration)}秒`;
      break;
    case "dash":
      text = `向目標突進${n(a.radius)}，路徑內敵人受到${atk}傷害`;
      break;
    case "cooldown":
      text = `${target}技能剩餘冷卻縮短${n(a.power * 100)}%`;
      break;
    case "timeStop":
      text = `停止敵方時間${n(a.duration)}秒；我方狀態時間與技能冷卻暫停`;
      break;
    case "bomb":
      text = `隨機指定敵人${a.count}次並轟炸半徑${n(a.radius)}內目標，造成${atk}傷害`;
      break;
    case "dispel":
      text = `清除${target}的所有狀態`;
      break;
    case "detonate":
      text = `向${target}釋放蓄積的傷害`;
      break;
  }
  return `${a.delay ? `蓄力${n(a.delay)}秒後，` : ""}${text}。`;
}
export function skillMechanic(s: Skill) {
  if (s.effect === "program")
    return s.actions!.map(actionDescription).join(" ");
  const n = s.power;
  return {
    shield: `全隊各獲得 ${n} 點護盾，持續 ${s.duration} 秒。護盾先於生命承受傷害。`,
    barrage: `向四周發射 12 枚能源彈，每枚攻擊力為自身的 ${Math.round(n * 100)}%。`,
    turret: `召喚砲台 ${s.duration} 秒；每 0.5 秒射擊一次，攻擊力為自身的 ${Math.round(n * 100)}%。`,
    fortify: `自身防禦提高至 ${Math.round(n * 100)}%，持續 ${s.duration} 秒。`,
    accelerate: `自身普攻冷卻流逝速度提高至 ${Math.round(n * 100)}%，持續 ${s.duration} 秒。`,
    weaken: `目前場上敵人的攻擊力降至 ${Math.round(n * 100)}%，持續 ${s.duration} 秒。`,
    heal: `我方所有存活成員各恢復 ${n} 點生命。`,
  }[s.effect];
}
