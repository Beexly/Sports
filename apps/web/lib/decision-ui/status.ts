/**
 * Decision OS — public status mapping.
 *
 * Maps the engine's internal DecisionState / MaxPermittedStrength onto PUBLIC, everyday labels + a
 * semantic tone (reusing lib/intelligence/colors.ts). Internal enum names never reach the user. Pure.
 */

import type { SignalTone } from "@/lib/intelligence/colors";
import type { DecisionState, MaxPermittedStrength } from "@sports/decision-field-runtime";

export interface DecisionStatusView {
  readonly label: string;
  readonly tone: SignalTone;
  readonly plainCopy: string;
}

const STATE_VIEW: Readonly<Record<DecisionState, DecisionStatusView>> = {
  ACTIONABLE: { label: "Worth a look", tone: "good", plainCopy: "The read and the price line up right now." },
  ROLE_UP_FANTASY_LATE: { label: "Role up, market behind", tone: "good", plainCopy: "The job got bigger before the market priced it." },
  GOOD_IDEA_BAD_PRICE: { label: "Right idea, wrong price", tone: "neutral", plainCopy: "We like the side, but the number's gone." },
  PUBLIC_OVERREACTION: { label: "Crowd's overreacting", tone: "neutral", plainCopy: "The move is public, not grounded in the role." },
  ROLE_MASS_MISALLOCATED: { label: "Credit's misplaced", tone: "neutral", plainCopy: "The opportunity went somewhere the crowd isn't looking." },
  DATA_CONFLICT: { label: "Sources disagree", tone: "neutral", plainCopy: "We're surfacing the disagreement, not resolving it as fact." },
  NEEDS_CONFIRMATION: { label: "Needs one confirmation", tone: "neutral", plainCopy: "One more signal would make this actionable." },
  TOO_LATE: { label: "Too late", tone: "bad", plainCopy: "The window closed — no credit for chasing it." },
  PASS: { label: "Pass", tone: "neutral", plainCopy: "Nothing here worth your attention today." },
  TRAP: { label: "Looks like a trap", tone: "bad", plainCopy: "This rhymes with a mistake we've made before." },
  WATCHLIST: { label: "Watching", tone: "neutral", plainCopy: "On the radar; not yet a move." },
  NEEDS_LIVE_DATA: { label: "Needs live data", tone: "neutral", plainCopy: "We can't responsibly call this without live inputs." },
};

export function statusForState(state: DecisionState): DecisionStatusView {
  return STATE_VIEW[state];
}

const STRENGTH_VIEW: Readonly<Record<MaxPermittedStrength, { readonly label: string; readonly tone: SignalTone }>> = {
  PUBLIC_ACTION: { label: "Act", tone: "good" },
  ACTION: { label: "Act", tone: "good" },
  PERSONALIZED: { label: "For your roster", tone: "good" },
  WAIT: { label: "Wait", tone: "neutral" },
  WATCH: { label: "Watch", tone: "neutral" },
  INFO_ONLY: { label: "FYI", tone: "neutral" },
};

export function strengthChip(strength: MaxPermittedStrength): { label: string; tone: SignalTone } {
  return STRENGTH_VIEW[strength];
}
