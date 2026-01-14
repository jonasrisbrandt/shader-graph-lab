import { resolve } from "node:path";
import { defineConfig } from "vite";

const base = process.env.VITE_BASE ?? "/";
const buildId = process.env.VITE_BUILD_ID ?? process.env.GITHUB_SHA ?? String(Date.now());

export default defineConfig({
  base,
  define: {
    __BUILD_ID__: JSON.stringify(buildId),
  },
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, "index.html"),
        app: resolve(__dirname, "app.html"),
      },
    },
  },
});
