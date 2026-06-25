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
  type DecisionState,
} from "@sports/decision-field-runtime";
import { makeTwinInput, deriveRegimeProfile, type RegimeProfile } from "@sports/decision-factory";

// The TOPICAL surface a card belongs to, by decision state. The preview pages group by topic so the
// illustrative set is browsable; the card's own `routeTo` is the *authority* route (fixture cards are
// ADMIN_ONLY/INFO_ONLY by the data-mode gate), which is why we don't filter on it here. Everything the
// preview surfaces is explicitly labelled "Preview · illustrative" and is never an actionable live pick.
const PREVIEW_SURFACE: Partial<Record<DecisionState, "TODAY" | "EDGE" | "GAMEPLAN">> = {
  ROLE_UP_FANTASY_LATE: "GAMEPLAN",
  ROLE_MASS_MISALLOCATED: "GAMEPLAN",
  DFS_SALARY_LAG: "GAMEPLAN",
  OWNERSHIP_OVERREACTION: "GAMEPLAN",
  GOOD_IDEA_BAD_PRICE: "EDGE",
  PUBLIC_OVERREACTION: "EDGE",
  TOO_LATE: "TODAY",
  WATCHLIST: "TODAY",
  ACTIONABLE: "TODAY",
};

function previewSurfaceOf(card: DecisionCard): "TODAY" | "EDGE" | "GAMEPLAN" {
  return PREVIEW_SURFACE[card.decisionState] ?? "TODAY";
}

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

/** Illustrative cards grouped by TOPICAL surface (TODAY / EDGE / GAMEPLAN) for the preview pages. */
export function previewCardsFor(surface: "TODAY" | "EDGE" | "GAMEPLAN"): readonly DecisionCard[] {
  return getPreviewDecisions().cards.filter((c) => previewSurfaceOf(c) === surface);
}
