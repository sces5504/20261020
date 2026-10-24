// Mechanical encoding only; keep generated RGBA masters and their composition.
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { chromium } from "../node_modules/playwright/index.mjs";
const root = "art/ui/resonance-chamber-v1";
const browser = await chromium.launch({ args: ["--no-sandbox"] });
const hash = (b) => createHash("sha256").update(b).digest("hex");
try {
  const page = await browser.newPage(),
    records = [];
  for (const [name, source, kind] of [
    [
      "chamber",
      "exec-ae63022b-7114-4f7b-b12f-aab188d6685a.png",
      "opaque resonance chamber environment",
    ],
    [
      "activation",
      "exec-5747420c-ecea-48c9-8108-66b6f520ba30.png",
      "transparent activation button material",
    ],
  ]) {
    const master = await readFile(`${root}/${name}-master.png`);
    const encoded = await page.evaluate(
      async (data) => {
        const img = new Image();
        img.src = data;
        await img.decode();
        const c = document.createElement("canvas");
        c.width = img.width;
        c.height = img.height;
        const ctx = c.getContext("2d");
        ctx.drawImage(img, 0, 0);
        const px = ctx.getImageData(0, 0, c.width, c.height).data;
        let minAlpha = 255,
          maxAlpha = 0;
        for (let i = 3; i < px.length; i += 4) {
          minAlpha = Math.min(minAlpha, px[i]);
          maxAlpha = Math.max(maxAlpha, px[i]);
        }
        return {
          webp: c.toDataURL("image/webp", 0.94).split(",")[1],
          width: c.width,
          height: c.height,
          minAlpha,
          maxAlpha,
        };
      },
      `data:image/png;base64,${master.toString("base64")}`,
    );
    const webp = Buffer.from(encoded.webp, "base64");
    await writeFile(`${root}/${name}.webp`, webp);
    records.push({
      assetId: `presentation:resonance-${name}.v1`,
      version: "1.0.0-candidate",
      kind,
      master: `${root}/${name}-master.png`,
      masterSha256: hash(master),
      path: `${root}/${name}.webp`,
      sha256: hash(webp),
      width: encoded.width,
      height: encoded.height,
      alpha: {
        mode: name === "activation" ? "straight, preserved" : "opaque",
        min: encoded.minAlpha,
        max: encoded.maxAlpha,
      },
      colorSpace: "sRGB",
      pivot: [0.5, 0.5],
      atlas: null,
      frames: null,
      blend: "NORMAL",
      animation: "static art; does not drive timing or gameplay",
      bundle: "Vite URL in presentation CSS",
      source: {
        method: "OpenAI image generation; original UI art requested by user",
        generatedMaster: source,
        webEncoding:
          "same dimensions/composition, Canvas WebP .94; no semantic edit",
        externalArtCopied: false,
        bakedText: false,
      },
      reviewStatus: "candidate-awaiting-user-review",
    });
  }
  await writeFile(
    `${root}/manifest.json`,
    JSON.stringify(records, null, 2) + "\n",
  );
  console.log("Encoded two UI materials; generated masters retained.");
} finally {
  await browser.close();
}
