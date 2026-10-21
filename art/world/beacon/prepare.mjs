// Encode only beacon-owned masters and bind them through the existing AssetDef API.
// Run from the repository root: node art/world/beacon/prepare.mjs
import { chromium } from "../../../tools/node_modules/playwright/index.mjs";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const root = "art/world/beacon";
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const specs = [
  [
    "scout",
    "邊境游弋機",
    "sprite",
    "beacon:enemy.scout",
    768,
    ["art/world/scout-ai.png"],
    "窄長叉形艇首、單引擎、後置小翼；深紫黑金屬與橙紅感測器，輪廓區別於既有寬翼偵察機。",
  ],
  [
    "warden",
    "信標護衛艦",
    "sprite",
    "beacon:enemy.warden",
    768,
    ["art/world/sentinel-ai.png"],
    "厚重六角中心艙、兩根前鉗砲臂、四後推進器；寬身輪廓，橙紅能量槽。",
  ],
  [
    "anchor",
    "錨定指揮艦",
    "sprite",
    "beacon:enemy.anchor",
    1024,
    ["art/world/destroyer.png"],
    "中央尖塔艦體、斷開六角環架、四錨定外支架；紫色核心與洋紅能量，獨立Boss輪廓。",
  ],
  [
    "signal",
    "邊境信標星球",
    "sprite",
    "beacon:planet.signal",
    768,
    ["art/world/haven.png", "art/world/vein.png"],
    "藍色條帶星球、上左光源、下右暗面，單圈通訊環與三個暖金信標；保持圖形化日系星圖材質。",
  ],
  [
    "frontier",
    "邊境星雲",
    "background",
    "m1:frontier-test",
    1672,
    ["art/world/cosmos.png"],
    "低亮度深海軍藍、左右藍紫星雲、細金塵弧；中央留暗，手機中央裁切仍能讀取敵彈。",
  ],
];
const packPath = "content/extensions/frontier-beacon.json";
const pack = JSON.parse(await readFile(packPath, "utf8"));
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
});
const entries = [];
try {
  const page = await browser.newPage();
  for (const [slug, name, kind, entity, maxSize, references, brief] of specs) {
    const master = `${root}/${slug}-v1.png`;
    const source = await readFile(master);
    const result = await page.evaluate(
      async ({ data, maxSize, transparent }) => {
        const im = new Image();
        im.src = data;
        await im.decode();
        const scale = Math.min(1, maxSize / Math.max(im.width, im.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(im.width * scale);
        canvas.height = Math.round(im.height * scale);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(im, 0, 0, canvas.width, canvas.height);
        const alpha = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let clear = 0,
          solid = 0;
        for (let i = 3; i < alpha.length; i += 4) {
          if (alpha[i] === 0) clear++;
          if (alpha[i] >= 240) solid++;
        }
        if (transparent && (!clear || !solid))
          throw Error("sprite alpha invalid");
        if (transparent && alpha[3] !== 0) throw Error("opaque sprite corner");
        return {
          masterWidth: im.width,
          masterHeight: im.height,
          width: canvas.width,
          height: canvas.height,
          clear,
          solid,
          src: canvas.toDataURL("image/webp", 0.9),
        };
      },
      {
        data: `data:image/png;base64,${source.toString("base64")}`,
        maxSize,
        transparent: kind === "sprite",
      },
    );
    const bytes = Buffer.from(result.src.split(",")[1], "base64");
    const path = `${root}/${slug}-v1.webp`;
    const id = `beacon:asset.${slug}-v1`;
    await writeFile(path, bytes);
    entries.push({
      id,
      entity,
      kind,
      version: 1,
      master,
      masterSha256: hash(source),
      masterWidth: result.masterWidth,
      masterHeight: result.masterHeight,
      path,
      sha256: hash(bytes),
      width: result.width,
      height: result.height,
      bytes: bytes.length,
      colorSpace: "sRGB",
      alpha: kind === "sprite",
      blend: "normal",
      pivot: [0.5, 0.5],
      animation: null,
      atlas: null,
      bundle: pack.id,
      source: "image_gen; original Galaxy Angel frontier art; 2026-10-21",
      promptVersion: "beacon-v1-distinct-silhouettes",
      brief,
      references: await Promise.all(
        references.map(async (path) => ({
          path,
          sha256: hash(await readFile(path)),
        })),
      ),
      processing:
        "master preserved; browser Canvas resize and WebP quality 0.9 delivery encoding only",
      review: "candidate",
      preview: path,
      binding:
        kind === "sprite"
          ? "extension entity sprite"
          : "prepared; core integrator assigns existing region background",
    });
    pack.definitions.assets ??= [];
    pack.definitions.assets = pack.definitions.assets.filter(
      (a) => a.id !== id,
    );
    pack.definitions.assets.push({
      id,
      name,
      src: result.src,
      width: result.width,
      height: result.height,
      hash: hash(bytes),
      review: "candidate",
    });
    if (kind === "sprite") {
      const def = [
        ...pack.definitions.enemies,
        ...pack.definitions.planets,
      ].find((d) => d.id === entity);
      if (!def) throw Error(`missing entity ${entity}`);
      def.sprite = id;
    }
    console.log(
      id,
      `${result.width}x${result.height}`,
      bytes.length,
      "bytes",
      `alpha-clear:${result.clear}`,
    );
  }
} finally {
  await browser.close();
}
pack.version = "0.2.0";
pack.definitions.planets[0].description =
  pack.definitions.planets[0].description.replace(
    "外觀暫用現有候選素材。",
    "藍色信標環與守軍各有固定專屬外觀。",
  );
await writeFile(`${root}/assets.json`, JSON.stringify(entries, null, 2) + "\n");
await writeFile(packPath, JSON.stringify(pack, null, 2) + "\n");
