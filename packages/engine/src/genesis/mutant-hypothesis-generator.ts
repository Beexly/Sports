/**
 * GENESIS LAYER — Mutant Hypothesis Generator (Invention 58).
 *
 * Cross-breed existing concepts to create new candidate laws — role-mass-transfer × DFS-ownership-
 * gravity, book-lag × fantasy-projection-lag, scarcity-curvature × waiver-absorption, belief-
 * refractive-index × dynasty-sentiment, ghost-similarity × trade-MRI. A mutant is viable only if its
 * parents are fit and they share enough surface to interact. Pure + deterministic.
 */

export interface ParentConcept {
  readonly id: string;
  readonly name: string;
  readonly mechanism: string;
  readonly surfaces: readonly string[];
  readonly fitness: number; // 0..1 parent's standing
}

export interface MutantHypothesis {
  readonly id: string;
  readonly name: string;
  readonly parents: readonly [string, string];
  readonly mechanism: string;
  readonly sharedSurfaces: readonly string[];
  readonly noveltyEstimate: number;
  readonly viability: number;
  readonly note: string;
}

function overlap<T>(a: readonly T[], b: readonly T[]): T[] {
  const sb = new Set(b);
  return a.filter((x) => sb.has(x));
}

/** Cross-breed two parent concepts into a single mutant hypothesis. */
export function crossbreed(a: ParentConcept, b: ParentConcept): MutantHypothesis {
  const shared = overlap(a.surfaces, b.surfaces);
  const union = new Set([...a.surfaces, ...b.surfaces]).size;
  const noveltyEstimate = Number(Math.min(1, union / 8).toFixed(4));
  // Viability needs fit parents AND interaction surface; pure novelty with no overlap is not viable
  // — even two perfect parents must stay below the default viability threshold (0.3) when disjoint.
  const overlapBonus = shared.length === 0 ? 0.25 : Math.min(1, 0.5 + 0.25 * shared.length);
  const viability = Number((((a.fitness + b.fitness) / 2) * overlapBonus).toFixed(4));
  return {
    id: `mutant:${a.id}__${b.id}`,
    name: `${a.name} × ${b.name}`,
    parents: [a.id, b.id],
    mechanism: `${a.mechanism} interacting with ${b.mechanism}`,
    sharedSurfaces: shared,
    noveltyEstimate,
    viability,
    note: shared.length === 0 ? "Novel but no shared surface — low interaction viability." : `Shares ${shared.length} surface(s) — plausible interaction.`,
  };
}

/** Generate all pairwise mutants above a viability threshold, best-first. */
export function generateMutants(concepts: readonly ParentConcept[], opts: { viabilityThreshold?: number } = {}): MutantHypothesis[] {
  const threshold = opts.viabilityThreshold ?? 0.3;
  const mutants: MutantHypothesis[] = [];
  for (let i = 0; i < concepts.length; i++) {
    for (let j = i + 1; j < concepts.length; j++) {
      mutants.push(crossbreed(concepts[i]!, concepts[j]!));
    }
  }
  return mutants.filter((m) => m.viability >= threshold).sort((a, b) => b.viability - a.viability);
}
