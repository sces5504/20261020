import type { Pack } from "../content/schema";
import type { Condition } from "../content/story";
import type { Save } from "../domain/model";
import { chapterComplete, conditionMet, storyAvailable } from "../domain/story";
import { questReady } from "../domain/economy";
import {
  questClaimed,
  questProgress,
  questResetAt,
} from "../domain/daily-quests";
import { amounts, button, esc } from "./common";

/** Names and progress come from the current pack; this view never advances a quest. */
export function conditionLabel(p: Pack, c: Condition): string {
  if ("all" in c) return c.all.map((v) => conditionLabel(p, v)).join("、");
  if ("any" in c)
    return "任一：" + c.any.map((v) => conditionLabel(p, v)).join("／");
  const name =
    [
      ...p.planets,
      ...p.regions,
      ...p.characters,
      ...p.quests,
      ...p.research,
      ...p.buildings,
    ].find((v) => v.id === c.target)?.name ?? "指定目標";
  const labels: Record<typeof c.fact, string> = {
    region: `抵達${name}`,
    position: `航行至${name}指定座標（${c.x}, ${c.y}）`,
    cleared: `解放${name}`,
    activated: `啟動${name}`,
    character: `取得${name} ×${c.count}`,
    research: `完成研究「${name}」`,
    building: `建設${name}至 ${c.count} 級`,
    completed: `完成「${name}」`,
    read: `閱讀「${name}」`,
    claimed: `領取「${name}」獎勵`,
    event: "推進劇情事件",
    battleWon: `完成戰鬥${c.target ? "「" + name + "」" : ""} ×${c.count}`,
    summoned: `完成共鳴 ×${c.count}`,
    built: `完成建設 ×${c.count}`,
    leveled: `強化少女 ×${c.count}`,
    healed: `完成整補 ×${c.count}`,
    constructed: `建造設施 ×${c.count}`,
    upgraded: `升級設施 ×${c.count}`,
  };
  return labels[c.fact];
}
function conditionRows(p: Pack, s: Save, c: Condition): string {
  if ("all" in c) return c.all.map((v) => conditionRows(p, s, v)).join("");
  return `<li class="${conditionMet(s, c) ? "is-done" : ""}"><span aria-hidden="true">${conditionMet(s, c) ? "✓" : "◇"}</span>${esc(conditionLabel(p, c))}</li>`;
}
const progress = (n: number, max: number, label: string) =>
  `<div class="journal-progress" role="progressbar" aria-label="${esc(label)}" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${n}"><span style="width:${max ? Math.min(100, (n / max) * 100) : 0}%"></span></div>`;

export function journalHtml(
  p: Pack,
  s: Save,
  tab: string,
  selectedChapter: string,
) {
  const now = Date.now(),
    active = p.quests.filter((q) => q.status === "active"),
    stories = active.filter((q) => q.story),
    dailies = active.filter((q) => q.repeat === "daily"),
    chapters = [...new Set(stories.map((q) => q.story!.chapter))],
    chapterName = (id: string) => {
      const region = p.regions.find(
        (r) => r.id === id || r.id === id.replace(":chapter.", ":region."),
      );
      return (
        region?.name ??
        stories.find((q) => q.story!.chapter === id)?.name ??
        "章節"
      );
    },
    completed = stories.filter((q) => s.story.completed.includes(q.id)).length,
    ready = active.filter(
      (q) => !questClaimed(s, q, now) && questReady(s, q, now),
    ).length;
  // Preserve authored ordering, defaulting to the current session or first unfinished chapter.
  const chapter = chapters.includes(selectedChapter)
    ? selectedChapter
    : (stories.find((q) => q.id === s.story.session?.quest)?.story?.chapter ??
      stories.find((q) => !s.story.completed.includes(q.id))?.story?.chapter ??
      chapters[0]);
  const tabs = [
    ["story", "章節劇情", stories.length],
    ["daily", "每日任務", dailies.length],
    [
      "voyage",
      "航行紀錄",
      active.filter((q) => !q.story && q.repeat !== "daily").length,
    ],
  ];
  const hero = `<div class="journal-hero"><div><span class="eyebrow">THE STARS REMEMBER</span><h3>每一道星光，都是我們的航跡</h3><p>章節完成 ${completed} / ${stories.length} · 可領獎勵 ${ready}</p></div><span class="journal-emblem" aria-hidden="true">✧</span>${progress(completed, stories.length, "章節完成")}</div><nav class="journal-tabs" aria-label="紀錄分類">${tabs.map(([id, label, count]) => `<button data-action="journal-tab" data-id="${id}" aria-current="${tab === id ? "page" : "false"}">${label}<span>${count}</span></button>`).join("")}</nav>`;
  if (tab === "daily")
    return (
      hero +
      `<p class="journal-notice">每日台灣時間 23:00 更新。未領獎勵不跨日累積。</p><div class="list-cards daily-quests">${dailies
        .map((q) => {
          const n = Math.min(q.count, questProgress(s, q, now)),
            claimed = questClaimed(s, q, now),
            ready = questReady(s, q, now);
          return `<article data-daily-quest="${esc(q.id)}" class="journal-card ${ready && !claimed ? "is-ready" : ""}"><span class="quest-state">${claimed ? "今日已領取" : ready ? "補給可領取" : "進行中"}</span><h3>${esc(q.name)}</h3><p>${esc(q.description)}</p><div class="journal-meta"><strong>${n} / ${q.count}</strong><small>更新倒數 <span data-ends="${questResetAt(q, now)}"></span></small></div>${progress(n, q.count, q.name)}<div class="costs">${amounts(p, q.reward)}</div>${button(claimed ? "今日已領取" : "領取每日獎勵", "quest", q.id, "primary", claimed || !ready)}</article>`;
        })
        .join("")}</div>`
    );
  if (tab === "voyage")
    return (
      hero +
      `<div class="list-cards">${active
        .filter((q) => !q.story && q.repeat !== "daily")
        .map(
          (q) =>
            `<article class="journal-card"><span class="quest-state">${s.quests.includes(q.id) ? "已收錄" : questReady(s, q) ? "補給可領取" : "等待訊號"}</span><h3>${esc(q.name)}</h3><p>${esc(q.description || q.dialogue[0]?.text || "")}</p>${button("閱讀對話 →", "story", q.id, "text-button")}<div class="costs">${amounts(p, q.reward)}</div>${button(s.quests.includes(q.id) ? "已收錄" : "收錄並領取獎勵", "quest", q.id, "primary", s.quests.includes(q.id) || !questReady(s, q))}</article>`,
        )
        .join("")}</div>`
    );
  return (
    hero +
    `<nav class="chapter-select" aria-label="章節選擇">${chapters.map((id, i) => `<button data-action="journal-chapter" data-id="${esc(id)}" aria-current="${chapter === id ? "page" : "false"}"><small>CHAPTER ${String(i + 1).padStart(2, "0")}</small><strong>${esc(chapterName(id))}</strong><span>${stories.filter((q) => q.story!.chapter === id && s.story.completed.includes(q.id)).length} / ${stories.filter((q) => q.story!.chapter === id).length}</span></button>`).join("")}</nav><div class="chapter-timeline">${
      stories
        .filter((q) => q.story!.chapter === chapter)
        .map((q, i) => {
          const story = q.story!,
            available = storyAvailable(p, s, q.id),
            read = s.storySeen.includes(q.id),
            claimed = s.quests.includes(q.id),
            done = s.story.completed.includes(q.id),
            ready = questReady(s, q),
            session = s.story.session?.quest === q.id;
          const prerequisites = story.chapterRequires.filter(
            (id) => !chapterComplete(p, s, id),
          );
          return `<article class="journal-card ${ready && !claimed ? "is-ready" : ""}" data-story-quest="${esc(q.id)}"><div class="journal-meta"><span class="eyebrow">${String(i + 1).padStart(2, "0")} · STORY SIGNAL</span><span class="quest-state">${claimed ? "已收錄" : ready ? "補給可領取" : session ? "劇情進行中" : done ? "任務完成" : read ? "目標進行中" : available ? "可開始" : "尚未開放"}</span></div><h3>${esc(q.name)}</h3><p>${esc(q.description)}</p>${!available && !read ? `<div class="journal-requirements"><small>開放條件</small><ul>${prerequisites.map((id) => `<li>◇ 完成「${esc(chapterName(id))}」全部任務</li>`).join("")}${story.requires ? conditionRows(p, s, story.requires) : ""}</ul></div>` : ""}${story.objective ? `<div class="journal-requirements"><small>章節目標</small><ul>${conditionRows(p, s, story.objective)}</ul></div>` : ""}<div class="chapter-receipts"><span class="${read ? "is-done" : ""}">${read ? "✓" : "○"} 對話</span><span class="${done ? "is-done" : ""}">${done ? "✓" : "○"} 目標</span><span class="${claimed ? "is-done" : ""}">${claimed ? "✓" : "○"} 獎勵</span></div><div class="costs">${amounts(p, q.reward)}</div><div class="journal-actions">${!read ? button(session ? "接續劇情 →" : "開始劇情 →", "flow-open", q.id, "primary", !available || (!!s.story.session && !session)) : button("章節回看", "flow-replay", q.id, "text-button")}${button(claimed ? "獎勵已領取" : "領取章節獎勵", "quest", q.id, ready && !claimed ? "primary" : "", claimed || !ready)}</div></article>`;
        })
        .join("") || '<p class="empty-state">尚無章節訊號。</p>'
    }</div>`
  );
}
