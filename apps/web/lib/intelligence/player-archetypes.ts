/**
 * Player usage archetypes, loaded from persisted PlayerGameStat.
 *
 * Aggregates each player's season rushing/receiving usage and classifies the
 * role (receiving back / early-down-power / balanced, plus workload tier). A
 * usage-based proxy for run-scheme — true charted gap/zone classification is a
 * follow-up that needs a run-concept play-by-play pass. Read-only; honest empty
 * state until the player-data backfill runs.
 */
import { db } from "@sports/db";
import { classifyUsageProfile, type UsageProfile } from "@sports/prediction-engine";

export interface PlayerArchetypeRow extends UsageProfile {
  readonly playerId: string;
  readonly name: string;
  readonly position: string | null;
  readonly team: string | null;
  readonly games: number;
}

export interface PlayerArchetypesReport {
  readonly status: "ok" | "no-data";
  readonly season: number;
  readonly generatedAt: string;
  readonly playerCount: number;
  readonly players: readonly PlayerArchetypeRow[];
  readonly note: string;
}

interface UsageGroup {
  readonly playerId: string;
  readonly _count: { readonly _all: number };
  readonly _sum: {
    readonly carries: number | null;
    readonly receptions: number | null;
    readonly targets: number | null;
    readonly rushingYards: number | null;
    readonly receivingYards: number | null;
  };
}

export async function loadPlayerArchetypes(season: number, limit = 200): Promise<PlayerArchetypesReport> {
  const generatedAt = new Date().toISOString();

  const grouped = (await db.playerGameStat.groupBy({
    by: ["playerId"],
    where: { season },
    _count: { _all: true },
    _sum: { carries: true, receptions: true, targets: true, rushingYards: true, receivingYards: true },
  })) as unknown as UsageGroup[] | null;
  const groups = Array.isArray(grouped) ? grouped : [];

  if (groups.length === 0) {
    return { status: "no-data", season, generatedAt, playerCount: 0, players: [], note: "No player stats for this season yet. Run the player-data backfill." };
  }

  const players = await db.player.findMany({ select: { id: true, fullName: true, position: true, recentTeam: true } });
  const info = new Map((Array.isArray(players) ? players : []).map((p) => [p.id, p]));

  const rows: PlayerArchetypeRow[] = [];
  for (const g of groups) {
    const meta = info.get(g.playerId);
    const profile = classifyUsageProfile({
      position: meta?.position ?? null,
      games: g._count._all,
      carries: g._sum.carries ?? 0,
      receptions: g._sum.receptions ?? 0,
      targets: g._sum.targets ?? 0,
      rushingYards: g._sum.rushingYards ?? 0,
      receivingYards: g._sum.receivingYards ?? 0,
    });
    if ((g._sum.carries ?? 0) + (g._sum.receptions ?? 0) === 0) continue; // skip no-touch players
    rows.push({
      playerId: g.playerId,
      name: meta?.fullName ?? g.playerId,
      position: meta?.position ?? null,
      team: meta?.recentTeam ?? null,
      games: g._count._all,
      ...profile,
    });
  }
  rows.sort((a, b) => b.touchesPerGame - a.touchesPerGame);

  return {
    status: "ok",
    season,
    generatedAt,
    playerCount: rows.length,
    players: rows.slice(0, limit),
    note: "Usage archetypes from rushing/receiving split + workload. Usage-based proxy; charted run-scheme (gap/zone) is a follow-up.",
  };
}
