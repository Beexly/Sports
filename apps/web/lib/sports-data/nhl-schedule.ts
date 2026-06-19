/**
 * NHL Schedule adapter — keyless (api-web.nhle.com/v1/)
 * Source: NHL Official API, community-documented. No API key required.
 * Clearance gate: source ID "nhl-api" (approved_public_logged_off).
 *
 * Attribution: NHL data via api-web.nhle.com (unofficial, community-documented endpoint)
 */

import {
  checkClearance,
  type ClearanceRequest,
} from "@/lib/scraping/clearance-engine";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NHLGame {
  readonly id: number;
  readonly gameDate: string; // "2026-01-15"
  readonly homeTeam: string; // abbreviation e.g. "TOR"
  readonly awayTeam: string; // abbreviation e.g. "BOS"
  readonly status: string; // "FUT" | "LIVE" | "FINAL"
  readonly homeScore: number | null;
  readonly awayScore: number | null;
  readonly startTime: string | null; // ISO string or null
}

export interface NHLScheduleResult {
  readonly games: readonly NHLGame[];
  readonly date: string;
  readonly source: "nhl-api";
  readonly fetchedAt: string;
}

// ─── Clearance request constant ───────────────────────────────────────────────

/**
 * Mode: public_logged_off_fact_extract — compatible with approved_public_logged_off.
 * Tool: fetch-native — approved for this mode.
 * Intents: derived_analytics only — commercial_display_allowed=false for nhl-api.
 */
const CLEARANCE_REQUEST: ClearanceRequest = {
  source_id: "nhl-api",
  mode: "public_logged_off_fact_extract",
  tool_id: "fetch-native",
  intents: ["derived_analytics"],
} as const;

// ─── Raw API shape ────────────────────────────────────────────────────────────

interface NHLRawGame {
  id: number;
  startTimeUTC?: string;
  gameState?: string;
  homeTeam?: { abbrev?: string; score?: number };
  awayTeam?: { abbrev?: string; score?: number };
}

interface NHLRawGameWeek {
  date: string;
  games: NHLRawGame[];
}

interface NHLScheduleResponse {
  gameWeek?: NHLRawGameWeek[];
}

// ─── Loader ───────────────────────────────────────────────────────────────────

/**
 * Fetch today's NHL schedule from the official (keyless) API.
 * Never throws — returns null on any error or clearance denial.
 * Attribution: NHL data via api-web.nhle.com (unofficial community-documented endpoint)
 */
export async function loadNHLSchedule(
  dateStr?: string, // "YYYY-MM-DD"; defaults to today
): Promise<NHLScheduleResult | null> {
  // ── 1. Clearance check ─────────────────────────────────────────────────────
  let clearance;
  try {
    clearance = checkClearance(CLEARANCE_REQUEST);
  } catch {
    return null;
  }

  if (!clearance.allowed) {
    return null;
  }

  // ── 2. Fetch ───────────────────────────────────────────────────────────────
  const date = dateStr ?? new Date().toISOString().slice(0, 10);
  const url = `https://api-web.nhle.com/v1/schedule/${date}`;

  try {
    const res = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "GalaxySportsEdge/1.0 (https://galaxysportsedge.com)",
      },
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 300 }, // 5-minute cache
    });

    if (!res.ok) return null;

    let raw: unknown;
    try {
      raw = await res.json();
    } catch {
      return null;
    }

    // ── 3. Parse ───────────────────────────────────────────────────────────
    if (!raw || typeof raw !== "object") return null;
    const data = raw as NHLScheduleResponse;

    const dayGames = data.gameWeek?.[0]?.games ?? [];

    const games: NHLGame[] = dayGames.map((g) => ({
      id: g.id,
      gameDate: date,
      homeTeam: g.homeTeam?.abbrev ?? "?",
      awayTeam: g.awayTeam?.abbrev ?? "?",
      status: g.gameState ?? "UNKNOWN",
      homeScore: g.homeTeam?.score ?? null,
      awayScore: g.awayTeam?.score ?? null,
      startTime: g.startTimeUTC ?? null,
    }));

    return {
      games,
      date,
      source: "nhl-api",
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    // Timeout, network error, or any other fetch failure → fail closed
    return null;
  }
}
