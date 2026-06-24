import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

const extensionAlias = {
  ".js": [".ts", ".tsx", ".js"],
  ".jsx": [".tsx", ".jsx"],
};

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules", ".next"],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "."),
      "@sports/galaxy-engine": resolve(__dirname, "../../packages/galaxy-engine/src/index.ts"),
      "@sports/galaxy-spatial": resolve(__dirname, "../../packages/galaxy-spatial/src/index.ts"),
    },
    ...({ extensionAlias } as { extensionAlias: typeof extensionAlias }),
  },
});
