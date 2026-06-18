/**
 * Runtime validation for the Pick.factorBreakdown JSON column.
 *
 * Prisma types JSON columns as `JsonValue`, so the previous `pick.factorBreakdown
 * as unknown as FactorBreakdown` cast was compile-time only — it validated
 * nothing and let a malformed or legacy blob reach the public picks surface,
 * where a consumer iterating `.factors` would throw. (The surrounding try/catch
 * was dead: a type assertion can't throw.)
 *
 * This guard mirrors the codebase's narrow-from-unknown pattern
 * (lib/loss-autopsy/parse.ts): check the required scalar scores and the
 * factors[] array, return the typed value when well-formed, else null — a
 * handled, already-rendered "no factor trail" state. It never throws.
 */

import type { FactorBreakdown, FactorDetail } from "@sports/types";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isFactorDetail(v: unknown): v is FactorDetail {
  if (!isRecord(v)) return false;
  return (
    typeof v["name"] === "string" &&
    (v["impact"] === "positive" || v["impact"] === "negative" || v["impact"] === "neutral") &&
    typeof v["description"] === "string"
  );
}

/** Required numeric scores on a valid FactorBreakdown (per @sports/types). */
const REQUIRED_NUMERIC = [
  "consensusScore",
  "marketDepthScore",
  "edgeScore",
  "lineMovementScore",
  "volatilityPenalty",
] as const;

/**
 * Returns the value typed as FactorBreakdown when the required scalar scores are
 * finite numbers and `factors` is an array of well-formed FactorDetail entries;
 * otherwise null. Pure, total, never throws.
 */
export function parseFactorBreakdown(value: unknown): FactorBreakdown | null {
  if (!isRecord(value)) return null;
  for (const key of REQUIRED_NUMERIC) {
    const n = value[key];
    if (typeof n !== "number" || !Number.isFinite(n)) return null;
  }
  const factors = value["factors"];
  if (!Array.isArray(factors) || !factors.every(isFactorDetail)) return null;
  return value as unknown as FactorBreakdown;
}
