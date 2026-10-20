import { readFileSync } from "node:fs";
import { validatePack } from "../../src/content/schema";
const status = JSON.parse(
  readFileSync("content/release-status.json", "utf8"),
) as { status: string; checks: Record<string, boolean> };
const result = validatePack(
  JSON.parse(readFileSync("content/generated/runtime.json", "utf8")),
);
const errors = [
  ...result.errors,
  ...Object.entries(status.checks)
    .filter(([, v]) => v !== true)
    .map(([k]) => `待完成：${k}`),
];
if (result.pack) {
  const p = result.pack;
  for (const c of p.characters.filter((c) => c.status === "active"))
    for (const slot of ["portrait", "avatar", "sprite"] as const) {
      const a = p.assets.find((a) => a.id === c[slot]);
      if (!a || a.review !== "approved")
        errors.push(`${c.id}.${slot} 缺少已驗收素材`);
    }
}
if (status.status !== "accepted")
  errors.push("M1 尚未標記 accepted，請依實際品質證據更新，不得以刪檢查繞過。");
if (errors.length) {
  console.error(
    "M1 release blocked (functional preview may still run):\n" +
      errors.join("\n"),
  );
  process.exitCode = 1;
} else console.log("M1 release readiness passed.");
