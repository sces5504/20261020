import { readFileSync } from "node:fs";
import { validatePack } from "../../src/content/schema";
const status = JSON.parse(
  readFileSync("content/release-status.json", "utf8"),
) as {
  status: string;
  checks: Record<string, boolean>;
  playtestStatus: string;
  playtestChecks: Record<string, boolean>;
};
const targetIndex = process.argv.indexOf("--target");
const target = targetIndex < 0 ? "commercial" : process.argv[targetIndex + 1];
if (!["commercial", "playtest"].includes(target))
  throw Error("Unknown release target");
const playtest = target === "playtest";
const result = validatePack(
  JSON.parse(readFileSync("content/generated/runtime.json", "utf8")),
);
const errors = [
  ...result.errors,
  ...Object.entries(playtest ? status.playtestChecks : status.checks)
    .filter(([, v]) => v !== true)
    .map(([k]) => `待完成：${k}`),
];
if (result.pack) {
  const p = result.pack;
  for (const c of p.characters.filter((c) => c.status === "active"))
    for (const slot of ["portrait", "avatar", "sprite"] as const) {
      const a = p.assets.find((a) => a.id === c[slot]);
      if (!a || (a.review !== "approved" && !(playtest && slot === "sprite")))
        errors.push(`${c.id}.${slot} 缺少已驗收素材`);
    }
  // Visible world entities must carry the same portable artwork that the studio previews.
  for (const [kind, list, slots] of [
    ["enemies", p.enemies, ["sprite"]],
    ["planets", p.planets, ["sprite"]],
    ["buildings", p.buildings, ["sprite"]],
    ["research", p.research, ["sprite"]],
    ["regions", p.regions, ["sprite", "background"]],
    ["quests", p.quests, ["background"]],
  ] as const)
    for (const e of list.filter((e) => e.status === "active"))
      for (const slot of slots) {
        const ref = (e as unknown as Record<string, unknown>)[slot];
        const a = p.assets.find((a) => a.id === ref);
        if (!a || (!playtest && a.review !== "approved"))
          errors.push(
            `${kind}.${e.id}.${slot} 缺少${playtest ? "試玩圖片" : "已驗收素材"}`,
          );
      }
}
if (playtest && status.playtestStatus !== "ready")
  errors.push("M1 試玩版尚未通過功能驗收。");
if (!playtest && status.status !== "accepted")
  errors.push("M1 尚未標記 accepted，請依實際品質證據更新，不得以刪檢查繞過。");
if (errors.length) {
  console.error(`M1 ${target} release blocked:\n` + errors.join("\n"));
  process.exitCode = 1;
} else console.log(`M1 ${target} release readiness passed.`);
