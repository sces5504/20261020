import { readFileSync } from "node:fs";
import { defineConfig } from "vite";
import { fingerprint } from "./src/content/fingerprint";
import type { Pack } from "./src/content/schema";
export default defineConfig({
  base: "./",
  plugins: [
    {
      name: "build-identity",
      async generateBundle() {
        const manifest = JSON.parse(
          readFileSync("content/manifest.json", "utf8"),
        );
        const pack = JSON.parse(
          readFileSync("content/generated/runtime.json", "utf8"),
        ) as Pack;
        this.emitFile({
          type: "asset",
          fileName: "version.json",
          source: JSON.stringify({
            commit: process.env.GITHUB_SHA || "local-worktree",
            target: "exploration-playtest",
            contentVersion: JSON.parse(
              readFileSync("content/core/pack.json", "utf8"),
            ).version,
            contentHash: await fingerprint(pack),
            packs: [manifest.base, ...manifest.extensions].map(
              (file: string) => {
                const { id, version } = JSON.parse(
                  readFileSync(`content/${file}`, "utf8"),
                );
                return { id, version };
              },
            ),
          }),
        });
      },
    },
  ],
  // 大型內容包以 JSON.parse 載入，解析比等量 JS 物件字面值快。
  json: { stringify: true },
  build: {
    target: "es2022",
    rollupOptions: {
      input: { main: "index.html", gallery: "gallery.html" },
      output: { manualChunks: { phaser: ["phaser"] } },
    },
  },
});
