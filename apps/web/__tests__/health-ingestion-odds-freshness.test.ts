import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * REGRESSION: the only pager read a forgeable ingestion signal.
 *
 * `computeLiveCapabilityProbes` derived `checks.ingestion` from
 * `db.ingestionRun.findFirst({ where: { status: "SUCCESS" } })` — SUCCESS alone,
 * with NO `oddsInserted` filter. Three writers legitimately stamp SUCCESS with
 * `oddsInserted: 0`:
 *
 *   • packages/ingestion-pipeline/src/process-sport.ts — quiet-board skip
 *   • packages/ingestion-pipeline/src/process-sport.ts — main path, no odds back
 *   • apps/web/lib/data-sources/free-ingestion-run.ts — called every 2h by
 *     /api/cron/free-spine-health with `oddsInserted: 0` HARDCODED, gated only
 *     on a free ESPN score probe.
 *
 * So a TOTAL paid-odds outage still produced a minutes-old SUCCESS row, this
 * probe computed an ingestion age near zero, and `classifyHealthAlertSnapshot`
 * (which escalates only above 90m) reported healthy forever — while stored odds
 * aged past MAX_CANDIDATE_ODDS_AGE_MS (6h) and the board emptied for every
 * paying subscriber. Nothing paged anyone.
 *
 * Every other IngestionRun freshness consumer already used the stricter
 * predicate `{ status: "SUCCESS", oddsInserted: { gt: 0 } }`:
 *   lib/data-reliability/public-freshness-gate.ts, lib/engine/load-engine-story.ts,
 *   lib/statking/king-standard-loader.ts, api/ops/public-surface-truth/route.ts.
 *
 * These tests execute the probe against a fake IngestionRun store that HONOURS
 * the `where` clause (a canned findMany/findFirst return value would not bite —
 * it would pass with either predicate). What is asserted is which row the probe
 * is allowed to see.
 */

type Row = {
  status: string;
  oddsInserted: number;
  completedAt: Date | null;
};

const store: { rows: Row[] } = { rows: [] };

type WhereClause = {
  status?: string;
  oddsInserted?: number | { gt?: number; gte?: number };
};

/** Minimal Prisma-faithful evaluation of the `where` the probe actually sends. */
function matches(row: Row, where: WhereClause): boolean {
  if (where.status !== undefined && row.status !== where.status) return false;
  const odds = where.oddsInserted;
  if (odds !== undefined) {
    if (typeof odds === "number") {
      if (row.oddsInserted !== odds) return false;
    } else {
      if (typeof odds.gt === "number" && !(row.oddsInserted > odds.gt)) return false;
      if (typeof odds.gte === "number" && !(row.oddsInserted >= odds.gte)) return false;
    }
  }
  return true;
}

const mocks = vi.hoisted(() => ({
  ingestionRunFindFirst: vi.fn(),
  loadSettlementHealth: vi.fn(),
  nflverseTableCacheStats: vi.fn(),
  probeNflverseSourceCurrency: vi.fn(),
}));

vi.mock("@sports/db", () => ({
  db: {
    $queryRaw: vi.fn(async () => [{ "?column?": 1 }]),
    ingestionRun: { findFirst: mocks.ingestionRunFindFirst },
  },
  isStubMode: () => false,
}));

vi.mock("@/lib/performance/settlement-health", () => ({
  loadSettlementHealth: mocks.loadSettlementHealth,
}));

vi.mock("@sports/data-ingestion", () => ({
  nflverseTableCacheStats: mocks.nflverseTableCacheStats,
  probeNflverseSourceCurrency: mocks.probeNflverseSourceCurrency,
}));

import { computeLiveCapabilityProbes } from "@/lib/health/live-capability-probes";
import { classifyHealthAlertSnapshot } from "@/lib/ops/health-alert-decision";

const NOW = new Date("2026-08-25T18:00:00.000Z");

function minutesAgo(m: number): Date {
  return new Date(NOW.getTime() - m * 60_000);
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);

  store.rows = [];
  mocks.ingestionRunFindFirst.mockReset();
  mocks.ingestionRunFindFirst.mockImplementation(
    async (args: { where?: WhereClause } = {}) => {
      const where = args.where ?? {};
      const hits = store.rows
        .filter((r) => matches(r, where))
        // the probe orders by completedAt desc
        .sort((a, b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0));
      const hit = hits[0];
      return hit ? { completedAt: hit.completedAt } : null;
    },
  );

  mocks.loadSettlementHealth.mockReset();
  mocks.loadSettlementHealth.mockResolvedValue({ health: "HEALTHY" });

  mocks.nflverseTableCacheStats.mockReset();
  mocks.nflverseTableCacheStats.mockReturnValue({ entries: 3, misses: 0, failures: 0 });

  mocks.probeNflverseSourceCurrency.mockReset();
});

describe("health ingestion probe — odds-inserting SUCCESS is the only liveness signal", () => {
  it("a fresh SUCCESS row with oddsInserted: 0 does NOT satisfy the ingestion probe", async () => {
    // Exactly the row /api/cron/free-spine-health writes every 2 hours, and the
    // row process-sport.ts writes on a total paid-odds outage.
    store.rows = [{ status: "SUCCESS", oddsInserted: 0, completedAt: minutesAgo(3) }];

    const { checks } = await computeLiveCapabilityProbes();

    expect(checks["ingestion"]?.status).toBe("error");
    // No age is reported at all — there is no odds-inserting run to age.
    expect(checks["ingestion"]?.ageMinutes).toBeUndefined();
    expect(checks["ingestion"]?.lastSuccessAt).toBeUndefined();
  });

  it("a SUCCESS row with oddsInserted > 0 DOES satisfy it, and is the row that is aged", async () => {
    // A zero-odds SUCCESS 5m ago must not shadow the real odds-inserting run
    // from 30m ago: the reported age has to be the odds-inserting one.
    store.rows = [
      { status: "SUCCESS", oddsInserted: 0, completedAt: minutesAgo(5) },
      { status: "SUCCESS", oddsInserted: 5, completedAt: minutesAgo(30) },
    ];

    const { checks, capabilities } = await computeLiveCapabilityProbes();

    expect(checks["ingestion"]?.status).toBe("ok");
    expect(checks["ingestion"]?.ageMinutes).toBe(30);
    expect(checks["ingestion"]?.lastSuccessAt).toBe(minutesAgo(30).toISOString());
    expect(
      capabilities.find((c) => c.capabilityId === "ingestion")?.status,
    ).toBe("healthy");
  });

  it("BOTH guards hold together: a recent FAILED-with-odds run and a recent zero-odds SUCCESS still read as error", async () => {
    // The original guard (FAILED never counts) must survive the new one
    // (zero-odds SUCCESS never counts). Neither of these rows is evidence that
    // odds are flowing, so there is nothing fresh to report.
    store.rows = [
      { status: "FAILED", oddsInserted: 12, completedAt: minutesAgo(2) },
      { status: "SUCCESS", oddsInserted: 0, completedAt: minutesAgo(4) },
    ];

    const { checks } = await computeLiveCapabilityProbes();

    expect(checks["ingestion"]?.status).toBe("error");
    expect(checks["ingestion"]?.ageMinutes).toBeUndefined();
  });

  it("PAGES during a total paid-odds outage that keeps stamping zero-odds SUCCESS", async () => {
    // The production failure verbatim: the free spine keeps stamping SUCCESS
    // every 2h with oddsInserted: 0 while the last real odds insert is 9h old.
    // MAX_CANDIDATE_ODDS_AGE_MS is 6h, so the board is already empty.
    store.rows = [
      { status: "SUCCESS", oddsInserted: 0, completedAt: minutesAgo(7) },
      { status: "SUCCESS", oddsInserted: 0, completedAt: minutesAgo(127) },
      { status: "SUCCESS", oddsInserted: 41, completedAt: minutesAgo(9 * 60) },
    ];

    const { checks, capabilities } = await computeLiveCapabilityProbes();
    const snap = classifyHealthAlertSnapshot({ checks, capabilities });

    expect(checks["ingestion"]?.ageMinutes).toBe(9 * 60);
    expect(snap.unhealthy).toBe(true);
    expect(snap.ingestionAgeMinutes).toBe(9 * 60);
    expect(snap.reason).toContain("ingestionAge=540m");
  });

  it("sends the same predicate the other IngestionRun freshness consumers send", async () => {
    // public-freshness-gate / load-engine-story / king-standard-loader /
    // public-surface-truth all query { status: "SUCCESS", oddsInserted: { gt: 0 } }.
    // Drift between them and the pager is the whole defect.
    store.rows = [{ status: "SUCCESS", oddsInserted: 5, completedAt: minutesAgo(10) }];

    await computeLiveCapabilityProbes();

    expect(mocks.ingestionRunFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "SUCCESS", oddsInserted: { gt: 0 } },
      }),
    );
  });
});
