/**
 * The Impact of COVID-19 on Sports Betting Markets
 *
 * arXiv:2109.07581v1 · lane:markets · owner:Hermes
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Stand up a continuous market-efficiency monitor as engine-honesty infrastructure: compute alpha
 * = -1 + mean(W/p) per league x market x rolling 4-week window on GSE's own pick/market history;
 * alert when alpha > 0 with Wilcoxon p < 0.01 (a live 'market mispricing' detector); add hard-
 * coded regime flags in the engine — neutral-site games, no/limited attendance, extreme weather,
 * short-rest disruptions — that shrink the home-field-advantage prior and widen outcome
 * uncertainty when active; report GSE's edge estimates per implied-probability band (replicating
 * the paper's bin analysis); and run the alpha-monitor forward measuring detection latency before
 * inefficiencies are arbitraged away. This monitors whether GSE's edges are real, never a profit
 * objective.
 *
 * ACCEPTANCE GATE: For GSE: gate is detecting alpha > 0 at 1% in any league x window before staking — the paper's
 * +0.10-0.17 is the magnitude that justified real money (NBA COVID alpha = +0.17/+0.10 at 1%
 * significance; inefficiency concentrated at implied 0.2-0.3; 16.7% flat-stake ROI).
 *
 * Ingest role: schemas (COVID market regime study: ghost-game adjustments + regime flags).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2109.07581v1" as const;
export const LANE = "markets" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `For GSE: gate is detecting alpha > 0 at 1% in any league x window before staking — the paper's
 * +0.10-0.17 is the magnitude that justified real money (NBA COVID alpha = +0.17/+0.10 at 1%
 * significance; inefficiency concentrated at implied 0.2-0.3; 16.7% flat-stake ROI).`;

export const CONFIG = {
  enabled: false,
  regimeWindows: ["pre-covid", "ghost-games", "post-covid"],
  ghostGameStart: "2020-03-01",
} as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export type Regime = "pre-covid" | "ghost-games" | "post-covid";

export function classifyRegime(dateISO: string): Regime | null {
  const t = Date.parse(dateISO);
  if (!Number.isFinite(t)) return null;
  if (t < Date.parse("2020-03-01")) return "pre-covid";
  if (t < Date.parse("2021-07-01")) return "ghost-games";
  return "post-covid";
}

export interface MarketGame {
  readonly gameId: string;
  readonly date: string;
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly closingSpread: number;
  readonly result: "H" | "A" | "T" | null;
  readonly attendance: number | null;
}

/** Home edge adjustment for ghost games (paper: HFA collapsed without crowds). */
export function ghostGameSpreadAdjust(spread: number, regime: Regime, ghostDiscount = 1.5): number | null {
  if (!isFiniteNumber(spread) || !isFiniteNumber(ghostDiscount)) return null;
  if (regime === "ghost-games") return spread + ghostDiscount;
  return spread;
}

/** CLV-style line move: close vs open. */
export function lineMove(open: number, close: number): number | null {
  if (!isFiniteNumber(open) || !isFiniteNumber(close)) return null;
  return close - open;
}

/** Regime summary: cover rates per regime. */
export function regimeCoverRates(
  games: ReadonlyArray<MarketGame & { margin: number }>,
): Record<Regime, { n: number; homeCoverRate: number | null }> {
  const acc: Record<Regime, { n: number; covers: number }> = {
    "pre-covid": { n: 0, covers: 0 },
    "ghost-games": { n: 0, covers: 0 },
    "post-covid": { n: 0, covers: 0 },
  };
  for (const g of games) {
    const r = classifyRegime(g.date);
    if (!r || !isFiniteNumber(g.closingSpread) || !isFiniteNumber(g.margin)) continue;
    const slot = acc[r];
    slot.n++;
    if (g.margin + g.closingSpread > 0) slot.covers++;
  }
  const out = {} as Record<Regime, { n: number; homeCoverRate: number | null }>;
  (Object.keys(acc) as Regime[]).forEach((r) => {
    const s = acc[r]!;
    out[r] = { n: s.n, homeCoverRate: s.n > 0 ? s.covers / s.n : null };
  });
  return out;
}
