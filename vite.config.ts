import { readFileSync } from "node:fs";
import { defineConfig } from "vite";
export default defineConfig({
  base: "./",
  plugins: [
    {
      name: "build-identity",
      generateBundle() {
        this.emitFile({
          type: "asset",
          fileName: "version.json",
          source: JSON.stringify({
            commit: process.env.GITHUB_SHA || "local-worktree",
            target: "exploration-playtest",
            contentVersion: JSON.parse(
              readFileSync("content/core/pack.json", "utf8"),
            ).version,
          }),
        });
      },
    },
  ],
  build: {
    target: "es2022",
    rollupOptions: { output: { manualChunks: { phaser: ["phaser"] } } },
  },
});
