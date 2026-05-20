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
