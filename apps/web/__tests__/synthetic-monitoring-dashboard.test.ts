import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  loadSyntheticMonitoringDashboard,
  parseSyntheticIssuesFromMarkdown,
  type SyntheticProbeArtifact,
} from "../lib/synthetic-monitoring/dashboard";

const repoRoot = resolve(__dirname, "..");

describe("synthetic monitoring dashboard", () => {
  it("models all six required check categories", () => {
    const dashboard = loadSyntheticMonitoringDashboard(new Date("2026-05-22T18:07:00.000Z"));

    expect(dashboard.categories).toHaveLength(6);
    expect(dashboard.categories.map((category) => category.id)).toEqual([
      "voice-brand-safety",
      "critical-availability",
      "data-freshness",
      "trust-gates",
      "content-surface-health",
      "build-integrity",
    ]);
    expect(dashboard.config.cadenceMinutes).toBe(15);
    expect(dashboard.lastRunIso).toBe("2026-05-22T18:00:00.000Z");
  });

  it("masks the owner target while preserving operational configuration", () => {
    const oldTarget = process.env.SYNTHETIC_MONITORING_OWNER_TARGET;
    process.env.SYNTHETIC_MONITORING_OWNER_TARGET = "owner-channel-12345";

    try {
      const dashboard = loadSyntheticMonitoringDashboard();
      expect(dashboard.config.ownerTargetMasked).toBe("ow***45");
      expect(dashboard.config.checks).toContain("CHECK-V1");
      expect(dashboard.config.checks).toContain("CHECK-C1");
    } finally {
      if (oldTarget === undefined) {
        delete process.env.SYNTHETIC_MONITORING_OWNER_TARGET;
      } else {
        process.env.SYNTHETIC_MONITORING_OWNER_TARGET = oldTarget;
      }
    }
  });

  it("hydrates covered checks from the latest probe artifact", () => {
    const artifact: SyntheticProbeArtifact = {
      appUrl: "https://example.test",
      generatedAtIso: "2026-05-22T18:05:00.000Z",
      ok: false,
      failed: 1,
      probes: [
        {
          path: "/",
          label: "homepage",
          ok: true,
          status: 200,
          ms: 42,
          bannedPattern: "",
          admin: false,
        },
        {
          path: "/board",
          label: "board",
          ok: false,
          status: 500,
          ms: 330,
          bannedPattern: "",
          admin: false,
        },
        {
          path: "/pricing",
          label: "pricing",
          ok: false,
          status: 200,
          ms: 44,
          bannedPattern: "/AI-powered/i",
          admin: false,
        },
      ],
    };

    const dashboard = loadSyntheticMonitoringDashboard(
      new Date("2026-05-22T18:07:00.000Z"),
      artifact
    );
    const checks = dashboard.categories.flatMap((category) => category.checks);

    expect(dashboard.runnerStatus).toBe("degraded");
    expect(checks.find((check) => check.id === "CHECK-A1")?.status).toBe("passing");
    expect(checks.find((check) => check.id === "CHECK-A2")?.status).toBe("failing");
    expect(checks.find((check) => check.id === "CHECK-V3")?.status).toBe("failing");
    expect(checks.find((check) => check.id === "CHECK-V3")?.detail).toContain("banned pattern");
  });

  it("hydrates check history from stored probe runs", () => {
    const passingArtifact: SyntheticProbeArtifact = {
      generatedAtIso: "2026-05-22T18:00:00.000Z",
      ok: true,
      failed: 0,
      probes: [
        {
          path: "/board",
          label: "board",
          ok: true,
          status: 200,
          ms: 41,
          bannedPattern: "",
          admin: false,
        },
      ],
    };
    const failingArtifact: SyntheticProbeArtifact = {
      generatedAtIso: "2026-05-22T18:15:00.000Z",
      ok: false,
      failed: 1,
      probes: [
        {
          path: "/board",
          label: "board",
          ok: false,
          status: 500,
          ms: 300,
          bannedPattern: "",
          admin: false,
        },
      ],
    };

    const dashboard = loadSyntheticMonitoringDashboard(
      new Date("2026-05-22T18:20:00.000Z"),
      failingArtifact,
      [],
      [passingArtifact, failingArtifact]
    );
    const boardCheck = dashboard.categories
      .flatMap((category) => category.checks)
      .find((check) => check.id === "CHECK-A2");

    expect(boardCheck?.history.slice(-3)).toEqual(["pending", "passing", "failing"]);
  });

  it("parses synthetic issue-queue entries for cockpit display", () => {
    const issues = parseSyntheticIssuesFromMarkdown(`# Issue Queue

<!-- synthetic-monitoring:/board:500: -->
## P1 - Synthetic monitoring failure

- **Filed:** 2026-05-22T18:05:00.000Z · **By:** synthetic-monitoring

<!-- synthetic-monitoring:/pricing:200:/AI-powered/i -->
## P2 - Synthetic monitoring failure
`);

    expect(issues).toEqual([
      {
        id: "synthetic-monitoring:/board:500:",
        severity: "P1",
        title: "Synthetic monitoring failure",
        sourcePath: "/docs/ops/issue-queue.md",
      },
      {
        id: "synthetic-monitoring:/pricing:200:/AI-powered/i",
        severity: "P2",
        title: "Synthetic monitoring failure",
        sourcePath: "/docs/ops/issue-queue.md",
      },
    ]);
  });
});

describe("/cockpit/synthetic-monitoring page", () => {
  const page = readFileSync(
    resolve(repoRoot, "app/cockpit/synthetic-monitoring/page.tsx"),
    "utf8"
  );
  const layout = readFileSync(resolve(repoRoot, "app/cockpit/layout.tsx"), "utf8");

  it("loads the typed dashboard and renders runner sections", () => {
    expect(page).toContain("loadSyntheticMonitoringDashboardFromDisk");
    expect(page).toContain("Production Verification Runner");
    expect(page).toContain("Auto-Filed Issues");
    expect(page).toContain("Configuration");
    expect(page).toContain("Manual Actions");
  });

  it("keeps manual actions disabled until durable history exists", () => {
    expect(page).toContain("disabled");
    expect(page).toContain("Pausing will require a decision-log entry");
  });

  it("is discoverable from the cockpit sidebar", () => {
    expect(layout).toContain('href: "/cockpit/synthetic-monitoring"');
    expect(layout).toContain("Synthetic Monitoring");
  });
});

describe("/api/health/synthetic-monitoring", () => {
  const route = readFileSync(
    resolve(repoRoot, "app/api/health/synthetic-monitoring/route.ts"),
    "utf8"
  );

  it("exposes a heartbeat without leaking owner-channel targets", () => {
    expect(route).toContain("loadSyntheticMonitoringDashboard");
    expect(route).toContain('dynamic = "force-dynamic"');
    expect(route).toContain("cadenceMinutes");
    expect(route).not.toContain("ownerTarget");
    expect(route).not.toContain("ownerChannel");
  });
});
