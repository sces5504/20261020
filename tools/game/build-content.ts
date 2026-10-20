import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { assemble } from "../../src/content/loader";
const root = resolve("content"),
  manifest = JSON.parse(readFileSync("content/manifest.json", "utf8")) as {
    base: string;
    extensions: string[];
  };
const load = (file: string) => {
  const path = resolve(root, file);
  if (!path.startsWith(root + "/") || !file.endsWith(".json"))
    throw Error("內容檔路徑必須在 content 內");
  return JSON.parse(readFileSync(path, "utf8"));
};
const merged = assemble(load(manifest.base), manifest.extensions.map(load));
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
