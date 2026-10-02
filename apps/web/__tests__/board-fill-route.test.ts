/**
 * GET /api/cron/board-fill — the route contract, and the ONE thing that was
 * never tested while it was the route taking the whole public board down.
 *
 * WHY. MEASURED 2026-09-27 on dpl_DU9K91tetxKe8oa5YdLvKBaBRJd7: board-fill
 * returned 500 sixteen times, and again after the #928 path fix, because
 * `bridge-premises.jsonl` was never traced into the function. The pipeline has
 * its own suite (`board-fill.test.ts`) and the path logic has its own
 * (`slate-association-path.test.ts`) — and NEITHER imports this route, so a
 * broken route is indistinguishable from a working one until production says
 * otherwise. That is the same gap that let a duplicated write in the
 * signal-ledger route pass seventeen writer tests.
 *
 * What is asserted here is the contract, not the pipeline's internals:
 *   - unauthorized callers are refused
 *   - a pipeline THROW is a 500, never a 200-shaped success
 *   - the payload carries the counts a reader needs to judge the run
 *   - a partial result (ok:false, no throw) is still reported as not-ok
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const runBoardFillPipeline = vi.fn();

// Controllable auth gate: the contract promises unauthorized callers are
// refused, which is untestable when the mock hard-wires auth to null.
const authState = vi.hoisted(() => ({ denied: null as null | Response }));

vi.mock("@/lib/cron/authorize", () => ({ cronAuthError: () => authState.denied }));
vi.mock("@/lib/observability/sentry", () => ({ captureError: () => {} }));
vi.mock("@sports/ingestion-pipeline", () => ({
  runBoardFillPipeline: (...args: unknown[]) => runBoardFillPipeline(...args),
}));

const OK_RESULT = {
  ok: true,
  note: "fine",
  quoteKeys: ["k1"],
  seed: { ok: true, fetched: 3, upcoming: 2, upserted: 2, skippedPast: 1, errors: [], note: "n" },
  odds: { ok: true, okCount: 1, totalCount: 1, elapsedMs: 5, results: [] },
  signals: { ok: true },
};

async function invoke(): Promise<Response> {
  vi.resetModules();
  const mod = await import("@/app/api/cron/board-fill/route");
  return (await mod.GET(new Request("http://localhost/api/cron/board-fill"))) as Response;
}

describe("GET /api/cron/board-fill", () => {
  beforeEach(() => {
    authState.denied = null;
    runBoardFillPipeline.mockReset();
    runBoardFillPipeline.mockResolvedValue(OK_RESULT);
  });

  it("returns 200 and the counts on a clean run", async () => {
    const res = await invoke();
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      seed: { upserted: number };
      odds: { okCount: number };
    };
    expect(body.ok).toBe(true);
    expect(body.seed.upserted).toBe(2);
    expect(body.odds.okCount).toBe(1);
  });

  it("returns 500 when the pipeline THROWS — never a 200-shaped failure", async () => {
    // This is the whole test. A caught exception reported as 200 is how a dead
    // board can look healthy to every monitor that only checks status codes.
    runBoardFillPipeline.mockRejectedValue(new Error("bridge-premises.jsonl is missing at /var/task"));
    const res = await invoke();
    expect(res.status).toBe(500);
    const body = (await res.json()) as { ok: boolean; error: string };
    expect(body.ok).toBe(false);
    expect(body.error).toContain("bridge-premises.jsonl");
  });

  it("reports a PARTIAL result as not-ok without throwing", async () => {
    runBoardFillPipeline.mockResolvedValue({
      ...OK_RESULT,
      ok: false,
      note: "signals refused, no association on disk",
      signals: { ok: false, note: "slate refuses" },
    });
    const res = await invoke();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; note: string; signals: { ok: boolean } };
    expect(body.ok).toBe(false);
    expect(body.signals.ok).toBe(false);
    // The reason travels with the failure, so an operator does not have to
    // reproduce it from the dashboard.
    expect(body.note).toContain("refused");
  });

  it("calls the pipeline exactly once", async () => {
    await invoke();
    expect(runBoardFillPipeline).toHaveBeenCalledTimes(1);
  });

  it("refuses unauthorized callers before the pipeline runs", async () => {
    // The contract above promises this; the mock used to make it untestable
    // by hard-wiring auth to null. An unauthenticated hit must never reach
    // the pipeline.
    authState.denied = new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
    try {
      const res = await invoke();
      expect(res.status).toBe(401);
      expect(runBoardFillPipeline).not.toHaveBeenCalled();
    } finally {
      authState.denied = null;
    }
  });
});
