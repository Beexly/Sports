/**
 * Player movers — recent form vs season baseline (heating up / cooling down).
 *
 * The momentum core of buy-low / sell-high: for each player we compare the last
 * N weeks of per-game PPR to the season average and surface the biggest risers
 * and fallers. Reads the weekly PlayerGameStat we already model (no new
 * ingestion). Read-only; honest empty state until the player-data backfill runs.
 *
 * Like every tool, this derives from the central data rather than bespoke logic,
 * so it stays consistent with the player Galaxy Index.
 */
import { db } from "@sports/db";

export interface PlayerMover {
  readonly playerId: string;
  readonly name: string;
  readonly position: string | null;
  readonly team: string | null;
  readonly games: number;
  readonly seasonPpg: number;
  readonly recentPpg: number;
  readonly delta: number; // recentPpg − seasonPpg (positive = heating up)
  readonly trend: "heating" | "cooling" | "steady";
}

export interface PlayerMoversReport {
  readonly status: "ok" | "no-data";
  readonly season: number;
  readonly recentN: number;
  readonly generatedAt: string;
  readonly qualified: number;
  readonly risers: readonly PlayerMover[];
  readonly fallers: readonly PlayerMover[];
  readonly note: string;
}

interface WeekRow {
  readonly playerId: string;
  readonly week: number;
  readonly fantasyPointsPpr: number | null;
}

const STEADY_BAND = 2; // |delta| <= this (PPR/game) is "steady"

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}
function mean(xs: number[]): number {
  return xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : 0;
}

export async function loadPlayerMovers(season: number, recentN = 4, limit = 25): Promise<PlayerMoversReport> {
  const generatedAt = new Date().toISOString();

  const rows = (await db.playerGameStat.findMany({
    where: { season },
    select: { playerId: true, week: true, fantasyPointsPpr: true },
  })) as WeekRow[] | null;
  const list = (Array.isArray(rows) ? rows : []).filter((r) => r.fantasyPointsPpr !== null);

  if (list.length === 0) {
    return { status: "no-data", season, recentN, generatedAt, qualified: 0, risers: [], fallers: [], note: "No weekly player stats for this season yet. Run the player-data backfill." };
  }

  const series = new Map<string, { week: number; ppr: number }[]>();
  for (const r of list) {
    const arr = series.get(r.playerId) ?? [];
    arr.push({ week: r.week, ppr: r.fantasyPointsPpr! });
    series.set(r.playerId, arr);
  }

  const players = await db.player.findMany({ select: { id: true, fullName: true, position: true, recentTeam: true } });
  const info = new Map((Array.isArray(players) ? players : []).map((p) => [p.id, p]));

  const movers: PlayerMover[] = [];
  for (const [playerId, games] of series) {
    if (games.length < recentN + 1) continue; // need a baseline beyond the recent window
    const sorted = [...games].sort((a, b) => a.week - b.week);
    const seasonPpg = mean(sorted.map((g) => g.ppr));
    const recentPpg = mean(sorted.slice(-recentN).map((g) => g.ppr));
    const delta = recentPpg - seasonPpg;
    const trend: PlayerMover["trend"] = delta > STEADY_BAND ? "heating" : delta < -STEADY_BAND ? "cooling" : "steady";
    const meta = info.get(playerId);
    movers.push({
      playerId,
      name: meta?.fullName ?? playerId,
      position: meta?.position ?? null,
      team: meta?.recentTeam ?? null,
      games: sorted.length,
      seasonPpg: round2(seasonPpg),
      recentPpg: round2(recentPpg),
      delta: round2(delta),
      trend,
    });
  }

  const byDeltaDesc = [...movers].sort((a, b) => b.delta - a.delta);
  return {
    status: "ok",
    season,
    recentN,
    generatedAt,
    qualified: movers.length,
    risers: byDeltaDesc.slice(0, limit),
    fallers: byDeltaDesc.slice(-limit).reverse(),
    note: `Recent ${recentN}-game PPR/game vs season average. Heating/cooling band ±${STEADY_BAND}. The momentum input to buy-low/sell-high.`,
  };
}
