// Mechanical encoding only; keep generated RGBA masters and their composition.
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { chromium } from "../node_modules/playwright/index.mjs";
const root = "art/ui/interface-suite-v1";
const browser = await chromium.launch({ args: ["--no-sandbox"] });
const hash = (b) => createHash("sha256").update(b).digest("hex");
try {
  const page = await browser.newPage(),
    records = [];
  for (const [name, source, kind] of [
    [
      "operations",
      "exec-402dc844-10e6-4b59-935c-1239bb4ee426.png",
      "opaque command and research environment",
    ],
    [
      "sortie",
      "exec-cbc85a6b-313b-4356-abe0-4c115ac060ee.png",
      "opaque fleet expedition environment",
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
      assetId: `presentation:interface-${name}.v1`,
      version: "1.0.0-candidate",
      kind,
      master: `${root}/${name}-master.png`,
      masterSha256: hash(master),
      path: `${root}/${name}.webp`,
      sha256: hash(webp),
      width: encoded.width,
      height: encoded.height,
      alpha: {
        mode: name.startsWith("frame") ? "straight, preserved" : "opaque",
        min: encoded.minAlpha,
        max: encoded.maxAlpha,
      },
      colorSpace: "sRGB",
      pivot: [0.5, 0.5],
      nineSlice: name.startsWith("frame")
        ? {
            top: 112,
            right: 120,
            bottom: 112,
            left: 120,
            center: "not rendered",
            cssBorderWidth: 12,
          }
        : null,
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
      reviewStatus:
        name === "frame"
          ? "retired-after-user-request-to-reduce-gold"
          : "candidate-awaiting-user-review",
    });
  }
  await writeFile(
    `${root}/manifest.json`,
    JSON.stringify(records, null, 2) + "\n",
  );
  console.log(
    "Encoded two selected suite materials; generated masters retained.",
  );
} finally {
  await browser.close();
}
