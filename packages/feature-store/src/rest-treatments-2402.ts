/**
 * ACTE rest-adjustment: player-game treatment definitions (short rest / travel)
 *
 * Research port: arXiv:2402.12400
 * Normalized lane: causal_injury | Doctrine: SITUATIONAL
 *
 * Treatment definitions for the ACTE rest-adjustment study: unit = player-game; W=1 short rest (<=3 days since last game, TNF short week) vs W=0 normal rest; W=1 travel >2000 miles vs 0. Outcomes: EPA/play, success rate, fantasy points. Pure unit/treatment builders; X-learner estimation is a live-data gate.
 *
 * ACCEPTANCE GATE: ADOPT the ACTE rest-adjustment into GSE projections only if on the synthetic DGP the X-learner+RF recovers the true nonlinear tau(a) with MSE at least 30% below the naive estimator. Live-data gate -> GSE_ACTE_REST_ENABLED flag (default false).
 */

export interface PlayerGame {
  playerId: string;
  gameId: string;
  daysSinceLastGame: number | null; // null = season opener / bye-adjacent unknown
  travelMiles: number;
  epaPerPlay: number;
  successRate: number;
  fantasyPoints: number;
}

export interface TreatmentAssignment {
  playerId: string;
  gameId: string;
  shortRest: 0 | 1;
  longTravel: 0 | 1;
}

export const SHORT_REST_DAYS = 3;
export const LONG_TRAVEL_MILES = 2000;

/** Assign treatments from the player-game record. */
export function assignTreatments(pg: PlayerGame): TreatmentAssignment {
  return {
    playerId: pg.playerId,
    gameId: pg.gameId,
    shortRest: pg.daysSinceLastGame !== null && pg.daysSinceLastGame <= SHORT_REST_DAYS ? 1 : 0,
    longTravel: pg.travelMiles > LONG_TRAVEL_MILES ? 1 : 0,
  };
}

/** Naive group-mean treatment effect (the estimator the X-learner must beat by 30% MSE). */
export function naiveAte(
  units: PlayerGame[],
  treated: (t: TreatmentAssignment) => 0 | 1,
  outcome: (u: PlayerGame) => number,
): number {
  const t = units.filter((u) => treated(assignTreatments(u)) === 1).map(outcome);
  const c = units.filter((u) => treated(assignTreatments(u)) === 0).map(outcome);
  const avg = (xs: number[]): number => (xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length);
  return avg(t) - avg(c);
}

/** Live-data gate: X-learner MSE >=30% below naive on the synthetic DGP. */
export const GSE_ACTE_REST_ENABLED = false;

