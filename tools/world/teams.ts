import { published as p } from "../../src/content";
import { newSave, addCharacter, stats } from "../../src/domain/model";
import { Combat } from "../../src/domain/combat";
import { readFileSync, writeFileSync } from "node:fs";
const all = JSON.parse(
  readFileSync(".artifacts/world/all-battles.json", "utf8"),
);
const teams = [
  [
    "m1:earth",
    "m1:mars",
    "solar10:character.jupiter",
    "solar10:character.pluto",
    "solar10:character.nemesis",
    "m1:moon",
  ],
  [
    "m1:earth",
    "m1:mars",
    "solar10:character.saturn",
    "solar10:character.pluto",
    "solar10:character.nemesis",
    "solar10:character.ganymede",
  ],
  [
    "m1:mars",
    "m1:earth",
    "m1:venus",
    "m1:uranus",
    "solar10:character.pluto",
    "solar10:character.nemesis",
  ],
  [
    "solar10:character.jupiter",
    "solar10:character.saturn",
    "solar10:character.sun",
    "solar10:character.pluto",
    "solar10:character.nemesis",
    "solar10:character.ariel",
  ],
];
const results = [];
for (const previous of all.filter((v: any) => !v.victory)) {
  const v = p.planets.find(
    (v) =>
      v.name === previous.node &&
      p.regions.find((r) => r.id === v.region)?.name === previous.region,
  )!;
  for (const team of teams) {
    const s = newSave(p, 0);
    s.region = v.region;
    s.x = v.x - 270;
    s.y = v.y;
    s.encounter = { planet: v.id, seed: 42 };
    for (const id of team)
      if (!s.roster.some((o) => o.definition === id)) addCharacter(p, s, id);
    s.team = team.map((id) => s.roster.find((o) => o.definition === id)!.id);
    s.roster.forEach((o) => {
      o.level = previous.teamLevel;
      o.resonance = o.level >= 90 ? 5 : 0;
      o.hp = stats(p, o).hp;
    });
    if (previous.teamLevel >= 90) s.research = p.research.map((r) => r.id);
    const c = new Combat(p, s, v.id);
    c.autoSkills = true;
    for (let tick = 0; tick < 60 * 360 && !c.ended; tick++) {
      const e = c.units
        .filter((u) => u.side === "enemy" && u.hp > 0 && !u.summonOwner)
        .sort(
          (a, b) =>
            Math.hypot(a.x - c.center.x, a.y - c.center.y) -
            Math.hypot(b.x - c.center.x, b.y - c.center.y),
        )[0];
      if (e) {
        c.target = e.id;
        const x = e.x - 200 + Math.cos(tick / 80) * 65 - v.x,
          y = e.y + Math.sin(tick / 80) * 110 - v.y,
          scale = Math.min(1, (v.leashWarningRadius - 120) / Math.hypot(x, y));
        c.destination = { x: v.x + x * scale, y: v.y + y * scale };
      }
      c.step(1 / 60);
    }
    const result = {
      region: previous.region,
      node: v.name,
      id: v.id,
      seed: 42,
      team,
      level: previous.teamLevel,
      victory: c.victory,
      reset: c.reset,
      seconds: Number(c.time.toFixed(1)),
      survivors: c.allies.filter((u) => u.hp > 0).length,
      damageRatio: Number(c.damageRatio.toFixed(4)),
    };
    results.push(result);
    console.log(JSON.stringify(result));
    if (c.victory) break;
  }
}
writeFileSync(
  ".artifacts/world/counter-teams.json",
  JSON.stringify(results, null, 2) + "\n",
);
