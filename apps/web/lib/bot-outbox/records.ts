import type {
  BotGatedSlateInput,
  BotPickPublicationInput,
  BotSettlementInput,
} from "@/lib/bot-outbox/plan";
import type { FactorKey } from "@/lib/twitter-bot/templates";

type PickResultValue = "PENDING" | "WIN" | "LOSS" | "PUSH" | "VOID";
type PickTierValue = "FREE" | "PREMIUM";

interface SportRecord {
  name: string;
}

interface GameRecord {
  id: string;
  awayTeamName: string;
  homeTeamName: string;
  commenceTime: Date;
  currentEdgeIndex: number | null;
  homeScore?: number | null;
  awayScore?: number | null;
  sport: SportRecord;
}

interface PickRecord {
  id: string;
  gameId: string;
  pickType: string;
  selection: string;
  line: number;
  confidence: number;
  edgeScore: number;
  tier: PickTierValue;
  pickGrade: string;
  modelVersion: string;
  result: PickResultValue;
  settledAt: Date | null;
  isPublished: boolean;
  isBootstrap: boolean;
  factorBreakdown: unknown;
  game: GameRecord;
}

interface GateDecisionRecord {
  id: string;
  gameId: string;
  reason: string;
  reasonCode: string;
  edgeIndex: number | null;
  modelVersion: string;
  isBootstrap: boolean;
  evaluatedAt: Date;
  game: GameRecord;
}

const FACTOR_ALIASES: Record<string, FactorKey> = {
  atsForm: "venueForm",
  consensus: "consensus",
  crossMarket: "crossMarket",
  dataQuality: "dataQuality",
  depth: "depth",
  edge: "edge",
  h2h: "headToHead",
  headToHead: "headToHead",
  lineMovement: "lineMovement",
  odds: "edge",
  restAdvantage: "restAdvantage",
  schedule: "scheduleStress",
  scheduleStress: "scheduleStress",
  venueForm: "venueForm",
  volatility: "volatility",
};

function matchup(game: Pick<GameRecord, "awayTeamName" | "homeTeamName">): string {
  return `${game.awayTeamName} @ ${game.homeTeamName}`;
}

function formatLine(value: number): string {
  if (value === 0) return "0";
  return value > 0 ? `+${value}` : `${value}`;
}

function mapPickResult(result: PickResultValue): "W" | "L" | "PUSH" | "VOID" | "PENDING" {
  if (result === "WIN") return "W";
  if (result === "LOSS") return "L";
  if (result === "PUSH") return "PUSH";
  // VOID is NO ACTION — never collapse it into PUSH. A push claims a graded
  // tie; a void means the bet never happened (cancelled/postponed game). The
  // M-F9 sweep (PR #86) made VOID reachable in volume: a postponed slate
  // rendered as a pile of public "PUSH" settlement posts would fabricate
  // outcomes. plan.ts blocks VOID from settlement posts entirely.
  if (result === "VOID") return "VOID";
  return "PENDING";
}

function finalScore(game: Pick<GameRecord, "awayTeamName" | "homeTeamName" | "awayScore" | "homeScore">): string {
  if (game.awayScore === null || game.awayScore === undefined) return "";
  if (game.homeScore === null || game.homeScore === undefined) return "";
  return `${game.awayTeamName} ${game.awayScore}, ${game.homeTeamName} ${game.homeScore}`;
}

function numericEntries(value: unknown): Array<{ key: string; score: number }> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return [];
  return Object.entries(value).flatMap(([key, raw]) =>
    typeof raw === "number" && Number.isFinite(raw) ? [{ key, score: raw }] : [],
  );
}

export function topFactorsFromBreakdown(
  factorBreakdown: unknown,
): Array<{ factor: FactorKey; score: number }> {
  const seen = new Set<FactorKey>();
  return numericEntries(factorBreakdown)
    .flatMap(({ key, score }) => {
      const factor = FACTOR_ALIASES[key];
      if (!factor || seen.has(factor)) return [];
      seen.add(factor);
      return [{ factor, score: Math.abs(score) }];
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, 3);
}

export function pickRecordToPublicationInput(pick: PickRecord): BotPickPublicationInput {
  return {
    pickId: pick.id,
    gameId: pick.gameId,
    matchup: matchup(pick.game),
    pickKind: pick.pickType,
    line: pick.selection || formatLine(pick.line),
    side: pick.selection,
    pickGrade: pick.pickGrade,
    confidence: pick.confidence,
    edgeIndex: pick.game.currentEdgeIndex ?? pick.edgeScore,
    sport: pick.game.sport.name,
    modelVersion: pick.modelVersion,
    gameStartsAt: pick.game.commenceTime,
    tier: pick.tier,
    isPublished: pick.isPublished,
    isBootstrap: pick.isBootstrap,
  };
}

export function pickRecordToSettlementInput(pick: PickRecord): BotSettlementInput {
  return {
    pickId: pick.id,
    gameId: pick.gameId,
    matchup: matchup(pick.game),
    pickLine: pick.selection || formatLine(pick.line),
    outcome: mapPickResult(pick.result),
    finalScore: finalScore(pick.game),
    confidenceAtPublish: pick.confidence,
    heaviestContributorFactor: topFactorsFromBreakdown(pick.factorBreakdown)[0]?.factor ?? null,
    biggestMissFactor: pick.result === "LOSS" ? topFactorsFromBreakdown(pick.factorBreakdown)[0]?.factor ?? null : null,
    oneLineCause: pick.result === "LOSS" ? "the highest-weighted signal did not hold" : null,
    sport: pick.game.sport.name,
    modelVersion: pick.modelVersion,
    settledAt: pick.settledAt,
    tier: pick.tier,
    isPublished: pick.isPublished,
    isBootstrap: pick.isBootstrap,
    topFactorsAtPublish: topFactorsFromBreakdown(pick.factorBreakdown),
    whatChanged: "Settlement changed the game snapshot from pending to final.",
    whatThisUpdates: "Review the settled signal snapshot before changing any model assumptions.",
  };
}

export function gateDecisionRecordToGatedInput(decision: GateDecisionRecord): BotGatedSlateInput {
  return {
    gateDecisionId: decision.id,
    gameId: decision.gameId,
    matchup: matchup(decision.game),
    edgeIndex: decision.edgeIndex ?? decision.game.currentEdgeIndex,
    gateReason: decision.reasonCode,
    gateReasonText: decision.reason,
    sport: decision.game.sport.name,
    modelVersion: decision.modelVersion,
    gateDecisionAt: decision.evaluatedAt,
    isBootstrap: decision.isBootstrap,
  };
}
