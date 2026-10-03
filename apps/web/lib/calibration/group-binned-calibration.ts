/**
 * Group-binned (Mondrian) calibration view. ADDITIVE, REPORT-ONLY.
 *
 * Defect B (2026-09-19): a single pooled calibration number hides differences
 * in residual scale across strata. Measured three independent ways in this
 * repo: pooled ECE reads 0.0524 while sitting BELOW every model-version
 * stratum it is built from (0.1089, 0.0587, 0.0729, 0.1531); by sport MLB
 * n=365 carries the pooled figure while NFL n=28 reads 0.267; and an
 * independent conformal study found group quantiles 23.6 vs 14.3 with the
 * pooled value landing on the smaller group.
 *
 * The literature name is Mondrian conformal prediction (Vovk, Nouretdinov,
 * Gammerman): compute one nonconformity quantile PER GROUP, never borrow
 * across groups. Group-conditional coverage is the only conditional
 * guarantee available distribution-free (Barber, Candes, Ramdas, Tibshirani
 * 2020 prove full conditional coverage is impossible without emitting the
 * whole real line). A thin group does not inherit a neighbour's scale; it
 * REFUSES to report, and that refusal is the method working, not a gap to
 * paper over — the type below makes that refusal a distinct case a caller
 * must handle, never a null a caller can misread as zero.
 *
 * CAVEAT, load-bearing, read before building on this: Mondrian PARTITIONS a
 * score, it does not fix an inverted one. Each bin's top band can still
 * invert exactly as the pooled report's can. This module is not a repair for
 * Defect A (`compute.ts`, `CONFIDENCE_PROBABILITY_CAVEAT`) — it only stops
 * one stratum's residual scale from hiding inside another's.
 *
 * GATES NOTHING. Never imported by `calibration-eligibility.ts`. Never
 * changes a floor, a streak, or a basis tag — see the CRITICAL constraints in
 * the task this module was built for. It reads a settled sample and reports;
 * it writes nothing and it is never in the publish decision.
 */

import { clopperPearsonInterval } from "@/lib/performance/clopper-pearson-interval";
import { expectedFromConfidence, type CalibrationPickInput } from "@/lib/calibration/compute";

export interface GroupCalibrationInput extends CalibrationPickInput {
  /**
   * Bookmaker count backing the published line. 0 (or a non-positive value)
   * means a model-signal row with no book price. `null`/`undefined` means
   * unknown, and is bucketed separately ("unknown") rather than folded into
   * the "0" bucket — an unknown count is not the same fact as a confirmed
   * zero, and conflating them would corrupt both buckets' quantiles.
   */
  readonly bookmakerCount?: number | null;
}

export type BookmakerBucket = "0" | "1-2" | "3-9" | "10+" | "unknown";

export interface GroupBinKey {
  readonly sport: string;
  readonly market: string;
  readonly bookmakerBucket: BookmakerBucket;
}

/** Target coverage 1 - ALPHA = 0.90, matching the statistics lane's own Mondrian pass. */
const ALPHA = 0.1;

/**
 * Smallest n for which a FINITE Mondrian quantile exists at this alpha:
 * ceil(1/alpha) - 1. Below this, the conformal quantile would need to include
 * the whole real line to hit target coverage, so the bin refuses outright —
 * no quantile, no hit rate, nothing computed.
 */
export const MIN_QUANTILE_N = Math.ceil(1 / ALPHA) - 1; // 9

/**
 * Smallest n for roughly a 0.05 Wilson half-width at 0.90 coverage. A bin at
 * or above `MIN_QUANTILE_N` but below this computes its numbers (useful for
 * research) but is marked NOT PUBLISHABLE — a public surface must withhold it
 * the same way `MIN_PUBLISH_BUCKET_SAMPLE` withholds a thin confidence bucket
 * in `compute.ts`.
 */
export const MIN_PUBLISH_N = 138;

interface GroupBinShared {
  readonly key: GroupBinKey;
  readonly label: string;
  /** Decided (WIN/LOSS) count backing this bin. Always shown alongside any number. */
  readonly n: number;
}

export type GroupCalibrationBin =
  | (GroupBinShared & {
      readonly status: "insufficient_for_quantile";
      readonly minQuantileN: number;
    })
  | (GroupBinShared & {
      readonly status: "computed_not_publishable";
      readonly minPublishN: number;
      /** Mondrian nonconformity quantile for this group only. Never borrowed. */
      readonly qHat: number;
      readonly meanResidual: number;
      /** Decided-only win rate, same convention as `compute.ts`'s buckets. */
      readonly hitRate: number;
      /** Share of this group's own residuals at or under its own qHat. */
      readonly coverage: number;
      readonly clopperPearsonLow: number | null;
      readonly clopperPearsonHigh: number | null;
    })
  | (GroupBinShared & {
      readonly status: "published";
      readonly qHat: number;
      readonly meanResidual: number;
      readonly hitRate: number;
      readonly coverage: number;
      readonly clopperPearsonLow: number | null;
      readonly clopperPearsonHigh: number | null;
    });

export interface GroupBinnedCalibrationReport {
  readonly bins: readonly GroupCalibrationBin[];
  readonly alpha: number;
  readonly minQuantileN: number;
  readonly minPublishN: number;
  readonly note: string;
}

function bookmakerBucket(count: number | null | undefined): BookmakerBucket {
  if (count === null || count === undefined || !Number.isFinite(count)) return "unknown";
  if (count <= 0) return "0";
  if (count <= 2) return "1-2";
  if (count <= 9) return "3-9";
  return "10+";
}

function binKeyOf(row: GroupCalibrationInput): GroupBinKey {
  return {
    sport: row.sport?.trim() || "UNKNOWN",
    market: row.pickType?.trim() || "UNKNOWN",
    bookmakerBucket: bookmakerBucket(row.bookmakerCount),
  };
}

function binId(key: GroupBinKey): string {
  return `${key.sport}|${key.market}|${key.bookmakerBucket}`;
}

function binLabel(key: GroupBinKey): string {
  return `${key.sport} / ${key.market} / ${key.bookmakerBucket} books`;
}

function round(value: number, digits = 4): number {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

/**
 * Compute the group-binned (Mondrian) calibration view. Pure: reads `input`,
 * writes nothing, never throws on an empty array (an empty board is a real
 * answer — zero bins — not an error).
 *
 * Only WIN/LOSS rows count toward `n`, the same decided-only convention as
 * `compute.ts`'s buckets (PUSH/VOID/PENDING carry no binary outcome).
 */
export function computeGroupBinnedCalibration(
  input: readonly GroupCalibrationInput[] = [],
): GroupBinnedCalibrationReport {
  const groups = new Map<string, { readonly key: GroupBinKey; readonly rows: GroupCalibrationInput[] }>();

  for (const row of input) {
    if (row.result !== "WIN" && row.result !== "LOSS") continue;
    const key = binKeyOf(row);
    const id = binId(key);
    const existing = groups.get(id);
    if (existing) existing.rows.push(row);
    else groups.set(id, { key, rows: [row] });
  }

  const bins: GroupCalibrationBin[] = [...groups.values()]
    .sort((a, b) => binId(a.key).localeCompare(binId(b.key)))
    .map(({ key, rows }): GroupCalibrationBin => {
      const n = rows.length;
      const label = binLabel(key);

      // NO BORROWING: a thin bin refuses entirely rather than inheriting a
      // neighbour's quantile. This IS the method; it is not a gap.
      if (n < MIN_QUANTILE_N) {
        return { status: "insufficient_for_quantile", key, label, n, minQuantileN: MIN_QUANTILE_N };
      }

      const residuals = rows
        .map((row) => Math.abs((row.result === "WIN" ? 1 : 0) - expectedFromConfidence(row.confidence)))
        .sort((a, b) => a - b);

      // Standard split-conformal quantile rank; finite by construction once
      // n >= MIN_QUANTILE_N (see that constant's derivation above).
      const rank = Math.min(Math.ceil((n + 1) * (1 - ALPHA)), n);
      const qHat = residuals[rank - 1]!;
      const coverage = residuals.filter((r) => r <= qHat).length / n;
      const meanResidual = residuals.reduce((sum, r) => sum + r, 0) / n;
      const wins = rows.filter((row) => row.result === "WIN").length;
      const hitRate = wins / n;
      const band = clopperPearsonInterval(wins, n);

      const shared = {
        key,
        label,
        n,
        qHat: round(qHat),
        meanResidual: round(meanResidual),
        hitRate: round(hitRate),
        coverage: round(coverage),
        clopperPearsonLow: band ? round(band.low) : null,
        clopperPearsonHigh: band ? round(band.high) : null,
      };

      return n >= MIN_PUBLISH_N
        ? { status: "published", ...shared }
        : { status: "computed_not_publishable", minPublishN: MIN_PUBLISH_N, ...shared };
    });

  return {
    bins,
    alpha: ALPHA,
    minQuantileN: MIN_QUANTILE_N,
    minPublishN: MIN_PUBLISH_N,
    note:
      `Mondrian conformal: one quantile per (sport, market, bookmaker-count) group, no ` +
      `borrowing across groups. A group below ${MIN_QUANTILE_N} decided picks refuses a ` +
      `quantile outright. A group at or above ${MIN_QUANTILE_N} but below ${MIN_PUBLISH_N} ` +
      "computes its numbers for research but is not publishable. This view gates nothing, " +
      "changes no floor, streak or basis tag, and is never read by calibration-eligibility.ts. " +
      "It partitions the confidence score; it does not repair an inverted one (see " +
      "compute.ts's CONFIDENCE_PROBABILITY_CAVEAT).",
  };
}
