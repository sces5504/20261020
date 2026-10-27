import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { assemble } from "../../src/content/loader";
const root = resolve("content"),
  manifest = JSON.parse(readFileSync("content/manifest.json", "utf8")) as {
    base: string;
    extensions: string[];
    regionPresentation?: unknown;
    characterPresentation?: unknown;
    regionRoutes?: unknown;
  };
const load = (file: string) => {
  const path = resolve(root, file);
  if (!path.startsWith(root + "/") || !file.endsWith(".json"))
    throw Error("內容檔路徑必須在 content 內");
  return JSON.parse(readFileSync(path, "utf8"));
};
const merged = assemble(
  load(manifest.base),
  manifest.extensions.map(load),
  manifest.regionPresentation,
  manifest.characterPresentation,
  manifest.regionRoutes,
);
mkdirSync("content/generated", { recursive: true });
writeFileSync("content/generated/runtime.json", JSON.stringify(merged));
console.log(
  `Content snapshot generated: ${1 + manifest.extensions.length} packs, ${merged.characters.length} characters`,
);

// Copy the user-selected originals without resampling, cropping, or recompression.
const artBindings = JSON.parse(
  readFileSync("content/core/art-bindings.json", "utf8"),
) as { bindings: { runtimeAssetId: string; standardAssetId: string }[] };
const sources = JSON.parse(readFileSync("art/catalog/assets.json", "utf8")) as {
  id: string;
  path: string;
  sha256: string;
}[];
import { createHash } from "node:crypto";
for (const binding of artBindings.bindings) {
  const source = sources.find((s) => s.id === binding.standardAssetId);
  const target = merged.assets.find((a) => a.id === binding.runtimeAssetId);
  if (!source || !target) throw Error("美術映射缺來源或runtime資產");
  const bytes = readFileSync(resolve(source.path));
  const hash = createHash("sha256").update(bytes).digest("hex");
  if (hash !== source.sha256 || hash !== target.hash)
    throw Error("原圖hash不符，停止建置");
  const output = resolve("public", target.src);
  if (!output.startsWith(resolve("public/assets/characters") + "/"))
    throw Error("原圖輸出路徑超出範圍");
  mkdirSync(resolve("public/assets/characters"), { recursive: true });
  writeFileSync(output, bytes);
}

// Derived chibi sprites are separate from immutable standard portraits.
const battleAssets = JSON.parse(
  readFileSync("art/catalog/battle-assets.json", "utf8"),
) as {
  id: string;
  path: string;
  sha256: string;
  runtime: string;
  master?: string;
  masterSha256?: string;
}[];
for (const entry of battleAssets) {
  if (
    entry.master &&
    createHash("sha256").update(readFileSync(entry.master)).digest("hex") !==
      entry.masterSha256
  )
    throw Error("Q版素材母檔hash不符");
  const bytes = readFileSync(entry.path),
    asset = merged.assets.find((a) => a.id === entry.id);
  if (
    !asset ||
    createHash("sha256").update(bytes).digest("hex") !== entry.sha256 ||
    asset.hash !== entry.sha256
  )
    throw Error("Q版素材hash不符");
  const output = resolve("public", entry.runtime);
  if (!output.startsWith(resolve("public/assets/battle") + "/"))
    throw Error("Q版素材路徑越界");
  mkdirSync(resolve("public/assets/battle"), { recursive: true });
  writeFileSync(output, bytes);
}

// Portable world and scenario artwork shared by the game and studio.
const worldAssets = JSON.parse(
  readFileSync("art/catalog/world-assets.json", "utf8"),
) as {
  id: string;
  path: string;
  runtime: string;
  sha256: string;
  master?: string;
  masterSha256?: string;
}[];
rmSync("public/assets/world", { recursive: true, force: true });
for (const entry of worldAssets) {
  if (
    entry.master &&
    createHash("sha256").update(readFileSync(entry.master)).digest("hex") !==
      entry.masterSha256
  )
    throw Error("世界素材主檔hash不符");
  const bytes = readFileSync(entry.path),
    asset = merged.assets.find((a) => a.id === entry.id);
  if (
    !asset ||
    asset.src !== entry.runtime ||
    createHash("sha256").update(bytes).digest("hex") !== entry.sha256 ||
    asset.hash !== entry.sha256
  )
    throw Error("世界素材hash或映射不符");
  const output = resolve("public", entry.runtime);
  if (!output.startsWith(resolve("public/assets/world") + "/"))
    throw Error("世界素材路徑越界");
  mkdirSync(resolve("public/assets/world"), { recursive: true });
  writeFileSync(output, bytes);
}

// Explicit integrator-owned media manifest; never infer files from asset IDs.
const extensionAssets = JSON.parse(
  readFileSync("art/catalog/extension-assets.json", "utf8"),
) as typeof worldAssets;
rmSync("public/assets/extensions", { recursive: true, force: true });
for (const entry of extensionAssets) {
  const source = resolve(entry.path);
  const master = entry.master && resolve(entry.master);
  const output = resolve("public", entry.runtime);
  if (
    !source.startsWith(resolve("art") + "/") ||
    (master && !master.startsWith(resolve("art") + "/")) ||
    !output.startsWith(resolve("public/assets/extensions") + "/")
  )
    throw Error("擴充素材路徑越界");
  const bytes = readFileSync(source);
  const asset = merged.assets.find((a) => a.id === entry.id);
  if (
    !asset ||
    asset.src !== entry.runtime ||
    asset.hash !== entry.sha256 ||
    createHash("sha256").update(bytes).digest("hex") !== entry.sha256 ||
    (master &&
      createHash("sha256").update(readFileSync(master)).digest("hex") !==
        entry.masterSha256)
  )
    throw Error(`擴充素材hash或映射不符：${entry.id}`);
  mkdirSync(resolve(output, ".."), { recursive: true });
  writeFileSync(output, bytes);
}
