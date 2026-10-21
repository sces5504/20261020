// Verify the extension's portable media and export an isolated full preview snapshot.
// Run from repo root: node --import tsx art/world/beacon/verify.mts
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { assemble } from "../../../src/content/loader.ts";
import { validatePack } from "../../../src/content/schema.ts";
import { exportPack, importPack } from "../../../src/platform/packages.ts";
const readJSON = async (path: string) =>
  JSON.parse(await readFile(path, "utf8"));
const hash = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");
const base = await readJSON("content/core/pack.json");
const extension = await readJSON("content/extensions/frontier-beacon.json");
const entries = await readJSON("art/world/beacon/assets.json");
const pack = assemble(base, [extension]);
assert.equal(entries.length, 5);
assert.equal(new Set(entries.map((e: any) => e.id)).size, 5);
assert.equal(
  new Set(extension.definitions.enemies.map((e: any) => e.sprite)).size,
  3,
);
assert.deepEqual(
  pack.enemies.slice(0, base.enemies.length),
  assemble(base, []).enemies,
);
assert.deepEqual(pack.regions, assemble(base, []).regions);
for (const entry of entries) {
  const asset = pack.assets.find((a) => a.id === entry.id)!;
  assert.ok(asset);
  const master = await readFile(entry.master),
    delivery = await readFile(entry.path);
  assert.equal(hash(master), entry.masterSha256);
  assert.equal(hash(delivery), entry.sha256);
  assert.equal(asset.hash, entry.sha256);
  assert.equal(
    asset.src,
    `data:image/webp;base64,${delivery.toString("base64")}`,
  );
  assert.equal(asset.width, entry.width);
  assert.equal(asset.height, entry.height);
  assert.equal(asset.review, "candidate");
  for (const ref of entry.references)
    assert.equal(hash(await readFile(ref.path)), ref.sha256);
  if (entry.kind === "sprite") {
    const entity = [...pack.enemies, ...pack.planets].find(
      (e) => e.id === entry.entity,
    )!;
    assert.equal(entity.sprite, entry.id);
  }
}
await mkdir(".artifacts/frontier-beacon", { recursive: true });
await writeFile(
  ".artifacts/frontier-beacon/assembled.json",
  JSON.stringify(pack),
);
// This is an explicit full workshop snapshot for background review, not an extension override.
const preview = structuredClone(pack);
const region = preview.regions.find((r) => r.id === "m1:frontier-test")!;
region.background = "beacon:asset.frontier-v1";
region.sprite = "beacon:asset.signal-v1";
assert.ok(validatePack(preview).pack);
await writeFile(
  ".artifacts/frontier-beacon/art-preview.json",
  JSON.stringify(preview),
);
const zip = await exportPack(
  preview,
  async (path) => new Uint8Array(await readFile(`public/${path}`)),
);
const imported = importPack(zip);
for (const entry of entries) {
  const asset = imported.assets.find((a) => a.id === entry.id)!;
  assert.equal(asset.hash, entry.sha256);
  assert.equal(
    hash(Buffer.from(asset.src.split(",")[1], "base64")),
    entry.sha256,
  );
}
assert.equal(
  imported.regions.find((r) => r.id === region.id)!.background,
  region.background,
);
await writeFile(".artifacts/frontier-beacon/frontier-art-preview.zip", zip);
console.log(
  `PASS five media hashes, fixed distinct bindings, unchanged core enemies/regions, portable ZIP ${zip.byteLength} bytes`,
);
