import { readFile, mkdir } from "node:fs/promises";
import { chromium } from "../node_modules/playwright/index.mjs";
import { serveBuilt } from "../game/serve-built.mjs";
export async function previews(browser, url) {
  const media = JSON.parse(
    await readFile("art/world/original-world/media.json", "utf8"),
  );
  const pack = JSON.parse(
    await readFile("content/generated/runtime.json", "utf8"),
  );
  const page = await browser.newPage({
    viewport: { width: 1280, height: 1800 },
  });
  await mkdir(".artifacts/world", { recursive: true });
  for (const group of ["enemy", "planet"]) {
    await page.setContent(
      `<style>body{background:#091124;color:#bfe5ef;font:12px sans-serif;margin:12px}.grid{display:grid;grid-template-columns:repeat(8,1fr);gap:8px}article{background:#101c2d;text-align:center;min-width:0}img{width:130px;height:130px;object-fit:contain}p{margin:4px;overflow-wrap:anywhere}</style><div class=grid>${media
        .filter((v) => v.id.includes(`.${group}-`))
        .map(
          (m) =>
            `<article><img src="${url + m.runtime}"><p>${m.id}<br>${pack.assets.find((a) => a.id === m.id).name}</p></article>`,
        )
        .join("")}</div>`,
    );
    await page.waitForFunction(() =>
      Array.from(document.images).every(
        (i) => i.complete && i.naturalWidth > 0,
      ),
    );
    await page.screenshot({
      path: `.artifacts/world/${group}-preview.png`,
      fullPage: true,
    });
  }
  await page.close();
}
if (process.argv[1]?.endsWith("/previews.mjs")) {
  const server = await serveBuilt(),
    browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  try {
    await previews(browser, server.url);
  } finally {
    await browser.close();
    await server.close();
  }
}
