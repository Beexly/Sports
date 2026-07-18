/**
 * Previous-runs weather loader — the STRICT as-of backtest path W-WEATHER-REC
 * left open (DEC-023 closed the capability gate; this module is the wiring).
 *
 * The vendored loader (weather-edge.ts, verbatim per DEC-014 — behavioral
 * edits forbidden) uses Open-Meteo's historical-forecast API for backtests,
 * which stitches multiple forecast runs into one best-lead timeseries and
 * cannot prove a given hour's value came from a run issued ≤ asOfUtc. This
 * module targets previous-runs-api.open-meteo.com instead, which serves the
 * forecast for an hour AS ISSUED N days earlier (`<var>_previous_dayN`),
 * live-verified distinct per run by scripts/weather-integration-smoke.mjs.
 *
 * Run selection is CONSERVATIVE, per the smoke's documented rule:
 *   N = max(1, ceil(leadTimeHours / 24)) — never a smaller N, so the selected
 *   run is issued ≤ asOfUtc by construction, rounding toward an OLDER run whenever
 *   the day boundary doesn't align. N > MAX_PREVIOUS_DAYS (the API's window)
 *   degrades to an honest `unavailable`, never a leaky smaller N.
 *
 * Same input/output contract as the vendored loader (GameWeatherQuery →
 * WeatherFeatures), so the existing `toGameWeatherForecast` adapter and
 * `buildWeatherFeatureRows` leak gate consume it UNCHANGED — one canonical
 * downstream path, two honest upstream sources. Reuses the vendored module's
 * exported `__internals` (hour bucketing, candidate-signal math) rather than
 * duplicating them.
 *
 * Rights: Open-Meteo CC-BY-4.0, attribution required on display surfaces;
 * the HOSTED free tier is non-commercial. A single-probe smoke is one thing —
 * a BULK historical admission run against the hosted tier is a founder-gated
 * self-host/license decision (see DEC-030). This module takes an injected
 * fetchJson and makes no calls of its own.
 */

import {
  __internals,
  type GameWeatherQuery,
  type StadiumSite,
  type WeatherDeps,
  type WeatherFeatures,
} from "./weather-edge.js";

const PREVIOUS_RUNS_HOST = "https://previous-runs-api.open-meteo.com/v1/forecast";

/** The hourly variables the canonical path consumes, mirrored from the vendored loader. */
const BASE_VARS = [
  "temperature_2m",
  "precipitation",
  "precipitation_probability",
  "wind_speed_10m",
  "wind_gusts_10m",
  "wind_direction_10m",
] as const;

/**
 * Open-Meteo's DOCUMENTED previous-runs window: `_previous_day1` …
 * `_previous_day7`. HONESTY NOTE: DEC-023's live smoke
 * (scripts/weather-integration-smoke.mjs) empirically confirmed distinct
 * runs only through `_previous_day3` — days 4-7 are a documented, not yet
 * independently live-verified, capability. A lead long enough to select N>3
 * is rare (>72h before kickoff) but not impossible; if the field turns out
 * to be absent/null for N in [4,7] the code below degrades to the same
 * honest `unavailable` it uses for any other missing-field case — it does
 * not fabricate a value either way. Extending the smoke to N=4..7 is a
 * cheap follow-up before relying on that range in a real admission run.
 */
export const MAX_PREVIOUS_DAYS = 7;

/**
 * The conservative run-selection rule from the DEC-023 smoke: never a smaller
 * N than the lead time implies, and never less than 1 (day0 IS the current
 * run, which can postdate the freeze). MUST be fed the EXACT (unrounded)
 * lead hours: a 24.4h lead rounded to 24 would select day1 — a run
 * initialized ~24h before the valid hour, i.e. AFTER the freeze — which is
 * precisely the leak this module exists to prevent. ceil() on the exact
 * value keeps every boundary on the older-run side (a run initialized
 * exactly AT asOf is knowable at asOf, so equality is safe). Returns null
 * when the lead exceeds the API's window — the caller degrades to honest
 * unavailable.
 */
export function previousDayN(exactLeadHours: number): number | null {
  const n = Math.max(1, Math.ceil(exactLeadHours / 24));
  return n > MAX_PREVIOUS_DAYS ? null : n;
}

export function buildPreviousRunsUrl(site: StadiumSite, kickoff: Date, n: number): string {
  const p = new URLSearchParams();
  p.set("latitude", String(site.latitude));
  p.set("longitude", String(site.longitude));
  p.set("hourly", BASE_VARS.map((v) => `${v}_previous_day${n}`).join(","));
  p.set("timezone", "UTC");
  p.set("wind_speed_unit", "mph");
  p.set("temperature_unit", "fahrenheit");
  p.set("precipitation_unit", "inch");
  const pad = (x: number) => String(x).padStart(2, "0");
  const day = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  p.set("start_date", day(new Date(kickoff.getTime() - 24 * 3600_000)));
  p.set("end_date", day(new Date(kickoff.getTime() + 24 * 3600_000)));
  return `${PREVIOUS_RUNS_HOST}?${p.toString()}`;
}

interface PreviousRunsHourly {
  readonly time?: string[];
  readonly [key: string]: (string[] | (number | null)[]) | undefined;
}

function unavailable(q: GameWeatherQuery, leadTimeHours: number, api: string | null, note: string): WeatherFeatures {
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
    provenance: { api, leadTimeHours, note },
  };
}

/**
 * Strict as-of weather for one game via the previous-runs API. Same contract
 * as the vendored `getAsOfGameWeather`: throws only on a genuine leak (asOf
 * after kickoff) or malformed dates; everything else degrades to an honest
 * `available:false`. Indoor sites neutralize identically.
 */
export async function getAsOfGameWeatherPreviousRuns(q: GameWeatherQuery, deps: WeatherDeps): Promise<WeatherFeatures> {
  const kickoff = new Date(q.kickoffUtc);
  const asOf = new Date(q.asOfUtc);
  if (Number.isNaN(kickoff.getTime())) throw new Error(`Invalid ISO datetime: ${q.kickoffUtc}`);
  if (Number.isNaN(asOf.getTime())) throw new Error(`Invalid ISO datetime: ${q.asOfUtc}`);
  if (asOf.getTime() > kickoff.getTime()) {
    throw new Error(
      `Leak guard: asOfUtc (${q.asOfUtc}) is AFTER kickoffUtc (${q.kickoffUtc}). A pick cannot be frozen after kickoff.`,
    );
  }
  // Exact (unrounded) lead in hours — feeds previousDayN's ceil() below.
  // Rounding here FIRST would be a real leak: e.g. a 24.4h exact lead rounds
  // to 24h, and ceil(24/24)=1 would select _previous_day1 (a run initialized
  // ~24h before the valid hour, i.e. AFTER the true 24.4h-earlier freeze
  // instant) — exactly the lookahead this module exists to prevent.
  // `leadTimeHours` (rounded) is kept ONLY for human-readable provenance.
  const exactLeadHours = (kickoff.getTime() - asOf.getTime()) / 3600_000;
  const leadTimeHours = Math.round(exactLeadHours);

  if (q.site.isIndoor) {
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

  const n = previousDayN(exactLeadHours);
  const api = "open-meteo/previous-runs";
  if (n === null) {
    return unavailable(
      q,
      leadTimeHours,
      api,
      `Lead time ${leadTimeHours}h exceeds the previous-runs window (${MAX_PREVIOUS_DAYS}d) — honest unavailable, never a leaky smaller run.`,
    );
  }

  let hourly: PreviousRunsHourly | undefined;
  try {
    const resp = (await deps.fetchJson(buildPreviousRunsUrl(q.site, kickoff, n))) as { hourly?: PreviousRunsHourly };
    hourly = resp?.hourly;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return unavailable(q, leadTimeHours, api, `Upstream fetch failed (${msg}); honest unavailable, not a zero.`);
  }

  const hourBucket = __internals.utcHourBucket(kickoff);
  const time = hourly?.time;
  if (!hourly || !Array.isArray(time)) {
    return unavailable(q, leadTimeHours, api, "No hourly.time array in the previous-runs response.");
  }
  const i = time.findIndex((t) => t === hourBucket || t.startsWith(hourBucket));
  if (i < 0) {
    return unavailable(q, leadTimeHours, api, `No hourly row for ${hourBucket} in the previous-runs response.`);
  }

  const at = (base: (typeof BASE_VARS)[number]): number | null => {
    const arr = hourly?.[`${base}_previous_day${n}`];
    const v = Array.isArray(arr) && i < arr.length ? arr[i] : null;
    return typeof v === "number" && Number.isFinite(v) ? v : null;
  };

  const fields = {
    tempF: at("temperature_2m"),
    precipInch: at("precipitation"),
    precipProbPct: at("precipitation_probability"),
    windMph: at("wind_speed_10m"),
    windGustMph: at("wind_gusts_10m"),
    windDirDeg: at("wind_direction_10m"),
  };

  return {
    available: true,
    indoor: false,
    source: "historical-forecast",
    asOfUtc: q.asOfUtc,
    kickoffUtc: q.kickoffUtc,
    forecastValidHourUtc: hourBucket,
    tempF: fields.tempF,
    windMph: fields.windMph,
    windGustMph: fields.windGustMph,
    windDirDeg: fields.windDirDeg,
    precipInch: fields.precipInch,
    precipProbPct: fields.precipProbPct,
    candidateSignals: __internals.candidateSignals(fields),
    provenance: {
      api,
      leadTimeHours,
      note: `Strict as-of backtest path: previous-runs forecast run _previous_day${n} for the kickoff hour (N = max(1, ceil(${leadTimeHours}h / 24)) — conservative toward an older run), issued <= asOfUtc by construction. Live-verified distinct-run capability per DEC-023's smoke.`,
    },
  };
}
