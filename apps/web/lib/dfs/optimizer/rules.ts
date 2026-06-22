/**
 * DFS Optimizer Rules — Phase 4
 *
 * Lineup-level and portfolio-level constraint checking.
 */

import type { SolverPlayer, SolvedLineup } from "./solver";

// ── Rule types ────────────────────────────────────────────────────────────

export type RuleType =
  | "QB_STACK"
  | "BRING_BACK"
  | "DOUBLE_STACK"
  | "MAX_PER_TEAM"
  | "MAX_FROM_GAME"
  | "NO_QB_VS_DST"
  | "NO_RB_VS_DST"
  | "MIN_SALARY"
  | "MAX_SALARY"
  | "OWNERSHIP_CAP"
  | "OWNERSHIP_FLOOR"
  | "GROUP_AT_LEAST"
  | "GROUP_EXACTLY"
  | "GROUP_MAX"
  | "IF_PLAYER_THEN"
  | "IF_PLAYER_NOT"
  | "MIN_PROJECTION"
  | "MIN_CEILING"
  | "EXPOSURE_MIN"
  | "EXPOSURE_MAX";

export interface OptimizerRule {
  type: RuleType;
  parameters: Record<string, unknown>;
}

// ── Helpers ───────────────────────────────────────────────────────────────

function hasPlayer(lineup: SolverPlayer[], idOrName: string): boolean {
  return lineup.some((p) => p.id === idOrName || p.name === idOrName);
}

function countFromGroup(lineup: SolverPlayer[], playerIds: string[]): number {
  return lineup.filter((p) =>
    playerIds.some((idOrName) => p.id === idOrName || p.name === idOrName)
  ).length;
}

// ── applyRules ─────────────────────────────────────────────────────────────

export function applyRules(
  lineup: SolverPlayer[],
  rules: OptimizerRule[],
  _allPlayers: SolverPlayer[]
): { valid: boolean; violations: string[] } {
  const violations: string[] = [];

  for (const rule of rules) {
    const p = rule.parameters;

    switch (rule.type) {
      case "QB_STACK": {
        const minCount = typeof p["minCount"] === "number" ? p["minCount"] : 1;
        const qb = lineup.find((pl) => pl.position === "QB");
        if (qb) {
          const stackCount = lineup.filter(
            (pl) => pl.team === qb.team && (pl.position === "WR" || pl.position === "TE")
          ).length;
          if (stackCount < minCount) {
            violations.push(
              `QB_STACK: QB (${qb.name}) has ${stackCount} WR/TE from same team, need ${minCount}`
            );
          }
        }
        break;
      }

      case "BRING_BACK": {
        const minCount = typeof p["minCount"] === "number" ? p["minCount"] : 1;
        const qb = lineup.find((pl) => pl.position === "QB");
        if (qb) {
          const bringBackCount = lineup.filter(
            (pl) => pl.team === qb.opponent && pl.position !== "DST"
          ).length;
          if (bringBackCount < minCount) {
            violations.push(
              `BRING_BACK: QB (${qb.name}) needs ${minCount} players from opponent team, found ${bringBackCount}`
            );
          }
        }
        break;
      }

      case "DOUBLE_STACK": {
        const qb = lineup.find((pl) => pl.position === "QB");
        if (qb) {
          const sameTeam = lineup.filter(
            (pl) => pl.team === qb.team && (pl.position === "WR" || pl.position === "TE")
          ).length;
          const opponent = lineup.filter(
            (pl) => pl.team === qb.opponent && (pl.position === "WR" || pl.position === "TE" || pl.position === "RB")
          ).length;
          if (sameTeam < 2 || opponent < 1) {
            violations.push(
              `DOUBLE_STACK: need ≥2 WR/TE from QB team (got ${sameTeam}) and ≥1 from opponent (got ${opponent})`
            );
          }
        }
        break;
      }

      case "MAX_PER_TEAM": {
        const team = typeof p["team"] === "string" ? p["team"] : "";
        const max = typeof p["max"] === "number" ? p["max"] : 8;
        if (team) {
          const count = lineup.filter((pl) => pl.team === team).length;
          if (count > max) {
            violations.push(`MAX_PER_TEAM: ${team} has ${count} players, max is ${max}`);
          }
        }
        break;
      }

      case "MAX_FROM_GAME": {
        const game = typeof p["game"] === "string" ? p["game"] : "";
        const max = typeof p["max"] === "number" ? p["max"] : 8;
        if (game) {
          // Identify game by checking if any player's team or opponent matches
          const count = lineup.filter(
            (pl) => pl.team === game || pl.opponent === game
          ).length;
          if (count > max) {
            violations.push(`MAX_FROM_GAME: game "${game}" has ${count} players, max is ${max}`);
          }
        }
        break;
      }

      case "NO_QB_VS_DST": {
        const qb = lineup.find((pl) => pl.position === "QB");
        const dst = lineup.find((pl) => pl.position === "DST");
        if (qb && dst && dst.team === qb.opponent) {
          violations.push(
            `NO_QB_VS_DST: DST (${dst.team}) opposes QB (${qb.name})`
          );
        }
        break;
      }

      case "NO_RB_VS_DST": {
        const dst = lineup.find((pl) => pl.position === "DST");
        if (dst) {
          const conflictingRb = lineup.find(
            (pl) => pl.position === "RB" && pl.team === dst.opponent
          );
          if (conflictingRb) {
            violations.push(
              `NO_RB_VS_DST: RB (${conflictingRb.name}) plays against DST (${dst.team})`
            );
          }
        }
        break;
      }

      case "MIN_SALARY": {
        const min = typeof p["min"] === "number" ? p["min"] : 0;
        const total = lineup.reduce((s, pl) => s + pl.salary, 0);
        if (total < min) {
          violations.push(`MIN_SALARY: lineup salary ${total} < min ${min}`);
        }
        break;
      }

      case "MAX_SALARY": {
        const max = typeof p["max"] === "number" ? p["max"] : 50000;
        const total = lineup.reduce((s, pl) => s + pl.salary, 0);
        if (total > max) {
          violations.push(`MAX_SALARY: lineup salary ${total} > max ${max}`);
        }
        break;
      }

      case "OWNERSHIP_CAP": {
        const maxTotalOwnership =
          typeof p["maxTotalOwnership"] === "number" ? p["maxTotalOwnership"] : 1.0;
        const totalOwnership = lineup.reduce((s, pl) => s + pl.ownership, 0);
        if (totalOwnership > maxTotalOwnership) {
          violations.push(
            `OWNERSHIP_CAP: total ownership ${totalOwnership.toFixed(3)} > max ${maxTotalOwnership}`
          );
        }
        break;
      }

      case "OWNERSHIP_FLOOR": {
        const minTotalOwnership =
          typeof p["minTotalOwnership"] === "number" ? p["minTotalOwnership"] : 0;
        const totalOwnership = lineup.reduce((s, pl) => s + pl.ownership, 0);
        if (totalOwnership < minTotalOwnership) {
          violations.push(
            `OWNERSHIP_FLOOR: total ownership ${totalOwnership.toFixed(3)} < min ${minTotalOwnership}`
          );
        }
        break;
      }

      case "GROUP_AT_LEAST": {
        const playerIds = Array.isArray(p["playerIds"])
          ? (p["playerIds"] as string[])
          : [];
        const minCount = typeof p["min"] === "number" ? p["min"] : 1;
        const count = countFromGroup(lineup, playerIds);
        if (count < minCount) {
          violations.push(
            `GROUP_AT_LEAST: found ${count} from group, need at least ${minCount}`
          );
        }
        break;
      }

      case "GROUP_EXACTLY": {
        const playerIds = Array.isArray(p["playerIds"])
          ? (p["playerIds"] as string[])
          : [];
        const exactly = typeof p["exactly"] === "number" ? p["exactly"] : 1;
        const count = countFromGroup(lineup, playerIds);
        if (count !== exactly) {
          violations.push(
            `GROUP_EXACTLY: found ${count} from group, need exactly ${exactly}`
          );
        }
        break;
      }

      case "GROUP_MAX": {
        const playerIds = Array.isArray(p["playerIds"])
          ? (p["playerIds"] as string[])
          : [];
        const max = typeof p["max"] === "number" ? p["max"] : 0;
        const count = countFromGroup(lineup, playerIds);
        if (count > max) {
          violations.push(
            `GROUP_MAX: found ${count} from group, max is ${max}`
          );
        }
        break;
      }

      case "IF_PLAYER_THEN": {
        const ifPlayerId = typeof p["ifPlayerId"] === "string" ? p["ifPlayerId"] : "";
        const thenPlayerId = typeof p["thenPlayerId"] === "string" ? p["thenPlayerId"] : "";
        if (ifPlayerId && thenPlayerId) {
          if (hasPlayer(lineup, ifPlayerId) && !hasPlayer(lineup, thenPlayerId)) {
            violations.push(
              `IF_PLAYER_THEN: "${ifPlayerId}" is in lineup but "${thenPlayerId}" is not`
            );
          }
        }
        break;
      }

      case "IF_PLAYER_NOT": {
        const ifPlayerId = typeof p["ifPlayerId"] === "string" ? p["ifPlayerId"] : "";
        const notPlayerId = typeof p["notPlayerId"] === "string" ? p["notPlayerId"] : "";
        if (ifPlayerId && notPlayerId) {
          if (hasPlayer(lineup, ifPlayerId) && hasPlayer(lineup, notPlayerId)) {
            violations.push(
              `IF_PLAYER_NOT: "${ifPlayerId}" is in lineup but "${notPlayerId}" must not be`
            );
          }
        }
        break;
      }

      case "MIN_PROJECTION": {
        const min = typeof p["min"] === "number" ? p["min"] : 0;
        const total = lineup.reduce((s, pl) => s + pl.projection, 0);
        if (total < min) {
          violations.push(
            `MIN_PROJECTION: lineup projection ${total.toFixed(2)} < min ${min}`
          );
        }
        break;
      }

      case "MIN_CEILING": {
        const min = typeof p["min"] === "number" ? p["min"] : 0;
        const total = lineup.reduce((s, pl) => s + pl.ceiling, 0);
        if (total < min) {
          violations.push(
            `MIN_CEILING: lineup ceiling ${total.toFixed(2)} < min ${min}`
          );
        }
        break;
      }

      // Portfolio-level rules — valid at lineup level
      case "EXPOSURE_MIN":
      case "EXPOSURE_MAX":
        break;
    }
  }

  return { valid: violations.length === 0, violations };
}

// ── applyPortfolioRules ────────────────────────────────────────────────────

export function applyPortfolioRules(
  lineups: SolvedLineup[],
  rules: OptimizerRule[],
  totalLineupCount: number
): { valid: boolean; violations: string[] } {
  const violations: string[] = [];
  const total = totalLineupCount > 0 ? totalLineupCount : lineups.length;

  // Build exposure map: playerId/name → count of lineups containing them
  const exposureCount = new Map<string, number>();
  for (const lineup of lineups) {
    for (const p of lineup.players) {
      exposureCount.set(p.id, (exposureCount.get(p.id) ?? 0) + 1);
      // Also index by name
      exposureCount.set(p.name, (exposureCount.get(p.name) ?? 0) + 1);
    }
  }

  for (const rule of rules) {
    const p = rule.parameters;

    switch (rule.type) {
      case "EXPOSURE_MIN": {
        const playerId = typeof p["playerId"] === "string" ? p["playerId"] : "";
        const minPct = typeof p["minPct"] === "number" ? p["minPct"] : 0;
        if (playerId) {
          const count = exposureCount.get(playerId) ?? 0;
          const actualPct = total > 0 ? (count / total) * 100 : 0;
          if (actualPct < minPct * 100) {
            violations.push(
              `EXPOSURE_MIN: "${playerId}" appears in ${actualPct.toFixed(1)}% of lineups, min is ${(minPct * 100).toFixed(1)}%`
            );
          }
        }
        break;
      }

      case "EXPOSURE_MAX": {
        const playerId = typeof p["playerId"] === "string" ? p["playerId"] : "";
        const maxPct = typeof p["maxPct"] === "number" ? p["maxPct"] : 1;
        if (playerId) {
          const count = exposureCount.get(playerId) ?? 0;
          const actualPct = total > 0 ? (count / total) * 100 : 0;
          if (actualPct > maxPct * 100) {
            violations.push(
              `EXPOSURE_MAX: "${playerId}" appears in ${actualPct.toFixed(1)}% of lineups, max is ${(maxPct * 100).toFixed(1)}%`
            );
          }
        }
        break;
      }

      default:
        // Non-portfolio rules are not checked here
        break;
    }
  }

  return { valid: violations.length === 0, violations };
}
