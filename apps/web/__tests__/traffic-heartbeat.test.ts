/**
 * Traffic-driven ingestion failsafe.
 *
 * The guards are the whole safety argument for running ingestion off public
 * traffic, so each one is tested as a behaviour, not just a return value:
 * fires only when already stale, at most once per cooldown across isolates,
 * never throws, and never stamps a misleading SUCCESS.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const ingestionFindFirst = vi.fn();
const memoryFindFirst = vi.fn();
const memoryCreate = vi.fn();
const isStubMode = vi.fn(() => false);
const runBoardFillPipeline = vi.fn();
const recordFreeIngestionRun = vi.fn();

vi.mock("@sports/db", () => ({
  db: {
    ingestionRun: { findFirst: (...a: unknown[]) => ingestionFindFirst(...a) },
    jarvisMemoryEvent: {
      findFirst: (...a: unknown[]) => memoryFindFirst(...a),
      create: (...a: unknown[]) => memoryCreate(...a),
    },
  },
  isStubMode: () => isStubMode(),
}));

vi.mock("@sports/ingestion-pipeline", () => ({
  runBoardFillPipeline: (...a: unknown[]) => runBoardFillPipeline(...a),
}));

vi.mock("@/lib/data-sources/free-ingestion-run", () => ({
  recordFreeIngestionRun: (...a: unknown[]) => recordFreeIngestionRun(...a),
}));

import {
  HEARTBEAT_COOLDOWN_MINUTES,
  maybeRunTrafficHeartbeat,
} from "@/lib/ops/traffic-heartbeat";
import { REFRESH_STALE_AFTER_MINUTES } from "@/lib/data-reliability/refresh-sla";

const NOW = Date.parse("2026-08-10T16:30:00.000Z");

function minutesAgo(m: number): Date {
  return new Date(NOW - m * 60_000);
}

/** A board-fill result that did real work. */
function productiveFill() {
  return {
    ok: true,
    seed: { ok: true, fetched: 10, upcoming: 8, upserted: 8, skippedPast: 2, errors: [], note: "" },
    odds: {
      ok: true,
      elapsedMs: 10,
      okCount: 2,
      totalCount: 2,
      results: [
        { sport: "baseball_mlb", ok: true, oddsInserted: 20 },
        { sport: "basketball_nba", ok: true, oddsInserted: 13 },
      ],
      freeze: [],
    },
    signals: { ok: true },
    quoteKeys: {
      oddsPresent: false,
      oddsMatchedEnv: null,
      rundownPresent: true,
      rundownMatchedEnv: "THERUNDOWN_API",
    },
    note: "",
  };
}

beforeEach(() => {
  ingestionFindFirst.mockReset();
  memoryFindFirst.mockReset();
  memoryCreate.mockReset();
  runBoardFillPipeline.mockReset();
  recordFreeIngestionRun.mockReset();
  isStubMode.mockReset();
  isStubMode.mockReturnValue(false);
  delete process.env["TRAFFIC_HEARTBEAT_DISABLED"];

  memoryFindFirst.mockResolvedValue(null);
  memoryCreate.mockResolvedValue({ id: "lease" });
  recordFreeIngestionRun.mockResolvedValue({ id: "run", status: "SUCCESS" });
  runBoardFillPipeline.mockResolvedValue(productiveFill());
});

describe("maybeRunTrafficHeartbeat — guards", () => {
  it("stays idle when ingestion is inside the staleness SLA (healthy system untouched)", async () => {
    ingestionFindFirst.mockResolvedValue({ completedAt: minutesAgo(10) });

    const res = await maybeRunTrafficHeartbeat(NOW);

    expect(res.outcome).toBe("fresh");
    expect(runBoardFillPipeline).not.toHaveBeenCalled();
    expect(memoryCreate).not.toHaveBeenCalled();
  });

  it("stays idle at exactly the SLA boundary, fires one minute past it", async () => {
    ingestionFindFirst.mockResolvedValue({ completedAt: minutesAgo(REFRESH_STALE_AFTER_MINUTES - 1) });
    expect((await maybeRunTrafficHeartbeat(NOW)).outcome).toBe("fresh");
    expect(runBoardFillPipeline).not.toHaveBeenCalled();

    ingestionFindFirst.mockResolvedValue({ completedAt: minutesAgo(REFRESH_STALE_AFTER_MINUTES + 1) });
    expect((await maybeRunTrafficHeartbeat(NOW)).outcome).toBe("ran");
    expect(runBoardFillPipeline).toHaveBeenCalledTimes(1);
  });

  it("honours the kill switch without touching the database", async () => {
    process.env["TRAFFIC_HEARTBEAT_DISABLED"] = "true";

    const res = await maybeRunTrafficHeartbeat(NOW);

    expect(res.outcome).toBe("disabled");
    expect(ingestionFindFirst).not.toHaveBeenCalled();
    expect(runBoardFillPipeline).not.toHaveBeenCalled();
  });

  it("no-ops in stub DB mode", async () => {
    isStubMode.mockReturnValue(true);
    expect((await maybeRunTrafficHeartbeat(NOW)).outcome).toBe("stub");
    expect(runBoardFillPipeline).not.toHaveBeenCalled();
  });

  it("respects the durable cooldown so public traffic cannot amplify", async () => {
    ingestionFindFirst.mockResolvedValue({ completedAt: minutesAgo(800) });
    memoryFindFirst.mockResolvedValue({
      created_at: minutesAgo(HEARTBEAT_COOLDOWN_MINUTES - 1),
    });

    const res = await maybeRunTrafficHeartbeat(NOW);

    expect(res.outcome).toBe("cooling-down");
    expect(runBoardFillPipeline).not.toHaveBeenCalled();
    expect(memoryCreate).not.toHaveBeenCalled();
  });

  it("runs again once the cooldown has elapsed", async () => {
    ingestionFindFirst.mockResolvedValue({ completedAt: minutesAgo(800) });
    memoryFindFirst.mockResolvedValue({
      created_at: minutesAgo(HEARTBEAT_COOLDOWN_MINUTES + 1),
    });

    expect((await maybeRunTrafficHeartbeat(NOW)).outcome).toBe("ran");
    expect(runBoardFillPipeline).toHaveBeenCalledTimes(1);
  });

  it("takes the lease BEFORE running ingestion, to bound the isolate race", async () => {
    ingestionFindFirst.mockResolvedValue({ completedAt: minutesAgo(800) });
    const order: string[] = [];
    memoryCreate.mockImplementation(async () => {
      order.push("lease");
      return { id: "lease" };
    });
    runBoardFillPipeline.mockImplementation(async () => {
      order.push("work");
      return productiveFill();
    });

    await maybeRunTrafficHeartbeat(NOW);

    expect(order).toEqual(["lease", "work"]);
  });

  it("heals a cold start where no SUCCESS run has ever been recorded", async () => {
    ingestionFindFirst.mockResolvedValue(null);
    expect((await maybeRunTrafficHeartbeat(NOW)).outcome).toBe("ran");
    expect(runBoardFillPipeline).toHaveBeenCalledTimes(1);
  });
});

describe("maybeRunTrafficHeartbeat — honesty of recorded evidence", () => {
  beforeEach(() => {
    ingestionFindFirst.mockResolvedValue({ completedAt: minutesAgo(800) });
  });

  it("records real counts read from the pipeline result", async () => {
    await maybeRunTrafficHeartbeat(NOW);

    expect(recordFreeIngestionRun).toHaveBeenCalledWith(
      expect.objectContaining({
        sport: "traffic-heartbeat",
        gamesUpserted: 8,
        // Summed across per-sport results (20 + 13) — there is no top-level total.
        oddsInserted: 33,
        failed: false,
      }),
    );
  });

  it("records FAILED, not a misleading SUCCESS, when board-fill accomplished nothing", async () => {
    runBoardFillPipeline.mockResolvedValue({
      ...productiveFill(),
      ok: false,
      seed: { ok: false, fetched: 0, upcoming: 0, upserted: 0, skippedPast: 0, errors: [], note: "" },
      odds: { ok: false, elapsedMs: 5, okCount: 0, totalCount: 2, results: [], freeze: [] },
      signals: { ok: false },
    });

    const res = await maybeRunTrafficHeartbeat(NOW);

    // A SUCCESS row here would flip /api/health green over a dead pipeline.
    expect(recordFreeIngestionRun).toHaveBeenCalledWith(
      expect.objectContaining({ failed: true, gamesUpserted: 0, oddsInserted: 0 }),
    );
    expect(res.outcome).toBe("error");
  });
});

describe("maybeRunTrafficHeartbeat — never throws", () => {
  it("degrades when the ingestion lookup fails", async () => {
    ingestionFindFirst.mockRejectedValue(new Error("connection pool timeout"));
    await expect(maybeRunTrafficHeartbeat(NOW)).resolves.toMatchObject({ outcome: "error" });
  });

  it("degrades when the lease write fails", async () => {
    ingestionFindFirst.mockResolvedValue({ completedAt: minutesAgo(800) });
    memoryCreate.mockRejectedValue(new Error("write failed"));
    await expect(maybeRunTrafficHeartbeat(NOW)).resolves.toMatchObject({ outcome: "error" });
    expect(runBoardFillPipeline).not.toHaveBeenCalled();
  });

  it("degrades when board-fill itself throws", async () => {
    ingestionFindFirst.mockResolvedValue({ completedAt: minutesAgo(800) });
    runBoardFillPipeline.mockRejectedValue(new Error("ESPN unreachable"));
    const res = await maybeRunTrafficHeartbeat(NOW);
    expect(res.outcome).toBe("error");
    expect(res.reason).toContain("ESPN unreachable");
  });
});
