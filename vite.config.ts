import { defineConfig } from "vite";

export default defineConfig({
  // Relative base so the built site works when served from a subpath
  // (e.g. apps.charliekrug.com/shader-garden) as well as the domain root.
  base: "./",
  build: {
    outDir: "dist",
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
