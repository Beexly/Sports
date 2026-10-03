/**
 * Write-through: PlayerGameStat (Prisma SoR) → NflverseMemoryStore (cold p-plane).
 * Pure engine — no Prisma client; ports injected by workers/routes.
 * Law: oddsApiRequired=false; refuse non-finite; prefix allowlist.
 */

import type { NflverseMemoryStore, NflverseRow } from "../providers/nflverse-memory.js";

export type PlayerGameStatRow = {
  playerId: string;
  gameId?: string;
  season: number;
  week: number;
  metricId: string;
  value: number;
  asOf: string;
  sourceRights?: string;
  licenseSpdx?: string;
};

/** Columnar Prisma PlayerGameStat shape (subset used for cold plane). */
export type PrismaPlayerGameStat = {
  playerId: string;
  season: number;
  week: number;
  seasonType?: string;
  attempts?: number | null;
  carries?: number | null;
  receptions?: number | null;
  targets?: number | null;
  targetShare?: number | null;
  receivingYards?: number | null;
  rushingYards?: number | null;
  fantasyPointsPpr?: number | null;
  passingEpa?: number | null;
  rushingEpa?: number | null;
  receivingEpa?: number | null;
  /** Event time for PIT — typically end of game week or fetchedAt */
  asOf: string;
  sourceId?: string;
};

export type MemoryPut = {
  metricId: string;
  entityId: string;
  asOf: string;
  value: number;
  sourceRights: string;
  licenseSpdx: string;
  plane: "cold_stats";
};

export type WriteThroughResult =
  | { ok: true; written: number; skipped: number; puts: MemoryPut[] }
  | { ok: false; code: string; error: string };

export type WriteThroughPolicy = {
  requireFinite: boolean;
  maxBatch: number;
  metricPrefixAllow: readonly string[];
};

export const DEFAULT_WRITE_THROUGH: WriteThroughPolicy = {
  requireFinite: true,
  maxBatch: 5000,
  metricPrefixAllow: ["nfl.", "own.", "ctx."],
};

/** Map Prisma columnar week stats → flat metric rows (owned formulas on cleared base). */
export function expandPrismaPlayerGameStat(
  row: PrismaPlayerGameStat,
): PlayerGameStatRow[] {
  const base = {
    playerId: row.playerId,
    season: row.season,
    week: row.week,
    asOf: row.asOf,
    sourceRights: row.sourceId ?? "nflverse",
    licenseSpdx: "CC-BY-4.0",
  };
  const cols: [string, number | null | undefined][] = [
    ["nfl.pass_attempts", row.attempts],
    ["nfl.carries", row.carries],
    ["nfl.receptions", row.receptions],
    ["nfl.targets", row.targets],
    ["nfl.target_share", row.targetShare],
    ["nfl.receiving_yards", row.receivingYards],
    ["nfl.rushing_yards", row.rushingYards],
    ["nfl.fantasy_points_ppr", row.fantasyPointsPpr],
    ["nfl.passing_epa", row.passingEpa],
    ["nfl.rushing_epa", row.rushingEpa],
    ["nfl.receiving_epa", row.receivingEpa],
  ];
  const out: PlayerGameStatRow[] = [];
  for (const [metricId, value] of cols) {
    if (value == null || !Number.isFinite(value)) continue;
    out.push({ ...base, metricId, value: value as number });
  }
  return out;
}

export function rowToPut(row: PlayerGameStatRow): MemoryPut | null {
  if (!Number.isFinite(row.value)) return null;
  const t = Date.parse(row.asOf);
  if (!Number.isFinite(t)) return null;
  if (!row.metricId || !row.playerId) return null;
  return {
    metricId: row.metricId,
    entityId: row.playerId,
    asOf: row.asOf,
    value: row.value,
    sourceRights: row.sourceRights ?? "nflverse",
    licenseSpdx: row.licenseSpdx ?? "CC-BY-4.0",
    plane: "cold_stats",
  };
}

export function writeThroughPlayerGameStats(
  rows: readonly PlayerGameStatRow[],
  policy: WriteThroughPolicy = DEFAULT_WRITE_THROUGH,
): WriteThroughResult {
  if (rows.length > policy.maxBatch) {
    return {
      ok: false,
      code: "batch_too_large",
      error: `batch ${rows.length} > max ${policy.maxBatch}`,
    };
  }
  const puts: MemoryPut[] = [];
  let skipped = 0;
  for (const row of rows) {
    const allowed = policy.metricPrefixAllow.some((p) =>
      row.metricId.startsWith(p),
    );
    if (!allowed) {
      skipped++;
      continue;
    }
    const put = rowToPut(row);
    if (!put) {
      skipped++;
      continue;
    }
    puts.push(put);
  }
  return { ok: true, written: puts.length, skipped, puts };
}

export function applyPutsToStore(
  puts: readonly MemoryPut[],
  putFn: (row: NflverseRow) => void,
): number {
  for (const p of puts) {
    putFn({
      metricId: p.metricId,
      entityId: p.entityId,
      asOf: p.asOf,
      value: p.value,
    });
  }
  return puts.length;
}

/**
 * End-to-end: Prisma PlayerGameStat[] → NflverseMemoryStore.put
 */
export function hydratePlayerGameStatsToMemory(
  store: NflverseMemoryStore,
  prismaRows: readonly PrismaPlayerGameStat[],
  policy: WriteThroughPolicy = DEFAULT_WRITE_THROUGH,
): WriteThroughResult {
  const flat = prismaRows.flatMap(expandPrismaPlayerGameStat);
  const result = writeThroughPlayerGameStats(flat, policy);
  if (!result.ok) return result;
  applyPutsToStore(result.puts, (row) => store.put(row));
  return result;
}

export type CronDeltaTick = {
  source: "polymarket_gamma" | "model_prior" | "odds_api_optional";
  startedAt: string;
  finishedAt: string;
  quotesTouched: number;
  archived: number;
  refused: number;
  oddsApiUsed: boolean;
};

export function summarizeCronDelta(ticks: readonly CronDeltaTick[]) {
  return {
    ticks: ticks.length,
    quotesTouched: ticks.reduce((a, t) => a + t.quotesTouched, 0),
    archived: ticks.reduce((a, t) => a + t.archived, 0),
    oddsApiRequired: false as const,
    oddsApiUsedAny: ticks.some((t) => t.oddsApiUsed),
  };
}
