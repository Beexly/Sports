/**
 * C-414 — kickoff-hour weather as ONE shared feature field for totals (A5)
 * and props (A25 / the C-358 prop-sample-reader feature path).
 *
 * GAP THIS CLOSES
 * Today three weather shapes exist and none of them is the field a game row
 * actually carries:
 *   - `features/nfl-weather.ts` builds leak-free EvalRows from a
 *     caller-supplied `GameWeatherForecast` map (nothing in-repo fills it).
 *   - `apps/web/lib/weather/game-weather.ts` fetches CURRENT NWS conditions
 *     per outdoor stadium for the public /weather page — not kickoff-hour,
 *     not joined to a game id.
 *   - games.csv historically carries `temp` / `wind` / `roof` (the plan's
 *     §2.2 data table; A5 and A25 name those columns) and
 *     `loaders/nfl-games.ts` currently drops them.
 *
 * This module is the pure join: every NFL game row gets one null-safe
 * `KickoffWeatherField` (wind mph, temp °F, precip, roof/dome) sourced either
 * from historical games.csv or from a live pre-kickoff forecast. A5 and A25
 * read the SAME type; the future C-358 reader imports this join instead of
 * inventing a fourth weather shape.
 *
 * REFRESH WINDOWS (the T-6h / T-1h contract)
 * Live weather is only trustworthy for a kickoff inside
 * `[T-6h, kickoff)`. Outside that window `shouldRefreshLiveWeather` is false
 * and the join leaves the field null (honest gap) rather than stamping a
 * stale or far-future forecast. Inside the window a refresh is due whenever
 * the stored asOf is older than the fresher of the two named ticks (T-6h
 * initial, then T-1h refresh) — see `liveWeatherRefreshDue`.
 *
 * LEAK POSTURE
 * A live forecast carries its own `asOf` (when the forecast was issued).
 * The join never invents an asOf. Downstream leak gates
 * (`nfl-weather.ts` decision cutoff, `props-context-bind.ts`) read that
 * instant and drop late forecasts themselves; this module only refuses to
 * attach weather outside the refresh window.
 *
 * Pure. No I/O, no clock, no DB, no MODEL_VERSION.
 */

import type { GameRow } from "./game-row.js";

/** One kickoff-hour weather observation attached to a game. */
export interface KickoffWeatherField {
  readonly gameId: string;
  /** Kickoff-hour sustained wind, mph. null when unknown — never 0 as a default. */
  readonly windMph: number | null;
  /** Kickoff-hour temperature, °F. null when unknown. */
  readonly tempF: number | null;
  /**
   * Precipitation at kickoff. Historical games.csv has no precip column, so
   * the games_csv source leaves this null; live sources may fill it (percent
   * chance or mm — see `precipKind`).
   */
  readonly precip: number | null;
  readonly precipKind: "prob_pct" | "mm" | null;
  /**
   * games.csv `roof`: open | closed | retractable | (blank). Live outdoor
   * venues map to "open"; live domes are out of scope for the NWS outdoor
   * list and stay null rather than being guessed closed.
   */
  readonly roof: string | null;
  /** True when the venue is known to be a dome/closed roof. */
  readonly isDome: boolean;
  /** When this observation became knowable (forecast issue / capture time). */
  readonly asOf: string;
  readonly source: "games_csv" | "nws_live" | "open_meteo" | "other_live";
}

/** T-6h: earliest instant a live kickoff forecast is attached. */
export const LIVE_WEATHER_WINDOW_START_MS = 6 * 60 * 60 * 1000;
/** T-1h: the late refresh that supersedes the T-6h first pass. */
export const LIVE_WEATHER_REFRESH_MS = 1 * 60 * 60 * 1000;

export type LiveRefreshPhase = "t-6h" | "t-1h";

/**
 * Is this kickoff inside the live-weather window?
 * True when 0 < (kickoff − now) ≤ 6h. Kickoffs in the past or more than six
 * hours out are OUT — the join leaves those fields null.
 */
export function shouldRefreshLiveWeather(kickoffIso: string, nowMs: number): boolean {
  const kickoffMs = Date.parse(kickoffIso);
  if (!Number.isFinite(kickoffMs)) return false;
  const lead = kickoffMs - nowMs;
  return lead > 0 && lead <= LIVE_WEATHER_WINDOW_START_MS;
}

/**
 * Which named refresh tick a capture at `nowMs` corresponds to, or null when
 * the kickoff is outside the window.
 */
export function liveWeatherRefreshPhase(kickoffIso: string, nowMs: number): LiveRefreshPhase | null {
  if (!shouldRefreshLiveWeather(kickoffIso, nowMs)) return null;
  const kickoffMs = Date.parse(kickoffIso);
  const lead = kickoffMs - nowMs;
  return lead <= LIVE_WEATHER_REFRESH_MS ? "t-1h" : "t-6h";
}

/**
 * A live refresh is due when the kickoff is in the window AND either there is
 * no stored observation yet, or the stored one is older than the phase tick
 * it should have been captured at (T-6h first, T-1h late).
 */
export function liveWeatherRefreshDue(args: {
  readonly kickoffIso: string;
  readonly nowMs: number;
  readonly storedAsOfIso: string | null;
}): boolean {
  const kickoffMs = Date.parse(args.kickoffIso);
  if (!Number.isFinite(kickoffMs)) return false;
  if (!shouldRefreshLiveWeather(args.kickoffIso, args.nowMs)) return false;
  if (args.storedAsOfIso === null) return true;
  const storedMs = Date.parse(args.storedAsOfIso);
  if (!Number.isFinite(storedMs)) return true;
  const lead = kickoffMs - args.nowMs;
  // Phase tick = the start of the window the capture belongs to.
  // Inside (T-1h, kickoff]: the T-1h tick. Inside (T-6h, T-1h]: the T-6h tick.
  const tickMs = lead <= LIVE_WEATHER_REFRESH_MS
    ? kickoffMs - LIVE_WEATHER_REFRESH_MS
    : kickoffMs - LIVE_WEATHER_WINDOW_START_MS;
  return storedMs < tickMs;
}

// ── historical games.csv ────────────────────────────────────────────────────

/** games.csv weather columns (Lee Sharpe / nfldata). All may be blank. */
export interface GamesCsvWeatherRow {
  readonly game_id?: string;
  readonly temp?: string;
  readonly wind?: string;
  readonly roof?: string;
}

function parseCsvNumber(value: string | undefined): number | null {
  if (value === undefined) return null;
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function normalizeRoof(raw: string | null): { roof: string | null; isDome: boolean } {
  if (raw === null) return { roof: null, isDome: false };
  const r = raw.trim().toLowerCase();
  if (r === "") return { roof: null, isDome: false };
  // games.csv roof vocabulary: open / closed / retractable (nflreadr docs).
  const isDome = r === "closed" || r === "dome";
  return { roof: r, isDome };
}

/**
 * Map one games.csv record onto the shared kickoff weather field.
 * Blank/missing columns stay null — the join never fabricates a neutral.
 * Historical precip is null (games.csv has no precip column).
 */
export function kickoffWeatherFromGamesCsv(
  row: GamesCsvWeatherRow,
  asOfIso: string,
): KickoffWeatherField | null {
  const gameId = row.game_id?.trim();
  if (!gameId) return null;
  const { roof, isDome } = normalizeRoof(row.roof ?? null);
  return {
    gameId,
    windMph: parseCsvNumber(row.wind),
    tempF: parseCsvNumber(row.temp),
    precip: null,
    precipKind: null,
    roof,
    isDome,
    asOf: asOfIso,
    source: "games_csv",
  };
}

/**
 * Build a gameId → field map from games.csv weather columns.
 * Duplicate game_ids keep the LAST row (matches "last write wins" loaders).
 */
export function weatherFieldMapFromGamesCsv(
  rows: readonly GamesCsvWeatherRow[],
  asOfIso: string,
): Map<string, KickoffWeatherField> {
  const map = new Map<string, KickoffWeatherField>();
  for (const row of rows) {
    const field = kickoffWeatherFromGamesCsv(row, asOfIso);
    if (field !== null) map.set(field.gameId, field);
  }
  return map;
}

// ── live join ───────────────────────────────────────────────────────────────

/**
 * Minimal live-forecast shape the join accepts. Compatible with
 * `apps/web/lib/weather/game-weather.ts` `VenueWeather` (windMph/tempF/
 * precipPct/observedFor) and with `features/nfl-weather.ts`
 * `GameWeatherForecast` (windMph/tempF/precipProbPct/forecastIssuedAt).
 * Callers adapt whichever loader they use onto this shape.
 */
export interface LiveWeatherObservation {
  readonly windMph: number | null;
  readonly tempF: number | null;
  /** Precip probability (0–100) OR mm; identified by `precipKind`. */
  readonly precip: number | null;
  readonly precipKind: "prob_pct" | "mm";
  /** When the forecast was issued / observed. */
  readonly asOf: string;
  readonly source?: "nws_live" | "open_meteo" | "other_live";
  /** Optional roof hint; live outdoor lists should pass "open". */
  readonly roof?: string | null;
}

export interface LiveJoinInput {
  readonly games: readonly Pick<GameRow, "gameId" | "startTime">[];
  /**
   * Venue/team key → live observation. The join keys each game by BOTH
   * `gameId` and the observation map's key so a stadium-keyed NWS board
   * (`venueByGame`) or a gameId-keyed forecast map both work.
   */
  readonly observationByGameId?: ReadonlyMap<string, LiveWeatherObservation>;
  readonly observationByVenue?: ReadonlyMap<string, LiveWeatherObservation>;
  /** gameId → venue/team key used with `observationByVenue`. */
  readonly venueKeyByGameId?: ReadonlyMap<string, string>;
  readonly nowMs: number;
}

export interface LiveJoinResult {
  /** gameId → field, only for games inside the window that had an observation. */
  readonly fields: ReadonlyMap<string, KickoffWeatherField>;
  readonly coverage: WeatherSlateCoverage;
}

/**
 * Null-safe live join. Games outside the T-6h window, games with no
 * observation, and observations with a non-finite asOf are counted, never
 * dropped silently and never imputed.
 */
export function joinLiveWeatherToGames(input: LiveJoinInput): LiveJoinResult {
  const fields = new Map<string, KickoffWeatherField>();
  let totalGames = 0;
  let inWindow = 0;
  let joined = 0;
  let dome = 0;
  let outdoorComplete = 0;
  let outdoorPartial = 0;
  let missingObservation = 0;
  let outsideWindow = 0;

  for (const game of input.games) {
    totalGames += 1;
    const kickoffMs = Date.parse(game.startTime);
    if (!Number.isFinite(kickoffMs) || !shouldRefreshLiveWeather(game.startTime, input.nowMs)) {
      outsideWindow += 1;
      continue;
    }
    inWindow += 1;

    const obs =
      input.observationByGameId?.get(game.gameId) ??
      (input.venueKeyByGameId && input.observationByVenue
        ? input.observationByVenue.get(input.venueKeyByGameId.get(game.gameId) ?? "")
        : undefined);

    if (!obs) {
      missingObservation += 1;
      continue;
    }
    const asOfMs = Date.parse(obs.asOf);
    if (!Number.isFinite(asOfMs)) {
      missingObservation += 1;
      continue;
    }

    const roofRaw = obs.roof ?? null;
    const roof = roofRaw === null ? "open" : roofRaw.trim().toLowerCase() || "open";
    const isDome = roof === "closed" || roof === "dome";
    const field: KickoffWeatherField = {
      gameId: game.gameId,
      windMph: obs.windMph,
      tempF: obs.tempF,
      precip: obs.precip,
      precipKind: obs.precipKind,
      roof,
      isDome,
      asOf: new Date(asOfMs).toISOString(),
      source: obs.source ?? "nws_live",
    };

    fields.set(game.gameId, field);
    joined += 1;
    if (field.isDome) {
      dome += 1;
    } else if (field.windMph !== null && field.tempF !== null) {
      outdoorComplete += 1;
    } else {
      outdoorPartial += 1;
    }
  }

  return {
    fields,
    coverage: {
      totalGames,
      inWindow,
      joined,
      missing: missingObservation,
      outsideWindow,
      dome,
      outdoorComplete,
      outdoorPartial,
      bySource: countSources(fields),
    },
  };
}

// ── shared join over a pre-built field map (historical or live) ─────────────

export interface WeatherJoinResult {
  /** gameId → field. Missing games are simply absent (null-safe). */
  readonly byGameId: ReadonlyMap<string, KickoffWeatherField>;
  readonly coverage: WeatherSlateCoverage;
}

/**
 * Join a pre-built field map onto a slate of games and compute coverage.
 * Null-safe: a game with no field is counted `missing`, never defaulted.
 */
export function joinWeatherToSlate(args: {
  readonly games: readonly Pick<GameRow, "gameId" | "startTime">[];
  readonly fieldByGameId: ReadonlyMap<string, KickoffWeatherField>;
  readonly nowMs?: number;
}): WeatherJoinResult {
  const byGameId = new Map<string, KickoffWeatherField>();
  let totalGames = 0;
  let inWindow = 0;
  let joined = 0;
  let dome = 0;
  let outdoorComplete = 0;
  let outdoorPartial = 0;
  let missing = 0;
  let outsideWindow = 0;

  for (const game of args.games) {
    totalGames += 1;
    if (args.nowMs !== undefined) {
      if (!shouldRefreshLiveWeather(game.startTime, args.nowMs)) {
        outsideWindow += 1;
        // Still join historical fields if present — only live is window-gated.
        const hist = args.fieldByGameId.get(game.gameId);
        if (hist && hist.source === "games_csv") {
          byGameId.set(game.gameId, hist);
          joined += 1;
          tally(hist);
        } else {
          missing += 1;
        }
        continue;
      }
      inWindow += 1;
    }
    const field = args.fieldByGameId.get(game.gameId);
    if (!field) {
      missing += 1;
      continue;
    }
    byGameId.set(game.gameId, field);
    joined += 1;
    tally(field);
  }

  function tally(field: KickoffWeatherField): void {
    if (field.isDome) {
      dome += 1;
    } else if (field.windMph !== null && field.tempF !== null) {
      outdoorComplete += 1;
    } else {
      outdoorPartial += 1;
    }
  }

  return {
    byGameId,
    coverage: {
      totalGames,
      inWindow,
      joined,
      missing,
      outsideWindow,
      dome,
      outdoorComplete,
      outdoorPartial,
      bySource: countSources(byGameId),
    },
  };
}

// ── coverage ────────────────────────────────────────────────────────────────

/**
 * Per-slate coverage counters. `logs coverage per slate` (C-414 DoD) — the
 * caller logs `coverage`; this struct is what it logs. Honest denominators:
 * every game in the slate appears in exactly one of joined / missing /
 * outsideWindow.
 */
export interface WeatherSlateCoverage {
  readonly totalGames: number;
  /** Kickoffs inside the T-6h live window (0 when nowMs is omitted). */
  readonly inWindow: number;
  readonly joined: number;
  /** In-window (or unwindowed) games with no usable field. */
  readonly missing: number;
  /** Kickoffs outside the live window (0 when nowMs is omitted). */
  readonly outsideWindow: number;
  readonly dome: number;
  /** Outdoor games with wind AND temp present. */
  readonly outdoorComplete: number;
  /** Outdoor games joined but missing wind or temp (still null-safe). */
  readonly outdoorPartial: number;
  readonly bySource: Readonly<Record<string, number>>;
}

export function countSources(
  fields: ReadonlyMap<string, KickoffWeatherField>,
): Record<string, number> {
  const bySource: Record<string, number> = {};
  for (const f of fields.values()) {
    bySource[f.source] = (bySource[f.source] ?? 0) + 1;
  }
  return bySource;
}

/**
 * One-line coverage log for a slate. Never invents a rate — always prints
 * the raw n/N the DoD asks for.
 */
export function formatWeatherCoverageLog(coverage: WeatherSlateCoverage): string {
  const sources = Object.entries(coverage.bySource)
    .map(([k, v]) => `${k}=${v}`)
    .join(" ");
  return (
    `weather-coverage games=${coverage.totalGames} joined=${coverage.joined} ` +
    `missing=${coverage.missing} outsideWindow=${coverage.outsideWindow} ` +
    `inWindow=${coverage.inWindow} dome=${coverage.dome} ` +
    `outdoorComplete=${coverage.outdoorComplete} outdoorPartial=${coverage.outdoorPartial}` +
    (sources ? ` sources{${sources}}` : "")
  );
}

// ── adapter: VenueWeather (apps/web NWS) → LiveWeatherObservation ───────────

/**
 * Structural adapter for `apps/web/lib/weather/game-weather.ts` VenueWeather.
 * Declared here as a structural type so prediction-engine does not import
 * from apps/web (package boundary).
 */
export interface VenueWeatherLike {
  readonly windMph: number | null;
  readonly tempF: number | null;
  readonly precipPct: number | null;
  readonly observedFor: string | null;
  readonly status: "ok" | "error";
}

export function liveObservationFromVenueWeather(
  venue: VenueWeatherLike,
  fallbackAsOfIso: string,
): LiveWeatherObservation | null {
  if (venue.status !== "ok") return null;
  const asOf = venue.observedFor ?? fallbackAsOfIso;
  if (!Number.isFinite(Date.parse(asOf))) return null;
  return {
    windMph: venue.windMph,
    tempF: venue.tempF,
    precip: venue.precipPct,
    precipKind: "prob_pct",
    asOf: new Date(Date.parse(asOf)).toISOString(),
    source: "nws_live",
    roof: "open",
  };
}
