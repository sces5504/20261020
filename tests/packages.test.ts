import { readFile } from "node:fs/promises";
import { test } from "node:test";
import assert from "node:assert/strict";
import { published } from "../src/content";
import { exportPack, importPack } from "../src/platform/packages";
test("exported package contains media bytes and can be imported without original machine URLs", async () => {
  const p = structuredClone(published);
  p.assets.push({
    id: "addon:test",
    name: "test",
    src: "data:image/png;base64,iVBORw0KGgo=",
    width: 1,
    height: 1,
    hash: "abc123",
    review: "candidate",
  });
  p.characters[0].portrait = "addon:test";
  const zip = await exportPack(
    p,
    async (path) => new Uint8Array(await readFile(`public/${path}`)),
  );
  const roundtrip = importPack(zip);
  const expected = structuredClone(p);
  for (const a of expected.assets)
    if (!a.src.startsWith("data:"))
      a.src = `data:image/${a.src.endsWith(".webp") ? "webp" : a.src.endsWith(".jpg") ? "jpeg" : "png"};base64,${(await readFile(`public/${a.src}`)).toString("base64")}`;
  assert.deepEqual(roundtrip, expected);
  assert.ok(zip.byteLength > 0);
});
