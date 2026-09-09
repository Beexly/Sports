import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  evaluateProjectionBasis,
  basisAccepted,
  PRIOR_SEASON_GRACE_WEEKS,
  MIN_GAMES_FOR_BASIS,
} from "@/lib/integrations/projection-basis";

const DEEP = process.env.DEEP_FUZZ === "1";
const RUNS = 5_000 * (DEEP ? 25 : 1);

/**
 * C-213. The gate that decides what a projection may be built from.
 *
 * The case that matters tonight is the first one: it is the eve of Week 1,
 * there are zero 2026 game rows because the season has not been played, and
 * the product still has to project the largest slate of the year. Prior-season
 * production is the correct basis for that, and this gate must ACCEPT it -
 * labelled, never silent.
 */
describe("Week 1 with no current-season games — the case this gate exists for", () => {
  it("accepts a prior-season basis for Week 1 and says so in the label", () => {
    const b = evaluateProjectionBasis({
      targetSeason: 2026, targetWeek: 1, basisSeason: 2025, gamesBehind: 17,
    });
    expect(basisAccepted(b)).toBe(true);
    if (!b.ok) throw new Error("unreachable");
    expect(b.code).toBe("PRIOR_SEASON_EARLY");
    // The label names the season the NUMBER came from, not the one it is for.
    expect(b.label).toContain("2025 season basis");
    expect(b.label).toContain("17 games");
    expect(b.label).toContain("no 2026 games played yet");
  });

  it("accepts it through the whole grace window, and refuses immediately after", () => {
    for (let wk = 1; wk <= PRIOR_SEASON_GRACE_WEEKS; wk++) {
      const b = evaluateProjectionBasis({ targetSeason: 2026, targetWeek: wk, basisSeason: 2025, gamesBehind: 17 });
      expect(b.ok, `week ${wk} should be accepted`).toBe(true);
    }
    const after = evaluateProjectionBasis({
      targetSeason: 2026, targetWeek: PRIOR_SEASON_GRACE_WEEKS + 1, basisSeason: 2025, gamesBehind: 17,
    });
    expect(after.ok).toBe(false);
    if (after.ok) throw new Error("unreachable");
    expect(after.code).toBe("REFUSED_PRIOR_SEASON_TOO_LATE");
  });
});

describe("what the gate refuses", () => {
  it("refuses a basis two or more seasons behind", () => {
    const b = evaluateProjectionBasis({ targetSeason: 2026, targetWeek: 1, basisSeason: 2024, gamesBehind: 17 });
    expect(b.ok).toBe(false);
    if (b.ok) throw new Error("unreachable");
    expect(b.code).toBe("REFUSED_TOO_OLD");
  });

  it("refuses a sample too thin to project from, rather than inventing one", () => {
    const b = evaluateProjectionBasis({
      targetSeason: 2026, targetWeek: 1, basisSeason: 2025, gamesBehind: MIN_GAMES_FOR_BASIS - 1,
    });
    expect(b.ok).toBe(false);
    if (b.ok) throw new Error("unreachable");
    expect(b.code).toBe("REFUSED_THIN_SAMPLE");
  });

  it("refuses a basis season from the future", () => {
    const b = evaluateProjectionBasis({ targetSeason: 2026, targetWeek: 1, basisSeason: 2027, gamesBehind: 17 });
    expect(b.ok).toBe(false);
    if (b.ok) throw new Error("unreachable");
    expect(b.code).toBe("REFUSED_FUTURE_BASIS");
  });

  it("refuses malformed input instead of coercing it into a projection", () => {
    // A NaN week must not buy a projection by defaulting to 1.
    for (const bad of [
      { targetSeason: 2026, targetWeek: Number.NaN, basisSeason: 2025, gamesBehind: 17 },
      { targetSeason: Number.NaN, targetWeek: 1, basisSeason: 2025, gamesBehind: 17 },
      { targetSeason: 2026, targetWeek: 0, basisSeason: 2025, gamesBehind: 17 },
      { targetSeason: 2026, targetWeek: 1.5, basisSeason: 2025, gamesBehind: 17 },
      { targetSeason: 2026, targetWeek: 1, basisSeason: 2025, gamesBehind: Number.NaN },
      { targetSeason: 2026, targetWeek: 1, basisSeason: 2025, gamesBehind: -3 },
    ]) {
      const b = evaluateProjectionBasis(bad);
      expect(b.ok, JSON.stringify(bad)).toBe(false);
    }
  });
});

describe("the gate is total and never silently accepts (fuzz)", () => {
  const arb = fc.record({
    targetSeason: fc.integer({ min: 2018, max: 2032 }),
    targetWeek: fc.integer({ min: -2, max: 25 }),
    basisSeason: fc.integer({ min: 2015, max: 2033 }),
    gamesBehind: fc.integer({ min: -5, max: 25 }),
  });

  it("always returns a decision, never throws", () => {
    fc.assert(
      fc.property(arb, (i) => {
        const b = evaluateProjectionBasis(i);
        expect(typeof b.ok).toBe("boolean");
      }),
      { numRuns: RUNS },
    );
  });

  it("every ACCEPTED basis carries a non-empty label naming its season", () => {
    // The whole point. An accepted projection that cannot say what it was
    // built from is the thing this gate exists to prevent.
    fc.assert(
      fc.property(arb, (i) => {
        const b = evaluateProjectionBasis(i);
        if (!b.ok) return;
        expect(b.label.length).toBeGreaterThan(0);
        expect(b.label).toContain(String(b.basisSeason));
        expect(b.gamesBehind).toBeGreaterThanOrEqual(MIN_GAMES_FOR_BASIS);
      }),
      { numRuns: RUNS },
    );
  });

  it("every REFUSAL carries a reason a human can act on", () => {
    fc.assert(
      fc.property(arb, (i) => {
        const b = evaluateProjectionBasis(i);
        if (b.ok) return;
        expect(b.reason.length).toBeGreaterThan(10);
        expect(b.code.startsWith("REFUSED_")).toBe(true);
      }),
      { numRuns: RUNS },
    );
  });

  it("never accepts a basis more than one season behind the target", () => {
    fc.assert(
      fc.property(arb, (i) => {
        const b = evaluateProjectionBasis(i);
        if (!b.ok) return;
        expect(b.targetSeason - b.basisSeason).toBeLessThanOrEqual(1);
        expect(b.targetSeason - b.basisSeason).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: RUNS },
    );
  });

  it("never accepts a prior-season basis outside the grace window", () => {
    fc.assert(
      fc.property(arb, (i) => {
        const b = evaluateProjectionBasis(i);
        if (!b.ok) return;
        if (b.basisSeason === b.targetSeason - 1) {
          expect(b.targetWeek).toBeLessThanOrEqual(PRIOR_SEASON_GRACE_WEEKS);
        }
      }),
      { numRuns: RUNS },
    );
  });

  it("is monotone in week: once refused for lateness, later weeks stay refused", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2020, max: 2030 }),
        fc.integer({ min: MIN_GAMES_FOR_BASIS, max: 20 }),
        fc.integer({ min: 1, max: 20 }),
        (targetSeason, gamesBehind, wk) => {
          const at = (w: number) =>
            evaluateProjectionBasis({ targetSeason, targetWeek: w, basisSeason: targetSeason - 1, gamesBehind }).ok;
          if (!at(wk)) {
            for (let w = wk; w <= 22; w++) expect(at(w)).toBe(false);
          }
        },
      ),
      { numRuns: RUNS },
    );
  });
});

describe("a game count is a count (C-228)", () => {
  it("refuses a fractional gamesBehind instead of printing it as provenance", () => {
    // gamesBehind checked only Number.isFinite while every sibling field used
    // isUsableInt, so 4.5 cleared the gate and reached the label as
    // "4.5 games". The refusal message already promised "whole numbers".
    const fractional = evaluateProjectionBasis({
      targetSeason: 2026, targetWeek: 1, basisSeason: 2025, gamesBehind: 4.5,
    });
    expect(fractional.ok).toBe(false);
    expect(fractional.ok === false && fractional.code).toBe("REFUSED_UNUSABLE_INPUT");

    // The whole-number equivalent still passes, so this refuses the shape and
    // not the value.
    const whole = evaluateProjectionBasis({
      targetSeason: 2026, targetWeek: 1, basisSeason: 2025, gamesBehind: 4,
    });
    expect(whole.ok).toBe(true);
  });

  it("never emits a non-integer game count in any accepted label", () => {
    // The property behind it: whatever the gate accepts, the number it prints
    // must be a whole one.
    for (const games of [0.5, 1.1, 3.999, 4.5, 16.5, 17.0001]) {
      const r = evaluateProjectionBasis({
        targetSeason: 2026, targetWeek: 1, basisSeason: 2025, gamesBehind: games,
      });
      expect(r.ok, `gamesBehind ${games} was accepted`).toBe(false);
    }
  });
});
