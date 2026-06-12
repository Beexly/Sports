import { describe, expect, it } from "vitest";
import {
  buildAllDepartmentReports,
  buildDepartmentReport,
  buildIntelligenceBriefing,
  generateMorningBriefing,
  DEPARTMENTS,
} from "../department-reports";
import { makeSummary } from "./fixtures";

const NOW = "2026-06-12T07:00:00.000Z";

describe("department reports", () => {
  it("covers all eight departments", () => {
    const reports = buildAllDepartmentReports(makeSummary());
    expect(reports).toHaveLength(8);
    expect(new Set(reports.map((r) => r.department)).size).toBe(8);
    expect(DEPARTMENTS.map(([d]) => d)).toContain("PICKS_DESK");
  });

  it("never claims healthy without OwnerSummary evidence — absent depts are UNKNOWN", () => {
    const reports = buildAllDepartmentReports(makeSummary());
    const content = reports.find((r) => r.department === "CONTENT")!;
    expect(content.healthLevel).toBe("UNKNOWN");
    expect(content.oneLiner).toContain("No evidence");
  });

  it("maps summary evidence to health honestly", () => {
    const summary = makeSummary();
    expect(buildDepartmentReport("scout", summary).healthLevel).toBe("HEALTHY");
    const tal = buildDepartmentReport("tal", summary);
    expect(tal.healthLevel).toBe("DEGRADED"); // AMBER + actionRequired
    expect(tal.requiresOwnerDecision).toBe(true);
    expect(tal.topRisk).toContain("aging source");
  });

  it("briefing: executiveSummary under 300 chars, topThreeActions capped at 3", () => {
    const reports = buildAllDepartmentReports(makeSummary());
    const briefing = buildIntelligenceBriefing(reports, makeSummary(), NOW);
    expect(briefing.executiveSummary.length).toBeLessThan(300);
    expect(briefing.topThreeActions.length).toBeLessThanOrEqual(3);
    expect(briefing.ownerDecisionQueue).toHaveLength(1);
    expect(briefing.overallHealth).toBe("DEGRADED");
  });

  it("morning briefing carries the required sections in order", () => {
    const reports = buildAllDepartmentReports(makeSummary());
    const text = generateMorningBriefing(makeSummary(), reports, NOW);
    const decisionIdx = text.indexOf("NEEDS YOUR DECISION");
    const fineIdx = text.indexOf("RUNNING FINE");
    const nextIdx = text.indexOf("NEXT BUILD");
    expect(decisionIdx).toBeGreaterThan(-1);
    expect(fineIdx).toBeGreaterThan(decisionIdx);
    expect(nextIdx).toBeGreaterThan(fineIdx);
  });
});
