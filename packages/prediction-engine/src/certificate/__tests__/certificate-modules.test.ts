import { describe, it, expect } from "vitest";
import {
  parseDecisionCertificate,
  noBetCertificate,
  mapExclusionToReasons,
  canonicalizeForHash,
  withContentHash,
  DECISION_CERTIFICATE_SCHEMA,
} from "../decision-certificate.js";
import { certificateFromGateCandidate } from "../gate-certificate-bridge.js";
import {
  coverageFor,
  refuseIfEmptyStratum,
  floorStrata,
} from "../stratum-coverage.js";
import {
  evaluateAbstentionHelpers,
  DEFAULT_ABSTENTION,
} from "../selective-abstention.js";
import { brierScore, meanBrier, reliabilityDiagram } from "../proper-scoring.js";
import { kellyFromLowerEndpoint } from "../kelly-lower-endpoint.js";
import { MIN_STRATUM_CALIBRATION } from "../../edge-lab/selective-gate.js";

describe("DecisionCertificate", () => {
  it("exports stable schema id", () => {
    expect(DECISION_CERTIFICATE_SCHEMA).toBe("gse.decision.certificate/v1");
  });

  it("rejects NO_BET without reasons", () => {
    const r = parseDecisionCertificate({
      schemaVersion: "1",
      kind: "NO_BET",
      stratumKey: "MLB|SPREAD|v5.1.0",
      modelVersion: "v5.1.0",
      eventId: "e1",
      market: "SPREAD",
      certifiedAt: "2026-07-27T00:00:00Z",
      summary: "x",
    });
    expect(r.ok).toBe(false);
  });

  it("accepts NO_BET with STALE_ODDS", () => {
    const c = noBetCertificate({
      stratumKey: "MLB|SPREAD|v5.1.0",
      modelVersion: "v5.1.0",
      eventId: "e1",
      market: "SPREAD",
      reasons: ["STALE_ODDS"],
      summary: "Odds older than 6h",
    });
    expect(parseDecisionCertificate(c).ok).toBe(true);
  });

  it("maps Phase C exclusion strings", () => {
    const reasons = mapExclusionToReasons([
      "fresh odds (6h)",
      "q",
      "matching handicap",
    ]);
    expect(reasons).toContain("STALE_ODDS");
    expect(reasons).toContain("PRICE_INTEGRITY_Q");
    expect(reasons).toContain("HANDICAP_MISMATCH");
  });

  it("hash changes when kind changes", async () => {
    const a = noBetCertificate({
      stratumKey: "MLB|SPREAD|v5.1.0",
      modelVersion: "v5.1.0",
      eventId: "e1",
      market: "SPREAD",
      reasons: ["STALE_ODDS"],
      summary: "stale",
    });
    const b = {
      ...a,
      kind: "FIRE" as const,
      noBetReasons: undefined,
      interval: { lo: 0.5, hi: 0.6, method: "ivap" },
    };
    expect(canonicalizeForHash(a)).not.toEqual(canonicalizeForHash(b as typeof a));
    const hashed = await withContentHash(a);
    expect(hashed.contentHash).toBeTruthy();
  });

  it("golden contentHash for fixed STALE_ODDS fixture is locked", async () => {
    // Fixed payload so the hash is reproducible across machines and CI.
    // Do not change certifiedAt / eventId / summary without updating the golden.
    const c = {
      schemaVersion: "1" as const,
      kind: "NO_BET" as const,
      stratumKey: "MLB|SPREAD|v5.1.0",
      modelVersion: "v5.1.0",
      eventId: "golden-evt-1",
      market: "SPREAD",
      certifiedAt: "2026-07-27T12:00:00.000Z",
      noBetReasons: ["STALE_ODDS"] as const,
      summary: "Market quotes older than the 6-hour freshness budget",
    };
    const hashed = await withContentHash(c);
    expect(hashed.contentHash).toBe(
      "eb88a7166b7d2d54d45fc24866175eb69755b86eac2dbb828468f67b5fe860d1",
    );
  });

  it("every known selective-gate exclusion phrase maps to a non-GATE_OTHER reason", () => {
    const known = [
      "fresh odds (6h)",
      "stale odds",
      "q",
      "de-vig",
      "devig",
      "matching handicap",
      "line moved",
      "not placeable",
      "kickoff",
      "provenance",
      "circuit open",
      "provider offline",
      "sample floor",
      "width",
      "lcb",
    ];
    for (const phrase of known) {
      const r = mapExclusionToReasons([phrase]);
      expect(r.some((x) => x !== "GATE_OTHER")).toBe(true);
    }
  });
});

describe("gate-certificate-bridge", () => {
  it("builds NO_BET from exclusions", async () => {
    const cert = await certificateFromGateCandidate(
      {
        eventId: "g1",
        market: "SPREAD",
        stratumKey: "MLB|SPREAD|v5.1.0",
        modelVersion: "v5.1.0",
        admitted: false,
        exclusions: ["fresh odds (stale)", "q"],
        stratumN: 180,
      },
      { hash: true },
    );
    expect(cert.kind).toBe("NO_BET");
    expect(cert.noBetReasons).toContain("STALE_ODDS");
    expect(cert.noBetReasons).toContain("PRICE_INTEGRITY_Q");
    expect(cert.contentHash).toBeTruthy();
  });
});

describe("stratum-coverage", () => {
  it("180 meets floor 100", () => {
    expect(coverageFor("MLB|SPREAD|v5.1.0", 180, 100).meetsFloor).toBe(true);
  });
  it("74 refuses", () => {
    const r = refuseIfEmptyStratum("MLB|MONEYLINE|v5.1.0", 74, 100);
    expect(r.refuse).toBe(true);
    expect(r.reason).toBe("INSUFFICIENT_SAMPLE");
  });
  it("floorStrata filters", () => {
    const f = floorStrata(
      [
        { key: "MLB|SPREAD|v5.1.0", n: 180 },
        { key: "MLB|MONEYLINE|v5.1.0", n: 74 },
      ],
      100,
    );
    expect(f).toHaveLength(1);
  });
});

describe("selective-abstention helpers", () => {
  it("wide interval → NO_BET", () => {
    const r = evaluateAbstentionHelpers({
      interval: { lo: 0.4, hi: 0.7 },
      stratumN: 200,
      cfg: { ...DEFAULT_ABSTENTION, maxWidth: 0.2 },
    });
    expect(r.kind).toBe("NO_BET");
    expect(r.reasons).toContain("NO_BET_WIDTH");
  });
  it("stale odds → NO_BET even if interval tight", () => {
    const r = evaluateAbstentionHelpers({
      interval: { lo: 0.56, hi: 0.6 },
      stratumN: 200,
      staleOdds: true,
    });
    expect(r.kind).toBe("NO_BET");
    expect(r.reasons).toContain("STALE_ODDS");
  });
});

describe("proper-scoring", () => {
  it("perfect Brier is 0", () => {
    expect(brierScore(1, 1)).toBe(0);
    expect(meanBrier([{ p: 0.5, y: 1 }])).toBeCloseTo(0.25);
  });
});

describe("kelly internal", () => {
  it("positive conservative edge is actionable", () => {
    const r = kellyFromLowerEndpoint({
      pLo: 0.56,
      decimalOdds: 1.91,
      fraction: 0.25,
      maxFraction: 0.05,
    });
    expect(r.actionable).toBe(true);
  });
  it("no edge refuses", () => {
    const r = kellyFromLowerEndpoint({ pLo: 0.48, decimalOdds: 1.91 });
    expect(r.actionable).toBe(false);
  });
});

/**
 * Regression tests for three defects found while reviewing this stack against
 * the real gate rather than against the module's own assumptions.
 */
describe("certificate regressions", () => {
  it("accepts an interval endpoint of exactly 0 or 1 — the real gate emits them", () => {
    const certain = parseDecisionCertificate({
      schemaVersion: "1",
      kind: "FIRE",
      stratumKey: "nfl|SPREAD|v5.1.0",
      modelVersion: "v5.1.0",
      eventId: "evt-1",
      market: "SPREAD",
      certifiedAt: new Date().toISOString(),
      summary: "certain on the evidence",
      interval: { lo: 0, hi: 1, method: "ivap" },
    });
    expect(certain.errors).toEqual([]);
    expect(certain.ok).toBe(true);
  });

  it("still rejects an interval outside [0, 1]", () => {
    const bad = parseDecisionCertificate({
      schemaVersion: "1",
      kind: "FIRE",
      stratumKey: "nfl|SPREAD|v5.1.0",
      modelVersion: "v5.1.0",
      eventId: "evt-2",
      market: "SPREAD",
      certifiedAt: new Date().toISOString(),
      summary: "impossible",
      interval: { lo: -0.1, hi: 1.2, method: "ivap" },
    });
    expect(bad.ok).toBe(false);
  });

  it("reliabilityDiagram does not crash on a non-positive bin count", () => {
    expect(() => reliabilityDiagram([{ p: 0.5, y: 1 }], 0)).not.toThrow();
    expect(() => reliabilityDiagram([{ p: 0.5, y: 1 }], -3)).not.toThrow();
    expect(reliabilityDiagram([{ p: 0.5, y: 1 }], 0)).toEqual([]);
  });

  it("reliabilityDiagram still bins normally for a positive bin count", () => {
    const out = reliabilityDiagram(
      [
        { p: 0.05, y: 0 },
        { p: 0.95, y: 1 },
      ],
      10,
    );
    expect(out).toHaveLength(10);
    expect(out[0]!.n).toBe(1);
    expect(out[9]!.n).toBe(1);
  });

  it("the abstention sample floor IS the gate's floor, not a second copy of it", () => {
    expect(DEFAULT_ABSTENTION.minStratumN).toBe(MIN_STRATUM_CALIBRATION);
  });
});
