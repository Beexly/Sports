import type {
  SolverPlayer,
  SolvedLineup,
  SolverSettings,
} from "@/lib/dfs/optimizer/solver";

export interface LateSwapInput {
  existingLineups: Array<{
    lineupId?: string;
    players: SolverPlayer[];
  }>;
  availablePlayers: SolverPlayer[];
  scratchedPlayers: string[]; // player names who are out
  settings: SolverSettings;
}

export interface SwapDecision {
  lineupIndex: number;
  originalPlayer: string;
  replacementPlayer: string | null;
  projectionChange: number;
  ownershipChange: number;
  salaryChange: number;
  whySwap: string;
  whyHold: string;
}

export interface LateSwapResult {
  swaps: SwapDecision[];
  updatedLineups: SolvedLineup[];
  warnings: string[];
}

const DEFAULT_SALARY_CAP = 50000;

/**
 * Determine which slot a player fills in a standard NFL DFS lineup.
 * The slot can be: QB, RB, WR, TE, DST, or FLEX.
 * FLEX can be filled by RB, WR, or TE.
 *
 * We count positional slots by traversing the lineup and marking slots as
 * filled. The algorithm assigns exactly one slot per player in order:
 *  - Dedicated slots first (QB, DST, then two RB, three WR, one TE)
 *  - If a player is beyond their dedicated count, they go to FLEX.
 */
function determineSlot(
  player: SolverPlayer,
  allPlayers: SolverPlayer[]
): string {
  const pos = player.position.toUpperCase();

  if (pos === "QB") return "QB";
  if (pos === "DST") return "DST";

  // Count how many of this position appear before this player in the lineup
  const playerIndex = allPlayers.indexOf(player);
  const beforeCount = allPlayers
    .slice(0, playerIndex)
    .filter((p) => p.position.toUpperCase() === pos).length;

  if (pos === "RB") {
    // Standard: 2 RB slots; first goes to RB, additional to FLEX
    return beforeCount < 2 ? "RB" : "FLEX";
  }
  if (pos === "WR") {
    // Standard: 3 WR slots
    return beforeCount < 3 ? "WR" : "FLEX";
  }
  if (pos === "TE") {
    // Standard: 1 TE slot, additional to FLEX
    return beforeCount < 1 ? "TE" : "FLEX";
  }

  return "FLEX";
}

function positionFitsSlot(position: string, slot: string): boolean {
  const pos = position.toUpperCase();
  if (slot === "FLEX") {
    return pos === "RB" || pos === "WR" || pos === "TE";
  }
  return pos === slot;
}

function buildSolvedLineup(players: SolverPlayer[]): SolvedLineup {
  const salary = players.reduce((sum, p) => sum + p.salary, 0);
  const projection = players.reduce((sum, p) => sum + p.projection, 0);
  const floor = players.reduce((sum, p) => sum + p.floor, 0);
  const ceiling = players.reduce((sum, p) => sum + p.ceiling, 0);
  const totalOwnership = players.reduce((sum, p) => sum + p.ownership, 0);

  const leverageScore = players.reduce((sum, p) => {
    return sum + p.ceiling / Math.max(p.ownership * 100, 1);
  }, 0);

  // Find stack team: team with >= 3 players
  const teamCounts: Record<string, number> = {};
  for (const p of players) {
    teamCounts[p.team] = (teamCounts[p.team] ?? 0) + 1;
  }
  let stackTeam: string | null = null;
  let stackCount = 0;
  for (const [team, count] of Object.entries(teamCounts)) {
    if (count >= 3 && count > stackCount) {
      stackTeam = team;
      stackCount = count;
    }
  }

  const lineupKey = [...players]
    .map((p) => p.id)
    .sort()
    .join(",");

  return {
    players,
    salary,
    projection,
    floor,
    ceiling,
    totalOwnership,
    leverageScore,
    stackTeam,
    stackCount,
    objectiveScore: 0,
    lineupKey,
  };
}

export function lateSwap(input: LateSwapInput): LateSwapResult {
  const { existingLineups, availablePlayers, scratchedPlayers, settings } =
    input;

  const salaryCap = settings.salaryCap ?? DEFAULT_SALARY_CAP;
  const scratchedSet = new Set(scratchedPlayers.map((n) => n.toLowerCase()));

  const swaps: SwapDecision[] = [];
  const updatedLineups: SolvedLineup[] = [];
  const warnings: string[] = [];

  for (
    let lineupIndex = 0;
    lineupIndex < existingLineups.length;
    lineupIndex++
  ) {
    const lineup = existingLineups[lineupIndex];
    if (!lineup) continue;
    const modifiedPlayers = [...lineup.players];

    for (
      let playerIdx = 0;
      playerIdx < modifiedPlayers.length;
      playerIdx++
    ) {
      const player = modifiedPlayers[playerIdx];
      if (!player) continue;
      const isScratched = scratchedSet.has(player.name.toLowerCase());

      if (!isScratched) {
        // Player is healthy — record a hold decision
        swaps.push({
          lineupIndex,
          originalPlayer: player.name,
          replacementPlayer: null,
          projectionChange: 0,
          ownershipChange: 0,
          salaryChange: 0,
          whySwap: "",
          whyHold: `No scratched player — holding ${player.name} (projection: ${player.projection.toFixed(1)} pts)`,
        });
        continue;
      }

      // Player is scratched — find a replacement
      // Use the original lineup for slot determination (not the modified one)
      const slot = determineSlot(player, lineup.players);

      // Current lineup salary without this player
      const salaryWithoutScratched = modifiedPlayers.reduce(
        (sum, p, i) => (i === playerIdx ? sum : sum + p.salary),
        0
      );

      // Names already in the (modified) lineup excluding the scratched slot
      const alreadyInLineupNames = new Set(
        modifiedPlayers
          .filter((_, i) => i !== playerIdx)
          .map((p) => p.name.toLowerCase())
      );

      // Identify QB team for stack preference
      const qbPlayer = modifiedPlayers.find(
        (p, i) => i !== playerIdx && p.position.toUpperCase() === "QB"
      );
      const qbTeam = qbPlayer?.team ?? null;

      // Filter candidates
      const candidates = availablePlayers.filter((candidate) => {
        if (scratchedSet.has(candidate.name.toLowerCase())) return false;
        if (alreadyInLineupNames.has(candidate.name.toLowerCase())) return false;
        if (!positionFitsSlot(candidate.position, slot)) return false;
        if (salaryWithoutScratched + candidate.salary > salaryCap) return false;
        return true;
      });

      if (candidates.length === 0) {
        warnings.push(
          `Lineup ${lineupIndex + 1}: No valid replacement found for ${player.name} (${slot}). Lineup may be invalid.`
        );
        swaps.push({
          lineupIndex,
          originalPlayer: player.name,
          replacementPlayer: null,
          projectionChange: 0,
          ownershipChange: 0,
          salaryChange: 0,
          whySwap: `Replacing ${player.name} (scratched) — no valid replacement found for ${slot} slot`,
          whyHold: "",
        });
        continue;
      }

      // Sort: prefer same-team-as-QB first, then by projection descending
      candidates.sort((a, b) => {
        const aIsStack = qbTeam !== null && a.team === qbTeam ? 1 : 0;
        const bIsStack = qbTeam !== null && b.team === qbTeam ? 1 : 0;
        if (bIsStack !== aIsStack) return bIsStack - aIsStack;
        return b.projection - a.projection;
      });

      const best = candidates[0]!;
      const projChange = best.projection - player.projection;
      const ownershipChange = best.ownership - player.ownership;
      const salaryChange = best.salary - player.salary;

      // Apply swap in the modified lineup
      modifiedPlayers[playerIdx] = best;

      swaps.push({
        lineupIndex,
        originalPlayer: player.name,
        replacementPlayer: best.name,
        projectionChange: projChange,
        ownershipChange: ownershipChange,
        salaryChange: salaryChange,
        whySwap: `Replacing ${player.name} (scratched) with ${best.name} (${projChange >= 0 ? "+" : ""}${projChange.toFixed(1)} pts projected)`,
        whyHold: "",
      });
    }

    updatedLineups.push(buildSolvedLineup(modifiedPlayers));
  }

  return { swaps, updatedLineups, warnings };
}
