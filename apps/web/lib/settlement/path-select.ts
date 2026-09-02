/**
 * Settlement path law — pure, unit-tested.
 *
 * Since 2026-09-02 the free path (ESPN + registered consensus sources) is the
 * PRIMARY grader on every cycle, regardless of THE_ODDS_API_KEY. A present key
 * only adds a paid *supplement* pass afterwards: `settleSport` grades whatever
 * the free pass left PENDING (both passes are PENDING-scoped and the free
 * runner never overwrites a conflicting paid final). A present-but-dead key
 * therefore costs one failing call per sport per cycle and grades nothing
 * less — before this law a dead key silently starved settlement for 9 days
 * because the paid branch ran alone and threw every hour.
 *
 * `selectSettlementPath` keeps its historical two-value contract for the
 * smoke scripts and eval fixtures that assert it: "odds-api" now means "the
 * paid supplement is available", never "the free grader is skipped".
 */
export type SettlementPath = "free" | "odds-api";

export interface SettlementPlan {
  /** The grader that always runs first. Never anything but "free". */
  readonly primary: "free";
  /** Whether the paid Odds API supplement runs after the free pass. */
  readonly paidSupplement: boolean;
  /** Response label: "free" alone, or "free+odds-api" when the supplement ran. */
  readonly label: "free" | "free+odds-api";
}

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
 * The plan the cron executes. Free first, always; the paid supplement only
 * when a key is present and the operator did not force `?path=free`.
 */
export function selectSettlementPlan(
  oddsApiKey: string | null | undefined,
  options: { readonly forceFree?: boolean } = {},
): SettlementPlan {
  const paidSupplement = !options.forceFree && hasOddsApiKey(oddsApiKey);
  return {
    primary: "free",
    paidSupplement,
    label: paidSupplement ? "free+odds-api" : "free",
  };
}

/**
 * Type guard for the paid supplement. Keeps the law in this module while giving
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
      ? "Key present — free grader runs first every cycle; the paid supplement follows. If settle-picks reports paidSupplement.failedSports every hour the key is dead: delete THE_ODDS_API_KEY from Production or renew it (either state is safe)."
      : "Key absent — free grader only. Smoke settle-picks; expect path:free.",
  };
}
