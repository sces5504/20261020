// Mechanical UI thumbnails only. Source portraits remain byte-for-byte intact.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { chromium } from "../node_modules/playwright/index.mjs";
const p = JSON.parse(await readFile("content/generated/runtime.json", "utf8"));
const out = "art/ui/operator-portraits-v1";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ args: ["--no-sandbox"] }),
  records = [];
try {
  const page = await browser.newPage();
  for (const c of p.characters) {
    const a = p.assets.find((a) => a.id === c.portrait);
    if (!a) continue;
    const source = await readFile("public/" + a.src.replace(/^\.\//, ""));
    const encoded = await page.evaluate(
      async (src) => {
        const i = new Image();
        i.src = src;
        await i.decode();
        const canvas = document.createElement("canvas");
        canvas.height = 576;
        canvas.width = Math.round((576 * i.width) / i.height);
        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(i, 0, 0, canvas.width, canvas.height);
        return {
          data: canvas.toDataURL("image/webp", 0.92),
          width: canvas.width,
          height: canvas.height,
        };
      },
      "data:" +
        (a.src.endsWith(".webp") ? "image/webp" : "image/png") +
        ";base64," +
        source.toString("base64"),
    );
    const name = c.id.replace(/[^a-z0-9.-]/g, "_") + ".webp",
      path = `${out}/${name}`;
    const bytes = Buffer.from(encoded.data.split(",")[1], "base64");
    await writeFile(path, bytes);
    records.push({
      character: c.id,
      file: name,
      path,
      width: encoded.width,
      height: encoded.height,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      sourceAsset: a.id,
      sourceHash: createHash("sha256").update(source).digest("hex"),
      alpha: "straight, preserved",
      pivot: null,
      atlas: null,
      frames: null,
      reviewStatus: "layout-candidate; original artwork unchanged",
      method:
        "same composition, mechanical resize/WebP only; no redraw or generative edit",
    });
  }
  await writeFile(
    `${out}/manifest.json`,
    JSON.stringify(records, null, 2) + "\n",
  );
  console.log(`Encoded ${records.length} UI portraits; originals unchanged`);
} finally {
  await browser.close();
}
