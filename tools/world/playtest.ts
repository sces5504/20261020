import { published as p } from "../../src/content";
import { newSave, stats } from "../../src/domain/model";
import { Combat } from "../../src/domain/combat";
import { writeFileSync, mkdirSync } from "node:fs";
const full = process.argv.includes("--all");
const regions = p.regions.filter(
  (r) =>
    r.id.startsWith("original:") &&
    (full || !r.id.includes("replay")) &&
    ![
      "original:region.archive",
      "original:region.daily",
      "original:region.pisces",
    ].includes(r.id),
);
const results = [];
for (const r of regions) {
  const encounters = p.planets
    .filter(
      (v) =>
        v.region === r.id &&
        v.enemies.length &&
        (full || v.kind === "stronghold"),
    )
    .sort(
      (a, b) =>
        Math.max(...a.enemies.map((g) => g.level ?? 1)) -
        Math.max(...b.enemies.map((g) => g.level ?? 1)),
    );
  for (const v of full ? encounters : [encounters[0], encounters.at(-1)!])
    for (const strength of full ? ["normal"] : ["normal", "weaker"]) {
      const enemyLevel = Math.max(...v.enemies.map((g) => g.level ?? 1));
      const level = Math.min(
        120,
        Math.max(
          1,
          Math.ceil(enemyLevel * (strength === "normal" ? 1.15 : 0.6)) +
            (strength === "normal" ? 5 : 0),
        ),
      );
      const s = newSave(p, 0);
      s.region = r.id;
      s.x = v.x - 270;
      s.y = v.y;
      s.encounter = { planet: v.id, seed: 42 };
      for (const o of s.roster) {
        o.level = level;
        if (strength === "normal" && level >= 90) o.resonance = 5;
        o.hp = stats(p, o).hp;
      }
      if (strength === "normal" && level >= 90)
        s.research = p.research.map((r) => r.id);
      const c = new Combat(p, s, v.id);
      c.autoSkills = true;
      for (let tick = 0; tick < 60 * 360 && !c.ended; tick++) {
        const alive = c.units.filter((u) => u.side === "enemy" && u.hp > 0),
          e = alive.sort(
            (a, b) =>
              Math.hypot(a.x - c.center.x, a.y - c.center.y) -
              Math.hypot(b.x - c.center.x, b.y - c.center.y),
          )[0];
        if (e) {
          const x = e.x - 200 + Math.cos(tick / 80) * 65 - v.x,
            y = e.y + Math.sin(tick / 80) * 110 - v.y,
            scale = Math.min(
              1,
              (v.leashWarningRadius - 120) / Math.hypot(x, y),
            );
          c.destination = { x: v.x + x * scale, y: v.y + y * scale };
        }
        c.step(1 / 60);
      }
      results.push({
        region: r.name,
        node: v.name,
        seed: 42,
        enemyLevel,
        teamLevel: level,
        strength,
        victory: c.victory,
        reset: c.reset,
        seconds: Number(c.time.toFixed(1)),
        survivors: c.allies.filter((u) => u.hp > 0).length,
        damageRatio: Number(c.damageRatio.toFixed(4)),
        firstWin: v.reward,
      });
      console.log(JSON.stringify(results.at(-1)));
    }
}
mkdirSync(".artifacts/world", { recursive: true });
writeFileSync(
  `.artifacts/world/${full ? "all-battles" : "balance"}.json`,
  JSON.stringify(results, null, 2) + "\n",
);
