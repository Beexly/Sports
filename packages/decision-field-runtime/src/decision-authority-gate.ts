/**
 * DECISION FIELD RUNTIME — Data-mode & authority gate (fail-closed, non-negotiable).
 *
 * A card's strength is bounded not only by its evidence but by WHERE the data came from and WHAT the
 * model is authorized to do. Fixture data can never reach an action; shadow data can never go public;
 * PUBLIC_ACTION requires live data, an open readiness gate, a public-authorized model, AND public
 * publication clearance. This closes the hole where EXECUTABLE_SHADOW tradability could otherwise drive
 * a card to PUBLIC_ACTION on fixture data. Pure + deterministic.
 */

import { type MaxPermittedStrength, strengthMin, rankOf } from "./decision-state-stat-contract.js";

/** Where the inputs came from. The single most important gate: fixtures are never actionable. */
export type DataMode = "FIXTURE" | "SHADOW_REAL" | "LIVE_REAL";

/** What the model is authorized to express. UNPRICED/PROCESS_ONLY can't price an action. */
export type ModelAuthority = "UNPRICED" | "PROCESS_ONLY" | "PERSONALIZED_ALLOWED" | "PUBLIC_ALLOWED";

/** Whether THIS output is cleared to be shown internally, to a user, or publicly. */
export type PublicationAuthority = "INTERNAL" | "PERSONALIZED" | "PUBLIC";

export interface AuthorityContext {
  readonly dataMode: DataMode;
  readonly modelAuthority: ModelAuthority;
  readonly readinessAuthorized: boolean;
  readonly publicationAuthority: PublicationAuthority;
}

/** Fail-closed default: fixture data, unpriced model, no readiness, internal-only. */
export const DEFAULT_AUTHORITY: AuthorityContext = {
  dataMode: "FIXTURE",
  modelAuthority: "UNPRICED",
  readinessAuthorized: false,
  publicationAuthority: "INTERNAL",
};

function dataModeCeiling(m: DataMode): MaxPermittedStrength {
  switch (m) {
    case "FIXTURE":
      return "INFO_ONLY";
    case "SHADOW_REAL":
      return "WATCH";
    case "LIVE_REAL":
      return "PUBLIC_ACTION";
  }
}

function modelAuthorityCeiling(a: ModelAuthority): MaxPermittedStrength {
  switch (a) {
    case "UNPRICED":
    case "PROCESS_ONLY":
      return "WATCH";
    case "PERSONALIZED_ALLOWED":
      return "PERSONALIZED";
    case "PUBLIC_ALLOWED":
      return "PUBLIC_ACTION";
  }
}

function publicationCeiling(p: PublicationAuthority): MaxPermittedStrength {
  switch (p) {
    case "INTERNAL":
      return "WATCH";
    case "PERSONALIZED":
      return "PERSONALIZED";
    case "PUBLIC":
      return "PUBLIC_ACTION";
  }
}

/**
 * The authority ceiling: the weakest of the data-mode, model-authority, publication, and readiness
 * gates. Live data with an open readiness gate and a public-authorized, public-publication model is the
 * ONLY combination that can reach PUBLIC_ACTION.
 */
export function authorityCeiling(ctx: AuthorityContext): MaxPermittedStrength {
  let ceiling = dataModeCeiling(ctx.dataMode);
  ceiling = strengthMin(ceiling, modelAuthorityCeiling(ctx.modelAuthority));
  ceiling = strengthMin(ceiling, publicationCeiling(ctx.publicationAuthority));
  // Readiness gate: without it, nothing above WATCH ships, regardless of the other gates.
  if (!ctx.readinessAuthorized) ceiling = strengthMin(ceiling, "WATCH");
  return ceiling;
}

/** Public-safe is the conjunction of every public gate — fail-closed. Fixtures/shadow are never public. */
export function isPublicSafe(
  ctx: AuthorityContext,
  finalStrength: MaxPermittedStrength,
  rightsClearedForPublic: boolean,
): boolean {
  return (
    ctx.dataMode === "LIVE_REAL" &&
    ctx.readinessAuthorized &&
    ctx.modelAuthority === "PUBLIC_ALLOWED" &&
    ctx.publicationAuthority === "PUBLIC" &&
    rightsClearedForPublic &&
    rankOf(finalStrength) > rankOf("INFO_ONLY")
  );
}
