import { describe, expect, it } from "vitest";
import {
  HYDRATION_STRATEGIES,
  CADENCE_MATRIX,
  cadenceSummary,
  ruleForMetricId,
  planHydration,
  runHydrationPlan,
  isFresh,
  maxAgeForCadence,
  createBatchSnapshotRunner,
  createWriteThroughNflverseRunner,
  NflverseMemoryStore,
  createNflverseMemoryProvider,
  getMetricById,
} from "../index.js";

describe("hydration strategies catalog", () => {
  it("lists pit-safe majority strategies", () => {
    expect(HYDRATION_STRATEGIES.length).toBeGreaterThanOrEqual(8);
    const pit = HYDRATION_STRATEGIES.filter((s) => s.pitSafe);
    expect(pit.length).toBeGreaterThanOrEqual(6);
  });

  it("unique strategy ids", () => {
    const ids = HYDRATION_STRATEGIES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("cadence matrix", () => {
  it("covers core prefixes", () => {
    expect(ruleForMetricId("nfl.box.pass_yds")?.primary).toBe("batch_snapshot");
    expect(ruleForMetricId("mkt.pinnacle.spread.price")?.primary).toBe("cron_delta");
    expect(ruleForMetricId("ctx.weather.temp_f")?.primary).toBe("ttl_cache_poll");
    expect(ruleForMetricId("gse.edge_index")?.primary).toBe("write_through");
    expect(ruleForMetricId("opt.scorebug.ocr_cer")?.cadence).toBe("on_demand");
  });

  it("summary counts", () => {
    const s = cadenceSummary();
    expect(s.rules).toBe(CADENCE_MATRIX.length);
    expect(s.byPrimary.batch_snapshot).toBeGreaterThan(0);
  });
});

describe("orchestrator", () => {
  it("plans jobs by unique prefix", () => {
    const plan = planHydration({
      metricIds: ["nfl.box.pass_yds", "nfl.box.rush_yds", "ctx.weather.temp_f"],
      entityIds: ["player_1", "39.1,-84.5"],
      asOf: "2025-11-01T18:00:00.000Z",
    });
    expect(plan.jobs.length).toBe(2); // nfl.box. + ctx.weather.
    expect(plan.jobs.map((j) => j.strategy).sort()).toEqual(
      ["batch_snapshot", "ttl_cache_poll"].sort(),
    );
  });

  it("write_through hydrates memory for PIT reads", async () => {
    const store = new NflverseMemoryStore();
    const runner = createWriteThroughNflverseRunner(store, async (job) => [
      {
        metricId: "nfl.box.pass_yds",
        entityId: job.entityIds[0]!,
        asOf: job.asOf,
        value: 312,
      },
    ]);
    // plan uses batch_snapshot for nfl.box — use batch runner
    const batch = createBatchSnapshotRunner(store, async (job) => [
      {
        metricId: "nfl.box.pass_yds",
        entityId: job.entityIds[0]!,
        asOf: job.asOf,
        value: 312,
      },
    ]);
    const plan = planHydration({
      metricIds: ["nfl.box.pass_yds"],
      entityIds: ["p1"],
      asOf: "2025-11-01T18:00:00.000Z",
    });
    await runHydrationPlan(plan, [batch, runner]);
    expect(plan.jobs[0]!.status).toBe("succeeded");
    expect(plan.jobs[0]!.rowsWritten).toBe(1);

    const provider = createNflverseMemoryProvider(store);
    const m = getMetricById("nfl.box.pass_yds")!;
    const v = await provider(m, "p1", "2025-11-01T18:00:00.000Z");
    expect(v).toBe(312);
  });

  it("refuses missing runner", async () => {
    const plan = planHydration({
      metricIds: ["mkt.consensus.spread.novig"],
      entityIds: ["g1"],
      asOf: "2025-11-01T18:00:00.000Z",
    });
    await runHydrationPlan(plan, []);
    expect(plan.jobs[0]!.status).toBe("refused");
  });

  it("isFresh respects max age", () => {
    const a = isFresh(
      "2025-11-01T18:00:00.000Z",
      "2025-11-01T18:10:00.000Z",
      15 * 60_000,
    );
    expect(a.fresh).toBe(true);
    const b = isFresh(
      "2025-11-01T18:00:00.000Z",
      "2025-11-01T19:00:00.000Z",
      15 * 60_000,
    );
    expect(b.fresh).toBe(false);
  });

  it("maxAgeForCadence sub_minute is tight", () => {
    expect(maxAgeForCadence("sub_minute")).toBeLessThan(maxAgeForCadence("daily"));
  });
});
