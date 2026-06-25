/**
 * Decision OS — preview fixtures (server-only).
 *
 * Runs the Decision Field Organism over its deterministic Galileo fixtures and returns the emitted
 * DecisionCards for the UI to render. This is PURE + FIXTURE-ONLY — no network, no keys, no live data.
 * Everything surfaced from here is explicitly labeled "Preview · illustrative" in the components; it is
 * NEVER presented as a live pick. Phase 3 (owner-gated) swaps the fixture inputs for one real NFL week.
 */

import {
  runDecisionFieldFrame,
  field001Input,
  type DecisionCard,
} from "@sports/decision-field-runtime";
import { makeTwinInput, deriveRegimeProfile, type RegimeProfile } from "@sports/decision-factory";

export interface PreviewDecisions {
  readonly cards: readonly DecisionCard[];
  readonly suppressedCount: number;
  readonly regime: RegimeProfile;
  readonly source: "fixtures";
}

/** The illustrative decision set rendered across Today / Edge / Gameplan previews. */
export function getPreviewDecisions(): PreviewDecisions {
  const f1 = runDecisionFieldFrame(field001Input);
  const twin = runDecisionFieldFrame(makeTwinInput([])); // a stronger role-up (fantasy snapshot present)
  return {
    cards: [...f1.emittedCards, ...twin.emittedCards],
    suppressedCount: f1.suppressedCards.length + twin.suppressedCards.length,
    regime: deriveRegimeProfile(field001Input.regimeInputs),
    source: "fixtures",
  };
}

/** Cards routed to a given public surface (TODAY / EDGE / GAMEPLAN / PROOF). */
export function previewCardsFor(routeTo: DecisionCard["routeTo"]): readonly DecisionCard[] {
  return getPreviewDecisions().cards.filter((c) => c.routeTo === routeTo);
}
