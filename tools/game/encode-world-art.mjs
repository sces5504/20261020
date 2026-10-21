// Web delivery encoding of NEW world artwork only. Immutable user portraits are excluded.
import { chromium } from "../node_modules/playwright/index.mjs";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const manifest = JSON.parse(
  await readFile("art/catalog/world-assets.json", "utf8"),
);
const pack = JSON.parse(await readFile("content/core/pack.json", "utf8"));
const b = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
try {
  const page = await b.newPage();
  for (const entry of manifest) {
    const source = await readFile(entry.master ?? entry.path);
    const encoded = await page.evaluate(
      async (data) => {
        const im = new Image();
        im.src = data;
        await im.decode();
        const c = document.createElement("canvas");
        c.width = im.width;
        c.height = im.height;
        c.getContext("2d").drawImage(im, 0, 0);
        return c.toDataURL("image/webp", 0.9);
      },
      "data:image/png;base64," + source.toString("base64"),
    );
    const bytes = Buffer.from(encoded.split(",")[1], "base64"),
      path = (entry.master ?? entry.path).replace(".png", ".webp");
    await writeFile(path, bytes);
    entry.master = entry.master ?? entry.path;
    entry.masterSha256 = createHash("sha256").update(source).digest("hex");
    entry.path = path;
    entry.runtime = entry.runtime.replace(".png", ".webp");
    entry.sha256 = createHash("sha256").update(bytes).digest("hex");
    const a = pack.assets.find((a) => a.id === entry.id);
    a.src = entry.runtime;
    a.hash = entry.sha256;
    console.log(a.id, bytes.length);
  }
  await writeFile(
    "art/catalog/world-assets.json",
    JSON.stringify(manifest, null, 2) + "\n",
  );
  await writeFile(
    "content/core/pack.json",
    JSON.stringify(pack, null, 2) + "\n",
  );
} finally {
  await b.close();
}
