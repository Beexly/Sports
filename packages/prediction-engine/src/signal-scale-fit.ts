/**
 * Per-key scale + weight fit for the `signals` ledger.
 *
 * WHY THIS MODULE EXISTS. `signals` shipped 118,462 rows (measured 2026-09-30)
 * with `weight = 1` and `confidence = 1` on every row of every key, while the
 * ten persisted keys sit on ten incomparable raw scales:
 *
 *     pgs.target_share      sd 0.093     pgs.fantasy_ppr   sd 8.017
 *     pgs.rushing_epa       sd 2.726     pgs.receiving_epa sd 3.296
 *     injury.availability   sd 0.500     ngs.avg_separation sd 1.020
 *     ngs.cpoe              sd 7.820     pgs.passing_epa   sd 9.626
 *
 * A uniform weight over unnormalized values makes the composite an
 * unweighted mean of ten different units, so whichever key happens to carry
 * the largest raw magnitude (`pgs.passing_epa`, +-35) drowns out the one with
 * the most precision (`pgs.target_share`, +-0.067). The score is arithmetically
 * real and semantically meaningless. This module produces the two things that
 * make it mean something: a SHARED SCALE and a FITTED WEIGHT.
 *
 * TWO LAWS, both forced by measurement rather than taste.
 *
 * 1. THE SCALE IS A MEASUREMENT. `anchor`/`spread` come from the caller's
 *    observed population (Welford, via `censusAnchors` semantics). A key below
 *    the row floor earns NO anchor and is refused, because a mean over a handful
 *    of rows is a fabricated baseline wearing a measurement's clothes. A key with
 *    no anchor cannot be placed on the shared scale at all, so it does not get a
 *    vote — it is not written with a raw value masquerading as a normalized one.
 *
 * 2. THE WEIGHT IS FITTED AGAINST A SETTLED OUTCOME, WITHIN PLAYER. The naive
 *    fit says `pgs.fantasy_ppr` correlates 0.373 with next-week fantasy points.
 *    That number is mostly IDENTITY, not forecast: remove the player fixed
 *    effect and the same key measures 0.094, and in 2024 alone the between-player
 *    0.314 collapses to 0.0046. A weight built on the raw correlation would
 *    claim predictive power ~4x the data supports — and ~70x in the single-season
 *    case. So the weight is fitted on the WITHIN-player correlation, which is
 *    what the key would add to a forecast that already knows who the player is.
 *
 *    Evidence is counted in DISTINCT FIXTURES, never rows, for the same reason
 *    `tune-signal-weights-grouped.ts` counts clusters: 24,497 `pgs.fantasy_ppr`
 *    rows come from only 125 independent games, and the rows inside one game
 *    are one observation of evidence, not 200.
 *
 * WHAT THE FIT ACTUALLY SAYS (measured 2026-09-30, seasons 2020-2025, 118,462
 * rows; reproduced by `apps/web/scripts/fit-signal-scales.mjs`):
 *
 *     pgs.fantasy_ppr    within r 0.094   125 fixtures   weight 0.105  EARNED
 *     pgs.target_share   within r 0.091   125 fixtures   weight 0.102  EARNED
 *     pgs.receiving_epa  within r 0.025   125 fixtures   weight 0.028  earned
 *     pgs.rushing_epa    within r 0.004   125 fixtures   weight 0.004  earned
 *     pgs.passing_epa    within r 0.002   125 fixtures   weight 0.003  earned
 *     injury.availability within r 0.063    23 fixtures  weight 0      too few games
 *     ngs.*  (4 keys)    unjoinable: entityId is a gsisId and 0 of 380 gsis
 *                        match a playerId, so no outcome can be joined
 *     snap.* (3 keys)    never written: all 31,100 snap_counts rows have a NULL
 *                        playerId, so the writer projects nothing
 *
 * Seven of ten keys earn weight 0, and that is the finding, not a failure. The
 * two that earned weight are the two with a joinable id and 125 games of
 * evidence behind them. Weight 0 means "present, honest, and currently not
 * allowed to move a score" — never "dropped", and never back-filled with a
 * plausible-looking constant.
 *
 * Determinism: no wall clock, no `Math.random`, no `process.env`, no db. The
 * same observations produce byte-identical output, which is what makes the
 * committed table in `signal-scale-table.ts` diffable between refits.
 */

import { censusAnchors, MIN_CENSUS_ROWS } from "./signal-anchor-census.js";
import { normalizeReading } from "./signal-ledger-populator.js";
import { multiplierFrom, pointBiserial } from "./tune-signal-weights-grouped.js";

/**
 * Evidence floor, counted in DISTINCT FIXTURES. Matches MIN_GROUPS in
 * `tune-signal-weights-grouped.ts` so the two tuners cannot drift apart.
 */
export const MIN_SCALE_FIXTURES = 100;

/**
 * Why a key did or did not earn a weight. Every value here is a real fitted
 * state; there is no "defaulted" case, because a defaulted weight is precisely
 * the thing this module exists to delete.
 */
export type ScaleVerdict =
  /** Fit passed the floors. The weight is earned by the within-player correlation. */
  | "earned"
  /** Below the fixture floor, so the correlation is not separable from noise. */
  | "insufficient-fixtures"
  /** The key's entity id joins no settled outcome, so nothing can be fitted. */
  | "unjoinable-outcome"
  /** No reading survived, so there is no population to fit against. */
  | "no-readings";

export interface SignalScaleObservation {
  /** Signal key, e.g. "pgs.target_share". */
  readonly key: string;
  /** The RAW source reading, unnormalized. */
  readonly value: number;
}

export interface SignalOutcomeObservation {
  readonly key: string;
  /**
   * The entity the reading belongs to. REQUIRED: the within-player fit demeans
   * within this, and omitting it silently converts the fit back into the
   * between-player number this module exists to reject.
   */
  readonly entityId: string;
  /**
   * The independent unit — for NFL, the fixture identity. REQUIRED, and the
   * caller resolves it: two rows sharing a `fixtureKey` are one observation of
   * evidence, not two.
   */
  readonly fixtureKey: string;
  /** The RAW source reading, unnormalized. */
  readonly value: number;
  /** SETTLED outcome, 1/0. PUSH/VOID must be excluded upstream, never coerced. */
  readonly outcome: 0 | 1;
}

export interface SignalScale {
  readonly key: string;
  /** Population mean of the raw readings. NaN when no anchor was earned. */
  readonly anchor: number;
  /** Population standard deviation. NaN when no anchor was earned. */
  readonly spread: number;
  /** Rows carrying this key with a finite reading. */
  readonly n: number;
  /** Fitted base weight (>= 0). Zero unless the key earned one. */
  readonly weight: number;
  /** WITHIN-player correlation against the settled outcome. 0 when unfit. */
  readonly withinCorrelation: number;
  /**
   * BETWEEN-player correlation, kept ONLY so the report can show how much of the
   * naive fit was identity. It is never used as a weight.
   */
  readonly betweenCorrelation: number;
  /** Distinct fixtures backing the fit. Drives the floor, not the row count. */
  readonly fixtures: number;
  /** Distinct entities. */
  readonly entities: number;
  readonly verdict: ScaleVerdict;
  /** Plain-language reason, always populated. Never silently dropped. */
  readonly reason: string;
}

export interface SignalScaleTable {
  readonly scales: readonly SignalScale[];
  /** Anchors in the `AnchorTable` shape the ledger adapters consume. */
  readonly anchors: Readonly<Record<string, { anchor: number; spread: number }>>;
  /** Weights in `Record<key, weight>` shape. */
  readonly weights: Readonly<Record<string, number>>;
  readonly measuredCount: number;
  readonly zeroWeightCount: number;
}

export interface FitSignalScalesOptions {
  /**
   * Every key the caller intends to project. REQUIRED and must be complete: a
   * key absent from this list is indistinguishable from a key that was simply
   * never observed, and that second reading is the one that hides a dead
   * producer.
   */
  readonly keys: readonly string[];
  /** Raw readings, for the anchor/spread census. */
  readonly observations: readonly SignalScaleObservation[];
  /** Readings joined to a settled outcome, for the weight fit. */
  readonly outcomes?: readonly SignalOutcomeObservation[];
  /** Anchor row floor. Defaults to the census module's own MIN_CENSUS_ROWS. */
  readonly minRows?: number;
  /** Fixture floor. Defaults to MIN_SCALE_FIXTURES. */
  readonly minFixtures?: number;
}

function isFiniteNumber(n: number): boolean {
  return typeof n === "number" && Number.isFinite(n);
}

/**
 * Residual correlation, computed directly as Pearson on the centered inputs.
 *
 * `pointBiserial` is used for the BETWEEN-player number because that is what it
 * was written for. Within-player residuals are not 0/1 any more — they are
 * centered outcome rates — so re-binarizing them (as a point-biserial helper
 * would) would throw away the variation the whole method depends on. Pearson on
 * the two residual series is the correct estimator for a fixed-effects fit.
 */
function residualCorrelation(dv: readonly number[], dy: readonly number[]): number {
  const n = Math.min(dv.length, dy.length);
  if (n < 2) return 0;
  let mv = 0;
  let my = 0;
  for (let i = 0; i < n; i++) {
    mv += dv[i] as number;
    my += dy[i] as number;
  }
  mv /= n;
  my /= n;
  let num = 0;
  let sv = 0;
  let sy = 0;
  for (let i = 0; i < n; i++) {
    const a = (dv[i] as number) - mv;
    const b = (dy[i] as number) - my;
    num += a * b;
    sv += a * a;
    sy += b * b;
  }
  const den = Math.sqrt(sv * sy);
  if (den <= 0) return 0;
  const r = num / den;
  return Number.isFinite(r) ? Math.min(1, Math.max(-1, r)) : 0;
}

/**
 * Fit a shared scale and a real weight for every key.
 *
 * Pure: reads nothing, writes nothing, and never consults the clock. A key
 * earns an anchor only above the row floor and a weight only above the fixture
 * floor with a joinable outcome; everything else is REPORTED with a reason
 * rather than defaulted.
 */
export function fitSignalScales(options: FitSignalScalesOptions): SignalScaleTable {
  const { keys } = options;
  const minRows = options.minRows ?? MIN_CENSUS_ROWS;
  const minFixtures = options.minFixtures ?? MIN_SCALE_FIXTURES;

  // 1. The scale. Reuse the census so the anchor is measured by the same code
  //    that the ops report already publishes, rather than a second estimator
  //    that could disagree with it.
  const census = censusAnchors(
    keys,
    options.observations.map((o) => ({ key: o.key, value: o.value })),
    { minRows },
  );

  // 2. The weight, per key, from the outcomes that actually joined.
  interface Fit {
    rows: number;
    fixtures: number;
    entities: number;
    within: number;
    between: number;
  }
  const fits = new Map<string, Fit>();
  const grouped = new Map<string, SignalOutcomeObservation[]>();
  for (const o of options.outcomes ?? []) {
    if (!isFiniteNumber(o.value)) continue;
    const arr = grouped.get(o.key);
    if (arr) arr.push(o);
    else grouped.set(o.key, [o]);
  }

  for (const [key, rows] of grouped) {
    if (rows.length < 2) continue;

    const fixtures = new Set<string>();
    const entities = new Set<string>();
    for (const r of rows) {
      fixtures.add(r.fixtureKey);
      entities.add(r.entityId);
    }

    const between = pointBiserial(
      rows.map((r) => r.value),
      rows.map((r) => r.outcome),
    );

    // Center within entity, then correlate the residuals.
    const sums = new Map<string, { n: number; sv: number; so: number }>();
    for (const r of rows) {
      const acc = sums.get(r.entityId) ?? { n: 0, sv: 0, so: 0 };
      acc.n += 1;
      acc.sv += r.value;
      acc.so += r.outcome;
      sums.set(r.entityId, acc);
    }
    const dv: number[] = [];
    const dy: number[] = [];
    for (const r of rows) {
      const acc = sums.get(r.entityId);
      if (!acc || acc.n < 2) continue;
      dv.push(r.value - acc.sv / acc.n);
      dy.push(r.outcome - acc.so / acc.n);
    }
    const within = residualCorrelation(dv, dy);

    fits.set(key, { rows: rows.length, fixtures: fixtures.size, entities: entities.size, within, between });
  }

  // 3. Assemble. Sorted by key so the table is diffable between refits.
  const scales: SignalScale[] = [];
  const anchors: Record<string, { anchor: number; spread: number }> = {};
  const weights: Record<string, number> = {};

  for (const entry of census.entries) {
    const key = entry.key;
    const fit = fits.get(key);
    const fixtures = fit?.fixtures ?? 0;
    const entities = fit?.entities ?? 0;
    const within = fit?.within ?? 0;
    const between = fit?.between ?? 0;

    let weight = 0;
    let verdict: ScaleVerdict;
    let reason: string;

    if (entry.status !== "measured") {
      verdict = "no-readings";
      reason =
        entry.status === "zero-variance"
          ? `every observed reading is identical (n=${entry.n}), so there is no scale to place it on`
          : `only ${entry.n} usable readings, below the row floor of ${minRows}`;
    } else if (!fit) {
      verdict = "unjoinable-outcome";
      reason = "no settled outcome joins this key, so no weight can be fitted (0, not a guess)";
    } else if (fixtures < minFixtures) {
      verdict = "insufficient-fixtures";
      reason = `${fixtures} independent fixtures, below the floor of ${minFixtures}; the correlation is not separable from noise`;
    } else {
      // Earned. The weight is the within-player correlation, evidence-scaled by
      // the same sqrt(n/floor) law the repo's other tuners use, and the SIGN is
      // preserved: a key that anti-predicts earns a negative weight rather than
      // being silently dropped.
      weight = multiplierFrom(within, fixtures, minFixtures);
      verdict = "earned";
      reason = `within-player r=${within.toFixed(4)} over ${fixtures} fixtures`;
    }

    if (entry.status === "measured") {
      anchors[key] = { anchor: entry.anchor, spread: entry.spread };
    }
    weights[key] = weight;

    scales.push({
      key,
      anchor: entry.anchor,
      spread: entry.spread,
      n: entry.n,
      weight,
      withinCorrelation: within,
      betweenCorrelation: between,
      fixtures,
      entities,
      verdict,
      reason,
    });
  }

  scales.sort((a, b) => a.key.localeCompare(b.key));

  const measuredCount = Object.keys(anchors).length;
  return {
    scales,
    anchors: Object.freeze(anchors),
    weights: Object.freeze(weights),
    measuredCount,
    zeroWeightCount: scales.filter((s) => s.weight === 0).length,
  };
}

/**
 * Normalize a raw reading onto the shared directional scale (-1..1) using a
 * fitted scale.
 *
 * Returns null when the key earned no anchor. A caller that receives null must
 * DROP the row: there is no honest normalized value for a key with no measured
 * baseline, and writing the raw number into the `value` column is exactly the
 * bug this module exists to fix.
 */
export function normalizeWithScale(raw: number, scale: SignalScale | undefined): number | null {
  if (!scale || !isFiniteNumber(scale.anchor) || !isFiniteNumber(scale.spread)) return null;
  if (scale.spread <= 0) return null;
  return normalizeReading(raw, scale.anchor, scale.spread);
}

/** Render a scale table as a deterministic plain-text report. */
export function formatScaleReport(table: SignalScaleTable): string {
  const earned = table.scales.filter((s) => s.verdict === "earned");
  const zero = table.scales.filter((s) => s.verdict !== "earned");
  earned.sort((a, b) => b.weight - a.weight || a.key.localeCompare(b.key));
  zero.sort((a, b) => a.key.localeCompare(b.key));

  const lines: string[] = [];
  lines.push(
    `signal scale fit: ${table.measuredCount} keys on a shared scale, ${earned.length} earned weight, ${zero.length} at zero`,
  );
  lines.push("");
  lines.push("EARNED (weight fitted on within-player correlation vs a settled outcome)");
  if (earned.length === 0) lines.push("  (none - no key cleared the fixture floor with a joinable outcome)");
  for (const s of earned) {
    lines.push(
      `  ${s.key.padEnd(30)} weight=${s.weight.toFixed(4).padStart(7)}  within_r=${s.withinCorrelation
        .toFixed(4)
        .padStart(8)}  between_r=${s.betweenCorrelation.toFixed(4).padStart(8)}  fixtures=${String(s.fixtures).padStart(4)}`,
    );
  }
  lines.push("");
  lines.push("ZERO WEIGHT (present and honest, but not allowed to move a score)");
  for (const s of zero) {
    lines.push(
      `  ${s.key.padEnd(30)} weight=0.0000  n=${String(s.n).padStart(6)}  fixtures=${String(s.fixtures).padStart(4)}  ${s.verdict}: ${s.reason}`,
    );
  }
  return lines.join("\n");
}
