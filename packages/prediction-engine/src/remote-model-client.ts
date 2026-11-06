// R&D — remote model client (experimental research sidecar signals: TDA,
// IRL, ETKF, free-energy landscape, MPS, ...). Dark, NOT wired into live
// scoring or any pick-generation path — scoring.ts remains the sole
// production entrypoint (packages/prediction-engine/src/scoring.ts) and does
// not import this module, and nothing under apps/web or workers/ may either.
//
// Why this must stay shadow-only: CLAUDE.md's non-negotiable rules state "No
// fake data — all picks sourced from real API data", "No fabricated stats —
// content is data-backed only", and under Prediction Engine Rules,
// "Structured odds/line data is source of truth" (the Claude/AI layer is
// explicitly "content generation only — not source of truth"). A remote
// model sidecar's signal is, by the same logic, unvalidated until it has
// documented training data, has been backtested, and has cleared a promotion
// gate — exactly the law this repo already applies to its other independent
// estimators (see index.ts, computeTeamScoringRates / dixonColesIndependent-
// FairValue: "Fed into independentFairValues ONLY after calibration proves
// it"). Until that gate is cleared, this client's only job is to FETCH and
// RETURN raw shadow probabilities for future offline backtesting/analysis —
// it must never blend into a pick's confidence/edge score.
//
// Every built-in default config also ships `enabled: false`: the sidecar is
// experimental research infra with no production deployment yet, so nothing
// should silently start calling out to localhost (or anywhere else) unless
// an operator has explicitly opted a given service in via its
// REMOTE_MODEL_<NAME>_ENABLED env var.

export interface RemoteModelConfig {
  readonly name: string;
  readonly url: string;
  readonly enabled: boolean;
  readonly timeoutMs?: number;
}

export interface RemoteModelPrediction {
  readonly name: string;
  readonly probability: number;
}

export interface RemoteModelClientOptions {
  readonly configs?: readonly RemoteModelConfig[];
  readonly defaultTimeoutMs?: number;
  readonly fetchImpl?: typeof fetch;
}

export const DEFAULT_REMOTE_MODEL_TIMEOUT_MS = 2000;

interface RemoteModelSource {
  readonly name: string;
  readonly urlEnvVar: string;
  readonly enabledEnvVar: string;
}

// The experimental sidecar services this client knows how to reach, and the
// env vars that configure each one. Adding a row here does NOT make that
// service live — `enabled` still defaults to false unless the operator sets
// its opt-in env var to exactly "true".
const DEFAULT_REMOTE_MODEL_SOURCES: readonly RemoteModelSource[] = [
  { name: "tda", urlEnvVar: "TDA_SERVICE_URL", enabledEnvVar: "REMOTE_MODEL_TDA_ENABLED" },
  { name: "irl", urlEnvVar: "IRL_SERVICE_URL", enabledEnvVar: "REMOTE_MODEL_IRL_ENABLED" },
  { name: "etkf", urlEnvVar: "ETKF_SERVICE_URL", enabledEnvVar: "REMOTE_MODEL_ETKF_ENABLED" },
  {
    name: "free_energy",
    urlEnvVar: "FREE_ENERGY_SERVICE_URL",
    enabledEnvVar: "REMOTE_MODEL_FREE_ENERGY_ENABLED",
  },
  { name: "mps", urlEnvVar: "MPS_SERVICE_URL", enabledEnvVar: "REMOTE_MODEL_MPS_ENABLED" },
];

/**
 * Builds the default remote-model config list from environment variables.
 * A source is only included if its `*_SERVICE_URL` env var is set, and even
 * then `enabled` is `false` unless the matching `REMOTE_MODEL_<NAME>_ENABLED`
 * env var is exactly the string `"true"`. Exported (read-only) so callers —
 * and tests — can inspect the resolved list without going through the
 * network path.
 */
export function buildDefaultRemoteModelConfigs(
  env: Readonly<Record<string, string | undefined>> = process.env,
): readonly RemoteModelConfig[] {
  const configs: RemoteModelConfig[] = [];
  for (const source of DEFAULT_REMOTE_MODEL_SOURCES) {
    const url = env[source.urlEnvVar];
    if (!url) continue;
    configs.push({
      name: source.name,
      url,
      enabled: env[source.enabledEnvVar] === "true",
    });
  }
  return configs;
}

function isFiniteProbability(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

/**
 * Pulls a probability out of a remote model's JSON body, preferring
 * `home_win_probability` and falling back to `probability`. Returns
 * `undefined` (never throws, never clamps) for anything that isn't a finite
 * number in [0, 1] — a garbage value from a mock or misbehaving service is
 * dropped, not coerced into looking valid.
 */
function extractProbability(body: unknown): number | undefined {
  if (typeof body !== "object" || body === null) return undefined;
  const record = body as Record<string, unknown>;
  const raw = record["home_win_probability"] ?? record["probability"];
  return isFiniteProbability(raw) ? raw : undefined;
}

async function fetchOnePrediction(
  config: RemoteModelConfig,
  fetchImpl: typeof fetch,
  defaultTimeoutMs: number,
): Promise<RemoteModelPrediction | undefined> {
  const timeoutMs = config.timeoutMs ?? defaultTimeoutMs;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(config.url, { signal: controller.signal });
    if (!response.ok) return undefined;

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      return undefined;
    }

    const probability = extractProbability(body);
    return probability === undefined ? undefined : { name: config.name, probability };
  } catch {
    // Network error, non-2xx thrown by a custom fetchImpl, timeout abort,
    // or anything else — a shadow signal is never worth failing the caller
    // over, so it is silently excluded instead.
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetches shadow win-probability signals from enabled experimental remote
 * model sidecars and returns whatever came back cleanly. This function
 * NEVER throws: every failure mode (disabled config, network error, non-200,
 * timeout, malformed JSON, missing/out-of-range probability) results in that
 * entry being silently excluded from the result, not an exception.
 *
 * `context` is accepted for forward compatibility (future sidecars may need
 * game/market context to shape their request) but is not used by any
 * currently-configured source — no request body is built or sent today.
 *
 * The returned predictions are RAW, UNVALIDATED shadow signals for offline
 * backtesting/analysis only. Nothing in this module blends them into a
 * pick's confidence or edge score, and it must not be imported from
 * scoring.ts or any pick-generation path.
 */
export async function getRemoteModelPredictions(
  context: unknown,
  options: RemoteModelClientOptions = {},
): Promise<readonly RemoteModelPrediction[]> {
  void context;

  const fetchImpl = options.fetchImpl ?? fetch;
  const defaultTimeoutMs = options.defaultTimeoutMs ?? DEFAULT_REMOTE_MODEL_TIMEOUT_MS;
  const configs = options.configs ?? buildDefaultRemoteModelConfigs();
  const enabledConfigs = configs.filter((config) => config.enabled);

  if (enabledConfigs.length === 0) return [];

  const settled = await Promise.allSettled(
    enabledConfigs.map((config) => fetchOnePrediction(config, fetchImpl, defaultTimeoutMs)),
  );

  const predictions: RemoteModelPrediction[] = [];
  for (const result of settled) {
    if (result.status === "fulfilled" && result.value !== undefined) {
      predictions.push(result.value);
    }
  }
  return predictions;
}
