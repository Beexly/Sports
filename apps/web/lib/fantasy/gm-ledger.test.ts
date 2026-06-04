import { describe, it, expect } from "vitest";
import { buildGmLedger, gmRating, quadrant, type GmDecision } from "./gm-ledger";

const d = (over: Partial<GmDecision>): GmDecision => ({
  id: "x", week: 1, type: "Start/Sit", decision: "d", rationale: "r", infoAtCommit: "i",
  confidence: 60, committedAt: "2026-09-01T00:00:00Z", process: "sound", processReason: "p",
  outcome: "hit", outcomeNote: "o", ...over,
});

describe("gm ledger", () => {
  it("separates process from outcome in the 2x2", () => {
    expect(quadrant(d({ process: "sound", outcome: "hit" })).key).toBe("earned");
    expect(quadrant(d({ process: "sound", outcome: "miss" })).key).toBe("bad-beat");
    expect(quadrant(d({ process: "unsound", outcome: "hit" })).key).toBe("got-lucky");
    expect(quadrant(d({ process: "unsound", outcome: "miss" })).key).toBe("deserved");
    // a 'thin' process still counts as good process (not unsound)
    expect(quadrant(d({ process: "thin", outcome: "miss" })).key).toBe("bad-beat");
  });

  it("rewards good process even when the outcome misses", () => {
    const goodProcessMiss = gmRating([d({ process: "sound", outcome: "miss", confidence: 55 })]);
    const luckyHit = gmRating([d({ process: "unsound", outcome: "hit", confidence: 55 })]);
    // process is half the composite — a sound miss should out-rate a lucky hit
    expect(goodProcessMiss.processScore).toBeGreaterThan(luckyHit.processScore);
  });

  it("calibration is perfect when confidence matches the result", () => {
    const perfect = gmRating([d({ confidence: 100, outcome: "hit" }), d({ confidence: 0, outcome: "miss" })]);
    expect(perfect.calibration).toBe(100);
    const wrong = gmRating([d({ confidence: 100, outcome: "miss" }), d({ confidence: 0, outcome: "hit" })]);
    expect(wrong.calibration).toBeLessThan(perfect.calibration);
  });

  it("produces a composite, a letter grade, and quadrant counts that sum to n", () => {
    const r = gmRating();
    expect(r.composite).toBeGreaterThanOrEqual(0);
    expect(r.composite).toBeLessThanOrEqual(100);
    expect(r.grade).toMatch(/^[A-C][+−]?$/);
    const total = r.counts.earned + r.counts["bad-beat"] + r.counts["got-lucky"] + r.counts.deserved;
    expect(total).toBe(7);
  });

  it("commits a real Merkle root, proves inclusion, and detects tampering", () => {
    const l = buildGmLedger();
    expect(l.publishedRoot).toMatch(/^[0-9a-f]{64}$/); // real sha-256
    expect(l.proof.verified).toBe(true); // inclusion proof checks out
    expect(l.tamper.matches).toBe(false); // rewriting a rationale breaks the root
  });

  it("the Merkle root is deterministic for the same committed ledger", () => {
    expect(buildGmLedger().publishedRoot).toBe(buildGmLedger().publishedRoot);
  });
});
