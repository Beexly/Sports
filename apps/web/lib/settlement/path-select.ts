/**
 * Settlement path selection law — pure, unit-tested.
 *
 * Free path ONLY when THE_ODDS_API_KEY is absent (unset/blank).
 * Present + deactivated does NOT free-path (paid path fails closed).
 */
export type SettlementPath = "free" | "odds-api";

export function selectSettlementPath(
  oddsApiKey: string | null | undefined,
): SettlementPath {
  const key = typeof oddsApiKey === "string" ? oddsApiKey.trim() : "";
  return key ? "odds-api" : "free";
}

export function isFreePath(oddsApiKey: string | null | undefined): boolean {
  return selectSettlementPath(oddsApiKey) === "free";
}

/**
 * Type guard for the paid path. Keeps the law in this module while giving
 * callers the narrowing that a bare `if (!apiKey)` check used to provide —
 * comparing `selectSettlementPath(apiKey) === "free"` is correct at runtime
 * but tells TypeScript nothing about `apiKey`, so downstream paid-path calls
 * still saw `string | undefined`.
 */
export function hasOddsApiKey(
  oddsApiKey: string | null | undefined,
): oddsApiKey is string {
  return selectSettlementPath(oddsApiKey) === "odds-api";
}

/** Operator-facing diagnosis without inventing secrets. */
export function diagnoseOddsKeyPresence(
  oddsApiKey: string | null | undefined,
): {
  path: SettlementPath;
  keyPresent: boolean;
  operatorAction: string;
} {
  const path = selectSettlementPath(oddsApiKey);
  const keyPresent = path === "odds-api";
  return {
    path,
    keyPresent,
    operatorAction: keyPresent
      ? "Delete THE_ODDS_API_KEY from Production (blank/absent). Present+deactivated does NOT free-path."
      : "Key absent — free path active. Smoke settle-picks; expect path:free.",
  };
}
