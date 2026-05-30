/**
 * Targeted coverage for readinessFromCategories branches not reached by
 * source-intelligence.test.ts.
 *
 * The primary test covers: PUBLISH_READY (all fresh + high trust), HOLD via
 * missing PICK category, BLOCKED via missing PROMOTION category, REVIEW via
 * low trust. It does NOT test the STALE, AGING, or CONTRADICTORY status
 * paths in readinessFromCategories.
 *
 * This file covers:
 *   - STALE category → HOLD readiness (anyStale branch)
 *   - AGING category → REVIEW readiness (anyAging branch)
 *   - Non-hard CONTRADICTORY (ODDS vs ODDS) → REVIEW (anyContradictory, not
 *     hardContradictions)
 *   - Hard CONTRADICTORY (PLATFORM_POLICY vs PLATFORM_POLICY) on non-PROMOTION
 *     → HOLD (hardContradictions && artifactKind !== "PROMOTION")
 *   - Hard CONTRADICTORY on PROMOTION → BLOCKED (hardContradictions &&
 *     artifactKind === "PROMOTION")
 *   - Blocker codes: STALE_CATEGORY, AGING_CATEGORY, CONTRADICTORY_CATEGORY
 */

import { describe, it, expect } from "vitest";
import {
  summarizeCategories,
  readinessFromCategories,
  FRESHNESS_BUDGETS,
  type SourceEvidence,
} from "@/lib/source-intelligence";

const NOW = new Date("2026-05-22T18:00:00.000Z");

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

// Convenience: 1 ms past hard TTL → STALE
const ODDS_STALE_MS = FRESHNESS_BUDGETS.ODDS.hardTtlMs + 1;
// Between soft and hard TTL → AGING
const ODDS_AGING_MS = FRESHNESS_BUDGETS.ODDS.softTtlMs + 60_000;

// ============================================================
// STALE → HOLD
// ============================================================

describe("readinessFromCategories — STALE category yields HOLD for PICK", () => {
  it("returns HOLD when ODDS is stale and other categories are fresh", () => {
    const cats = summarizeCategories(
      "PICK",
      [
        ev("ODDS", ODDS_STALE_MS),
        ev("TEAM_SCHEDULE", 60_000),
        ev("MODEL_SNAPSHOT", 60_000),
      ],
      NOW
    );
    const { readiness, blockers } = readinessFromCategories("PICK", cats);
    expect(readiness).toBe("HOLD");
    expect(blockers.some((b) => b.code === "STALE_CATEGORY")).toBe(true);
  });

  it("STALE_CATEGORY blocker includes the category name in the message", () => {
    const cats = summarizeCategories(
      "PICK",
      [
        ev("ODDS", ODDS_STALE_MS),
        ev("TEAM_SCHEDULE", 60_000),
        ev("MODEL_SNAPSHOT", 60_000),
      ],
      NOW
    );
    const { blockers } = readinessFromCategories("PICK", cats);
    const staleBlocker = blockers.find((b) => b.code === "STALE_CATEGORY");
    expect(staleBlocker?.message).toContain("ODDS");
    expect(staleBlocker?.message).toContain("stale");
  });
});

// ============================================================
// AGING → REVIEW
// ============================================================

describe("readinessFromCategories — AGING category yields REVIEW for PICK", () => {
  it("returns REVIEW when ODDS is aging and other categories are fresh", () => {
    const cats = summarizeCategories(
      "PICK",
      [
        ev("ODDS", ODDS_AGING_MS),
        ev("TEAM_SCHEDULE", 60_000),
        ev("MODEL_SNAPSHOT", 60_000),
      ],
      NOW
    );
    const { readiness, blockers } = readinessFromCategories("PICK", cats);
    expect(readiness).toBe("REVIEW");
    expect(blockers.some((b) => b.code === "AGING_CATEGORY")).toBe(true);
  });

  it("AGING_CATEGORY blocker includes the category name in the message", () => {
    const cats = summarizeCategories(
      "PICK",
      [
        ev("ODDS", ODDS_AGING_MS),
        ev("TEAM_SCHEDULE", 60_000),
        ev("MODEL_SNAPSHOT", 60_000),
      ],
      NOW
    );
    const { blockers } = readinessFromCategories("PICK", cats);
    const agingBlocker = blockers.find((b) => b.code === "AGING_CATEGORY");
    expect(agingBlocker?.message).toContain("ODDS");
    expect(agingBlocker?.message).toContain("aging");
  });
});

// ============================================================
// Non-hard CONTRADICTORY → REVIEW
// (ODDS is NOT in HARD_CONTRADICTION_CATEGORIES)
// ============================================================

describe("readinessFromCategories — non-hard CONTRADICTORY yields REVIEW", () => {
  it("returns REVIEW when two ODDS evidences contradict each other", () => {
    const oddsFresh = ev("ODDS", 5 * 60_000, { sourceId: "odds-a" });
    const oddsContradicts = ev("ODDS", 6 * 60_000, {
      sourceId: "odds-b",
      contradicts: ["odds-a"],
    });
    const cats = summarizeCategories(
      "PICK",
      [oddsFresh, oddsContradicts, ev("TEAM_SCHEDULE", 60_000), ev("MODEL_SNAPSHOT", 60_000)],
      NOW
    );
    const { readiness, blockers } = readinessFromCategories("PICK", cats);
    expect(readiness).toBe("REVIEW");
    expect(blockers.some((b) => b.code === "CONTRADICTORY_CATEGORY")).toBe(true);
  });

  it("CONTRADICTORY_CATEGORY blocker category is ODDS", () => {
    const cats = summarizeCategories(
      "PICK",
      [
        ev("ODDS", 5 * 60_000, { sourceId: "odds-x" }),
        ev("ODDS", 6 * 60_000, { sourceId: "odds-y", contradicts: ["odds-x"] }),
        ev("TEAM_SCHEDULE", 60_000),
        ev("MODEL_SNAPSHOT", 60_000),
      ],
      NOW
    );
    const { blockers } = readinessFromCategories("PICK", cats);
    const contradictoryBlocker = blockers.find((b) => b.code === "CONTRADICTORY_CATEGORY");
    expect(contradictoryBlocker?.category).toBe("ODDS");
  });
});

// ============================================================
// Hard CONTRADICTORY (PLATFORM_POLICY) on CONTENT_DRAFT → HOLD
// ============================================================

describe("readinessFromCategories — hard CONTRADICTORY yields HOLD for non-PROMOTION", () => {
  it("returns HOLD for CONTENT_DRAFT when PLATFORM_POLICY evidences contradict", () => {
    const policyA = ev("PLATFORM_POLICY", 60_000, { sourceId: "policy-a" });
    const policyB = ev("PLATFORM_POLICY", 61_000, {
      sourceId: "policy-b",
      contradicts: ["policy-a"],
    });
    const cats = summarizeCategories("CONTENT_DRAFT", [policyA, policyB], NOW);
    const { readiness } = readinessFromCategories("CONTENT_DRAFT", cats);
    expect(readiness).toBe("HOLD");
  });
});

// ============================================================
// Hard CONTRADICTORY on PROMOTION → BLOCKED
// ============================================================

describe("readinessFromCategories — hard CONTRADICTORY yields BLOCKED for PROMOTION", () => {
  it("returns BLOCKED for PROMOTION when PLATFORM_POLICY evidences contradict", () => {
    const policyA = ev("PLATFORM_POLICY", 60_000, { sourceId: "pol-a" });
    const policyB = ev("PLATFORM_POLICY", 61_000, {
      sourceId: "pol-b",
      contradicts: ["pol-a"],
    });
    const promoTerms = ev("BOOK_PROMO_TERMS", 60_000);
    const cats = summarizeCategories("PROMOTION", [promoTerms, policyA, policyB], NOW);
    const { readiness } = readinessFromCategories("PROMOTION", cats);
    expect(readiness).toBe("BLOCKED");
  });

  it("returns BLOCKED for PROMOTION when BOOK_PROMO_TERMS evidences contradict", () => {
    const termsA = ev("BOOK_PROMO_TERMS", 60_000, { sourceId: "terms-a" });
    const termsB = ev("BOOK_PROMO_TERMS", 61_000, {
      sourceId: "terms-b",
      contradicts: ["terms-a"],
    });
    const policy = ev("PLATFORM_POLICY", 60_000);
    const cats = summarizeCategories("PROMOTION", [termsA, termsB, policy], NOW);
    const { readiness } = readinessFromCategories("PROMOTION", cats);
    expect(readiness).toBe("BLOCKED");
  });
});
