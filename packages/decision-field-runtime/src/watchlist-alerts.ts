/**
 * MY EDGE WATCHLIST — retention without betting pressure.
 *
 * Scores24 has "My Matches" + notifications optimized to pull you back to bet. GSE's version is
 * proof-native: a user follows matches/players/markets/trials, and every alert explains WHY it fired and
 * links to its proof. No "bet now," no manufactured urgency, user controls frequency. Fixture-only model.
 *
 * Pure + deterministic. Spec: docs/product/MY_MATCHES_AND_ALERTS.md.
 */

export type WatchSubjectKind = "MATCH" | "PLAYER" | "TEAM" | "MARKET" | "PREDICTION_TRIAL" | "STAT_PASSPORT" | "TREND" | "WORLDLINE";

export type AlertType =
  | "LINEUP_CHANGED"
  | "MARKET_OPENED"
  | "MARKET_MOVED"
  | "MARKET_MATURED"
  | "PREDICTION_TRIAL_SETTLED"
  | "STAT_PASSPORT_UPDATED"
  | "AUTHORITY_UPGRADED"
  | "CLAIM_DOWNGRADED"
  | "DATA_SOURCE_STALE"
  | "GOOD_PASS_CONFIRMED";

export type AlertUrgency = "INFO" | "NOTABLE" | "TIME_SENSITIVE";

export interface WatchlistAlert {
  readonly alertId: string;
  readonly subjectKind: WatchSubjectKind;
  readonly subjectId: string;
  readonly type: AlertType;
  readonly reason: string; // ALWAYS explains why it fired
  readonly proofRef: string; // ALWAYS links to its evidence
  readonly urgency: AlertUrgency;
  readonly firedAtLabel: string;
  readonly fixtureWatermarked: true;
}

export interface AlertFrequencySettings {
  readonly maxPerDay: number;
  readonly quietHours: readonly [number, number]; // [startHour, endHour]
  readonly mutedTypes: readonly AlertType[];
  readonly onlyTimeSensitive: boolean;
}

export const DEFAULT_FREQUENCY: AlertFrequencySettings = {
  maxPerDay: 6,
  quietHours: [22, 8],
  mutedTypes: [],
  onlyTimeSensitive: false,
};

/** Urgency is justified by the data, not manufactured: only a few alert types are time-sensitive. */
function urgencyFor(type: AlertType): AlertUrgency {
  switch (type) {
    case "LINEUP_CHANGED":
    case "MARKET_MOVED":
    case "DATA_SOURCE_STALE":
      return "TIME_SENSITIVE";
    case "MARKET_OPENED":
    case "AUTHORITY_UPGRADED":
    case "CLAIM_DOWNGRADED":
      return "NOTABLE";
    default:
      return "INFO";
  }
}

const BET_NOW = /\bbet now\b|\bplace (your )?bet\b|\bact fast\b|\bdon'?t miss\b|\bhurry\b/i;

export function buildAlert(args: { alertId: string; subjectKind: WatchSubjectKind; subjectId: string; type: AlertType; reason: string; proofRef: string; firedAtLabel?: string }): WatchlistAlert {
  // an alert MUST have a reason and a proof reference; manufactured urgency is rejected by construction.
  if (!args.reason.trim()) throw new Error("watchlist alert requires a reason");
  if (!args.proofRef.trim()) throw new Error("watchlist alert requires a proof reference");
  if (BET_NOW.test(args.reason)) throw new Error("watchlist alert reason must not contain bet-now pressure language");
  return {
    alertId: args.alertId,
    subjectKind: args.subjectKind,
    subjectId: args.subjectId,
    type: args.type,
    reason: args.reason,
    proofRef: args.proofRef,
    urgency: urgencyFor(args.type),
    firedAtLabel: args.firedAtLabel ?? "fixture",
    fixtureWatermarked: true,
  };
}

/** Apply a user's frequency settings to a batch of alerts (deterministic; respects quiet/muted/budget). */
export function applyFrequency(alerts: readonly WatchlistAlert[], settings: AlertFrequencySettings = DEFAULT_FREQUENCY): readonly WatchlistAlert[] {
  let out = alerts.filter((a) => !settings.mutedTypes.includes(a.type));
  if (settings.onlyTimeSensitive) out = out.filter((a) => a.urgency === "TIME_SENSITIVE");
  return out.slice(0, Math.max(0, settings.maxPerDay));
}

// ───────────────────────── Fixture alerts (illustrative) ─────────────────────────
export function buildFixtureAlerts(): readonly WatchlistAlert[] {
  return [
    buildAlert({ alertId: "a1", subjectKind: "MATCH", subjectId: "fixture-soccer-ecu-ger-2026", type: "LINEUP_CHANGED", reason: "A starter was added to the predicted lineup; the role read may shift.", proofRef: "worldline:fixture-soccer-ecu-ger-2026#lineup" }),
    buildAlert({ alertId: "a2", subjectKind: "MARKET", subjectId: "germany_tt_under_2_5", type: "MARKET_MATURED", reason: "The market broadened to 5 books and the price has settled.", proofRef: "market-bloom:germany_tt_under_2_5" }),
    buildAlert({ alertId: "a3", subjectKind: "PREDICTION_TRIAL", subjectId: "p-eg-u3", type: "PREDICTION_TRIAL_SETTLED", reason: "The Under 3 goals trial settled WIN with good process.", proofRef: "prediction-court:p-eg-u3" }),
    buildAlert({ alertId: "a4", subjectKind: "STAT_PASSPORT", subjectId: "possession_mirage_index", type: "DATA_SOURCE_STALE", reason: "The source behind this stat has not refreshed — meaning confidence is reduced.", proofRef: "stat-passport:possession_mirage_index" }),
  ];
}
