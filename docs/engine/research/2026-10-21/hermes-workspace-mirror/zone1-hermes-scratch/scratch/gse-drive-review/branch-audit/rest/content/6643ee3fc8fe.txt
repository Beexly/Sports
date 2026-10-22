import { describe, expect, it } from "vitest";
import type {
  EvidenceActivationStatus,
  FactorBreakdown,
  FactorDetail,
  SignalCategory,
} from "@sports/types";

import { extractPickSources } from "../pick-sources.js";

function factor(
  name: string,
  evidence?: {
    sourceName?: string;
    activationStatus?: EvidenceActivationStatus;
    freshnessStatus?: "FRESH" | "AGING" | "STALE" | "MISSING";
    sourceCategory?: SignalCategory;
  } | null
): FactorDetail {
  if (evidence === null || evidence === undefined) {
    return {
      name,
      impact: "neutral",
      description: name,
      weight: 1,
    };
  }
  return {
    name,
    impact: "neutral",
    description: name,
    weight: 1,
    evidence: {
      sourceCategory: (evidence.sourceCategory ?? "MARKET_PRICE") as SignalCategory,
      sourceName: evidence.sourceName ?? "default-source",
      freshnessStatus: evidence.freshnessStatus ?? "FRESH",
      trustLevel: 80,
      activationStatus: (evidence.activationStatus ?? "ACTIVE") as EvidenceActivationStatus,
      whyUsedOrBlocked: "test",
    },
  };
}

function pick(factors: FactorDetail[]): { factorBreakdown: FactorBreakdown } {
  const breakdown: FactorBreakdown = {
    consensusScore: 0,
    marketDepthScore: 0,
    edgeScore: 0,
    lineMovementScore: 0,
    volatilityPenalty: 0,
    factors,
  };
  return { factorBreakdown: breakdown };
}

describe("extractPickSources", () => {
  it("returns an empty list when there are no factors", () => {
    expect(extractPickSources(pick([]))).toEqual([]);
  });

  it("returns the source name when a single ACTIVE factor has evidence", () => {
    const out = extractPickSources(
      pick([factor("market", { sourceName: "the-odds-api" })])
    );
    expect(out).toEqual(["the-odds-api"]);
  });

  it("deduplicates repeated source names while preserving first-seen order", () => {
    const out = extractPickSources(
      pick([
        factor("market", { sourceName: "the-odds-api" }),
        factor("line-movement", { sourceName: "the-odds-api" }),
        factor("schedule", { sourceName: "schedule-internal" }),
        factor("market-depth", { sourceName: "the-odds-api" }),
      ])
    );
    expect(out).toEqual(["the-odds-api", "schedule-internal"]);
  });

  it("excludes factors with SHADOW_ONLY or BLOCKED_* activation status", () => {
    const out = extractPickSources(
      pick([
        factor("a", { sourceName: "live-source", activationStatus: "ACTIVE" }),
        factor("b", { sourceName: "shadow-source", activationStatus: "SHADOW_ONLY" }),
        factor("c", { sourceName: "blocked-1", activationStatus: "BLOCKED_MISSING_SOURCE" }),
        factor("d", { sourceName: "blocked-2", activationStatus: "BLOCKED_STALE" }),
        factor("e", { sourceName: "blocked-3", activationStatus: "BLOCKED_LOW_TRUST" }),
        factor("f", { sourceName: "blocked-4", activationStatus: "BLOCKED_SMALL_SAMPLE" }),
      ])
    );
    expect(out).toEqual(["live-source"]);
  });

  it("excludes factors with no evidence object (no throw)", () => {
    const out = extractPickSources(
      pick([
        factor("naked", null),
        factor("with-evidence", { sourceName: "real-source" }),
      ])
    );
    expect(out).toEqual(["real-source"]);
  });

  it("excludes factors whose evidence is MISSING freshness even if ACTIVE", () => {
    const out = extractPickSources(
      pick([
        factor("stale-but-active", {
          sourceName: "missing-source",
          freshnessStatus: "MISSING",
          activationStatus: "ACTIVE",
        }),
        factor("real", { sourceName: "real-source" }),
      ])
    );
    expect(out).toEqual(["real-source"]);
  });

  it("returns a frozen array", () => {
    const out = extractPickSources(
      pick([factor("a", { sourceName: "x" })])
    );
    expect(Object.isFrozen(out)).toBe(true);
  });

  it("treats empty / undefined sourceName as no source", () => {
    const out = extractPickSources(
      pick([
        factor("blank", { sourceName: "" }),
        factor("real", { sourceName: "real-source" }),
      ])
    );
    expect(out).toEqual(["real-source"]);
  });
});
