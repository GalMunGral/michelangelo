import { defineConfig } from "vite";

export default defineConfig({
  root: "src",
  base: "/michelangelo/",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },
});