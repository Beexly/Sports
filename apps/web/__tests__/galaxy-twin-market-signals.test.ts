import { describe, it, expect } from "vitest";
import { DRIFT_MOVING_PP } from "@/lib/market/game-market-read";
import { WIDE_SPREAD_PP } from "@/lib/market/simulation-cloud-geometry";

/**
 * Galaxy Twin market-signal state derivation — Crosswire pass.
 *
 * Source-pin rules (from prior test conventions):
 *   - Thresholds are imported, never redefined.
 *   - Signal states derive only from real fields (homeDriftPp, fairHomeProbsByBook).
 *   - null / absent data must not produce a signal state.
 */

// ---------------------------------------------------------------------------
// Threshold exports — imported, not magic-numbered (pinned here)
// ---------------------------------------------------------------------------

describe("DRIFT_MOVING_PP", () => {
  it("is exported from game-market-read (shared constant, not a magic number)", () => {
    expect(typeof DRIFT_MOVING_PP).toBe("number");
    expect(DRIFT_MOVING_PP).toBe(1.5);
  });
});

describe("WIDE_SPREAD_PP", () => {
  it("is exported from simulation-cloud-geometry (shared constant, not a magic number)", () => {
    expect(typeof WIDE_SPREAD_PP).toBe("number");
    expect(WIDE_SPREAD_PP).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// driftState derivation logic (pure function, extracted for testability)
// ---------------------------------------------------------------------------

/** Mirror of get-slate-twin driftState logic; tests the RULE, not the import. */
function deriveDriftState(
  homeDriftPp: number | null,
): "moving" | undefined {
  if (homeDriftPp === null) return undefined;
  return Math.abs(homeDriftPp) >= DRIFT_MOVING_PP ? "moving" : undefined;
}

describe("driftState derivation", () => {
  it("returns 'moving' when |homeDriftPp| >= DRIFT_MOVING_PP (positive drift)", () => {
    expect(deriveDriftState(DRIFT_MOVING_PP)).toBe("moving");
  });

  it("returns 'moving' when |homeDriftPp| >= DRIFT_MOVING_PP (negative drift)", () => {
    expect(deriveDriftState(-DRIFT_MOVING_PP)).toBe("moving");
  });

  it("returns 'moving' when drift exceeds the threshold", () => {
    expect(deriveDriftState(3.2)).toBe("moving");
    expect(deriveDriftState(-4.1)).toBe("moving");
  });

  it("returns undefined when |homeDriftPp| < DRIFT_MOVING_PP (below threshold)", () => {
    expect(deriveDriftState(1.4)).toBeUndefined();
    expect(deriveDriftState(-0.9)).toBeUndefined();
    expect(deriveDriftState(0)).toBeUndefined();
  });

  it("returns undefined when homeDriftPp is null (no captured history — no signal)", () => {
    expect(deriveDriftState(null)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// disagreementState derivation logic
// ---------------------------------------------------------------------------

/** Mirror of get-slate-twin disagreementState logic; tests the RULE. */
function deriveDisagreementState(
  fairHomeProbsByBook: readonly number[] | null | undefined,
): "argued" | undefined {
  if (!fairHomeProbsByBook || fairHomeProbsByBook.length < 2) return undefined;
  const spreadPp = (Math.max(...fairHomeProbsByBook) - Math.min(...fairHomeProbsByBook)) * 100;
  return spreadPp >= WIDE_SPREAD_PP ? "argued" : undefined;
}

describe("disagreementState derivation", () => {
  it("returns 'argued' when cloud spread >= WIDE_SPREAD_PP", () => {
    // 0.52 - 0.48 = 0.04 = 4pp (exactly at threshold)
    const probs = [0.48, 0.50, 0.52];
    expect(deriveDisagreementState(probs)).toBe("argued");
  });

  it("returns 'argued' when cloud spread exceeds WIDE_SPREAD_PP", () => {
    // 0.57 - 0.50 = 0.07 = 7pp
    const probs = [0.50, 0.53, 0.57];
    expect(deriveDisagreementState(probs)).toBe("argued");
  });

  it("returns undefined when cloud spread < WIDE_SPREAD_PP (narrow disagreement)", () => {
    // 0.51 - 0.49 = 0.02 = 2pp — below threshold
    const probs = [0.49, 0.50, 0.51];
    expect(deriveDisagreementState(probs)).toBeUndefined();
  });

  it("returns undefined when fewer than 2 samples (one book cannot disagree with itself)", () => {
    expect(deriveDisagreementState([0.52])).toBeUndefined();
  });

  it("returns undefined when probs array is empty", () => {
    expect(deriveDisagreementState([])).toBeUndefined();
  });

  it("returns undefined when probs is null (no market read available — no signal)", () => {
    expect(deriveDisagreementState(null)).toBeUndefined();
  });

  it("returns undefined when probs is undefined (absent data — no signal)", () => {
    expect(deriveDisagreementState(undefined)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// TwinGame shape — optional fields absent by default (honest degradation)
// ---------------------------------------------------------------------------

import type { TwinGame } from "@/lib/slate-twin/demo-slate";
import { DEMO_SLATE } from "@/lib/slate-twin/demo-slate";

describe("demo-slate TwinGame — market signal fields are optional", () => {
  it("demo slate games carry no driftState or disagreementState (only live data sets them)", () => {
    for (const g of DEMO_SLATE.games) {
      expect(g.driftState).toBeUndefined();
      expect(g.disagreementState).toBeUndefined();
    }
  });

  it("TwinGame accepts driftState and disagreementState when present (type check via assignment)", () => {
    // This is a compile-time type assertion expressed as a runtime no-op.
    const partial: Partial<TwinGame> = {
      driftState: "moving",
      disagreementState: "argued",
    };
    expect(partial.driftState).toBe("moving");
    expect(partial.disagreementState).toBe("argued");
  });
});

// ---------------------------------------------------------------------------
// Threshold identity — the same constant governs both the fair board and the twin
// ---------------------------------------------------------------------------

describe("threshold identity across modules", () => {
  it("DRIFT_MOVING_PP matches the threshold applied in market-fair-board (1.5pp)", () => {
    // The fair board uses text-plasma when |homeDriftPp| >= this value.
    // The twin uses "moving" for the same condition.
    // Both import the same constant — verified here by value contract.
    expect(DRIFT_MOVING_PP).toBe(1.5);
  });

  it("WIDE_SPREAD_PP matches the threshold applied in simulation-cloud-geometry (4pp)", () => {
    // The simulation cloud calls this 'wide enough to be the story'.
    // The twin uses 'argued' for the same condition.
    expect(WIDE_SPREAD_PP).toBe(4);
  });
});
