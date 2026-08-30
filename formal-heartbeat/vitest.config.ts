import { defineConfig } from "vitest/config";

// Self-contained lab package: no cross-worktree path aliases, no real
// production code imported. Everything under test is pure and local.
export default defineConfig({
  test: {
    include: ["src/tests/**/*.test.ts"],
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
