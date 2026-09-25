export type DraftPosition = "QB" | "RB" | "WR" | "TE" | "DST" | "K";

export interface DraftPlayer {
  readonly id: string;
  readonly name: string;
  readonly position: DraftPosition;
  readonly projectedPoints: number;
  readonly adp: number;
  readonly available: boolean;
}

export interface DraftRecommendation {
  readonly player: DraftPlayer;
  readonly projectedPoints: number;
  readonly tier: 1 | 2 | 3 | 4 | 5;
  readonly reasoning: string;
}

export interface DraftCopilotInput {
  readonly pickNumber: number;
  readonly rosterSoFar: readonly DraftPlayer[];
  readonly availablePlayers: readonly DraftPlayer[];
}

function tierFor(value: number, all: readonly number[]): 1 | 2 | 3 | 4 | 5 {
  const rank = all.filter((candidate) => candidate >= value).length;
  const percentile = all.length <= 1 ? 1 : 1 - (rank - 1) / (all.length - 1);
  return percentile >= 0.8 ? 1 : percentile >= 0.6 ? 2 : percentile >= 0.4 ? 3 : percentile >= 0.2 ? 4 : 5;
}

export function recommendPick(input: DraftCopilotInput): DraftRecommendation | null {
  const available = input.availablePlayers.filter((player) => player.available && Number.isFinite(player.projectedPoints) && player.projectedPoints > 0 && Number.isFinite(player.adp));
  if (available.length === 0 || !Number.isFinite(input.pickNumber) || input.pickNumber < 1) return null;
  const rosterCounts = new Map<DraftPosition, number>();
  for (const player of input.rosterSoFar) rosterCounts.set(player.position, (rosterCounts.get(player.position) ?? 0) + 1);
  const scarcityByPosition = new Map<DraftPosition, number>();
  for (const player of available) scarcityByPosition.set(player.position, (scarcityByPosition.get(player.position) ?? 0) + 1);
  const projections = available.map((player) => player.projectedPoints);
  const scored = available.map((player) => {
    const scarcityPenalty = Math.max(0, 5 - (scarcityByPosition.get(player.position) ?? 0)) * 0.5;
    const needBonus = Math.max(0, 2 - (rosterCounts.get(player.position) ?? 0)) * 1.5;
    const adpValue = Math.max(0, 36 - player.adp) * 0.05;
    return { player, score: player.projectedPoints - scarcityPenalty + needBonus + adpValue };
  }).sort((a, b) => b.score - a.score || a.player.adp - b.player.adp);
  const winner = scored[0];
  if (!winner) return null;
  const runnerUp = scored[1]?.player;
  const reasoning = `${winner.player.name} wins on projected value after ${winner.player.position} scarcity and roster need${runnerUp ? `; over ${runnerUp.name}` : ""}.`;
  return {
    player: winner.player,
    projectedPoints: winner.player.projectedPoints,
    tier: tierFor(winner.player.projectedPoints, projections),
    reasoning,
  };
}
