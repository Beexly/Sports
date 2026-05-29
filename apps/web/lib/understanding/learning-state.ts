/**
 * Learning state — the user's recommended next Academy module given
 * their current understanding snapshot and confusion signal history.
 *
 * Read-only recommendations. The product never auto-enrolls a user;
 * it only proposes the next module.
 */

import type {
  UnderstandingBand,
  UnderstandingConcept,
  UserUnderstandingSnapshot,
} from "./user-understanding";

/** Modules the Academy offers. Kept in sync with academy content config. */
export const ACADEMY_MODULES = [
  "foundation-what-is-a-pick",
  "no-bet",
  "evidence-chain",
  "clv",
  "ev-basics",
  "factor-trail",
  "process-grading",
  "tilt-and-bankroll",
  "parlay-discipline",
  "market-structure",
] as const;

export type AcademyModule = (typeof ACADEMY_MODULES)[number];

/** Modules required for a given concept to reach `fluent`. */
export const FLUENCY_PATH: ReadonlyArray<{
  readonly concept: UnderstandingConcept;
  readonly module: AcademyModule;
}> = [
  { concept: "what-galaxy-is", module: "foundation-what-is-a-pick" },
  { concept: "no-bet-doctrine", module: "no-bet" },
  { concept: "evidence-chain", module: "evidence-chain" },
  { concept: "closing-line-value", module: "clv" },
  { concept: "expected-value", module: "ev-basics" },
  { concept: "factor-trail", module: "factor-trail" },
  { concept: "process-vs-outcome", module: "process-grading" },
  { concept: "parlay-correlation", module: "parlay-discipline" },
  { concept: "market-mirage", module: "market-structure" },
];

/** Order of priority when multiple modules are candidates. */
const PRIORITY_ORDER: ReadonlyArray<AcademyModule> = [
  "no-bet",
  "process-grading",
  "tilt-and-bankroll",
  "evidence-chain",
  "clv",
  "ev-basics",
  "factor-trail",
  "parlay-discipline",
  "market-structure",
  "foundation-what-is-a-pick",
];

const BAND_RANK: Record<UnderstandingBand, number> = {
  unknown: 0,
  introduced: 1,
  familiar: 2,
  fluent: 3,
};

export interface NextModuleRecommendation {
  readonly module: AcademyModule;
  readonly rationale: string;
}

/**
 * Recommend the next module. Skips modules whose concept is already fluent.
 * Returns null when the user is fluent on every concept covered by a module.
 */
export function recommendNextModule(
  snapshot: UserUnderstandingSnapshot,
): NextModuleRecommendation | null {
  const candidates: AcademyModule[] = [];
  for (const { concept, module } of FLUENCY_PATH) {
    const band = snapshot.bands[concept];
    if (BAND_RANK[band] < BAND_RANK["fluent"]) {
      candidates.push(module);
    }
  }
  if (candidates.length === 0) return null;
  for (const m of PRIORITY_ORDER) {
    if (candidates.includes(m)) {
      return {
        module: m,
        rationale: `User has not yet reached fluent on ${conceptForModule(m)}.`,
      };
    }
  }
  return { module: candidates[0]!, rationale: "Fallback selection." };
}

function conceptForModule(module: AcademyModule): UnderstandingConcept | "general" {
  const entry = FLUENCY_PATH.find((e) => e.module === module);
  return entry ? entry.concept : "general";
}
