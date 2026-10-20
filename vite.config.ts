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
            target: "m1-playtest",
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
