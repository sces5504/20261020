import type { Game } from "../application/game";
import type { PresentationStep, StoryStep } from "../content/story";
import { storyAvailable, conditionMet } from "../domain/story";
import { esc, button } from "./common";

/** A story battlefield is entered by flying there, never by teleporting from afar. */
export function nearStoryPlanet(g: Game, planetId: string) {
  const v = g.pack.planets.find((v) => v.id === planetId);
  if (!v) return false;
  const reach = Math.max(600, ("engageRadius" in v ? v.engageRadius : 300) * 2);
  return g.save.region === v.region && Math.hypot(g.x - v.x, g.y - v.y) <= reach;
}

/** Presentation owns no progression; every effect/cursor is committed by Game.command. */
export function mountStoryPlayer(
  root: HTMLElement,
  g: Game,
  onOpen: () => void = () => {},
) {
  const host = document.createElement("div");
  const radioHost = document.createElement("div");
  radioHost.className = "story-radio";
  radioHost.setAttribute("aria-live", "polite");
  root.append(host, radioHost);
  let replay: { id: string; cursor: number } | null = null;
  // In-battle lines play as a non-blocking radio feed; combat never pauses for them.
  let radio: { index: number; lines: Extract<PresentationStep, { kind: "say" }>[]; at: number; shownAt: number } | null = null;
  let key = "",
    sceneQuest = "",
    pending = false,
    shownAt = 0,
    disposed = false,
    // Set only by the player's own "continue" on a waiting node.
    resume = false,
    hiddenSession = "",
    autoTimer = 0;
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
  // Hiding is tied to one step: when the cursor moves on (battle won, goal resumed) the scene returns.
  const mark = () => {
    const session = g.save.story.session;
    return session ? `${session.quest}:${session.cursor}` : "";
  };
  const sessionStep = () => {
    const session = g.save.story.session;
    return session
      ? g.pack.quests.find((q) => q.id === session.quest)?.story?.steps[
          session.cursor
        ]
      : undefined;
  };
  function closeScene() {
    if (host.childElementCount) host.innerHTML = "";
    sceneQuest = "";
    key = "";
    g.pause.delete("story-flow");
    g.storyCamera = null;
  }
  function drawRadio() {
    if (!g.combat) {
      radio = null;
      radioHost.innerHTML = "";
      return;
    }
    if (!radio) {
      const index = g.pendingStoryCue();
      if (index < 0) return;
      const lines = g.combat.storyEncounter!.cues[index].steps.filter(
        (s): s is Extract<PresentationStep, { kind: "say" }> => s.kind === "say",
      );
      radio = { index, lines, at: 0, shownAt: performance.now() };
      radioHost.dataset.key = "";
    }
    const line = radio.lines[radio.at];
    if (!line || performance.now() - radio.shownAt > 2200 + line.text.length * 70) {
      if (line && radio.at + 1 < radio.lines.length) {
        radio.at++;
        radio.shownAt = performance.now();
      } else if (!pending && !g.combat.ended) {
        const index = radio.index;
        pending = true;
        void g.command({ type: "story-cue", index }).finally(() => {
          pending = false;
          radio = null;
          radioHost.innerHTML = "";
        });
        return;
      }
    }
    const current = radio.lines[radio.at];
    const k = `${radio.index}:${radio.at}`;
    if (current && radioHost.dataset.key !== k) {
      radioHost.dataset.key = k;
      radioHost.innerHTML = `<div class="story-radio-line"><span class="story-radio-avatar">${current.actor ? actorImage(current.actor, current.portrait) : ""}</span><div><strong>${esc(current.speaker)}</strong><p>${esc(current.text)}</p></div></div>`;
    }
  }
  function draw() {
    if (disposed) return;
    drawRadio();
    if (pending) return;
    const session = g.save.story.session;
    if (
      !session &&
      !replay &&
      !g.combat &&
      !g.report &&
      !g.error &&
      !g.busy &&
      !root.querySelector("#overlay")?.childElementCount
    ) {
      // Only content that explicitly opts in starts itself; main nodes wait for the player.
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
    if (!replay && session && !session.waiting) {
      const step = sessionStep();
      if (step?.kind === "await") {
        if (resume && conditionMet(g.save, step.condition) && !g.combat) {
          resume = false;
          pending = true;
          void g.command({ type: "story-next" }).finally(() => {
            pending = false;
            hiddenSession = "";
            key = "";
            draw();
          });
          return;
        }
        resume = false;
        hiddenSession = mark();
      }
      // Battles start from the tracker once the fleet has flown to the field.
      if (step?.kind === "encounter") hiddenSession = mark();
    }
    if (
      !replay &&
      (!session ||
        session.waiting ||
        g.combat ||
        hiddenSession === mark())
    ) {
      closeScene();
      return;
    }
    const q = g.pack.quests.find(
      (q) => q.id === (replay?.id ?? session?.quest),
    );
    const steps: StoryStep[] = q?.story?.steps ?? [];
    const cursor = replay?.cursor ?? session!.cursor;
    const step = steps[cursor];
    if (!step) {
      if (replay) {
        replay = null;
        draw();
      }
      return;
    }
    const nextKey = `${replay ? "replay" : "story"}:${q?.id}:${cursor}`;
    if (key === nextKey) return;
    shownAt = performance.now();
    key = nextKey;
    g.pause.add("story-flow");
    let background = q?.background ?? "",
      fade = 0,
      lastSay: Extract<StoryStep, { kind: "say" }> | undefined;
    const actors = new Map<string, { portrait?: string; slot: string }>();
    for (const s of steps.slice(0, cursor + 1)) {
      if (s.kind === "background") background = s.asset;
      if (s.kind === "fade") fade = s.opacity;
      if (s.kind === "say") lastSay = s;
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
    // Presentation-only steps keep the previous line on screen and advance by themselves.
    const line =
      step.kind === "say"
        ? step
        : step.kind === "await" && replay
          ? { speaker: "航行紀錄", text: "等待條件達成；可返回航行，完成後接續。" }
          : step.kind === "encounter" && replay
            ? { speaker: "航行紀錄", text: "劇情遭遇（回看不重戰）。" }
            : lastSay;
    // One persistent scene per node: consecutive lines update in place, no re-entry flash.
    const sceneId = `${replay ? "replay" : "story"}:${q?.id}`;
    if (sceneQuest !== sceneId || !host.querySelector(".story-scene")) {
      sceneQuest = sceneId;
      host.innerHTML = `<div class="story-scene" role="dialog" aria-modal="true" aria-label="${replay ? "章節回看" : "章節劇情"}"><div class="story-sky"></div><div class="story-chapter"><span class="eyebrow">${replay ? "REPLAY · 回看" : "CHRONICLE"}</span><h2>${esc(q?.name ?? "戰場通訊")}</h2></div><div class="story-actors" data-key=""></div><div class="story-cinematic-fade" style="opacity:0"></div><div class="story-box"><div class="story-speaker"></div><p class="story-line"></p><div class="story-controls"><small class="story-count"></small>${button("返回航行", "flow-close", "", "text-button")}${button("略過演出", "flow-skip", "", "text-button")}${button("繼續 →", "flow-next", "", "primary")}</div></div></div>`;
    }
    const scene = host.querySelector<HTMLElement>(".story-scene")!;
    scene.classList.toggle("camera-view", step.kind === "camera");
    const sky = scene.querySelector<HTMLElement>(".story-sky")!;
    const img = sky.querySelector<HTMLImageElement>("img");
    if (bg && img?.getAttribute("src") !== bg.src)
      sky.innerHTML = `<img class="story-background" src="${esc(bg.src)}" alt="">`;
    else if (!bg && img) sky.innerHTML = "";
    const stage = scene.querySelector<HTMLElement>(".story-actors")!;
    const stageKey = JSON.stringify([...actors]);
    if (stage.dataset.key !== stageKey) {
      stage.dataset.key = stageKey;
      stage.innerHTML = [...actors]
        .map(
          ([id, a]) =>
            `<div class="story-actor ${a.slot}" data-actor="${esc(id)}">${actorImage(id, a.portrait)}</div>`,
        )
        .join("");
    }
    stage
      .querySelectorAll<HTMLElement>(".story-actor")
      .forEach((el) =>
        el.classList.toggle(
          "is-speaking",
          step.kind === "say" && el.dataset.actor === step.actor,
        ),
      );
    const box = scene.querySelector<HTMLElement>(".story-box")!;
    box.classList.toggle("no-line", !line);
    box.querySelector(".story-speaker")!.textContent = line?.speaker ?? "";
    box.querySelector(".story-line")!.textContent = line?.text ?? "";
    box.querySelector(".story-count")!.textContent = `${cursor + 1} / ${steps.length}`;
    const fadeEl = scene.querySelector<HTMLElement>(".story-cinematic-fade")!;
    if (step.kind === "fade" && step.seconds > 0) {
      const prior = steps
        .slice(0, cursor)
        .reverse()
        .find((s) => s.kind === "fade");
      const from = prior?.kind === "fade" ? prior.opacity : 0;
      fadeEl.animate([{ opacity: from }, { opacity: step.opacity }], {
        duration: step.seconds * 1000,
        fill: "forwards",
      });
    } else fadeEl.style.opacity = String(fade);
    window.clearTimeout(autoTimer);
    if (!["say", "await", "encounter"].includes(step.kind)) {
      const wait = "seconds" in step ? step.seconds * 1000 : 0;
      const at = nextKey;
      autoTimer = window.setTimeout(() => {
        if (key === at) void next();
      }, wait + 30);
    }
  }
  async function next(skip = false) {
    if (pending) return;
    const session = g.save.story.session;
    if (!replay && !session) return;
    const q = g.pack.quests.find((q) => q.id === (replay?.id ?? session?.quest));
    const steps = q?.story?.steps ?? [];
    const cursor = replay?.cursor ?? session!.cursor;
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
      } else if (step?.kind === "encounter") {
        if (nearStoryPlanet(g, step.planet))
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
      const step = sessionStep();
      if (step?.kind === "await") resume = true;
      if (step?.kind === "encounter") {
        await next();
        return;
      }
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
      replay = null;
      hiddenSession = mark();
      closeScene();
    }
  };
  root.addEventListener("click", click, true);
  const timer = window.setInterval(draw, 150);
  draw();
  return () => {
    disposed = true;
    clearInterval(timer);
    window.clearTimeout(autoTimer);
    root.removeEventListener("click", click, true);
    host.remove();
    radioHost.remove();
    g.pause.delete("story-flow");
    g.storyCamera = null;
  };
}
