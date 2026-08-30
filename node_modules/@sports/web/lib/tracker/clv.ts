/**
 * CLV Bet Tracker — your personal, glass-box accountability ledger.
 *
 * Log the bets you actually make, then settle them with the CLOSING price for the
 * exact selection. We compute the metric that matters — Closing Line Value — plus
 * ROI and calibration. CLV is the leading indicator: beating the close
 * consistently predicts long-run edge far better than a short-run win/loss record.
 *
 * Pure functions; the UI persists to local storage. No money, no books — a record
 * keeper. Educational, not betting advice.
 */

export type BetResult = "win" | "loss" | "push" | "pending";

export type Bet = {
  readonly id: string;
  readonly date: string; // ISO
  readonly sport: string;
  readonly event: string;
  readonly market: string; // e.g. "Spread", "Total", "Moneyline"
  readonly selection: string; // e.g. "Home -3.5"
  /** American odds you got */
  readonly odds: number;
  readonly stake: number; // units
  /** American closing odds for THIS exact selection (entered at settle) */
  readonly closingOdds?: number;
  readonly result: BetResult;
};

// ─────────────── odds math ───────────────

export function americanToDecimal(a: number): number {
  return a > 0 ? 1 + a / 100 : 1 + 100 / Math.abs(a);
}

/** Implied probability from American odds (with vig — single side). */
export function impliedProb(a: number): number {
  return a > 0 ? 100 / (a + 100) : Math.abs(a) / (Math.abs(a) + 100);
}

/** Profit in units if the bet settles (win pays decimal−1, loss −stake, push 0). */
export function profit(bet: Bet): number {
  if (bet.result === "win") return Math.round(bet.stake * (americanToDecimal(bet.odds) - 1) * 100) / 100;
  if (bet.result === "loss") return -bet.stake;
  return 0; // push or pending
}

export type Clv = { readonly pp: number; readonly beat: boolean };

/**
 * CLV in percentage points of implied probability: closing implied − your implied.
 * Positive means the market moved to a shorter price than you got — you beat the close.
 */
export function clvOf(bet: Bet): Clv | null {
  if (bet.closingOdds === undefined) return null;
  const yours = impliedProb(bet.odds);
  const close = impliedProb(bet.closingOdds);
  const pp = Math.round((close - yours) * 1000) / 10; // percentage points, 1 decimal
  return { pp, beat: pp > 0 };
}

// ─────────────── portfolio ───────────────

export type Portfolio = {
  readonly total: number;
  readonly settled: number;
  readonly wins: number;
  readonly losses: number;
  readonly pushes: number;
  readonly pending: number;
  readonly record: string;
  readonly staked: number;
  readonly profit: number;
  readonly roi: number; // %
  readonly winRate: number; // % of decided bets
  /** average CLV in pp across bets with a closing price */
  readonly avgClv: number;
  /** share of CLV-graded bets where you beat the close — the leading indicator */
  readonly clvWinRate: number;
  /** Brier-style calibration over settled non-push bets (lower is better, 0..1) */
  readonly brier: number;
};

export type PublicClvArtifactRow = {
  readonly id: string;
  readonly event: string;
  readonly market: string;
  readonly result: BetResult;
  readonly clvPp: number;
  readonly beatClose: boolean;
};

export type PublicClvArtifact = {
  readonly status: "DRAFT_ONLY";
  readonly generatedAt: string;
  readonly sampleSize: number;
  readonly averageClvPp: number;
  readonly beatCloseRate: number;
  readonly roi: number;
  readonly brier: number;
  readonly rows: readonly PublicClvArtifactRow[];
  readonly note: string;
};

export function portfolio(bets: readonly Bet[]): Portfolio {
  const settledBets = bets.filter((b) => b.result !== "pending");
  const decided = bets.filter((b) => b.result === "win" || b.result === "loss");
  const wins = bets.filter((b) => b.result === "win").length;
  const losses = bets.filter((b) => b.result === "loss").length;
  const pushes = bets.filter((b) => b.result === "push").length;
  const pending = bets.filter((b) => b.result === "pending").length;

  const staked = settledBets.reduce((s, b) => s + b.stake, 0);
  const prof = settledBets.reduce((s, b) => s + profit(b), 0);

  const clvs = bets.map(clvOf).filter((c): c is Clv => c !== null);
  const avgClv = clvs.length ? Math.round((clvs.reduce((s, c) => s + c.pp, 0) / clvs.length) * 10) / 10 : 0;
  const clvWinRate = clvs.length ? Math.round((clvs.filter((c) => c.beat).length / clvs.length) * 100) : 0;

  const brierBets = decided;
  const brier = brierBets.length
    ? Math.round((brierBets.reduce((s, b) => s + Math.pow(impliedProb(b.odds) - (b.result === "win" ? 1 : 0), 2), 0) / brierBets.length) * 1000) / 1000
    : 0;

  return {
    total: bets.length,
    settled: settledBets.length,
    wins, losses, pushes, pending,
    record: pushes ? `${wins}-${losses}-${pushes}` : `${wins}-${losses}`,
    staked: Math.round(staked * 100) / 100,
    profit: Math.round(prof * 100) / 100,
    roi: staked ? Math.round((prof / staked) * 1000) / 10 : 0,
    winRate: decided.length ? Math.round((wins / decided.length) * 100) : 0,
    avgClv,
    clvWinRate,
    brier,
  };
}

export function publicClvArtifact(
  bets: readonly Bet[],
  generatedAt: string | Date = new Date()
): PublicClvArtifact {
  const rows = bets
    .map((bet) => ({ bet, clv: clvOf(bet) }))
    .filter((entry): entry is { bet: Bet; clv: Clv } => entry.clv !== null)
    .map(({ bet, clv }) => ({
      id: bet.id,
      event: bet.event,
      market: bet.market,
      result: bet.result,
      clvPp: clv.pp,
      beatClose: clv.beat,
    }));
  const p = portfolio(bets);
  const averageClvPp = rows.length
    ? Math.round((rows.reduce((sum, row) => sum + row.clvPp, 0) / rows.length) * 10) / 10
    : 0;
  const beatCloseRate = rows.length
    ? Math.round((rows.filter((row) => row.beatClose).length / rows.length) * 1000) / 1000
    : 0;

  return {
    status: "DRAFT_ONLY",
    generatedAt: typeof generatedAt === "string" ? generatedAt : generatedAt.toISOString(),
    sampleSize: rows.length,
    averageClvPp,
    beatCloseRate,
    roi: p.roi,
    brier: p.brier,
    rows,
    note:
      rows.length === 0
        ? "No CLV-graded bets are ready for a public artifact."
        : "Draft-only CLV artifact data; publication still requires the existing public-performance gate.",
  };
}

/** Calibration buckets: your implied-prob deciles vs. actual win rate. */
export type CalBucket = { readonly label: string; readonly predicted: number; readonly actual: number; readonly n: number };

export function calibration(bets: readonly Bet[]): CalBucket[] {
  const decided = bets.filter((b) => b.result === "win" || b.result === "loss");
  const buckets: { lo: number; hi: number; bets: Bet[] }[] = [];
  for (let i = 0; i < 5; i++) buckets.push({ lo: i * 0.2, hi: (i + 1) * 0.2, bets: [] });
  for (const b of decided) {
    const p = impliedProb(b.odds);
    const idx = Math.min(4, Math.floor(p / 0.2));
    buckets[idx]!.bets.push(b);
  }
  return buckets
    .filter((bk) => bk.bets.length > 0)
    .map((bk) => ({
      label: `${Math.round(bk.lo * 100)}-${Math.round(bk.hi * 100)}%`,
      predicted: Math.round((bk.bets.reduce((s, b) => s + impliedProb(b.odds), 0) / bk.bets.length) * 100),
      actual: Math.round((bk.bets.filter((b) => b.result === "win").length / bk.bets.length) * 100),
      n: bk.bets.length,
    }));
}
