import {
  refreshStory,
  beginStory,
  advanceStory,
  storyEncounterResult,
  storyFact,
} from "./story";
import {
  advanceDaily,
  questClaimed,
  questPeriod,
  questProgress,
} from "./daily-quests";
import type { Pack } from "../content/schema";
import { nodeAvailability, nodeCleared, nodeUnlocked } from "./world";
import {
  type Save,
  type Wallet,
  stats,
  money,
  canAfford,
  costScale,
  random,
  addCharacter,
} from "./model";
export function production(p: Pack, s: Save): Wallet {
  const rates: Wallet = {};
  for (const [id, c] of Object.entries(s.colonies)) {
    if (!c.active || c.lost) continue;
    const def = p.planets.find((v) => v.id === id);
    if (!def || def.kind !== "planet") continue;
    for (const [r, n] of Object.entries(def.production))
      rates[r] = (rates[r] ?? 0) + n;
    for (const [bid, level] of Object.entries(c.buildings)) {
      const b = p.buildings.find((v) => v.id === bid);
      if (b)
        for (const [r, n] of Object.entries(b.production))
          rates[r] = (rates[r] ?? 0) + n * level * (c.assigned ? 1.2 : 1);
    }
  }
  return rates;
}
function accrue(p: Pack, s: Save, seconds: number) {
  for (const [r, n] of Object.entries(production(p, s))) {
    const cap = p.resources.find((v) => v.id === r)?.capacity ?? 0;
    const old = s.wallet[r] ?? 0;
    s.wallet[r] = Math.max(old, Math.min(cap, old + n * seconds));
  }
}
function complete(p: Pack, s: Save, j: Save["jobs"][number]) {
  if (s.receipts.includes(j.id)) return;
  if (j.kind === "build") {
    const c = s.colonies[j.owner];
    if (c) {
      storyFact(
        s,
        (c.buildings[j.definition] ?? 0) === 0 ? "constructed" : "upgraded",
        j.definition,
      );
      advanceDaily(
        p,
        s,
        (c.buildings[j.definition] ?? 0) === 0 ? "constructed" : "upgraded",
        j.ends,
      );
      c.buildings[j.definition] = (c.buildings[j.definition] ?? 0) + 1;
      s.built++;
      advanceDaily(p, s, "built", j.ends);
    }
  }
  if (j.kind === "research" && !s.research.includes(j.definition))
    s.research.push(j.definition);
  if (j.kind === "summon") {
    const acquired = addCharacter(p, s, j.payload, j.cost);
    if (acquired) s.acquisitionQueue.push(acquired.id);
    s.summoned++;
    advanceDaily(p, s, "summoned", j.ends);
  }
  if (j.kind === "heal") {
    const o = s.roster.find((v) => v.id === j.owner);
    if (o) {
      o.hp = stats(p, o).hp;
      advanceDaily(p, s, "healed", j.ends);
    }
  }
  storyFact(
    s,
    j.kind === "build"
      ? "built"
      : j.kind === "research"
        ? "research"
        : j.kind === "heal"
          ? "healed"
          : "summoned",
    j.kind === "summon"
      ? j.payload
      : j.kind === "heal"
        ? (s.roster.find((o) => o.id === j.owner)?.definition ?? j.definition)
        : j.definition,
  );
  s.receipts.push(j.id);
}
export function settle(p: Pack, s: Save, now: number) {
  if (now <= s.settledAt) return;
  const limit = s.settledAt + p.rules.offlineCapSeconds * 1000,
    end = Math.min(now, limit);
  let cursor = s.settledAt;
  const due = s.jobs
    .filter((j) => j.ends <= end)
    .sort((a, b) => a.ends - b.ends || a.id.localeCompare(b.id));
  for (const j of due) {
    const at = Math.max(cursor, j.ends);
    accrue(p, s, (at - cursor) / 1000);
    complete(p, s, j);
    cursor = at;
  }
  accrue(p, s, (end - cursor) / 1000);
  s.jobs = s.jobs.filter((j) => j.ends > end);
  // Jobs mature even after capped production; no missed-time attack simulation.
  for (const j of s.jobs
    .filter((j) => j.ends <= now)
    .sort((a, b) => a.ends - b.ends || a.id.localeCompare(b.id)))
    complete(p, s, j);
  s.jobs = s.jobs.filter((j) => j.ends > now);
  s.settledAt = now;
  refreshStory(p, s);
}
export type Command =
  | { type: "story-start"; id: string }
  | { type: "story-next"; skip?: boolean }
  | { type: "story-battle" }
  | { type: "story-cue"; index: number }
  | { type: "travel"; region: string }
  | { type: "feed"; target: string; source: string }
  | { type: "seen-story"; id: string }
  | { type: "ack-acquisition"; id: string }
  | { type: "patrol"; id: string }
  | { type: "activate"; planet: string }
  | { type: "resupply"; planet: string }
  | { type: "repair"; planet: string }
  | { type: "build"; planet: string; building: string }
  | { type: "research"; id: string }
  | { type: "summon"; recipe: number[]; count: number }
  | { type: "heal"; owned: string }
  | { type: "level"; owned: string }
  | { type: "team"; owned: string }
  | { type: "reorder-team"; owned: string; direction: -1 | 1 }
  | { type: "assign"; owned: string; planet: string }
  | { type: "quest"; id: string }
  | { type: "begin"; planet: string }
  | {
      type: "result";
      planet: string;
      victory: boolean;
      hp: Record<string, number>;
      reset?: boolean;
      receipt: string;
      scoreRatio?: number;
    }
  | {
      type: "checkpoint";
      x: number;
      y: number;
      raids?: Record<string, number>;
      losses?: string[];
      discovered?: string[];
      voyageSeconds?: number;
      heading?: number;
    };
export function questReady(
  s: Save,
  q: Pack["quests"][number],
  now = Date.now(),
) {
  if (q.story) return s.story?.completed.includes(q.id) ?? false;
  if (q.repeat === "daily")
    return !questClaimed(s, q, now) && questProgress(s, q, now) >= q.count;
  return q.condition === "intro"
    ? true
    : q.condition === "cleared"
      ? s.cleared.includes(q.target)
      : q.condition === "activated"
        ? !!s.colonies[q.target]?.active
        : q.condition === "summoned"
          ? s.summoned >= q.count
          : s.built >= q.count;
}
export function summonCandidates(p: Pack, recipe: number[]) {
  return p.characters
    .filter((c) => c.status === "active" && c.summonable !== false)
    .map((c) => ({
      character: c,
      distance: c.recipe.reduce((n, v, i) => n + Math.abs(v - recipe[i]), 0),
    }))
    .sort(
      (a, b) =>
        a.distance - b.distance || a.character.id.localeCompare(b.character.id),
    )
    .slice(0, 5);
}
export function apply(
  p: Pack,
  previous: Save,
  c: Command,
  now: number,
  commandId: string,
): Save {
  const s = structuredClone(previous);
  refreshStory(p, s);
  s.dailyClaims ??= {};
  s.dailyAttempts ??= {};
  settle(p, s, now);
  if (s.receipts.includes(commandId)) return s;
  const pay = (cost: Wallet) => {
    if (!canAfford(s, cost)) throw Error("資源不足，尚未扣除費用。");
    money(s, cost, -1);
  };
  const job = (
    kind: Save["jobs"][number]["kind"],
    owner: string,
    definition: string,
    seconds: number,
    cost: Wallet,
    payload = "",
    suffix = "",
  ) => {
    pay(cost);
    s.jobs.push({
      id: `job:${commandId}${suffix}`,
      kind,
      owner,
      definition,
      ends: now + seconds * 1000,
      payload,
      production: {},
      cost,
    });
  };
  const free = (owned: string) => {
    if (s.encounter && s.team.includes(owned))
      throw Error("參戰成員在本場結束後才能調整。");
    if (
      s.jobs.some((j) => j.owner === owned) ||
      Object.values(s.colonies).some((v) => v.assigned === owned)
    )
      throw Error("角色正在治療或派駐。");
  };
  if (c.type === "story-start") beginStory(p, s, c.id);
  if (c.type === "story-next") advanceStory(p, s, c.skip);
  if (c.type === "story-battle") {
    const session = s.story.session;
    const step = p.quests.find((q) => q.id === session?.quest)?.story?.steps[
      session?.cursor ?? -1
    ];
    if (
      !session ||
      session.waiting ||
      step?.kind !== "encounter" ||
      s.encounter
    )
      throw Error("劇情遭遇狀態不符。");
    const v = p.planets.find((v) => v.id === step.planet)!;
    if (!s.team.some((id) => (s.roster.find((o) => o.id === id)?.hp ?? 0) > 0))
      throw Error("請先治療隊伍。");
    s.region = v.region;
    s.x = v.x;
    s.y = v.y;
    session.waiting = v.id;
    session.cues = [];
    s.encounter = { planet: v.id, seed: Math.floor(random(s) * 4294967296) };
  }
  if (c.type === "story-cue") {
    const cue = p.planets.find((v) => v.id === s.encounter?.planet)
      ?.storyEncounter?.cues[c.index];
    if (!s.encounter || !cue) throw Error("劇情對話狀態不符。");
    s.encounter.cues ??= [];
    if (!s.encounter.cues.includes(c.index)) s.encounter.cues.push(c.index);
  }
  if (c.type === "travel") {
    if (s.encounter) throw Error("請先結束交戰，再進行星域躍遷。");
    const from = p.regions.find((r) => r.id === s.region)!;
    const route = from.routes.find((r) => r.to === c.region);
    const to = p.regions.find(
      (r) => r.id === c.region && r.status === "active",
    );
    if (!route || !to || !route.requires.every((id) => s.cleared.includes(id)))
      throw Error("此星域航路尚未開放。");
    s.region = to.id;
    s.x = to.startX;
    s.y = to.startY;
    s.heading = 0;
  }
  if (c.type === "feed") {
    const target = s.roster.find((o) => o.id === c.target),
      source = s.roster.find((o) => o.id === c.source);
    if (s.encounter) throw Error("請於戰鬥結束後進行同調。");
    if (
      !target ||
      !source ||
      target.id === source.id ||
      target.definition !== source.definition
    )
      throw Error("需要另一位相同角色。");
    if ((target.resonance ?? 0) >= 5) throw Error("已達5次同調上限。");
    if (
      s.team.includes(source.id) ||
      source.level > 1 ||
      (source.resonance ?? 0) > 0
    )
      throw Error("不能消耗編隊或已培養的角色，請選未培養的重複角色。");
    free(target.id);
    free(source.id);
    const old = stats(p, target).hp;
    target.resonance = (target.resonance ?? 0) + 1;
    target.hp += stats(p, target).hp - old;
    s.roster = s.roster.filter((o) => o.id !== source.id);
    s.acquisitionQueue = s.acquisitionQueue.filter((id) => id !== source.id);
  }
  if (c.type === "seen-story" && p.quests.find((q) => q.id === c.id)?.story)
    throw Error("新劇情請完成流程後保存已讀。");
  if (c.type === "seen-story" && !s.storySeen.includes(c.id))
    s.storySeen.push(c.id);
  if (c.type === "ack-acquisition")
    s.acquisitionQueue = s.acquisitionQueue.filter((id) => id !== c.id);
  if (c.type === "patrol") {
    const r = p.regions.find((r) => r.id === s.region)!;
    const v = r.patrols.find((v) => v.id === c.id);
    if (!v || s.encounter || (s.patrolCooldowns[v.id] ?? 0) > s.voyageSeconds)
      throw Error("巡邏訊號已消散。");
    s.encounter = {
      planet: v.id,
      kind: "patrol",
      seed: Math.floor(random(s) * 4294967296),
    };
  }
  if (c.type === "activate") {
    const v = p.planets.find((v) => v.id === c.planet);
    if (
      !v ||
      v.kind !== "planet" ||
      !nodeCleared(s, v) ||
      !nodeUnlocked(s, v, p) ||
      s.colonies[v.id]?.active
    )
      throw Error("需先解放星球，且不能重複啟動。");
    pay(v.activationCost);
    s.colonies[v.id] = {
      active: true,
      lost: false,
      buildings: {},
      assigned: "",
      raidRemaining: p.rules.raidSeconds,
    };
  }
  if (c.type === "repair") throw Error("防衛系統已移除；領地不再失守。");
  if (c.type === "resupply") {
    const v = p.planets.find((v) => v.id === c.planet);
    if (
      !v ||
      v.kind !== "camp" ||
      v.region !== s.region ||
      s.encounter ||
      !nodeUnlocked(s, v, p) ||
      Math.hypot(s.x - v.x, s.y - v.y) > v.engageRadius
    )
      throw Error("請先抵達已開放的臨時基地，並結束交戰。");
    const injured = s.roster.filter(
      (o) =>
        s.team.includes(o.id) &&
        o.hp < stats(p, o).hp &&
        !s.jobs.some((j) => j.owner === o.id),
    );
    if (!injured.length) throw Error("隊伍生命已滿，或已在治療中。");
    for (const o of injured)
      job(
        "heal",
        o.id,
        o.definition,
        p.rules.healSeconds,
        v.resupplyCost ?? p.rules.healCost,
        "",
        `-${o.id}`,
      );
  }
  if (c.type === "build") {
    const b = p.buildings.find(
        (v) => v.id === c.building && v.status === "active",
      ),
      col = s.colonies[c.planet];
    if (
      !b ||
      !col?.active ||
      col.lost ||
      p.planets.find((v) => v.id === c.planet)?.kind !== "planet"
    )
      throw Error("星球必須正常運轉。");
    if (s.jobs.some((j) => j.owner === c.planet && j.kind === "build"))
      throw Error("此星球已有建造工作。");
    const level = col.buildings[b.id] ?? 0;
    if (level >= b.maxLevel) throw Error("已達建築上限。");
    job("build", c.planet, b.id, b.seconds, costScale(b.cost, level + 1));
  }
  if (c.type === "research") {
    const r = p.research.find((v) => v.id === c.id && v.status === "active");
    if (
      !r ||
      s.research.includes(r.id) ||
      s.jobs.some((j) => j.definition === r.id) ||
      !r.requires.every((id) => s.research.includes(id))
    )
      throw Error("研究尚未解鎖、正在進行或已完成。");
    job("research", "lab", r.id, r.seconds, r.cost);
  }
  if (c.type === "summon") {
    if (
      !Number.isInteger(c.count) ||
      c.count < 1 ||
      c.count > p.rules.summonSlots ||
      s.jobs.filter((j) => j.kind === "summon").length + c.count >
        p.rules.summonSlots
    )
      throw Error("召喚槽位不足。");
    if (
      c.recipe.length !== 4 ||
      c.recipe.some((v) => !Number.isInteger(v) || v < 1 || v > 999)
    )
      throw Error("每種投入需為 1–999 的整數。");
    const pool = summonCandidates(p, c.recipe);
    if (!pool.length) throw Error("召喚候選為空。");
    const cost = Object.fromEntries(
      p.resources.map((r, i) => [r.id, c.recipe[i]]),
    );
    if (!canAfford(s, costScale(cost, c.count)))
      throw Error("整批資源不足，未開始召喚。");
    for (let i = 0; i < c.count; i++) {
      const weights = pool.map((_, i) => pool.length - i),
        total = weights.reduce((a, b) => a + b, 0);
      let roll = random(s) * total,
        index = 0;
      while (index < weights.length - 1 && (roll -= weights[index]) >= 0)
        index++;
      job(
        "summon",
        "forge",
        "summon",
        p.rules.summonSeconds,
        cost,
        pool[index].character.id,
        `-${i}`,
      );
    }
  }
  if (c.type === "heal") {
    const o = s.roster.find((o) => o.id === c.owned);
    if (!o) throw Error("角色不存在。");
    free(o.id);
    if (o.hp >= stats(p, o).hp) throw Error("生命已滿。");
    job("heal", o.id, o.definition, p.rules.healSeconds, p.rules.healCost);
  }
  if (c.type === "level") {
    const o = s.roster.find((o) => o.id === c.owned);
    if (!o) throw Error("角色不存在。");
    free(o.id);
    if (o.level >= p.rules.maxLevel) throw Error("已達 M1 等級上限。");
    pay(costScale(p.rules.levelCost, o.level));
    const old = stats(p, o).hp;
    o.level++;
    advanceDaily(p, s, "leveled", now);
    storyFact(s, "leveled", o.definition);
    o.hp += stats(p, o).hp - old;
  }
  if (c.type === "reorder-team") {
    if (s.encounter) throw Error("請於遭遇結束後調整站位。");
    const i = s.team.indexOf(c.owned),
      j = i + c.direction;
    if (i < 0 || j < 0 || j >= s.team.length) throw Error("無法移動至此站位。");
    [s.team[i], s.team[j]] = [s.team[j], s.team[i]];
  }
  if (c.type === "team") {
    const o = s.roster.find((o) => o.id === c.owned);
    if (!o) throw Error("角色不存在。");
    free(o.id);
    if (s.team.includes(o.id)) {
      if (s.team.length <= 1) throw Error("至少保留一位成員。");
      s.team = s.team.filter((id) => id !== o.id);
    } else {
      if (s.team.length >= p.rules.teamSize)
        throw Error("編隊已滿，請先移出一位成員。");
      s.team.push(o.id);
    }
  }
  if (c.type === "assign") {
    const col = s.colonies[c.planet],
      o = s.roster.find((o) => o.id === c.owned);
    if (!col?.active || col.lost || !o) throw Error("派駐條件不足。");
    if (col.assigned === o.id) col.assigned = "";
    else {
      free(o.id);
      if (s.team.includes(o.id)) throw Error("請先將角色移出編隊。");
      if (col.assigned) throw Error("已有派駐角色。");
      col.assigned = o.id;
    }
  }
  if (c.type === "quest") {
    const q = p.quests.find((v) => v.id === c.id);
    if (!q || questClaimed(s, q, now) || !questReady(s, q, now))
      throw Error("尚未達成或已領取。");
    money(s, q.reward);
    if (
      q.character &&
      (!q.story || !s.roster.some((o) => o.definition === q.character))
    )
      addCharacter(p, s, q.character);
    if (q.repeat === "daily") {
      s.dailyTasks[q.id] = {
        period: questPeriod(q, now),
        progress: questProgress(s, q, now),
        claimed: true,
      };
    } else s.quests.push(q.id);
  }
  if (c.type === "begin") {
    const v = p.planets.find((v) => v.id === c.planet && v.status === "active");
    if (
      !v ||
      !nodeUnlocked(s, v, p) ||
      s.encounter ||
      !v.enemies.length ||
      !nodeAvailability(s, v, now).open
    )
      throw Error("遭遇尚未解鎖或已在戰鬥中。");
    if (v.region !== s.region) throw Error("請先前往遭遇所在星域。");
    if (
      v.encounterPolicy === "manual" &&
      Math.hypot(s.x - v.x, s.y - v.y) > v.engageRadius
    )
      throw Error("請先抵達挑戰入口。");
    if (!s.team.some((id) => (s.roster.find((o) => o.id === id)?.hp ?? 0) > 0))
      throw Error("請先治療隊伍。");
    s.encounter = {
      planet: v.id,
      seed: Math.floor(random(s) * 4294967296),
      ...(v.schedule ? { period: nodeAvailability(s, v, now).period } : {}),
    };
    if (v.schedule) {
      const period = s.encounter.period!;
      const prior = s.dailyAttempts[v.region];
      s.dailyAttempts[v.region] = {
        period,
        count: (prior?.period === period ? prior.count : 0) + 1,
      };
    }
  }
  if (c.type === "result") {
    if (!s.encounter || s.encounter.planet !== c.planet)
      throw Error("遭遇狀態不符。");
    if (s.receipts.includes(c.receipt)) return s;
    for (const o of s.roster)
      if (s.team.includes(o.id) && c.hp[o.id] !== undefined)
        o.hp = Math.max(0, Math.min(stats(p, o).hp, c.hp[o.id]));
    if (s.encounter.kind === "patrol") {
      const v = p.regions
        .find((r) => r.id === s.region)!
        .patrols.find((v) => v.id === c.planet);
      if (v) {
        if (c.victory) money(s, v.reward);
        s.patrolCooldowns[v.id] = s.voyageSeconds + v.respawnSeconds;
      }
    } else if (c.victory) {
      const v = p.planets.find((v) => v.id === c.planet)!;
      const period = s.encounter.period;
      const eligible = v.schedule
        ? !!period && (s.dailyClaims[v.id] ?? "") < period
        : !s.cleared.includes(v.id);
      if (eligible) {
        const ratio =
          v.objective === "damage"
            ? Math.min(1, Math.max(0, c.scoreRatio ?? 0))
            : 1;
        if (!Number.isFinite(ratio) || ratio <= 0)
          throw Error("無效的挑戰分數。");
        money(
          s,
          Object.fromEntries(
            Object.entries(v.reward).map(([id, n]) => [id, n * ratio]),
          ),
        );
        v.dropCharacters.forEach((id) => addCharacter(p, s, id));
        if (v.schedule) s.dailyClaims[v.id] = period!;
        if (!s.cleared.includes(v.id)) s.cleared.push(v.id);
      }
      const col = s.colonies[v.id];
      if (col) {
        col.lost = false;
        col.raidRemaining = p.rules.raidSeconds;
      }
    }
    if (
      s.encounter.kind !== "patrol" &&
      !c.victory &&
      !s.disengagedPlanets.includes(c.planet)
    )
      s.disengagedPlanets.push(c.planet);
    if (c.victory && !c.reset) {
      advanceDaily(p, s, "battleWon", now);
      if (p.planets.find((v) => v.id === c.planet)?.kind === "event")
        advanceDaily(p, s, "eventWon", now);
    }
    if (c.victory && !c.reset) storyFact(s, "battleWon", c.planet);
    storyEncounterResult(p, s, c.planet, c.victory && !c.reset);
    s.encounter = null;
    s.receipts.push(c.receipt);
  }
  if (c.type === "checkpoint") {
    s.x = c.x;
    s.y = c.y;
    if (c.heading !== undefined) s.heading = c.heading;
    if (c.discovered)
      s.discovered = [...new Set([...s.discovered, ...c.discovered])];
    if (c.voyageSeconds !== undefined)
      s.voyageSeconds = Math.max(s.voyageSeconds, c.voyageSeconds);
    for (const col of Object.values(s.colonies)) col.lost = false;
  }
  refreshStory(p, s);
  s.receipts.push(commandId);
  s.revision = previous.revision + 1;
  return s;
}
