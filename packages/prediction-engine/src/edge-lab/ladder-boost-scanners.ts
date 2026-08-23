/**
 * Ladder + boost scanners: the softness map (H0 slice #2).
 *
 * These scanners map WHERE in a market's structure the model sees the most
 * exploitable softness — without firing live p. They emit a softness score
 * and the most favorable line level; the fire gate (selective-gate /
 * props-fire-gate) decides whether to act.
 *
 *   - LADDER SCANNER: walks a market's price ladder (every line level with
 *     its Over/Under American quote) and finds the level where the model's
 *     independent p has the largest edge over the market's de-vigged q.
 *     This is how a bettor identifies which line in a player-props ladder
 *     to target — "which run total / how many yards to buy".
 *
 *   - BOOST SCANNER: finds where the market's implied probability is
 *     structurally mispriced relative to the model — specifically levels
 *     where q is below p by enough that a line "boost" (moving the market
 *     line toward the model's view) would create positive expected value.
 *     This flags the soft spots a sportsbook promo / boost could target.
 *
 * Leak-safe: scanners consume only the independent model p and market q.
 * They never see game outcomes. priced:false. Pure, deterministic, no I/O.
 */

import { proportionalDevig } from "./devig.js";
import type { PropBookQuote } from "./props-priced-edge.js";

export const LADDER_BOOST_METHOD_TAG = "ladder_boost_v1" as const;

/** One level of a market ladder: a line value with its Over/Under American prices. */
export interface LadderLevel {
  /** The line threshold at this level (e.g. 7.5 rushing attempts). */
  readonly line: number;
  /** Over/Under American odds offered at this level. */
  readonly quote: PropBookQuote;
}

/** Result of scanning a single ladder level. */
export interface LadderLevelScan {
  readonly line: number;
  /** Model's independent P(over) at this line level. */
  readonly pOver: number;
  /** Market's de-vigged P(over) via proportional devig. */
  readonly qOver: number | null;
  /** e = p − q at this level. null if the quote was un-priceable. */
  readonly edgeOver: number | null;
  /** Juice floor: p vs the posted Over American break-even (not de-vigged). */
  readonly juiceSurplus: number | null;
  /** Why this level was skipped (if it was). */
  readonly skipped?: string;
}

/**
 * Output of a ladder + boost scan. The ladder scanner identifies the most
 * favorable line level; the boost scanner identifies where the market is
 * softest relative to the model across the whole ladder.
 */
export interface SoftnessMapResult {
  readonly methodTag: typeof LADDER_BOOST_METHOD_TAG;
  /** Every level scanned, in the order they were provided. */
  readonly levels: readonly LadderLevelScan[];
  /** The level with the highest non-null edgeOver (most exploitable line). */
  readonly bestLevel: LadderLevelScan | null;
  /** The level with the highest juice surplus (clearest posted-price edge). */
  readonly bestJuiceLevel: LadderLevelScan | null;
  /**
   * Boost score: the fraction of ladder levels where model p > market q (the
   * model sees the over as cheaper than the book implies). Range [0, 1].
   * High = market systematically underprices the over across the ladder.
   */
  readonly boostScore: number;
  /**
   * Mean signed edge (p − q) across all priceable levels. Positive = the
   * model is systematically hotter than the market across the ladder.
   */
  readonly meanEdge: number;
  /** Count of priceable levels in the ladder. */
  readonly priceableLevels: number;
  readonly priced: false;
  readonly reason: string;
}

export interface SoftnessMapOptions {
  /** Optional override for the ladder structure (defaults to the input levels). */
  readonly ladderOverride?: readonly LadderLevel[];
}

// (no module-level constants needed — thresholds are inline)

/**
 * American odds → decimal odds, guarded. Mirrors props-hb's usage.
 */
function americanToDecimal(american: number): number {
  if (!Number.isFinite(american) || Math.abs(american) < 100) {
    throw new RangeError(`americanToDecimal: invalid American price ${american}`);
  }
  return american > 0 ? 1 + american / 100 : 1 + 100 / Math.abs(american);
}

/**
 * Break-even probability of the posted Over American price (juice floor).
 */
function overBreakEven(american: number): number {
  return 1 / americanToDecimal(american);
}

/**
 * Scan a market ladder — the full set of line levels with Over/Under quotes
 * — against an independent model curve that provides P(over) at each line.
 *
 * The model curve is a function from line value → P(over), monotonically
 * non-increasing in the line (higher line = harder to exceed = lower P).
 * This mirrors how a real prop model works: at line L, P(Y > L) is the
 * model's fair probability.
 *
 * Leak-safe: only consumes the model's independent p and the market's q.
 * No outcome data. priced:false.
 */
export function scanLadderBoost(
  levels: readonly LadderLevel[],
  modelPOver: (line: number) => number,
  opts: SoftnessMapOptions = {},
): SoftnessMapResult {
  const ladder = opts.ladderOverride ?? levels;

  if (ladder.length === 0) {
    return emptyResult("no ladder levels to scan");
  }

  const scanned: LadderLevelScan[] = [];
  let bestEdge: LadderLevelScan | null = null;
  let bestJuice: LadderLevelScan | null = null;
  let edgeSum = 0;
  let priceableCount = 0;
  let overPricedCount = 0;

  // Process levels in ascending line order (natural ladder direction).
  const sorted = [...ladder].sort((a, b) => a.line - b.line);

  for (const level of sorted) {
    const pOver = modelPOver(level.line);
    if (!Number.isFinite(pOver) || pOver < 0 || pOver > 1) {
      scanned.push({
        line: level.line,
        pOver: pOver,
        qOver: null,
        edgeOver: null,
        juiceSurplus: null,
        skipped: "model p not a probability in [0, 1]",
      });
      continue;
    }

    // Convert American → decimal, guarding against invalid quotes.
    let decOver: number;
    let decUnder: number;
    try {
      decOver = americanToDecimal(level.quote.overAmerican);
      decUnder = americanToDecimal(level.quote.underAmerican);
    } catch {
      scanned.push({
        line: level.line,
        pOver,
        qOver: null,
        edgeOver: null,
        juiceSurplus: null,
        skipped: "invalid American quote (non-finite or |price| < 100)",
      });
      continue;
    }
    const decOdds = [decOver, decUnder];
    const overround = decOdds.reduce((s, d) => s + 1 / d, 0);
    if (!Number.isFinite(overround) || overround < 1) {
      scanned.push({
        line: level.line,
        pOver,
        qOver: null,
        edgeOver: null,
        juiceSurplus: null,
        skipped: `market inconsistent (overround=${overround.toFixed(4)} < 1)`,
      });
      continue;
    }

    const devig = proportionalDevig(decOdds);
    if (!devig) {
      scanned.push({
        line: level.line,
        pOver,
        qOver: null,
        edgeOver: null,
        juiceSurplus: null,
        skipped: "proportional devig refused (sub-vig market)",
      });
      continue;
    }

    const qOver = devig[0]!;
    const edgeOver = pOver - qOver;

    // Juice floor: p vs the posted Over break-even (vig-inclusive bar).
    const be = overBreakEven(level.quote.overAmerican);
    const juiceSurplus = pOver - be;

    priceableCount += 1;
    edgeSum += edgeOver;
    if (pOver > qOver) overPricedCount += 1;

    const scan: LadderLevelScan = {
      line: level.line,
      pOver,
      qOver,
      edgeOver,
      juiceSurplus,
    };
    scanned.push(scan);

    // Track bests by edge (p−q) and by juice surplus.
    if (bestEdge === null || (edgeOver !== null && edgeOver > (bestEdge.edgeOver ?? -Infinity))) {
      bestEdge = scan;
    }
    if (bestJuice === null || (juiceSurplus !== null && juiceSurplus > (bestJuice.juiceSurplus ?? -Infinity))) {
      bestJuice = scan;
    }
  }

  if (priceableCount === 0) {
    return {
      methodTag: LADDER_BOOST_METHOD_TAG,
      levels: scanned,
      bestLevel: null,
      bestJuiceLevel: null,
      boostScore: 0,
      meanEdge: 0,
      priceableLevels: 0,
      priced: false,
      reason: "no priceable levels in ladder — all quotes failed validation",
    };
  }

  const boostScore = overPricedCount / priceableCount;
  const meanEdge = edgeSum / priceableCount;

  return {
    methodTag: LADDER_BOOST_METHOD_TAG,
    levels: scanned,
    bestLevel: bestEdge,
    bestJuiceLevel: bestJuice,
    boostScore,
    meanEdge,
    priceableLevels: priceableCount,
    priced: false,
    reason: `scanned ${scanned.length} levels, ${priceableCount} priceable; best edge = ${bestEdge!.edgeOver!.toFixed(4)} at line ${bestEdge!.line}`,
  };
}

/**
 * Scan a ladder's boost opportunities: where does the model see the over as
 * systematically cheaper than the market implies? A "boostable" level is one
 * where qOver < pOver — the market is underpricing the over, so a line
 * shift (boost) toward the model's view would create positive EV.
 *
 * Returns only the levels where the model sees positive edge, sorted by
 * edge magnitude descending. Does NOT fire — the fire gate decides.
 */
export function scanBoostOpportunities(
  levels: readonly LadderLevel[],
  modelPOver: (line: number) => number,
  opts: SoftnessMapOptions = {},
): readonly BoostOpportunity[] {
  const result = scanLadderBoost(levels, modelPOver, opts);
  const opps: BoostOpportunity[] = [];

  for (const level of result.levels) {
    if (level.qOver !== null && level.edgeOver !== null && level.edgeOver > 0) {
      opps.push({
        line: level.line,
        pOver: level.pOver,
        qOver: level.qOver,
        edgeOver: level.edgeOver,
      });
    }
  }

  return opps.sort((a, b) => b.edgeOver - a.edgeOver);
}

export interface BoostOpportunity {
  readonly line: number;
  readonly pOver: number;
  readonly qOver: number;
  readonly edgeOver: number;
}

function emptyResult(reason: string): SoftnessMapResult {
  return {
    methodTag: LADDER_BOOST_METHOD_TAG,
    levels: [],
    bestLevel: null,
    bestJuiceLevel: null,
    boostScore: 0,
    meanEdge: 0,
    priceableLevels: 0,
    priced: false,
    reason,
  };
}
