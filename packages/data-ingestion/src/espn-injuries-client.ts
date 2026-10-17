/**
 * espn-injuries-client.ts — Keyless ESPN Injury Ingestion & Normalization.
 *
 * Supports NFL and NCAAF via:
 *   NFL:   https://site.api.espn.com/apis/site/v2/sports/football/nfl/injuries
 *   NCAAF: https://site.api.espn.com/apis/site/v2/sports/football/college-football/injuries
 *
 * Normalizes athlete names, positions, injury status (Out/Questionable/IR/Doubtful),
 * and short comments. Calculates trench & secondary continuity deltas (OL/DL/DB).
 * Pure fallback to neutral baselines when unavailable.
 */

import type { EvidenceRecord } from "@sports/types";
import { normalizeComparableText, findMatchingTeamInText } from "./team-text-match.js";
import { isIngestible } from "./source-registry.js";
import { GALAXY_ESPN_INLINE_SOURCE_ID } from "./espn-odds-client.js";

export interface NormalizedInjuryRecord {
  readonly id: string;
  readonly athleteName: string;
  readonly position: string;
  readonly status: string;
  readonly shortComment: string;
  readonly longComment?: string;
  readonly date?: string;
  readonly teamName: string;
  readonly teamId?: string;
}

export interface TeamContinuityMetrics {
  readonly olContinuityDelta: number;
  readonly dlContinuityDelta: number;
  readonly dbContinuityDelta: number;
  readonly outOlCount: number;
  readonly qOlCount: number;
  readonly outDlCount: number;
  readonly qDlCount: number;
  readonly outDbCount: number;
  readonly qDbCount: number;
  readonly skillOutCount: number;
  readonly skillQCount: number;
  readonly totalOutOrQuestionable: number;
  readonly keyComments: readonly string[];
}

const OL_POSITIONS = new Set(["OL", "OT", "OG", "C", "G", "T"]);
const DL_POSITIONS = new Set(["DE", "DT", "EDGE", "NT", "OLB", "DL"]);
const DB_POSITIONS = new Set(["CB", "S", "FS", "SS", "DB", "NB"]);
const SKILL_POSITIONS = new Set(["RB", "WR", "QB", "TE"]);

const OUT_STATUSES = new Set(["OUT", "INJURED RESERVE", "IR", "DOUBTFUL", "SUSPENSION"]);
const QUESTIONABLE_STATUSES = new Set(["QUESTIONABLE", "PROBABLE"]);

export function isOlPosition(pos: string): boolean {
  return OL_POSITIONS.has(pos.trim().toUpperCase());
}

export function isDlPosition(pos: string): boolean {
  return DL_POSITIONS.has(pos.trim().toUpperCase());
}

export function isDbPosition(pos: string): boolean {
  return DB_POSITIONS.has(pos.trim().toUpperCase());
}

export function isSkillPosition(pos: string): boolean {
  return SKILL_POSITIONS.has(pos.trim().toUpperCase());
}

export function isOutStatus(status: string): boolean {
  return OUT_STATUSES.has(status.trim().toUpperCase());
}

export function isQuestionableStatus(status: string): boolean {
  return QUESTIONABLE_STATUSES.has(status.trim().toUpperCase());
}

/**
 * Calculates continuity delta:
 * clamp(-(outCount * 0.15 + qCount * 0.08), -1, 0)
 */
export function calculateContinuityDelta(outCount: number, qCount: number): number {
  if (outCount <= 0 && qCount <= 0) return 0;
  const raw = -(outCount * 0.15 + qCount * 0.08);
  return Number(Math.max(-1, Math.min(0, raw)).toFixed(3));
}

// In-memory cache by sport with 10-minute TTL
interface CacheEntry {
  data: Map<string, NormalizedInjuryRecord[]>;
  timestamp: number;
}
const injuryCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 10 * 60 * 1000;

export function clearInjuryCacheForTests(): void {
  injuryCache.clear();
}

/**
 * Maps sport key to ESPN path segment.
 */
export function espnInjuryPathForSport(sportKey: string): string | null {
  const norm = sportKey.toLowerCase();
  if (norm.includes("nfl") || norm === "americanfootball_nfl") {
    return "football/nfl";
  }
  if (norm.includes("ncaaf") || norm === "americanfootball_ncaaf" || norm.includes("college-football")) {
    return "football/college-football";
  }
  return null;
}

/**
 * Fetches and parses ESPN injuries endpoint.
 * Returns map keyed by normalized team name.
 */
export async function fetchEspnInjuries(
  sportKey: string,
  customFetch: typeof fetch = fetch,
): Promise<Map<string, NormalizedInjuryRecord[]>> {
  if (!isIngestible(GALAXY_ESPN_INLINE_SOURCE_ID)) {
    return new Map();
  }

  const path = espnInjuryPathForSport(sportKey);
  if (!path) return new Map();

  const cached = injuryCache.get(path);
  const now = Date.now();
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const url = `https://site.api.espn.com/apis/site/v2/sports/${path}/injuries`;
  try {
    const res = await customFetch(url, {
      headers: { "User-Agent": "GalaxySportsEdge/1.0 (contact@galaxysportsedge.com)" },
    });
    if (!res.ok) {
      console.warn(`[espn-injuries] HTTP ${res.status} from ${url}`);
      return cached?.data ?? new Map();
    }

    const json = (await res.json()) as {
      injuries?: Array<{
        id?: string;
        displayName?: string;
        name?: string;
        injuries?: Array<{
          id?: string;
          status?: string;
          shortComment?: string;
          longComment?: string;
          date?: string;
          athlete?: {
            displayName?: string;
            position?: { abbreviation?: string; name?: string };
            team?: { displayName?: string; name?: string };
          };
        }>;
      }>;
    };

    const teamMap = new Map<string, NormalizedInjuryRecord[]>();
    const teams = json.injuries ?? [];

    for (const team of teams) {
      const teamDisplayName = team.displayName || team.name || "";
      const teamKey = normalizeComparableText(teamDisplayName);
      if (!teamKey) continue;

      const records: NormalizedInjuryRecord[] = [];
      for (const inj of team.injuries ?? []) {
        const athleteName = inj.athlete?.displayName || "Unknown Athlete";
        const position = inj.athlete?.position?.abbreviation || inj.athlete?.position?.name || "ATH";
        const status = inj.status || "Questionable";
        const shortComment = inj.shortComment || `${athleteName} (${position}) listed as ${status}`;

        records.push({
          id: inj.id || `${teamKey}-${athleteName}`,
          athleteName,
          position,
          status,
          shortComment,
          longComment: inj.longComment,
          date: inj.date,
          teamName: teamDisplayName,
          teamId: team.id,
        });
      }

      teamMap.set(teamKey, records);
    }

    injuryCache.set(path, { data: teamMap, timestamp: now });
    return teamMap;
  } catch (err) {
    console.warn(`[espn-injuries] Failed to fetch injuries for ${path}: ${err instanceof Error ? err.message : String(err)}`);
    return cached?.data ?? new Map();
  }
}

/**
 * Finds injury records for a specific team by fuzzy/substring matching on team name.
 */
export function getTeamInjuries(
  teamName: string,
  injuryMap: Map<string, NormalizedInjuryRecord[]>,
): NormalizedInjuryRecord[] {
  const normNeedle = normalizeComparableText(teamName);
  if (!normNeedle) return [];

  // Direct exact match
  if (injuryMap.has(normNeedle)) {
    return injuryMap.get(normNeedle)!;
  }

  // Substring or token match
  const teamKeys = Array.from(injuryMap.keys());
  const matchedKey = findMatchingTeamInText(normNeedle, teamKeys);
  if (matchedKey && injuryMap.has(matchedKey)) {
    return injuryMap.get(matchedKey)!;
  }

  // Reverse check: does any teamKey contain needle or vice versa
  for (const [key, records] of injuryMap.entries()) {
    if (key.includes(normNeedle) || normNeedle.includes(key)) {
      return records;
    }
  }

  return [];
}

/**
 * Derives real numeric continuity metrics from parsed injury records.
 */
export function computeTeamContinuity(records: readonly NormalizedInjuryRecord[]): TeamContinuityMetrics {
  let outOl = 0;
  let qOl = 0;
  let outDl = 0;
  let qDl = 0;
  let outDb = 0;
  let qDb = 0;
  let skillOut = 0;
  let skillQ = 0;

  const keyComments: string[] = [];

  for (const r of records) {
    const isOut = isOutStatus(r.status);
    const isQ = isQuestionableStatus(r.status);

    if (isOlPosition(r.position)) {
      if (isOut) outOl++;
      else if (isQ) qOl++;
    } else if (isDlPosition(r.position)) {
      if (isOut) outDl++;
      else if (isQ) qDl++;
    } else if (isDbPosition(r.position)) {
      if (isOut) outDb++;
      else if (isQ) qDb++;
    }

    if (isSkillPosition(r.position)) {
      if (isOut) skillOut++;
      else if (isQ) skillQ++;
    }

    if ((isOut || isQ) && r.shortComment) {
      keyComments.push(`${r.athleteName} (${r.position}, ${r.status}): ${r.shortComment}`);
    }
  }

  const totalOutOrQuestionable = outOl + qOl + outDl + qDl + outDb + qDb + skillOut + skillQ;

  return {
    olContinuityDelta: calculateContinuityDelta(outOl, qOl),
    dlContinuityDelta: calculateContinuityDelta(outDl, qDl),
    dbContinuityDelta: calculateContinuityDelta(outDb, qDb),
    outOlCount: outOl,
    qOlCount: qOl,
    outDlCount: outDl,
    qDlCount: qDl,
    outDbCount: outDb,
    qDbCount: qDb,
    skillOutCount: skillOut,
    skillQCount: skillQ,
    totalOutOrQuestionable,
    keyComments,
  };
}

/**
 * Constructs an EvidenceRecord for PLAYER_AVAILABILITY.
 * Replaces placeholder when real injury data exists.
 */
export function buildPlayerAvailabilityEvidence(
  teamName: string,
  records: readonly NormalizedInjuryRecord[],
  fetchedAt: Date,
): EvidenceRecord {
  if (records.length === 0) {
    return {
      sourceCategory: "PLAYER_AVAILABILITY",
      sourceName: "not-configured",
      signalKey: "player_availability",
      fetchedAt,
      trustLevel: 0,
      isBootstrap: true,
      activationStatus: "BLOCKED_MISSING_SOURCE",
      freshnessStatus: "MISSING",
      sampleSize: null,
      whyUsedOrBlocked:
        `player availability for ${teamName} has no confirmed ESPN injury report; ` +
        "neutral baseline retained.",
    };
  }

  const metrics = computeTeamContinuity(records);
  const commentSample = metrics.keyComments.slice(0, 3).join("; ");
  const summary =
    `${teamName} ESPN injury report: ${metrics.totalOutOrQuestionable} players affected ` +
    `(OL: ${metrics.outOlCount} Out / ${metrics.qOlCount} Q; ` +
    `DL: ${metrics.outDlCount} Out / ${metrics.qDlCount} Q; ` +
    `DB: ${metrics.outDbCount} Out / ${metrics.qDbCount} Q). ` +
    (commentSample ? `Key: ${commentSample}` : "");

  return {
    sourceCategory: "PLAYER_AVAILABILITY",
    sourceName: "espn-injuries",
    signalKey: "player_availability",
    fetchedAt,
    trustLevel: 0.85,
    isBootstrap: false,
    activationStatus: "SHADOW_ONLY",
    freshnessStatus: "FRESH",
    sampleSize: metrics.totalOutOrQuestionable,
    whyUsedOrBlocked: summary,
  };
}
