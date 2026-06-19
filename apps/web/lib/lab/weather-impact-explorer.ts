/**
 * Galaxy Lab — Weather Impact Explorer engine.
 *
 * Surfaces the previously-DORMANT weather MODELING libraries
 * (`@/lib/sports/weather-impact` and `@/lib/sports/weather-analytics`) through a
 * validated, user-driven tool. This is an INTERACTIVE MODEL EXPLORER: the user
 * supplies game-day conditions (sport, temperature, wind speed + direction,
 * precipitation, humidity, snow, stadium type) and the tool returns the modeled
 * impact on scoring/totals — overall impact level + score, a wind/temp/precip
 * component breakdown, a total/scoring adjustment, the football passing-game
 * impact, the MLB ballpark wind in/out read, and a plain-language summary line.
 *
 * The two libraries deliberately use DIFFERENT `WeatherConditions` shapes:
 *   - `weather-impact`   → { tempF, windSpeedMph, precipitationInch, humidity, isIndoor, … }
 *   - `weather-analytics`→ { temperatureF, windSpeedMph, windDirectionDeg, precipitationInches, humidity, … }
 * We validate ONE typed input and map it explicitly into each lib's shape; we
 * never assume the shapes are identical.
 *
 * Honesty / responsible-gaming posture: every output is an educational model
 * exploration of the conditions YOU entered — NOT a published pick, prediction,
 * or performance claim. It models only weather; it excludes real injury,
 * availability, and roster data. The disclaimer travels with the result. Pure
 * compute, deterministic (closed-form), no DB, no secrets, no network, no side
 * effects.
 */

import {
  overallWeatherImpact,
  windImpact,
  temperatureImpact,
  precipitationImpact,
  passingGameImpactScore,
  totalAdjustment,
  isHighImpactGame,
  weatherSummaryLine,
  effectiveTemp,
  type WeatherConditions as ImpactConditions,
  type WeatherImpact as ImpactResult,
  type WeatherImpactLevel,
  type SportType,
} from "@/lib/sports/weather-impact";
import {
  nflWeatherImpact,
  mlbWindImpact,
  windComponentsAtBallpark,
  stadiumWindAngle,
  beaufortScale,
  snowImpact,
  precipSeverity,
  apparentTemperature,
  dewPoint,
  type WeatherConditions as AnalyticsConditions,
  type StadiumType,
  type WindDirection,
} from "@/lib/sports/weather-analytics";

// ── Public types ─────────────────────────────────────────────────────────────

/**
 * Sports this tool can model honestly. Restricted to the sports the underlying
 * libraries actually model with weather: football (NFL / NCAAF, played outdoors)
 * and baseball (MLB). The libs have no weather model for indoor sports, so we
 * never offer them.
 */
export type WeatherSport = "nfl" | "ncaaf" | "mlb";

const VALID_SPORTS: readonly WeatherSport[] = ["nfl", "ncaaf", "mlb"];
const VALID_STADIUMS: readonly StadiumType[] = ["outdoor", "dome", "retractable"];

/** The validated, normalized user input the engine consumes. */
export interface WeatherImpactInput {
  sport: WeatherSport;
  /** Air temperature, °F. */
  tempF: number;
  /** Sustained wind speed, mph. */
  windSpeedMph: number;
  /** Wind direction in degrees (0=N, 90=E, 180=S, 270=W). MLB-relevant. */
  windDirectionDeg: number;
  /** Liquid precipitation rate, inches per hour (0 = none). */
  precipitationInch: number;
  /** Snow accumulation, inches (0 = none). */
  snowInch: number;
  /** Relative humidity, 0–100. */
  humidity: number;
  /** Venue type. dome / retractable (closed) → no weather impact. */
  stadiumType: StadiumType;
  /**
   * MLB only: home-plate-to-center-field orientation in degrees, used to resolve
   * whether the wind blows in or out. Ignored for football.
   */
  ballparkOrientationDeg: number;
}

/** A single weather component's modeled contribution. */
export interface WeatherComponent {
  level: WeatherImpactLevel;
  score: number;
  description: string;
}

/** Football-specific modeled detail (present only for nfl / ncaaf). */
export interface FootballDetail {
  /** Combined 0–100 impact on the passing game (wind + precip). */
  passingImpactScore: number;
  /** nflWeatherImpact severity for the conditions. */
  severity: "none" | "minimal" | "moderate" | "significant" | "severe";
  /** Modeled passing yardage impact, -100..0 (more negative = worse). */
  passingImpact: number;
  /** Modeled rushing impact, -50..+25. */
  rushingImpact: number;
  /** Modeled kicking impact (negative = worse). */
  kickingImpact: number;
  /** Net scoring impact as a percentage (negative = suppressed scoring). */
  scoringImpactPct: number;
  /** Beaufort-scale reading for the wind speed. */
  beaufort: { force: number; description: string };
  /** Modeling notes from the football weather model. */
  notes: readonly string[];
}

/** MLB-specific modeled detail (present only for mlb). */
export interface BaseballDetail {
  /** Wind classification relative to the ballpark: in / out / crosswind. */
  windDirection: WindDirection;
  /** Headwind component, mph (positive = blowing in toward the plate). */
  headwindMph: number;
  /** Crosswind component, mph. */
  crosswindMph: number;
  /** Totals lean the wind implies: over (blowing out) / under (in) / neutral. */
  windEdge: "over" | "under" | "neutral";
  /** Estimated home-run % change from the wind. */
  hrBoostPct: number;
  /** Estimated run % change from the wind. */
  runBoostPct: number;
  /** Beaufort-scale reading for the wind speed. */
  beaufort: { force: number; description: string };
}

export interface WeatherImpactOutput {
  sport: WeatherSport;
  stadiumType: StadiumType;
  /** True when the venue is closed (dome / retractable) — weather is neutralized. */
  indoor: boolean;
  /** Overall modeled impact level + 0–100 score. */
  level: WeatherImpactLevel;
  score: number;
  /** Whether the modeled conditions lean the total over / under / neither. */
  favorsBetting: ImpactResult["favorsBetting"];
  /** True when overall impact is high/severe at an outdoor venue. */
  highImpact: boolean;
  /** Component breakdown. */
  wind: WeatherComponent;
  temperature: WeatherComponent;
  precipitation: WeatherComponent;
  /** Perceived temperature (wind chill / heat index), °F. */
  effectiveTempF: number;
  /** Apparent temperature from the analytics lib, °F. */
  apparentTempF: number;
  /** Dew point, °F. */
  dewPointF: number;
  /** Field-footing read from snow accumulation. */
  footing: { fieldConditions: "normal" | "poor" | "very_poor"; multiplier: number };
  /** Precip severity bucket. */
  precipSeverity: "none" | "light" | "moderate" | "heavy";
  /**
   * Total adjustment frame. `baseline` is a neutral reference total the tool
   * adjusts purely so the direction + magnitude of the weather effect is
   * legible; `adjusted` and `delta` are the modeled shift on that reference. It
   * is NOT a line on any real game.
   */
  total: { baseline: number; adjusted: number; delta: number };
  /** One-line human summary of the entered conditions. */
  summaryLine: string;
  /** Plain-language modeling notes. */
  factorNotes: string[];
  football: FootballDetail | null;
  baseball: BaseballDetail | null;
  disclaimer: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

export const WEATHER_MIN_TEMP_F = -60;
export const WEATHER_MAX_TEMP_F = 140;
export const WEATHER_MAX_WIND_MPH = 120;
export const WEATHER_MAX_PRECIP_INCH = 5;
export const WEATHER_MAX_SNOW_INCH = 36;

/**
 * Neutral reference totals (per sport) the tool adjusts to make the weather's
 * direction + size legible. These are illustrative reference points, NOT lines
 * on any real game.
 */
const REFERENCE_TOTAL: Record<WeatherSport, number> = {
  nfl: 44.5,
  ncaaf: 52.5,
  mlb: 8.5,
};

export const WEATHER_IMPACT_DISCLAIMER =
  "Educational model exploration of the weather conditions YOU entered — not a " +
  "published pick, prediction, or performance claim. It models weather only and " +
  "excludes real injury, availability, and roster data; the reference total is " +
  "an illustrative anchor, not a line on any real game. Gambling involves risk — " +
  "never wager more than you can afford to lose. (1-800-GAMBLER)";

// ── Validation helpers ─────────────────────────────────────────────────────────

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function readNumber(source: Record<string, unknown>, key: string): number | null {
  const v = source[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function readSport(source: Record<string, unknown>): WeatherSport | null {
  const v = source["sport"];
  if (typeof v !== "string") return null;
  const lower = v.trim().toLowerCase();
  return VALID_SPORTS.find((s) => s === lower) ?? null;
}

function readStadium(source: Record<string, unknown>): StadiumType {
  const v = source["stadiumType"];
  if (typeof v === "string") {
    const lower = v.trim().toLowerCase();
    const found = VALID_STADIUMS.find((s) => s === lower);
    if (found) return found;
  }
  // Default to outdoor — the only venue where weather has any effect.
  return "outdoor";
}

/** Round to a sensible number of decimals without trailing-float noise. */
function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

// ── Validation ─────────────────────────────────────────────────────────────────

/**
 * Validate and normalize an untrusted request body into a WeatherImpactInput.
 * Returns `{ error }` on a fatal validation problem.
 *
 * Required: a supported `sport` and a numeric `tempF`. Wind, precip, snow,
 * humidity, direction, and orientation default sensibly when omitted so the
 * tool always produces a coherent result.
 */
export function validateWeatherImpactInput(
  raw: unknown,
): WeatherImpactInput | { error: string } {
  if (typeof raw !== "object" || raw === null) {
    return { error: "Request body must be a JSON object." };
  }
  const src = raw as Record<string, unknown>;

  const sport = readSport(src);
  if (sport === null) {
    return { error: "sport is required and must be one of nfl, ncaaf, mlb." };
  }

  const tempF = readNumber(src, "tempF");
  if (tempF === null) {
    return { error: "tempF is required and must be a number (°F)." };
  }

  const windSpeedMph = readNumber(src, "windSpeedMph");
  const windDirectionDeg = readNumber(src, "windDirectionDeg");
  const precipitationInch = readNumber(src, "precipitationInch");
  const snowInch = readNumber(src, "snowInch");
  const humidity = readNumber(src, "humidity");
  const ballparkOrientationDeg = readNumber(src, "ballparkOrientationDeg");

  return {
    sport,
    tempF: clampNumber(tempF, WEATHER_MIN_TEMP_F, WEATHER_MAX_TEMP_F),
    windSpeedMph:
      windSpeedMph === null ? 0 : clampNumber(windSpeedMph, 0, WEATHER_MAX_WIND_MPH),
    // Wind direction wraps to [0, 360).
    windDirectionDeg:
      windDirectionDeg === null
        ? 0
        : ((windDirectionDeg % 360) + 360) % 360,
    precipitationInch:
      precipitationInch === null
        ? 0
        : clampNumber(precipitationInch, 0, WEATHER_MAX_PRECIP_INCH),
    snowInch: snowInch === null ? 0 : clampNumber(snowInch, 0, WEATHER_MAX_SNOW_INCH),
    humidity: humidity === null ? 50 : clampNumber(humidity, 0, 100),
    stadiumType: readStadium(src),
    ballparkOrientationDeg:
      ballparkOrientationDeg === null
        ? 0
        : ((ballparkOrientationDeg % 360) + 360) % 360,
  };
}

// ── Shape mapping ──────────────────────────────────────────────────────────────

/** A closed venue (dome / retractable) neutralizes weather in both libs. */
function isIndoorVenue(stadium: StadiumType): boolean {
  return stadium === "dome" || stadium === "retractable";
}

/** weather-impact.ts WeatherConditions shape. */
function toImpactConditions(input: WeatherImpactInput): ImpactConditions {
  return {
    tempF: input.tempF,
    windSpeedMph: input.windSpeedMph,
    precipitationInch: input.precipitationInch,
    snowInch: input.snowInch,
    humidity: input.humidity,
    isIndoor: isIndoorVenue(input.stadiumType),
  };
}

/** weather-analytics.ts WeatherConditions shape (note the different field names). */
function toAnalyticsConditions(input: WeatherImpactInput): AnalyticsConditions {
  return {
    temperatureF: input.tempF,
    windSpeedMph: input.windSpeedMph,
    windDirectionDeg: input.windDirectionDeg,
    precipitationInches: input.precipitationInch,
    humidity: input.humidity,
    snowInches: input.snowInch,
  };
}

/** Map a supported sport to the weather-impact.ts SportType. */
function toImpactSport(sport: WeatherSport): SportType {
  // weather-impact.ts models nfl / ncaaf / mlb directly.
  return sport;
}

// ── Engine ───────────────────────────────────────────────────────────────────

/**
 * Run the weather impact exploration and assemble an honest, complete result.
 * Pure and deterministic: identical input always yields identical output.
 */
export function runWeatherImpactExplorer(
  input: WeatherImpactInput,
): WeatherImpactOutput {
  const impactConditions = toImpactConditions(input);
  const analyticsConditions = toAnalyticsConditions(input);
  const indoor = isIndoorVenue(input.stadiumType);

  // Overall, component, and total reads from weather-impact.ts.
  const overall = overallWeatherImpact(
    impactConditions,
    toImpactSport(input.sport),
  );
  const wind = windImpact(input.windSpeedMph);
  const temp = temperatureImpact(input.tempF);
  const precip = precipitationImpact(input.precipitationInch, input.snowInch);
  const highImpact = isHighImpactGame(
    impactConditions,
    toImpactSport(input.sport),
  );
  const summaryLine = weatherSummaryLine(impactConditions);
  const effectiveTempF = round(effectiveTemp(impactConditions), 1);

  // Cross-checks / extras from weather-analytics.ts.
  const apparentTempF = round(
    apparentTemperature(input.tempF, input.windSpeedMph, input.humidity),
    1,
  );
  const dewPointF = round(dewPoint(input.tempF, input.humidity), 1);
  const footingRaw = snowImpact(input.snowInch);
  const precipBucket = precipSeverity(input.precipitationInch);

  // Total frame: anchor a neutral reference total and let weather-impact.ts'
  // totalAdjustment move it. Indoor venues neutralize the move (score 0).
  const baseline = REFERENCE_TOTAL[input.sport];
  const adjusted = totalAdjustment(overall, baseline);
  const total = {
    baseline,
    adjusted,
    delta: round(adjusted - baseline, 2),
  };

  let football: FootballDetail | null = null;
  let baseball: BaseballDetail | null = null;

  if (input.sport === "nfl" || input.sport === "ncaaf") {
    // The analytics lib models football weather under the nfl model; NCAAF is
    // played under the same physics, so route NCAAF through it as well.
    const nfl = nflWeatherImpact(analyticsConditions, input.stadiumType);
    const passingImpactScore = round(
      passingGameImpactScore(input.windSpeedMph, input.precipitationInch),
      1,
    );
    football = {
      passingImpactScore,
      severity: nfl.severity,
      passingImpact: nfl.passingImpact,
      rushingImpact: nfl.rushingImpact,
      kickingImpact: nfl.kickingImpact,
      scoringImpactPct: nfl.scoringImpact,
      beaufort: beaufortScale(input.windSpeedMph),
      notes: nfl.notes,
    };
  } else {
    // MLB: resolve the wind relative to the ballpark orientation.
    if (indoor) {
      baseball = {
        windDirection: "crosswind",
        headwindMph: 0,
        crosswindMph: 0,
        windEdge: "neutral",
        hrBoostPct: 0,
        runBoostPct: 0,
        beaufort: beaufortScale(0),
      };
    } else {
      const components = windComponentsAtBallpark(
        input.windDirectionDeg,
        input.ballparkOrientationDeg,
        input.windSpeedMph,
      );
      const direction = stadiumWindAngle(
        input.windDirectionDeg,
        input.ballparkOrientationDeg,
      );
      const mlb = mlbWindImpact(analyticsConditions, input.ballparkOrientationDeg);
      baseball = {
        windDirection: direction,
        headwindMph: round(components.headwind, 1),
        crosswindMph: round(components.crosswind, 1),
        windEdge: mlb.bettingEdge,
        hrBoostPct: mlb.hrBoost,
        runBoostPct: mlb.runBoost,
        beaufort: beaufortScale(input.windSpeedMph),
      };
    }
  }

  const factorNotes = buildFactorNotes(
    input,
    indoor,
    overall,
    footingRaw,
    total,
    football,
    baseball,
  );

  return {
    sport: input.sport,
    stadiumType: input.stadiumType,
    indoor,
    level: overall.level,
    score: overall.score,
    favorsBetting: overall.favorsBetting,
    highImpact,
    wind: { level: wind.level, score: wind.score, description: wind.description || "Calm" },
    temperature: {
      level: temp.level,
      score: temp.score,
      description: temp.description || "Comfortable",
    },
    precipitation: {
      level: precip.level,
      score: precip.score,
      description: precip.description || "Dry",
    },
    effectiveTempF,
    apparentTempF,
    dewPointF,
    footing: {
      fieldConditions: footingRaw.fieldConditions,
      multiplier: footingRaw.footing,
    },
    precipSeverity: precipBucket,
    total,
    summaryLine,
    factorNotes,
    football,
    baseball,
    disclaimer: WEATHER_IMPACT_DISCLAIMER,
  };
}

function buildFactorNotes(
  input: WeatherImpactInput,
  indoor: boolean,
  overall: ImpactResult,
  footing: ReturnType<typeof snowImpact>,
  total: { baseline: number; adjusted: number; delta: number },
  football: FootballDetail | null,
  baseball: BaseballDetail | null,
): string[] {
  const notes: string[] = [];

  if (indoor) {
    notes.push(
      "Closed venue — the model neutralizes weather, so there is no scoring effect.",
    );
    return notes;
  }

  // Overall direction.
  if (overall.score === 0) {
    notes.push("Clear conditions — the model sees no meaningful weather effect.");
  } else if (overall.favorsBetting === "under") {
    notes.push(
      `Modeled conditions lean the total DOWN (impact score ${overall.score}/100) — the reference total drops about ${Math.abs(total.delta)} pts.`,
    );
  } else {
    notes.push(
      `Modeled impact score is ${overall.score}/100; the reference total is largely unchanged.`,
    );
  }

  // Football detail.
  if (football !== null) {
    if (football.passingImpactScore >= 50) {
      notes.push(
        `Wind and precipitation push a high passing-game impact (${football.passingImpactScore}/100) — the model expects a tougher aerial day.`,
      );
    } else if (football.passingImpactScore > 0) {
      notes.push(
        `Modest passing-game impact (${football.passingImpactScore}/100) from the wind and precipitation entered.`,
      );
    }
    notes.push(
      `Wind reads ${football.beaufort.description.toLowerCase()} on the Beaufort scale (force ${football.beaufort.force}).`,
    );
  }

  // Baseball detail.
  if (baseball !== null) {
    if (baseball.windEdge === "over") {
      notes.push(
        `Wind is blowing OUT (${input.windSpeedMph} mph) — the model leans the total over, with about a ${baseball.hrBoostPct}% home-run boost.`,
      );
    } else if (baseball.windEdge === "under") {
      notes.push(
        `Wind is blowing IN (${input.windSpeedMph} mph) — the model leans the total under, suppressing home runs by about ${Math.abs(baseball.hrBoostPct)}%.`,
      );
    } else {
      notes.push(
        `Wind is a crosswind / light relative to this ballpark orientation — no clear over/under lean from wind.`,
      );
    }
  }

  // Field footing from snow.
  if (footing.fieldConditions !== "normal") {
    notes.push(
      `Snow accumulation degrades footing to "${footing.fieldConditions.replace("_", " ")}" (footing multiplier ${footing.footing}).`,
    );
  }

  return notes;
}
