export type MarketAnchorTeamSide = "home" | "away";

export interface MarketAnchorAssumptions {
  readonly yardsPerPoint: number;
  readonly pointsPerTouchdown: number;
  readonly allocationTemperature: number;
}

export interface MarketAnchorInput {
  readonly gameId: string;
  readonly totalPoints: number;
  readonly homeSpread: number;
  readonly assumptions?: Partial<MarketAnchorAssumptions>;
}

export interface TeamVolumeAnchor {
  readonly gameId: string;
  readonly teamSide: MarketAnchorTeamSide;
  readonly projectedPoints: number;
  readonly projectedYards: number;
  readonly projectedTouchdowns: number;
}

export interface MarketAnchoredPlayerInput {
  readonly playerId: string;
  readonly teamSide: MarketAnchorTeamSide;
  readonly position: string;
  readonly usagePosteriorMean: number;
  readonly efficiencyPosteriorMean: number;
  readonly baselineFantasyPoints?: number;
}

export interface MarketAnchoredPlayerProjection {
  readonly playerId: string;
  readonly teamSide: MarketAnchorTeamSide;
  readonly position: string;
  readonly allocationWeight: number;
  readonly projectedYards: number;
  readonly projectedTouchdowns: number;
  readonly fantasyPoints: number;
  readonly divergence: number;
  readonly priced: false;
  readonly status: "shadow";
}

export interface MarketAnchorConservationCheck {
  readonly teamSide: MarketAnchorTeamSide;
  readonly yardsDelta: number;
  readonly touchdownsDelta: number;
  readonly yardsConserved: boolean;
  readonly touchdownsConserved: boolean;
}

export interface MarketAnchoredReconciliation {
  readonly gameId: string;
  readonly teamAnchors: readonly [TeamVolumeAnchor, TeamVolumeAnchor];
  readonly players: readonly MarketAnchoredPlayerProjection[];
  readonly conservation: readonly [MarketAnchorConservationCheck, MarketAnchorConservationCheck];
  readonly priced: false;
  readonly status: "shadow";
}

export const DEFAULT_MARKET_ANCHOR_ASSUMPTIONS: MarketAnchorAssumptions = {
  yardsPerPoint: 14.5,
  pointsPerTouchdown: 7,
  allocationTemperature: 1,
};

function resolveAssumptions(assumptions?: Partial<MarketAnchorAssumptions>): MarketAnchorAssumptions {
  return {
    yardsPerPoint: assumptions?.yardsPerPoint ?? DEFAULT_MARKET_ANCHOR_ASSUMPTIONS.yardsPerPoint,
    pointsPerTouchdown:
      assumptions?.pointsPerTouchdown ?? DEFAULT_MARKET_ANCHOR_ASSUMPTIONS.pointsPerTouchdown,
    allocationTemperature:
      assumptions?.allocationTemperature ??
      DEFAULT_MARKET_ANCHOR_ASSUMPTIONS.allocationTemperature,
  };
}

function fantasyPointsFromYardsAndTouchdowns(position: string, yards: number, touchdowns: number): number {
  if (position.toUpperCase() === "QB") {
    return yards / 25 + touchdowns * 4;
  }
  return yards / 10 + touchdowns * 6;
}

export function decomposeMarketAnchor(input: MarketAnchorInput): [TeamVolumeAnchor, TeamVolumeAnchor] {
  const assumptions = resolveAssumptions(input.assumptions);
  const homeProjectedPoints = (input.totalPoints - input.homeSpread) / 2;
  const awayProjectedPoints = (input.totalPoints + input.homeSpread) / 2;

  return [
    {
      gameId: input.gameId,
      teamSide: "home",
      projectedPoints: homeProjectedPoints,
      projectedYards: homeProjectedPoints * assumptions.yardsPerPoint,
      projectedTouchdowns: homeProjectedPoints / assumptions.pointsPerTouchdown,
    },
    {
      gameId: input.gameId,
      teamSide: "away",
      projectedPoints: awayProjectedPoints,
      projectedYards: awayProjectedPoints * assumptions.yardsPerPoint,
      projectedTouchdowns: awayProjectedPoints / assumptions.pointsPerTouchdown,
    },
  ];
}

function playerAllocationScore(player: MarketAnchoredPlayerInput): number {
  return Math.max(0, player.usagePosteriorMean) * Math.max(0, player.efficiencyPosteriorMean);
}

function allocateTeam(
  players: readonly MarketAnchoredPlayerInput[],
  anchor: TeamVolumeAnchor,
  allocationTemperature: number,
): readonly MarketAnchoredPlayerProjection[] {
  if (players.length === 0) return [];

  const scores = players.map(playerAllocationScore);
  const maxScore = Math.max(...scores);
  const weights =
    maxScore === 0
      ? players.map(() => 1)
      : scores.map((score) => Math.exp((score - maxScore) * allocationTemperature));
  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
  let remainingYards = anchor.projectedYards;
  let remainingTouchdowns = anchor.projectedTouchdowns;

  return players.map((player, index) => {
    const isLast = index === players.length - 1;
    const allocationWeight = weightTotal === 0 ? 1 / players.length : weights[index]! / weightTotal;
    const projectedYards = isLast ? remainingYards : anchor.projectedYards * allocationWeight;
    const projectedTouchdowns = isLast
      ? remainingTouchdowns
      : anchor.projectedTouchdowns * allocationWeight;
    remainingYards -= projectedYards;
    remainingTouchdowns -= projectedTouchdowns;
    const fantasyPoints = fantasyPointsFromYardsAndTouchdowns(
      player.position,
      projectedYards,
      projectedTouchdowns,
    );

    return {
      playerId: player.playerId,
      teamSide: player.teamSide,
      position: player.position,
      allocationWeight,
      projectedYards,
      projectedTouchdowns,
      fantasyPoints,
      divergence: fantasyPoints - (player.baselineFantasyPoints ?? fantasyPoints),
      priced: false,
      status: "shadow",
    };
  });
}

function conservationCheck(
  anchor: TeamVolumeAnchor,
  players: readonly MarketAnchoredPlayerProjection[],
): MarketAnchorConservationCheck {
  const teamPlayers = players.filter((player) => player.teamSide === anchor.teamSide);
  const yardsDelta =
    teamPlayers.reduce((sum, player) => sum + player.projectedYards, 0) - anchor.projectedYards;
  const touchdownsDelta =
    teamPlayers.reduce((sum, player) => sum + player.projectedTouchdowns, 0) -
    anchor.projectedTouchdowns;

  return {
    teamSide: anchor.teamSide,
    yardsDelta,
    touchdownsDelta,
    yardsConserved: Math.abs(yardsDelta) < 1e-9,
    touchdownsConserved: Math.abs(touchdownsDelta) < 1e-9,
  };
}

export function reconcileMarketAnchoredPlayers(
  input: MarketAnchorInput,
  players: readonly MarketAnchoredPlayerInput[],
): MarketAnchoredReconciliation {
  const assumptions = resolveAssumptions(input.assumptions);
  const teamAnchors = decomposeMarketAnchor(input);
  const homePlayers = players.filter((player) => player.teamSide === "home");
  const awayPlayers = players.filter((player) => player.teamSide === "away");
  const reconciledPlayers = [
    ...allocateTeam(homePlayers, teamAnchors[0], assumptions.allocationTemperature),
    ...allocateTeam(awayPlayers, teamAnchors[1], assumptions.allocationTemperature),
  ];

  return {
    gameId: input.gameId,
    teamAnchors,
    players: reconciledPlayers,
    conservation: [
      conservationCheck(teamAnchors[0], reconciledPlayers),
      conservationCheck(teamAnchors[1], reconciledPlayers),
    ],
    priced: false,
    status: "shadow",
  };
}
