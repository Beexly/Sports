/**
 * Rush-scheme leans, loaded from persisted PlayerRushProfile. Classifies each
 * rusher's gap/location distribution into a gap-power vs outside-zone lean. A
 * PBP-direction proxy (not charted scheme). Read-only; empty until the
 * rush-tendency backfill runs.
 */
import { db } from "@sports/db";
import { classifyRushScheme, type RushSchemeProfile } from "@sports/prediction-engine";

export interface RushSchemeRow extends RushSchemeProfile {
  readonly gsisId: string;
  readonly playerName: string;
  readonly team: string | null;
  readonly epaPerRun: number;
}

export interface RushSchemesReport {
  readonly status: "ok" | "no-data";
  readonly season: number;
  readonly generatedAt: string;
  readonly playerCount: number;
  readonly players: readonly RushSchemeRow[];
  readonly note: string;
}

interface ProfileRow {
  readonly gsisId: string;
  readonly playerName: string;
  readonly team: string | null;
  readonly runs: number;
  readonly guardRuns: number;
  readonly tackleRuns: number;
  readonly endRuns: number;
  readonly leftRuns: number;
  readonly middleRuns: number;
  readonly rightRuns: number;
  readonly epaPerRun: number;
}

export async function loadRushSchemes(season: number, limit = 200): Promise<RushSchemesReport> {
  const generatedAt = new Date().toISOString();

  const rows = (await db.playerRushProfile.findMany({
    where: { season },
    select: { gsisId: true, playerName: true, team: true, runs: true, guardRuns: true, tackleRuns: true, endRuns: true, leftRuns: true, middleRuns: true, rightRuns: true, epaPerRun: true },
  })) as ProfileRow[] | null;
  const list = (Array.isArray(rows) ? rows : []).filter((r) => r.runs > 0);

  if (list.length === 0) {
    return { status: "no-data", season, generatedAt, playerCount: 0, players: [], note: "No rush profiles for this season yet. Run the rush-tendency backfill." };
  }

  const players: RushSchemeRow[] = list
    .map((r) => ({ gsisId: r.gsisId, playerName: r.playerName, team: r.team, epaPerRun: r.epaPerRun, ...classifyRushScheme(r) }))
    .sort((a, b) => b.runs - a.runs)
    .slice(0, limit);

  return {
    status: "ok",
    season,
    generatedAt,
    playerCount: players.length,
    players,
    note: "Gap/location run distribution → gap-power vs outside-zone lean (PBP-direction proxy, not charted scheme).",
  };
}
