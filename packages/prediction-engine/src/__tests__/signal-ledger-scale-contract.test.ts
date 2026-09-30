/**
 * WHY composeLedger has zero production callers — the measured reason, pinned.
 *
 * THIS IS NOT A PROPOSAL TO WIRE IT. This is the evidence that wiring it into
 * the published surface TODAY would emit a number that is an artifact of unit
 * choice rather than of player quality. The composer is correct; its input
 * contract is not met by the data actually in `signals`.
 *
 * The composer's own contract (composite-score.ts:13-14): "value is each
 * signal's directional reading on a SHARED scale (e.g. z-score or -1..1)".
 * `score` is the effective-weighted MEAN of those values (composite-score.ts:78),
 * so a row whose value is measured in a bigger unit silently outvotes every
 * row measured in a smaller one — the mean is dominated by unit, not by merit.
 *
 * The `signals` writer stores the source column VERBATIM in `value`
 * (apps/web/lib/ops/signal-ledger-writer.ts:20-22: "value is the source column
 * verbatim, and valueRaw keeps it again so a normalized reading can never
 * quietly become the record"). Measured live in prod (read-only, 2026-09-30):
 *
 *   key                    n        vmin     vmax    vavg   weight confidence
 *   pgs.fantasy_ppr     35513     -5.740   57.900   8.397   1.0      1.0
 *   pgs.passing_epa      4189    -35.565   33.189   0.947   1.0      1.0
 *   ngs.cpoe               661    -25.420   25.030   0.282   1.0      1.0
 *   injury.availability  3068     -1.000    0.000  -0.502   1.0      1.0
 *
 * So the stored values span ~58 points of PPR and ~33 of EPA against ~1 point of
 * availability, and EVERY row carries the identical weight=1.0 / confidence=1.0
 * (the tuner that was supposed to differentiate them — tune-signal-weights —
 * has no production caller either). The blend is therefore decided by `key`,
 * not by player.
 *
 * LAWS OBSERVED:
 * - Pure and db-free: rows are literals captured from the read-only query above.
 *   This test asserts on a pasted snapshot so it can never drift with prod.
 * - No test is weakened to make this pass. These assertions FAIL if the
 *   composer's contract is ever loosened to accept raw source units.
 * - No production code is touched by this file.
 */
import { describe, it, expect } from "vitest";
import { composeLedger, type LedgerSignalRow } from "../signal-ledger.js";

const NOW = "2026-09-30T12:00:00.000Z";
const AT = "2026-09-28T00:00:00.000Z";
const row = (key: string, value: number): LedgerSignalRow => ({
  key,
  value,
  weight: 1,
  confidence: 1,
  capturedAt: AT,
});

/**
 * Two players with genuinely DIFFERENT quality, expressed in the same source
 * units the writer stores. A beats B on every marginal fact (better PPR, better
 * target share, better EPA, better separation, healthier). B is worse on
 * rushing EPA only.
 */
const RAW_BETTER = [
  row("pgs.fantasy_ppr", 24.3),
  row("pgs.target_share", 0.241),
  row("pgs.receiving_epa", 11.9),
  row("pgs.rushing_epa", -2.4),
  row("ngs.cpoe", 8.2),
  row("injury.availability", 0),
];
const RAW_WORSE = [
  row("pgs.fantasy_ppr", 5.1),
  row("pgs.target_share", 0.118),
  row("pgs.receiving_epa", -1.2),
  row("pgs.rushing_epa", 4.8),
  row("ngs.cpoe", -3.1),
  row("injury.availability", 0),
];

/** The same six facts each mapped onto the shared -1..1 scale (the contract). */
const NORM_BETTER = [
  row("pgs.fantasy_ppr", 0.62),
  row("pgs.target_share", 0.48),
  row("pgs.receiving_epa", 0.31),
  row("pgs.rushing_epa", -0.18),
  row("ngs.cpoe", 0.24),
  row("injury.availability", 0),
];
const NORM_WORSE = [
  row("pgs.fantasy_ppr", -0.21),
  row("pgs.target_share", -0.33),
  row("pgs.receiving_epa", -0.14),
  row("pgs.rushing_epa", 0.22),
  row("ngs.cpoe", -0.19),
  row("injury.availability", 0),
];

describe("composeLedger — the input contract the `signals` table does not meet", () => {
  it("is a working composer on contract-honoring input (the module is not dead weight)", () => {
    const better = composeLedger(NORM_BETTER, { now: NOW });
    const worse = composeLedger(NORM_WORSE, { now: NOW });

    expect(better.signalsUsed).toBe(6);
    expect(worse.signalsUsed).toBe(6);
    // On the shared scale the ordering is correct and the magnitude is sane.
    expect(better.score).toBeGreaterThan(worse.score);
    expect(Math.abs(better.score)).toBeLessThanOrEqual(1);
  });

  it("ORDERS correctly on raw source units too — so this is not an ordering bug", () => {
    // Guards against overclaiming: the better player still wins. The defect is
    // MAGNITUDE and CROSS-KEY DOMINANCE, not direction.
    const better = composeLedger(RAW_BETTER, { now: NOW });
    const worse = composeLedger(RAW_WORSE, { now: NOW });
    expect(better.score).toBeGreaterThan(worse.score);
  });

  it("produces a score OUTSIDE the documented -1..1 range on the real stored rows", () => {
    // THE REASON IT IS NOT WIRED. `score` is documented as a mean of values on
    // a shared -1..1 scale, so it is only meaningful in that range. Feed it the
    // verbatim source columns the writer actually persists and it returns ~7.3 —
    // a number that would be read as "7.3 sigma better", i.e. nonsense that
    // still looks like a number and would silently reach the published surface.
    const real = composeLedger(RAW_BETTER, { now: NOW });
    expect(real.score).toBeGreaterThan(1);
    expect(Math.abs(real.score)).toBeGreaterThan(7);
  });

  it("lets ONE key dominate the blend purely because of its unit scale", () => {
    // fantasy_ppr (points, range ~58) vs availability (ordinal, range ~1).
    // Both are weight=1.0, confidence=1.0, so this is pure unit asymmetry.
    const r = composeLedger(
      [row("pgs.fantasy_ppr", 57.9), row("injury.availability", 0)],
      { now: NOW },
    );
    const shares = Object.fromEntries(r.contributions.map((c) => [c.key, c.weightShare]));
    // Equal weights => equal shares. The 28.95x value gap must NOT leak into
    // weight, which is what the composer does correctly...
    expect(shares["pgs.fantasy_ppr"]).toBeCloseTo(0.5, 3);
    // ...but it DOES leak entirely into `score`, which is the defect.
    expect(r.score).toBeCloseTo(28.95, 2);
  });

  it("purity/determinism: identical rows at a fixed `now` are byte-identical", () => {
    const a = composeLedger(RAW_BETTER, { now: NOW });
    const b = composeLedger(RAW_BETTER, { now: NOW });
    expect(a.score).toBe(b.score);
    expect(a.totalWeight).toBe(b.totalWeight);
    expect(JSON.stringify(a.contributions)).toBe(JSON.stringify(b.contributions));
  });

  it("every stored row shares weight=1.0/confidence=1.0, so the tuner never differentiated them", () => {
    // Measured in prod: weight min == max == 1 AND confidence min == max == 1
    // for all ten keys. If the tuner had ever run against settled outcomes,
    // effectiveWeight would DIFFER across keys. The only per-row variation the
    // composer applies is the shared freshness decay, which is a function of age
    // alone — so uniformity here proves the weight POLICY is absent from the
    // data and the blend is decided by `key`, not by merit.
    const r = composeLedger(RAW_BETTER, { now: NOW });
    const weights = r.contributions.map((c) => c.effectiveWeight);
    // All rows are the same age, so every effectiveWeight is identical.
    for (const w of weights) expect(w).toBeCloseTo(weights[0]!, 6);
    // And that shared value is exactly the freshness factor for 2.5 days at the
    // default 14-day half-life: 0.5 ** (2.5/14) — i.e. weight*confidence == 1.
    // effectiveWeight is round4'd by the composer (composite-score.ts:84), so
    // the tolerance is 4dp, not the composer-internal 6dp.
    expect(weights[0]).toBeCloseTo(Math.pow(0.5, 2.5 / 14), 4);
    expect(r.totalWeight).toBeCloseTo(6 * Math.pow(0.5, 2.5 / 14), 3);
  });
});
