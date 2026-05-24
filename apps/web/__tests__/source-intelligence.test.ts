import { describe, it, expect } from "vitest";
import {
  buildPublishReadinessReport,
  classifyFreshness,
  summarizeCategories,
  readinessFromCategories,
  computeQualityScore,
  FRESHNESS_BUDGETS,
  REQUIRED_COVERAGE,
  type SourceEvidence,
  type CategoryStatus,
} from "@/lib/source-intelligence";

const NOW = new Date("2026-05-18T12:00:00Z");

function ev(
  cat: SourceEvidence["category"],
  ageMs: number,
  opts: Partial<SourceEvidence> = {}
): SourceEvidence {
  return {
    category: cat,
    sourceId: `${cat}-${ageMs}`,
    fetchedAt: new Date(NOW.getTime() - ageMs),
    trustScore: 90,
    ...opts,
  };
}

describe("classifyFreshness", () => {
  it("FRESH below soft TTL", () => {
    const e = ev("ODDS", 5 * 60_000);
    expect(classifyFreshness(e, NOW)).toBe("FRESH");
  });

  it("AGING between soft and hard TTL", () => {
    const e = ev("ODDS", FRESHNESS_BUDGETS.ODDS.softTtlMs + 60_000);
    expect(classifyFreshness(e, NOW)).toBe("AGING");
  });

  it("STALE beyond hard TTL", () => {
    const e = ev("ODDS", FRESHNESS_BUDGETS.ODDS.hardTtlMs + 60_000);
    expect(classifyFreshness(e, NOW)).toBe("STALE");
  });
});

describe("summarizeCategories", () => {
  it("marks missing categories as MISSING", () => {
    const cats = summarizeCategories("PICK", [], NOW);
    expect(cats.every((c) => c.status === "MISSING")).toBe(true);
    expect(cats.map((c) => c.category)).toEqual(REQUIRED_COVERAGE.PICK);
  });

  it("detects contradictions when one evidence contradicts another", () => {
    const cats = summarizeCategories(
      "PICK",
      [
        ev("ODDS", 5 * 60_000, { sourceId: "a" }),
        ev("ODDS", 5 * 60_000, { sourceId: "b", contradicts: ["a"] }),
        ev("TEAM_SCHEDULE", 1000),
        ev("MODEL_SNAPSHOT", 1000),
      ],
      NOW
    );
    const odds = cats.find((c) => c.category === "ODDS")!;
    expect(odds.status).toBe("CONTRADICTORY");
  });
});

describe("readinessFromCategories", () => {
  it("returns PUBLISH_READY when all fresh and high trust", () => {
    const cats = summarizeCategories(
      "PICK",
      [
        ev("ODDS", 60_000),
        ev("TEAM_SCHEDULE", 60_000),
        ev("MODEL_SNAPSHOT", 60_000),
      ],
      NOW
    );
    const { readiness, blockers } = readinessFromCategories("PICK", cats);
    expect(readiness).toBe("PUBLISH_READY");
    expect(blockers).toHaveLength(0);
  });

  it("missing category yields HOLD for PICK", () => {
    const cats = summarizeCategories(
      "PICK",
      [ev("ODDS", 60_000), ev("TEAM_SCHEDULE", 60_000)],
      NOW
    );
    const { readiness } = readinessFromCategories("PICK", cats);
    expect(readiness).toBe("HOLD");
  });

  it("missing category yields BLOCKED for PROMOTION", () => {
    const cats = summarizeCategories(
      "PROMOTION",
      [ev("PLATFORM_POLICY", 60_000)],
      NOW
    );
    const { readiness } = readinessFromCategories("PROMOTION", cats);
    expect(readiness).toBe("BLOCKED");
  });

  it("low trust raises REVIEW", () => {
    const cats = summarizeCategories(
      "PICK",
      [
        ev("ODDS", 60_000, { trustScore: 30 }),
        ev("TEAM_SCHEDULE", 60_000),
        ev("MODEL_SNAPSHOT", 60_000),
      ],
      NOW
    );
    const { readiness } = readinessFromCategories("PICK", cats);
    expect(readiness).toBe("REVIEW");
  });
});

describe("computeQualityScore", () => {
  it("ranks fresh evidence above stale", () => {
    const fresh = summarizeCategories(
      "PICK",
      [
        ev("ODDS", 60_000),
        ev("TEAM_SCHEDULE", 60_000),
        ev("MODEL_SNAPSHOT", 60_000),
      ],
      NOW
    );
    const stale = summarizeCategories(
      "PICK",
      [
        ev("ODDS", FRESHNESS_BUDGETS.ODDS.hardTtlMs + 60_000),
        ev(
          "TEAM_SCHEDULE",
          FRESHNESS_BUDGETS.TEAM_SCHEDULE.hardTtlMs + 60_000
        ),
        ev(
          "MODEL_SNAPSHOT",
          FRESHNESS_BUDGETS.MODEL_SNAPSHOT.hardTtlMs + 60_000
        ),
      ],
      NOW
    );
    expect(computeQualityScore(fresh)).toBeGreaterThan(
      computeQualityScore(stale)
    );
  });
});

describe("buildPublishReadinessReport", () => {
  it("end-to-end for a healthy pick", () => {
    const report = buildPublishReadinessReport({
      artifactKind: "PICK",
      artifactId: "pick_1",
      evidence: [
        ev("ODDS", 60_000),
        ev("TEAM_SCHEDULE", 60_000),
        ev("MODEL_SNAPSHOT", 60_000),
      ],
      now: NOW,
    });
    expect(report.readiness).toBe("PUBLISH_READY");
    expect(report.qualityScore).toBeGreaterThan(80);
    expect(report.blockers).toHaveLength(0);
    expect(report.rationale.length).toBeGreaterThan(0);
  });

  it("rationale lists blockers when missing data", () => {
    const report = buildPublishReadinessReport({
      artifactKind: "PROMOTION",
      artifactId: "promo_1",
      evidence: [],
      now: NOW,
    });
    expect(report.readiness).toBe("BLOCKED");
    expect(report.qualityScore).toBe(0);
    expect(report.rationale).toContain("BOOK_PROMO_TERMS");
  });
});

// ── classifyFreshness — additional branches ───────────────────────────────

describe("classifyFreshness — additional cases", () => {
  it("returns FRESH for a future timestamp (age < 0)", () => {
    // fetchedAt is 1 minute in the future relative to NOW
    const e = ev("ODDS", -60_000);
    expect(classifyFreshness(e, NOW)).toBe("FRESH");
  });

  it("uses INJURY_NEWS TTL (softTtl=6h, hardTtl=24h)", () => {
    const justPastSoft = ev("INJURY_NEWS", FRESHNESS_BUDGETS.INJURY_NEWS.softTtlMs + 60_000);
    expect(classifyFreshness(justPastSoft, NOW)).toBe("AGING");

    const justPastHard = ev("INJURY_NEWS", FRESHNESS_BUDGETS.INJURY_NEWS.hardTtlMs + 60_000);
    expect(classifyFreshness(justPastHard, NOW)).toBe("STALE");
  });

  it("uses TEAM_SCHEDULE TTL (softTtl=7d, hardTtl=30d)", () => {
    const fresh = ev("TEAM_SCHEDULE", 60_000);
    expect(classifyFreshness(fresh, NOW)).toBe("FRESH");

    const aging = ev("TEAM_SCHEDULE", FRESHNESS_BUDGETS.TEAM_SCHEDULE.softTtlMs + 60_000);
    expect(classifyFreshness(aging, NOW)).toBe("AGING");
  });
});

// ── summarizeCategories — additional coverage ────────────────────────────

describe("summarizeCategories — BRIEF artifact kind", () => {
  it("requires ODDS and TEAM_SCHEDULE for a BRIEF", () => {
    const cats = summarizeCategories("BRIEF", [], NOW);
    expect(cats.map((c) => c.category)).toEqual(REQUIRED_COVERAGE.BRIEF);
    expect(cats).toHaveLength(2);
    expect(cats.every((c) => c.status === "MISSING")).toBe(true);
  });

  it("BRIEF with fresh evidence is PUBLISH_READY", () => {
    const cats = summarizeCategories(
      "BRIEF",
      [ev("ODDS", 60_000), ev("TEAM_SCHEDULE", 60_000)],
      NOW
    );
    expect(cats.every((c) => c.status === "FRESH")).toBe(true);
  });
});

describe("summarizeCategories — CONTENT_DRAFT artifact kind", () => {
  it("requires only PLATFORM_POLICY for a CONTENT_DRAFT", () => {
    const cats = summarizeCategories("CONTENT_DRAFT", [], NOW);
    expect(cats.map((c) => c.category)).toEqual(REQUIRED_COVERAGE.CONTENT_DRAFT);
    expect(cats).toHaveLength(1);
  });
});

describe("summarizeCategories — multiple evidence per category", () => {
  it("selects the freshest evidence when multiple exist in the same category", () => {
    const cats = summarizeCategories(
      "PICK",
      [
        ev("ODDS", 25 * 60_000, { sourceId: "old-odds" }),
        ev("ODDS", 5 * 60_000, { sourceId: "new-odds" }),
        ev("TEAM_SCHEDULE", 60_000),
        ev("MODEL_SNAPSHOT", 60_000),
      ],
      NOW
    );
    const odds = cats.find((c) => c.category === "ODDS")!;
    expect(odds.bestEvidenceId).toBe("new-odds");
  });

  it("ignores evidence whose category is not required by the artifact kind", () => {
    const cats = summarizeCategories(
      "PICK",
      [
        ev("ODDS", 60_000),
        ev("TEAM_SCHEDULE", 60_000),
        ev("MODEL_SNAPSHOT", 60_000),
        ev("WEATHER", 60_000),       // not required for PICK
        ev("INJURY_NEWS", 60_000),   // not required for PICK
      ],
      NOW
    );
    expect(cats).toHaveLength(REQUIRED_COVERAGE.PICK.length);
    expect(cats.map((c) => c.category)).toEqual(REQUIRED_COVERAGE.PICK);
  });
});

// ── readinessFromCategories — additional branches ────────────────────────

describe("readinessFromCategories — stale and aging verdicts", () => {
  it("stale required category yields HOLD", () => {
    const cats = summarizeCategories(
      "PICK",
      [
        ev("ODDS", FRESHNESS_BUDGETS.ODDS.hardTtlMs + 60_000), // STALE
        ev("TEAM_SCHEDULE", 60_000),
        ev("MODEL_SNAPSHOT", 60_000),
      ],
      NOW
    );
    const { readiness } = readinessFromCategories("PICK", cats);
    expect(readiness).toBe("HOLD");
  });

  it("aging required category yields REVIEW", () => {
    const cats = summarizeCategories(
      "PICK",
      [
        ev("ODDS", FRESHNESS_BUDGETS.ODDS.softTtlMs + 60_000), // AGING
        ev("TEAM_SCHEDULE", 60_000),
        ev("MODEL_SNAPSHOT", 60_000),
      ],
      NOW
    );
    const { readiness } = readinessFromCategories("PICK", cats);
    expect(readiness).toBe("REVIEW");
  });
});

describe("readinessFromCategories — contradictory evidence", () => {
  it("non-hard contradiction (ODDS) yields REVIEW", () => {
    const cats = summarizeCategories(
      "PICK",
      [
        ev("ODDS", 60_000, { sourceId: "a" }),
        ev("ODDS", 60_000, { sourceId: "b", contradicts: ["a"] }),
        ev("TEAM_SCHEDULE", 60_000),
        ev("MODEL_SNAPSHOT", 60_000),
      ],
      NOW
    );
    const { readiness } = readinessFromCategories("PICK", cats);
    expect(readiness).toBe("REVIEW");
  });

  it("hard contradiction (PLATFORM_POLICY) in PROMOTION yields BLOCKED", () => {
    const cats = summarizeCategories(
      "PROMOTION",
      [
        ev("BOOK_PROMO_TERMS", 60_000),
        ev("PLATFORM_POLICY", 60_000, { sourceId: "x" }),
        ev("PLATFORM_POLICY", 60_000, { sourceId: "y", contradicts: ["x"] }),
      ],
      NOW
    );
    const { readiness } = readinessFromCategories("PROMOTION", cats);
    expect(readiness).toBe("BLOCKED");
  });

  it("hard contradiction (PLATFORM_POLICY) in CONTENT_DRAFT yields HOLD (not PROMOTION)", () => {
    const cats = summarizeCategories(
      "CONTENT_DRAFT",
      [
        ev("PLATFORM_POLICY", 60_000, { sourceId: "p" }),
        ev("PLATFORM_POLICY", 60_000, { sourceId: "q", contradicts: ["p"] }),
      ],
      NOW
    );
    const { readiness } = readinessFromCategories("CONTENT_DRAFT", cats);
    expect(readiness).toBe("HOLD");
  });
});

// ── computeQualityScore — additional branches ────────────────────────────

describe("computeQualityScore — edge cases", () => {
  it("returns 0 for an empty categories array", () => {
    expect(computeQualityScore([])).toBe(0);
  });

  it("CONTRADICTORY evidence scores lower than AGING", () => {
    const contradictory: CategoryStatus = {
      category: "ODDS",
      status: "CONTRADICTORY",
      bestEvidenceId: "a",
      bestTrustScore: 90,
      ageMs: 60_000,
    };
    const aging: CategoryStatus = {
      category: "ODDS",
      status: "AGING",
      bestEvidenceId: "b",
      bestTrustScore: 90,
      ageMs: 60_000,
    };
    expect(computeQualityScore([contradictory])).toBeLessThan(computeQualityScore([aging]));
  });

  it("MISSING evidence (no bestEvidenceId) scores 0 regardless of trust", () => {
    const missing: CategoryStatus = {
      category: "ODDS",
      status: "MISSING",
      bestEvidenceId: null,
      bestTrustScore: 0,
      ageMs: null,
    };
    expect(computeQualityScore([missing])).toBe(0);
  });

  it("trust weighting raises score: high-trust fresh > low-trust fresh", () => {
    const highTrust: CategoryStatus = {
      category: "ODDS",
      status: "FRESH",
      bestEvidenceId: "a",
      bestTrustScore: 100,
      ageMs: 60_000,
    };
    const lowTrust: CategoryStatus = {
      category: "ODDS",
      status: "FRESH",
      bestEvidenceId: "b",
      bestTrustScore: 0,
      ageMs: 60_000,
    };
    expect(computeQualityScore([highTrust])).toBeGreaterThan(computeQualityScore([lowTrust]));
  });
});

// ── buildPublishReadinessReport — BRIEF and CONTENT_DRAFT ────────────────

describe("buildPublishReadinessReport — artifact kind variants", () => {
  it("BRIEF with full coverage is PUBLISH_READY", () => {
    const report = buildPublishReadinessReport({
      artifactKind: "BRIEF",
      artifactId: "brief_1",
      evidence: [ev("ODDS", 60_000), ev("TEAM_SCHEDULE", 60_000)],
      now: NOW,
    });
    expect(report.readiness).toBe("PUBLISH_READY");
    expect(report.blockers).toHaveLength(0);
    expect(report.rationale).toContain("BRIEF");
  });

  it("CONTENT_DRAFT with PLATFORM_POLICY is PUBLISH_READY", () => {
    const report = buildPublishReadinessReport({
      artifactKind: "CONTENT_DRAFT",
      artifactId: "draft_1",
      evidence: [ev("PLATFORM_POLICY", 60_000)],
      now: NOW,
    });
    expect(report.readiness).toBe("PUBLISH_READY");
    expect(report.qualityScore).toBeGreaterThan(0);
  });

  it("BRIEF missing TEAM_SCHEDULE is HOLD", () => {
    const report = buildPublishReadinessReport({
      artifactKind: "BRIEF",
      artifactId: "brief_2",
      evidence: [ev("ODDS", 60_000)],
      now: NOW,
    });
    expect(report.readiness).toBe("HOLD");
    expect(report.blockers.some((b) => b.category === "TEAM_SCHEDULE")).toBe(true);
  });

  it("report.generatedAt matches the injected now", () => {
    const report = buildPublishReadinessReport({
      artifactKind: "CONTENT_DRAFT",
      artifactId: "draft_2",
      evidence: [ev("PLATFORM_POLICY", 60_000)],
      now: NOW,
    });
    expect(report.generatedAt).toBe(NOW);
  });
});
