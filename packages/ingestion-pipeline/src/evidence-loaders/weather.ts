/**
 * Weather evidence loader — NWS under the evidence contract.
 *
 * No coordinates -> MISSING; never a guess (the old pipeline silently fell
 * back to Denver). The underlying client swallows network failures and
 * returns a neutral baseline; that baseline is an invented input, so this
 * loader reports it as MISSING. Only a real NWS reading — or the indoor
 * reading for a dome, which genuinely has no weather — is REAL.
 */

import type {
  Evidence,
  WeatherRecord,
} from "@sports/prediction-engine/src/evidence/types.js";
import { missing, real } from "@sports/prediction-engine/src/evidence/types.js";
import {
  fetchNwsWeather,
  resolveVenueCoordinates,
  type WeatherContextReading,
} from "@sports/data-ingestion/src/nws-weather-client.js";

const SOURCE = "nws:weather";

export interface WeatherLoadOptions {
  readonly city?: string;
  readonly state?: string;
  readonly fetchImpl?: typeof fetch;
  readonly now?: Date;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export async function loadWeather(
  venue: string | null,
  opts: WeatherLoadOptions = {},
): Promise<Evidence<WeatherRecord>> {
  const now = opts.now ?? new Date();
  const venueLabel = venue ?? "null";

  const coords = resolveVenueCoordinates(
    venue ?? undefined,
    opts.city,
    opts.state,
  );
  if (coords === null) {
    return missing(`no coordinates for venue ${venueLabel}`, SOURCE);
  }

  let reading: WeatherContextReading;
  try {
    reading = await fetchNwsWeather(
      coords.lat,
      coords.lon,
      coords.indoor ?? false,
      opts.fetchImpl,
    );
  } catch (err) {
    return missing(
      `NWS weather fetch failed for venue ${venueLabel}: ${errorMessage(err)}`,
      SOURCE,
    );
  }

  // The client answers failed fetches with a neutral baseline. That is not a
  // measurement — surfacing it would be exactly the invented input this
  // evidence spine exists to remove.
  if (reading.source === "neutral_fallback") {
    return missing(
      `NWS weather unavailable for venue ${venueLabel} — client returned a neutral fallback, which is not a measurement`,
      SOURCE,
    );
  }

  const record: WeatherRecord = {
    temperatureF: reading.temperatureF,
    windMph: reading.windSpeedMph,
    // The NWS hourly reading carries no wind-direction or precipitation-
    // probability field. Null is the honest value; do not invent one.
    windDirectionDeg: null,
    precipitationChance: null,
    condition: reading.weatherSummary,
    isDome: reading.isIndoor,
  };

  const note =
    reading.source === "indoor"
      ? "indoor venue: climate-controlled dome, no outdoor weather applies"
      : "windDirectionDeg and precipitationChance not carried by the NWS hourly reading";

  return real(record, SOURCE, now.toISOString(), note);
}
