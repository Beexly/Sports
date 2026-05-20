import { describe, it, expect } from "vitest";
import { evaluatePickEligibility, buildHistoryCsv, type CsvExportRow } from "@/lib/cockpit/history";

const settled = new Date("2026-05-17T22:00:00Z");

describe("evaluatePickEligibility", () => {
  it("eligible canonical published win counts toward public performance", () => {
    const e = evaluatePickEligibility(
      {
        id: "p1",
        result: "WIN",
        isBootstrap: false,
        isPublished: true,
        settledAt: settled,
        hasSnapshot: true,
        snapshotEligibleForLearning: true,
      },
      { canExposePerformanceStats: true }
    );
    expect(e.publicPerformanceEligible).toBe(true);
    expect(e.exclusionReasons).toHaveLength(0);
    expect(e.learningEligible).toBe(true);
  });

  it("bootstrap pick is never public-eligible even if it won and is published", () => {
    const e = evaluatePickEligibility(
      {
        id: "p2",
        result: "WIN",
        isBootstrap: true,
        isPublished: true,
        settledAt: settled,
        hasSnapshot: true,
        snapshotEligibleForLearning: true,
      },
      { canExposePerformanceStats: true }
    );
    expect(e.publicPerformanceEligible).toBe(false);
    expect(e.exclusionReasons.some((r) => r.toLowerCase().includes("bootstrap"))).toBe(true);
    expect(e.learningEligible).toBe(false);
  });

  it("pending pick is excluded with a pending reason", () => {
    const e = evaluatePickEligibility(
      {
        id: "p3",
        result: "PENDING",
        isBootstrap: false,
        isPublished: true,
        settledAt: null,
        hasSnapshot: true,
        snapshotEligibleForLearning: null,
      },
      { canExposePerformanceStats: true }
    );
    expect(e.publicPerformanceEligible).toBe(false);
    expect(e.exclusionReasons).toContain("Pending — no outcome yet");
  });

  it("void pick is tracked separately and excluded from win/loss", () => {
    const e = evaluatePickEligibility(
      {
        id: "p4",
        result: "VOID",
        isBootstrap: false,
        isPublished: true,
        settledAt: settled,
        hasSnapshot: true,
        snapshotEligibleForLearning: true,
      },
      { canExposePerformanceStats: true }
    );
    expect(e.publicPerformanceEligible).toBe(false);
    expect(e.exclusionReasons.some((r) => r.toLowerCase().includes("void"))).toBe(true);
  });

  it("performance gate off blocks every pick from public eligibility", () => {
    const e = evaluatePickEligibility(
      {
        id: "p5",
        result: "WIN",
        isBootstrap: false,
        isPublished: true,
        settledAt: settled,
        hasSnapshot: true,
        snapshotEligibleForLearning: true,
      },
      { canExposePerformanceStats: false }
    );
    expect(e.publicPerformanceEligible).toBe(false);
    expect(e.exclusionReasons).toContain("Performance gate is OFF");
  });

  it("unpublished pick is internal-only", () => {
    const e = evaluatePickEligibility(
      {
        id: "p6",
        result: "WIN",
        isBootstrap: false,
        isPublished: false,
        settledAt: settled,
        hasSnapshot: true,
        snapshotEligibleForLearning: true,
      },
      { canExposePerformanceStats: true }
    );
    expect(e.publicPerformanceEligible).toBe(false);
    expect(e.exclusionReasons.some((r) => r.toLowerCase().includes("internal"))).toBe(true);
  });

  it("settled-result with missing settledAt flags an incomplete settlement record", () => {
    const e = evaluatePickEligibility(
      {
        id: "p7",
        result: "WIN",
        isBootstrap: false,
        isPublished: true,
        settledAt: null,
        hasSnapshot: true,
        snapshotEligibleForLearning: true,
      },
      { canExposePerformanceStats: true }
    );
    expect(e.publicPerformanceEligible).toBe(false);
    expect(e.exclusionReasons.some((r) => /settled/i.test(r) && /missing|incomplete/i.test(r))).toBe(true);
  });

  it("learning eligibility requires a snapshot AND eligibleForLearning AND canonical AND settled", () => {
    // Missing snapshot
    expect(
      evaluatePickEligibility(
        {
          id: "p8",
          result: "WIN",
          isBootstrap: false,
          isPublished: true,
          settledAt: settled,
          hasSnapshot: false,
          snapshotEligibleForLearning: null,
        },
        { canExposePerformanceStats: true }
      ).learningEligible
    ).toBe(false);
    // Snapshot present but eligibleForLearning=false
    expect(
      evaluatePickEligibility(
        {
          id: "p9",
          result: "WIN",
          isBootstrap: false,
          isPublished: true,
          settledAt: settled,
          hasSnapshot: true,
          snapshotEligibleForLearning: false,
        },
        { canExposePerformanceStats: true }
      ).learningEligible
    ).toBe(false);
    // Pending — not learning eligible regardless
    expect(
      evaluatePickEligibility(
        {
          id: "p10",
          result: "PENDING",
          isBootstrap: false,
          isPublished: true,
          settledAt: null,
          hasSnapshot: true,
          snapshotEligibleForLearning: true,
        },
        { canExposePerformanceStats: true }
      ).learningEligible
    ).toBe(false);
  });
});

// ── CSV export ────────────────────────────────────────────────────────────

describe("buildHistoryCsv", () => {
  const row: CsvExportRow = {
    id: "p1",
    generatedAt: new Date("2026-05-17T20:00:00Z"),
    settledAt: new Date("2026-05-17T22:00:00Z"),
    sport: "NFL",
    matchup: "Bills @ Chiefs",
    pickType: "SPREAD",
    selection: "Chiefs -3.5",
    line: -3.5,
    confidence: 78,
    pickGrade: "STRONG_PLAY",
    riskLevel: "MODERATE",
    modelVersion: "v5",
    bookmakerCount: 7,
    edgeScore: 12.4,
    consensusPct: 0.62,
    result: "WIN",
    isBootstrap: false,
    isPublished: true,
    isFeatured: true,
    hasSnapshot: true,
    publicPerformanceEligible: true,
    learningEligible: true,
    exclusionReasons: [],
  };

  it("emits a single header line and one body line per row", () => {
    const csv = buildHistoryCsv([row, row]);
    const lines = csv.split("\r\n");
    expect(lines.length).toBe(3); // header + 2 rows
    expect(lines[0]).toMatch(/^id,generatedAt,settledAt/);
  });

  it("escapes commas, quotes, and newlines inside cells", () => {
    const tricky: CsvExportRow = {
      ...row,
      matchup: "Team A, Team B",
      selection: 'Over "53.5"',
      exclusionReasons: ["line\nbreak"],
    };
    const csv = buildHistoryCsv([tricky]);
    expect(csv).toContain(`"Team A, Team B"`);
    expect(csv).toContain(`"Over ""53.5"""`);
    expect(csv).toContain(`"line\nbreak"`);
  });

  it("represents a null settledAt as an empty cell, not the literal 'null'", () => {
    const pending: CsvExportRow = { ...row, settledAt: null, result: "PENDING" };
    const csv = buildHistoryCsv([pending]);
    // The settledAt cell sits between two known cells — generatedAt iso and
    // sport "NFL". Verify the empty cell is just back-to-back commas, not "null".
    expect(csv).not.toMatch(/,null,NFL,/);
    expect(csv).toMatch(/,2026-05-17T20:00:00\.000Z,,NFL,/);
  });

  it("joins exclusion reasons with '; ' so the cell stays single-line", () => {
    const excluded: CsvExportRow = {
      ...row,
      result: "PENDING",
      publicPerformanceEligible: false,
      exclusionReasons: ["Pending — no outcome yet", "Bootstrap pick — never counts for public performance"],
    };
    const csv = buildHistoryCsv([excluded]);
    expect(csv).toMatch(/Pending — no outcome yet; Bootstrap pick/);
  });
});
