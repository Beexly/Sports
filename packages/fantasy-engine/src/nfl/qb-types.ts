/**
 * GSE QB-Types — the quarterback mobility model, published WITH receipts.
 *
 * The industry claim this rebuilds is that mobile quarterbacks carry a
 * +2–4 fantasy-points-per-game edge. GSE does not assert the premium — it
 * COMPUTES it from the season being scored and returns it with the tier
 * means and sample sizes attached (live 2025 verification: +5.0 FP/G,
 * larger than the public claim). Thresholds are public and pinned.
 *
 * Classification (rush attempts/game, rush yards/game):
 *   Very Mobile/Running : ≥6 att/g OR ≥32 yds/g
 *   Mobile              : ≥3.5 att/g OR ≥18 yds/g
 *   Pocket              : everyone else
 *
 * Port of the validated clean-room reference implementation; verified against
 * its live 2025 output table in the test suite.
 */

export type QbType = "Very Mobile/Running" | "Mobile" | "Pocket";

export interface QbSeason {
  /** Stable identifier (display key; not used in math). */
  readonly id: string;
  readonly games: number;
  /** Pass attempts (population filter — the reference scores ≥100). */
  readonly passAttempts: number;
  readonly carries: number;
  readonly rushingYards: number;
  readonly rushingTds: number;
  /** Total fantasy points (scoring format is the caller's contract). */
  readonly fantasyPoints: number;
}

export interface QbTypeScore {
  readonly id: string;
  readonly type: QbType;
  readonly rushAttemptsPerGame: number;
  readonly rushYardsPerGame: number;
  readonly fantasyPointsPerGame: number;
  /** Share of total fantasy points earned by rushing (0.1/yd + 6/TD legs). */
  readonly rushFantasyShare: number;
}

/** Public classification thresholds (pinned by tests). */
export function classifyQb(rushAttemptsPerGame: number, rushYardsPerGame: number): QbType {
  if (rushAttemptsPerGame >= 6 || rushYardsPerGame >= 32) return "Very Mobile/Running";
  if (rushAttemptsPerGame >= 3.5 || rushYardsPerGame >= 18) return "Mobile";
  return "Pocket";
}

export function computeQbTypes(population: readonly QbSeason[]): QbTypeScore[] {
  return population.map((q) => {
    const gp = Math.max(1, q.games);
    const rushAttemptsPerGame = q.carries / gp;
    const rushYardsPerGame = q.rushingYards / gp;
    const rushFp = q.rushingYards * 0.1 + q.rushingTds * 6;
    return {
      id: q.id,
      type: classifyQb(rushAttemptsPerGame, rushYardsPerGame),
      rushAttemptsPerGame,
      rushYardsPerGame,
      fantasyPointsPerGame: q.fantasyPoints / gp,
      rushFantasyShare: rushFp / Math.max(1, q.fantasyPoints),
    };
  });
}

export interface MobilityReceipts {
  /** Mean FP/G and sample size per tier — the evidence, not an assertion. */
  readonly tiers: ReadonlyArray<{ readonly type: QbType; readonly meanFpPerGame: number; readonly count: number }>;
  /** Very Mobile/Running minus Pocket mean FP/G. NaN when a tier is empty. */
  readonly premiumFpPerGame: number;
}

/**
 * The receipts: computed tier means and the mobility premium for the scored
 * population. This is what gets PUBLISHED next to the claim — the reader can
 * re-derive it, which is the entire difference from an asserted edge.
 */
export function mobilityReceipts(scores: readonly QbTypeScore[]): MobilityReceipts {
  const order: readonly QbType[] = ["Very Mobile/Running", "Mobile", "Pocket"];
  const tiers = order.map((type) => {
    const rows = scores.filter((s) => s.type === type);
    const meanFpPerGame =
      rows.length === 0
        ? Number.NaN
        : rows.reduce((sum, r) => sum + r.fantasyPointsPerGame, 0) / rows.length;
    return { type, meanFpPerGame, count: rows.length };
  });
  const veryMobile = tiers[0]!.meanFpPerGame;
  const pocket = tiers[2]!.meanFpPerGame;
  return { tiers, premiumFpPerGame: veryMobile - pocket };
}
