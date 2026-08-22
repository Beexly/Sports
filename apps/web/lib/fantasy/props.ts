/**
 * Props / Pick'em Edge — a decision advisor on third-party pick'em lines.
 *
 * We do NOT operate a pick'em product. We read the lines that Underdog, DK Pick6,
 * PrizePicks et al. post and tell you where OUR model disagrees — that gap is your
 * edge. For every prop we compute P(over) from our projection distribution, the
 * recommended side, and the single most valuable ALT line (the line/multiplier
 * combination where edge × payout is maximised — the leverage nobody surfaces).
 *
 * Pure functions, illustrative lines. Live line ingestion is founder-gated.
 *
 * Edge is e = p − q against a two-way book, never confidence κ = |2p−1|.
 * Without a quote, `edge` is 0 (unpriced) — we do not rank chalk as value.
 */

import { pricePropAgainstMarket } from "../../../../packages/prediction-engine/src/edge-lab/props-priced-edge.js";

export type Market = "Pass Yds" | "Rush Yds" | "Rec Yds" | "Receptions" | "Pass TD" | "Rush+Rec";

export type AltLine = {
  /** the alternate stat line on offer */
  readonly line: number;
  /** payout multiplier the book attaches to that line (win pays mult× stake) */
  readonly mult: number;
};

export type Prop = {
  readonly id: string;
  readonly player: string;
  readonly team: string;
  readonly market: Market;
  /** the standard posted line */
  readonly line: number;
  /** our projection mean */
  readonly mean: number;
  /** our projection standard deviation (uncertainty) */
  readonly sigma: number;
  /** alternate lines the book offers, each with its payout multiplier */
  readonly alts: readonly AltLine[];
  /** Two-way American Over/Under. Absent → unpriced (edge = 0). */
  readonly overAmerican?: number;
  readonly underAmerican?: number;
};

// --- distribution math ----------------------------------------------------

function erf(x: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-x * x);
  return x >= 0 ? y : -y;
}

function normCdf(x: number, mu: number, sigma: number): number {
  return 0.5 * (1 + erf((x - mu) / (sigma * Math.SQRT2)));
}

/** Probability the player goes OVER a line, given our projection distribution. */
export function probOver(line: number, mean: number, sigma: number): number {
  // Degenerate distribution (sigma<=0, NaN, or non-finite): the projection is a
  // point mass at `mean`, so the over is a certainty (1), an impossibility (0),
  // or an exact coin flip when the line sits on the mean. Guarding here keeps
  // NaN from a bad/settled feed line out of edge, pSide, and the note text.
  if (!(sigma > 0) || !Number.isFinite(sigma)) {
    return line < mean ? 1 : line > mean ? 0 : 0.5;
  }
  return 1 - normCdf(line, mean, sigma);
}

export type Side = "over" | "under";

export type PropRead = {
  readonly prop: Prop;
  readonly pOver: number;
  readonly side: Side;
  /** P(our recommended side hits) on the posted line */
  readonly pSide: number;
  /**
   * Calibrated edge e = p − q vs a vig-stripped book, or 0 when unpriced.
   * Never |2p−1|.
   */
  readonly edge: number;
  /** |2p−1| — conviction, not value. Do not rank on this. */
  readonly conviction: number;
  readonly priced: boolean;
  /** the most valuable alt line for our side: maximises EV = p×mult − 1 */
  readonly bestAlt: { line: number; mult: number; pSide: number; ev: number } | null;
  /** plain-language read */
  readonly note: string;
};

const pAtLine = (line: number, mean: number, sigma: number, side: Side): number => {
  const po = probOver(line, mean, sigma);
  return side === "over" ? po : 1 - po;
};

export function readProp(prop: Prop): PropRead {
  const pOver = probOver(prop.line, prop.mean, prop.sigma);
  const side: Side = pOver >= 0.5 ? "over" : "under";
  const pSide = side === "over" ? pOver : 1 - pOver;
  const conviction = Math.abs(pOver - 0.5) * 2;

  let edge = 0;
  let priced = false;
  if (prop.overAmerican != null && prop.underAmerican != null) {
    const pricedRead = pricePropAgainstMarket(pOver, {
      overAmerican: prop.overAmerican,
      underAmerican: prop.underAmerican,
    });
    if (pricedRead.ok) {
      edge = pricedRead.edgeOver;
      priced = true;
    }
  }

  // best alt: for our recommended side, which alt line maximises EV per $1?
  let bestAlt: PropRead["bestAlt"] = null;
  for (const a of prop.alts) {
    const p = pAtLine(a.line, prop.mean, prop.sigma, side);
    const ev = p * a.mult - 1;
    if (!bestAlt || ev > bestAlt.ev) bestAlt = { line: a.line, mult: a.mult, pSide: p, ev };
  }

  const gap = Math.round((prop.mean - prop.line) * 10) / 10;
  const dir = side === "over" ? "above" : "below";
  const note = !priced
    ? `Unpriced: no two-way book quote, so this is not an edge. Conviction ${Math.round(conviction * 100)}%.`
    : Math.abs(edge) >= 0.05
      ? `Priced ${side.toUpperCase()}: e=${(edge * 100).toFixed(1)} pts vs vig-stripped book (${Math.abs(gap)} ${dir} the line).`
      : `Near market: e=${(edge * 100).toFixed(1)} pts; skip unless the alt pays.`;

  return { prop, pOver, side, pSide, edge, conviction, priced, bestAlt, note };
}

// --- entry builder (power play: all picks must hit) -----------------------

/** Underdog-style Power Play payout table by entry size (illustrative). */
export const POWER_PAYOUT: Record<number, number> = { 2: 3, 3: 6, 4: 10, 5: 20, 6: 37.5 };

export type EntryEval = {
  readonly count: number;
  readonly combinedP: number;
  readonly payout: number;
  /** expected value per $1 staked: combinedP × payout − 1 */
  readonly ev: number;
  readonly verdict: "+EV" | "thin" | "-EV";
};

/** Evaluate a Power-Play entry (every leg on its recommended side must hit). */
export function evalEntry(reads: readonly PropRead[]): EntryEval | null {
  const count = reads.length;
  const payout = POWER_PAYOUT[count];
  if (!payout) return null;
  const combinedP = reads.reduce((p, r) => p * r.pSide, 1);
  const ev = combinedP * payout - 1;
  const verdict = ev > 0.08 ? "+EV" : ev > -0.05 ? "thin" : "-EV";
  return { count, combinedP, payout, ev, verdict };
}

// --- illustrative slate ---------------------------------------------------

const p = (id: string, player: string, team: string, market: Market, line: number, mean: number, sigma: number, alts: AltLine[]): Prop =>
  ({ id, player, team, market, line, mean, sigma, alts });

export const PROPS: readonly Prop[] = [
  p("p1", "Silas Hart", "PHI", "Pass Yds", 268.5, 284, 46, [{ line: 249.5, mult: 0.72 }, { line: 299.5, mult: 1.85 }]),
  p("p2", "Reed Callum", "BAL", "Pass Yds", 244.5, 232, 42, [{ line: 224.5, mult: 0.74 }, { line: 269.5, mult: 1.9 }]),
  p("p3", "Marcus Vale", "ATL", "Rush Yds", 78.5, 90, 26, [{ line: 64.5, mult: 0.7 }, { line: 94.5, mult: 1.95 }]),
  p("p4", "Deon Pryce", "DET", "Rush+Rec", 96.5, 104, 30, [{ line: 79.5, mult: 0.71 }, { line: 114.5, mult: 1.92 }]),
  p("p5", "Julian Roe", "MIA", "Rec Yds", 74.5, 70, 27, [{ line: 59.5, mult: 0.73 }, { line: 89.5, mult: 2.0 }]),
  p("p6", "DeShawn Kemp", "CIN", "Rec Yds", 68.5, 78, 25, [{ line: 54.5, mult: 0.72 }, { line: 84.5, mult: 1.98 }]),
  p("p7", "Julian Roe", "MIA", "Receptions", 5.5, 6.4, 1.9, [{ line: 4.5, mult: 0.68 }, { line: 6.5, mult: 1.7 }]),
  p("p8", "Rocco Vance", "KC", "Rec Yds", 52.5, 48, 22, [{ line: 39.5, mult: 0.74 }, { line: 64.5, mult: 2.1 }]),
  p("p9", "Tariq Bell", "PHI", "Rush Yds", 58.5, 67, 24, [{ line: 44.5, mult: 0.7 }, { line: 74.5, mult: 2.0 }]),
  p("p10", "Emmett Shaw", "CIN", "Pass TD", 1.5, 1.9, 0.95, [{ line: 0.5, mult: 0.55 }, { line: 2.5, mult: 2.4 }]),
  p("p11", "Emory Banks", "LAR", "Rec Yds", 64.5, 59, 26, [{ line: 49.5, mult: 0.72 }, { line: 79.5, mult: 2.05 }]),
  p("p12", "Rashad Lin", "BUF", "Receptions", 4.5, 5.3, 1.8, [{ line: 3.5, mult: 0.66 }, { line: 5.5, mult: 1.75 }]),
];

export const PROPS_DISCLAIMER =
  "Illustrative lines and model projections. We advise on third-party pick'em lines. We do not operate a pick'em product. Live line ingestion is founder-gated.";
