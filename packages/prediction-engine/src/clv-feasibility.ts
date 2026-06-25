/**
 * CLV feasibility analysis — the honest test of whether a fixed, pre-registered
 * entry rule can systematically beat the closing line.
 *
 * WHERE THIS SITS IN THE EVIDENCE CHAIN:
 *   • market-efficiency-scan proved there is no FREE edge sitting in the CLOSING
 *     number (0/16 angles over 27 seasons).
 *   • The only remaining open question is CLV: does the line move in a PREDICTABLE
 *     direction between the OPENING and CLOSING number, such that a rule decided AT
 *     OPEN (bet home, bet the dog, bet the under, ...) reliably earns positive
 *     closing-line value? If yes, entering early on that rule is a genuine,
 *     paid-data-justifying edge. If no, the open is already efficient w.r.t. our
 *     small, hand-chosen family and the spend is not justified.
 *
 * This module is the PURE analysis core — no I/O, no API, no Date/RNG. The runner
 * script (scripts/backtest/clv-feasibility.ts) reconstructs real open/close
 * consensus lines from The Odds API historical endpoint and feeds them here; this
 * file only does math, so every verdict is deterministic and replayable.
 *
 * DISCIPLINE (non-negotiable): many rules tested at once ⇒ Benjamini-Hochberg FDR
 * control (multiple-testing.ts), so a lucky rule cannot masquerade as an edge. A
 * rule is an edge CANDIDATE only if its mean CLV is POSITIVE *and* it survives FDR.
 *
 * Sign convention (inherited from clv.ts): POSITIVE CLV = you beat the close.
 *
 * Note on the zero-sum structure: betting HOME vs AWAY on the same spread (and
 * OVER vs UNDER on the same total) are exact negatives, so their means mirror and
 * their p-values are identical. We keep both halves in the family deliberately —
 * it cannot manufacture a false edge (the FDR denominator only grows, making the
 * bar stricter) and it lets the sweep surface whichever side, if any, drifts our way.
 */

import type { OddsApiEvent } from "@sports/types";
import { computeSpreadClv, computeTotalClv, type SpreadSide, type TotalSide } from "./clv.js";
import { benjaminiHochberg, type PValueEntry } from "./multiple-testing.js";

// ── Consensus extraction from a raw historical snapshot ─────────────────────────

/** Home-perspective spread and combined total as a median across books at one snapshot. */
export interface SnapshotConsensus {
  /** Median home-perspective spread point across books; null if no book priced spreads. */
  readonly spreadHome: number | null;
  /** Median total point across books; null if no book priced totals. */
  readonly total: number | null;
  /** How many books contributed a spread number (the consensus's support). */
  readonly spreadBooks: number;
  /** How many books contributed a total number. */
  readonly totalBooks: number;
}

/** Median of a numeric sample (averages the two middle values on even length). */
export function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/**
 * Reduce one historical odds event to a cross-book consensus line. Uses the MEDIAN
 * (robust to a single mispriced book) of the home-team spread point and the total
 * point. Books that did not price a market simply do not contribute to it.
 */
export function consensusFromEvent(event: OddsApiEvent): SnapshotConsensus {
  const spreads: number[] = [];
  const totals: number[] = [];

  for (const book of event.bookmakers ?? []) {
    for (const market of book.markets ?? []) {
      if (market.key === "spreads") {
        const home = market.outcomes.find((o) => o.name === event.home_team);
        if (home && typeof home.point === "number" && Number.isFinite(home.point)) {
          spreads.push(home.point);
        }
      } else if (market.key === "totals") {
        // Over/Under share the same total point; take the first finite one.
        const o = market.outcomes.find((x) => typeof x.point === "number" && Number.isFinite(x.point));
        if (o && typeof o.point === "number") totals.push(o.point);
      }
    }
  }

  return {
    spreadHome: median(spreads),
    total: median(totals),
    spreadBooks: spreads.length,
    totalBooks: totals.length,
  };
}

// ── A game's open→close lines (the unit of CLV analysis) ────────────────────────

export interface ClvGameOpenClose {
  /** Stable game id (for dedup / auditing); not used by the math. */
  readonly gameId?: string;
  readonly openSpreadHome: number | null;
  readonly closeSpreadHome: number | null;
  readonly openTotal: number | null;
  readonly closeTotal: number | null;
}

/** A bet a rule decides to make AT OPEN — or null when the rule does not apply. */
export type ClvBet =
  | { readonly market: "SPREAD"; readonly side: SpreadSide }
  | { readonly market: "TOTAL"; readonly side: TotalSide }
  | null;

/**
 * Closing-line value (points) a bet earned, comparing the OPEN line it was struck
 * at against the CLOSE. Null when either side of the comparison is missing — we
 * never invent a line. Reuses the audited clv.ts primitives for the sign rules.
 */
export function clvForBet(bet: ClvBet, game: ClvGameOpenClose): number | null {
  if (bet === null) return null;
  if (bet.market === "SPREAD") {
    if (game.openSpreadHome == null || game.closeSpreadHome == null) return null;
    return computeSpreadClv(game.openSpreadHome, game.closeSpreadHome, bet.side).clvPoints;
  }
  if (game.openTotal == null || game.closeTotal == null) return null;
  return computeTotalClv(game.openTotal, game.closeTotal, bet.side).clvPoints;
}

// ── Pre-registered rule family ──────────────────────────────────────────────────

export interface ClvRule {
  /** Stable identifier — also the FDR family key. */
  readonly key: string;
  /** Decide a side from the OPENING line only (no foresight into the close). */
  readonly decide: (open: ClvGameOpenClose) => ClvBet;
}

const betHome: ClvBet = { market: "SPREAD", side: "HOME" };
const betAway: ClvBet = { market: "SPREAD", side: "AWAY" };
const betOver: ClvBet = { market: "TOTAL", side: "OVER" };
const betUnder: ClvBet = { market: "TOTAL", side: "UNDER" };

/**
 * The hand-chosen, pre-registered family. SMALL and fixed on purpose: a known m
 * keeps the Benjamini-Hochberg denominator honest. Each rule looks ONLY at the
 * opening line, so it is implementable in real time (no leakage from the close).
 */
export const DEFAULT_CLV_RULES: readonly ClvRule[] = [
  { key: "spread:HOME", decide: () => betHome },
  { key: "spread:AWAY", decide: () => betAway },
  { key: "total:OVER", decide: () => betOver },
  { key: "total:UNDER", decide: () => betUnder },
  // Favorite / underdog by the opening number (home-perspective: <0 ⇒ home favored).
  {
    key: "spread:FAVORITE",
    decide: (o) =>
      o.openSpreadHome == null || o.openSpreadHome === 0
        ? null
        : { market: "SPREAD", side: o.openSpreadHome < 0 ? "HOME" : "AWAY" },
  },
  {
    key: "spread:UNDERDOG",
    decide: (o) =>
      o.openSpreadHome == null || o.openSpreadHome === 0
        ? null
        : { market: "SPREAD", side: o.openSpreadHome < 0 ? "AWAY" : "HOME" },
  },
  // Small home dog (classic angle) — does the number drift toward it by close?
  {
    key: "spread:HOME_DOG_le3",
    decide: (o) =>
      o.openSpreadHome != null && o.openSpreadHome > 0 && o.openSpreadHome <= 3 ? betHome : null,
  },
  // High totals tend to be bet down (over) / up (under) — test both directions.
  { key: "total:OVER@hi>=49", decide: (o) => (o.openTotal != null && o.openTotal >= 49 ? betOver : null) },
  { key: "total:UNDER@hi>=49", decide: (o) => (o.openTotal != null && o.openTotal >= 49 ? betUnder : null) },
  { key: "total:OVER@lo<=39", decide: (o) => (o.openTotal != null && o.openTotal <= 39 ? betOver : null) },
  { key: "total:UNDER@lo<=39", decide: (o) => (o.openTotal != null && o.openTotal <= 39 ? betUnder : null) },
];

// ── One-sample t-test on per-game CLV (rigorous Student-t, not a normal approx) ──

/** Natural log of the gamma function (Lanczos approximation). */
function gammaln(x: number): number {
  const c = [
    76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155,
    0.1208650973866179e-2, -0.5395239384953e-5,
  ];
  let y = x;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (const coef of c) ser += coef / ++y;
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}

/** Continued fraction for the incomplete beta function (Numerical Recipes betacf). */
function betacf(a: number, b: number, x: number): number {
  const FPMIN = 1e-300;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 200; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 3e-12) break;
  }
  return h;
}

/** Regularized incomplete beta function I_x(a, b). */
function regularizedIncompleteBeta(a: number, b: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const lbeta =
    gammaln(a + b) - gammaln(a) - gammaln(b) + a * Math.log(x) + b * Math.log1p(-x);
  const front = Math.exp(lbeta);
  return x < (a + 1) / (a + b + 2)
    ? (front * betacf(a, b, x)) / a
    : 1 - (front * betacf(b, a, 1 - x)) / b;
}

/**
 * Two-sided p-value for Student's t with `df` degrees of freedom:
 * P(|T| > |t|) = I_{df/(df+t²)}(df/2, 1/2). Exact (to ~1e-10), not a normal approx.
 */
export function studentTTwoSidedP(t: number, df: number): number {
  if (df <= 0) return 1;
  if (!Number.isFinite(t)) return 0;
  const x = df / (df + t * t);
  return Math.max(0, Math.min(1, regularizedIncompleteBeta(df / 2, 0.5, x)));
}

export interface ClvTTest {
  readonly n: number;
  readonly meanClv: number;
  readonly sdClv: number;
  /** One-sample t vs 0 (mean / (sd/√n)); 0 when n<2 or the sample is constant at 0. */
  readonly tStat: number;
  /** Two-sided p-value against H0: mean CLV = 0. */
  readonly pValue: number;
  /** Share of games where CLV > 0 — a distribution-free sanity check on the mean. */
  readonly positiveRate: number;
}

/** One-sample t-test of a CLV-points sample against zero. */
export function oneSampleClvTTest(clvPoints: readonly number[]): ClvTTest {
  const n = clvPoints.length;
  if (n === 0) {
    return { n: 0, meanClv: 0, sdClv: 0, tStat: 0, pValue: 1, positiveRate: 0 };
  }
  const mean = clvPoints.reduce((a, b) => a + b, 0) / n;
  const positiveRate = clvPoints.filter((v) => v > 0).length / n;
  if (n < 2) {
    return { n, meanClv: mean, sdClv: 0, tStat: 0, pValue: 1, positiveRate };
  }
  const variance = clvPoints.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1);
  const sd = Math.sqrt(variance);
  if (sd === 0) {
    // A constant sample: a nonzero constant is "infinitely" significant; zero is null.
    const tStat = mean === 0 ? 0 : mean > 0 ? Infinity : -Infinity;
    return { n, meanClv: mean, sdClv: 0, tStat, pValue: mean === 0 ? 1 : 0, positiveRate };
  }
  const tStat = mean / (sd / Math.sqrt(n));
  return { n, meanClv: mean, sdClv: sd, tStat, pValue: studentTTwoSidedP(tStat, n - 1), positiveRate };
}

// ── The sweep: FDR-controlled feasibility verdict over the rule family ───────────

export interface ClvRuleResult {
  readonly key: string;
  readonly ttest: ClvTTest;
  /** True if FDR-tested (n ≥ minSample). Under-sampled rules are reported, not judged. */
  readonly tested: boolean;
  /** BH discovery flag among the tested family (false for under-sampled rules). */
  readonly discovery: boolean;
  /** BH-adjusted q-value (null for under-sampled rules). */
  readonly qValue: number | null;
  /** The honest verdict: a discovery whose mean CLV is positive. */
  readonly isEdgeCandidate: boolean;
}

export interface ClvFeasibilityReport {
  readonly games: number;
  readonly q: number;
  readonly minSample: number;
  readonly rules: readonly ClvRuleResult[];
  readonly edgeCandidates: readonly ClvRuleResult[];
}

/**
 * Run the full feasibility sweep: for each rule, gather its per-game CLV, t-test
 * it against zero, then Benjamini-Hochberg the family of adequately-sampled rules.
 * An edge CANDIDATE is a rule that (a) survives FDR and (b) has positive mean CLV.
 *
 * Honest by construction: rules with n < minSample are reported but excluded from
 * the FDR family (a tiny sample cannot be an edge), and a negative-mean discovery
 * is NOT a candidate — it just means the OPPOSITE side of a zero-sum pair might be.
 */
export function evaluateClvFeasibility(
  games: readonly ClvGameOpenClose[],
  options: { rules?: readonly ClvRule[]; q?: number; minSample?: number } = {},
): ClvFeasibilityReport {
  const rules = options.rules ?? DEFAULT_CLV_RULES;
  const q = options.q ?? 0.1;
  const minSample = options.minSample ?? 30;

  const perRule = rules.map((rule) => {
    const samples: number[] = [];
    for (const g of games) {
      const clv = clvForBet(rule.decide(g), g);
      if (clv != null) samples.push(clv);
    }
    return { key: rule.key, ttest: oneSampleClvTTest(samples) };
  });

  const tested = perRule.filter((r) => r.ttest.n >= minSample);
  const fdr = benjaminiHochberg(
    tested.map((r): PValueEntry => ({ key: r.key, pValue: r.ttest.pValue })),
    q,
  );
  const disc = new Map(fdr.results.map((r) => [r.key, r]));

  const results: ClvRuleResult[] = perRule.map((r) => {
    const d = disc.get(r.key);
    const isTested = r.ttest.n >= minSample;
    const discovery = d?.discovery ?? false;
    return {
      key: r.key,
      ttest: r.ttest,
      tested: isTested,
      discovery,
      qValue: d?.qValue ?? null,
      isEdgeCandidate: discovery && r.ttest.meanClv > 0,
    };
  });

  return {
    games: games.length,
    q,
    minSample,
    rules: results,
    edgeCandidates: results.filter((r) => r.isEdgeCandidate),
  };
}
