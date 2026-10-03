/**
 * Honest schedule-derivable features for the Phase-0 acceptance run
 * (handoff §2 P0). Deliberately modest: the acceptance gate proves the
 * PIPELINE is leak-free, not that these features carry edge — richer
 * Phase-3 features ride the same rails later.
 *
 * The honesty-critical part is the `observedAt` stamping: every rolling
 * statistic is stamped with the END TIME OF ITS LATEST CONSTITUENT GAME —
 * the instant it became knowable — and only constituent games that ENDED
 * before the decision cutoff may contribute. The AsOfFeatureStore then
 * enforces the cutoff at serve time, so a mis-computed window here is
 * caught by the store's audit rather than silently leaking.
 */

import { AsOfFeatureStore } from "./asof-store.js";
import { proportionalDevig } from "./devig.js";
import type { GameRow } from "./game-row.js";
import type { EvalRow } from "./placebo.js";

export const SCHEDULE_FEATURE_KEYS = [
  "sched:rolling_wr_diff",
  "sched:rolling_pd_diff",
  "sched:rest_diff",
] as const;

/** Assumed game duration when stamping "this result is now knowable". */
const GAME_DURATION_MS = 4 * 3_600_000;
/** Decision cutoff: features frozen this long before kickoff. */
const DECISION_LEAD_MS = 60 * 60_000;
/** Rolling window length (games) and minimum history to emit a row. */
const WINDOW = 10;
const MIN_HISTORY = 5;

interface TeamGameRecord {
  readonly endMs: number;
  readonly won: number; // 1/0.5/0 (ties count half)
  readonly pointDiff: number;
}

export interface ScheduleFeatureResult {
  readonly rows: EvalRow[];
  /** Games skipped and why — honesty requires the denominator be explainable. */
  readonly skipped: { readonly noOdds: number; readonly noScores: number; readonly thinHistory: number; readonly tie: number };
}

/**
 * Build EvalRows from completed games with closing moneylines, ingesting
 * every feature into `store` with its honest knowable-at instant, then
 * serving the decision vector back through the store's as-of read path
 * (so the acceptance run exercises the real enforcement machinery).
 */
export function buildScheduleFeatureRows(
  games: readonly GameRow[],
  store: AsOfFeatureStore,
): ScheduleFeatureResult {
  const sorted = [...games].sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime));
  const history = new Map<string, TeamGameRecord[]>();
  const rows: EvalRow[] = [];
  const skipped = { noOdds: 0, noScores: 0, thinHistory: 0, tie: 0 };

  const rollingAsOf = (team: string, beforeMs: number): { wr: number; pd: number; knowableAt: number } | null => {
    const recs = (history.get(team) ?? []).filter((r) => r.endMs < beforeMs);
    if (recs.length < MIN_HISTORY) return null;
    const window = recs.slice(-WINDOW);
    const wr = window.reduce((a, r) => a + r.won, 0) / window.length;
    const pd = window.reduce((a, r) => a + r.pointDiff, 0) / window.length;
    const knowableAt = Math.max(...window.map((r) => r.endMs));
    return { wr, pd, knowableAt };
  };

  const lastEnd = (team: string, beforeMs: number): number | null => {
    const recs = (history.get(team) ?? []).filter((r) => r.endMs < beforeMs);
    return recs.length ? recs[recs.length - 1]!.endMs : null;
  };

  for (const g of sorted) {
    const startMs = Date.parse(g.startTime);
    const decisionMs = startMs - DECISION_LEAD_MS;
    const endMs = startMs + GAME_DURATION_MS;

    const evaluate = (): void => {
      if (g.homeScore === null || g.awayScore === null) {
        skipped.noScores += 1;
        return;
      }
      if (g.homeScore === g.awayScore) {
        skipped.tie += 1;
        return;
      }
      const { moneylineHomeDecimal: mh, moneylineAwayDecimal: ma } = g.closing;
      if (mh === null || ma === null) {
        skipped.noOdds += 1;
        return;
      }
      const devig = proportionalDevig([mh, ma]);
      if (!devig || devig[0] === undefined) {
        skipped.noOdds += 1;
        return;
      }
      const q = devig[0];
      if (!(q > 0.01 && q < 0.99)) {
        skipped.noOdds += 1;
        return;
      }

      const home = rollingAsOf(g.homeTeam, decisionMs);
      const away = rollingAsOf(g.awayTeam, decisionMs);
      const homeLast = lastEnd(g.homeTeam, decisionMs);
      const awayLast = lastEnd(g.awayTeam, decisionMs);
      if (!home || !away || homeLast === null || awayLast === null) {
        skipped.thinHistory += 1;
        return;
      }

      const iso = (ms: number) => new Date(ms).toISOString();
      store.ingest({
        entityId: g.gameId,
        featureKey: "sched:rolling_wr_diff",
        value: home.wr - away.wr,
        observedAt: iso(Math.max(home.knowableAt, away.knowableAt)),
        source: "schedule-features",
      });
      store.ingest({
        entityId: g.gameId,
        featureKey: "sched:rolling_pd_diff",
        value: home.pd - away.pd,
        observedAt: iso(Math.max(home.knowableAt, away.knowableAt)),
        source: "schedule-features",
      });
      const restHome = (startMs - homeLast) / 86_400_000;
      const restAway = (startMs - awayLast) / 86_400_000;
      store.ingest({
        entityId: g.gameId,
        featureKey: "sched:rest_diff",
        value: restHome - restAway,
        observedAt: iso(Math.max(homeLast, awayLast)),
        source: "schedule-features",
      });

      const decisionAt = iso(decisionMs);
      rows.push({
        id: g.gameId,
        decisionAt,
        eventEndAt: iso(endMs),
        features: store.vector(g.gameId, SCHEDULE_FEATURE_KEYS, decisionAt),
        y: g.homeScore > g.awayScore ? 1 : 0,
        qClose: q,
      });
    };
    evaluate();

    // Record THIS game into history AFTER evaluating it (its own result is
    // never knowable at its own decision time).
    if (g.homeScore !== null && g.awayScore !== null) {
      const rec = (team: string, pf: number, pa: number): void => {
        const list = history.get(team) ?? [];
        list.push({ endMs, won: pf > pa ? 1 : pf === pa ? 0.5 : 0, pointDiff: pf - pa });
        history.set(team, list);
      };
      rec(g.homeTeam, g.homeScore, g.awayScore);
      rec(g.awayTeam, g.awayScore, g.homeScore);
    }
  }

  return { rows, skipped };
}
