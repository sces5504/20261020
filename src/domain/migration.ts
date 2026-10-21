import type { Pack } from "../content/schema";
import type { Save } from "./model";
import { newSave, stats } from "./model";
import { saveSchema } from "./save-schema";
export type CompatibilityPlan = { save: Save; changes: string[] };
/** A lossless quarantine plan. The caller must back up and explicitly accept it. */
export function compatibilityPlan(raw: unknown, p: Pack): CompatibilityPlan {
  const s: Save = saveSchema.parse(raw);
  if (s.contentId !== p.id) throw Error("不同遊戲的存檔不能自動遷移。");
  const changes: string[] = [];
  const missing = s.roster.filter(
    (o) => !p.characters.some((c) => c.id === o.definition),
  );
  if (missing.length) {
    s.orphans.push(...missing);
    s.roster = s.roster.filter((o) => !missing.some((v) => v.id === o.id));
    changes.push(
      `${missing.length} 位缺失角色完整保存在隔離區，恢復原內容包即可取回。`,
    );
  }
  const restored = s.orphans.filter((o) =>
    p.characters.some((c) => c.id === o.definition),
  );
  if (restored.length) {
    s.roster.push(
      ...restored.filter((o) => !s.roster.some((v) => v.id === o.id)),
    );
    s.orphans = s.orphans.filter((o) => !restored.some((v) => v.id === o.id));
    changes.push(`恢復 ${restored.length} 位先前隔離的角色。`);
  }
  if (!s.roster.length) {
    s.roster = newSave(p, s.settledAt).roster;
    changes.push("所有角色暫不可用，提供起始隊伍；原角色仍在隔離區。");
  }
  for (const o of s.roster) {
    const max = stats(p, o).hp;
    if (o.hp > max) {
      o.hp = max;
      changes.push("生命超過新版上限的角色，調整至新版上限。");
    }
  }
  const oldTeam = s.team.join(",");
  s.team = s.team
    .filter((id) => s.roster.some((o) => o.id === id))
    .slice(0, p.rules.teamSize);
  if (!s.team.length)
    s.team = s.roster.slice(0, p.rules.teamSize).map((o) => o.id);
  if (oldTeam !== s.team.join(","))
    changes.push("依目前可用角色與編隊上限重整隊伍，保留所有角色。");
  for (const [id, col] of Object.entries(s.colonies)) {
    if (!p.planets.some((v) => v.id === id)) {
      s.orphanedColonies[id] = col;
      delete s.colonies[id];
      changes.push(`保留已移除星球 ${id} 的領地於隔離區。`);
    } else {
      if (!s.roster.some((o) => o.id === col.assigned)) col.assigned = "";
      for (const b of Object.keys(col.buildings))
        if (!p.buildings.some((v) => v.id === b)) {
          // Keep original building levels in the orphaned colony snapshot.
          s.orphanedColonies[id] ??= structuredClone(col);
          delete col.buildings[b];
          changes.push(`缺失建築 ${b} 的等級保留在領地備份。`);
        }
    }
  }
  const removedJobs = s.jobs.filter((j) =>
    j.kind === "summon"
      ? !p.characters.some((c) => c.id === j.payload)
      : j.kind === "heal"
        ? !s.roster.some((o) => o.id === j.owner)
        : j.kind === "build"
          ? !s.colonies[j.owner] ||
            !p.buildings.some((b) => b.id === j.definition)
          : !p.research.some((r) => r.id === j.definition),
  );
  for (const j of removedJobs) {
    s.orphanedJobs.push(j);
    for (const [id, n] of Object.entries(j.cost))
      s.wallet[id] = (s.wallet[id] ?? 0) + n;
    changes.push(`取消失去依賴的工作 ${j.kind}，退還原開工費用一次。`);
  }
  s.jobs = s.jobs.filter((j) => !removedJobs.some((v) => v.id === j.id));
  for (const [id, n] of Object.entries(s.wallet))
    if (!p.resources.some((r) => r.id === id)) {
      s.orphanedWallet[id] = (s.orphanedWallet[id] ?? 0) + n;
      delete s.wallet[id];
      changes.push(`缺失資源 ${id} 的 ${n} 保留於隔離帳本。`);
    }
  for (const r of p.resources) s.wallet[r.id] ??= 0;
  const region = p.regions.find((r) => r.id === s.region);
  if (!region) {
    const r = p.regions[0];
    s.region = r.id;
    s.x = r.startX;
    s.y = r.startY;
    s.encounter = null;
    changes.push("舊星域缺失，將隊伍移至起始安全航線，保留全部角色與資源。");
  } else {
    s.x = Math.min(region.width - 20, Math.max(20, s.x));
    s.y = Math.min(region.height - 20, Math.max(20, s.y));
  }
  // Cleared/quest/research receipts may outlive content and remain as historical progress.
  if (
    s.encounter &&
    !(s.encounter.kind === "patrol"
      ? p.regions.some((r) =>
          r.patrols.some((v) => v.id === s.encounter!.planet),
        )
      : p.planets.some((v) => v.id === s.encounter!.planet))
  ) {
    s.encounter = null;
    changes.push("舊遭遇已移除，返回安全航線。");
  }
  s.contentVersion = p.version;
  return { save: s, changes };
}
