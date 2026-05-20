import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Shape-only audit: the launch-night session deliverables must all
 * exist on disk so a future cleanup pass can't accidentally remove one
 * without failing CI.
 *
 * This is a *manifest* test — it does not assert anything about the
 * file contents, only their presence. Each tested file has its own
 * dedicated test that covers its contract.
 */

const repoRoot = resolve(__dirname, "..", "..", "..");

const MANIFEST = [
  // Lib
  "apps/web/lib/performance/public-performance-policy.ts",
  "apps/web/lib/cockpit/jarvis.ts",
  "apps/web/lib/cockpit/jarvis-data.ts",
  "apps/web/lib/cockpit/jarvis-audit-log.ts",
  "apps/web/lib/cockpit/jarvis-history.ts",
  "apps/web/lib/cockpit/jarvis-diff.ts",
  "apps/web/lib/cockpit/jarvis-alerts.ts",
  "apps/web/lib/cockpit/history.ts",
  "apps/web/lib/cockpit/status-styles.ts",
  "apps/web/lib/dashboard/load-performance.ts",

  // Components
  "apps/web/components/cockpit/jarvis-trend.tsx",
  "apps/web/components/cockpit/jarvis-assessment-panel.tsx",
  "apps/web/components/cockpit/jarvis-diff-badge.tsx",
  "apps/web/components/cockpit/checklist-row.tsx",

  // Routes + pages
  "apps/web/app/cockpit/history/page.tsx",
  "apps/web/app/cockpit/jarvis/trend/page.tsx",
  "apps/web/app/api/cockpit/history/export/route.ts",
  "apps/web/app/api/cockpit/jarvis/route.ts",
  "apps/web/app/api/cockpit/jarvis/trend/route.ts",

  // Scripts
  "scripts/regenerate-launch-snapshots.mjs",
  "scripts/launch-night-smoke.mjs",
  "scripts/prod-probe.mjs",
  "scripts/jarvis-diff.mjs",
  "scripts/exercise-jarvis.mjs",
  "scripts/morning-setup.mjs",

  // Docs
  "docs/launch-observatory.md",
  "docs/launch-runbook.md",
  "docs/adr/001-public-performance-policy.md",
  "docs/adr/002-jarvis-synthesizer.md",
  "CONTRIBUTING.md",

  // Reports
  "reports/launch-night/README.md",
  "reports/launch-night/morning-handoff.md",
  "reports/launch-night/overnight-changelog.md",
  "reports/launch-night/overnight-summary.md",
  "reports/launch-night/observability-audit.md",
  "reports/launch-night/final-report.md",
  "reports/launch-night/next-session-handoff.md",
  "reports/launch-night/SESSIONS.md",
];

describe("Launch-night deliverable manifest", () => {
  for (const path of MANIFEST) {
    it(`${path} exists`, () => {
      expect(
        existsSync(resolve(repoRoot, path)),
        `Manifest item missing on disk: ${path}`
      ).toBe(true);
    });
  }
});
