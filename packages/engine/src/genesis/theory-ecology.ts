/**
 * GENESIS LAYER — Theory Ecology (Invention 56).
 *
 * Every theory competes for survival. GSE maintains a living ecosystem: LAW, HYPOTHESIS, MUTANT,
 * GHOST, RETIRED, QUARANTINED. Good theories survive, fragile ones mutate, bad ones die, dangerous
 * ones are quarantined, decayed ones retire. This is how GSE avoids becoming bloated — Darwinian
 * selection over concepts. Pure + deterministic.
 */

export type EcologyStatus = "LAW" | "HYPOTHESIS" | "MUTANT" | "GHOST" | "RETIRED" | "QUARANTINED";

export interface TheoryOrganism {
  readonly id: string;
  readonly name: string;
  readonly status: EcologyStatus;
  readonly fitness: number;
  readonly novelty: number;
  readonly compression: number;
  readonly decisionLeverage: number;
  readonly driftRisk: number;
  readonly ghostSimilarity: number;
  readonly governanceSafe: boolean;
  readonly allowedSurfaces: readonly string[];
  readonly lastReplaySurvived: boolean;
}

export interface EcologySignals {
  readonly fitness: number;
  readonly driftRisk: number;
  readonly ghostSimilarity: number;
  readonly lastReplaySurvived: boolean;
  readonly oosWindows: number;
}

export interface EcologyTransition {
  readonly id: string;
  readonly from: EcologyStatus;
  readonly to: EcologyStatus;
  readonly reason: string;
}

/** Advance one theory through natural selection given fresh signals. */
export function evolveTheory(organism: TheoryOrganism, s: EcologySignals): { organism: TheoryOrganism; transition: EcologyTransition } {
  let to: EcologyStatus;
  let reason: string;
  if (s.ghostSimilarity >= 0.6 || !organism.governanceSafe) {
    to = "QUARANTINED"; reason = s.ghostSimilarity >= 0.6 ? "Resembles a dangerous dead-edge cluster — quarantined." : "Governance risk — quarantined.";
  } else if (s.fitness <= 0 || !s.lastReplaySurvived) {
    to = "GHOST"; reason = s.fitness <= 0 ? "Fitness collapsed — buried as a ghost." : "Failed point-in-time replay — buried as a ghost.";
  } else if (s.driftRisk >= 0.6) {
    to = "RETIRED"; reason = "Concept drift too high — the world changed; retire it.";
  } else if (s.fitness >= 1.2 && organism.compression >= 0.3 && organism.decisionLeverage >= 0.2 && s.oosWindows >= 2) {
    to = "LAW"; reason = `High fitness across ${s.oosWindows} OOS windows + compression + leverage — graduates to LAW.`;
  } else {
    to = organism.status === "MUTANT" && s.fitness < 1.2 ? "MUTANT" : "HYPOTHESIS";
    reason = to === "MUTANT" ? "Viable mutant, not yet proven — remains a mutant." : "Positive but unproven — a hypothesis.";
  }
  const updated: TheoryOrganism = { ...organism, status: to, fitness: s.fitness, driftRisk: s.driftRisk, ghostSimilarity: s.ghostSimilarity, lastReplaySurvived: s.lastReplaySurvived };
  return { organism: updated, transition: { id: organism.id, from: organism.status, to, reason } };
}

/** Count organisms by status — the ecosystem census. */
export function ecologyCensus(organisms: readonly TheoryOrganism[]): Record<EcologyStatus, number> {
  const census: Record<EcologyStatus, number> = { LAW: 0, HYPOTHESIS: 0, MUTANT: 0, GHOST: 0, RETIRED: 0, QUARANTINED: 0 };
  for (const o of organisms) census[o.status] += 1;
  return census;
}
