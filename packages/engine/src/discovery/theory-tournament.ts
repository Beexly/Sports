/**
 * DISCOVERY LAYER — Theory Tournament Arena (Invention 39).
 *
 * Selection pressure over theories. Competing candidate laws are run through one fitness function
 * and ranked; the weak are buried into the ghost economy. The winning theory is not the cleverest —
 * it is the one that survives out-of-sample, compresses, explains causally, survives friction, and
 * does NOT resemble a prior failure.
 *
 *   TheoryFitness = oos_gain + compression_gain + causal_plausibility + tradability_explanation
 *                 − complexity − instability_risk − leakage_risk − rights_risk − ghost_similarity
 *
 * Pure + deterministic.
 */

export interface TheoryEntrant {
  readonly id: string;
  readonly name: string;
  readonly oosGain: number;
  readonly compressionGain: number;
  readonly causalPlausibility: number;
  readonly tradabilityExplanation: number;
  readonly complexity: number;
  readonly instabilityRisk: number;
  readonly leakageRisk: number;
  readonly rightsRisk: number;
  /** 0..1 similarity to a known dead-edge cluster (from the ghost economy). */
  readonly ghostSimilarity: number;
}

export interface RankedTheory extends TheoryEntrant {
  readonly fitness: number;
  readonly buried: boolean;
}

export interface TournamentResult {
  readonly ranked: readonly RankedTheory[];
  readonly winner: RankedTheory | null;
  readonly buried: readonly RankedTheory[];
}

export function theoryFitness(t: TheoryEntrant, ghostPenalty = 1): number {
  return (
    t.oosGain + t.compressionGain + t.causalPlausibility + t.tradabilityExplanation -
    t.complexity - t.instabilityRisk - t.leakageRisk - t.rightsRisk - ghostPenalty * t.ghostSimilarity
  );
}

/**
 * Run the tournament. An entrant is buried (→ ghost) if its fitness ≤ 0, its leakage risk is
 * disqualifying, or it strongly resembles a prior failure. The winner is the highest non-buried fitness.
 */
export function runTournament(
  entrants: readonly TheoryEntrant[],
  options: { ghostPenalty?: number; ghostSimilarityKill?: number } = {},
): TournamentResult {
  const ghostPenalty = options.ghostPenalty ?? 1;
  const kill = options.ghostSimilarityKill ?? 0.8;
  const ranked: RankedTheory[] = entrants
    .map((t) => {
      const fitness = theoryFitness(t, ghostPenalty);
      const buried = fitness <= 0 || t.leakageRisk >= 0.5 || t.ghostSimilarity >= kill;
      return { ...t, fitness, buried };
    })
    .sort((a, b) => b.fitness - a.fitness);
  const survivors = ranked.filter((r) => !r.buried);
  return { ranked, winner: survivors[0] ?? null, buried: ranked.filter((r) => r.buried) };
}
