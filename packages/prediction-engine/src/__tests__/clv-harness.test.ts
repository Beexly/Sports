import { describe, expect, it } from "vitest";
import {
  buildSyntheticOpen,
  clvFromEntry,
  formatSyntheticOpenWarning,
  requiredArchiveColumns,
  type ClvEntry,
} from "../clv-harness.js";

/**
 * Every expected value below was computed BY HAND, not by running the harness.
 * The harness delegates the arithmetic to clv.ts primitives (computeSpreadClv,
 * computeTotalClv, computeMoneylineClv) — these tests would catch a wiring bug,
 * a sign flip, or a units mixup. Controls exist so no assertion can pass because
 * its input was too thin to produce anything.
 */

describe("clv-harness — known answers (hand-computed)", () => {
  it("spread CLV in points: locked home -3, closed home -4 is +1 BEAT (§Wave4 example)", () => {
    const r = clvFromEntry({
      market: "SPREAD",
      openHomeLine: -3,
      closeHomeLine: -4,
      side: "HOME",
    } satisfies ClvEntry);
    // Hand check: computeSpreadClv(pick=-3, close=-4, HOME) = -3 - (-4) = +1.
    expect(r.points!.clvPoints).toBe(1);
    expect(r.points!.verdict).toBe("BEAT_CLOSE");
  });

  it("spread control: AWAY side mirrors the sign (away -3 -> close away -2 = -1 LOST)", () => {
    // Away -3 means home +3. Close away -2 means home +2.
    // computeSpreadClv(+3, +2, AWAY) = close - pick = 2 - 3 = -1.
    const r = clvFromEntry({
      market: "SPREAD",
      openHomeLine: 3,
      closeHomeLine: 2,
      side: "AWAY",
    } satisfies ClvEntry);
    expect(r.points!.clvPoints).toBe(-1);
    expect(r.points!.verdict).toBe("LOST_TO_CLOSE");
  });

  it("total CLV: OVER locked 44, closed 46 → close - pick = +2 BEAT; UNDER mirrored", () => {
    const over = clvFromEntry({ market: "TOTAL", openTotal: 44, closeTotal: 46, side: "OVER" } satisfies ClvEntry);
    // Hand check: computeTotalClv(44, 46, OVER) = 46 - 44 = +2.
    expect(over.points!.clvPoints).toBe(2);
    expect(over.points!.verdict).toBe("BEAT_CLOSE");

    const under = clvFromEntry({ market: "TOTAL", openTotal: 44, closeTotal: 46, side: "UNDER" } satisfies ClvEntry);
    // Hand check: computeTotalClv(44, 46, UNDER) = 44 - 46 = -2.
    expect(under.points!.clvPoints).toBe(-2);
    expect(under.points!.verdict).toBe("LOST_TO_CLOSE");
  });

  it("moneyline CLV in probability: locked -150, closed -200 is +0.1 BEAT", () => {
    // Hand check: implied(-150) = 150/250 = 0.6; implied(-200) = 200/300 = 0.666666...
    // clvProbability = close - pick = 0.666666... - 0.6 = 0.066666... → rounds to 0.0667.
    const r = clvFromEntry({
      market: "MONEYLINE",
      openPrice: -150,
      closePrice: -200,
      side: "HOME",
    } satisfies ClvEntry);
    expect(r.probability!.clvProbability).toBeCloseTo(0.0667, 4);
    expect(r.probability!.verdict).toBe("BEAT_CLOSE");
  });

  it("moneyline underdog steam: locked +200, closed +150 is +0.0667 BEAT", () => {
    // Hand check: implied(+200) = 100/(200+100) = 0.333333; implied(+150) =
    // 100/(150+100) = 0.4. clv = closeImplied - pickImplied = 0.4 - 0.33333 =
    // +0.0667. The market steamed TOWARD this side after entry: the locked
    // price implied a LOWER win prob than the close, i.e. a longer payout —
    // you beat the close. (First draft of this test misapplied the favourite
    // formula 150/250 to +150 and expected 0.2667; the assertion below is the
    // corrected hand value.)
    const r = clvFromEntry({
      market: "MONEYLINE",
      openPrice: 200,
      closePrice: 150,
      side: "AWAY",
    } satisfies ClvEntry);
    expect(r.probability!.clvProbability).toBeCloseTo(0.0667, 4);
    expect(r.probability!.verdict).toBe("BEAT_CLOSE");
  });

  it("CONTROL: a no-movement entry MATCHES the close on every market, not BEAT", () => {
    const s = clvFromEntry({ market: "SPREAD", openHomeLine: -3, closeHomeLine: -3, side: "HOME" } satisfies ClvEntry);
    expect(s.points!.verdict).toBe("MATCHED_CLOSE");
    const t = clvFromEntry({ market: "TOTAL", openTotal: 47, closeTotal: 47, side: "OVER" } satisfies ClvEntry);
    expect(t.points!.verdict).toBe("MATCHED_CLOSE");
    const m = clvFromEntry({ market: "MONEYLINE", openPrice: -120, closePrice: -120, side: "HOME" } satisfies ClvEntry);
    expect(m.probability!.verdict).toBe("MATCHED_CLOSE");
    if (!s.points || !t.points || !m.probability) throw new Error("control inputs too thin to produce results");
  });

  it("CONTROL: missing the close makes the entry UNMEASURABLE, never a fabricated 0", () => {
    const r = clvFromEntry({ market: "SPREAD", openHomeLine: -3, closeHomeLine: null, side: "HOME" } satisfies ClvEntry);
    expect(r.unmeasurable).toBe(true);
    expect(r.points).toBeNull();
    expect(r.probability).toBeNull();
  });

  it("a real close present means the entry is measurable and SYNTHETIC flag is independent of measurement", () => {
    const synth = clvFromEntry(
      { market: "SPREAD", openHomeLine: -3, closeHomeLine: -4, side: "HOME" } satisfies ClvEntry,
      { syntheticOpen: true },
    );
    expect(synth.unmeasurable).toBe(false);
    expect(synth.syntheticOpen).toBe(true);
    expect(synth.points!.clvPoints).toBe(1);
  });

  it("synthetic-open generator is deterministic under a fixed seed and honours jitter bounds", () => {
    const close = -4;
    const a = buildSyntheticOpen(close, 1.5, { seed: 20260904 });
    const b = buildSyntheticOpen(close, 1.5, { seed: 20260904 });
    expect(a).toBe(b);
    // Bounds: open must lie within close ± jitter (half-point grid).
    const c = buildSyntheticOpen(close, 1.5, { seed: 7 });
    expect(Math.abs(c - close)).toBeLessThanOrEqual(1.5 + 1e-9);
    // The generated open must be on the half-point grid.
    expect(Math.round(c * 2) / 2).toBe(c);
  });
});

describe("clv-harness — labelling and archive contract", () => {
  it("the SYNTHETIC OPEN warning string is exact — it must never be softened", () => {
    expect(formatSyntheticOpenWarning()).toContain("SYNTHETIC OPEN — NOT A REAL CLV RESULT");
  });

  it("required archive columns are documented and machine-readable", () => {
    const cols = requiredArchiveColumns();
    expect(cols.length).toBeGreaterThan(0);
    for (const c of cols) {
      expect(c.name.length).toBeGreaterThan(0);
      expect(c.required === true || c.required === false).toBe(true);
    }
    // The harness cannot run without the close and the side.
    expect(cols.find((c) => c.name === "close_line")!.required).toBe(true);
    expect(cols.find((c) => c.name === "side")!.required).toBe(true);
  });
});
