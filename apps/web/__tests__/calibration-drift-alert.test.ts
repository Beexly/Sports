import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Post-publish drift alert (2026-09-05).
 *
 * Once a publish receipt says the calibration claim is live, a later
 * evaluation that drops the eligibility streak (GREEN to RED, or a building
 * streak resetting to 0) must leave a DURABLE marker, the ops truth surface
 * must expose it, and the health-alert decision must treat it as unhealthy so
 * the existing webhook path pages. A later GREEN clears it. RED before any
 * publish is not drift: nothing was claimed, so nothing drifted.
 *
 * The store below is append-only and keyed by scope, exactly how the durable
 * module reads JarvisMemoryEvent (latest row per scope wins).
 */

type StoredRow = { scope: string; metadata: unknown; full_text: string | null };
const store: StoredRow[] = [];
const createMock = vi.fn();
const findFirstMock = vi.fn();

vi.mock("@sports/db", () => ({
  isStubMode: () => false,
  db: {
    jarvisMemoryEvent: {
      create: (...args: unknown[]) => createMock(...args),
      findFirst: (...args: unknown[]) => findFirstMock(...args),
    },
    // The read path seeds metrics only when none are stored; every test stores them.
    pick: { findMany: async () => [] },
  },
}));

import {
  CAL_DRIFT_SCOPE,
  CAL_ELIGIBILITY_SCOPE,
  CAL_METRICS_SCOPE,
  CAL_PUBLISH_SCOPE,
  calibrationDriftPosture,
  consecutiveGreenPriorForBasis,
  detectCalibrationDriftTransition,
  evaluateAndPersistEligibility,
  failingFloorsFromReport,
  loadActiveCalibrationDrift,
  loadCalibrationDrift,
  loadCalibrationOpsSurface,
  metricsPBasis,
  snapPBasis,
  type CalibrationDriftMarker,
  type DurableMetricsPayload,
  type EligibilityDurableSnap,
  type PublishReceipt,
} from "@/lib/ops/calibration-eligibility-durable";
import { evaluateCalibrationEligibility } from "@/lib/ops/calibration-eligibility";
import {
  classifyHealthAlertSnapshot,
  decideHealthAlertStateless,
} from "@/lib/ops/health-alert-decision";

// 02:07Z sits mid-way through the 00:00-04:00 wall-clock block, so the clock
// ladder is silent for every tick in these tests and only the drift ladder can fire.
const NOW = new Date("2026-09-05T02:07:00.000Z");

const GREEN_OVERALL = {
  brier: 0.15,
  ece: 0.03,
  mce: 0.06,
  murphy: { reliability: 0.004, resolution: 0.02, uncertainty: 0.24 },
};
const RED_OVERALL = {
  brier: 0.26,
  ece: 0.09,
  mce: 0.2,
  murphy: { reliability: 0.07, resolution: 0.01, uncertainty: 0.24 },
};

function metrics(generatedAt: string, overall: DurableMetricsPayload["overall"]): DurableMetricsPayload {
  return {
    generatedAt,
    gitSha: null,
    n: 120,
    status: "ok",
    modelVersion: "v5.2.7",
    dateRange: "2026-08-01..2026-09-01",
    overall,
  };
}

const RUN_INPUT = { canonicalSettled: 150, minSettledForLearning: 100, settlementHealthy: true };

function seed(scope: string, value: unknown): void {
  store.push({ scope, metadata: value, full_text: JSON.stringify(value) });
}

function rows(scope: string): StoredRow[] {
  return store.filter((r) => r.scope === scope);
}

function seedReceipt(published: boolean): PublishReceipt {
  const receipt: PublishReceipt = {
    published,
    at: "2026-09-04T18:00:00.000Z",
    source: published ? "auto" : "unpublish",
    note: published ? "Auto-publish: eligibility GREEN for required streak" : "Auto-unpublish",
  };
  seed(CAL_PUBLISH_SCOPE, receipt);
  return receipt;
}

/** A prior GREEN snap (streak 3/3) evaluated on an earlier metrics artifact. */
function seedGreenSnap(metricsGeneratedAt: string): EligibilityDurableSnap {
  const report = evaluateCalibrationEligibility({
    metrics: {
      n: 120,
      ...GREEN_OVERALL,
      modelVersion: "v5.2.7",
      dateRange: "2026-08-01..2026-09-01",
      generatedAt: metricsGeneratedAt,
    },
    ...RUN_INPUT,
    consecutiveGreenPrior: 2,
    streakRequired: 3,
  });
  expect(report.status).toBe("GREEN");
  const snap: EligibilityDurableSnap = { evaluatedAt: metricsGeneratedAt, metricsGeneratedAt, report };
  seed(CAL_ELIGIBILITY_SCOPE, snap);
  return snap;
}

const HEALTHY_PROBES = {
  checks: {
    database: { status: "ok" },
    ingestion: { status: "ok", ageMinutes: 30 },
  },
  capabilities: [{ capabilityId: "settlement", status: "healthy" }],
};

beforeEach(() => {
  store.length = 0;
  createMock.mockReset();
  findFirstMock.mockReset();
  createMock.mockImplementation(async (args: unknown) => {
    const data = (args as { data: { scope: string; metadata: unknown; full_text: string } }).data;
    store.push({ scope: data.scope, metadata: data.metadata, full_text: data.full_text });
    return { id: `row-${store.length}` };
  });
  findFirstMock.mockImplementation(async (args: unknown) => {
    const scope = (args as { where: { scope: string } }).where.scope;
    for (let i = store.length - 1; i >= 0; i -= 1) {
      const row = store[i]!;
      if (row.scope === scope) return { full_text: row.full_text, metadata: row.metadata };
    }
    return null;
  });
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("GREEN then RED after a publish receipt", () => {
  it("writes the durable drift marker and the health decision pages on it", async () => {
    const receipt = seedReceipt(true);
    seedGreenSnap("2026-09-04T18:00:00.000Z");

    const out = await evaluateAndPersistEligibility({
      metrics: metrics("2026-09-05T00:00:00.000Z", RED_OVERALL),
      ...RUN_INPUT,
    });

    expect(out.skippedDuplicate).toBe(false);
    expect(out.eligibility.status).toBe("RED");
    expect(out.eligibility.consecutiveGreen).toBe(0);

    // The marker landed in the drift scope with the same append-only pattern.
    expect(rows(CAL_DRIFT_SCOPE)).toHaveLength(1);
    const marker = out.drift;
    expect(marker).not.toBeNull();
    expect(marker?.active).toBe(true);
    expect(marker?.since).toBe(NOW.toISOString());
    expect(marker?.previousStatus).toBe("GREEN");
    expect(marker?.currentStatus).toBe("RED");
    expect(marker?.previousConsecutiveGreen).toBe(3);
    expect(marker?.currentConsecutiveGreen).toBe(0);
    expect(marker?.publishedAt).toBe(receipt.at);
    expect(marker?.metricsGeneratedAt).toBe("2026-09-05T00:00:00.000Z");
    expect(marker?.clearedAt).toBeNull();
    // Floors named from the report's own floors (0.22 / 0.05 / 0.05), never redefined here.
    expect(marker?.failingFloors).toEqual([
      "brier 0.2600 > 0.22",
      "ece 0.0900 > 0.05",
      "murphy reliability 0.0700 > 0.05",
    ]);

    // Durable read-back is what the health cron and the ops surface consume.
    const active = await loadActiveCalibrationDrift();
    expect(active).toEqual(marker);
    const posture = calibrationDriftPosture(active);
    expect(posture?.since).toBe(NOW.toISOString());
    expect(posture?.failingFloors).toEqual(marker?.failingFloors);
    expect(posture?.operatorHint).toMatch(/must stay dark until eligibility is GREEN again/);

    // Health-alert: every probe healthy, drift alone makes the snapshot unhealthy.
    const snap = classifyHealthAlertSnapshot({ ...HEALTHY_PROBES, calibrationDrift: posture });
    expect(snap.unhealthy).toBe(true);
    expect(snap.reason).toMatch(/calibrationDrift=GREEN->RED since 2026-09-05T02:07:00\.000Z/);
    expect(snap.reason).toMatch(/brier 0\.2600 > 0\.22/);

    // First tick after the marker (5 minutes later) crosses the onset rung and pages.
    const onset = decideHealthAlertStateless(snap, NOW.getTime() + 5 * 60_000);
    expect(onset.shouldAlert).toBe(true);
    expect(onset.reason).toMatch(/drift-rung 0→1/);
    // An hour in, still unhealthy but laddered quiet (same 4h block, no new rung).
    const later = decideHealthAlertStateless(snap, NOW.getTime() + 60 * 60_000);
    expect(later.shouldAlert).toBe(false);
    expect(later.reason).toMatch(/laddered-quiet/);
    // Six hours in: the next drift rung fires (the drift ladder is checked before
    // the clock ladder, so the reason names the rung even at 08:07Z).
    const sixHours = decideHealthAlertStateless(snap, NOW.getTime() + 360 * 60_000);
    expect(sixHours.shouldAlert).toBe(true);
    expect(sixHours.reason).toMatch(/drift-rung 1→2/);
  });

  it("keeps the marker pinned through repeated RED runs (since does not re-mint)", async () => {
    seedReceipt(true);
    seedGreenSnap("2026-09-04T18:00:00.000Z");
    const first = await evaluateAndPersistEligibility({
      metrics: metrics("2026-09-05T00:00:00.000Z", RED_OVERALL),
      ...RUN_INPUT,
    });
    expect(first.drift?.active).toBe(true);

    vi.setSystemTime(new Date(NOW.getTime() + 6 * 60 * 60_000));
    const second = await evaluateAndPersistEligibility({
      metrics: metrics("2026-09-05T06:00:00.000Z", RED_OVERALL),
      ...RUN_INPUT,
    });
    expect(second.eligibility.status).toBe("RED");
    expect(rows(CAL_DRIFT_SCOPE)).toHaveLength(1);
    expect(second.drift?.since).toBe(first.drift?.since);

    // Same artifact again: idempotent path still reports the open marker.
    const dup = await evaluateAndPersistEligibility({
      metrics: metrics("2026-09-05T06:00:00.000Z", RED_OVERALL),
      ...RUN_INPUT,
    });
    expect(dup.skippedDuplicate).toBe(true);
    expect(dup.drift?.since).toBe(first.drift?.since);
    expect(rows(CAL_DRIFT_SCOPE)).toHaveLength(1);
  });

  it("raises on a building streak resetting while a receipt is live (RED 2/3 to RED 0/3)", async () => {
    seedReceipt(true);
    const building = evaluateCalibrationEligibility({
      metrics: {
        n: 120,
        ...GREEN_OVERALL,
        modelVersion: "v5.2.7",
        dateRange: "2026-08-01..2026-09-01",
        generatedAt: "2026-09-04T18:00:00.000Z",
      },
      ...RUN_INPUT,
      consecutiveGreenPrior: 1,
      streakRequired: 3,
    });
    expect(building.status).toBe("RED");
    expect(building.consecutiveGreen).toBe(2);
    seed(CAL_ELIGIBILITY_SCOPE, {
      evaluatedAt: "2026-09-04T18:00:00.000Z",
      metricsGeneratedAt: "2026-09-04T18:00:00.000Z",
      report: building,
    } satisfies EligibilityDurableSnap);

    const out = await evaluateAndPersistEligibility({
      metrics: metrics("2026-09-05T00:00:00.000Z", RED_OVERALL),
      ...RUN_INPUT,
    });
    expect(out.drift?.active).toBe(true);
    expect(out.drift?.previousStatus).toBe("RED");
    expect(out.drift?.previousConsecutiveGreen).toBe(2);
    expect(out.drift?.currentConsecutiveGreen).toBe(0);
    expect(out.drift?.note).toMatch(/streak 2 reset to 0/);
  });
});

describe("RED before any publish", () => {
  it("does not raise drift with no receipt at all", async () => {
    seedGreenSnap("2026-09-04T18:00:00.000Z");
    const out = await evaluateAndPersistEligibility({
      metrics: metrics("2026-09-05T00:00:00.000Z", RED_OVERALL),
      ...RUN_INPUT,
    });
    expect(out.eligibility.status).toBe("RED");
    expect(out.drift).toBeNull();
    expect(rows(CAL_DRIFT_SCOPE)).toHaveLength(0);
    expect(await loadActiveCalibrationDrift()).toBeNull();

    const snap = classifyHealthAlertSnapshot({ ...HEALTHY_PROBES, calibrationDrift: null });
    expect(snap.unhealthy).toBe(false);
    expect(snap.reason).toBe("ok");
    expect(decideHealthAlertStateless(snap, NOW.getTime()).shouldAlert).toBe(false);
  });

  it("does not raise drift when the latest receipt is an unpublish", async () => {
    seedReceipt(false);
    seedGreenSnap("2026-09-04T18:00:00.000Z");
    const out = await evaluateAndPersistEligibility({
      metrics: metrics("2026-09-05T00:00:00.000Z", RED_OVERALL),
      ...RUN_INPUT,
    });
    expect(out.eligibility.status).toBe("RED");
    expect(out.drift).toBeNull();
    expect(rows(CAL_DRIFT_SCOPE)).toHaveLength(0);
  });

  it("does not raise drift on the very first evaluation (no prior snap)", async () => {
    seedReceipt(true);
    const out = await evaluateAndPersistEligibility({
      metrics: metrics("2026-09-05T00:00:00.000Z", RED_OVERALL),
      ...RUN_INPUT,
    });
    expect(out.drift).toBeNull();
    expect(rows(CAL_DRIFT_SCOPE)).toHaveLength(0);
  });
});

describe("GREEN again clears it", () => {
  it("stays open while the streak rebuilds and clears on the GREEN run", async () => {
    seedReceipt(true);
    seedGreenSnap("2026-09-04T18:00:00.000Z");
    const drifted = await evaluateAndPersistEligibility({
      metrics: metrics("2026-09-05T00:00:00.000Z", RED_OVERALL),
      ...RUN_INPUT,
    });
    expect(drifted.drift?.active).toBe(true);

    // Two floor-passing runs: status is still RED (streak 1/3, 2/3), drift stays open.
    const g1 = await evaluateAndPersistEligibility({
      metrics: metrics("2026-09-05T06:00:00.000Z", GREEN_OVERALL),
      ...RUN_INPUT,
    });
    expect(g1.eligibility.status).toBe("RED");
    expect(g1.eligibility.consecutiveGreen).toBe(1);
    expect(g1.drift?.active).toBe(true);
    const g2 = await evaluateAndPersistEligibility({
      metrics: metrics("2026-09-05T12:00:00.000Z", GREEN_OVERALL),
      ...RUN_INPUT,
    });
    expect(g2.eligibility.consecutiveGreen).toBe(2);
    expect(g2.drift?.active).toBe(true);
    expect(rows(CAL_DRIFT_SCOPE)).toHaveLength(1);

    // Third: GREEN. A cleared row is appended; the open marker is gone.
    const clearedAt = new Date(NOW.getTime() + 18 * 60 * 60_000);
    vi.setSystemTime(clearedAt);
    const g3 = await evaluateAndPersistEligibility({
      metrics: metrics("2026-09-05T18:00:00.000Z", GREEN_OVERALL),
      ...RUN_INPUT,
    });
    expect(g3.eligibility.status).toBe("GREEN");
    expect(g3.drift).toBeNull();
    expect(rows(CAL_DRIFT_SCOPE)).toHaveLength(2);

    const latest = await loadCalibrationDrift();
    expect(latest?.active).toBe(false);
    expect(latest?.clearedAt).toBe(clearedAt.toISOString());
    expect(latest?.since).toBe(drifted.drift?.since);
    expect(latest?.currentStatus).toBe("GREEN");
    expect(await loadActiveCalibrationDrift()).toBeNull();
    expect(calibrationDriftPosture(latest)).toBeNull();

    const snap = classifyHealthAlertSnapshot({
      ...HEALTHY_PROBES,
      calibrationDrift: calibrationDriftPosture(await loadActiveCalibrationDrift()),
    });
    expect(snap.unhealthy).toBe(false);
    expect(decideHealthAlertStateless(snap, clearedAt.getTime() + 5 * 60_000).shouldAlert).toBe(false);
  });
});

describe("read path (loadCalibrationOpsSurface) observes the same transition", () => {
  it("writes the marker when the ops surface is first to evaluate a RED artifact", async () => {
    seedReceipt(true);
    seedGreenSnap("2026-09-04T18:00:00.000Z");
    seed(CAL_METRICS_SCOPE, metrics("2026-09-05T00:00:00.000Z", RED_OVERALL));

    const surface = await loadCalibrationOpsSurface(RUN_INPUT);
    expect(surface.eligibility.status).toBe("RED");
    expect(surface.drift?.active).toBe(true);
    expect(surface.drift?.previousStatus).toBe("GREEN");
    expect(rows(CAL_DRIFT_SCOPE)).toHaveLength(1);

    // A second read of the same artifact does not re-evaluate; it still reports the open marker.
    const again = await loadCalibrationOpsSurface(RUN_INPUT);
    expect(again.drift?.since).toBe(surface.drift?.since);
    expect(rows(CAL_DRIFT_SCOPE)).toHaveLength(1);
  });
});

describe("pure transition rule", () => {
  const green = evaluateCalibrationEligibility({
    metrics: { n: 120, ...GREEN_OVERALL, modelVersion: "v5.2.7", dateRange: null, generatedAt: "a" },
    ...RUN_INPUT,
    consecutiveGreenPrior: 2,
    streakRequired: 3,
  });
  const red = evaluateCalibrationEligibility({
    metrics: { n: 120, ...RED_OVERALL, modelVersion: "v5.2.7", dateRange: null, generatedAt: "b" },
    ...RUN_INPUT,
    consecutiveGreenPrior: 3,
    streakRequired: 3,
  });
  const receipt: PublishReceipt = { published: true, at: "2026-09-04T18:00:00.000Z", source: "auto", note: "" };

  it("leaves an open marker untouched on further RED runs and never raises without a prior", () => {
    const open: CalibrationDriftMarker = {
      active: true,
      since: "2026-09-05T00:00:00.000Z",
      observedAt: "2026-09-05T00:00:00.000Z",
      previousStatus: "GREEN",
      currentStatus: "RED",
      previousConsecutiveGreen: 3,
      currentConsecutiveGreen: 0,
      failingFloors: ["brier 0.2600 > 0.22"],
      reasons: red.reasons,
      publishedAt: receipt.at,
      publishedSource: "auto",
      metricsGeneratedAt: "b",
      clearedAt: null,
      note: "",
    };
    expect(
      detectCalibrationDriftTransition({ prior: red, current: red, receipt, openDrift: open, metricsGeneratedAt: "c", now: NOW }),
    ).toBeNull();
    expect(
      detectCalibrationDriftTransition({ prior: null, current: red, receipt, openDrift: null, metricsGeneratedAt: "c", now: NOW }),
    ).toBeNull();
    // GREEN with nothing open: nothing to clear, nothing written.
    expect(
      detectCalibrationDriftTransition({ prior: red, current: green, receipt, openDrift: null, metricsGeneratedAt: "c", now: NOW }),
    ).toBeNull();
  });

  it("names failing floors from the report's own floors and none on a passing run", () => {
    expect(failingFloorsFromReport(green)).toEqual([]);
    expect(failingFloorsFromReport(red)).toEqual([
      "brier 0.2600 > 0.22",
      "ece 0.0900 > 0.05",
      "murphy reliability 0.0700 > 0.05",
    ]);
  });
});

describe("streak continuity across the sample definition (pBasis)", () => {
  // A PROVEN streak is three consecutive green runs under ONE sample
  // definition. Snaps persisted before v5.2.8 Phase 2 carry no pBasis and were
  // scored on the retired confidence/blend hierarchy; they must not seed the
  // streak of the market-anchored sample, and the reverse holds too.
  const marketAnchored = (generatedAt: string): DurableMetricsPayload => ({
    ...metrics(generatedAt, GREEN_OVERALL),
    pBasis: "market_anchored",
  });

  function lastSnap(): EligibilityDurableSnap {
    const r = rows(CAL_ELIGIBILITY_SCOPE);
    return r[r.length - 1]!.metadata as EligibilityDurableSnap;
  }

  it("a prior GREEN snap without pBasis does not seed a market-anchored streak (cron path)", async () => {
    seedGreenSnap("2026-09-04T18:00:00.000Z"); // legacy: no pBasis, streak 3/3
    const out = await evaluateAndPersistEligibility({
      metrics: marketAnchored("2026-09-05T00:00:00.000Z"),
      ...RUN_INPUT,
    });
    // Floors pass on the new basis, but the streak restarts: 1/3, not 4/3 and not GREEN.
    expect(out.eligibility.runMeetsFloors).toBe(true);
    expect(out.eligibility.consecutiveGreen).toBe(1);
    expect(out.eligibility.status).toBe("RED");
    expect(out.publish.published).toBe(false);

    const snap = lastSnap();
    expect(snap.pBasis).toBe("market_anchored");
    expect(snap.streakResetFromBasis).toBe("legacy");
    expect(snap.report.consecutiveGreen).toBe(1);
  });

  it("a prior GREEN snap under the same basis does seed the streak", async () => {
    const priorReport = evaluateCalibrationEligibility({
      metrics: { n: 120, ...GREEN_OVERALL, modelVersion: "v5.2.7", dateRange: null, generatedAt: "2026-09-04T18:00:00.000Z" },
      ...RUN_INPUT,
      consecutiveGreenPrior: 1,
      streakRequired: 3,
    });
    expect(priorReport.consecutiveGreen).toBe(2);
    seed(CAL_ELIGIBILITY_SCOPE, {
      evaluatedAt: "2026-09-04T18:00:00.000Z",
      metricsGeneratedAt: "2026-09-04T18:00:00.000Z",
      report: priorReport,
      pBasis: "market_anchored",
      streakResetFromBasis: null,
    } satisfies EligibilityDurableSnap);

    const out = await evaluateAndPersistEligibility({
      metrics: marketAnchored("2026-09-05T00:00:00.000Z"),
      ...RUN_INPUT,
    });
    expect(out.eligibility.consecutiveGreen).toBe(3);
    expect(out.eligibility.status).toBe("GREEN");
    const snap = lastSnap();
    expect(snap.pBasis).toBe("market_anchored");
    expect(snap.streakResetFromBasis).toBeNull();
  });

  it("the reverse direction also resets: a market-anchored streak never seeds a legacy artifact", async () => {
    const priorReport = evaluateCalibrationEligibility({
      metrics: { n: 120, ...GREEN_OVERALL, modelVersion: "v5.2.7", dateRange: null, generatedAt: "2026-09-04T18:00:00.000Z" },
      ...RUN_INPUT,
      consecutiveGreenPrior: 2,
      streakRequired: 3,
    });
    expect(priorReport.status).toBe("GREEN");
    seed(CAL_ELIGIBILITY_SCOPE, {
      evaluatedAt: "2026-09-04T18:00:00.000Z",
      metricsGeneratedAt: "2026-09-04T18:00:00.000Z",
      report: priorReport,
      pBasis: "market_anchored",
    } satisfies EligibilityDurableSnap);

    const out = await evaluateAndPersistEligibility({
      metrics: metrics("2026-09-05T00:00:00.000Z", GREEN_OVERALL), // no pBasis: legacy
      ...RUN_INPUT,
    });
    expect(out.eligibility.consecutiveGreen).toBe(1);
    expect(out.eligibility.status).toBe("RED");
    expect(lastSnap().streakResetFromBasis).toBe("market_anchored");
  });

  it("the read path (loadCalibrationOpsSurface) applies the same reset and records the basis on the snap it persists", async () => {
    seedGreenSnap("2026-09-04T18:00:00.000Z"); // legacy 3/3
    seed(CAL_METRICS_SCOPE, marketAnchored("2026-09-05T00:00:00.000Z"));

    const surface = await loadCalibrationOpsSurface(RUN_INPUT);
    expect(surface.eligibility.runMeetsFloors).toBe(true);
    expect(surface.eligibility.consecutiveGreen).toBe(1);
    expect(surface.eligibility.status).toBe("RED");
    const snap = lastSnap();
    expect(snap.metricsGeneratedAt).toBe("2026-09-05T00:00:00.000Z");
    expect(snap.pBasis).toBe("market_anchored");
    expect(snap.streakResetFromBasis).toBe("legacy");

    // The next cron run on a newer market-anchored artifact builds on 1, not on the legacy 3.
    const next = await evaluateAndPersistEligibility({
      metrics: marketAnchored("2026-09-05T06:00:00.000Z"),
      ...RUN_INPUT,
    });
    expect(next.eligibility.consecutiveGreen).toBe(2);
    expect(next.eligibility.status).toBe("RED");
    expect(lastSnap().streakResetFromBasis).toBeNull();
  });

  it("a legacy GREEN that was published shows as drift when the basis changes (the claim lost its support)", async () => {
    seedReceipt(true);
    seedGreenSnap("2026-09-04T18:00:00.000Z");
    const out = await evaluateAndPersistEligibility({
      metrics: marketAnchored("2026-09-05T00:00:00.000Z"),
      ...RUN_INPUT,
    });
    expect(out.eligibility.status).toBe("RED");
    expect(out.eligibility.consecutiveGreen).toBe(1);
    // GREEN to RED with a live receipt: drift is raised even though every floor passes;
    // the failing list is empty and the reasons carry the streak.
    expect(out.drift?.active).toBe(true);
    expect(out.drift?.previousStatus).toBe("GREEN");
    expect(out.drift?.failingFloors).toEqual([]);
    expect(rows(CAL_DRIFT_SCOPE)).toHaveLength(1);
  });

  it("pure helpers: absent pBasis reads as legacy; a differing basis zeroes the prior", () => {
    expect(metricsPBasis(null)).toBe("legacy");
    expect(metricsPBasis(metrics("x", GREEN_OVERALL))).toBe("legacy");
    expect(metricsPBasis(marketAnchored("x"))).toBe("market_anchored");
    expect(snapPBasis(null)).toBe("legacy");

    const greenReport = evaluateCalibrationEligibility({
      metrics: { n: 120, ...GREEN_OVERALL, modelVersion: "v5.2.7", dateRange: null, generatedAt: "a" },
      ...RUN_INPUT,
      consecutiveGreenPrior: 2,
      streakRequired: 3,
    });
    const legacySnap: EligibilityDurableSnap = { evaluatedAt: "a", metricsGeneratedAt: "a", report: greenReport };
    expect(consecutiveGreenPriorForBasis(null, "market_anchored")).toEqual({ consecutiveGreenPrior: 0, streakResetFromBasis: null });
    expect(consecutiveGreenPriorForBasis(legacySnap, "market_anchored")).toEqual({ consecutiveGreenPrior: 0, streakResetFromBasis: "legacy" });
    expect(consecutiveGreenPriorForBasis(legacySnap, "legacy")).toEqual({ consecutiveGreenPrior: 3, streakResetFromBasis: null });
    expect(consecutiveGreenPriorForBasis({ ...legacySnap, pBasis: "market_anchored" }, "market_anchored")).toEqual({ consecutiveGreenPrior: 3, streakResetFromBasis: null });
    // A prior that failed its floors seeds 0 under any basis.
    const redReport = evaluateCalibrationEligibility({
      metrics: { n: 120, ...RED_OVERALL, modelVersion: "v5.2.7", dateRange: null, generatedAt: "b" },
      ...RUN_INPUT,
      consecutiveGreenPrior: 3,
      streakRequired: 3,
    });
    expect(consecutiveGreenPriorForBasis({ ...legacySnap, report: redReport, pBasis: "market_anchored" }, "market_anchored")).toEqual({ consecutiveGreenPrior: 0, streakResetFromBasis: null });
  });
});

describe("surfaces are wired", () => {
  const root = resolve(__dirname, "..");

  it("public-surface-truth exposes calibrationDrift from the durable marker", () => {
    const src = readFileSync(resolve(root, "app/api/ops/public-surface-truth/route.ts"), "utf8");
    expect(src).toMatch(/calibrationDriftPosture\(cal\.drift/);
    expect(src).toMatch(/calibrationDrift: calibrationDrift\s*\?\s*\{/);
    for (const field of ["since", "previousStatus", "currentStatus", "failingFloors"]) {
      expect(src).toMatch(new RegExp(`${field}: calibrationDrift\\.${field}`));
    }
  });

  it("health-alert cron loads the marker and feeds it to the classifier and the webhook", () => {
    const src = readFileSync(resolve(root, "app/api/cron/health-alert/route.ts"), "utf8");
    expect(src).toMatch(/loadActiveCalibrationDrift\(\)/);
    expect(src).toMatch(/classifyHealthAlertSnapshot\(\{[\s\S]*calibrationDrift,[\s\S]*\}\)/);
    expect(src).toMatch(/postWebhook\(\{[\s\S]*calibrationDrift: calibrationDrift/);
  });
});
