/**
 * DFS adapter over the shared signal spine.
 *
 * The spine (`lib/signals/spine.ts`) holds the facts and the signed weights; this
 * module holds the two things that are DFS-specific and belong nowhere else:
 *
 *   1. `signalPenalty` — the `pen` function `optimizeOne`/`generateLineups`
 *      already accept. The solver computes `objVal(p) - pen(p)`, so a negative
 *      penalty is a boost and the bidirectional spine needs no solver change.
 *
 *   2. `adviseMode` — the contest-shape guard. A payout structure decides which
 *      objective is correct, and getting that wrong was worth roughly half the
 *      win equity on 2026-09-20 (docs/dfs/LESSONS.md, L-3).
 *
 * Everything else — weather, implied totals, vacated usage, the airwave — lives
 * in the spine so the waiver board, trade calculator, rankings and props engine
 * read the identical facts.
 */

import type { DfsPlayer } from "./dfs-slate";
import { leverage } from "./dfs-slate";
import type { Mode } from "./dfs-optimizer";
import { dfsPenalty, dfsSubject } from "@/lib/signals/apply";
import { explain, readSignals, type SignalContext, type SignalReport } from "@/lib/signals/spine";

export type { SignalContext } from "@/lib/signals/spine";
export { EMPTY_CONTEXT } from "@/lib/signals/spine";

/**
 * The penalty the optimizer consumes.
 *
 * In `leverage` mode the ownership-aware clause is switched on: `objVal` credits
 * a contrarian player `leverage(p) * 6`, and when the environment is genuinely
 * bad that credit is clawed back in proportion. This is the L-1 rule — low
 * ownership is only edge in a clean environment — and it is applied ONLY to
 * negative reads, because inflating the credit on a good environment would
 * double-count an advantage the projection already carries.
 */
export function signalPenalty(ctx: SignalContext, mode: Mode): (p: DfsPlayer) => number {
  return dfsPenalty(ctx, {
    ownershipAware: mode === "leverage",
    leverageCredit: (p: DfsPlayer) => leverage(p) * 6,
  });
}

/** Every player the signals moved, biggest absolute move first. */
export function explainSlate(slate: readonly DfsPlayer[], ctx: SignalContext): readonly SignalReport[] {
  return explain(slate.map(dfsSubject), ctx);
}

/** The spine's read on one DFS player. */
export const readPlayer = (p: DfsPlayer, ctx: SignalContext) => readSignals(dfsSubject(p), ctx);

/* ------------------------------------------------------------------ *
 * Contest-shape guard (L-3)                                           *
 * ------------------------------------------------------------------ */

export type ContestShape = {
  readonly fieldSize: number;
  readonly placesPaid: number;
  readonly singleEntry: boolean;
};

export type ModeAdvice = {
  readonly recommended: Mode;
  readonly mismatch: boolean;
  readonly reason: string;
};

/**
 * Which objective the contest actually rewards.
 *
 * A contest paying one place out of a large field is won in the right tail, so
 * the mean-maximising `cash` objective is the wrong tool. Small top-heavy fields
 * still want ceiling, but not the extreme contrarianism a six-figure field
 * demands, which is why `gpp` and not `leverage` is recommended below the cutoff.
 */
export function adviseMode(contest: ContestShape, chosen: Mode): ModeAdvice {
  const payoutRate = contest.placesPaid / Math.max(1, contest.fieldSize);
  if (payoutRate > 0.05) {
    return {
      recommended: "cash",
      mismatch: chosen !== "cash",
      reason: `${contest.placesPaid} of ${contest.fieldSize} paid (${Math.round(payoutRate * 100)}%). A floor-maximising build is correct.`,
    };
  }
  const recommended: Mode = contest.fieldSize >= 1000 ? "leverage" : "gpp";
  return {
    recommended,
    mismatch: chosen !== recommended,
    reason:
      contest.fieldSize >= 1000
        ? `${contest.placesPaid} of ${contest.fieldSize} paid in a large field. Extreme differentiation is required.`
        : `${contest.placesPaid} of ${contest.fieldSize} paid. Won in the right tail, but a small field needs ceiling, not extreme contrarianism.`,
  };
}
