/**
 * Wire test — microstructure report pure paths (no DB).
 *
 * The report's DB call is behind buildMicrostructureReport; here we verify
 * the two WIRED engine functions behave correctly on the artifact's real
 * row shape, and that the module's refusal states are honest.
 */
import { describe, it, expect } from "vitest";
import { scanKalshiVsBooks } from "@sports/prediction-engine";
import { consensusMarketQ } from "@sports/prediction-engine";

describe("microstructure pair on real-input shapes (wired via lib/ops/microstructure-report)", () => {
  const kalshiRow = { bid: 0.56, ask: 0.57 }; // real artifact mid, in module shape

  it("flags a book too long vs Kalshi when the gap exceeds tau", () => {
    // book prices home at +120 (q=0.452) while Kalshi mid is 0.565 -> gap 0.113
    const res = scanKalshiVsBooks(kalshiRow, [
      { book: "espn_free", homeAmerican: 120, awayAmerican: -140 },
    ]);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.qKalshiHome).toBeCloseTo(0.565, 3);
      expect(res.flags.length).toBeGreaterThan(0);
      expect(res.flags[0].side).toBe("home");
      expect(res.priced).toBe(false);
    }
  });

  it("refuses with no_books when the DB returned zero H2H rows", () => {
    const res = scanKalshiVsBooks(kalshiRow, []);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.refuse).toBe("no_books");
  });

  it("refuses on a wide Kalshi spread instead of trusting it", () => {
    const res = scanKalshiVsBooks({ bid: 0.3, ask: 0.55 }, [
      { book: "espn_free", homeAmerican: -110, awayAmerican: -110 },
    ]);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.refuse).toBe("wide_spread");
  });

  it("consensus q: logit-weighted kalshi+book mean, labeled sources", () => {
    const q = consensusMarketQ([
      { id: "kalshi_research_mid", q: 0.565, weight: 1 },
      { id: "book_consensus_free", q: 0.452, weight: 1 },
    ]);
    expect(q).not.toBeNull();
    // logit mean of 0.565 and 0.452 should sit between them, nearer the middle
    expect(q!.q).toBeGreaterThan(0.48);
    expect(q!.q).toBeLessThan(0.53);
    expect(q!.sourceIds).toEqual(["kalshi_research_mid", "book_consensus_free"]);
  });

  it("consensus q fails closed when every weight is zero", () => {
    expect(consensusMarketQ([{ id: "x", q: 0.5, weight: 0 }])).toBeNull();
  });
});
