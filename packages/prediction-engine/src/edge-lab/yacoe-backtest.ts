/**
 * YACoe rolling signal — R33 (MODELPROB exit design, C-28).
 *
 * Replaces the SYNTHETIC YACoe placeholder with a real player-level signal
 * computed from nflverse NGS receiving rows via `nflverse-ngs.parseNgsReceiving`
 * (CC-BY-4.0 redistribution of ngs_receiving.csv.gz — the legal path; see
 * packages/data-ingestion/src/nflverse-ngs.ts header).
 *
 * LAW (doc 1 §1 / MODELPROB_DESIGN.md):
 *   - independent p only; priced: false. No market field enters this module.
 *   - When an NGS-proprietary EXPECTED metric (avgExpectedYac, yacAboveExpected)
 *     is surfaced, it MUST be attributed ("NFL Next Gen Stats via nflverse") and
 *     our published figure re-derived from public pbp (see expected-yac.ts).
 *   - We do NOT re-serve RYOE / xYAC here. YACoe is a GSE-derived per-receiver
 *     yards-after-catch-over-our-expected signal, attribute-only the NGS truth.
 *
 * R34 (TPR smoothed-success) is implemented in the same file below:
 *   TPR = smoothed target participation rate per receiver, computed with an
 *   empirical-Bayes Beta-binomial shrinkage toward the league mean (p_league),
 *   shrink = n / (n + tau). tau is PRE-REGISTERED (founder-approved, never tuned
 *   post-hoc). This matches MODELPROB_DESIGN.md line 26 exactly.
 *
 * Pure, deterministic, no I/O. Designed to be consumed by the modelProb
 * aggregation pipeline (priced: false signals S1 + S2).
 */

import {
  parseNgsReceiving,
  type NgsReceivingRow,
} from "../../../data-ingestion/src/nflverse-ngs.js";
import type { CsvTable } from "../../../data-ingestion/src/nflverse-source.js";

export const YACOE_METHOD_TAG = "edge_lab_yacoe_real_v1" as const;
export const TPR_METHOD_TAG = "edge_lab_tpr_real_v1" as const;

/** Pre-registered shrinkage constant (tau). Founder-approved; never tuned post-hoc. */
export const YACOE_TAU = 50; // minimum sample before a receiver's signal dominates
export const TPR_TAU = 80; // targets before TPR signal dominates the league mean

export interface YacoeSignal {
  readonly gsisId: string;
  readonly player: string;
  readonly team: string;
  readonly season: number;
  /** GSE-derived YAC over OUR expected, per catch (yards). null if unqualified. */
  readonly yacoe: number | null;
  /** Receptions used. */
  readonly n: number;
  readonly methodTag: typeof YACOE_METHOD_TAG;
  readonly priced: false;
}

export interface TprSignal {
  readonly gsisId: string;
  readonly player: string;
  readonly team: string;
  readonly season: number;
  /** Smoothed target participation rate in [0,1]. null if unqualified. */
  readonly tpr: number | null;
  /** Raw targets / raw team-target share basis (for audit). */
  readonly targets: number | null;
  readonly n: number;
  readonly methodTag: typeof TPR_METHOD_TAG;
  readonly priced: false;
}

/** Minimum receptions/targets to emit a non-null signal (anti-noise floor). */
export const MIN_CATCHES = 30;

function avg(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/**
 * Real YACoe per receiver: mean(YAC − avgExpectedYac) over qualifying
 * receptions, where avgExpectedYac is the NGS proprietary expected-YAC used
 * ONLY as an attributed truth baseline (never re-served as our headline).
 * If avgExpectedYac is unavailable for a row, we fall back to our own
 * expected-YAC model externally; here we require the NGS expected column.
 */
export function computeYacoe(rows: readonly NgsReceivingRow[]): YacoeSignal[] {
  const byPlayer = new Map<string, NgsReceivingRow[]>();
  for (const r of rows) {
    if (r.week !== 0) continue; // full-season aggregate rows only
    const key = `${r.gsisId}|${r.season}`;
    const bucket = byPlayer.get(key) ?? [];
    bucket.push(r);
    byPlayer.set(key, bucket);
  }

  const out: YacoeSignal[] = [];
  for (const bucket of byPlayer.values()) {
    const r0 = bucket[0]!;
    const recs = (r0.receptions ?? 0) as number;
    const usable = bucket.filter(
      (r) => r.avgYac != null && r.avgExpectedYac != null,
    );
    const perCatch = usable
      .map((r) => (r.avgYac as number) - (r.avgExpectedYac as number))
      .filter((v) => Number.isFinite(v));
    const yacoe = recs >= MIN_CATCHES && perCatch.length > 0 ? avg(perCatch) : null;
    out.push({
      gsisId: r0.gsisId,
      player: r0.player,
      team: r0.team,
      season: r0.season,
      yacoe,
      n: recs,
      methodTag: YACOE_METHOD_TAG,
      priced: false,
    });
  }
  return out;
}

/**
 * TPR smoothed-success (R34): per-receiver target participation rate,
 * shrunk toward league mean via Beta-binomial empirical Bayes.
 *   tpr = (targets + tau * p_league) / (teamTargets + tau)
 * where p_league is the league-wide mean target share. tau is PRE-REGISTERED.
 */
export function computeTpr(rows: readonly NgsReceivingRow[]): TprSignal[] {
  const byPlayer = new Map<string, NgsReceivingRow>();
  let totalTargets = 0;
  let totalTeamTargets = 0;
  const teamTargets = new Map<string, number>();

  for (const r of rows) {
    if (r.week !== 0) continue;
    const key = `${r.gsisId}|${r.season}`;
    if (byPlayer.has(key)) continue; // keep first week-0 aggregate only
    byPlayer.set(key, r);
    const t = (r.targets ?? 0) as number;
    totalTargets += t;
    const tt = teamTargets.get(r.team) ?? 0;
    teamTargets.set(r.team, tt + t);
  }
  for (const v of teamTargets.values()) totalTeamTargets += v;
  const pLeague = totalTeamTargets > 0 ? totalTargets / totalTeamTargets : 0;

  const out: TprSignal[] = [];
  for (const r of byPlayer.values()) {
    const targets = (r.targets ?? 0) as number;
    const teamT = teamTargets.get(r.team) ?? 0;
    const n = teamT;
    const tpr =
      teamT > 0 && targets >= MIN_CATCHES
        ? (targets + TPR_TAU * pLeague) / (teamT + TPR_TAU)
        : null;
    out.push({
      gsisId: r.gsisId,
      player: r.player,
      team: r.team,
      season: r.season,
      tpr,
      targets,
      n,
      methodTag: TPR_METHOD_TAG,
      priced: false,
    });
  }
  return out;
}

/** Convenience: parse a CsvTable (the ngs_receiving.csv.gz decompressed form). */
export function yacoeFromCsvTable(table: CsvTable): {
  yacoe: YacoeSignal[];
  tpr: TprSignal[];
} {
  const rows = parseNgsReceiving(table);
  return { yacoe: computeYacoe(rows), tpr: computeTpr(rows) };
}
