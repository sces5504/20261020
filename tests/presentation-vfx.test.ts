import assert from "node:assert/strict";
import { test } from "node:test";
import { published } from "../src/content";
import { laboratory } from "../src/domain/laboratory";
import { actionSchema } from "../src/content/mechanics";
import { drawCombatVfx } from "../src/presentation/combat-vfx";

type Graphics = Parameters<typeof drawCombatVfx>[0];
function recorder() {
  const calls: { method: string; args: number[] }[] = [];
  const ink = new Proxy(
    {},
    {
      get:
        (_target, method) =>
        (...args: number[]) => {
          assert.ok(
            args.every(Number.isFinite),
            `${String(method)} has finite geometry`,
          );
          calls.push({ method: String(method), args });
        },
    },
  ) as Graphics;
  return { ink, calls };
}
test("VFX repeated renders and reduced mode never advance simulation or consume RNG", () => {
  const c = laboratory(published, {
    allies: [
      {
        character: published.characters[0].id,
        level: 10,
        skillLevel: 1,
        skill: "solar10:skill.pluto",
      },
    ],
    enemies: [{ enemy: published.enemies[0].id, level: 10, count: 3 }],
    seed: 42,
    lockHealth: true,
  });
  c.cast(c.allies[0].id);
  c.step(0.1);
  const snapshot = () =>
    JSON.stringify({
      time: c.time,
      rng: c.rng,
      units: c.units,
      bullets: c.bullets,
      fields: c.mechanics.fields,
      pending: c.mechanics.pending,
      flashes: c.flashes,
      statuses: [...c.mechanics.statuses],
    });
  const before = snapshot();
  for (const reduced of [false, true]) {
    const a = recorder(),
      b = recorder(),
      d = recorder();
    for (let i = 0; i < 30; i++)
      drawCombatVfx(a.ink, b.ink, d.ink, c, published, reduced);
    assert.ok(a.calls.length);
    if (reduced)
      assert.equal(
        b.calls.length,
        0,
        "low effects needs no additive ornaments",
      );
  }
  assert.equal(snapshot(), before);
});
test("low effects retains hostile bullets and true beam/zone boundaries", () => {
  const c = laboratory(published, {
    allies: [
      { character: published.characters[0].id, level: 1, skillLevel: 1 },
    ],
    enemies: [{ enemy: published.enemies[0].id, level: 1, count: 1 }],
    seed: 99,
  });
  const owner = c.units.find((u) => u.side === "enemy")!;
  c.mechanics.fields.push({
    id: 999,
    owner: owner.id,
    side: "enemy",
    x: 100,
    y: 200,
    angle: 0,
    color: "#ff0011",
    until: 5,
    nextTick: 1,
    radius: 123,
    action: actionSchema.parse({ kind: "zone", radius: 123 }),
  });
  c.mechanics.fields.push({
    id: 1000,
    owner: owner.id,
    side: "enemy",
    x: 100,
    y: 300,
    angle: 0,
    color: "#ff0011",
    until: 5,
    nextTick: 1,
    reach: 222,
    action: actionSchema.parse({ kind: "beam", radius: 222, width: 40 }),
  });
  c.bullets.push({
    id: 55,
    side: "enemy",
    x: 151,
    y: 201,
    vx: 100,
    vy: 0,
    attack: 10,
    life: 5,
    color: "#ff0000",
  });
  const frames = [false, true].map((reduced) => {
    const base = recorder(),
      light = recorder(),
      danger = recorder();
    drawCombatVfx(base.ink, light.ink, danger.ink, c, published, reduced);
    assert.ok(
      danger.calls.some(
        (call) =>
          call.method === "strokeCircle" && call.args.join() === "100,200,123",
      ),
    );
    assert.ok(
      danger.calls.some(
        (call) =>
          call.method === "lineBetween" &&
          call.args.join() === "100,320,322,320",
      ),
    );
    assert.ok(
      danger.calls.some(
        (call) =>
          call.method === "lineBetween" &&
          call.args.join() === "100,280,322,280",
      ),
    );
    assert.ok(
      danger.calls.some(
        (call) =>
          call.method === "fillCircle" &&
          call.args[0] === 151 &&
          call.args[1] === 201,
      ),
    );
    return danger.calls;
  });
  assert.deepEqual(
    frames[0],
    frames[1],
    "hazards are identical with or without decorative effects",
  );
});
