/**
 * Endpoint builder and circuit-broken client wrapper for the FastAPI
 * `gse-ml-service` sidecar (`POST /predict/etkf` and `POST /predict/tda`).
 *
 * Matches the strict Pydantic `ConfigDict(extra="forbid")` wire contracts in
 * `gse-ml-service/app/main.py`:
 * - Only `/predict/etkf` returns a calibrated-link win probability and enters
 *   consensus endpoints (`buildGseMlEndpoints`).
 * - `/predict/tda` returns H0/H1 persistence-image feature vectors (never a
 *   probability) via `buildTdaFeatureEndpoint` + `fetchTdaPersistenceFeatures`.
 *
 * Keeps URLs env-driven, rejects private/metadata SSRF hosts and internal
 * redirects, avoids `Date.now()` (explicit `nowMs`), and fails closed when unset.
 */

import {
  createCircuitBreaker,
  isRemoteModelFailure,
  locationIsInternalTargetLocation,
  validateEndpointUrl,
  type CircuitBreaker,
  type GameContext,
  type ModelEndpoint,
  type RemoteModelFailureReason,
  type RemoteModelOutcome,
} from "./remote-model-client.js";

export interface GseMlServiceEndpointsConfig {
  readonly baseUrl?: string | null;
  readonly timeoutMs?: number;
}

export interface EtkfObservationWire {
  readonly home_team: string;
  readonly away_team: string;
  readonly margin: number;
  readonly obs_var?: number;
}

export interface EtkfRequestWire {
  readonly teams: readonly string[];
  readonly home_team: string;
  readonly away_team: string;
  readonly observations?: readonly EtkfObservationWire[];
  readonly state_dim?: number;
  readonly ensemble_size?: number;
  readonly seed?: number;
  readonly initial_spread?: number;
  readonly obs_var?: number;
  readonly logistic_scale?: number;
  readonly home_advantage?: number;
  readonly inflation?: number | null;
}

export interface EtkfDmaBusReadoutOptional {
  readonly dma_regime_weights?: readonly [number, number, number];
  readonly state_vector_dim?: 312;
  readonly ensemble_size_k?: 64;
  readonly split_brain_gap?: number;
}

export interface EtkfPredictionSuccess {
  readonly ok: true;
  readonly probability: number;
  readonly latentMargin: number;
  readonly marginSpread: number;
  readonly observationsAssimilated: number;
  readonly calibration: string;
  readonly dmaBusOptional?: EtkfDmaBusReadoutOptional;
}

export type TdaPoint = readonly [number, number];

export interface TdaRequestWire {
  readonly frames: readonly (readonly TdaPoint[])[];
  readonly include_features?: boolean;
  readonly spec?: {
    readonly birth_range?: readonly [number, number];
    readonly pers_range?: readonly [number, number];
    readonly pixel_size?: number;
    readonly sigma?: number;
    readonly weight_cap?: number | null;
  };
}

export interface TdaFeatureSuccess {
  readonly ok: true;
  readonly featureLength: number;
  readonly framesUsed: number;
  readonly framesSkipped: number;
  readonly h0Slice: readonly [number, number];
  readonly h1Slice: readonly [number, number];
  readonly features: readonly number[];
  readonly truncationWarning: string | null;
}

export interface GseMlCallFailure {
  readonly ok: false;
  readonly reason: RemoteModelFailureReason | "circuit_open" | "disabled";
  readonly detail: string;
}

function resolveBaseUrl(override?: string | null): string {
  return (override ?? process.env["GSE_ML_SERVICE_URL"] ?? "").trim().replace(/\/+$/, "");
}

/**
 * Builds consensus-eligible probability endpoints from `gse-ml-service`.
 * Per `gse-ml-service/app/main.py`, ONLY `/predict/etkf` produces a numeric
 * probability; `/predict/tda` is a feature extractor and is intentionally
 * excluded from consensus probability voting.
 */
export function buildGseMlEndpoints(
  config: GseMlServiceEndpointsConfig = {},
): readonly ModelEndpoint[] {
  const raw = resolveBaseUrl(config.baseUrl);
  const timeoutMs = config.timeoutMs ?? 2500;
  if (!raw) {
    return [{ name: "gse-etkf", url: "", enabled: false, timeoutMs }];
  }

  const check = validateEndpointUrl(raw);
  return [
    {
      name: "gse-etkf",
      url: `${raw}/predict/etkf`,
      enabled: check.ok,
      timeoutMs,
    },
  ];
}

/** Builds the persistence-image feature endpoint (`POST /predict/tda`). */
export function buildTdaFeatureEndpoint(
  config: GseMlServiceEndpointsConfig = {},
): ModelEndpoint {
  const raw = resolveBaseUrl(config.baseUrl);
  const timeoutMs = config.timeoutMs ?? 2500;
  if (!raw) {
    return { name: "gse-tda-features", url: "", enabled: false, timeoutMs };
  }
  const check = validateEndpointUrl(raw);
  return {
    name: "gse-tda-features",
    url: `${raw}/predict/tda`,
    enabled: check.ok,
    timeoutMs,
  };
}

async function postJsonGuarded(
  url: string,
  payload: unknown,
  timeoutMs: number,
  fetchImpl: typeof fetch,
): Promise<{ readonly ok: true; readonly body: Record<string, unknown> } | GseMlCallFailure> {
  const urlCheck = validateEndpointUrl(url);
  if (!urlCheck.ok) {
    return { ok: false, reason: "blocked_url", detail: urlCheck.detail };
  }

  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<{ kind: "timeout" }>((resolve) => {
    timer = setTimeout(() => {
      controller.abort();
      resolve({ kind: "timeout" });
    }, timeoutMs);
  });

  const requestPromise = Promise.resolve()
    .then(() =>
      fetchImpl(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
        redirect: "manual",
      }),
    )
    .then(
      (response) => ({ kind: "response" as const, response }),
      (error: unknown) => ({ kind: "error" as const, error }),
    );

  const settled = await Promise.race([requestPromise, timeoutPromise]);
  if (timer !== undefined) clearTimeout(timer);

  if (settled.kind === "timeout") {
    return { ok: false, reason: "timeout", detail: `no response within ${timeoutMs}ms` };
  }
  if (settled.kind === "error") {
    return {
      ok: false,
      reason: "network_error",
      detail: settled.error instanceof Error ? settled.error.message : String(settled.error),
    };
  }

  const { response } = settled;
  if (response.status >= 300 && response.status < 400) {
    const loc = response.headers.get("location");
    if (loc && locationIsInternalTargetLocation(loc)) {
      return {
        ok: false,
        reason: "blocked_redirect",
        detail: "redirect target points to a private/loopback/metadata host",
      };
    }
    return { ok: false, reason: "http_error", detail: `HTTP ${response.status} redirect refused` };
  }

  if (!response.ok) {
    return { ok: false, reason: "http_error", detail: `HTTP ${response.status}` };
  }

  let parsed: unknown;
  try {
    parsed = await response.json();
  } catch (err) {
    return {
      ok: false,
      reason: "malformed_response",
      detail: err instanceof Error ? err.message : "invalid JSON response",
    };
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { ok: false, reason: "malformed_response", detail: "expected JSON object" };
  }
  return { ok: true, body: parsed as Record<string, unknown> };
}

/**
 * Calls `POST /predict/etkf` with a schema-strict `EtkfRequestWire` payload
 * (`ConfigDict(extra="forbid")`), guarded by SSRF checks and `CircuitBreaker`.
 */
export async function fetchEtkfWinProbability(params: {
  readonly request: EtkfRequestWire;
  readonly nowMs: number;
  readonly baseUrl?: string | null;
  readonly timeoutMs?: number;
  readonly breaker?: CircuitBreaker;
  readonly fetch?: typeof fetch;
}): Promise<EtkfPredictionSuccess | GseMlCallFailure> {
  const endpoint = buildGseMlEndpoints({
    baseUrl: params.baseUrl,
    timeoutMs: params.timeoutMs,
  })[0]!;

  if (!endpoint.enabled || !endpoint.url) {
    return { ok: false, reason: "disabled", detail: "gse-etkf endpoint is unset or blocked" };
  }

  const breaker = params.breaker ?? createCircuitBreaker();
  const acq = breaker.tryAcquire(endpoint.name, params.nowMs);
  if (!acq.allowed) {
    return {
      ok: false,
      reason: "circuit_open",
      detail: `circuit breaker state "${acq.state}" for "${endpoint.name}"`,
    };
  }

  const strictPayload: EtkfRequestWire = {
    teams: Array.from(new Set(params.request.teams)),
    home_team: params.request.home_team,
    away_team: params.request.away_team,
    ...(params.request.observations !== undefined
      ? {
          observations: params.request.observations.map((o) => ({
            home_team: o.home_team,
            away_team: o.away_team,
            margin: o.margin,
            ...(o.obs_var !== undefined ? { obs_var: o.obs_var } : {}),
          })),
        }
      : {}),
    ...(params.request.state_dim !== undefined ? { state_dim: params.request.state_dim } : {}),
    ...(params.request.ensemble_size !== undefined
      ? { ensemble_size: params.request.ensemble_size }
      : {}),
    ...(params.request.seed !== undefined ? { seed: params.request.seed } : {}),
    ...(params.request.initial_spread !== undefined
      ? { initial_spread: params.request.initial_spread }
      : {}),
    ...(params.request.obs_var !== undefined ? { obs_var: params.request.obs_var } : {}),
    ...(params.request.logistic_scale !== undefined
      ? { logistic_scale: params.request.logistic_scale }
      : {}),
    ...(params.request.home_advantage !== undefined
      ? { home_advantage: params.request.home_advantage }
      : {}),
    ...(params.request.inflation !== undefined ? { inflation: params.request.inflation } : {}),
  };

  const res = await postJsonGuarded(
    endpoint.url,
    strictPayload,
    endpoint.timeoutMs ?? 2500,
    params.fetch ?? fetch,
  );
  if (!res.ok) {
    breaker.recordOutcome(endpoint.name, "failure", params.nowMs);
    return res;
  }

  const p = res.body["probability"];
  if (typeof p !== "number" || !Number.isFinite(p) || p < 0 || p > 1) {
    breaker.recordOutcome(endpoint.name, "failure", params.nowMs);
    return { ok: false, reason: "malformed_response", detail: "invalid ETKF probability field" };
  }

  const rawBus = res.body["dma_bus"];
  let dmaBusOptional: EtkfDmaBusReadoutOptional | undefined;
  if (typeof rawBus === "object" && rawBus !== null && !Array.isArray(rawBus)) {
    const bRec = rawBus as Record<string, unknown>;
    const rw = bRec["dma_regime_weights"];
    const regimeWeights =
      Array.isArray(rw) && rw.length === 3 && rw.every((v) => typeof v === "number" && Number.isFinite(v))
        ? ([Number(rw[0]), Number(rw[1]), Number(rw[2])] as const)
        : undefined;
    dmaBusOptional = {
      ...(regimeWeights !== undefined ? { dma_regime_weights: regimeWeights } : {}),
      ...(bRec["state_vector_dim"] === 312 ? { state_vector_dim: 312 } : {}),
      ...(bRec["ensemble_size_k"] === 64 ? { ensemble_size_k: 64 } : {}),
      ...(typeof bRec["split_brain_gap"] === "number" && Number.isFinite(bRec["split_brain_gap"])
        ? { split_brain_gap: Number(bRec["split_brain_gap"]) }
        : {}),
    };
  }

  breaker.recordOutcome(endpoint.name, "success", params.nowMs);
  return {
    ok: true,
    probability: p,
    latentMargin: typeof res.body["latent_margin"] === "number" ? res.body["latent_margin"] : 0,
    marginSpread: typeof res.body["margin_spread"] === "number" ? res.body["margin_spread"] : 0,
    observationsAssimilated:
      typeof res.body["observations_assimilated"] === "number"
        ? res.body["observations_assimilated"]
        : 0,
    calibration:
      typeof res.body["calibration"] === "string" ? res.body["calibration"] : "uncalibrated",
    ...(dmaBusOptional !== undefined ? { dmaBusOptional } : {}),
  };
}

/**
 * Calls `POST /predict/tda` to extract H0/H1 persistence-image feature vectors
 * over normalized player-coordinate frames. Never treats output as a win prob.
 */
export async function fetchTdaPersistenceFeatures(params: {
  readonly request: TdaRequestWire;
  readonly baseUrl?: string | null;
  readonly timeoutMs?: number;
  readonly fetch?: typeof fetch;
}): Promise<TdaFeatureSuccess | GseMlCallFailure> {
  const endpoint = buildTdaFeatureEndpoint({
    baseUrl: params.baseUrl,
    timeoutMs: params.timeoutMs,
  });
  if (!endpoint.enabled || !endpoint.url) {
    return {
      ok: false,
      reason: "disabled",
      detail: "gse-tda-features endpoint is unset or blocked",
    };
  }

  const strictPayload: TdaRequestWire = {
    frames: params.request.frames,
    ...(params.request.include_features !== undefined
      ? { include_features: params.request.include_features }
      : {}),
    ...(params.request.spec !== undefined ? { spec: params.request.spec } : {}),
  };

  const res = await postJsonGuarded(
    endpoint.url,
    strictPayload,
    endpoint.timeoutMs ?? 2500,
    params.fetch ?? fetch,
  );
  if (!res.ok) return res;

  const h0 = res.body["h0_slice"];
  const h1 = res.body["h1_slice"];
  const rawFeatures = res.body["features"];
  if (!Array.isArray(h0) || h0.length !== 2 || !Array.isArray(h1) || h1.length !== 2) {
    return { ok: false, reason: "malformed_response", detail: "missing h0_slice or h1_slice" };
  }

  const features: number[] = Array.isArray(rawFeatures)
    ? rawFeatures.filter((v): v is number => typeof v === "number" && Number.isFinite(v))
    : [];

  return {
    ok: true,
    featureLength: typeof res.body["feature_length"] === "number" ? res.body["feature_length"] : features.length,
    framesUsed: typeof res.body["frames_used"] === "number" ? res.body["frames_used"] : 0,
    framesSkipped: typeof res.body["frames_skipped"] === "number" ? res.body["frames_skipped"] : 0,
    h0Slice: [Number(h0[0]), Number(h0[1])] as const,
    h1Slice: [Number(h1[0]), Number(h1[1])] as const,
    features,
    truncationWarning:
      typeof res.body["truncation_warning"] === "string" ? res.body["truncation_warning"] : null,
  };
}

export interface FetchGseMlEnsembleParams {
  readonly game: GameContext;
  readonly nowMs: number;
  readonly baseUrl?: string | null;
  readonly teams?: readonly string[];
  readonly observations?: readonly EtkfObservationWire[];
  readonly breaker?: CircuitBreaker;
  readonly fetch?: typeof fetch;
}

/**
 * Consensus-adapter entry point that translates `GameContext` + optional ETKF
 * history into a schema-strict `EtkfRequestWire` without sending forbidden extra
 * fields (`gameId`, `sport`) to `gse-ml-service`.
 */
export async function fetchGseMlEnsembleOutcomes(
  params: FetchGseMlEnsembleParams,
): Promise<readonly RemoteModelOutcome[]> {
  const endpoint = buildGseMlEndpoints({ baseUrl: params.baseUrl })[0];
  if (!endpoint?.enabled) return [];

  const homeTeam = (params.game.homeTeam ?? "HOME").trim() || "HOME";
  const awayTeam = (params.game.awayTeam ?? "AWAY").trim() || "AWAY";
  if (homeTeam === awayTeam) {
    return [
      {
        name: "gse-etkf",
        reason: "malformed_response",
        detail: "home_team and away_team must be distinct for ETKF",
      },
    ];
  }

  const obs = params.observations ?? [];
  const roster = new Set<string>([homeTeam, awayTeam, ...(params.teams ?? [])]);
  for (const row of obs) {
    roster.add(row.home_team);
    roster.add(row.away_team);
  }

  const outcome = await fetchEtkfWinProbability({
    request: {
      teams: Array.from(roster),
      home_team: homeTeam,
      away_team: awayTeam,
      observations: obs,
    },
    nowMs: params.nowMs,
    baseUrl: params.baseUrl,
    breaker: params.breaker,
    fetch: params.fetch,
  });

  if (outcome.ok) {
    return [{ name: "gse-etkf", probability: outcome.probability }];
  }
  const mappedReason =
    outcome.reason === "circuit_open" || outcome.reason === "disabled"
      ? "network_error"
      : outcome.reason;
  const fallback: RemoteModelOutcome = {
    name: "gse-etkf",
    reason: mappedReason,
    detail: outcome.detail,
  };
  return isRemoteModelFailure(fallback) ? [fallback] : [];
}
