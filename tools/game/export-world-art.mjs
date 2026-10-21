// Export our original deterministic vector artwork as portable PNG assets.
// Generation utility only; no user character art is loaded or transformed.
import { chromium } from "../node_modules/playwright/index.mjs";
import { readFile, writeFile, mkdir } from "node:fs/promises";
const p = JSON.parse(await readFile("content/core/pack.json", "utf8"));
const b = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
try {
  const page = await b.newPage();
  await page.goto("http://127.0.0.1:5176/#/art");
  const images = await page.evaluate(async (p) => {
    const Phaser = (await import("/node_modules/.vite/deps/phaser.js")).default;
    const { planetMaterial, enemyMaterial } = await import(
      "/src/presentation/materials.ts"
    );
    return await new Promise((resolve) => {
      class Export extends Phaser.Scene {
        create() {
          const out = [];
          p.planets.forEach((v, i) => {
            planetMaterial(this, v.id, v.color, i * 1751);
            out.push({
              id: v.id,
              name: v.name,
              src: this.textures
                .get(v.id)
                .getSourceImage()
                .toDataURL("image/png"),
            });
          });
          p.enemies
            .filter((v) => !v.boss)
            .forEach((v) => {
              enemyMaterial(this, v.id, v.color, v.boss, v.pattern);
              out.push({
                id: v.id,
                name: v.name,
                src: this.textures
                  .get(v.id)
                  .getSourceImage()
                  .toDataURL("image/png"),
              });
            });
          resolve(out);
        }
      }
      new Phaser.Game({
        type: Phaser.CANVAS,
        width: 2,
        height: 2,
        scene: Export,
        audio: { noAudio: true },
      });
    });
  }, p);
  await mkdir("art/world", { recursive: true });
  for (const a of images) {
    const filename = a.id.split(":")[1] + ".png";
    await writeFile(
      "art/world/" + filename,
      Buffer.from(a.src.split(",")[1], "base64"),
    );
    console.log(a.id, filename);
  }
} finally {
  await b.close();
}
