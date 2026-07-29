/**
 * Officials + contracts CATALOG→CONSUMED path (CC-BY-4.0 nflverse).
 * Pure parsers + write into NflverseMemoryStore. No network in this module.
 *
 * Rights: nflverse redistribution of OverTheCap historical contracts and
 * officials crews under CC-BY-4.0. Attribution required on public surfaces.
 */

import {
  NflverseMemoryStore,
  type NflverseRow,
} from "./nflverse-memory.js";

export const NFLVERSE_CONTEXT_LICENSE = "CC-BY-4.0" as const;
export const NFLVERSE_CONTEXT_ATTRIBUTION =
  "Data via nflverse (CC-BY-4.0). Contracts originally OverTheCap." as const;

export type ContractRowIn = {
  player_id?: string;
  gsis_id?: string;
  player?: string;
  apy?: number | string;
  value?: number | string;
  year_signed?: number | string;
  years?: number | string;
  team?: string;
};

export type OfficialRowIn = {
  game_id?: string;
  season?: number | string;
  week?: number | string;
  referee?: string;
  umpire?: string;
  down_judge?: string;
  line_judge?: string;
  side_judge?: string;
  back_judge?: string;
  field_judge?: string;
};

export type ContextHydrateResult = {
  contractsWritten: number;
  officialsWritten: number;
  refused: number;
  licenseSpdx: typeof NFLVERSE_CONTEXT_LICENSE;
  attribution: typeof NFLVERSE_CONTEXT_ATTRIBUTION;
  tier: "CONSUMED";
};

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v.replace(/[$,]/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function entityFromContract(r: ContractRowIn): string | null {
  const id = (r.gsis_id ?? r.player_id ?? "").toString().trim();
  if (id) return `player:${id}`;
  const name = (r.player ?? "").toString().trim();
  if (name) return `player_name:${name.toLowerCase().replace(/\s+/g, "_")}`;
  return null;
}

/**
 * Map contract rows → nfl.ctx.contract_apy (+ own.ctx.contract_apy mirror).
 * asOf = year_signed-01-01T00:00:00.000Z when year present, else fixed epoch.
 */
export function expandContractRows(
  rows: readonly ContractRowIn[],
  opts: { asOfFallback?: string } = {},
): NflverseRow[] {
  const out: NflverseRow[] = [];
  const fallback = opts.asOfFallback ?? "2020-01-01T00:00:00.000Z";
  for (const r of rows) {
    const entityId = entityFromContract(r);
    const apy = num(r.apy) ?? num(r.value);
    if (!entityId || apy === null || apy < 0) continue;
    const year = num(r.year_signed);
    const asOf =
      year !== null && year >= 1990 && year <= 2100
        ? `${Math.trunc(year)}-01-01T00:00:00.000Z`
        : fallback;
    out.push({
      metricId: "nfl.ctx.contract_apy",
      entityId,
      asOf,
      value: apy,
    });
    out.push({
      metricId: "own.ctx.contract_apy",
      entityId,
      asOf,
      value: apy,
    });
  }
  return out;
}

/**
 * Officials → referee_crew as a stable string id of the seven-man set.
 * Numeric hash also stored as nfl.ctx.referee_crew_hash for math consumers.
 */
export function expandOfficialRows(
  rows: readonly OfficialRowIn[],
  opts: { asOfFallback?: string } = {},
): NflverseRow[] {
  const out: NflverseRow[] = [];
  const fallback = opts.asOfFallback ?? "2020-01-01T00:00:00.000Z";
  for (const r of rows) {
    const gameId = (r.game_id ?? "").toString().trim();
    if (!gameId) continue;
    const crewParts = [
      r.referee,
      r.umpire,
      r.down_judge,
      r.line_judge,
      r.side_judge,
      r.back_judge,
      r.field_judge,
    ]
      .map((x) => (x ?? "").toString().trim())
      .filter(Boolean);
    if (crewParts.length === 0) continue;
    const crewKey = crewParts.join("|");
    let hash = 0;
    for (let i = 0; i < crewKey.length; i++) {
      hash = (Math.imul(31, hash) + crewKey.charCodeAt(i)) | 0;
    }
    const season = num(r.season);
    const week = num(r.week);
    const asOf =
      season !== null && week !== null
        ? // approximate mid-week asOf for season/week grain
          `${Math.trunc(season)}-${String(Math.min(12, Math.max(1, Math.ceil(week / 4)))).padStart(2, "0")}-15T00:00:00.000Z`
        : fallback;
    const entityId = `game:${gameId}`;
    out.push({
      metricId: "nfl.ctx.referee_crew",
      entityId,
      asOf,
      value: crewKey,
    });
    out.push({
      metricId: "nfl.ctx.referee_crew_hash",
      entityId,
      asOf,
      value: hash >>> 0,
    });
    // own mirror uses numeric hash (values path prefers numbers)
    out.push({
      metricId: "own.ctx.referee_crew",
      entityId,
      asOf,
      value: hash >>> 0,
    });
  }
  return out;
}

export function hydrateContextToMemory(
  store: NflverseMemoryStore,
  input: {
    contracts?: readonly ContractRowIn[];
    officials?: readonly OfficialRowIn[];
  },
): ContextHydrateResult {
  let contractsWritten = 0;
  let officialsWritten = 0;
  let refused = 0;
  for (const row of expandContractRows(input.contracts ?? [])) {
    try {
      store.put(row);
      contractsWritten += 1;
    } catch {
      refused += 1;
    }
  }
  for (const row of expandOfficialRows(input.officials ?? [])) {
    try {
      store.put(row);
      officialsWritten += 1;
    } catch {
      refused += 1;
    }
  }
  return {
    contractsWritten,
    officialsWritten,
    refused,
    licenseSpdx: NFLVERSE_CONTEXT_LICENSE,
    attribution: NFLVERSE_CONTEXT_ATTRIBUTION,
    tier: "CONSUMED",
  };
}

/** Minimal CSV parser for tests / offline fixtures (no quoted-escape full CSV). */
export function parseSimpleCsv(text: string): Record<string, string>[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0]!.split(",").map((h) => h.trim());
  const out: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i]!.split(",");
    const row: Record<string, string> = {};
    headers.forEach((h, j) => {
      row[h] = (cols[j] ?? "").trim();
    });
    out.push(row);
  }
  return out;
}
