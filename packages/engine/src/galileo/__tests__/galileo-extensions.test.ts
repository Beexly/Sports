import { describe, it, expect } from "vitest";
import { scoreNarrativeGravity, classifyMoveDriver } from "../narrative-gravity.js";
import { bookmakerFingerprint } from "../bookmaker-dna.js";
import { roleDeltaScore, siblingDivergence } from "../role-shock-topology.js";
import { compareToConsensusLadder, compareToRoleVolatility } from "../alt-line-geometry.js";
import { summarizeAbsorption } from "../absorption-half-life.js";
import { studyShock, type MarketObservation } from "../../market-physics/shock-absorption.js";
import { routeExpression } from "../expression-router.js";
import { evaluateGalileoCandidate, galileoRecordComplete, type GalileoEdgeCandidate } from "../edge-ledger.js";
import type { BookLeadLagProfile } from "../../market-physics/book-dna.js";
import type { PlayerRoleState } from "../../market-physics/role-state.js";

describe("narrative gravity", () => {
  it("scores attention and labels an attention-driven move", () => {
    const g = scoreNarrativeGravity({ starPlayerBias: 0.9, primetimeAttention: 0.8, injuryPanic: 0.7, fantasyAttention: 0.6, socialVelocity: 0.5 });
    expect(g.index).toBeGreaterThan(0.3);
    expect(g.topDrivers[0]!.signal).toBeDefined();
    const v = classifyMoveDriver({ observedMoveNorm: 0.8, narrative: g, fleshStateChangeNorm: 0.1 });
    expect(v.verdict).toBe("attention_driven");
  });
  it("returns insufficient_data under low coverage", () => {
    const g = scoreNarrativeGravity({ starPlayerBias: 0.9 });
    expect(classifyMoveDriver({ observedMoveNorm: 0.5, narrative: g, fleshStateChangeNorm: 0.1 }).verdict).toBe("insufficient_data");
  });
});

describe("bookmaker fingerprint", () => {
  it("weights a leader high and exposes prop lag", () => {
    const side: BookLeadLagProfile = { book: "b", market: "spread", samples: 5, leadFreq: 0.8, followFreq: 0.2, medianLagMs: 30_000, missRate: 0 };
    const prop: BookLeadLagProfile = { book: "b", market: "player_rush_yds", samples: 5, leadFreq: 0, followFreq: 0.6, medianLagMs: 300_000, missRate: 0.4 };
    const fp = bookmakerFingerprint({ book: "b", sideProfile: side, propProfile: prop });
    expect(fp.firstMoverRate).toBe(0.8);
    expect(fp.propLagScore).toBeCloseTo(4.5, 1); // (300k-30k)/60k min
    expect(fp.bookConfidenceWeight).toBeGreaterThan(0.5);
  });
});

describe("role shock topology", () => {
  const base: PlayerRoleState = {
    player: "P", team: "KC", position: "RB", isBackup: true, projectedSnapShare: 0.3, recentSnapShare: 0.7,
    routeShare: 0.4, targetShare: 0.2, carryShare: 0.5, redZoneShare: 0.3, thirdDownRole: 0.6, twoMinuteRole: 0.5,
    backupAvailable: true, starterInjuryStatus: "out", olInjuryContext: 0, defenseMatchupContext: 0.5, spreadShift: 0,
    teamTotalContext: 22, teammateWr1Out: false, weatherContext: 0,
  };
  it("roleDeltaScore rises with snap divergence", () => {
    expect(roleDeltaScore(base)).toBeGreaterThan(0.15);
  });
  it("detects sibling divergence (receptions move, yards stale)", () => {
    expect(siblingDivergence({ receptionsMove: 0.4, receivingYardsMove: 0.02 }).staleSibling).toBe("receiving_yards");
    expect(siblingDivergence({ receptionsMove: 0.4, receivingYardsMove: 0.4 }).verdict).toBe("coherent");
  });
});

describe("alt-line geometry", () => {
  it("flags a book ladder rung diverging from consensus", () => {
    const book = [{ point: 60, overImplied: 0.5 }, { point: 80, overImplied: 0.05 }];
    const consensus = [{ point: 60, overImplied: 0.5 }, { point: 80, overImplied: 0.12 }];
    const d = compareToConsensusLadder(book, consensus, 0.03);
    expect(d.some((x) => x.point === 80 && x.deltaImplied < 0)).toBe(true);
  });
  it("flags a tail too thin for a volatile role", () => {
    const ladder = [{ point: 40, overImplied: 0.6 }, { point: 55, overImplied: 0.3 }, { point: 70, overImplied: 0.02 }];
    const v = compareToRoleVolatility(ladder, 0.9);
    expect(v.verdict).toBe("tail_too_thin_for_role");
  });
});

describe("absorption summary", () => {
  it("converts a shock study to minutes + stale-window candidates", () => {
    const obs: MarketObservation[] = [
      { market: "total:OVER", book: "fast", point: 45, timestamp: "2024-09-08T11:55:00Z" },
      { market: "total:OVER", book: "slow", point: 45, timestamp: "2024-09-08T11:55:00Z" },
      { market: "total:OVER", book: "fast", point: 42, timestamp: "2024-09-08T12:05:00Z" },
      { market: "total:OVER", book: "slow", point: 45, timestamp: "2024-09-08T12:25:00Z" },
    ];
    const r = studyShock({ shock: { type: "qb_status", timestamp: "2024-09-08T12:00:00Z" }, decisionTime: "2024-09-08T12:30:00Z", observations: obs });
    const s = summarizeAbsorption(r);
    expect(s.markets[0]!.absorptionHalfLifeMinutes).toBe(5);
    expect(s.staleWindowCandidates.length).toBeGreaterThan(0);
  });
});

describe("galileo expression router (superset verbs)", () => {
  const base = { ledgerStatus: "SHADOW_READY" as const, clv: "not_run" as const, settlement: "not_run" as const, liquidityChecked: false, timestamp: "t" };
  it("routes new microstructure + data-quality verbs", () => {
    expect(routeExpression({ ...base, dataQualityFail: true }).expression).toBe("DATA_QUALITY_FAIL");
    expect(routeExpression({ ...base, residualDriver: "stale_book" }).expression).toBe("STALE_BOOK_CANDIDATE");
    expect(routeExpression({ ...base, residualDriver: "alt_line" }).expression).toBe("ALT_LINE_CANDIDATE");
    expect(routeExpression({ ...base, residualDriver: "role_shock" }).expression).toBe("ROLE_SHOCK_CANDIDATE");
    expect(routeExpression({ ...base, ledgerStatus: "REJECTED" }).expression).toBe("REJECTED_FAKE_EDGE");
    expect(routeExpression({ ...base, ledgerStatus: "ACTIVE", settlement: "pass", liquidityChecked: true, isBestNumber: true }).expression).toBe("LOCK_NOW");
    expect(routeExpression({ ...base, clv: "pass" }).expression).toBe("CLV_ONLY");
  });
  it("labels the edge type and the evidence gap", () => {
    const o = routeExpression({ ...base, ledgerStatus: "ACTIVE", settlement: "pass", liquidityChecked: true, isBestNumber: true });
    expect(o.edgeType).toBe("settlement");
    expect(o.evidenceMissing).toBe("none");
  });
});

describe("galileo edge ledger", () => {
  function gc(over: Partial<GalileoEdgeCandidate> = {}): GalileoEdgeCandidate {
    return {
      candidateId: "c1", hypothesis: "h", structuralReason: "stale receiver surface after QB downgrade",
      market: "player_reception_yds", dataWindow: "2025", sampleSize: 150, seasonsCovered: 3,
      clv: "pass", settlement: "pass", oos: "pass", fdr: "pass", liquidityNote: "ok", liquidityChecked: true,
      dataQualityClean: true, futureContamination: false, discoveredBy: "incoherence-residual",
      marketStateTrigger: "QB line dropped, receptions stale", ...over,
    };
  }
  it("evaluates a galileo candidate through the base discipline and checks provenance", () => {
    expect(evaluateGalileoCandidate(gc()).maxStatus).toBe("ACTIVE");
    expect(galileoRecordComplete(gc())).toBe(true);
    expect(galileoRecordComplete(gc({ discoveredBy: "" }))).toBe(false);
    expect(evaluateGalileoCandidate(gc({ settlement: "not_run" })).maxStatus).not.toBe("ACTIVE");
  });
});
