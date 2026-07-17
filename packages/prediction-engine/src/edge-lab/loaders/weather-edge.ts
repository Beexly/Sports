/**
 * PROVENANCE: ported VERBATIM from the founder's gse-weather-edge packet
 * (2026-07-17, 8/8 tests in-packet). This is the AS-OF WEATHER LOADER — the
 * exact "remaining data step" the edge-lab weather feature
 * (../features/nfl-weather.ts) declared: it fetches only what was knowable at
 * the pick's freeze time (live path: current forecast for a future hour;
 * backtest path: historical-forecast archive constrained to runs issued ≤
 * asOfUtc — NEVER observed weather), and every result carries provenance +
 * leadTimeHours so the feature layer's forecast-issued-before-cutoff gate can
 * be enforced downstream. RECONCILIATION VERDICT (W-WEATHER-REC): the packet
 * and the edge-lab feature are COMPLEMENTARY layers of one canonical path —
 * loader (this file) → toGameWeatherForecast adapter → buildWeatherFeatureRows
 * → §5 trials registry. Behavioral edits here are forbidden; improvements go
 * through new tests first. Rights: Open-Meteo CC-BY-4.0, attribution required
 * on display surfaces; hosted FREE tier is non-commercial (self-host or
 * license for production) — see source-rights-registry "open-meteo".
 */
/**
 * gse-weather-edge — leak-safe, AS-OF NFL weather features from Open-Meteo.
 *
 * WHY THIS EXISTS
 * The Galaxy edge engine admits features through an as-of feature store with
 * runtime lookahead guards and a purged walk-forward trials registry. Weather
 * (wind, gusts, precip) is a real NFL edge factor, and Open-Meteo is free and
 * commercial-OK — but a naive weather join LEAKS: using the weather that
 * actually occurred at kickoff is information not available when the pick was
 * frozen. This module returns only what was knowable AS-OF the pick's freeze
 * time, so a weather feature can pass the same no-lookahead discipline as the
 * rest of the store.
 *
 * THE LEAK-SAFETY CONTRACT (the load-bearing part)
 *   - `asOfUtc` is the pick freeze time. The returned features must be derivable
 *     from information available at `asOfUtc` and nothing later.
 *   - Live/upcoming games (kickoff in the future): use the CURRENT forecast — a
 *     forecast for a future hour is legitimately known now.
 *   - Backtest (kickoff in the past): use Open-Meteo's HISTORICAL-FORECAST
 *     archive constrained so the forecast run was issued at/before `asOfUtc`.
 *     NEVER the observed/ERA5 archive (that is the outcome, i.e. leakage).
 *   - Every result carries provenance so the feature store can assert the
 *     leak gate downstream.
 *
 * DESIGN
 *   - `fetchJson` is INJECTED (no hidden HTTP), so this is unit-testable with
 *     fixtures and the caller controls the actual network + retries + caching.
 *   - Indoor/dome sites short-circuit to a neutral "no weather effect" result.
 *   - Derived signals are labeled CANDIDATE hypotheses for the trials registry
 *     to admit or reject — this module makes NO accuracy/edge claim.
 *
 * Built against Open-Meteo's documented, stable API shape. The one thing to
 * smoke-test live on your infra is the exact previous-runs selection for strict
 * as-of backtests (see INTEGRATION_SPEC.md → "Strict as-of backtests").
 */

// ── Public types ────────────────────────────────────────────────────────────
export interface StadiumSite {
  readonly name?: string;
  readonly latitude: number;
  readonly longitude: number;
  /** Dome or retractable-roof-closed → no meaningful field weather. */
  readonly isIndoor: boolean;
}

export interface GameWeatherQuery {
  readonly site: StadiumSite;
  /** Game commence time, ISO-8601 UTC (e.g. "2026-01-11T18:00:00Z"). */
  readonly kickoffUtc: string;
  /** Pick freeze time, ISO-8601 UTC. MUST be <= kickoffUtc (the leak anchor). */
  readonly asOfUtc: string;
}

export type WeatherSource =
  | "forecast" // live/upcoming: current forecast for a future kickoff hour
  | "historical-forecast" // backtest: archived forecast issued <= asOf
  | "indoor-neutral" // dome/closed roof: weather does not apply
  | "unavailable"; // no row for the kickoff hour / upstream gap

export interface CandidateSignals {
  /** 0..1, monotone in wind+gust+precip. A HYPOTHESIS for the trials registry. */
  readonly passingSuppressionIndex: number | null;
  /** 0..1, monotone in wind+precip. A HYPOTHESIS for the trials registry. */
  readonly kickingDifficultyIndex: number | null;
}

export interface WeatherFeatures {
  readonly available: boolean;
  readonly indoor: boolean;
  readonly source: WeatherSource;
  readonly asOfUtc: string;
  readonly kickoffUtc: string;
  /** The hour bucket actually used, "YYYY-MM-DDTHH:00" UTC. */
  readonly forecastValidHourUtc: string | null;
  readonly tempF: number | null;
  readonly windMph: number | null;
  readonly windGustMph: number | null;
  readonly windDirDeg: number | null;
  readonly precipInch: number | null;
  readonly precipProbPct: number | null;
  readonly candidateSignals: CandidateSignals;
  readonly provenance: {
    readonly api: string | null;
    /** Forecast lead time at freeze: hours between asOf and kickoff. */
    readonly leadTimeHours: number;
    readonly note: string;
  };
}

export interface OpenMeteoHourly {
  readonly time: string[];
  readonly temperature_2m?: (number | null)[];
  readonly precipitation?: (number | null)[];
  readonly precipitation_probability?: (number | null)[];
  readonly wind_speed_10m?: (number | null)[];
  readonly wind_gusts_10m?: (number | null)[];
  readonly wind_direction_10m?: (number | null)[];
}
export interface OpenMeteoResponse {
  readonly latitude?: number;
  readonly longitude?: number;
  readonly timezone?: string;
  readonly hourly_units?: Record<string, string>;
  readonly hourly?: OpenMeteoHourly;
}

export interface WeatherDeps {
  /** Injected HTTP: GET a URL, return parsed JSON. Caller owns retries/caching. */
  readonly fetchJson: (url: string) => Promise<unknown>;
  /** Clock (injectable for tests). Defaults to real time. */
  readonly now?: () => Date;
}

// ── Constants ────────────────────────────────────────────────────────────────
const FORECAST_HOST = "https://api.open-meteo.com/v1/forecast";
const HISTORICAL_FORECAST_HOST = "https://historical-forecast-api.open-meteo.com/v1/forecast";
const HOURLY_VARS = [
  "temperature_2m",
  "precipitation",
  "precipitation_probability",
  "wind_speed_10m",
  "wind_gusts_10m",
  "wind_direction_10m",
] as const;

// ── Small helpers ────────────────────────────────────────────────────────────
function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}
function toUtcDate(iso: string): Date {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid ISO datetime: ${iso}`);
  return d;
}
/** Floor a Date to the top of its UTC hour, formatted "YYYY-MM-DDTHH:00". */
function utcHourBucket(d: Date): string {
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}T${p(d.getUTCHours())}:00`;
}
/** "YYYY-MM-DD" (UTC) for Open-Meteo start_date/end_date. */
function utcDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
}

// ── URL builders (documented Open-Meteo shape; imperial units) ───────────────
function commonParams(site: StadiumSite): URLSearchParams {
  const p = new URLSearchParams();
  p.set("latitude", String(site.latitude));
  p.set("longitude", String(site.longitude));
  p.set("hourly", HOURLY_VARS.join(","));
  p.set("timezone", "UTC");
  p.set("wind_speed_unit", "mph");
  p.set("temperature_unit", "fahrenheit");
  p.set("precipitation_unit", "inch");
  return p;
}
export function buildForecastUrl(site: StadiumSite): string {
  const p = commonParams(site);
  p.set("forecast_days", "16");
  return `${FORECAST_HOST}?${p.toString()}`;
}
export function buildHistoricalForecastUrl(site: StadiumSite, kickoff: Date): string {
  const p = commonParams(site);
  // One-day window around kickoff is enough to contain the kickoff hour.
  const start = new Date(kickoff.getTime() - 24 * 3600_000);
  const end = new Date(kickoff.getTime() + 24 * 3600_000);
  p.set("start_date", utcDate(start));
  p.set("end_date", utcDate(end));
  return `${HISTORICAL_FORECAST_HOST}?${p.toString()}`;
}

// ── Feature extraction ───────────────────────────────────────────────────────
function pickAtHour(resp: OpenMeteoResponse, hourBucket: string) {
  const h = resp.hourly;
  if (!h || !Array.isArray(h.time)) return null;
  const i = h.time.findIndex((t) => t === hourBucket || t.startsWith(hourBucket));
  if (i < 0) return null;
  const at = (arr: (number | null)[] | undefined): number | null =>
    arr && i < arr.length && typeof arr[i] === "number" ? (arr[i] as number) : null;
  return {
    tempF: at(h.temperature_2m),
    precipInch: at(h.precipitation),
    precipProbPct: at(h.precipitation_probability),
    windMph: at(h.wind_speed_10m),
    windGustMph: at(h.wind_gusts_10m),
    windDirDeg: at(h.wind_direction_10m),
  };
}

/**
 * CANDIDATE signals — documented, monotone transforms of the raw fields. These
 * are HYPOTHESES for the trials registry to admit or reject via purged
 * walk-forward validation; nothing here asserts they move accuracy.
 */
function candidateSignals(f: {
  windMph: number | null;
  windGustMph: number | null;
  precipInch: number | null;
}): CandidateSignals {
  const wind = f.windMph ?? f.windGustMph;
  const gust = f.windGustMph ?? f.windMph;
  const precip = f.precipInch;
  if (wind == null && gust == null && precip == null) {
    return { passingSuppressionIndex: null, kickingDifficultyIndex: null };
  }
  const w = (wind ?? 0) / 25; // ~25mph sustained is a strong passing suppressor
  const g = (gust ?? 0) / 40; // ~40mph gusts
  const r = Math.min((precip ?? 0) / 0.2, 1); // ~0.2in/hr is heavy
  const passingSuppressionIndex = clamp01(0.5 * w + 0.3 * g + 0.2 * r);
  const kickingDifficultyIndex = clamp01(0.6 * w + 0.2 * g + 0.2 * r);
  return { passingSuppressionIndex, kickingDifficultyIndex };
}

// ── Core ─────────────────────────────────────────────────────────────────────
function indoorNeutral(q: GameWeatherQuery, leadTimeHours: number): WeatherFeatures {
  return {
    available: true,
    indoor: true,
    source: "indoor-neutral",
    asOfUtc: q.asOfUtc,
    kickoffUtc: q.kickoffUtc,
    forecastValidHourUtc: null,
    tempF: null,
    windMph: 0,
    windGustMph: 0,
    windDirDeg: null,
    precipInch: 0,
    precipProbPct: 0,
    candidateSignals: { passingSuppressionIndex: 0, kickingDifficultyIndex: 0 },
    provenance: { api: null, leadTimeHours, note: "Indoor/closed-roof site — weather does not apply; neutral by construction." },
  };
}

/**
 * Return leak-safe, as-of weather features for one game. Throws only on a
 * genuine leak (asOf after kickoff) or malformed dates — everything else
 * degrades to an honest `available:false` / `source:"unavailable"`.
 */
export async function getAsOfGameWeather(q: GameWeatherQuery, deps: WeatherDeps): Promise<WeatherFeatures> {
  const kickoff = toUtcDate(q.kickoffUtc);
  const asOf = toUtcDate(q.asOfUtc);
  if (asOf.getTime() > kickoff.getTime()) {
    throw new Error(
      `Leak guard: asOfUtc (${q.asOfUtc}) is AFTER kickoffUtc (${q.kickoffUtc}). A pick cannot be frozen after kickoff.`,
    );
  }
  const leadTimeHours = Math.round((kickoff.getTime() - asOf.getTime()) / 3600_000);

  if (q.site.isIndoor) return indoorNeutral(q, leadTimeHours);

  const now = (deps.now ?? (() => new Date()))();
  // Live/upcoming iff the kickoff is still in the future relative to the clock.
  const isUpcoming = kickoff.getTime() > now.getTime();
  const url = isUpcoming ? buildForecastUrl(q.site) : buildHistoricalForecastUrl(q.site, kickoff);
  const api = isUpcoming ? "open-meteo/forecast" : "open-meteo/historical-forecast";
  const source: WeatherSource = isUpcoming ? "forecast" : "historical-forecast";

  let resp: OpenMeteoResponse;
  try {
    resp = (await deps.fetchJson(url)) as OpenMeteoResponse;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      available: false,
      indoor: false,
      source: "unavailable",
      asOfUtc: q.asOfUtc,
      kickoffUtc: q.kickoffUtc,
      forecastValidHourUtc: null,
      tempF: null,
      windMph: null,
      windGustMph: null,
      windDirDeg: null,
      precipInch: null,
      precipProbPct: null,
      candidateSignals: { passingSuppressionIndex: null, kickingDifficultyIndex: null },
      provenance: { api, leadTimeHours, note: `Upstream fetch failed (${msg}); honest unavailable, not a zero.` },
    };
  }

  const hourBucket = utcHourBucket(kickoff);
  const at = pickAtHour(resp, hourBucket);
  if (!at) {
    return {
      available: false,
      indoor: false,
      source: "unavailable",
      asOfUtc: q.asOfUtc,
      kickoffUtc: q.kickoffUtc,
      forecastValidHourUtc: hourBucket,
      tempF: null,
      windMph: null,
      windGustMph: null,
      windDirDeg: null,
      precipInch: null,
      precipProbPct: null,
      candidateSignals: { passingSuppressionIndex: null, kickingDifficultyIndex: null },
      provenance: { api, leadTimeHours, note: `No hourly row for ${hourBucket} in the ${source} response.` },
    };
  }

  const leakNote =
    source === "historical-forecast"
      ? `Backtest path: archived forecast for the kickoff hour. LEAK CONTRACT — the feature store must confirm the underlying forecast run was issued <= asOfUtc (see INTEGRATION_SPEC.md → Strict as-of backtests). Lead time ${leadTimeHours}h.`
      : `Live path: current forecast for a future kickoff hour, knowable as-of now. Lead time ${leadTimeHours}h.`;

  return {
    available: true,
    indoor: false,
    source,
    asOfUtc: q.asOfUtc,
    kickoffUtc: q.kickoffUtc,
    forecastValidHourUtc: hourBucket,
    tempF: at.tempF,
    windMph: at.windMph,
    windGustMph: at.windGustMph,
    windDirDeg: at.windDirDeg,
    precipInch: at.precipInch,
    precipProbPct: at.precipProbPct,
    candidateSignals: candidateSignals(at),
    provenance: { api, leadTimeHours, note: leakNote },
  };
}

export const __internals = { utcHourBucket, candidateSignals, buildForecastUrl, buildHistoricalForecastUrl, pickAtHour };
