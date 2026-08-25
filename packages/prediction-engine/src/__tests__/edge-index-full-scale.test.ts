import { describe, expect, it } from "vitest";
import { scoreGame, impliedProbabilityToAmerican, toEdgeIndex } from "../scoring.js";
import { recommendStake, MIN_EDGE_FOR_STAKE } from "../kelly.js";
import { MODEL_VERSION, GRADE_THRESHOLDS } from "../constants.js";
import {
  EDGE_INDEX_MAX,
  GRADE_THRESHOLDS as TYPES_GRADE_THRESHOLDS,
  LEGACY_HALF_SCALE_THROUGH_MODEL_VERSION,
} from "@sports/types";
import type { GameContextInput, OddsInput, PickGrade, ScoredPick } from "@sports/types";

/**
 * ============================================================================
 * THE EDGE INDEX, MEASURED AGAINST THE REAL SCORER
 * ============================================================================
 *
 * Everything below runs `scoreGame` on constructed two-way markets and reads
 * what it publishes. No hand-fed `(confidence, edgeScore)` pairs stand in for
 * engine output, because the defect being fixed was precisely that the engine
 * could not emit the values the ladder asked for.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * WHY EVERY BOOK POSTS THE SAME PAIR OF PRICES
 * ────────────────────────────────────────────────────────────────────────────
 *
 * `scoreSpreadPick` / `scoreTotalPick` on this branch still average the chosen
 * side's AMERICAN prices arithmetically. American odds are discontinuous across
 * ±100, so a book set that straddles pick'em produces a mean that is not a
 * price, collapses `offeredProb`, and mints a positive `rawEdge` out of a market
 * with none. That defect is fixed on a separate branch and is deliberately NOT
 * touched here.
 *
 * Uniform book sets sidestep it exactly: when every book posts the same pair,
 * the arithmetic mean of American odds and the probability-space mean coincide,
 * so `offeredProb` is the side's true implied probability and the derivation in
 * `@sports/types`' `edge-index.ts` applies verbatim. These fixtures therefore
 * measure the SCALE, not the averaging bug.
 */

const BOOKS = [
  "fanduel", "draftkings", "betmgm", "caesars", "pointsbet",
  "betrivers", "espnbet", "fanatics", "bet365", "hardrock",
] as const;

const AT = new Date("2026-09-01T12:00:00Z");
const COMMENCE = new Date("2026-09-01T18:00:00Z");

/**
 * A uniform two-way TOTAL whose overround is exactly `1 + hold` and whose OVER
 * side carries fair probability `pOver`.
 */
function uniformTotal(hold: number, pOver: number, books = 8): OddsInput {
  return {
    gameId: `total-${hold}-${pOver}`,
    homeTeam: "Home Club",
    awayTeam: "Away Club",
    commenceTime: COMMENCE,
    sport: "NFL",
    bookmakerOdds: Array.from({ length: books }, (_, i) => ({
      bookmaker: BOOKS[i % BOOKS.length]!,
      market: "TOTALS" as const,
      total: 44.5,
      overPrice: impliedProbabilityToAmerican(pOver * (1 + hold)),
      underPrice: impliedProbabilityToAmerican((1 - pOver) * (1 + hold)),
    })),
  };
}

/** A uniform two-way SPREAD, with `favPct` of books favouring home. */
function uniformSpread(
  hold: number,
  books: number,
  favPct: number,
  context?: GameContextInput,
): OddsInput {
  const p = 0.52;
  return {
    gameId: `spread-${hold}-${books}-${favPct}`,
    homeTeam: "Home Club",
    awayTeam: "Away Club",
    commenceTime: COMMENCE,
    sport: "NFL",
    bookmakerOdds: Array.from({ length: books }, (_, i) => ({
      bookmaker: BOOKS[i % BOOKS.length]!,
      market: "SPREADS" as const,
      spread: i < Math.round(books * favPct) ? -3.5 : 3.5,
      homeSpreadPrice: impliedProbabilityToAmerican(p * (1 + hold)),
      awaySpreadPrice: impliedProbabilityToAmerican((1 - p) * (1 + hold)),
    })),
    context,
  };
}

/** Ordinary contextual signals — the shape a real game carries. */
const RICH_CONTEXT: GameContextInput = {
  openingSpread: -1.5,
  currentSpread: -3.5,
  restDaysHome: 7,
  restDaysAway: 3,
  homeAtsForm: { wins: 8, losses: 2, pushes: 0, sampleSize: 10 },
  homeAtsFormAtHome: { wins: 5, losses: 1, pushes: 0, sampleSize: 6 },
  headToHeadForm: { wins: 4, losses: 1, pushes: 0, sampleSize: 5 },
  scheduleDensityHome: 1,
  scheduleDensityAway: 4,
  dataFreshnessMinutes: 2,
};

/** Sweep the picked side's fair probability across a total at a fixed hold. */
function indexesAtHold(hold: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < 41; i++) {
    for (const pick of scoreGame(uniformTotal(hold, 0.3 + i * 0.01), AT)) {
      out.push(pick.edgeScore);
    }
  }
  return out;
}

describe("the published Edge Index spans its whole axis on real markets", () => {
  /**
   * The retired scale (`50 + 1000 · rawEdge`) produced 43–45 at a 1% hold and
   * 15–25 at 5%: the entire published 50–100 half was structurally dead. These
   * bands are the measured output of the current scale. They are recorded as
   * ranges, not exact values, because integer American-price rounding moves the
   * last point or two.
   */
  const BANDS: ReadonlyArray<{ hold: number; min: number; max: number }> = [
    { hold: 0.01, min: 80, max: 95 },
    { hold: 0.02, min: 68, max: 84 },
    { hold: 0.03, min: 54, max: 75 },
    { hold: 0.04, min: 40, max: 66 },
    { hold: 0.05, min: 26, max: 54 },
    { hold: 0.06, min: 11, max: 43 },
  ];

  for (const { hold, min, max } of BANDS) {
    it(`a ${(hold * 100).toFixed(0)}% two-way hold publishes inside ${min}–${max}`, () => {
      const values = indexesAtHold(hold);
      expect(values.length).toBeGreaterThan(0);
      expect(Math.min(...values)).toBeGreaterThanOrEqual(min);
      expect(Math.max(...values)).toBeLessThanOrEqual(max);
    });
  }

  it("cheaper books read strictly higher — the index is a price-quality reading", () => {
    // Stated as the medians so a single rounding wobble cannot flip it.
    const medians = [0.01, 0.02, 0.03, 0.04, 0.05, 0.06].map((hold) => {
      const v = indexesAtHold(hold).sort((a, b) => a - b);
      return v[Math.floor(v.length / 2)]!;
    });
    for (let i = 1; i < medians.length; i++) {
      expect(medians[i]!, `hold step ${i} did not read lower`).toBeLessThan(medians[i - 1]!);
    }
    // …and the spread across ordinary holds uses most of the axis, which is the
    // property the retired scale lacked (its 1%–6% span was 44 → 14).
    expect(medians[0]! - medians[medians.length - 1]!).toBeGreaterThan(50);
  });

  it("an ordinary 8-book −110/−110 total lands near the middle, not near the bottom", () => {
    const vanilla: OddsInput = {
      gameId: "vanilla",
      homeTeam: "Home Club",
      awayTeam: "Away Club",
      commenceTime: COMMENCE,
      sport: "NFL",
      bookmakerOdds: Array.from({ length: 8 }, (_, i) => ({
        bookmaker: BOOKS[i]!,
        market: "TOTALS" as const,
        total: 44.5,
        overPrice: -110,
        underPrice: -110,
      })),
    };
    const pick = scoreGame(vanilla, AT).find((p) => p.pickType === "TOTAL");
    expect(pick).toBeTruthy();
    // Retired scale published 26 for this market — a number a reader on a
    // 0–100 axis would take for "poor". It is the most ordinary market there is.
    expect(pick!.edgeScore).toBe(52);
    expect(toEdgeIndex(pick!.edgeScore)).toBe(52);
  });

  it("no market can publish outside the axis", () => {
    for (const hold of [0.001, 0.01, 0.05, 0.12, 0.2]) {
      for (const value of indexesAtHold(hold)) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(EDGE_INDEX_MAX);
      }
    }
  });
});

// ============================================================================
// REACHABILITY — the point of the whole change
// ============================================================================

/** Search the honest-market fixture space for one pick per grade. */
function findRungWitnesses(): Map<PickGrade, ScoredPick> {
  const found = new Map<PickGrade, ScoredPick>();
  for (const hold of [0.04, 0.03, 0.02, 0.015, 0.05, 0.06, 0.01]) {
    for (const favPct of [0.6, 0.7, 0.8, 0.9, 1.0]) {
      for (const books of [3, 4, 6, 8, 10]) {
        for (const context of [undefined, RICH_CONTEXT]) {
          for (const pick of scoreGame(uniformSpread(hold, books, favPct, context), AT)) {
            if (pick.pickType !== "SPREAD") continue;
            if (!found.has(pick.pickGrade)) found.set(pick.pickGrade, pick);
          }
        }
      }
    }
  }
  return found;
}

describe("every rung of the ladder is reachable by the real scorer", () => {
  const witnesses = findRungWitnesses();

  /**
   * THE REGRESSION THIS FILE EXISTS FOR.
   *
   * On the retired scale a 287-pick sweep over the same fixture space graded
   * LEAN every single time — including picks carrying confidence 100 — because
   * SOLID_PLAY's edge threshold of 50 sat exactly ON the unreachable ceiling and
   * the two rungs above it sat beyond it. Not one threshold value was moved to
   * fix this; the axis was.
   */
  for (const grade of ["LEAN", "SOLID_PLAY", "STRONG_PLAY", "ELITE_PLAY"] as const) {
    it(`${grade} has a witness produced by scoreGame on an honestly priced market`, () => {
      const pick = witnesses.get(grade);
      expect(
        pick,
        `no honest market produced ${grade}; the rung is unreachable`,
      ).toBeTruthy();
      // The witness must be internally consistent with the shipped ladder,
      // not merely labelled with the grade.
      if (grade !== "LEAN") {
        const rung = TYPES_GRADE_THRESHOLDS[grade];
        expect(pick!.confidence).toBeGreaterThanOrEqual(rung.confidence);
        expect(pick!.edgeScore).toBeGreaterThanOrEqual(rung.edge);
      }
    });
  }

  it("the top rung is reached at a realistic hold, not only at an implausible one", () => {
    // ELITE_PLAY needs Edge Index >= 80, i.e. rawEdge >= -0.01: about a 2%
    // two-way hold. That is a real, if sharp, market — not a zero-vig fantasy.
    const elite = witnesses.get("ELITE_PLAY");
    expect(elite).toBeTruthy();
    const impliedRawEdge = (elite!.edgeScore - EDGE_INDEX_MAX) / 2000;
    expect(impliedRawEdge).toBeLessThanOrEqual(0);
    expect(impliedRawEdge).toBeGreaterThan(-0.015);
  });
});

// ============================================================================
// GUARDS AND PLUMBING
// ============================================================================

describe("the stake gate was migrated, not loosened", () => {
  /**
   * `MIN_EDGE_FOR_STAKE` was 50 on the retired axis — the zero-hold ceiling, so
   * `recommendStake` returned null for every honest pick. Carrying the literal
   * 50 across to the doubled axis would have HALVED the gate and switched
   * bankroll-sizing advice on for the whole board as a side effect of a display
   * rescale. Its image under the documented bijection is 2 × 50 = 100.
   */
  it("sits at the top of the axis, the image of the retired threshold", () => {
    expect(MIN_EDGE_FOR_STAKE).toBe(EDGE_INDEX_MAX);
    expect(MIN_EDGE_FOR_STAKE).toBe(50 * 2);
  });

  it("still recommends no stake anywhere in an honest-market sweep", () => {
    let considered = 0;
    let staked = 0;
    for (const hold of [0.005, 0.01, 0.02, 0.03, 0.04, 0.05]) {
      for (const favPct of [0.6, 0.8, 1.0]) {
        for (const books of [4, 8, 10]) {
          for (const pick of scoreGame(uniformSpread(hold, books, favPct, RICH_CONTEXT), AT)) {
            considered++;
            if (recommendStake(pick) !== null) staked++;
          }
        }
      }
    }
    expect(considered).toBeGreaterThan(20); // the sweep is not vacuous
    expect(staked).toBe(0);
  });
});

describe("one ladder, one model version, one scale", () => {
  it("prediction-engine re-exports the types ladder rather than redeclaring it", () => {
    // Object identity, not value equality: two objects with equal numbers is
    // exactly the duplicated-literal state this change removed.
    expect(GRADE_THRESHOLDS).toBe(TYPES_GRADE_THRESHOLDS);
  });

  it("MODEL_VERSION moved past the last half-scale version", () => {
    expect(LEGACY_HALF_SCALE_THROUGH_MODEL_VERSION).toBe("v5.2.7");
    expect(MODEL_VERSION).not.toBe(LEGACY_HALF_SCALE_THROUGH_MODEL_VERSION);
    expect(MODEL_VERSION).toBe("v5.3.0");
  });

  it("every published pick carries the model version that defines its scale", () => {
    const picks = scoreGame(uniformSpread(0.03, 8, 0.8, RICH_CONTEXT), AT);
    expect(picks.length).toBeGreaterThan(0);
    for (const pick of picks) {
      expect(pick.modelVersion).toBe(MODEL_VERSION);
    }
  });
});
