/**
 * User intent taxonomy — the small set of intents Galaxy claims to recognize.
 *
 * Intent is inferred from observable surface behavior (which surface a user
 * landed on, which they navigated to next, which they dwelled on). It is
 * never asserted from cookies, fingerprints, or third-party profiles.
 *
 * Intent feeds the Experience Orchestrator (C26) so the right next-best
 * surface can be surfaced without manipulation.
 */

export const USER_INTENTS = [
  "learn", // wants to understand methodology / signals / sport
  "scan", // wants today's slate / what's hot, low engagement depth
  "study", // wants academy, glossary, evidence vault
  "decide", // is evaluating a single specific game
  "restrain", // wants to verify a pass, exit, or de-risk
  "audit", // wants to grade their past behavior
  "calibrate", // wants to set tier, profile, alerts
  "browse", // unstructured, no clear next-best surface
] as const;

export type UserIntent = (typeof USER_INTENTS)[number];

const INTENT_SET: ReadonlySet<string> = new Set(USER_INTENTS);

export function isKnownIntent(intent: string): intent is UserIntent {
  return INTENT_SET.has(intent);
}

/**
 * Default next-best surface candidates by intent.
 * The Experience Orchestrator may override these based on user mode and
 * decision-quality maturity (see C26).
 */
export const DEFAULT_NEXT_SURFACE_BY_INTENT: Record<UserIntent, ReadonlyArray<string>> = {
  learn: ["intelligence", "methodology", "academy"],
  scan: ["today", "picks", "board"],
  study: ["academy", "vault", "intelligence-glossary"],
  decide: ["picks", "parlay-mri", "no-bet"],
  restrain: ["no-bet", "responsible-play", "academy"],
  audit: ["autopsy", "tracker", "ledger"],
  calibrate: ["profile", "alerts", "pricing"],
  browse: ["today", "intelligence", "academy"],
};

/**
 * Intent that should never be programmatically inferred — only declared
 * by the user (e.g., through profile preferences). Lists exist to keep
 * the orchestrator from "manipulating intent."
 */
export const USER_DECLARED_ONLY: ReadonlySet<UserIntent> = new Set(["restrain"]);
