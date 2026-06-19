/**
 * OpenLigaDB adapter — keyless REST API (api.openligadb.de)
 * Source: OpenLigaDB, community open sports database. No API key required.
 * Clearance gate: source ID "openligadb" (approved_open_license).
 * Covers: Bundesliga, 2. Bundesliga, DFB Pokal, Champions League (German focus).
 *
 * Attribution: Football data from OpenLigaDB (api.openligadb.de) — community open sports database.
 */

import {
  checkClearance,
  type ClearanceRequest,
} from "@/lib/scraping/clearance-engine";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BundesligaMatch {
  readonly matchId: number;
  readonly matchDateTime: string; // ISO datetime string
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly homeScore: number | null; // null if not yet played
  readonly awayScore: number | null;
  readonly isFinished: boolean;
  readonly matchDay: number;
}

export interface OpenLigaDBResult {
  readonly matches: readonly BundesligaMatch[];
  readonly season: string;
  readonly league: string;
  readonly source: "openligadb";
  readonly fetchedAt: string;
}

// ─── Clearance request constant ───────────────────────────────────────────────

/**
 * Mode: open_dataset_ingest — compatible with approved_open_license.
 * Tool: fetch-native — approved for this mode.
 * Intents: commercial_display + storage + derived_analytics (all allowed by registry).
 */
const CLEARANCE_REQUEST: ClearanceRequest = {
  source_id: "openligadb",
  mode: "open_dataset_ingest",
  tool_id: "fetch-native",
  intents: ["commercial_display", "storage", "derived_analytics"],
} as const;

// ─── Raw API shape ────────────────────────────────────────────────────────────

interface OpenLigaMatchResult {
  ResultOrderID?: number;
  PointsTeam1?: number;
  PointsTeam2?: number;
}

interface OpenLigaRawMatch {
  MatchID?: number;
  MatchDateTimeUTC?: string;
  Team1?: { TeamName?: string };
  Team2?: { TeamName?: string };
  MatchResults?: OpenLigaMatchResult[];
  MatchIsFinished?: boolean;
  Group?: { GroupOrderID?: number };
}

// ─── Loader ───────────────────────────────────────────────────────────────────

/**
 * Fetch current Bundesliga matchday from OpenLigaDB.
 * Never throws — returns null on any error or clearance denial.
 * Attribution: Football data from OpenLigaDB (api.openligadb.de) — community open sports database.
 */
export async function loadBundesligaCurrentMatchday(
  leagueShortcut = "bl1", // "bl1" = 1. Bundesliga, "bl2" = 2. Bundesliga
  season = "2025",
): Promise<OpenLigaDBResult | null> {
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
  const url = `https://api.openligadb.de/getmatchdata/${leagueShortcut}/${season}`;

  try {
    const res = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "GalaxySportsEdge/1.0 (https://galaxysportsedge.com)",
      },
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 3600 }, // 1-hour cache
    });

    if (!res.ok) return null;

    let raw: unknown;
    try {
      raw = await res.json();
    } catch {
      return null;
    }

    // ── 3. Parse ───────────────────────────────────────────────────────────
    if (!Array.isArray(raw)) return null;
    const data = raw as OpenLigaRawMatch[];

    const matches: BundesligaMatch[] = data.map((m) => {
      // Final result is typically ResultOrderID === 2
      const finalResult =
        m.MatchResults?.find((r) => r.ResultOrderID === 2) ??
        m.MatchResults?.[0];
      return {
        matchId: m.MatchID ?? 0,
        matchDateTime: m.MatchDateTimeUTC ?? "",
        homeTeam: m.Team1?.TeamName ?? "?",
        awayTeam: m.Team2?.TeamName ?? "?",
        homeScore: finalResult?.PointsTeam1 ?? null,
        awayScore: finalResult?.PointsTeam2 ?? null,
        isFinished: m.MatchIsFinished ?? false,
        matchDay: m.Group?.GroupOrderID ?? 0,
      };
    });

    return {
      matches,
      season,
      league: leagueShortcut,
      source: "openligadb",
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    // Timeout, network error, or any other fetch failure → fail closed
    return null;
  }
}
