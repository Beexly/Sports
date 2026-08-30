/**
 * Decision Genome & Epistemic Alpha spine — public surface.
 *
 * The atomic object behind every sports decision, the aperture that decides whether to
 * act, the ledger that scores whether confidence was deserved, and the gates that keep
 * every claim provable. Implements the research build order A–I as pure, testable
 * TypeScript that COMPOSES existing primitives (public claim compiler, banned-phrase
 * scanner, agent registry) rather than rebuilding them.
 *
 * Guardrails honoured throughout: projections stay shadow (`priced` is never set true),
 * confidence always carries calibration context, agents only draft/escalate, no claim is
 * public without passing the proof gate, and no decision may rely on data that was not
 * knowable at lock.
 */

// A — ClaimLang / TruthCompiler
export * from "./claim-lang";
// B — DecisionGenome domain object
export * from "./decision-genome";
// C — KnowabilityKernel
export * from "./knowability";
// D — CandidateDenominatorLedger
export * from "./candidate-ledger";
// E — ApertureStateMachine
export * from "./aperture";
// F — AgentCourt
export * from "./agent-court";
// G — DecisionReplay
export * from "./decision-replay";
// H — ProofCardEngine
export * from "./proof-card";
// I — EpistemicAlphaLedger
export * from "./epistemic-alpha";
// Dark-corner engines (extend the spine's inputs with principled measures)
export * from "./conformal"; // ConformalDecisionGate / RefusalEngine
export * from "./market-physics"; // Market Physics Engine
export * from "./claim-independence"; // ClaimIndependenceIndex
export * from "./rumor-quarantine"; // RumorQuarantine
// Fixtures (sample genomes for tests/storybook/demos)
export { allFixtures, signalGenome, passGenome, quarantineGenome } from "./fixtures";
export * as decisionGenomeFixtures from "./fixtures";
