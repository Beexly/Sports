/**
 * The Glass Ledger — public data contract (handoff §2 Phase 2).
 *
 * Founder-gated: `loadLedgerView()` returns `{ published: false, reason }`
 * unless the `PUBLISH_LEDGER` environment variable is the literal string
 * `"true"`. It defaults OFF, so nothing here is public until a founder
 * flips it in the deploy environment.
 *
 * Flipping the flag does NOT unlock fabricated or sample numbers — repo
 * rule #1 (no fake data) and handoff §1 both forbid that categorically.
 * It only unlocks the SHAPE of the page. Every value this contract can
 * ever carry is a `SubstantiatedMetric` (see `./display-guard.ts`), and
 * every one of those still has to clear `renderableMetricOrNull()` before
 * a rendering surface may show it: a coverage denominator, a Wilson or
 * Clopper-Pearson lower bound, CLV backing, and walk-forward provenance,
 * or it renders nothing.
 *
 * Today there is no live ledger chain to read from — the append-only
 * hash-chained pick store (`freeze-slate-commitments.ts`, `pick-proof-
 * receipt.ts`) has not accumulated substantiated entries yet. So even with
 * the flag on, this always resolves to the empty-but-honest shape below.
 * Wiring `seasons` / `calibration` / `significance` to the real chain is a
 * follow-up once it has live entries to show — NOT part of this build.
 */

import type { SubstantiatedMetric } from "./display-guard";

/** One row of the (currently empty) season table: SU% / ATS-vs-close / CLV / MAE. */
export interface LedgerSeasonRow {
  readonly season: string;
  readonly sport: string;
  /** Straight-up settle rate for the season. */
  readonly suPct: SubstantiatedMetric | null;
  /** Against-the-spread rate measured against the closing line. */
  readonly atsVsClose: SubstantiatedMetric | null;
  /** Realized closing-line value. */
  readonly clv: SubstantiatedMetric | null;
  /** Mean absolute error between projected and settled confidence. */
  readonly mae: SubstantiatedMetric | null;
}

/** One bucket of the reliability curve: predicted-vs-observed at a confidence band. */
export interface LedgerReliabilityBucket {
  readonly label: string;
  readonly predicted: SubstantiatedMetric | null;
  readonly observed: SubstantiatedMetric | null;
}

export interface LedgerCalibrationView {
  readonly brierScore: SubstantiatedMetric | null;
  readonly buckets: readonly LedgerReliabilityBucket[];
}

export interface LedgerSignificanceView {
  readonly settledCount: number;
  readonly targetCount: number;
  readonly lowerBoundClearsBreakeven: SubstantiatedMetric | null;
}

export type LedgerView =
  | {
      readonly published: false;
      readonly reason: string;
    }
  | {
      readonly published: true;
      readonly seasons: readonly LedgerSeasonRow[];
      readonly calibration: LedgerCalibrationView | null;
      readonly significance: LedgerSignificanceView | null;
      readonly note: string;
    };

const UNPUBLISHED_REASON =
  "The Glass Ledger is founder-gated behind the PUBLISH_LEDGER environment variable, which defaults off. No performance data is published while it is unset.";

const NO_SUBSTANTIATED_SEASONS_NOTE =
  "No substantiated seasons yet. The ledger chain has not accumulated enough live, walk-forward-provenanced entries to publish a single metric yet — every cell on this page still requires a coverage denominator, a Wilson or Clopper-Pearson lower bound, CLV backing, and walk-forward provenance before it renders. Real data wiring arrives when the chain has substantiated entries to show.";

/**
 * Reads the founder gate and returns the current public shape of the
 * Glass Ledger. Synchronous today because there is nothing to fetch yet —
 * the moment real chain data is wired in, this becomes the seam that grows
 * an `await` for the chain read.
 */
export function loadLedgerView(): LedgerView {
  if (process.env["PUBLISH_LEDGER"] !== "true") {
    return { published: false, reason: UNPUBLISHED_REASON };
  }

  return {
    published: true,
    seasons: [],
    calibration: null,
    significance: null,
    note: NO_SUBSTANTIATED_SEASONS_NOTE,
  };
}
