import { defineConfig } from "vite";
import { resolve } from "node:path";
import dts from "vite-plugin-dts";

export default defineConfig({
  plugins: [
    dts({
      include: ["src"],
      outDir: "dist",
      rollupTypes: true,
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "XFrameBridge",
      fileName: "xframe-bridge",
    },
    rollupOptions: {
      output: {
        exports: "named",
      },
    },
  },
});
