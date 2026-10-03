import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

// The credit-admission.ts module under test (imported UNMODIFIED, read-only,
// from the real feat/ai-control-plane-credit-admission worktree) resolves
// "@/lib/opportunity-engine" against apps/web's own tsconfig path alias
// (`"@/*": ["./*"]` rooted at apps/web/). We reproduce that exact alias here,
// pointed at the SAME real worktree, so the real module resolves its real
// sibling instead of anything hand-rolled.
const prdWebRoot = path.resolve(here, "../../../wt/prd/apps/web");

export default defineConfig({
  resolve: {
    alias: [{ find: "@", replacement: prdWebRoot }],
  },
  test: {
    include: ["src/tests/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
