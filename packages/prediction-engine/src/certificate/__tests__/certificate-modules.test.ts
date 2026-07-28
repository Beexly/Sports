import { describe, it, expect } from "vitest";
import {
  parseDecisionCertificate,
  noBetCertificate,
  mapExclusionToReasons,
  canonicalizeForHash,
  withContentHash,
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
import { brierScore, meanBrier } from "../proper-scoring.js";
import { kellyFromLowerEndpoint } from "../kelly-lower-endpoint.js";

describe("DecisionCertificate", () => {
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
