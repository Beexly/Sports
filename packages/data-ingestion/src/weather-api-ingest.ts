/**
 * Neural Networks for Post-Processing Ensemble Weather Forecasts
 *
 * arXiv:1805.09091 · lane:weather · owner:Hermes
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Build NN-aux-emb-style ensemble post-processing for game-time weather: pull ensemble mean/sigma
 * of wind speed, gusts, precipitation, temperature, humidity for each stadium grid cell at
 * kickoff-relevant lead times (GEFS/ECMWF), plus ASOS observations at stadium locations; train a
 * small MLP with stadium-ID embeddings predicting calibrated Gaussian (or truncated-normal for
 * wind, Gamma for precip) distributions via closed-form CRPS loss. Feed the predictive
 * distribution moments/quantiles into the totals/spread weather model (wind affects
 * punts/FG/passing more than temperature). EMOS-gl (linear CRPS-trained) is the honest baseline --
 * ship the linear model unless the NN beats it. Improvement beyond the paper: extend to wind gust
 * + precipitation with the right parametric families and a multivariate output capturing wind-
 * temperature dependence; test whether the joint calibrated weather distribution improves holdout
 * log-loss of a totals model that already uses raw weather point forecasts.
 *
 * ACCEPTANCE GATE: ADAPT only if NN-aux-emb achieves >=5% relative mean-CRPS improvement over EMOS-gl on a holdout
 * season AND is significantly better (DM+BH) than EMOS-gl at >=15% of stadiums while significantly
 * worse at <=5%. Otherwise ship the EMOS-gl linear model.
 *
 * Ingest role: connector interface (NFL weather feed: schema + validation; default OFF, no credential).
 * Live data: YES when wired (behind CONFIG.enabled=false default). This module is the pure offline-capable core: schemas, validation, normalization, feature math.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "1805.09091" as const;
export const LANE = "weather" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADAPT only if NN-aux-emb achieves >=5% relative mean-CRPS improvement over EMOS-gl on a holdout
 * season AND is significantly better (DM+BH) than EMOS-gl at >=15% of stadiums while significantly
 * worse at <=5%. Otherwise ship the EMOS-gl linear model.`;

export const CONFIG = {
  enabled: false,
  feed: "NFL Weather API",
  coverage: ["outdoor"],
  requiresApiKey: false,
  rateLimit: "unknown - verify before enabling",
} as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export interface WeatherReading {
  readonly gameId: string;
  readonly stadium: string;
  readonly observedAt: string;
  readonly tempF: number | null;
  readonly windMph: number | null;
  readonly windDir: string | null;
  readonly humidityPct: number | null;
  readonly precip: string | null;
  readonly roof: "open" | "closed" | "retractable-open" | "retractable-closed" | "unknown";
}

export function isWeatherReading(x: unknown): x is WeatherReading {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  const roofs = ["open", "closed", "retractable-open", "retractable-closed", "unknown"];
  return (
    typeof o["gameId"] === "string" &&
    typeof o["stadium"] === "string" &&
    typeof o["observedAt"] === "string" && Number.isFinite(Date.parse(o["observedAt"] as string)) &&
    (o["tempF"] === null || isFiniteNumber(o["tempF"])) &&
    (o["windMph"] === null || isFiniteNumber(o["windMph"])) &&
    (o["windDir"] === null || typeof o["windDir"] === "string") &&
    (o["humidityPct"] === null || isFiniteNumber(o["humidityPct"])) &&
    (o["precip"] === null || typeof o["precip"] === "string") &&
    roofs.includes(o["roof"] as string)
  );
}

/** Normalize one raw API row. Null fields allowed (dome games report nulls). */
export function normalizeWeatherRow(raw: Record<string, unknown>): WeatherReading | null {
  const rec: WeatherReading = {
    gameId: typeof raw["game_id"] === "string" ? raw["game_id"] : String(raw["game_id"] ?? ""),
    stadium: typeof raw["stadium"] === "string" ? raw["stadium"] : "",
    observedAt: typeof raw["observed_at"] === "string" ? raw["observed_at"] : "",
    tempF: raw["temp_f"] === null || raw["temp_f"] === undefined ? null : Number(raw["temp_f"]),
    windMph: raw["wind_mph"] === null || raw["wind_mph"] === undefined ? null : Number(raw["wind_mph"]),
    windDir: typeof raw["wind_dir"] === "string" ? raw["wind_dir"] : null,
    humidityPct: raw["humidity_pct"] === null || raw["humidity_pct"] === undefined ? null : Number(raw["humidity_pct"]),
    precip: typeof raw["precip"] === "string" ? raw["precip"] : null,
    roof: ["open", "closed", "retractable-open", "retractable-closed"].includes(String(raw["roof"])) ? (raw["roof"] as WeatherReading["roof"]) : "unknown",
  };
  if (!isWeatherReading(rec)) return null;
  if (rec.tempF !== null && !Number.isFinite(rec.tempF)) return null;
  if (rec.windMph !== null && !Number.isFinite(rec.windMph)) return null;
  if (rec.humidityPct !== null && !Number.isFinite(rec.humidityPct)) return null;
  return rec;
}

/** Wind bucketing for the pre-game wind model. */
export function windBucket(windMph: number | null): "calm" | "breezy" | "windy" | "extreme" | "unknown" {
  if (windMph === null) return "unknown";
  if (!isFiniteNumber(windMph) || windMph < 0) return "unknown";
  if (windMph < 5) return "calm";
  if (windMph < 12) return "breezy";
  if (windMph < 20) return "windy";
  return "extreme";
}

/** Dome/outdoor applicability: weather features only apply to outdoor games. */
export function weatherApplies(reading: WeatherReading): boolean {
  return reading.roof === "open" || reading.roof === "retractable-open";
}
