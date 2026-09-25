/**
 * Intelligence Core — public surface.
 *
 * The all-knowing situational reasoning spine. Every data surface in the
 * repository feeds this core; the website, fantasy engine, picks, props,
 * and cockpit all reason through it. Doctrine: win on intelligence and
 * context, not on trying to beat the close with raw metrics.
 *
 * WIRING MAP:
 *   reasoning.ts       — reason() spine, six questions, publish gates
 *   signal-adapters.ts — injuries/NGS/player/ratings/weather/snaps → SignalObservation
 *   engine.ts          — master plug: every repo module → one SituationalContext
 */

export {
  reason,
  explain,
  SLICE_WEIGHTS,
  type SignalFamily,
  type SignalObservation,
  type MarketBelief,
  type SituationalContext,
  type IntelligenceReasoning,
} from "./reasoning";

export {
  injuryObservations,
  ngsObservations,
  playerStatObservations,
  ratingsObservations,
  weatherObservations,
  gameSignalObservations,
  snapCountObservations,
  allObservations,
  computeModelProb,
  signalPresence,
  injuryLean,
  type InjuryRow,
  type NgsRow,
  type PlayerGameStatRow,
  type TeamEfficiencyRow,
  type GameSignalRow,
  type SnapCountRow,
  type AllSignalInputs,
  type SignalPresence,
} from "./signal-adapters";

export {
  buildSituationalContext,
  runIntelligence,
  wireEverything,
  type GameBundle,
  type IntelligenceResult,
} from "./engine";
