/**
 * Tests for the verifiable publication coin (ADR-009).
 *
 * Frozen vectors pin the exact draw and commitment for a fixed seed so any
 * future change to the HMAC context, byte mapping, or hash silently breaking
 * historical audit trails fails loudly here instead.
 */
import { describe, expect, it } from "vitest";
import {
  CANDIDATE_PI,
  EPSILON_BASELINE,
  commitSeed,
  drawPublicationCoin,
  verifyEpoch,
} from "../publication-coin";

const SEED = "ab".repeat(32);

describe("frozen vectors (audit-trail stability)", () => {
  it("reproduces the committed draw for a fixed seed and date, forever", () => {
    const draw = drawPublicationCoin(SEED, "2026-09-01");
    expect(draw.u).toBeCloseTo(0.490249160931, 10);
    expect(draw.publishedCandidate).toBe(true); // 0.4902 >= 0.15
    expect(draw.pi).toBe(CANDIDATE_PI);
  });

  it("reproduces the epoch commitment for a fixed seed, forever", () => {
    expect(commitSeed(SEED, "2026-09")).toBe(
      "27eb76be9964701650b8fbaf7093d1919d65b661d4b847512fa62630dc099acb"
    );
  });
});

describe("protocol constants are the ADR-009 decisions", () => {
  it("epsilon is 0.15 and pi is its complement", () => {
    expect(EPSILON_BASELINE).toBe(0.15);
    expect(CANDIDATE_PI).toBe(0.85);
  });
});

describe("determinism and distribution", () => {
  it("same inputs always give the same draw; different dates differ", () => {
    const a = drawPublicationCoin(SEED, "2026-09-02");
    const b = drawPublicationCoin(SEED, "2026-09-02");
    const c = drawPublicationCoin(SEED, "2026-09-03");
    expect(a).toEqual(b);
    expect(a.u).not.toBe(c.u);
  });

  it("baseline days occur at roughly the epsilon rate over many dates", () => {
    let baseline = 0;
    let total = 0;
    for (let year = 2026; year <= 2031; year++) {
      for (let month = 1; month <= 12; month++) {
        for (let day = 1; day <= 28; day++) {
          const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          if (!drawPublicationCoin(SEED, date).publishedCandidate) baseline++;
          total++;
        }
      }
    }
    expect(total).toBe(6 * 12 * 28);
    const rate = baseline / total;
    expect(Math.abs(rate - EPSILON_BASELINE)).toBeLessThan(0.02);
  });
});

describe("third-party audit", () => {
  const epoch = "2026-09";
  const commitment = commitSeed(SEED, epoch);
  const record = ["2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04"].map(
    (date) => ({
      date,
      publishedCandidate: drawPublicationCoin(SEED, date).publishedCandidate,
    })
  );

  it("passes on an honest record", () => {
    const result = verifyEpoch(SEED, epoch, commitment, record);
    expect(result.ok).toBe(true);
    expect(result.problems).toEqual([]);
  });

  it("catches a single flipped arm", () => {
    const tampered = record.map((d, i) =>
      i === 2 ? { ...d, publishedCandidate: !d.publishedCandidate } : d
    );
    const result = verifyEpoch(SEED, epoch, commitment, tampered);
    expect(result.ok).toBe(false);
    expect(result.problems.some((p) => p.includes("2026-09-03"))).toBe(true);
  });

  it("catches a swapped seed via the commitment", () => {
    const otherSeed = "cd".repeat(32);
    const result = verifyEpoch(otherSeed, epoch, commitment, []);
    expect(result.ok).toBe(false);
    expect(result.problems[0]).toContain("commitment mismatch");
  });
});

describe("input validation fails closed", () => {
  it("rejects malformed seeds, dates, and epochs", () => {
    expect(() => drawPublicationCoin("deadbeef", "2026-09-01")).toThrow(RangeError);
    expect(() => drawPublicationCoin(SEED, "09/01/2026")).toThrow(RangeError);
    expect(() => commitSeed(SEED, "September 2026")).toThrow(RangeError);
    expect(() => drawPublicationCoin(SEED.toUpperCase(), "2026-09-01")).toThrow(
      RangeError
    );
  });
});
