/**
 * Player composite score — the central Galaxy Index every tool reads.
 *
 * Blends a player's signals into ONE 0–100 score via the weighted-composite
 * matrix, with attributed drivers. This is the single source of truth: the trade
 * analyzer, buy-low/sell-high, start/sit etc. all read this number, so they can
 * never contradict each other.
 *
 * v1 signals (the framework takes more — scheme fit, usage trend, rumors, …):
 *   - production: per-game PPR as a z-score vs the player's position (high conf).
 *   - availability: injury report + practice participation + concussion flag
 *     (the soft-ish health layer the thesis insists on — discounted by confidence).
 *
 * Read-only; honest empty state until the player-data backfill has run.
 */
import { db } from "@sports/db";
import { compositeScore, type WeightedSignal, type SignalContribution } from "@sports/prediction-engine";

export interface PlayerScoreRow {
  readonly playerId: string;
  readonly name: string;
  readonly position: string | null;
  readonly team: string | null;
  readonly score: number; // 0–100 Galaxy Index
  readonly composite: number; // raw blended value (z-scale)
  readonly games: number;
  readonly drivers: readonly SignalContribution[];
}

export interface PlayerScoresReport {
  readonly status: "ok" | "no-data";
  readonly season: number;
  readonly generatedAt: string;
  readonly playerCount: number;
  readonly top: readonly PlayerScoreRow[];
  readonly note: string;
}

interface ProdGroup {
  readonly playerId: string;
  readonly _count: { readonly _all: number };
  readonly _avg: { readonly fantasyPointsPpr: number | null };
}
interface InjuryRow {
  readonly playerId: string | null;
  readonly week: number;
  readonly reportStatus: string | null;
  readonly practiceStatus: string | null;
  readonly primaryInjury: string | null;
}

/** Availability signal value (<= 0; more negative = less available). */
export function availabilitySignalValue(inj: { reportStatus: string | null; practiceStatus: string | null; primaryInjury: string | null }): number {
  const report = (inj.reportStatus ?? "").toLowerCase();
  const practice = (inj.practiceStatus ?? "").toLowerCase();
  const injury = (inj.primaryInjury ?? "").toLowerCase();
  let v = 0;
  if (report.includes("out")) v -= 2;
  else if (report.includes("doubtful")) v -= 1.5;
  else if (report.includes("questionable")) v -= 0.5;
  if (practice.includes("did not") || practice === "dnp") v -= 1;
  else if (practice.includes("limited")) v -= 0.5;
  if (injury.includes("concussion")) v -= 0.5; // protocol risk
  return Math.max(-2.5, v);
}

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

export async function loadPlayerCompositeScores(season: number, limit = 100): Promise<PlayerScoresReport> {
  const generatedAt = new Date().toISOString();

  const grouped = (await db.playerGameStat.groupBy({
    by: ["playerId"],
    where: { season },
    _count: { _all: true },
    _avg: { fantasyPointsPpr: true },
  })) as unknown as ProdGroup[] | null;
  const prod = (Array.isArray(grouped) ? grouped : []).filter((g) => g._avg.fantasyPointsPpr !== null);

  if (prod.length === 0) {
    return { status: "no-data", season, generatedAt, playerCount: 0, top: [], note: "No player stats for this season yet. Run the player-data backfill." };
  }

  const players = await db.player.findMany({ select: { id: true, fullName: true, position: true, recentTeam: true } });
  const info = new Map((Array.isArray(players) ? players : []).map((p) => [p.id, p]));

  // Per-position production baselines (mean + std of per-game PPR) for the z-score.
  const byPos = new Map<string, number[]>();
  for (const g of prod) {
    const pos = info.get(g.playerId)?.position ?? "UNK";
    const arr = byPos.get(pos) ?? [];
    arr.push(g._avg.fantasyPointsPpr!);
    byPos.set(pos, arr);
  }
  const baseline = new Map<string, { mean: number; std: number }>();
  for (const [pos, vals] of byPos) {
    const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
    const variance = vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length;
    baseline.set(pos, { mean, std: Math.sqrt(variance) });
  }

  // Latest injury per player for the season.
  const injuries = await db.injury.findMany({
    where: { season },
    select: { playerId: true, week: true, reportStatus: true, practiceStatus: true, primaryInjury: true },
  });
  const latestInjury = new Map<string, InjuryRow>();
  for (const inj of Array.isArray(injuries) ? injuries : []) {
    if (inj.playerId === null) continue;
    const prev = latestInjury.get(inj.playerId);
    if (!prev || inj.week > prev.week) latestInjury.set(inj.playerId, inj);
  }

  const rows: PlayerScoreRow[] = prod.map((g) => {
    const meta = info.get(g.playerId);
    const pos = meta?.position ?? "UNK";
    const base = baseline.get(pos)!;
    const ppr = g._avg.fantasyPointsPpr!;
    const z = base.std > 0 ? (ppr - base.mean) / base.std : 0;

    const signals: WeightedSignal[] = [{ key: "production", value: z, weight: 3, confidence: 1 }];
    const inj = latestInjury.get(g.playerId);
    if (inj) {
      signals.push({ key: "availability", value: availabilitySignalValue(inj), weight: 2, confidence: 0.9 });
    }

    const blended = compositeScore(signals);
    return {
      playerId: g.playerId,
      name: meta?.fullName ?? g.playerId,
      position: meta?.position ?? null,
      team: meta?.recentTeam ?? null,
      score: Math.max(0, Math.min(100, round2(50 + 15 * blended.score))),
      composite: blended.score,
      games: g._count._all,
      drivers: blended.contributions,
    };
  });
  rows.sort((a, b) => b.score - a.score);

  return {
    status: "ok",
    season,
    generatedAt,
    playerCount: rows.length,
    top: rows.slice(0, limit),
    note: "Galaxy Index v1: production (z vs position) + availability (injury/practice/concussion), blended via the composite matrix. Single source of truth for all player tools.",
  };
}
