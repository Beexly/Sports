export type Position = "QB" | "RB" | "WR" | "TE" | "DST" | "K";

export interface LeagueSettings {
  readonly ppr: 0 | 0.5 | 1;
  readonly rosterSlots: Readonly<Record<Position, number>>;
}

export interface TradePlayer {
  readonly player: string;
  readonly position: Position;
  readonly projectedPoints: number;
  readonly matchupAdjustmentPct: number;
}

export interface TradePlayerTier {
  readonly player: string;
  readonly position: Position;
  readonly adjustedValue: number;
  readonly tier: "elite" | "starter" | "flex" | "replaceable";
}

export interface TradeAnalysis {
  readonly verdict: "fair" | "wins" | "loses" | "fleece";
  readonly valueDeltaPct: number;
  readonly tiersA: readonly TradePlayerTier[];
  readonly tiersB: readonly TradePlayerTier[];
  readonly explanation: string;
}

export const STARTER_SLOTS: Readonly<Record<Position, number>> = {
  QB: 1, RB: 2, WR: 3, TE: 1, DST: 1, K: 1,
};

function finite(value: number): value is number {
  return Number.isFinite(value);
}

function adjustedValue(player: TradePlayer, settings: LeagueSettings): number {
  const scoringMultiplier = 1 + settings.ppr * 0.08;
  return player.projectedPoints * scoringMultiplier * (1 + player.matchupAdjustmentPct / 100);
}

function tierFor(value: number, sortedValues: readonly number[]): TradePlayerTier["tier"] {
  const rank = sortedValues.filter((candidate) => candidate <= value).length;
  const percentile = sortedValues.length <= 1 ? 1 : (rank - 1) / (sortedValues.length - 1);
  if (percentile >= 0.9) return "elite";
  if (percentile >= 0.65) return "starter";
  if (percentile >= 0.3) return "flex";
  return "replaceable";
}

function tierPlayers(players: readonly TradePlayer[], settings: LeagueSettings): readonly TradePlayerTier[] {
  const values = players.map((player) => adjustedValue(player, settings)).sort((a, b) => a - b);
  return players
    .map((player) => ({
      player: player.player,
      position: player.position,
      adjustedValue: adjustedValue(player, settings),
      tier: tierFor(adjustedValue(player, settings), values),
    }))
    .sort((a, b) => b.adjustedValue - a.adjustedValue || a.player.localeCompare(b.player));
}

export function analyzeTrade(
  teamA: readonly TradePlayer[],
  teamB: readonly TradePlayer[],
  settings: LeagueSettings,
): TradeAnalysis {
  const validA = teamA.filter((player) => finite(player.projectedPoints) && finite(player.matchupAdjustmentPct));
  const validB = teamB.filter((player) => finite(player.projectedPoints) && finite(player.matchupAdjustmentPct));
  const sumA = validA.reduce((sum, player) => sum + adjustedValue(player, settings), 0);
  const sumB = validB.reduce((sum, player) => sum + adjustedValue(player, settings), 0);
  const base = Math.max(Math.abs(sumA), Math.abs(sumB), 1);
  const delta = ((sumB - sumA) / base) * 100;
  const magnitude = Math.abs(delta);
  const verdict = magnitude < 5 ? "fair" : delta > 0 ? (magnitude > 15 ? "fleece" : "wins") : (magnitude > 15 ? "fleece" : "loses");
  const tiersA = tierPlayers(validA, settings);
  const tiersB = tierPlayers(validB, settings);
  const explanation = magnitude < 5
    ? "The swap is within 5% fair value."
    : `Team ${delta > 0 ? "B" : "A"} receives the better package by ${magnitude.toFixed(1)}%.`;
  return { verdict, valueDeltaPct: delta, tiersA, tiersB, explanation };
}

export const DEFAULT_LEAGUE_SETTINGS: LeagueSettings = {
  ppr: 1,
  rosterSlots: { QB: 1, RB: 2, WR: 3, TE: 1, DST: 1, K: 1 },
};
