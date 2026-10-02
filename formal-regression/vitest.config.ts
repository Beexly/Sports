import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

// The credit-admission.ts module under test (imported UNMODIFIED, read-only)
// resolves "@/lib/opportunity-engine" against apps/web's own tsconfig path alias
// (`"@/*": ["./*"]` rooted at apps/web/). We reproduce that exact alias here so
// the real module resolves its real sibling instead of anything hand-rolled.
//
// THIS PATH USED TO POINT AT A WORKTREE THAT NO LONGER EXISTS. It was
// `../../../wt/prd/apps/web` — a throwaway checkout of the
// feat/ai-control-plane-credit-admission branch, which has since been merged and
// deleted along with the worktree. Because this suite is not a workspace (it sits
// at repo root, outside the ["apps/*","packages/*","workers/*"] glob) and CI
// invokes only two named files, NOTHING RAN IT: the suite failed on module
// resolution and no step ever saw it fail. A money double-spend guard
// (100 concurrent authorize() calls against a $1.00 balance, asserting at most
// 50 admitted and never negative) has been dark rather than red.
//
// Repointed at the main checkout, which is where credit-admission.ts actually
// lives now. That makes the property test meaningful rather than pointed at a
// phantom — and it is the thing the suite was written to verify.
const prdWebRoot = path.resolve(here, "../../apps/web");

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
