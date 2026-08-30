/**
 * Feast architecture engine — GSE competitive strength (packet copy).
 * Public API never reads Feast online. Materialize = internal vectors only.
 */

export type ServeMode = "sdk_inprocess" | "feature_server_http" | "stream_push";
export type OnlineBackend = "sqlite" | "redis" | "redis_cluster" | "dynamodb";
export type MaterializeKind = "incremental" | "range" | "push" | "forbidden";

export const FEAST_FORBIDDEN_VIEWS = [
  "quote_plane",
  "sportsbook_quotes",
  "odds_api",
  "calibration_certificate",
  "pedersen_binding",
  "slate_opening_secret",
] as const;

export const FEAST_COMPETITIVE_STRENGTH = {
  thesis:
    "Competitors sell rented odds APIs. GSE sells an owned feature spine: PIT-correct FeatureRecords as SoR, Feast for training/serving vectors, refuse-default public API that never touches Redis online.",
  differentiators: [
    "hybrid_sor",
    "pit_training",
    "online_not_public",
    "plane_separation",
    "latency_honesty",
    "precompute_o1",
  ] as const,
  antiPatterns: [
    "Serving public API from Feast online Redis",
    "Materializing sportsbook quotes into online store",
    "Claiming sub-ms SLAs from localhost benches",
    "League-wide Redis hash tags",
    "Reshard during live slates",
    "materialize_interval ≥ feature-view TTL",
  ] as const,
} as const;

export interface ServingPath {
  mode: ServeMode;
  backend: OnlineBackend;
  precomputeOnline: boolean;
  entityCount: number;
  featureViewCount: number;
  sameAz: boolean;
}

export interface ServingAssessment {
  allowed: boolean;
  forPublicApi: false;
  estimatedP50Ms: number;
  estimatedP99Ms: number;
  rttModel: string;
  recommendations: string[];
  refuseReasons: string[];
}

const PIPELINE = [
  { n: 1, batch: 1.32 },
  { n: 5, batch: 5.63 },
  { n: 10, batch: 10.65 },
  { n: 20, batch: 21.21 },
] as const;

function interpolateBatchedMs(fv: number): number {
  const n = Math.max(1, fv);
  const first = PIPELINE[0]!;
  if (n <= 1) return first.batch;
  for (let i = 1; i < PIPELINE.length; i++) {
    const a = PIPELINE[i - 1]!;
    const b = PIPELINE[i]!;
    if (n <= b.n) {
      const t = (n - a.n) / (b.n - a.n);
      return a.batch + t * (b.batch - a.batch);
    }
  }
  const last = PIPELINE[PIPELINE.length - 1]!;
  return last.batch * (n / last.n);
}

export function assessServingPath(path: ServingPath): ServingAssessment {
  const refuse: string[] = [];
  const recs: string[] = [];
  if (path.entityCount < 1) refuse.push("entityCount must be ≥ 1");
  if (path.featureViewCount < 1) refuse.push("featureViewCount must be ≥ 1");

  let baseMs = path.precomputeOnline
    ? 1.1
    : interpolateBatchedMs(path.featureViewCount);
  baseMs *= Math.max(0.4, Math.sqrt(Math.max(1, path.entityCount) / 50));

  let tax = 1;
  let rttModel = "standalone single-RTT pipeline";
  if (path.backend === "sqlite") {
    tax = 1.4;
    rttModel = "sqlite local";
    recs.push("Promote to redis before multi-instance");
  } else if (path.backend === "redis_cluster") {
    tax = path.entityCount > 1 ? 4.5 : 2.2;
    rttModel = "cluster multi-entity fan-out";
    recs.push("Profile multi-entity under cluster");
  } else if (path.backend === "dynamodb") {
    tax = 3.2;
    rttModel = "DynamoDB BatchGet";
  }
  if (!path.sameAz) {
    tax *= 1.8;
    recs.push("Same AZ for store + server");
  }
  if (path.mode === "feature_server_http") {
    baseMs += 0.8;
    recs.push("workers=2×CPU+1");
  }
  if (path.featureViewCount >= 8 && !path.precomputeOnline) {
    recs.push("precompute_online=True for multi-FV");
  }

  const p50 = Math.round(baseMs * tax * 100) / 100;
  const p99 =
    Math.round(p50 * (path.backend === "redis_cluster" ? 6.2 : 2.8) * 100) /
    100;

  return {
    allowed: refuse.length === 0,
    forPublicApi: false,
    estimatedP50Ms: p50,
    estimatedP99Ms: p99,
    rttModel,
    recommendations: recs,
    refuseReasons: refuse,
  };
}

export interface MaterializePlanInput {
  kind: MaterializeKind;
  featureViews: string[];
  ttlSecondsByView: Record<string, number>;
  materializeIntervalSeconds: number;
  startIso?: string;
  endIso?: string;
  lateDataOverlapSeconds?: number;
}

export interface MaterializePlan {
  ok: boolean;
  kind: MaterializeKind;
  command: string[];
  blockedViews: string[];
  warnings: string[];
}

export function planMaterialize(input: MaterializePlanInput): MaterializePlan {
  const warnings: string[] = [];
  if (input.kind === "forbidden") {
    return {
      ok: false,
      kind: input.kind,
      command: [],
      blockedViews: [...input.featureViews],
      warnings: ["forbidden"],
    };
  }

  const blocked = input.featureViews.filter((v) =>
    (FEAST_FORBIDDEN_VIEWS as readonly string[]).includes(v),
  );
  const allowed = input.featureViews.filter((v) => !blocked.includes(v));
  if (blocked.length)
    warnings.push(`blocked: ${blocked.join(",")}`);
  if (!allowed.length) {
    return {
      ok: false,
      kind: input.kind,
      command: [],
      blockedViews: blocked,
      warnings: [...warnings, "no allowed views"],
    };
  }

  const ttls = allowed
    .map((v) => input.ttlSecondsByView[v])
    .filter((t): t is number => typeof t === "number" && t > 0);
  if (ttls.length) {
    const minTtl = Math.min(...ttls);
    if (input.materializeIntervalSeconds >= minTtl) {
      return {
        ok: false,
        kind: input.kind,
        command: [],
        blockedViews: blocked,
        warnings: [
          ...warnings,
          `interval ${input.materializeIntervalSeconds} ≥ TTL ${minTtl}`,
        ],
      };
    }
  }

  const cmd: string[] = ["-m", "pipelines.materialize"];
  if (input.kind === "incremental") {
    cmd.push("incremental");
    if (input.endIso) cmd.push("--end", input.endIso);
    cmd.push("--views", allowed.join(","));
  } else if (input.kind === "range") {
    if (!input.startIso || !input.endIso) {
      return {
        ok: false,
        kind: input.kind,
        command: [],
        blockedViews: blocked,
        warnings: [...warnings, "range needs start/end"],
      };
    }
    warnings.push(
      `late overlap ${input.lateDataOverlapSeconds ?? 3600}s`,
    );
    cmd.push(
      "range",
      "--start",
      input.startIso,
      "--end",
      input.endIso,
      "--views",
      allowed.join(","),
    );
  } else {
    cmd.push("push", "--views", allowed.join(","));
  }

  return {
    ok: true,
    kind: input.kind,
    command: cmd,
    blockedViews: blocked,
    warnings,
  };
}

export function selectOnlineBackend(input: {
  multiInstance: boolean;
  memoryPressure: boolean;
  multiEntityQps: number;
}): { phase: OnlineBackend; reason: string } {
  if (!input.multiInstance && !input.memoryPressure) {
    return { phase: "sqlite", reason: "single process" };
  }
  if (!input.memoryPressure && input.multiEntityQps < 5000) {
    return { phase: "redis", reason: "multi-instance moderate" };
  }
  return { phase: "redis_cluster", reason: "forced capacity" };
}

export function defaultGseMaterializePlan(endIso?: string) {
  return planMaterialize({
    kind: "incremental",
    featureViews: ["scorebug", "proprietary_metrics", "player_stats"],
    ttlSecondsByView: {
      scorebug: 6 * 3600,
      proprietary_metrics: 30 * 86400,
      player_stats: 14 * 86400,
    },
    materializeIntervalSeconds: 15 * 60,
    endIso,
  });
}
