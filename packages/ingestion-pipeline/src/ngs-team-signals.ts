import {
  NGS_TEAM_SIGNAL_KEY,
  canonicalizeNgsTeamKey,
  ngsTeamKeyAliases,
} from "@sports/types";
import { resolveKalshiTeamAbbr } from "./kalshi-team-abbr.js";
import type { NgsTeamContextSignal } from "@sports/types";

/** Minimal DB seam so this reader can be tested without Prisma. */
export interface NgsTeamSignalDb {
  readonly signal?: {
    findMany(args: {
      where: unknown;
      select: unknown;
      orderBy: unknown;
    }): Promise<readonly unknown[] | null>;
  };
}

/** Resolve an odds-feed team name to the NGS signal's NFL abbreviation. */
export function resolveNgsTeamKey(teamName: string): string | null {
  return canonicalizeNgsTeamKey(
    resolveKalshiTeamAbbr("NFL", teamName) ?? teamName,
  );
}

type SignalRow = {
  readonly entityId: string;
  readonly value: number;
  readonly weight: number;
  readonly confidence: number;
  readonly capturedAt: Date;
  readonly season: number;
  readonly week: number;
};

function isUsable(row: unknown): row is SignalRow {
  if (!row || typeof row !== "object") return false;
  const r = row as Partial<SignalRow>;
  return (
    typeof r.entityId === "string" &&
    typeof r.value === "number" &&
    Number.isFinite(r.value) &&
    typeof r.weight === "number" &&
    Number.isFinite(r.weight) &&
    typeof r.confidence === "number" &&
    Number.isFinite(r.confidence) &&
    r.capturedAt instanceof Date &&
    Number.isFinite(r.capturedAt.getTime()) &&
    typeof r.season === "number" &&
    Number.isFinite(r.season) &&
    Number.isInteger(r.season) &&
    typeof r.week === "number" &&
    Number.isInteger(r.week) &&
    r.week >= 0
  );
}

/**
 * Load the latest persisted NGS team signal for each side from one shared
 * source week. Week 0 is preferred when both sides have it; otherwise the
 * highest week available to both sides wins. Missing or mismatched grains are
 * honest nulls; no team name is guessed and no source fetch occurs here.
 */
export async function loadNgsTeamSignals(
  client: NgsTeamSignalDb,
  homeTeam: string,
  awayTeam: string,
  season?: number,
): Promise<{ home: NgsTeamContextSignal | null; away: NgsTeamContextSignal | null }> {
  const homeKey = resolveNgsTeamKey(homeTeam);
  const awayKey = resolveNgsTeamKey(awayTeam);
  if (!homeKey || !awayKey || !client.signal) return { home: null, away: null };
  const keys = [homeKey, awayKey];
  const aliases = Array.from(new Set([...keys, ...keys.flatMap(ngsTeamKeyAliases)]));
  const rows = await client.signal.findMany({
    where: {
      entityType: "team",
      key: NGS_TEAM_SIGNAL_KEY,
      entityId: { in: aliases },
      ...(Number.isInteger(season) ? { season } : {}),
    },
    select: { entityId: true, value: true, weight: true, confidence: true, capturedAt: true, season: true, week: true },
    orderBy: [{ season: "desc" }, { week: "desc" }, { capturedAt: "desc" }],
  });
  const byGrain = new Map<string, SignalRow>();
  for (const raw of Array.isArray(rows) ? rows : []) {
    if (!isUsable(raw)) continue;
    const entityId = canonicalizeNgsTeamKey(raw.entityId);
    if (!entityId) continue;
    const normalized = { ...raw, entityId };
    const grainKey = `${entityId}:${normalized.season}:${normalized.week}`;
    const prior = byGrain.get(grainKey);
    if (!prior || normalized.capturedAt > prior.capturedAt) byGrain.set(grainKey, normalized);
  }
  const homeGrains = new Set([...byGrain.values()].filter((row) => row.entityId === homeKey).map((row) => `${row.season}:${row.week}`));
  const awayGrains = new Set([...byGrain.values()].filter((row) => row.entityId === awayKey).map((row) => `${row.season}:${row.week}`));
  const commonGrains = [...homeGrains].filter((grain) => awayGrains.has(grain));
  if (commonGrains.length === 0) return { home: null, away: null };
  const sourceSeason = Math.max(...commonGrains.map((grain) => Number(grain.split(":")[0])));
  const seasonGrains = commonGrains.filter((grain) => Number(grain.split(":")[0]) === sourceSeason);
  const sourceWeeks = seasonGrains.map((grain) => Number(grain.split(":")[1]));
  const sourceWeek = sourceWeeks.includes(0) ? 0 : Math.max(...sourceWeeks);
  const homeRow = byGrain.get(`${homeKey}:${sourceSeason}:${sourceWeek}`);
  const awayRow = byGrain.get(`${awayKey}:${sourceSeason}:${sourceWeek}`);
  if (!homeRow || !awayRow) return { home: null, away: null };
  const byKey = new Map<string, SignalRow>([[homeKey, homeRow], [awayKey, awayRow]]);
  const map = (key: string | null): NgsTeamContextSignal | null => {
    if (!key) return null;
    const row = byKey.get(key);
    return row
      ? { value: row.value, weight: row.weight, confidence: row.confidence, capturedAt: row.capturedAt.toISOString(), season: row.season }
      : null;
  };
  return { home: map(homeKey), away: map(awayKey) };
}
