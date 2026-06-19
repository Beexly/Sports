/**
 * loadGameWeather — clearance-gated, never-throw game-day weather loader.
 *
 * 1. Checks the Scraping Clearance Engine for "open-meteo" before fetching.
 * 2. If clearance is denied → returns null immediately.
 * 3. Fetches Open-Meteo (keyless, CC-BY-4.0) with an 8-second timeout.
 * 4. Parses and picks the hourly slot nearest to kickoff.
 * 5. Returns GameWeather or null on ANY error — never throws, never fabricates.
 *
 * DISPLAY-ONLY: this data is never passed to the prediction model or
 * MODEL_VERSION. It is purely for user-facing weather context.
 */

import {
  checkClearance,
  type ClearanceRequest,
} from "@/lib/scraping/clearance-engine";
import {
  buildOpenMeteoUrl,
  parseOpenMeteoResponse,
  type GameWeather,
} from "./open-meteo";

// ─── Public types ─────────────────────────────────────────────────────────────

export type { GameWeather } from "./open-meteo";

export interface LoadGameWeatherParams {
  /** Venue latitude in decimal degrees */
  readonly lat: number;
  /** Venue longitude in decimal degrees */
  readonly lon: number;
  /** Game kickoff time as an ISO-8601 string (used to pick the nearest hourly slot) */
  readonly kickoffISO: string;
}

// ─── Clearance request constants ──────────────────────────────────────────────

/**
 * We use "open_dataset_ingest" + "fetch-native" which matches the approved
 * mode for open_license sources in the clearance engine (approved_open_license
 * is a compatible status for open_dataset_ingest).
 *
 * Intents: "commercial_display" because this data appears on a paid product surface.
 */
const CLEARANCE_REQUEST: ClearanceRequest = {
  source_id: "open-meteo",
  mode: "open_dataset_ingest",
  tool_id: "fetch-native",
  intents: ["commercial_display"],
} as const;

// ─── Loader ───────────────────────────────────────────────────────────────────

/**
 * Load game-day weather for the given venue and kickoff time.
 *
 * Returns a GameWeather object on success, or null if:
 *  - clearance is denied
 *  - fetch times out or throws
 *  - the response is malformed or doesn't cover the kickoff window
 *  - any other error
 *
 * NEVER throws.
 */
export async function loadGameWeather(
  params: LoadGameWeatherParams,
): Promise<GameWeather | null> {
  // ── 1. Clearance check ─────────────────────────────────────────────────────
  let clearance;
  try {
    clearance = checkClearance(CLEARANCE_REQUEST);
  } catch {
    // clearance engine itself threw — fail closed
    return null;
  }

  if (!clearance.allowed) {
    return null;
  }

  // ── 2. Build URL ───────────────────────────────────────────────────────────
  const url = buildOpenMeteoUrl({
    latitude: params.lat,
    longitude: params.lon,
    kickoffISO: params.kickoffISO,
    forecastDays: 3,
  });

  // ── 3. Fetch with timeout ──────────────────────────────────────────────────
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: {
        "User-Agent": "GalaxySportsEdge/1.0 (https://galaxysportsedge.com)",
        Accept: "application/json",
      },
      // Disable Next.js caching — we want fresh data at each request
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    let raw: unknown;
    try {
      raw = await response.json();
    } catch {
      return null;
    }

    // ── 4. Parse and pick nearest hour ─────────────────────────────────────
    return parseOpenMeteoResponse(raw, params.kickoffISO);
  } catch {
    // Timeout, network error, or any other fetch failure → fail closed
    return null;
  }
}
