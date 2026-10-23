import type { Game } from "../application/game";
import type { PresentationStep, StoryStep } from "../content/story";
import { storyAvailable, conditionMet } from "../domain/story";
import { esc, button } from "./common";
/** Presentation owns no progression; every effect/cursor is committed by Game.command. */
export function mountStoryPlayer(
  root: HTMLElement,
  g: Game,
  onOpen: () => void = () => {},
) {
  const host = document.createElement("div");
  root.append(host);
  let replay: { id: string; cursor: number } | null = null,
    cue: { index: number; cursor: number; steps: PresentationStep[] } | null =
      null;
  let key = "",
    opened = false,
    pending = false,
    shownAt = 0,
    disposed = false;
  const active = () => replay || cue || g.save.story.session;
  const actorImage = (id: string, portrait?: string) => {
    const a =
      g.pack.actors.find((a) => a.id === id) ??
      g.pack.characters.find((a) => a.id === id);
    const asset = g.pack.assets.find(
      (asset) => asset.id === (portrait ?? a?.portrait),
    );
    return asset
      ? `<img src="${esc(asset.src)}" alt="${esc(a?.name ?? id)}">`
      : "";
  };
  function draw() {
    if (disposed || pending) return;
    const session = g.save.story.session;
    if (
      !session &&
      !replay &&
      !cue &&
      !g.combat &&
      !g.report &&
      !g.error &&
      !g.busy &&
      !root.querySelector("#overlay")?.childElementCount
    ) {
      const q = g.pack.quests.find(
        (q) =>
          q.story?.autoStart &&
          !g.save.storySeen.includes(q.id) &&
          storyAvailable(g.pack, g.save, q.id),
      );
      if (q) {
        pending = true;
        void g.command({ type: "story-start", id: q.id }).finally(() => {
          pending = false;
          key = "";
          draw();
        });
        return;
      }
    }
    if (!replay && !cue && g.combat) {
      const index = g.pendingStoryCue();
      if (index >= 0)
        cue = {
          index,
          cursor: 0,
          steps: g.combat.storyEncounter!.cues[index].steps,
        };
    }
    if (!replay && !cue && (!session || session.waiting)) {
      if (opened) {
        host.innerHTML = "";
        opened = false;
        g.pause.delete("story-flow");
        g.storyCamera = null;
      }
      key = "";
      return;
    }
    const q = g.pack.quests.find(
      (q) => q.id === (replay?.id ?? session?.quest),
    );
    const steps: StoryStep[] = cue?.steps ?? q?.story?.steps ?? [];
    const cursor = replay?.cursor ?? cue?.cursor ?? session!.cursor;
    const step = steps[cursor];
    if (!step) {
      if (replay) {
        replay = null;
        draw();
      }
      return;
    }
    const nextKey = `${replay ? "replay" : cue ? "cue" + cue.index : "story"}:${q?.id}:${cursor}:${g.save.revision}`;
    if (key === nextKey) return;
    const sameStep =
      key.split(":").slice(0, -1).join(":") ===
      nextKey.split(":").slice(0, -1).join(":");
    if (!sameStep) shownAt = performance.now();
    key = nextKey;
    opened = true;
    g.pause.add("story-flow");
    let background = q?.background ?? "",
      fade = 0;
    const actors = new Map<string, { portrait?: string; slot: string }>();
    for (const s of steps.slice(0, cursor + 1)) {
      if (s.kind === "background") background = s.asset;
      if (s.kind === "fade") fade = s.opacity;
      if (s.kind === "stage") {
        if (s.visible)
          actors.set(s.actor, { portrait: s.portrait, slot: s.slot });
        else actors.delete(s.actor);
      }
    }
    const cameras = steps
      .slice(0, cursor + 1)
      .filter(
        (s): s is Extract<PresentationStep, { kind: "camera" }> =>
          s.kind === "camera",
      );
    const cam = cameras.at(-1),
      previous = cameras.at(-2);
    if (cam)
      g.storyCamera = {
        ...cam,
        seconds: step.kind === "camera" ? cam.seconds : 0,
        startedAt: shownAt,
        fromX: previous?.x ?? g.x,
        fromY: previous?.y ?? g.y,
        fromZoom: previous?.zoom ?? (window.innerWidth < 650 ? 0.72 : 0.95),
      };
    if (step.kind === "say" && step.actor && !actors.has(step.actor))
      actors.set(step.actor, { portrait: step.portrait, slot: "center" });
    if (
      step.kind === "say" &&
      step.actor &&
      step.portrait &&
      actors.has(step.actor)
    )
      actors.get(step.actor)!.portrait = step.portrait;
    const bg = g.pack.assets.find((a) => a.id === background);
    const text =
      step.kind === "say"
        ? step.text
        : step.kind === "await"
          ? "等待條件達成；可返回航行，完成後接續。"
          : step.kind === "encounter"
            ? "前往劇情戰場；勝利後接續。"
            : step.kind === "acquire"
              ? "角色初始化"
              : step.kind === "event"
                ? "事件初始化"
                : "航跡演出";
    host.innerHTML = `<div class="story-scene ${step.kind === "camera" ? "camera-view" : ""}" role="dialog" aria-modal="true" aria-label="${replay ? "章節回看" : "章節劇情"}"><div class="story-sky">${bg ? `<img class="story-background" src="${esc(bg.src)}" alt="">` : ""}</div><div class="story-chapter"><span class="eyebrow">${replay ? "REPLAY · 回看" : "CHRONICLE"}</span><h2>${esc(q?.name ?? "戰場通訊")}</h2></div><div class="story-actors">${[...actors].map(([id, a]) => `<div class="story-actor ${a.slot}">${actorImage(id, a.portrait)}</div>`).join("")}</div><div class="story-cinematic-fade" style="opacity:${fade};transition:opacity ${step.kind === "fade" ? step.seconds : 0}s"></div><div class="story-box"><div class="story-speaker">${esc(step.kind === "say" ? step.speaker : "航行紀錄")}</div><p class="story-line">${esc(text)}</p><div class="story-controls"><small>${cursor + 1} / ${steps.length}</small>${button("返回航行", "flow-close", "", "text-button")}${button("略過演出", "flow-skip", "", "text-button")}${button(step.kind === "encounter" && !replay ? "開始劇情遭遇" : "繼續 →", "flow-next", "", "primary")}</div></div></div>`;
    if (step.kind === "fade" && step.seconds > 0) {
      const previous = steps
        .slice(0, cursor)
        .reverse()
        .find((s) => s.kind === "fade");
      const from = previous?.kind === "fade" ? previous.opacity : 0;
      const elapsed = Math.max(0, performance.now() - shownAt),
        duration = step.seconds * 1000;
      host.querySelector(".story-cinematic-fade")?.animate(
        [
          {
            opacity:
              from + (step.opacity - from) * Math.min(1, elapsed / duration),
          },
          { opacity: step.opacity },
        ],
        { duration: Math.max(0, duration - elapsed), fill: "forwards" },
      );
    }
  }
  async function next(skip = false) {
    if (pending) return;
    const state = active();
    if (!state) return;
    const q = g.pack.quests.find(
      (q) => q.id === (replay?.id ?? g.save.story.session?.quest),
    );
    const steps = cue?.steps ?? q?.story?.steps ?? [];
    const cursor =
      replay?.cursor ?? cue?.cursor ?? g.save.story.session!.cursor;
    const step = steps[cursor];
    if (
      !skip &&
      step &&
      ["wait", "camera", "fade"].includes(step.kind) &&
      "seconds" in step &&
      performance.now() - shownAt < step.seconds * 1000
    )
      return;
    pending = true;
    try {
      if (replay) {
        replay.cursor = skip ? steps.length : replay.cursor + 1;
        if (replay.cursor >= steps.length) replay = null;
      } else if (cue) {
        cue.cursor = skip ? steps.length : cue.cursor + 1;
        if (cue.cursor >= steps.length) {
          await g.command({ type: "story-cue", index: cue.index });
          cue = null;
        }
      } else if (step?.kind === "encounter") {
        await g.command({ type: "story-battle" });
      } else await g.command({ type: "story-next", skip });
    } finally {
      pending = false;
      key = "";
      draw();
    }
  }
  const click = async (e: Event) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>("[data-action]");
    const action = el?.dataset.action;
    if (!action?.startsWith("flow-")) return;
    e.stopImmediatePropagation();
    if (action === "flow-open") {
      hiddenSession = "";
      onOpen();
      const id = el!.dataset.id!;
      if (!g.save.story.session) {
        pending = true;
        await g.command({ type: "story-start", id });
        pending = false;
      }
      opened = true;
      key = "";
      draw();
    }
    if (action === "flow-replay") {
      onOpen();
      const id = el!.dataset.id!;
      if (g.save.storySeen.includes(id) || g.save.quests.includes(id)) {
        replay = { id, cursor: 0 };
        key = "";
        draw();
      }
    }
    if (action === "flow-next" || action === "flow-skip")
      await next(action === "flow-skip");
    if (action === "flow-close") {
      if (cue) {
        await next(true);
        return;
      }
      replay = null;
      cue = null;
      host.innerHTML = "";
      g.pause.delete("story-flow");
      g.storyCamera = null;
      opened = false;
      hiddenSession = g.save.story.session?.quest ?? "";
      key = "";
    }
  };
  let hiddenSession = "";
  root.addEventListener("click", click, true);
  const timer = window.setInterval(() => {
    if (
      hiddenSession &&
      g.save.story.session?.quest === hiddenSession &&
      !cue &&
      !replay &&
      !g.combat
    )
      return;
    if (g.save.story.session?.quest !== hiddenSession) hiddenSession = "";
    draw();
  }, 150);
  draw();
  return () => {
    disposed = true;
    clearInterval(timer);
    root.removeEventListener("click", click, true);
    host.remove();
    g.pause.delete("story-flow");
    g.storyCamera = null;
  };
}
