/**
 * Officials + contracts context hydration — pure mappers from raw nflverse
 * row shape (matching @sports/data-ingestion's CsvTable.records:
 * ReadonlyArray<Record<string,string>>, see nflverse-source.ts's `officials`
 * and `contracts` dataset entries) to OwnFeatureRecord[] for
 * own.ctx.contract_apy and own.ctx.referee_crew(_hash).
 *
 * Pure and network-free by design: these consume rows already fetched and
 * parsed elsewhere (fetchNflverse("contracts" | "officials", season)). No
 * fetch happens in this module.
 *
 * Column names below (gsis_id/apy for contracts; game_id/official_name for
 * officials) match nflverse's published schemas as documented in
 * nflverse-source.ts's dataset descriptions. Verify against a live fetch
 * before wiring a cron caller — an upstream column rename should make rows
 * refuse (skipped, counted, and reported), never silently ship a wrong or
 * fabricated value.
 */

import type { OwnFeatureRecord } from "../own/types.js";
import { parseAsOfMs } from "../pit-validate.js";

export type ContextHydrationResult = {
  readonly records: readonly OwnFeatureRecord[];
  readonly skipped: number;
  readonly skipReasons: readonly string[];
};

/**
 * Deterministic 32-bit FNV-1a hash — a stable numeric id for a string with
 * no crypto dependency. Used only to give the officiating crew signature a
 * numeric companion value for the numeric-only value read path; the string
 * signature itself remains the source of truth.
 */
export function stableNumericHash(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Player contract APY -> own.ctx.contract_apy.
 * Expects rows shaped like OverTheCap's historical_contracts.csv.gz:
 * gsis_id, apy (dollars, annualized). Rows missing either field, or with a
 * non-finite/negative apy, are skipped — never zeroed or guessed.
 */
export function expandContractRows(
  rows: readonly Readonly<Record<string, string>>[],
  asOf: string,
): ContextHydrationResult {
  const asOfParsed = parseAsOfMs(asOf);
  if (!asOfParsed.ok) {
    return { records: [], skipped: rows.length, skipReasons: [`invalid asOf: ${asOfParsed.code}`] };
  }
  const records: OwnFeatureRecord[] = [];
  const skipReasons: string[] = [];
  for (const r of rows) {
    const gsisId = r["gsis_id"]?.trim();
    const apyRaw = r["apy"]?.trim();
    if (!gsisId) {
      skipReasons.push("missing gsis_id");
      continue;
    }
    const apy = apyRaw ? Number(apyRaw) : NaN;
    if (!Number.isFinite(apy) || apy < 0) {
      skipReasons.push(`invalid apy for gsis_id=${gsisId}`);
      continue;
    }
    records.push({
      featureId: "own.ctx.contract_apy",
      entityId: gsisId,
      asOf: asOfParsed.asOfIso,
      value: apy,
      plane: "context",
      ownership: "derived_cleared",
      sourceId: "nflverse.contracts",
      pitCorrect: true,
      publicApiEligible: true,
      licenseSpdx: "CC-BY-4.0",
    });
  }
  return { records, skipped: skipReasons.length, skipReasons };
}

/**
 * Officiating crew per game -> own.ctx.referee_crew (sorted crew signature
 * string) + own.ctx.referee_crew_hash (its stable numeric hash). Expects one
 * row per official per game, shaped like nflverse's officials.csv: game_id,
 * official_name. Rows missing either field are skipped.
 */
export function expandOfficialRows(
  rows: readonly Readonly<Record<string, string>>[],
  asOf: string,
): ContextHydrationResult {
  const asOfParsed = parseAsOfMs(asOf);
  if (!asOfParsed.ok) {
    return { records: [], skipped: rows.length, skipReasons: [`invalid asOf: ${asOfParsed.code}`] };
  }
  const byGame = new Map<string, string[]>();
  const skipReasons: string[] = [];
  for (const r of rows) {
    const gameId = r["game_id"]?.trim();
    const name = r["official_name"]?.trim();
    if (!gameId || !name) {
      skipReasons.push("missing game_id or official_name");
      continue;
    }
    const crew = byGame.get(gameId) ?? [];
    crew.push(name);
    byGame.set(gameId, crew);
  }
  const records: OwnFeatureRecord[] = [];
  for (const [gameId, names] of byGame) {
    const crewSignature = [...names].sort().join("|");
    const base = {
      entityId: gameId,
      asOf: asOfParsed.asOfIso,
      plane: "context" as const,
      ownership: "derived_cleared" as const,
      sourceId: "nflverse.officials",
      pitCorrect: true,
      publicApiEligible: true,
      licenseSpdx: "CC-BY-4.0",
    };
    records.push({ ...base, featureId: "own.ctx.referee_crew", value: crewSignature });
    records.push({
      ...base,
      featureId: "own.ctx.referee_crew_hash",
      value: stableNumericHash(crewSignature),
    });
  }
  return { records, skipped: skipReasons.length, skipReasons };
}

/**
 * Writes hydration results into the own-feed store. Never throws — a
 * bookkeeping failure on one record must not abort the rest of the batch.
 */
export function hydrateContextToMemory(
  store: { put(rec: OwnFeatureRecord): void },
  results: readonly ContextHydrationResult[],
): { written: number; failed: number; failReasons: readonly string[] } {
  let written = 0;
  const failReasons: string[] = [];
  for (const result of results) {
    for (const rec of result.records) {
      try {
        store.put(rec);
        written++;
      } catch (err) {
        failReasons.push(
          `${rec.featureId}/${rec.entityId}: ${err instanceof Error ? err.message : err}`,
        );
      }
    }
  }
  return { written, failed: failReasons.length, failReasons };
}
