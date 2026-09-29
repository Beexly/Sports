import { defineConfig } from "@neon/config/v1";

// Neon backend-as-code: branch policy for the GSE database.
// Non-default branches are throwaway test environments — they auto-expire
// after 7 days. The default branch is production data (predictions, settled
// outcomes, calibration history) and is never used for testing.
// See AGENTS.md: NEON BRANCH-ONLY TESTING (2026-09-28, founder — HARD).
// Applied with: neon link && neon deploy

export default defineConfig({
  branch: (branch) => {
    // Default branch: no overrides, uses project defaults
    if (branch.isDefault) {
      return {};
    }

    // New non-default branches: auto-expire
    // Run `neon checkout <agent>-<task> --create` to create a test branch
    if (!branch.exists) {
      return { ttl: "7d" };
    }

    // Existing branch: no changes
    return {};
  },
});
