/**
 * Expected Drive Value (EDV) via time-decayed scoring-play aggregation.
 *
 * For a drive, each play's EDV aggregates the discounted expected points of
 * all FUTURE scoring plays on that drive:
 *   EDV_play = 1 - Prod_t (1 - gamma^{Delta_t} * xP_t)
 * where Delta_t is seconds from the play to scoring play t, gamma the
 * per-second discount (~0.90-0.99), and xP_t the scoring play's expected
 * points. Player attribution: per-play Delta-EDV goes to the primary actor
 * (passer/receiver 60/40; rusher full; turnovers penalized double). The
 * possession-risk variant subtracts the opponent's next-drive decayed xP.
 *
 * Pure TypeScript, no I/O.
 *
 * Reference: arXiv:2406.00814v1 — Expected Possession Value of Control and
 * Duel Actions (NFL Expected Drive Value adaptation).
 *
 * ACCEPTANCE GATE: adapt into player projections only if EDV-based
 * prediction shows R^2 gains on 2023 AND 2024 holdouts.
 */

export interface ScoringPlay {
  /** Seconds from the current play to this scoring play. */
  readonly deltaT: number;
  /** Expected points of the scoring play. */
  readonly xP: number;
}

/**
 * EDV of a play given the drive's future scoring plays.
 * @param gamma per-second discount in (0, 1].
 */
export function edv(futureScores: readonly ScoringPlay[], gamma = 0.97): number {
  if (!(gamma > 0 && gamma <= 1)) throw new Error("expected-drive-value: gamma in (0,1]");
  let prod = 1;
  for (const s of futureScores) {
    if (!(s.deltaT >= 0) || !(s.xP >= 0)) throw new Error("expected-drive-value: deltaT/xP >= 0");
    prod *= 1 - Math.pow(gamma, s.deltaT) * Math.min(s.xP, 1);
  }
  return 1 - prod;
}

export type PlayActor = "passer" | "receiver" | "rusher" | "other";

/**
 * Attribute a play's Delta-EDV to actors.
 * Passer/receiver split 60/40; rusher takes full; turnovers double the debit.
 */
export function attributeEdv(
  deltaEdv: number,
  actor: PlayActor,
  isTurnover = false,
): Record<string, number> {
  const v = isTurnover ? 2 * deltaEdv : deltaEdv;
  switch (actor) {
    case "passer":
      return { passer: 0.6 * v, receiver: 0.4 * v };
    case "receiver":
      return { passer: 0.6 * v, receiver: 0.4 * v };
    case "rusher":
      return { rusher: v };
    default:
      return { other: v };
  }
}

/** Possession-risk EDV: own-drive EDV minus opponent next-drive decayed xP. */
export function riskAdjustedEdv(
  ownEdv: number,
  oppNextDriveXP: number,
  secondsUntilOppDrive: number,
  gamma = 0.97,
): number {
  if (!(secondsUntilOppDrive >= 0)) throw new Error("expected-drive-value: seconds >= 0");
  return ownEdv - Math.pow(gamma, secondsUntilOppDrive) * oppNextDriveXP;
}
