/**
 * NGS receiving → independent, market-free player signals (Q2 / C-28).
 *
 * Both falsifier SURVIVORS live in ONE nflverse table — `avg_separation`
 * (logM 44.3) and `targets` (logM 33.1) are columns of the same
 * `ngs_receiving.csv.gz` release asset, at player-week grain, 2016→current.
 * They are not two independent ingestions; and because `targets` is the count
 * `avg_separation` was averaged over, S2 doubles as the natural sample size `n`
 * for S1 in MODELPROB_DESIGN.md's `shrink = n / (n + tau)`. Signal and its own
 * `n`, already joined — which removes the usual ambiguity about where `n` comes
 * from.
 *
 * ATTRIBUTION (required by the clearance verdict for source_id "nflverse"):
 *   Data from nflverse (https://github.com/nflverse), CC-BY-4.0.
 * Acquired via the licensed nflverse mirror, NOT by scraping nextgenstats.nfl.com.
 * checkClearance() 2026-08-26: nflverse allowed=true; nextgenstats.nfl.com
 * allowed=false (SOURCE_NOT_REGISTERED). See
 * reports/rights/2026-08-26-scraped-sources-clearance-memo.md.
 *
 * TRUNCATED POPULATION — a stated design decision, not an accident of the feed.
 * NGS publishes a weekly row only for player-weeks clearing a volume threshold:
 * the minimum weekly `targets` value anywhere in the file is 5, and there are no
 * zero-target rows. So the league baseline computed from these rows is the mean
 * and spread of QUALIFIED receivers, not of the league. modelProb is therefore
 * scoped to the qualified population and says so. This is close to aligned with
 * the spec rather than opposed to it: players below the threshold are exactly the
 * population where n < minimum_n should return null anyway. But it is a real
 * distributional bound and must not be read as league-wide.
 *
 * LAW: zero market data. No line, price, spread, total, consensus, devig or
 * confidence is read here or reachable from here. `priced: false` by
 * construction.
 *
 * ── Why this file re-declares the week-0 constant ──
 * packages/prediction-engine/package.json declares only "@sports/types", so by
 * the letter of the manifest this package cannot import
 * packages/data-ingestion/src/nflverse-ngs.ts's NGS_FULL_SEASON_WEEK. The
 * edge-lab/loaders/* family documents its legal/consistency posture locally for
 * the same reason (see loaders/mlb-games.ts). The canonical declaration is
 * nflverse-ngs.ts:32; this must stay in step with it.
 *
 * ── The three traps, all measured on the real file, not assumed ──
 * 1. `week == 0` is the REGULAR-SEASON SUMMARY row, not week zero. 1,251 of
 *    14,731 rows (8.5%) are summaries. Aggregating without filtering counts
 *    every player-season twice. Use weekly rows OR summary rows, never both.
 * 2. `avg_separation` is ALREADY an average, so combining weeks needs a
 *    target-WEIGHTED mean. Measured against NGS's own week-0 summary:
 *      - over all 1,251 player-seasons: weighting cuts mean absolute error
 *        15.0% (0.1195 vs 0.1407 yards)
 *      - over the 85 player-seasons (6.8%) whose weekly rows ACTUALLY SUM to
 *        the season summary: weighting is EXACT — MAE 0.00017 vs 0.0523, a
 *        99.68% reduction, the residue being float rounding.
 *    The 15% figure UNDERSTATES the case. NGS emits a weekly row only for weeks
 *    a player cleared a threshold (minimum weekly targets observed = 5; there
 *    are no zero-target weekly rows), so for 93.2% of player-seasons the weekly
 *    sum is short of the season total and BOTH reconstructions carry the same
 *    missing-week error. Corrected after an adversarial recompute.
 * 3. NGS begins in 2016. Earlier seasons are ABSENT, not zero — a null coerced
 *    to 0.0 would manufacture signal out of absence.
 */

/** NGS ships the full-season aggregate as week 0. Canonical: nflverse-ngs.ts:32. */
export const NGS_SEASON_SUMMARY_WEEK = 0;

/** Next Gen Stats tracking coverage begins in 2016. Before that: absent, not zero. */
export const NGS_FIRST_SEASON = 2016;

export interface NgsReceivingRow {
  readonly playerGsisId: string;
  readonly season: number;
  readonly seasonType: string; // REG | POST
  readonly week: number; // 0 = full-season aggregate
  readonly targets: number;
  /** Mean separation in yards at catch/incompletion, over `targets` targets. */
  readonly avgSeparation: number | null;
}

export interface PlayerSeasonReceivingSignal {
  readonly playerGsisId: string;
  readonly season: number;
  /** Target-weighted mean separation across the player's weekly rows. */
  readonly avgSeparation: number | null;
  /** Total targets — S2, and the sample size backing avgSeparation. */
  readonly targets: number;
  readonly weeks: number;
  readonly priced: false;
}

export class NgsSeasonRangeError extends Error {
  constructor(season: number) {
    super(
      `NGS coverage begins in ${NGS_FIRST_SEASON}; season ${season} is absent, not zero`,
    );
    this.name = "NgsSeasonRangeError";
  }
}

/** True for a per-week row (week >= 1). The week-0 summary is NOT a weekly row. */
export function isWeeklyRow(row: NgsReceivingRow): boolean {
  return row.week > NGS_SEASON_SUMMARY_WEEK;
}

/** True for the full-season aggregate row NGS ships as week 0. */
export function isSeasonSummaryRow(row: NgsReceivingRow): boolean {
  return row.week === NGS_SEASON_SUMMARY_WEEK;
}

/**
 * Fold weekly rows into per-player-season signals.
 *
 * Week-0 summary rows are EXCLUDED — mixing them with weekly rows double-counts
 * every player-season (trap 1). Separation is combined target-weighted, never as
 * a mean of means (trap 2). Rows before NGS coverage throw rather than silently
 * contributing zero (trap 3).
 *
 * Pure. No I/O. No market data.
 */
export function aggregateSeasonSignals(
  rows: readonly NgsReceivingRow[],
  opts: { readonly seasonType?: string } = {},
): readonly PlayerSeasonReceivingSignal[] {
  const seasonType = opts.seasonType ?? "REG";
  const acc = new Map<
    string,
    { playerGsisId: string; season: number; targets: number; sepWeighted: number; sepTargets: number; weeks: number }
  >();

  for (const row of rows) {
    if (row.season < NGS_FIRST_SEASON) throw new NgsSeasonRangeError(row.season);
    if (row.seasonType !== seasonType) continue;
    if (!isWeeklyRow(row)) continue; // trap 1
    if (!row.playerGsisId) continue;
    if (!Number.isFinite(row.targets) || row.targets <= 0) continue;

    const key = `${row.playerGsisId}:${row.season}`;
    let cell = acc.get(key);
    if (!cell) {
      cell = {
        playerGsisId: row.playerGsisId,
        season: row.season,
        targets: 0,
        sepWeighted: 0,
        sepTargets: 0,
        weeks: 0,
      };
      acc.set(key, cell);
    }
    cell.targets += row.targets;
    cell.weeks += 1;
    if (row.avgSeparation !== null && Number.isFinite(row.avgSeparation)) {
      cell.sepWeighted += row.avgSeparation * row.targets; // trap 2
      cell.sepTargets += row.targets;
    }
  }

  return [...acc.values()].map((c) => ({
    playerGsisId: c.playerGsisId,
    season: c.season,
    // Honest null: a player with targets but no charted separation has an
    // UNKNOWN separation, not a zero one.
    avgSeparation: c.sepTargets > 0 ? c.sepWeighted / c.sepTargets : null,
    targets: c.targets,
    weeks: c.weeks,
    priced: false as const,
  }));
}

/**
 * Pair a season's signals with the SAME player's next-season signals.
 * This is the t -> t+1 persistence frame: strictly forward, so it cannot leak
 * the target season into the prior it is meant to be tested against.
 */
export function pairConsecutiveSeasons(
  signals: readonly PlayerSeasonReceivingSignal[],
  season: number,
): readonly { readonly prior: PlayerSeasonReceivingSignal; readonly next: PlayerSeasonReceivingSignal }[] {
  const bySeason = new Map<string, PlayerSeasonReceivingSignal>();
  for (const s of signals) bySeason.set(`${s.playerGsisId}:${s.season}`, s);
  const out: { prior: PlayerSeasonReceivingSignal; next: PlayerSeasonReceivingSignal }[] = [];
  for (const s of signals) {
    if (s.season !== season) continue;
    const next = bySeason.get(`${s.playerGsisId}:${season + 1}`);
    if (next) out.push({ prior: s, next });
  }
  return out;
}
