/**
 * SEC-05 — anonymous payload hygiene for /api/ops/public-surface-truth.
 *
 * The anonymous (no Bearer CRON_SECRET) payload is reachable by anyone and is
 * hit by monitoring every ~7 minutes. It must not disclose operator-internal
 * remediation details:
 *   - MAIN_FEATURE_MARKERS (deployment.expectedMainFeatures) — deploy-diff
 *     oracle; the detailed spread already omits them (mainFeatureMarkers).
 *   - Env var names anywhere in hint strings (oddsInserting.dualPath,
 *     founderNextSteps actions, posture operatorHints). Prose hints stay;
 *     verbatim identifiers like "CLAUDE_PROVIDER" or "STRIPE_SECRET_KEY" go.
 *   - conformalRd internal method names/notes.
 *
 * Operator requests (Bearer CRON_SECRET) keep every field — they are the
 * founder's remediation surface. Verified symmetrically below.
 *
 * Mocking precedent: ops-public-surface-truth-rate-limit.test.ts (P13-03).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { resetRateLimits } from "@/lib/api/rate-limit";

const OPERATOR_SECRET = "sec05-test-operator-secret";

const dbMock = vi.hoisted(() => ({
  ingestionRun: { findFirst: vi.fn() },
}));

const predictionEngineMocks = vi.hoisted(() => ({
  getReadinessGates: vi.fn(() => ({
    canExposePublicPicks: true,
    canExposePerformanceStats: true,
    canLearnFromOutcomes: true,
    minSettledPicksForLearning: 100,
    isBootstrapMode: false,
  })),
}));

const opsMocks = vi.hoisted(() => ({
  loadSettlementHealth: vi.fn(() => ({
    health: "OK",
    commencedTotal: 10,
    overduePending: 0,
    operatorMessage: "settlement ok",
  })),
  loadSettlementBreakdown: vi.fn(() => ({ overdueBySport: [], operatorNext: [] })),
  loadCanonicalSamplePosture: vi.fn(() => ({
    commencedTotal: 10,
    canonicalSettled: 5,
    canonicalWins: 3,
    operatorHint: "Canonical settled 5/100 (seed+bootstrap excluded).",
  })),
  loadCalibrationOpsSurface: vi.fn(() => ({
    eligibility: {
      status: "RED",
      reasons: ["sample below floor"],
      n: 5,
      brier: 0.3,
      ece: 0.1,
      mce: 0.2,
      murphy: { reliability: 0.1, resolution: 0.02, uncertainty: 0.24 },
      floors: { n: 100, brier: 0.22, ece: 0.05, rel: 0.05 },
      consecutiveGreen: 0,
      streakRequired: 2,
      modelVersion: "v5.2.2",
      dateRange: { from: "2026-08-01", to: "2026-09-01" },
      generatedAt: "2026-09-05T00:00:00Z",
      operatorHint: "Eligibility RED: sample below floor. Do not publish performance claims.",
    },
    publish: {
      published: false,
      publishedEffective: false,
      source: "default",
      autoPublish: false,
      autoUnpublish: false,
      canExposePerformanceStats: false,
      operatorHint:
        "Eligibility GREEN. One-time: enable calibration auto-publish (or the calibration published flag). No weekly ceremony after that.",
    },
  })),
  loadProvenPathSurface: vi.fn(() => ({ plan: null, projection: null, rankingPowerPosture: null })),
  loadRankingPauseApply: vi.fn(() => ({ present: false })),
  evaluateRevenueLadder: vi.fn(() => ({
    currentStep: 1,
    nextStep: 2,
    canHonestlyMonetizePublicTrackRecord: false,
    operatorMessage: "Track record not yet publishable.",
    blockersToNext: [],
    milestones: [],
  })),
  assessSchedulerLiveness: vi.fn(() => Promise.resolve(null)),
  maybeRunTrafficHeartbeat: vi.fn(() => Promise.resolve()),
  loadMapBakeoff: vi.fn(() => Promise.resolve(null)),
}));

const dataMocks = vi.hoisted(() => ({
  resolveContestStorageMode: vi.fn(() => "mode"),
  resolveWaitlistStorageMode: vi.fn(() => "mode"),
  isStubMode: vi.fn(() => false),
  isDemoPicksEnabled: vi.fn(() => false),
  listEpisodes: vi.fn(() => []),
  listIssues: vi.fn(() => []),
  freeSpineSnapAgeMs: vi.fn(),
  freeSpineWithinSla: vi.fn(() => true),
  resolveBestFreeSpineSnapshot: vi.fn(() => ({ snap: null, source: "none" })),
  summarizeFreeSpineOddsPath: vi.fn(() => null),
  isSignalBoardSlateStale: vi.fn(() => Promise.resolve(false)),
  isMarketBoardOddsStale: vi.fn(() => Promise.resolve(true)),
  boardSurfacePosture: vi.fn(() => ({ surface: "signal" })),
  aciPublicPosture: vi.fn(() => ({ present: false, aci: null })),
  buildMurphyResSnapshot: vi.fn(() => null),
  rankingPauseApplyPosture: vi.fn(() => ({ present: false })),
  selectiveRuntimePosture: vi.fn(() => ({ present: false })),
  summarizeMapBakeoff: vi.fn(() => null),
}));

const ingestionMocks = vi.hoisted(() => ({
  oddsApiKeyPresence: vi.fn(() => ({ present: false, matchedEnv: null })),
  rundownApiKeyPresence: vi.fn(() => ({ present: false, matchedEnv: "RUNDOWN_API_KEY" })),
}));

const launchMocks = vi.hoisted(() => ({
  isContestsPublic: vi.fn(() => true),
  isStatsPublic: vi.fn(() => false),
  PUBLIC_NAV_POLICY: { statsDefault: "dark", contestsDefault: "public" },
}));

vi.mock("@sports/db", () => ({
  db: dbMock,
  isStubMode: dataMocks.isStubMode,
  isDemoPicksEnabled: dataMocks.isDemoPicksEnabled,
}));

vi.mock("@sports/prediction-engine", () => ({
  getReadinessGates: predictionEngineMocks.getReadinessGates,
  getPlatformConfig: () => ({ forceNoBetIfStale: false }),
}));

vi.mock("@sports/data-ingestion", () => ({
  oddsApiKeyPresence: ingestionMocks.oddsApiKeyPresence,
  rundownApiKeyPresence: ingestionMocks.rundownApiKeyPresence,
}));

vi.mock("@/lib/launch/public-surface-gate", () => ({
  isContestsPublic: launchMocks.isContestsPublic,
  isStatsPublic: launchMocks.isStatsPublic,
  PUBLIC_NAV_POLICY: launchMocks.PUBLIC_NAV_POLICY,
}));

vi.mock("@/lib/contests/store", () => ({
  resolveContestStorageMode: dataMocks.resolveContestStorageMode,
}));

vi.mock("@/lib/gse/waitlist-store", () => ({
  resolveWaitlistStorageMode: dataMocks.resolveWaitlistStorageMode,
}));

vi.mock("@/lib/ops/stripe-webhook-hosts", () => ({
  loadStripeWebhookHostsPosture: vi.fn(() => null),
}));

// NOTE: credit-stack-posture, billing-money-posture, autonomy-posture,
// waitlist-posture, founder-next-steps, conformal-calibration and
// product/board-surfaces are deliberately NOT mocked here — they are pure
// env-in functions, so the anonymous-payload scan exercises their REAL
// operatorHint strings end-to-end (that is the point of SEC-05).

vi.mock("@/lib/ops/canonical-sample-posture", () => ({
  loadCanonicalSamplePosture: opsMocks.loadCanonicalSamplePosture,
}));

vi.mock("@/lib/ops/calibration-eligibility-durable", () => ({
  loadCalibrationOpsSurface: opsMocks.loadCalibrationOpsSurface,
}));

vi.mock("@/lib/ops/proven-path-seed", () => ({
  loadProvenPathSurface: opsMocks.loadProvenPathSurface,
}));

vi.mock("@/lib/ops/ranking-pause-durable", () => ({
  loadRankingPauseApply: opsMocks.loadRankingPauseApply,
}));

// founder-next-steps deliberately NOT mocked (see NOTE above).

vi.mock("@/lib/autonomy/revenue-ladder", () => ({
  evaluateRevenueLadder: opsMocks.evaluateRevenueLadder,
}));

vi.mock("@/lib/performance/settlement-health", () => ({
  loadSettlementHealth: opsMocks.loadSettlementHealth,
  SETTLEMENT_DEFAULT_GRACE_HOURS: 72,
}));

vi.mock("@/lib/performance/settlement-breakdown", () => ({
  loadSettlementBreakdown: opsMocks.loadSettlementBreakdown,
}));

vi.mock("@/lib/podcast/episodes", () => ({
  listEpisodes: dataMocks.listEpisodes,
}));

vi.mock("@/lib/newsletter/issues", () => ({
  listIssues: dataMocks.listIssues,
}));

vi.mock("@/lib/data-reliability/public-freshness-gate", () => ({
  isSignalBoardSlateStale: dataMocks.isSignalBoardSlateStale,
  isMarketBoardOddsStale: dataMocks.isMarketBoardOddsStale,
}));

vi.mock("@/lib/board/board-surface-policy", () => ({
  boardSurfacePosture: dataMocks.boardSurfacePosture,
}));

vi.mock("@/lib/data-sources/free-spine-durable", () => ({
  FREE_SPINE_DURABLE_SLA_MS: 3_600_000,
  freeSpineSnapAgeMs: dataMocks.freeSpineSnapAgeMs,
  freeSpineWithinSla: dataMocks.freeSpineWithinSla,
  resolveBestFreeSpineSnapshot: dataMocks.resolveBestFreeSpineSnapshot,
}));

vi.mock("@/lib/ops/free-spine-odds-path", () => ({
  summarizeFreeSpineOddsPath: dataMocks.summarizeFreeSpineOddsPath,
}));

vi.mock("@/lib/calibration/aci-durable", () => ({
  aciPublicPosture: dataMocks.aciPublicPosture,
}));

vi.mock("@/lib/calibration/murphy-res-definition", () => ({
  buildMurphyResSnapshot: dataMocks.buildMurphyResSnapshot,
}));

// conformal-calibration deliberately NOT mocked (see NOTE above).

vi.mock("@/lib/calibration/isotonic-alternatives", () => ({
  ISOTONIC_ALTERNATIVES: [],
}));

vi.mock("@/lib/calibration/ranking-pause-apply", () => ({
  rankingPauseApplyPosture: dataMocks.rankingPauseApplyPosture,
}));

vi.mock("@/lib/calibration/selective-publish-runtime", () => ({
  selectiveRuntimePosture: dataMocks.selectiveRuntimePosture,
}));

vi.mock("@/lib/ops/map-bakeoff-durable", () => ({
  loadMapBakeoff: opsMocks.loadMapBakeoff,
  summarizeMapBakeoff: dataMocks.summarizeMapBakeoff,
}));

// product/board-surfaces deliberately NOT mocked (see NOTE above).

vi.mock("@/lib/ops/scheduler-liveness", () => ({
  assessSchedulerLiveness: opsMocks.assessSchedulerLiveness,
}));

vi.mock("@/lib/ops/traffic-heartbeat", () => ({
  maybeRunTrafficHeartbeat: opsMocks.maybeRunTrafficHeartbeat,
}));

vi.mock("@/lib/ops/ranking-power-control", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    loadRankingPowerControlPosture: vi.fn(() => null),
  };
});

// ─── Test helpers ───────────────────────────────────────────────────────────

function makeRequest(url: string, headers: Record<string, string> = {}): Request {
  return new Request(url, {
    headers: { "x-forwarded-for": "203.0.113.7", ...headers },
  });
}

/** Env-var-name tokens that must never appear in the anonymous payload. */
const FORBIDDEN_ENV_TOKENS = [
  "CLAUDE_PROVIDER",
  "CEREBRAS_API_KEY",
  "THE_ODDS_API_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE",
  "GSE_WAITLIST_BASIC_FORCE",
  "GSE_WAITLIST_GATE_ENABLED",
  "AUTONOMY_EXECUTE",
  "CONFORMAL_ABSTAIN_ENABLED",
  "STATS_PUBLIC",
  "PUBLIC_PICKS",
  "PUBLIC_BOARD_SURFACE",
  "RUNDOWN_API_KEY",
  "ODDS_API_KEY",
  "CALIBRATION_AUTO_PUBLISH",
  "CALIBRATION_PUBLISHED",
  "FORCE_NO_BET_IF_STALE",
  "JYNX_MODE",
  "CLOUD_FAILOVER",
] as const;

function forbiddenTokensIn(payloadText: string): string[] {
  return FORBIDDEN_ENV_TOKENS.filter((tok) => payloadText.includes(tok));
}

async function getRoute() {
  return (await import("@/app/api/ops/public-surface-truth/route")) as {
    GET: (req: Request) => Promise<Response>;
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("/api/ops/public-surface-truth — SEC-05 anonymous payload hygiene", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimits();
    process.env.CRON_SECRET = OPERATOR_SECRET;
    dbMock.ingestionRun.findFirst.mockResolvedValue(null);
  });

  it("anonymous payload carries no MAIN_FEATURE_MARKERS (no expectedMainFeatures)", async () => {
    const { GET } = await getRoute();
    const res = await GET(makeRequest("http://localhost/api/ops/public-surface-truth"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    const deployment = body.deployment as Record<string, unknown> | undefined;
    expect(deployment).toBeDefined();
    expect(Object.hasOwn(deployment ?? {}, "expectedMainFeatures")).toBe(false);
  });

  it("anonymous payload names no env vars in any string field", async () => {
    const { GET } = await getRoute();
    const res = await GET(makeRequest("http://localhost/api/ops/public-surface-truth"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    const text = JSON.stringify(body);
    const leaks = forbiddenTokensIn(text);
    expect(leaks).toEqual([]);
  });

  it("anonymous payload omits conformalRd internals (methods/notes)", async () => {
    const { GET } = await getRoute();
    const res = await GET(makeRequest("http://localhost/api/ops/public-surface-truth"));
    const body = (await res.json()) as Record<string, unknown>;
    const conformalRd = body.conformalRd as Record<string, unknown> | null | undefined;
    if (conformalRd != null) {
      expect(Object.hasOwn(conformalRd, "methods")).toBe(false);
      expect(Object.hasOwn(conformalRd, "notes")).toBe(false);
    }
  });

  it("anonymous payload omits founderNextSteps entries (count only)", async () => {
    const { GET } = await getRoute();
    const res = await GET(makeRequest("http://localhost/api/ops/public-surface-truth"));
    const body = (await res.json()) as Record<string, unknown>;
    expect(Object.hasOwn(body, "founderNextSteps")).toBe(false);
    const founderSteps = body.founderSteps as { count: number } | undefined;
    expect(founderSteps).toBeDefined();
    expect(founderSteps?.count).toBeGreaterThan(0);
  });

  it("operator payload keeps full detail: markers, matched env slots, conformal internals, founder queue", async () => {
    const { GET } = await getRoute();
    const res = await GET(
      makeRequest("http://localhost/api/ops/public-surface-truth", {
        authorization: `Bearer ${OPERATOR_SECRET}`,
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    // markers present
    const deployment = body.deployment as Record<string, unknown>;
    expect(Array.isArray(deployment.expectedMainFeatures)).toBe(true);
    expect((deployment.expectedMainFeatures as string[]).length).toBeGreaterThan(0);
    // matched env var NAMES restored for the operator
    const oddsInserting = body.oddsInserting as {
      dualPath: { rundownMatchedEnv: string | null };
    };
    expect(oddsInserting.dualPath.rundownMatchedEnv).toBe("RUNDOWN_API_KEY");
    // conformal internals present
    const conformalRd = body.conformalRd as Record<string, unknown>;
    expect(Array.isArray(conformalRd.methods)).toBe(true);
    // founder queue present in full
    const founderNextSteps = body.founderNextSteps as unknown[];
    expect(Array.isArray(founderNextSteps)).toBe(true);
    expect(founderNextSteps.length).toBeGreaterThan(0);
  });

  it("anonymous payload keeps the count-only drift signals (markers count, founder count)", async () => {
    const { GET } = await getRoute();
    const res = await GET(makeRequest("http://localhost/api/ops/public-surface-truth"));
    const body = (await res.json()) as Record<string, unknown>;
    const deployment = body.deployment as Record<string, unknown>;
    expect(deployment.expectedMainFeatureCount).toBeGreaterThan(0);
    const founderSteps = body.founderSteps as { count: number };
    expect(founderSteps.count).toBeGreaterThan(0);
  });
});
