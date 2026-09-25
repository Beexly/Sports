/**
 * Intelligence Core — public surface.
 *
 * The all-knowing situational reasoning spine. Every data surface in the
 * repository feeds this core; the website, fantasy engine, picks, props,
 * and cockpit all reason through it. Doctrine: win on intelligence and
 * context, not on trying to beat the close with raw metrics.
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
