/**
 * League memory roadmap data contract for Galaxy Sports Edge.
 * Defines the data model, manager profiling, trade value calibration,
 * and league-specific recommendation personalization system.
 */

// ── League memory types ───────────────────────────────────────────────────────

export type LeagueFormat = "redraft" | "keeper" | "dynasty" | "best_ball";
export type TradeStatus = "accepted" | "rejected" | "countered" | "pending" | "expired";
export type WaiverType = "faab" | "waivers_priority" | "free_agent";
export type ManagerArchetype =
  | "AGGRESSIVE_DRAFTER"
  | "CONSERVATIVE_MANAGER"
  | "TRADE_HEAVY"
  | "WAIVER_WIRE_HAWK"
  | "SET_AND_FORGET"
  | "DATA_DRIVEN"
  | "GUT_FEEL"
  | "UNKNOWN";

export interface LeagueMemoryProfile {
  leagueId: string;
  leagueName: string;
  platform: string;
  format: LeagueFormat;
  seasons: number;
  importedAt: string;
  managerCount: number;
  valueCalibration: LeagueValueCalibration;
  managers: ManagerProfile[];
  leagueQuirks: string[];
}

export interface LeagueValueCalibration {
  rbPremium: number;
  wrDiscount: number;
  tePremium: number;
  rookieWrDiscount: number;
  veteranQbPremium: number;
  calibrationSampleSize: number;
  lastUpdated: string;
  confidenceLevel: "low" | "medium" | "high";
}

export interface ManagerProfile {
  managerId: string;
  managerName: string;
  seasons: number;
  archetype: ManagerArchetype;
  championships: number;
  avgFinish: number;
  tradeAcceptanceRate: number;
  typicalOfferStyle: string;
  overvaluesPositions: string[];
  undervaluesPositions: string[];
  draftTendencies: DraftTendencyRecord[];
  tradeHistory: TradeRecord[];
}

export interface DraftTendencyRecord {
  season: number;
  pickPosition: number;
  strategy: string;
  roundByRoundNotes: string[];
  outcomeFinish: number | null;
}

export interface TradeRecord {
  id: string;
  season: number;
  week: number;
  status: TradeStatus;
  offeredPlayers: string[];
  requestedPlayers: string[];
  valueGap: number;
  acceptedReason: string | null;
  rejectedReason: string | null;
}

// ── League value model ────────────────────────────────────────────────────────

export interface LeagueValueAdjustment {
  position: string;
  adjustmentMultiplier: number;
  dataPoints: number;
  interpretation: string;
  confidenceNote: string;
}

export function computeLeagueValueAdjustments(
  tradeHistory: TradeRecord[]
): LeagueValueAdjustment[] {
  const acceptedTrades = tradeHistory.filter((t) => t.status === "accepted");

  if (acceptedTrades.length < 5) {
    return [
      {
        position: "ALL",
        adjustmentMultiplier: 1.0,
        dataPoints: acceptedTrades.length,
        interpretation: "Insufficient trade history for calibration",
        confidenceNote: "Minimum 5 accepted trades required",
      },
    ];
  }

  return [
    {
      position: "RB",
      adjustmentMultiplier: 1.0,
      dataPoints: acceptedTrades.length,
      interpretation: "RB value appears market-rate in your league",
      confidenceNote: `Based on ${acceptedTrades.length} trades — source gap: verify before publishing`,
    },
  ];
}

// ── League memory import formats ───────────────────────────────────────────────

export type ImportFormat =
  | "sleeper_api"
  | "yahoo_api"
  | "espn_manual_csv"
  | "manual_entry"
  | "mfl_api"
  | "fantrax_csv";

export interface ImportFormatSpec {
  format: ImportFormat;
  name: string;
  dataQuality: "high" | "medium" | "low";
  automatable: boolean;
  legalPosture: string;
  implementationComplexity: "low" | "medium" | "high";
  supportedData: string[];
}

export const IMPORT_FORMAT_SPECS: ReadonlyArray<ImportFormatSpec> = [
  {
    format: "sleeper_api",
    name: "Sleeper Official API",
    dataQuality: "high",
    automatable: true,
    legalPosture:
      "CONDITIONAL_PERMISSION — requires user OAuth token. Read-only draft + roster data permitted. Review current ToS before implementation.",
    implementationComplexity: "medium",
    supportedData: ["draft history", "roster history", "trade history", "standings", "manager profiles"],
  },
  {
    format: "yahoo_api",
    name: "Yahoo Fantasy API",
    dataQuality: "high",
    automatable: true,
    legalPosture:
      "CONDITIONAL_PERMISSION — requires OAuth2. Read-only. No automated pick submission or lineup setting.",
    implementationComplexity: "medium",
    supportedData: ["draft results", "rosters", "transactions", "standings"],
  },
  {
    format: "espn_manual_csv",
    name: "ESPN Manual CSV Export",
    dataQuality: "medium",
    automatable: false,
    legalPosture:
      "PERMITTED via manual user export. ESPN prohibits automated scraping. User exports their own data.",
    implementationComplexity: "low",
    supportedData: ["draft results (exported by user)", "final standings"],
  },
  {
    format: "manual_entry",
    name: "Manual Entry",
    dataQuality: "low",
    automatable: false,
    legalPosture: "PERMITTED — user enters their own data.",
    implementationComplexity: "low",
    supportedData: ["manual trade entry", "draft pick entry", "season results"],
  },
  {
    format: "mfl_api",
    name: "MyFantasyLeague API",
    dataQuality: "high",
    automatable: true,
    legalPosture: "UNDER_REVIEW — MFL has an API for paid subscribers. Terms need review.",
    implementationComplexity: "high",
    supportedData: ["draft history", "roster history", "trades", "dynasty data"],
  },
  {
    format: "fantrax_csv",
    name: "Fantrax CSV Export",
    dataQuality: "medium",
    automatable: false,
    legalPosture: "UNDER_REVIEW — confirm Fantrax export ToS before implementation.",
    implementationComplexity: "medium",
    supportedData: ["standings", "rosters", "basic draft info"],
  },
] as const;

// ── Helper functions ──────────────────────────────────────────────────────────

export function automatedImportFormats(): ImportFormatSpec[] {
  return IMPORT_FORMAT_SPECS.filter((f) => f.automatable) as ImportFormatSpec[];
}

export function manualImportFormats(): ImportFormatSpec[] {
  return IMPORT_FORMAT_SPECS.filter((f) => !f.automatable) as ImportFormatSpec[];
}

export function archetypeLabel(archetype: ManagerArchetype): string {
  const labels: Record<ManagerArchetype, string> = {
    AGGRESSIVE_DRAFTER: "Aggressive Drafter",
    CONSERVATIVE_MANAGER: "Conservative Manager",
    TRADE_HEAVY: "Trade-Heavy Dealer",
    WAIVER_WIRE_HAWK: "Waiver Wire Hawk",
    SET_AND_FORGET: "Set and Forget",
    DATA_DRIVEN: "Data-Driven",
    GUT_FEEL: "Gut Feel",
    UNKNOWN: "Unknown",
  };
  return labels[archetype];
}
