import { defineConfig } from "vitest/config";

// Self-contained lab package (matches formal-heartbeat / formal-regression
// conventions elsewhere in this repo): no production code imported.
// Everything under test is pure and local, except apalache-client.test.ts /
// ic3-controller.test.ts's own in-process/local-HTTP mock JSON-RPC server
// (src/mock/apalache-mock-server.ts), which is also part of this package.
export default defineConfig({
  test: {
    include: ["src/tests/**/*.test.ts"],
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
