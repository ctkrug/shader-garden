import { defineConfig } from "vite";

export default defineConfig({
  // Relative base so the built site works when served from a subpath
  // (e.g. apps.charliekrug.com/shader-garden) as well as the domain root.
  base: "./",
  build: {
    outDir: "dist",
    // The CodeMirror editor bundle (~500kB) is the only chunk near the
    // default 500kB warning threshold, and it's already behind main.ts's
    // dynamic import() — it never blocks the initial paint, so the warning
    // is a false positive here rather than a real perf issue to split further.
    chunkSizeWarningLimit: 600,
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
