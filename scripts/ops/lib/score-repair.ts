/**
 * C-254 — the repair plan for a stored final score our own source contradicts.
 *
 * C-247 established the damage and C-248 shipped the detector. Neither could
 * fix anything, so the item sat as founder-owned with no lever attached to it:
 * repairing it needs database writes and a decision. This module is the half a
 * machine can do. It turns "25 MLB rows are wrong" into an exact, reviewable
 * list of every field that would change and every settled pick whose result
 * would flip, computed with the ENGINE'S OWN GRADER so a repaired pick is
 * graded by the same function that graded it the first time.
 *
 * PURE. No database, no network, no clock, no environment. The runner that
 * uses it is dry-run by default and writes only under an explicit --execute,
 * following the precedent of scripts/ops/adjudicate-stale-picks.ts.
 *
 * WHAT IT DELIBERATELY WILL NOT DO
 *
 * 1. It will not repair a game whose source score is not strictly better
 *    evidence than the stored one. A source that agrees, or that reports a
 *    non-final state, produces no plan.
 * 2. It will not silently re-grade a pick the engine cannot grade. A pick whose
 *    grading line or selection the engine refuses is reported as UNGRADEABLE
 *    and left exactly as it is, rather than defaulted to anything.
 * 3. It will not net out changes. A repair that turns two WINs into LOSSes and
 *    two LOSSes into WINs is reported as four changed picks, not as zero. The
 *    whole point of this exercise is that the record is wrong even when the
 *    aggregate looks unchanged.
 */

import { calculatePickResult, selectGradingLine } from "@sports/prediction-engine";
import type { ScoreMismatch } from "./score-reconciliation";

/** The settled-pick fields the grader needs, exactly and only. */
export type PickForRepair = {
  readonly id: string;
  readonly pickType: "MONEYLINE" | "SPREAD" | "TOTAL";
  readonly selection: string;
  readonly line: number | null;
  readonly clvLockLine: number | null;
  readonly isPublished: boolean;
  /** Current stored result. Only WIN, LOSS and PUSH rows are re-graded. */
  readonly result: string | null;
  /** PickSignalSnapshot.settlementResult, when one is set. Write-once mirror. */
  readonly snapshotSettlementResult?: string | null;
  /** PickSettlementEvent.result, when an event exists. Frozen at expansion. */
  readonly settlementEventResult?: string | null;
};

export type PickRepair = {
  readonly pickId: string;
  readonly pickType: string;
  readonly selection: string;
  readonly isPublished: boolean;
  readonly from: string;
  readonly to: string;
  readonly changed: boolean;
};

export type UngradeablePick = {
  readonly pickId: string;
  readonly pickType: string;
  readonly selection: string;
  readonly reason: string;
};

/**
 * Result-bearing records derived from a pick, which the settlement lanes write
 * once and never rewrite (C-256, Devin).
 *
 * `PickSignalSnapshot.settlementResult` is documented in the schema as
 * "mirrors pick.result" and is written by `settlement-snapshots.ts` under
 * `where: { pickId, settlementResult: null }`, returning "already-settled" if
 * one exists. `PickSettlementEvent.result` is a frozen event row with
 * `onDelete: Restrict`.
 *
 * Neither is rewritten by this repair, and that is deliberate: an immutable
 * event record that a correction quietly edits is no longer evidence of
 * anything. But leaving them unmentioned would make this tool produce the very
 * thing it exists to remove, so every one is counted and named, and the runner
 * refuses to execute unless the operator opts in to leaving them behind.
 */
export type StaleDerivative = {
  readonly pickId: string;
  readonly kind: "signal_snapshot" | "settlement_event";
  /** The result the derivative froze, which the repair does not change. */
  readonly frozenResult: string;
  /** The result the pick will carry after the repair. */
  readonly correctedResult: string;
};

export type GameRepairPlan = {
  readonly gameId: string;
  readonly eventId: string;
  readonly matchup: string;
  readonly storedScore: { readonly home: number; readonly away: number };
  readonly sourceScore: { readonly home: number; readonly away: number };
  /** True when the stored score names a different winner than the source does. */
  readonly winnerDiffers: boolean;
  readonly picks: readonly PickRepair[];
  readonly ungradeable: readonly UngradeablePick[];
  /** Picks whose result would change. The number that matters. */
  readonly changedCount: number;
  /** Published picks whose result would change: the part the public saw. */
  readonly changedPublishedCount: number;
  /** Write-once records that would keep contradicting the repaired result. */
  readonly staleDerivatives: readonly StaleDerivative[];
  /**
   * True when this game cannot be repaired without creating a contradiction of
   * its own: at least one settled pick on it could not be re-graded, so
   * correcting the score would leave that pick's result disagreeing with the
   * score it is settled against. Refusing the whole game is the only outcome
   * that does not trade one contradiction for another.
   */
  readonly refused: boolean;
  readonly refusedReason: string | null;
};

export type RepairPlanTotals = {
  /** Games in the plan, repairable and refused together. */
  readonly games: number;
  /** Games that WILL be written. `games - repairable` are refused. */
  readonly repairable: number;
  readonly refused: number;
  readonly winnerFlips: number;
  readonly picksExamined: number;
  readonly picksChanged: number;
  readonly publishedPicksChanged: number;
  readonly ungradeable: number;
  /** Write-once records that would keep contradicting a corrected result. */
  readonly staleDerivatives: number;
};

export type RepairPlan = {
  readonly plans: readonly GameRepairPlan[];
  readonly totals: RepairPlanTotals;
};

const GRADED = new Set(["WIN", "LOSS", "PUSH"]);

/**
 * Re-grade one pick against the source score. Returns null when the pick is not
 * a settled row this repair is allowed to touch (PENDING, VOID, null): those
 * are the settlement lane's business, not this tool's.
 */
export function regradePick(
  pick: PickForRepair,
  homeTeamName: string,
  awayTeamName: string,
  sportKey: string,
  sourceHome: number,
  sourceAway: number,
): PickRepair | UngradeablePick | null {
  if (pick.result == null || !GRADED.has(pick.result)) return null;

  // The engine grades against the line it settled on: the captured line when
  // one exists, else the pick's own. Reproducing that choice here rather than
  // reading pick.line directly is what keeps a repaired SPREAD or TOTAL graded
  // the way it was originally graded.
  const line = selectGradingLine({ clvLockLine: pick.clvLockLine, line: pick.line ?? Number.NaN });
  if (pick.pickType !== "MONEYLINE" && !Number.isFinite(line)) {
    return {
      pickId: pick.id,
      pickType: pick.pickType,
      selection: pick.selection,
      reason: `no grading line: clvLockLine and line are both absent on a ${pick.pickType} pick`,
    };
  }

  let next: string;
  try {
    next = calculatePickResult(
      pick.pickType,
      pick.selection,
      Number.isFinite(line) ? line : 0,
      homeTeamName,
      sourceHome,
      sourceAway,
      sportKey,
      awayTeamName,
    );
  } catch (err) {
    return {
      pickId: pick.id,
      pickType: pick.pickType,
      selection: pick.selection,
      reason: `engine refused to grade: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  return {
    pickId: pick.id,
    pickType: pick.pickType,
    selection: pick.selection,
    isPublished: pick.isPublished,
    from: pick.result,
    to: next,
    changed: next !== pick.result,
  };
}

function isUngradeable(x: PickRepair | UngradeablePick): x is UngradeablePick {
  return "reason" in x;
}

/**
 * The full plan for one mismatched game. `mismatch` comes from
 * reconcileScores, so a game only reaches here when the source we ingest from
 * contradicts what we stored.
 */
export function planGameRepair(
  mismatch: ScoreMismatch,
  game: {
    readonly homeTeamName: string;
    readonly awayTeamName: string;
    readonly sportKey: string;
  },
  picks: readonly PickForRepair[],
): GameRepairPlan {
  const repairs: PickRepair[] = [];
  const ungradeable: UngradeablePick[] = [];
  for (const pick of picks) {
    const outcome = regradePick(
      pick,
      game.homeTeamName,
      game.awayTeamName,
      game.sportKey,
      mismatch.source.home,
      mismatch.source.away,
    );
    if (outcome == null) continue;
    if (isUngradeable(outcome)) ungradeable.push(outcome);
    else repairs.push(outcome);
  }
  const changed = repairs.filter((r) => r.changed);

  // C-256, Devin. Write-once derivatives that would keep the old result. Only
  // computed for picks whose result actually changes: a pick graded the same
  // way twice leaves nothing contradicting anything.
  const byId = new Map(picks.map((p) => [p.id, p]));
  const staleDerivatives: StaleDerivative[] = [];
  for (const r of changed) {
    const src = byId.get(r.pickId);
    if (!src) continue;
    const snap = src.snapshotSettlementResult;
    if (typeof snap === "string" && snap.length > 0 && snap !== r.to) {
      staleDerivatives.push({
        pickId: r.pickId,
        kind: "signal_snapshot",
        frozenResult: snap,
        correctedResult: r.to,
      });
    }
    const ev = src.settlementEventResult;
    if (typeof ev === "string" && ev.length > 0 && ev !== r.to) {
      staleDerivatives.push({
        pickId: r.pickId,
        kind: "settlement_event",
        frozenResult: ev,
        correctedResult: r.to,
      });
    }
  }

  // C-256, Devin. An ungradeable pick is not a footnote. Correcting the score
  // while leaving it settled against the old one manufactures a score-result
  // contradiction, which is the exact defect this tool exists to remove. The
  // game is refused whole rather than repaired in part.
  const refused = ungradeable.length > 0;

  return {
    gameId: mismatch.gameId,
    eventId: mismatch.eventId,
    matchup: mismatch.matchup,
    storedScore: { home: mismatch.stored.home, away: mismatch.stored.away },
    sourceScore: { home: mismatch.source.home, away: mismatch.source.away },
    winnerDiffers: mismatch.winnerDiffers,
    picks: repairs,
    ungradeable,
    changedCount: changed.length,
    changedPublishedCount: changed.filter((r) => r.isPublished).length,
    staleDerivatives,
    refused,
    refusedReason: refused
      ? `${ungradeable.length} settled pick(s) on this game cannot be re-graded; ` +
        `correcting the score alone would leave them settled against a score that no longer exists`
      : null,
  };
}

/** Totals across every planned game. Sums, never nets. */
export function summarizeRepairPlan(plans: readonly GameRepairPlan[]): RepairPlan {
  let winnerFlips = 0;
  let picksExamined = 0;
  let picksChanged = 0;
  let publishedPicksChanged = 0;
  let ungradeable = 0;
  let refused = 0;
  let staleDerivatives = 0;
  for (const plan of plans) {
    if (plan.winnerDiffers) winnerFlips += 1;
    if (plan.refused) refused += 1;
    picksExamined += plan.picks.length;
    // A refused game writes nothing, so its picks are not counted as changes.
    // Counting them would report a repair the tool is about to decline to make.
    if (!plan.refused) {
      picksChanged += plan.changedCount;
      publishedPicksChanged += plan.changedPublishedCount;
      staleDerivatives += plan.staleDerivatives.length;
    }
    ungradeable += plan.ungradeable.length;
  }
  return {
    plans,
    totals: {
      games: plans.length,
      repairable: plans.length - refused,
      refused,
      winnerFlips,
      picksExamined,
      picksChanged,
      publishedPicksChanged,
      ungradeable,
      staleDerivatives,
    },
  };
}

/** Human-readable plan. One line per game, one per changed pick. */
export function formatRepairPlan(plan: RepairPlan): string[] {
  const out: string[] = [];
  const t = plan.totals;
  out.push(
    `${t.games} mismatched game(s): ${t.repairable} repairable, ${t.refused} REFUSED. ` +
      `${t.winnerFlips} name a different winner. ` +
      `${t.picksChanged} of ${t.picksExamined} settled pick(s) would change result ` +
      `(${t.publishedPicksChanged} of them published).` +
      (t.ungradeable > 0 ? ` ${t.ungradeable} pick(s) UNGRADEABLE.` : "") +
      (t.staleDerivatives > 0
        ? ` ${t.staleDerivatives} write-once record(s) would keep the old result.`
        : ""),
  );
  for (const g of plan.plans) {
    out.push("");
    out.push(
      `  ${g.refused ? "REFUSED " : ""}${g.matchup}  event=${g.eventId}  ` +
        `stored ${g.storedScore.home}-${g.storedScore.away} ` +
        `-> source ${g.sourceScore.home}-${g.sourceScore.away}` +
        (g.winnerDiffers ? "  WINNER DIFFERS" : ""),
    );
    if (g.refused && g.refusedReason) out.push(`    ${g.refusedReason}`);
    for (const p of g.picks) {
      if (!p.changed) continue;
      out.push(
        `    ${g.refused ? "(not applied) " : ""}` +
          `${p.isPublished ? "PUBLISHED" : "unpublished"} ${p.pickType} "${p.selection}" ` +
          `${p.from} -> ${p.to}`,
      );
    }
    for (const u of g.ungradeable) {
      out.push(`    UNGRADEABLE ${u.pickType} "${u.selection}": ${u.reason}`);
    }
    for (const d of g.staleDerivatives) {
      out.push(
        `    STALE ${d.kind} on pick ${d.pickId}: keeps ${d.frozenResult}, ` +
          `pick becomes ${d.correctedResult} (write-once, not rewritten)`,
      );
    }
  }
  return out;
}
