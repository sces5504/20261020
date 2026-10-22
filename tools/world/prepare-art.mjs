// Delivery transform only: fixed atlas extraction/encoding of imagegen masters.
// Never touches existing character or world masters.
import { chromium } from "../node_modules/playwright/index.mjs";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
const root = "art/world/original-world";
const hash = (b) => createHash("sha256").update(b).digest("hex");
const enemy = JSON.parse(await readFile(`${root}/enemy-plan.json`, "utf8"));
const planets = JSON.parse(await readFile(`${root}/planet-plan.json`, "utf8"));
const keys = [
  "solar",
  "virgo",
  "leo",
  "southern",
  "canis",
  "northern",
  "cygnus",
  "gemini",
  "taurus",
  "scorpio",
  "sagittarius",
  "cancer",
  "aries",
  "pisces",
];
const jobs = [
  ...enemy.map((v) => ({
    ...v,
    name: v.model,
    key: "enemy-" + Math.min(...v.cidRows),
    grid: 3,
    master: `${root}/masters/enemy-atlas-0${v.atlas}.png`,
    size: 512,
  })),
  ...planets.map((v) => ({
    ...v,
    name: v.key,
    key: "planet-" + v.pidRow,
    grid: 4,
    master: `${root}/masters/planet-atlas-0${v.atlas}.png`,
    size: 384,
  })),
  ...keys.map((key) => ({
    assetId: "original:asset.background-" + key,
    key: "background-" + key,
    name: key,
    grid: 1,
    cell: 0,
    master: `${root}/masters/background-${key}.png`,
    size: 0,
  })),
  ...["stronghold", "camp", "event", "gate"].map((key) => ({
    assetId: "original:asset.node-" + key,
    key: "node-" + key,
    name: key,
    grid: 1,
    cell: 0,
    master: `${root}/masters/node-${key}.png`,
    size: 512,
  })),
];
await mkdir(`${root}/web`, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
});
const entries = [],
  assets = [];
try {
  const page = await browser.newPage();
  for (const job of jobs) {
    const bytes = await readFile(job.master);
    const result = await page.evaluate(
      async ({ data, grid, cell, size, master }) => {
        const im = new Image();
        im.src = data;
        await im.decode();
        let sx = 0,
          sy = 0,
          sw = im.width,
          sh = im.height,
          source = im,
          crop = [0, 0, im.width, im.height];
        if (grid > 1) {
          // Generated atlases can have rings/antennae crossing nominal cell lines.
          // Unpack complete alpha components before trimming, rather than cutting a
          // neighbour's ring into one sprite and clipping its rightful owner.
          let atlas = window.__worldAtlas;
          if (atlas?.master !== master) {
            const raw = document.createElement("canvas");
            raw.width = im.width;
            raw.height = im.height;
            const rc = raw.getContext("2d", { willReadFrequently: true });
            rc.drawImage(im, 0, 0);
            const pixels = rc.getImageData(0, 0, im.width, im.height),
              labels = new Uint32Array(im.width * im.height),
              stack = new Uint32Array(labels.length),
              components = [null];
            for (let index = 0; index < labels.length; index++) {
              if (labels[index] || pixels.data[index * 4 + 3] <= 16) continue;
              const label = components.length;
              let used = 0,
                total = 0,
                sumX = 0,
                sumY = 0,
                minX = im.width,
                minY = im.height,
                maxX = 0,
                maxY = 0;
              stack[used++] = index;
              labels[index] = label;
              while (used) {
                const at = stack[--used],
                  x = at % im.width,
                  y = Math.floor(at / im.width);
                total++;
                sumX += x;
                sumY += y;
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
                for (const next of [
                  x > 0 ? at - 1 : -1,
                  x < im.width - 1 ? at + 1 : -1,
                  y > 0 ? at - im.width : -1,
                  y < im.height - 1 ? at + im.width : -1,
                ])
                  if (
                    next >= 0 &&
                    !labels[next] &&
                    pixels.data[next * 4 + 3] > 16
                  ) {
                    labels[next] = label;
                    stack[used++] = next;
                  }
              }
              const col = Math.min(
                  grid - 1,
                  Math.floor((sumX / total / im.width) * grid),
                ),
                row = Math.min(
                  grid - 1,
                  Math.floor((sumY / total / im.height) * grid),
                );
              components.push({
                cell: row * grid + col,
                total,
                minX,
                minY,
                maxX,
                maxY,
              });
            }
            atlas = {
              master,
              pixels,
              labels,
              components,
              width: im.width,
              height: im.height,
            };
            window.__worldAtlas = atlas;
          }
          const selected = new Set(
            atlas.components.flatMap((v, label) =>
              v && v.cell === cell && v.total > 16 ? [label] : [],
            ),
          );
          const parts = atlas.components.filter((v, label) =>
            selected.has(label),
          );
          if (!parts.length)
            throw Error("Missing atlas subject " + master + ":" + cell);
          sx = Math.min(...parts.map((v) => v.minX));
          sy = Math.min(...parts.map((v) => v.minY));
          sw = Math.max(...parts.map((v) => v.maxX)) - sx + 1;
          sh = Math.max(...parts.map((v) => v.maxY)) - sy + 1;
          crop = [sx, sy, sw, sh];
          const isolated = document.createElement("canvas");
          isolated.width = sw;
          isolated.height = sh;
          const ctx = isolated.getContext("2d"),
            out = ctx.createImageData(sw, sh);
          for (let y = 0; y < sh; y++)
            for (let x = 0; x < sw; x++) {
              const from = (sy + y) * im.width + sx + x,
                to = (y * sw + x) * 4;
              if (selected.has(atlas.labels[from]))
                out.data.set(
                  atlas.pixels.data.subarray(from * 4, from * 4 + 4),
                  to,
                );
            }
          ctx.putImageData(out, 0, 0);
          source = isolated;
          sx = 0;
          sy = 0;
        }
        const c = document.createElement("canvas");
        c.width = size || im.width;
        c.height = size || im.height;
        const ctx = c.getContext("2d");
        ctx.imageSmoothingQuality = "high";
        // Preserve aspect and add a delivery gutter; texture dimensions never set collision.
        const pad = size ? Math.round(size * 0.04) : 0;
        const scale = Math.min(
            (c.width - pad * 2) / sw,
            (c.height - pad * 2) / sh,
          ),
          dw = sw * scale,
          dh = sh * scale;
        ctx.drawImage(
          source,
          sx,
          sy,
          sw,
          sh,
          (c.width - dw) / 2,
          (c.height - dh) / 2,
          dw,
          dh,
        );
        const rgba = ctx.getImageData(0, 0, c.width, c.height).data;
        let opaque = 0,
          transparent = 0;
        for (let i = 3; i < rgba.length; i += 4) {
          if (rgba[i] > 16) opaque++;
          if (rgba[i] === 0) transparent++;
        }
        return {
          data: c.toDataURL("image/webp", 0.9),
          width: c.width,
          height: c.height,
          opaque,
          transparent,
          crop,
        };
      },
      {
        data: "data:image/png;base64," + bytes.toString("base64"),
        grid: job.grid,
        cell: job.cell,
        size: job.size,
        master: job.master,
      },
    );
    if (result.opaque < 100) throw Error("Empty artwork " + job.key);
    if (job.size && result.transparent < 100)
      throw Error("Missing transparency " + job.key);
    const output = Buffer.from(result.data.split(",")[1], "base64");
    const path = `${root}/web/${job.key}.webp`,
      runtime = `assets/extensions/original-world/${job.key}.webp`;
    await writeFile(path, output);
    entries.push({
      id: job.assetId,
      path,
      runtime,
      sha256: hash(output),
      master: job.master,
      masterSha256: hash(bytes),
      type: job.size ? "sprite" : "background",
      width: result.width,
      height: result.height,
      colorSpace: "sRGB",
      alpha: !!job.size,
      pivot: [0.5, 0.5],
      atlas: { grid: job.grid, cell: job.cell, crop: result.crop },
      version: "1",
      bundle: "original:package.world",
      source:
        "imagegen; prompt next to master; fixed source identity, original redraw, no OBB pixels",
      review: "candidate",
      preview: path,
    });
    assets.push({
      id: job.assetId,
      name: job.name,
      src: runtime,
      width: result.width,
      height: result.height,
      hash: hash(output),
      review: "candidate",
    });
  }
  await writeFile(
    `${root}/media.json`,
    JSON.stringify(entries, null, 2) + "\n",
  );
  await writeFile(
    `${root}/assets.json`,
    JSON.stringify(assets, null, 2) + "\n",
  );
  const existing = JSON.parse(
    await readFile("art/catalog/extension-assets.json", "utf8"),
  ).filter((v) => !v.id.startsWith("original:"));
  await writeFile(
    "art/catalog/extension-assets.json",
    JSON.stringify([...existing, ...entries], null, 2) + "\n",
  );
  console.log(
    `${entries.length} fixed assets encoded, ${entries.reduce((n, e) => n + e.width * e.height * 4, 0)} RGBA bytes (all at once)`,
  );
} finally {
  await browser.close();
}
