import { projectGameScript } from "./game-script.js";

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
  /** Total team yards = passYards + rushYards (kept for back-compat). */
  readonly projectedYards: number;
  /** Total team touchdowns = passTouchdowns + rushTouchdowns (kept for back-compat). */
  readonly projectedTouchdowns: number;
  /** Passing-yard pool. By the football identity this equals the receiving-yard pool. */
  readonly passYards: number;
  readonly rushYards: number;
  readonly passTouchdowns: number;
  readonly rushTouchdowns: number;
  /** Game-script (C3) pass rate used to split the team pools. */
  readonly expectedPassRate: number;
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
  /** Receiving-pool allocation weight (primary skill weight) — kept for back-compat. */
  readonly allocationWeight: number;
  readonly passingYards: number;
  readonly rushingYards: number;
  readonly receivingYards: number;
  readonly passingTouchdowns: number;
  readonly rushingTouchdowns: number;
  readonly receivingTouchdowns: number;
  /** Player total yards = passing + rushing + receiving. */
  readonly projectedYards: number;
  /** Player total touchdowns = passing + rushing + receiving. */
  readonly projectedTouchdowns: number;
  readonly fantasyPoints: number;
  readonly divergence: number;
  readonly priced: false;
  readonly status: "shadow";
}

export interface MarketAnchorConservationCheck {
  readonly teamSide: MarketAnchorTeamSide;
  readonly passYardsDelta: number;
  readonly rushYardsDelta: number;
  readonly receivingYardsDelta: number;
  readonly passTouchdownsDelta: number;
  readonly rushTouchdownsDelta: number;
  readonly receivingTouchdownsDelta: number;
  /** True when ALL three yard pools (passing, rushing, receiving) conserve for the team. */
  readonly yardsConserved: boolean;
  /** True when ALL three touchdown pools conserve for the team. */
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

// Role membership for each pool. NOTE: allocation within a pool uses a single shared
// usage*efficiency posterior per player; per-phase (pass/rush/receive) usage posteriors are a
// future refinement, so e.g. a mobile QB's rush share is approximate. Pools still conserve exactly.
const PASS_POSITIONS = new Set(["QB"]);
const RECEIVE_POSITIONS = new Set(["WR", "TE", "RB", "FB"]);
const RUSH_POSITIONS = new Set(["RB", "QB", "WR", "FB"]);

const CONSERVATION_TOLERANCE = 1e-9;

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

// Fantasy points derived from coherent yardage/TD components (standard scoring; passing yards /25,
// passing TD x4; rushing & receiving yards /10, TD x6). PPR receptions are not modeled here.
function fantasyPointsFromComponents(
  passingYards: number,
  passingTouchdowns: number,
  rushingYards: number,
  rushingTouchdowns: number,
  receivingYards: number,
  receivingTouchdowns: number,
): number {
  return (
    passingYards / 25 +
    passingTouchdowns * 4 +
    rushingYards / 10 +
    rushingTouchdowns * 6 +
    receivingYards / 10 +
    receivingTouchdowns * 6
  );
}

export function decomposeMarketAnchor(input: MarketAnchorInput): [TeamVolumeAnchor, TeamVolumeAnchor] {
  const assumptions = resolveAssumptions(input.assumptions);
  // C3 game script gives the pass/run split per team from the Vegas total + spread.
  const script = projectGameScript({
    gameId: input.gameId,
    totalPoints: input.totalPoints,
    homeSpread: input.homeSpread,
  });
  const homeProjectedPoints = (input.totalPoints - input.homeSpread) / 2;
  const awayProjectedPoints = (input.totalPoints + input.homeSpread) / 2;

  const build = (
    teamSide: MarketAnchorTeamSide,
    projectedPoints: number,
    passRate: number,
  ): TeamVolumeAnchor => {
    const projectedYards = projectedPoints * assumptions.yardsPerPoint;
    const projectedTouchdowns = projectedPoints / assumptions.pointsPerTouchdown;
    return {
      gameId: input.gameId,
      teamSide,
      projectedPoints,
      projectedYards,
      projectedTouchdowns,
      passYards: projectedYards * passRate,
      rushYards: projectedYards * (1 - passRate),
      passTouchdowns: projectedTouchdowns * passRate,
      rushTouchdowns: projectedTouchdowns * (1 - passRate),
      expectedPassRate: passRate,
    };
  };

  return [
    build("home", homeProjectedPoints, script.home.expectedPassRate),
    build("away", awayProjectedPoints, script.away.expectedPassRate),
  ];
}

interface PoolShare {
  readonly yards: number;
  readonly touchdowns: number;
  readonly weight: number;
}

function playerAllocationScore(player: MarketAnchoredPlayerInput): number {
  return Math.max(0, player.usagePosteriorMean) * Math.max(0, player.efficiencyPosteriorMean);
}

// Allocate one yard/TD pool across its eligible players by softmax(usage*efficiency), conserving the
// pool exactly via a last-player-gets-the-remainder pass.
function allocatePool(
  players: readonly MarketAnchoredPlayerInput[],
  poolYards: number,
  poolTouchdowns: number,
  allocationTemperature: number,
): Map<string, PoolShare> {
  const shares = new Map<string, PoolShare>();
  if (players.length === 0) return shares;

  const scores = players.map(playerAllocationScore);
  const maxScore = Math.max(...scores);
  const weights =
    maxScore === 0
      ? players.map(() => 1)
      : scores.map((score) => Math.exp((score - maxScore) * allocationTemperature));
  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
  let remainingYards = poolYards;
  let remainingTouchdowns = poolTouchdowns;

  players.forEach((player, index) => {
    const isLast = index === players.length - 1;
    const weight = weightTotal === 0 ? 1 / players.length : weights[index]! / weightTotal;
    const yards = isLast ? remainingYards : poolYards * weight;
    const touchdowns = isLast ? remainingTouchdowns : poolTouchdowns * weight;
    remainingYards -= yards;
    remainingTouchdowns -= touchdowns;
    shares.set(player.playerId, { yards, touchdowns, weight });
  });
  return shares;
}

function reconcileTeam(
  teamPlayers: readonly MarketAnchoredPlayerInput[],
  anchor: TeamVolumeAnchor,
  allocationTemperature: number,
): MarketAnchoredPlayerProjection[] {
  if (teamPlayers.length === 0) return [];

  const eligibleFor = (positions: ReadonlySet<string>) => {
    const eligible = teamPlayers.filter((player) => positions.has(player.position.toUpperCase()));
    // Fallback so a pool is always conserved even with an unusual roster (e.g. no QB present).
    return eligible.length > 0 ? eligible : teamPlayers;
  };

  // Receiving pool magnitude equals the passing pool (every passing yard is a receiving yard).
  const passShares = allocatePool(eligibleFor(PASS_POSITIONS), anchor.passYards, anchor.passTouchdowns, allocationTemperature);
  const receivingShares = allocatePool(eligibleFor(RECEIVE_POSITIONS), anchor.passYards, anchor.passTouchdowns, allocationTemperature);
  const rushShares = allocatePool(eligibleFor(RUSH_POSITIONS), anchor.rushYards, anchor.rushTouchdowns, allocationTemperature);

  const empty: PoolShare = { yards: 0, touchdowns: 0, weight: 0 };

  return teamPlayers.map((player) => {
    const pass = passShares.get(player.playerId) ?? empty;
    const receiving = receivingShares.get(player.playerId) ?? empty;
    const rush = rushShares.get(player.playerId) ?? empty;

    const passingYards = pass.yards;
    const passingTouchdowns = pass.touchdowns;
    const receivingYards = receiving.yards;
    const receivingTouchdowns = receiving.touchdowns;
    const rushingYards = rush.yards;
    const rushingTouchdowns = rush.touchdowns;

    const projectedYards = passingYards + rushingYards + receivingYards;
    const projectedTouchdowns = passingTouchdowns + rushingTouchdowns + receivingTouchdowns;
    const fantasyPoints = fantasyPointsFromComponents(
      passingYards,
      passingTouchdowns,
      rushingYards,
      rushingTouchdowns,
      receivingYards,
      receivingTouchdowns,
    );

    return {
      playerId: player.playerId,
      teamSide: player.teamSide,
      position: player.position,
      allocationWeight: receiving.weight,
      passingYards,
      rushingYards,
      receivingYards,
      passingTouchdowns,
      rushingTouchdowns,
      receivingTouchdowns,
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
  const sum = (selector: (player: MarketAnchoredPlayerProjection) => number) =>
    teamPlayers.reduce((total, player) => total + selector(player), 0);

  const passYardsDelta = sum((p) => p.passingYards) - anchor.passYards;
  const rushYardsDelta = sum((p) => p.rushingYards) - anchor.rushYards;
  const receivingYardsDelta = sum((p) => p.receivingYards) - anchor.passYards;
  const passTouchdownsDelta = sum((p) => p.passingTouchdowns) - anchor.passTouchdowns;
  const rushTouchdownsDelta = sum((p) => p.rushingTouchdowns) - anchor.rushTouchdowns;
  const receivingTouchdownsDelta = sum((p) => p.receivingTouchdowns) - anchor.passTouchdowns;

  return {
    teamSide: anchor.teamSide,
    passYardsDelta,
    rushYardsDelta,
    receivingYardsDelta,
    passTouchdownsDelta,
    rushTouchdownsDelta,
    receivingTouchdownsDelta,
    yardsConserved:
      Math.abs(passYardsDelta) < CONSERVATION_TOLERANCE &&
      Math.abs(rushYardsDelta) < CONSERVATION_TOLERANCE &&
      Math.abs(receivingYardsDelta) < CONSERVATION_TOLERANCE,
    touchdownsConserved:
      Math.abs(passTouchdownsDelta) < CONSERVATION_TOLERANCE &&
      Math.abs(rushTouchdownsDelta) < CONSERVATION_TOLERANCE &&
      Math.abs(receivingTouchdownsDelta) < CONSERVATION_TOLERANCE,
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
    ...reconcileTeam(homePlayers, teamAnchors[0], assumptions.allocationTemperature),
    ...reconcileTeam(awayPlayers, teamAnchors[1], assumptions.allocationTemperature),
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
