import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["apps/web/lib/**/*.test.ts"],
  },
});
