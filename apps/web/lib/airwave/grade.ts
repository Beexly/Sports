/**
 * Airwave Ledger — accountability scoring.
 *
 * Pure and deterministic (no RNG, no Date) so the same ledger always produces
 * the same scorecard and the maths is unit-testable.
 *
 * The accountability index is a stake-weighted credit ratio. Every SETTLED
 * claim puts "stake" on the table; HITs earn credit, MISSes earn none, and the
 * stake scales with how emphatic the on-air language was — a confident wrong
 * call costs more than a hedge. Crucially, an UNFALSIFIABLE take still posts a
 * small stake it can never recover: refusal-to-be-checkable is not free, so a
 * pundit who only emits vague hot takes scores near zero even though they are
 * never technically "wrong".
 */

import type {
  ConfidenceBand,
  Pundit,
  PunditClaim,
  PunditScorecard,
} from "./types";

/** How much "stake" each confidence band puts on a checkable call. */
const CONFIDENCE_WEIGHT: Record<ConfidenceBand, number> = {
  EMPHATIC: 1.5,
  LEAN: 1.0,
  HEDGED: 0.6,
};

/**
 * Stake posted by an unfalsifiable take. It can never earn credit, so this is
 * the cost of trading on un-checkable noise. Deliberately non-zero.
 */
const UNFALSIFIABLE_STAKE = 0.5;

type Tally = {
  total: number;
  hits: number;
  misses: number;
  pushes: number;
  unfalsifiable: number;
  pending: number;
  credit: number;
  stake: number;
};

function emptyTally(): Tally {
  return { total: 0, hits: 0, misses: 0, pushes: 0, unfalsifiable: 0, pending: 0, credit: 0, stake: 0 };
}

function applyClaim(t: Tally, claim: PunditClaim): void {
  t.total += 1;
  const w = CONFIDENCE_WEIGHT[claim.confidence];
  switch (claim.verdict) {
    case "HIT":
      t.hits += 1;
      t.credit += w;
      t.stake += w;
      break;
    case "MISS":
      t.misses += 1;
      t.stake += w;
      break;
    case "PUSH":
      t.pushes += 1;
      t.credit += w * 0.5;
      t.stake += w;
      break;
    case "UNFALSIFIABLE":
      t.unfalsifiable += 1;
      t.stake += UNFALSIFIABLE_STAKE;
      break;
    case "PENDING":
      t.pending += 1;
      break;
  }
}

function calibrationNote(index: number, falsifiableRate: number, graded: number): string {
  if (graded === 0) return "No settled calls yet — nothing to grade.";
  if (falsifiableRate < 0.34) return "Trades mostly in un-checkable takes — little here can be held to an outcome.";
  if (index >= 75) return "Makes checkable calls and lands them — earns the airtime.";
  if (index >= 55) return "Calls are checkable and more right than not.";
  if (index >= 40) return "On the record, but the calls are closer to a coin flip than the volume suggests.";
  return "Confident on air, but the checkable calls have not held up.";
}

/** Build the accountability scorecard for one pundit from their claims. */
export function scorecardFor(pundit: Pundit, allClaims: readonly PunditClaim[]): PunditScorecard {
  const t = emptyTally();
  for (const c of allClaims) {
    if (c.punditId === pundit.id) applyClaim(t, c);
  }

  const graded = t.hits + t.misses + t.pushes + t.unfalsifiable;
  const decided = t.hits + t.misses;
  const falsifiableRate = graded === 0 ? 0 : (t.hits + t.misses + t.pushes) / graded;
  const hitRate = decided === 0 ? null : t.hits / decided;
  const accountabilityIndex = t.stake === 0 ? 0 : Math.round((t.credit / t.stake) * 100);

  return {
    punditId: pundit.id,
    name: pundit.name,
    show: pundit.show,
    network: pundit.network,
    total: t.total,
    graded,
    hits: t.hits,
    misses: t.misses,
    pushes: t.pushes,
    unfalsifiable: t.unfalsifiable,
    pending: t.pending,
    falsifiableRate,
    hitRate,
    accountabilityIndex,
    calibrationNote: calibrationNote(accountabilityIndex, falsifiableRate, graded),
  };
}

/** Scorecards for every pundit, sorted most-accountable first. */
export function leaderboard(
  pundits: readonly Pundit[],
  claims: readonly PunditClaim[],
): PunditScorecard[] {
  return pundits
    .map((p) => scorecardFor(p, claims))
    .sort((a, b) => b.accountabilityIndex - a.accountabilityIndex || b.graded - a.graded);
}
