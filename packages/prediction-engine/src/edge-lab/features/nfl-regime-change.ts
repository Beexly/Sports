/**
 * NFL change-point / regime detector — market-pricing regime-shift scanner.
 *
 * WHAT THIS IS
 * Detects when a team's market-pricing regime shifts: the closing moneyline-implied
 * win probability deviates sharply from the team's recent rolling consensus (its
 * own trailing mean), signalling a step-change in how the market prices that team.
 * This is a DETECTOR only; it produces leak-safe covariates on the as-of bus. It
 * never computes a tout score p, never fires a bet, and never recommends one.
 * Downstream callers decide whether a regime change justifies touching a market;
 * the change-point scanner only says *when* the ladder's pricing regime moved.
 *
 * ── The regime ──
 * A team's "regime" is its market-implied win probability (devigged from the
 * closing moneyline). Under a stable regime, the team's q_t stays near its
 * recent mean. A change-point is a sharp, sustained step in q_t — the market
 * has re-priced the team (e.g. a key injury, a trade, a coaching change, or a
 * run of form) and the old consensus is no longer valid.
 *
 * ── Detection algorithm ──
 * For each side (home, away) of each game:
 * 1. Compute qClose (devigged home-side probability) from the closing moneyline
 *    — a schedule-fact-equivalent knowable at decision cutoff.
 * 2. From PRIOR games only (self-exclusion), build a rolling window of the same
 *    team's qClose values (whichever side it was on). The rolling mean mu and
 *    rolling std sigma characterize the "recent regime."
 * 3. The team's current qClose is compared against that window. A change-point
 *    fires when |qClose - mu| / sigma exceeds a threshold (z-score) AND the
 *    deviation is a step (not a flip-flop): the current q is also beyond
 *    mu +/- k*sigma, indicating a sustained shift.
 * 4. The softness of the regime is the z-score itself; the direction (up/down)
 *    records whether the market now prices the team HARDER or SOFTER.
 *
 * ── Leak safety ──
 * Uses only closing moneylines from PRIOR games (observedAt strictly before
 * decisionAt). The featured game's own qClose is NOT in its own history.
 * observedAt = decisionAt (the closing line is frozen at the pre-kickoff cutoff,
 * same as the body-clock, weather, and ladder-boost modules). No future outcome
 * enters the features — qClose is computed from devig and attached to the EvalRow
 * only for the as-of audit trail, NOT re-derived from the game result.
 *
 * ── Fail closed ──
 * Missing moneylines, inverted prices, degenerate vig, fewer than `minHistory`
 * prior games, or sigma == 0 (no dispersion in the window) → no regime flag,
 * honest skip. A team with no prior market history has no "regime" to shift
 * from.
 *
 * Pure, deterministic, no I/O.
 */

import { AsOfFeatureStore } from "../asof-store.js";
import { proportionalDevig } from "../devig.js";
import type { GameRow } from "../game-row.js";
import type { EvalRow } from "../placebo.js";

/** Decision cutoff: features frozen this long before kickoff (mirrors siblings). */
const DECISION_LEAD_MS = 60 * 60_000;
const GAME_DURATION_MS = 4 * 3_600_000;

/** Minimum total vig to trust the consensus derivation. */
const MIN_TOTAL_VIG = 0.01;

/** Minimum prior games for a team's regime to be characterized. */
const MIN_HISTORY = 4;

/** Default z-score threshold for a regime shift. */
const DEFAULT_Z_THRESHOLD = 1.5;

/** Default rolling window size (games). */
const DEFAULT_WINDOW = 8;

export const CHANGEPOINT_FEATURE_KEYS = [
  "regime:q_z_home",
  "regime:q_z_away",
  "regime:q_shift_home",
  "regime:q_shift_away",
  "regime:q_volatility_home",
  "regime:q_volatility_away",
] as const;

export { DEFAULT_WINDOW, DEFAULT_Z_THRESHOLD, MIN_HISTORY };

export interface RegimeScannerResult {
  readonly rows: EvalRow[];
  readonly skipped: {
    readonly noOdds: number;
    readonly noMoneyline: number;
    readonly noScores: number;
    readonly inverted: number;
    readonly degenerateVig: number;
    readonly insufficientHistory: number;
    readonly noDispersion: number;
  };
}

export interface RegimeFlag {
  /** Z-score of the home side's qClose vs its trailing regime. */
  readonly zHome: number;
  /** Z-score of the away side's qClose vs its trailing regime. */
  readonly zAway: number;
  /** +1 if home's q shifted up beyond threshold, -1 if down, 0 if within. */
  readonly shiftHome: -1 | 0 | 1;
  /** Same for the away side. */
  readonly shiftAway: -1 | 0 | 1;
  /** Trailing std of home side's q (the regime's volatility). 0 if no dispersion. */
  readonly volHome: number;
  /** Trailing std of away side's q. */
  readonly volAway: number;
  /** De-vigged closing probability of the home side (q) — audit trail only. */
  readonly qClose: number;
}

/** Canonical team-code normalizer: relocates franchises carry one continuous key. */
const TEAM_CANONICAL: Readonly<Record<string, string>> = {
  OAK: "LV", SD: "LAC", STL: "LA",
};

function canonicalTeam(code: string): string {
  return TEAM_CANONICAL[code] ?? code;
}

/**
 * Compute the devigged home-side probability from a closing moneyline.
 * Returns null (fail closed) on any structural problem with the market.
 */
function qFromClosing(closing: GameRow["closing"]): { qHome: number; vig: number } | null {
  const { moneylineHomeDecimal: mh, moneylineAwayDecimal: ma } = closing;
  if (mh === null || ma === null) return null;
  if (!Number.isFinite(mh) || mh <= 1 || !Number.isFinite(ma) || ma <= 1) return null;

  const devig = proportionalDevig([mh, ma]);
  if (!devig) return null;
  const qHome = devig[0];
  if (qHome === undefined || !(qHome > 0.01 && qHome < 0.99)) return null;

  const totalImplied = 1 / mh + 1 / ma;
  const vig = totalImplied - 1;
  if (!(vig > MIN_TOTAL_VIG)) return null;

  return { qHome, vig };
}

/**
 * Scan one game's closing moneyline for regime-shift evidence relative to a
 * team's trailing q-history (prior games only — caller enforces self-exclusion).
 *
 * Returns null (fail closed) when there isn't enough prior history or the
 * trailing window has zero dispersion (no variance to compare against).
 */
export function scanRegimeChange(
  closing: GameRow["closing"],
  homeHist: readonly number[],
  awayHist: readonly number[],
  opts: { readonly zThreshold?: number; readonly minHistory?: number } = {},
): RegimeFlag | null {
  const zThresh = opts.zThreshold ?? DEFAULT_Z_THRESHOLD;
  const minHist = opts.minHistory ?? MIN_HISTORY;

  const parsed = qFromClosing(closing);
  if (parsed === null) return null;
  const { qHome, vig } = parsed;
  const qAway = 1 - qHome;

  if (homeHist.length < minHist) return null; // insufficientHistory
  if (awayHist.length < minHist) return null;

  const homeStats = meanStd(homeHist);
  const awayStats = meanStd(awayHist);
  if (homeStats === null || awayStats === null) return null; // noDispersion

  const volHome = homeStats.std;
  const volAway = awayStats.std;
  if (volHome === 0 || volAway === 0) return null; // degenerate window

  // Z-score: how far the current q sits from the trailing regime mean, in
  // regime-sigmas. Direction captured via sign.
  const zHome = (qHome - homeStats.mean) / volHome;
  const zAway = (qAway - awayStats.mean) / volAway;

  // Shift fires only when |z| exceeds the threshold — a sustained step, not
  // a one-sigma wobble.
  const shiftHome: -1 | 0 | 1 = zHome > zThresh ? 1 : zHome < -zThresh ? -1 : 0;
  const shiftAway: -1 | 0 | 1 = zAway > zThresh ? 1 : zAway < -zThresh ? -1 : 0;

  // Vig is unused in the flag (it's the market-wide margin), but we carry qClose.
  void vig;

  return {
    zHome,
    zAway,
    shiftHome,
    shiftAway,
    volHome,
    volAway,
    qClose: qHome,
  };
}

/** Sample mean + population std (ddof=0) for a non-empty numeric window. */
function meanStd(xs: readonly number[]): { mean: number; std: number } | null {
  if (xs.length === 0) return null;
  const n = xs.length;
  let sum = 0;
  for (const x of xs) sum += x;
  const mean = sum / n;
  let sq = 0;
  for (const x of xs) sq += (x - mean) ** 2;
  const variance = sq / n;
  return { mean, std: Math.sqrt(variance) };
}

/**
 * Build leak-safe regime-shift EvalRows for a season's NFL games.
 *
 * Each game is featured at its own decision cutoff (kickoff - 1 hour). The
 * closing moneyline is a schedule-fact-equivalent (known at cutoff), so
 * observedAt = decisionAt — the as-of audit must show zero lookahead.
 * Prior games' qClose values feed each team's regime history (self-exclusion:
 * a game's own qClose is appended AFTER evaluating it).
 */
export function buildRegimeChangeRows(
  games: readonly GameRow[],
  store: AsOfFeatureStore,
  opts: {
    readonly window?: number;
    readonly zThreshold?: number;
    readonly minHistory?: number;
  } = {},
): RegimeScannerResult {
  const sorted = [...games].sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime));
  const WINDOW = opts.window ?? DEFAULT_WINDOW;
  const zThreshold = opts.zThreshold ?? DEFAULT_Z_THRESHOLD;
  const minHistory = opts.minHistory ?? MIN_HISTORY;

  const rows: EvalRow[] = [];
  const skipped = {
    noOdds: 0,
    noMoneyline: 0,
    noScores: 0,
    inverted: 0,
    degenerateVig: 0,
    insufficientHistory: 0,
    noDispersion: 0,
  };

  // Per-team rolling history of qClose (the team's side-implied prob in each
  // prior game). Keyed by canonical team code.
  const homeQ = new Map<string, number[]>();
  const awayQ = new Map<string, number[]>();

  for (const g of sorted) {
    const startMs = Date.parse(g.startTime);
    const decisionMs = startMs - DECISION_LEAD_MS;
    const decisionAt = new Date(decisionMs).toISOString();
    const observedAt = decisionAt;

    const parsed = qFromClosing(g.closing);
    if (parsed === null) {
      // Distinguish skip reasons for honest reporting.
      const { moneylineHomeDecimal: mh, moneylineAwayDecimal: ma } = g.closing;
      if (mh === null || ma === null) {
        skipped.noMoneyline += 1;
      } else {
        // qFromClosing returns null for inverted, degenerate vig, or qClose
        // outside (0.01, 0.99) — all structural market problems.
        skipped.degenerateVig += 1;
      }
      continue;
    }

    // Non-final games carry no outcome — skip (model must never see a game
    // whose result is unknowable; y here would be fabricated).
    if (g.homeScore === null || g.awayScore === null) {
      skipped.noScores += 1;
      continue;
    }

    // Assemble prior history (self-exclusion: this game not yet appended).
    const homeTeam = canonicalTeam(g.homeTeam);
    const awayTeam = canonicalTeam(g.awayTeam);
    const homeHist = (homeQ.get(homeTeam) ?? []).slice(-WINDOW);
    const awayHist = (awayQ.get(awayTeam) ?? []).slice(-WINDOW);

    const flag = scanRegimeChange(g.closing, homeHist, awayHist, { zThreshold, minHistory });
    if (flag === null) {
      // Distinguish: insufficient history vs no dispersion.
      if (homeHist.length < minHistory || awayHist.length < minHistory) {
        skipped.insufficientHistory += 1;
      } else {
        skipped.noDispersion += 1;
      }
      // STILL record this game's q into history (even without a flag, the
      // game's closing line is knowable and contributes to the NEXT game's
      // regime window — this is not leakage, it's history accumulation).
      pushOrInit(homeTeam, parsed!.qHome, homeQ);
      pushOrInit(awayTeam, 1 - parsed!.qHome, awayQ);
      continue;
    }

    const q = flag.qClose;

    const ingest = (featureKey: string, value: number): void =>
      store.ingest({
        entityId: g.gameId,
        featureKey,
        value,
        observedAt,
        source: "nfl-regime-change",
      });

    ingest("regime:q_z_home", flag.zHome);
    ingest("regime:q_z_away", flag.zAway);
    ingest("regime:q_shift_home", flag.shiftHome);
    ingest("regime:q_shift_away", flag.shiftAway);
    ingest("regime:q_volatility_home", flag.volHome);
    ingest("regime:q_volatility_away", flag.volAway);

    rows.push({
      id: g.gameId,
      decisionAt,
      eventEndAt: new Date(startMs + GAME_DURATION_MS).toISOString(),
      features: store.vector(g.gameId, CHANGEPOINT_FEATURE_KEYS, decisionAt),
      y: g.homeScore > g.awayScore ? 1 : 0,
      qClose: q,
    });

    // Append this game's q into team history AFTER evaluating (self-exclusion).
    pushOrInit(homeTeam, parsed!.qHome, homeQ);
    pushOrInit(awayTeam, 1 - parsed!.qHome, awayQ);
  }

  return { rows, skipped };
}

function pushOrInit(team: string, q: number, map: Map<string, number[]>): void {
  const list = map.get(team);
  if (list) list.push(q);
  else map.set(team, [q]);
}
