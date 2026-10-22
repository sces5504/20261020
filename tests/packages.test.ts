import { ARCHIVE_BYTES } from "../src/platform/budgets";
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

test("workshop ZIP deduplicates real bytes across local and uploaded paths, never trusting a declared hash collision", async () => {
  const { unzipSync, strFromU8 } = await import("fflate");
  const p = structuredClone(published);
  const source = p.assets.find(
    (a) => !a.src.startsWith("data:") && a.src.endsWith(".png"),
  )!;
  const bytes = await readFile(`public/${source.src}`);
  const other = p.assets.find(
    (a) => !a.src.startsWith("data:") && a.hash !== source.hash,
  )!;
  p.assets.push(
    {
      ...source,
      id: "addon:uploaded",
      src: `data:image/png;base64,${bytes.toString("base64")}`,
    },
    { ...other, id: "addon:collision", hash: source.hash },
  );
  const zip = await exportPack(
    p,
    async (path) => new Uint8Array(await readFile(`public/${path}`)),
  );
  assert.ok(
    zip.length <= ARCHIVE_BYTES,
    `bounded 64 MiB full-game budget: ${zip.length}`,
  );
  const files = unzipSync(zip);
  const archived = JSON.parse(strFromU8(files["pack.json"]));
  const ref = (id: string) =>
    archived.assets.find((a: { id: string }) => a.id === id).src;
  assert.equal(ref(source.id), ref("addon:uploaded"));
  assert.notEqual(ref(source.id), ref("addon:collision"));
  const imported = importPack(zip);
  assert.equal(
    imported.assets.find((a) => a.id === source.id)!.src,
    imported.assets.find((a) => a.id === "addon:uploaded")!.src,
  );
});

test("portable imports reject oversized expansion and unsafe paths before decoding media", async () => {
  const { zipSync, strToU8 } = await import("fflate");
  assert.throws(
    () =>
      importPack(
        zipSync({
          "pack.json": strToU8("{}"),
          "../escape.png": new Uint8Array([1]),
        }),
      ),
    /非法檔案路徑/,
  );
  const large = zipSync({
    "pack.json": strToU8("{}"),
    "assets/huge.png": new Uint8Array(31 * 1024 * 1024),
  });
  assert.throws(() => importPack(large), /解壓大小/);
  assert.throws(() => importPack(new Uint8Array(ARCHIVE_BYTES + 1)), /64 MiB/);
});
