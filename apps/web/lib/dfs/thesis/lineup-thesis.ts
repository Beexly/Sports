export interface LineupThesis {
  lineupId: string;
  thesis: string;
  stackDescription: string;
  stackEvidence: string;
  stackCounterEvidence: string;
  riskDependency: string;
  leveragePoint: string;
  whatBreaksThis: string;
  contestFit: string;
  lateSwapNote: string;
  highestRiskPlayer: string;
  highestUpsidePlayer: string;
  leveragePlayer: string;
}

export interface LineupThesisInput {
  lineupId: string;
  players: Array<{
    name: string;
    position: string;
    team: string;
    projection: number;
    ceiling: number;
    ownership: number;
    salary: number;
    isStack?: boolean;
  }>;
  salary: number;
  projection: number;
  ceiling: number;
  totalOwnership: number;
  stackTeam: string | null;
  contestMode: string;
}

type Player = LineupThesisInput["players"][number];

/** Reduce over an array without a required initial value, returning undefined if empty. */
function reduceNonempty<T>(arr: T[], fn: (acc: T, cur: T) => T): T | undefined {
  if (arr.length === 0) return undefined;
  return arr.reduce(fn);
}

export function generateLineupThesis(lineup: LineupThesisInput): LineupThesis {
  const { players, stackTeam, contestMode } = lineup;

  // Sentinel fallback player used when all filtered lists are empty.
  const fallbackPlayer: Player = {
    name: "Unknown",
    position: "FLEX",
    team: "",
    projection: 0,
    ceiling: 0,
    ownership: 0,
    salary: 0,
  };

  // Find QB
  const qb = players.find((p) => p.position === "QB");

  // Find stack players (isStack=true OR same team as stackTeam and not DST)
  const stackNonQB = players.filter(
    (p) =>
      p.position !== "QB" &&
      (p.isStack === true ||
        (stackTeam !== null && p.team === stackTeam && p.position !== "DST"))
  );

  // Find the primary stack WR (highest ceiling among non-QB stack players)
  const stackWR =
    reduceNonempty(stackNonQB, (best, p) => (p.ceiling > best.ceiling ? p : best)) ??
    null;

  // highestRiskPlayer: highest ownership non-QB player (most chalk = most risk if they fail)
  const nonQBPlayers = players.filter((p) => p.position !== "QB");
  const highestRiskPlayer: Player =
    reduceNonempty(nonQBPlayers, (best, p) =>
      p.ownership > best.ownership ? p : best
    ) ??
    players[0] ??
    fallbackPlayer;

  // highestUpsidePlayer: player with highest ceiling
  const highestUpsidePlayer: Player =
    reduceNonempty(players, (best, p) => (p.ceiling > best.ceiling ? p : best)) ??
    fallbackPlayer;

  // leveragePlayer: lowest ownership relative to ceiling among non-QB players
  // metric = ceiling / (ownership * 100 + 1)
  const leveragePlayer: Player =
    reduceNonempty(nonQBPlayers, (best, p) => {
      const score = p.ceiling / (p.ownership * 100 + 1);
      const bestScore = best.ceiling / (best.ownership * 100 + 1);
      return score > bestScore ? p : best;
    }) ??
    players[0] ??
    fallbackPlayer;

  // lowestSalaryPlayer for no-stack thesis
  const lowestSalaryPlayer: Player | undefined = reduceNonempty(
    players,
    (lowest, p) => (p.salary < lowest.salary ? p : lowest)
  );
  const lowestSalaryPos = lowestSalaryPlayer ? lowestSalaryPlayer.position : "FLEX";

  // floor estimate for no-stack thesis
  const floor = lineup.projection * 0.75;

  // Generate thesis string
  let thesis: string;
  if (stackTeam && qb) {
    const stackWRName = stackWR ? stackWR.name : "top target";
    thesis = `Lineup thesis: ${stackTeam} passing stack wins if game script stays competitive. QB targets ${stackWRName} as primary upside driver.`;
  } else {
    thesis = `Lineup thesis: No primary stack. Value play at ${lowestSalaryPos} with floor projection of ${floor.toFixed(1)} pts.`;
  }

  // stackDescription
  const stackDescription =
    stackTeam && qb
      ? `${qb.name} + ${stackNonQB.length} pass-catchers from ${stackTeam}`
      : "No clear team stack";

  // stackEvidence
  const stackEvidence =
    stackTeam
      ? `Game environment favors ${stackTeam} passing. Stack correlation increases ceiling when QB has a big game.`
      : "No correlated stack reduces both upside and downside.";

  // stackCounterEvidence
  const stackCounterEvidence =
    stackTeam && qb
      ? `Stack fails if ${stackTeam} falls behind early (game script shifts to run) or if defensive coordinator takes away ${qb.name}'s primary reads.`
      : "Without a stack, lineup needs multiple independent performers.";

  // riskDependency
  const riskDependency = `Risk concentrated in ${highestRiskPlayer.name} (${(highestRiskPlayer.ownership * 100).toFixed(0)}% owned). Chalk failure = lineup miss.`;

  // leveragePoint
  const leveragePoint = `Leverage: ${leveragePlayer.name} is under-owned (${(leveragePlayer.ownership * 100).toFixed(0)}%) relative to ${leveragePlayer.ceiling.toFixed(1)}-pt ceiling. Mass tournament winner if hits.`;

  // whatBreaksThis
  const whatBreaksThis = `What breaks this: ${highestRiskPlayer.name} fails to produce, or ${stackTeam ?? "the key game"} becomes lopsided. Injury, weather, or game-script reversal.`;

  // contestFit
  const cashModes = ["CASH", "SINGLE_ENTRY"];
  const gppModes = ["SMALL_FIELD_GPP", "LARGE_FIELD_GPP"];
  let contestFit: string;
  if (cashModes.includes(contestMode)) {
    contestFit =
      "Optimized for cash — floor-weighted, chalk-heavy, correlated with game environment.";
  } else if (gppModes.includes(contestMode)) {
    contestFit = `GPP construction — ceiling-weighted, leverage play at ${leveragePlayer.name}.`;
  } else {
    contestFit = "Balanced construction.";
  }

  // lateSwapNote
  const lateSwapNote = `Late swap: monitor ${highestRiskPlayer.name} for injury/scratch. If scratched, consider ${leveragePlayer.name} as upgrade at matching position.`;

  return {
    lineupId: lineup.lineupId,
    thesis,
    stackDescription,
    stackEvidence,
    stackCounterEvidence,
    riskDependency,
    leveragePoint,
    whatBreaksThis,
    contestFit,
    lateSwapNote,
    highestRiskPlayer: highestRiskPlayer.name,
    highestUpsidePlayer: highestUpsidePlayer.name,
    leveragePlayer: leveragePlayer.name,
  };
}
