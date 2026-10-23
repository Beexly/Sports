/**
 * Class A Coach-First simulation modules.
 * No OddsInput. No market tokens. The fence rejects any book import.
 */
export { simulateCoachGame, runSimulations } from "./markov-simulator.js";
export type { CoachSimInput, CoachProjection } from "./markov-simulator.js";

export { evaluateFourthDown, STAFF_AGGRESSION } from "./fourth-down-policy.js";
export type { FourthDownState, FourthDownDecision } from "./fourth-down-policy.js";

export { allocateTargets, applyShadowHaircut } from "./sinkhorn-targets.js";
export type { EligibleTarget, TargetAllocation } from "./sinkhorn-targets.js";
