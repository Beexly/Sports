/**
 * The cron ROUTE contracts for the three customer-visible crons that had no
 * test importing them, per the coverage table built in #943.
 *
 * WHY ROUTES AND NOT FUNCTIONS. Every one of the twenty-plus defects found in
 * this lane lived at the seam between a route and the function it calls: a
 * duplicated write (#942), a truncated write reporting `success: true` on a 200
 * (#944), a report overwritten by a second call's empty result. The functions
 * were all correct in isolation and all seventeen writer tests passed through
 * every one of those failures. So these tests import the ROUTE.
 *
 * THE SHARED CONTRACT. A cron that fails must not answer 200. A 200 on a cron
 * is read by Vercel's scheduler, by uptime checks and by whoever opens the log
 * as "the job ran", so a failure shaped like a success is invisible to every
 * consumer that is not reading the body. Each route below therefore gets:
 *   1. a thrown pipeline -> 500, never 200        (the defect itself)
 *   2. the positive control -> a healthy run still answers 200
 * A test that only pins (1) passes against a route that always 500s, so (2) is
 * not optional.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const generateSignalSlate = vi.fn();
const slateAssociationTrace = vi.fn();
const captureError = vi.fn();

// autonomy-cycle
const executeAutonomyCycle = vi.fn();
const planAutonomyCycle = vi.fn();
const computeLiveCapabilityProbes = vi.fn();
const classifyHealthAlertSnapshot = vi.fn();
const loadSettlementHealth = vi.fn();
const getReadinessGates = vi.fn();
const resolveBestFreeSpineSnapshot = vi.fn();
const freeSpineSnapAgeMs = vi.fn();
const resolveAutonomyBaseUrl = vi.fn();

// jarvis-snapshot
const loadJarvisAssessment = vi.fn();
const materializeJarvisDraftTasks = vi.fn();
const persistJarvisHistorySnapshot = vi.fn();
const jarvisHistory = { push: vi.fn(), size: vi.fn() };

vi.mock("@/lib/cron/authorize", () => ({
  cronAuthError: () => null,
  cronAuthErrorBearerOnly: () => null,
}));
vi.mock("@sports/ingestion-pipeline", () => ({
  generateSignalSlate: (...a: unknown[]) => generateSignalSlate(...a),
  slateAssociationTrace: (...a: unknown[]) => slateAssociationTrace(...a),
}));
vi.mock("@sports/db", () => ({ db: {} }));
vi.mock("@sports/prediction-engine", () => ({
  getReadinessGates: (...a: unknown[]) => getReadinessGates(...a),
}));
vi.mock("@/lib/observability/sentry", () => ({
  captureError: (...a: unknown[]) => captureError(...a),
}));
vi.mock("@/lib/health/live-capability-probes", () => ({
  computeLiveCapabilityProbes: (...a: unknown[]) => computeLiveCapabilityProbes(...a),
}));
vi.mock("@/lib/ops/health-alert-decision", () => ({
  classifyHealthAlertSnapshot: (...a: unknown[]) => classifyHealthAlertSnapshot(...a),
}));
vi.mock("@/lib/performance/settlement-health", () => ({
  loadSettlementHealth: (...a: unknown[]) => loadSettlementHealth(...a),
  SETTLEMENT_DEFAULT_GRACE_HOURS: 24,
}));
vi.mock("@/lib/autonomy/operating-kernel", () => ({
  planAutonomyCycle: (...a: unknown[]) => planAutonomyCycle(...a),
}));
vi.mock("@/lib/autonomy/execute-autonomy-cycle", () => ({
  executeAutonomyCycle: (...a: unknown[]) => executeAutonomyCycle(...a),
  resolveAutonomyBaseUrl: (...a: unknown[]) => resolveAutonomyBaseUrl(...a),
}));
vi.mock("@/lib/autonomy/safe-cron-targets", () => ({
  AUTONOMY_MAX_ACTIONS_PER_CYCLE: 3,
}));
vi.mock("@/lib/data-sources/free-spine-durable", () => ({
  resolveBestFreeSpineSnapshot: (...a: unknown[]) => resolveBestFreeSpineSnapshot(...a),
  freeSpineSnapAgeMs: (...a: unknown[]) => freeSpineSnapAgeMs(...a),
}));
vi.mock("@/lib/cockpit/jarvis-data", () => ({
  loadJarvisAssessment: (...a: unknown[]) => loadJarvisAssessment(...a),
}));
vi.mock("@/lib/cockpit/jarvis-history", () => ({
  sharedJarvisHistory: () => jarvisHistory,
}));
vi.mock("@/lib/cockpit/jarvis-draft-tasks", () => ({
  materializeJarvisDraftTasks: (...a: unknown[]) => materializeJarvisDraftTasks(...a),
}));
vi.mock("@/lib/cockpit/jarvis-history-durable", () => ({
  persistJarvisHistorySnapshot: (...a: unknown[]) => persistJarvisHistorySnapshot(...a),
}));

const HEALTHY_SLATE = {
  ok: true,
  gamesConsidered: 12,
  candidatesWithIndependents: 3,
  picksUpserted: 3,
  picksSkipped: 0,
  fixtureUnconfirmed: 0,
  skippedInPlay: 0,
  seriesRepeatsSkipped: 0,
  errors: [] as string[],
  note: "ok",
};
// What generateSignalSlate actually returns when it REFUSES. Read from
// packages/ingestion-pipeline/src/generate-signal-slate.ts:179-190 — a refusal
// is a resolved promise carrying ok:false, NOT a throw.
const REFUSED_SLATE = {
  ok: false,
  gamesConsidered: 0,
  candidatesWithIndependents: 0,
  picksUpserted: 0,
  picksSkipped: 0,
  fixtureUnconfirmed: 0,
  skippedInPlay: 0,
  seriesRepeatsSkipped: 0,
  errors: ["slate requires an ASSOCIATION_ONLY reasoning trace and does not mint without one"],
  note: "slate refused: no association trace",
};

async function invoke(route: string): Promise<Response> {
  vi.resetModules();
  const mod = await import(route);
  return (await mod.GET(new Request("http://localhost/api/cron/x"))) as Response;
}

describe("GET /api/cron/generate-signal-slate", () => {
  beforeEach(() => {
    generateSignalSlate.mockReset();
    slateAssociationTrace.mockReset();
    captureError.mockReset();
    slateAssociationTrace.mockResolvedValue({ conclusion: "ASSOCIATION_ONLY" });
  });

  it("a THROWN pipeline is a 500, never a 200", async () => {
    generateSignalSlate.mockRejectedValue(new Error("slate pipeline exploded"));
    const res = await invoke("@/app/api/cron/generate-signal-slate/route");
    expect(res.status).toBe(500);
  });

  it("a REFUSED slate is NOT a 200 — a refusal is a failure shape", async () => {
    // The contract that was missing. generateSignalSlate REFUSES by resolving
    // with ok:false (a no-trace guard), not by throwing, so the route's catch
    // never runs and the refusal body is spread straight into a 200. A cron
    // that refused to mint answers 200 and reads as "the job ran".
    generateSignalSlate.mockResolvedValue(REFUSED_SLATE);
    const res = await invoke("@/app/api/cron/generate-signal-slate/route");
    const body = (await res.json()) as { ok: boolean; errors: string[] };
    expect(body.ok).toBe(false);
    // The status must not claim success. This is the assertion that pins it.
    expect(res.status).not.toBe(200);
  });

  it("a HEALTHY slate is a 200 with ok=true — the positive control", async () => {
    // Without this, a route that always 500s would pass the two tests above.
    generateSignalSlate.mockResolvedValue(HEALTHY_SLATE);
    const res = await invoke("@/app/api/cron/generate-signal-slate/route");
    const body = (await res.json()) as { ok: boolean; oddsApiRequired: boolean };
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    // The claim posture is a law, not a decoration: this cron must never be
    // readable as book-line backed.
    expect(body.oddsApiRequired).toBe(false);
  });

  it("never invents book odds, even on a healthy run", async () => {
    generateSignalSlate.mockResolvedValue(HEALTHY_SLATE);
    const res = await invoke("@/app/api/cron/generate-signal-slate/route");
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.claimPosture).toBe("experimental_model_signal_not_book_line");
  });
});

describe("GET /api/cron/autonomy-cycle", () => {
  const OK_PLAN = {
    severity: "LOW" as const,
    headline: "nominal",
    introspection: { honestyScore: 1, refuseDefaultHeld: true },
    autonomousQueue: [],
    ownerQueue: [],
  };
  const OK_CYCLE = { failedCount: 0, executedCount: 0, results: [] };

  beforeEach(() => {
    for (const m of [
      executeAutonomyCycle,
      planAutonomyCycle,
      computeLiveCapabilityProbes,
      classifyHealthAlertSnapshot,
      loadSettlementHealth,
      getReadinessGates,
      resolveBestFreeSpineSnapshot,
      freeSpineSnapAgeMs,
      resolveAutonomyBaseUrl,
    ]) {
      m.mockReset();
    }
    computeLiveCapabilityProbes.mockResolvedValue({ checks: { database: { status: "ok" } } });
    classifyHealthAlertSnapshot.mockReturnValue({
      ingestionAgeMinutes: 5,
      settlementUnavailable: false,
    });
    loadSettlementHealth.mockResolvedValue({
      health: "HEALTHY",
      overduePending: 0,
      commencedTotal: 5,
    });
    getReadinessGates.mockReturnValue({ minSettledPicksForLearning: 100 });
    resolveBestFreeSpineSnapshot.mockResolvedValue({ snap: null, source: "none" });
    freeSpineSnapAgeMs.mockReturnValue(null);
    resolveAutonomyBaseUrl.mockReturnValue("http://localhost:3000");
    planAutonomyCycle.mockReturnValue(OK_PLAN);
    executeAutonomyCycle.mockResolvedValue(OK_CYCLE);
  });

  it("a CLEAN cycle is a 200 with ok=true — the positive control", async () => {
    const res = await invoke("@/app/api/cron/autonomy-cycle/route");
    const body = (await res.json()) as { ok: boolean; dryRun: boolean };
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    // Dry-run is the DEFAULT and the thing that keeps this cron safe.
    expect(body.dryRun).toBe(true);
  });

  it("a cycle whose ACTIONS FAILED is not a 200 and not ok=true", async () => {
    // The defect: `cycle.failedCount` was only console.warn'd while the response
    // stayed ok:true on a 200, so failed autonomous work was invisible to every
    // status-reading consumer. This is the cron that decides what happens next.
    executeAutonomyCycle.mockResolvedValue({
      failedCount: 2,
      executedCount: 2,
      results: [{ ok: false }, { ok: false }],
    });
    const res = await invoke("@/app/api/cron/autonomy-cycle/route");
    const body = (await res.json()) as { ok: boolean; cycle: { failedCount: number } };
    expect(body.cycle.failedCount).toBe(2);
    expect(body.ok).toBe(false);
    expect(res.status).not.toBe(200);
  });
});

describe("GET /api/cron/jarvis-snapshot", () => {
  const ASSESSMENT = { launchStatus: "ok", publicSurfaceStatus: "ok" };

  beforeEach(() => {
    loadJarvisAssessment.mockReset();
    jarvisHistory.push.mockReset();
    jarvisHistory.size.mockReset();
    materializeJarvisDraftTasks.mockReset();
    persistJarvisHistorySnapshot.mockReset();

    loadJarvisAssessment.mockResolvedValue({ assessment: ASSESSMENT });
    jarvisHistory.push.mockReturnValue({
      assessedAt: "2026-09-28T00:00:00.000Z",
      launchStatus: "ok",
      publicSurfaceStatus: "ok",
      ingestionStatus: "ok",
      settlementStatus: "ok",
      safetyWarningCount: 0,
      recommendedActionCount: 0,
    });
    jarvisHistory.size.mockReturnValue(1);
    materializeJarvisDraftTasks.mockReturnValue([]);
    // The REAL return type, read from jarvis-history-durable.ts:20-47:
    // Promise<"ok" | "stub" | "error">. I first wrote this test against an
    // invented `{persisted:boolean}` object and it passed against a route that
    // had no such field — a test that pins a shape I made up. The string is the
    // actual contract, and "error" is the value that must not read as success.
    persistJarvisHistorySnapshot.mockResolvedValue("ok");
  });

  it("a HEALTHY snapshot is a 200 with ok=true — the positive control", async () => {
    const res = await invoke("@/app/api/cron/jarvis-snapshot/route");
    const body = (await res.json()) as { ok: boolean; path: string };
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.path).toBe("jarvis-snapshot");
  });

  it("a THROWN assessment is a 500, never a 200", async () => {
    loadJarvisAssessment.mockRejectedValue(new Error("jarvis data unavailable"));
    const res = await invoke("@/app/api/cron/jarvis-snapshot/route");
    expect(res.status).toBe(500);
  });

  it("a FAILED durable persist is not reported as a clean snapshot", async () => {
    // The defect. `persistJarvisHistorySnapshot` NEVER THROWS — it catches
    // internally and returns the string "error" — so the route's outer catch
    // could not see it, and the response was `ok: true` on a 200 anyway. That
    // defeats the stated purpose of the durable call in this route's own
    // header: "so multi-instance cockpit trend survives isolate recycle". On a
    // failed write the only copy is the process-local ring buffer, and it dies
    // on the next recycle while the history looks unbroken.
    persistJarvisHistorySnapshot.mockResolvedValue("error");
    const res = await invoke("@/app/api/cron/jarvis-snapshot/route");
    const body = (await res.json()) as { ok: boolean; durable: string; durableMeaning: string };
    expect(body.durable).toBe("error");
    expect(body.ok).toBe(false);
    expect(res.status).not.toBe(200);
    // And it must say the history does not survive recycle, so nobody reads a
    // clean-looking cockpit trend off a memory-only buffer.
    expect(body.durableMeaning).toMatch(/FAILED|does NOT survive/i);
  });

  it("a STUB durable layer is ok but never claims a durable history", async () => {
    // "stub" is the sanctioned no-DB path (isStubMode), not a failure. It must
    // stay a 200 — but it must ALSO not be readable as a real durable history,
    // or the honest no-op becomes a false durability claim.
    persistJarvisHistorySnapshot.mockResolvedValue("stub");
    const res = await invoke("@/app/api/cron/jarvis-snapshot/route");
    const body = (await res.json()) as { ok: boolean; durable: string; durableMeaning: string };
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.durableMeaning).toMatch(/process-local|does NOT survive|no database/i);
  });
});
