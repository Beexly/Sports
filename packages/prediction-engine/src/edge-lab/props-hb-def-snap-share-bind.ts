/**
 * Defensive snap-share covariate bind: forwards weekly PFR defensive snap
 * share (snap_count / team_def_snaps) as a context covariate into the
 * snap-share model (props-hb-def-snap-share).
 *
 * H1 Edge #4 — Defensive snap share %.
 *
 * Honesty header
 * ──────────────
 * This is a BIND, not a model. It does not invent snap counts or shares.
 *
 * The covariate bus carries the weekly PFR defensive snap count for each
 * player (def_snaps from player_stats_def). This bind forwards the
 * leak-safe weekly mean verbatim — week t for game t+1 — and never crosses
 * the same-week boundary.
 *
 * snap_share is the fraction of the team's defensive snaps the player
 * appeared in. It is a ROLE signal, not a y-axis outcome. The bind ships
 * priced:false.
 *
 * Fail-closed: if no prior per-game row exists, or snap_share is null /
 * non-finite, the sample is DROPPED — never imputed.
 *
 * Pure. No I/O. No Prisma. priced:false.
 */
import {
  latestPriorRow,
  type CovariateCell,
  type CovariateRow,
} from "./covariate-bus.js";
import type { DefSnapShareSample } from "./props-hb-def-snap-share.js";

export const DEF_SNAP_SHARE_BIND_METHOD_TAG = "def_snap_share_bind_v1" as const;

/**
 * One snap-share target that needs the covariate bus lookup.
 * The caller supplies the gsisId + kickoff week so the bus picks the
 * strictly-prior defense row.
 */
export interface SnapShareBindRequest {
  readonly gsisId: string;
  readonly season: number;
  readonly kickoffWeek: number;
  readonly snap: DefSnapShareSample;
}

/**
 * `DefSnapShareSample` enriched with leak-safe PFR defensive snap share.
 * The `games` / `snaps` fields are the model's realized inputs (unchanged);
 * `snapShare` is a weekly PFR mean, week t for game t+1 — an independent
 * context covariate, never y-axis.
 */
export interface BoundDefSnapShareSample extends DefSnapShareSample {
  readonly snapShare: CovariateCell;
}

export type SnapShareBindResult =
  | {
      readonly ok: true;
      readonly methodTag: typeof DEF_SNAP_SHARE_BIND_METHOD_TAG;
      readonly sample: BoundDefSnapShareSample;
      readonly priced: false;
    }
  | {
      readonly ok: false;
      readonly methodTag: typeof DEF_SNAP_SHARE_BIND_METHOD_TAG;
      readonly priced: false;
      readonly refuse: "no_prior_row";
    };

/** Covariate cell for snap share — PFR defensive weekly mean. */
const BUS_CELL: CovariateCell = { value: 0, grain: "week_t_for_tplus1", provenance: "weekly_pfr_def_mean" };

export function bindSnapShareSamples(
  rows: readonly CovariateRow[],
  requests: readonly SnapShareBindRequest[],
): SnapShareBindResult[] {
  const out: SnapShareBindResult[] = [];
  for (const req of requests) {
    const row = latestPriorRow(rows, req.gsisId, req.season, "defense", req.kickoffWeek);
    if (row === null) {
      out.push({ ok: false, methodTag: DEF_SNAP_SHARE_BIND_METHOD_TAG, priced: false, refuse: "no_prior_row" });
      continue;
    }

    // Read pressureRate for the cell value (snap share is the covariate).
    const share = row.snapShare;
    if (share === null || !Number.isFinite(share)) {
      out.push({ ok: false, methodTag: DEF_SNAP_SHARE_BIND_METHOD_TAG, priced: false, refuse: "no_prior_row" });
      continue;
    }

    out.push({
      ok: true,
      methodTag: DEF_SNAP_SHARE_BIND_METHOD_TAG,
      priced: false,
      sample: {
        games: req.snap.games,
        snaps: req.snap.snaps,
        snapShare: { ...BUS_CELL, value: share },
      },
    });
  }
  return out;
}

export function boundSnapShareSamples(rows: readonly CovariateRow[], requests: readonly SnapShareBindRequest[]): BoundDefSnapShareSample[] {
  return bindSnapShareSamples(rows, requests).filter((r): r is Extract<SnapShareBindResult, { ok: true }> => r.ok).map((r) => r.sample);
}
