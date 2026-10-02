/**
 * Shadow-only signal policy.
 *
 * A shadowed family is still INGESTED, COUNTED, and REPORTED — it shows up in
 * the six questions, in `familyWeights`, in `observationCount`, and in a
 * dedicated `shadowedObservationCount` — but it contributes exactly ZERO to the
 * calibration spine:
 *
 *   - it is skipped by the lean loop that feeds `situationalShift`
 *   - it is excluded from the `knowability` / `evidenceHealth` aggregates
 *   - its `familyWeights` entry is forced to 0
 *   - a family-matched scalar in `ctx.situation` (e.g. `injuryImpact` for
 *     INJURY_AVAILABILITY) is skipped too, so there is no back door
 *
 * The point is to measure a signal's influence before trusting it. Injuries
 * are arithmetically wired into customer-facing numbers today; a wiring plan
 * wants them counted and reported while held OUT of the calibrated spine.
 * That is only honest if the exclusion is provable — hence the bit-identity
 * test in `shadow.test.ts`.
 *
 * DESIGN RULE — no silent enablement. `shadowOnly()` REQUIRES a non-empty
 * `justification`, and `reason()` re-validates it and throws if the policy is
 * malformed. You cannot switch a family into shadow mode without stating, in
 * code, why. Omitting the policy entirely preserves today's behaviour exactly.
 */

import type { SignalFamily } from "./reasoning";

/** The full family set, mirrored here for runtime validation. */
export const SIGNAL_FAMILIES: readonly SignalFamily[] = [
  "PLAY_CHARTING",
  "MARKET",
  "INJURY_AVAILABILITY",
  "WEATHER_TRAVEL",
  "FANTASY_DFS",
  "SCHEDULE_DENSITY",
  "SCHEME_TENDENCY",
  "NARRATIVE_SOCIAL",
  "SOURCE_TRUST",
  "CALIBRATION_HISTORY",
] as const;

/**
 * Which `ctx.situation` scalar each family owns. When a family is shadowed its
 * scalar is skipped as well — otherwise the signal would re-enter the spine
 * through a side channel and the shadow would be a lie.
 */
const FAMILY_SITUATION_SCALARS: Readonly<Partial<Record<SignalFamily, string>>> = {
  INJURY_AVAILABILITY: "injuryImpact",
  WEATHER_TRAVEL: "weatherImpact",
  SCHEDULE_DENSITY: "scheduleDensity",
};

export interface SignalShadowPolicy {
  /** Families held out of the calibration spine. Non-empty. */
  readonly families: readonly SignalFamily[];
  /**
   * Required, non-empty prose stating why this family is shadowed. This is the
   * guard against silent enablement: the switch cannot be flipped without
   * writing down the reason in code.
   */
  readonly justification: string;
}

/** Thrown when a shadow policy is malformed. Never thrown for absent policies. */
export class InvalidShadowPolicyError extends Error {
  constructor(message: string) {
    super(`Invalid shadow policy: ${message}`);
    this.name = "InvalidShadowPolicyError";
  }
}

/**
 * Build a shadow-only policy for the given families.
 *
 * This is the ONLY supported way to enable shadow mode. It is intentionally a
 * function rather than a bare object literal so the call site reads as a
 * deliberate, justified act.
 */
export function shadowOnly(
  families: readonly SignalFamily[],
  justification: string,
): SignalShadowPolicy {
  if (!Array.isArray(families) || families.length === 0) {
    throw new InvalidShadowPolicyError("`families` must be a non-empty array.");
  }
  if (typeof justification !== "string" || justification.trim().length === 0) {
    throw new InvalidShadowPolicyError(
      "`justification` is required and must be non-empty — shadow mode cannot be enabled silently.",
    );
  }
  const unknown = families.filter((f) => !SIGNAL_FAMILIES.includes(f));
  if (unknown.length > 0) {
    throw new InvalidShadowPolicyError(
      `unknown signal family/families: ${unknown.join(", ")}`,
    );
  }
  return { families: [...new Set(families)], justification: justification.trim() };
}

/**
 * Re-validate a policy that arrived as plain data (e.g. from a config file or
 * a request body) so a hand-rolled object literal cannot bypass the checks in
 * `shadowOnly()`.
 */
export function assertValidShadowPolicy(policy: unknown): asserts policy is SignalShadowPolicy {
  if (policy == null || typeof policy !== "object") {
    throw new InvalidShadowPolicyError("expected an object.");
  }
  const p = policy as Partial<SignalShadowPolicy>;
  if (!Array.isArray(p.families) || p.families.length === 0) {
    throw new InvalidShadowPolicyError("`families` must be a non-empty array.");
  }
  if (typeof p.justification !== "string" || p.justification.trim().length === 0) {
    throw new InvalidShadowPolicyError(
      "`justification` is required and must be non-empty — shadow mode cannot be enabled silently.",
    );
  }
  const unknown = p.families.filter((f) => !SIGNAL_FAMILIES.includes(f));
  if (unknown.length > 0) {
    throw new InvalidShadowPolicyError(
      `unknown signal family/families: ${unknown.join(", ")}`,
    );
  }
}

/** The situation scalar a family owns, if any. */
export function situationScalarFor(family: SignalFamily): string | null {
  return FAMILY_SITUATION_SCALARS[family] ?? null;
}

/** Build a fast membership test for a validated policy. */
export function shadowedFamilyTest(
  policy: SignalShadowPolicy | null | undefined,
): (family: SignalFamily) => boolean {
  if (!policy) return () => false;
  const set = new Set<SignalFamily>(policy.families);
  return (family) => set.has(family);
}
