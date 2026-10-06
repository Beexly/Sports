import { describe, expect, it } from "vitest";
import {
  mapReportStatus,
  mapPracticeStatus,
  mapPositionTier,
  toInjuryPracticeReport,
} from "@/lib/ops/injury-trajectory-map";

describe("injury report → trajectory input mapping", () => {
  it("maps official designations without inventing certainty", () => {
    expect(mapReportStatus("Out")).toBe("OUT");
    expect(mapReportStatus("Doubtful")).toBe("DOUBTFUL");
    expect(mapReportStatus("Questionable")).toBe("QUESTIONABLE");
    expect(mapReportStatus("")).toBe("NONE");
    expect(mapReportStatus(null)).toBe("NONE");
    expect(mapReportStatus("Injured Reserve")).toBe("NONE");
  });

  it("maps practice free text to the Friday slot only", () => {
    expect(mapPracticeStatus("Full")).toBe("FP");
    expect(mapPracticeStatus("Limited")).toBe("LP");
    expect(mapPracticeStatus("Did Not Participate")).toBe("DNP");
    expect(mapPracticeStatus("DNP - Rest")).toBe("DNP_NIR");
    expect(mapPracticeStatus("")).toBeUndefined();
    expect(mapPracticeStatus("mystery text")).toBeUndefined();
  });

  it("grants leverage tiers only to confirmed depth-chart starters", () => {
    expect(mapPositionTier("QB", true)).toBe("QB_STARTER");
    expect(mapPositionTier("WR", true)).toBe("WR1_ELITE");
    expect(mapPositionTier("RB", true)).toBe("RB_BELLCOW");
    expect(mapPositionTier("CB", true)).toBe("CB_SHUTDOWN");
    // Not a confirmed starter → no leverage tier, even at QB.
    expect(mapPositionTier("QB", false)).toBe("STARTER_OTHER");
    // Confirmed starter but unprovable leverage role → no claim.
    expect(mapPositionTier("T", true)).toBe("STARTER_OTHER");
    expect(mapPositionTier("TE", true)).toBe("STARTER_OTHER");
    expect(mapPositionTier(null, true)).toBe("STARTER_OTHER");
  });

  it("builds the analyzer input with Wed/Thu left undefined", () => {
    const report = toInjuryPracticeReport(
      { reportStatus: "Questionable", practiceStatus: "Limited", position: "QB" },
      true,
    );
    expect(report.wednesday).toBeUndefined();
    expect(report.thursday).toBeUndefined();
    expect(report.friday).toBe("LP");
    expect(report.officialStatus).toBe("QUESTIONABLE");
    expect(report.positionTier).toBe("QB_STARTER");
  });
});

describe("mapped row → real analyzer composition", () => {
  it("a questionable starting QB yields a mid play probability and QB leverage", async () => {
    const { analyzeInjuryTrajectory } = await import("@sports/prediction-engine");
    const report = toInjuryPracticeReport(
      { reportStatus: "Questionable", practiceStatus: "Limited", position: "QB" },
      true,
    );
    const a = analyzeInjuryTrajectory(report);
    expect(a.estimatedPlayProbability).toBeGreaterThan(0.4);
    expect(a.estimatedPlayProbability).toBeLessThan(0.95);
    expect(a.spreadImpactPointsIfOut).toBeCloseTo(4.5, 6);
    expect(a.positionTier).toBeUndefined(); // analysis carries no tier; the report does
  });

  it("an OUT player collapses play probability to ~0", async () => {
    const { analyzeInjuryTrajectory } = await import("@sports/prediction-engine");
    const report = toInjuryPracticeReport(
      { reportStatus: "Out", practiceStatus: "Did Not Participate", position: "WR" },
      true,
    );
    const a = analyzeInjuryTrajectory(report);
    expect(a.estimatedPlayProbability).toBeLessThan(0.15);
  });
});
