import type { Skill } from "./schema";
export function skillMechanic(s: Skill) {
  if (s.effect === "program") return s.description;
  const n = s.power;
  return {
    program: s.description,
    shield: `全隊各獲得 ${n} 點護盾，持續 ${s.duration} 秒。護盾先於生命承受傷害。`,
    barrage: `向四周發射 12 枚能源彈，每枚攻擊力為自身的 ${Math.round(n * 100)}%。`,
    turret: `召喚砲台 ${s.duration} 秒；每 0.5 秒射擊一次，攻擊力為自身的 ${Math.round(n * 100)}%。`,
    fortify: `自身防禦提高至 ${Math.round(n * 100)}%，持續 ${s.duration} 秒。`,
    accelerate: `自身普攻冷卻流逝速度提高至 ${Math.round(n * 100)}%，持續 ${s.duration} 秒。`,
    weaken: `目前場上敵人的攻擊力降至 ${Math.round(n * 100)}%，持續 ${s.duration} 秒。`,
    heal: `我方所有存活成員各恢復 ${n} 點生命。`,
  }[s.effect];
}
