import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  renderAllShadowMetricEvidenceReportsMarkdown,
  renderShadowMetricEvidenceReportIndexMarkdown,
} from "../core/index.js";

describe("shadow metric evidence markdown reports", () => {
  it("renders synthetic/local markdown reports with promotion locks", () => {
    const reports = renderAllShadowMetricEvidenceReportsMarkdown();
    const indexMarkdown = renderShadowMetricEvidenceReportIndexMarkdown();

    expect(reports.map((report) => report.metricId)).toEqual([
      "stale-line-risk-score",
      "qb-burden-index",
      "role-volatility-index",
      "calibration-integrity-grade",
      "playable-window-score",
      "portfolio-fit-score",
      "market-mirage-score",
    ]);
    expect(indexMarkdown).toContain("Generated from synthetic/local evidence fixtures");
    expect(indexMarkdown).toContain("Every report keeps live route creation disabled");

    for (const report of reports) {
      expect(report.shadowOnly).toBe(true);
      expect(report.publicApiAllowed).toBe(false);
      expect(report.liveRouteCreated).toBe(false);
      expect(report.markdown).toContain("Generated from synthetic/local metric evidence fixtures.");
      expect(report.markdown).toContain("Lifecycle: SHADOW.");
      expect(report.markdown).toContain("Public API allowed: false.");
      expect(report.markdown).toContain("Live route created: false.");
      expect(report.markdown).toContain("No probability, expected-value, pick, or betting-advice claim.");
    }
  });

  it("keeps the repo-visible markdown report aligned to generated shadow reports", () => {
    const markdown = readFileSync(
      resolve(process.cwd(), "../../docs/math/GSE_SHADOW_METRIC_EVIDENCE_REPORTS.md"),
      "utf8",
    );
    const reports = renderAllShadowMetricEvidenceReportsMarkdown();

    expect(markdown).toContain("# GSE Shadow Metric Evidence Reports");
    expect(markdown).toContain("generated from synthetic/local evidence fixtures");
    expect(markdown).toContain("Every report keeps live route creation disabled");

    for (const report of reports) {
      expect(markdown).toContain(`| \`${report.metricId}\` | \`${report.fileName}\``);
      expect(markdown).toContain(`## ${titleFromMetricId(report.metricId)}`);
      expect(markdown).toContain("Public API allowed: false.");
      expect(markdown).toContain("Live route created: false.");
    }
  });
});

function titleFromMetricId(metricId: string): string {
  return metricId
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
    .replace("Qb", "QB");
}
