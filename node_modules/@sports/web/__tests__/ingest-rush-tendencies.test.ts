import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

const mocks = vi.hoisted(() => ({ deleteMany: vi.fn(), createMany: vi.fn() }));
vi.mock("@sports/db", () => ({ db: { playerRushProfile: { deleteMany: mocks.deleteMany, createMany: mocks.createMany } } }));
vi.mock("@/lib/ingestion/nflverse-gate", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/ingestion/nflverse-gate")>();
  return { ...actual, nflverseIngestionGate: vi.fn(actual.nflverseIngestionGate) };
});

import { ingestRushTendencies } from "@/lib/ingestion/rush-tendencies";
import { nflverseIngestionGate } from "@/lib/ingestion/nflverse-gate";

const NOW = new Date("2026-06-14T12:00:00.000Z");
function run(o: Partial<Record<string, string>>): Record<string, string> {
  return { play_type: "run", rusher_player_id: "00-1", rusher_player_name: "Alpha", posteam: "KC", run_gap: "guard", run_location: "middle", epa: "0", ...o } as Record<string, string>;
}

beforeEach(() => {
  mocks.deleteMany.mockReset();
  mocks.createMany.mockReset();
  (nflverseIngestionGate as Mock).mockClear();
  mocks.createMany.mockImplementation(async (a: { data: unknown[] }) => ({ count: a.data.length }));
});

describe("ingestRushTendencies", () => {
  it("aggregates per-rusher gap/location distribution and epa/run", async () => {
    const records: Record<string, string>[] = [
      run({ run_gap: "guard", run_location: "middle", epa: "0.2" }),
      run({ run_gap: "guard", run_location: "middle", epa: "-0.1" }),
      run({ run_gap: "guard", run_location: "left", epa: "0.0" }),
      run({ run_gap: "end", run_location: "right", epa: "0.5" }),
      run({ play_type: "pass", run_gap: "guard" }), // not a run → skipped
      run({ rusher_player_id: "", run_gap: "guard" }), // no rusher → skipped
    ];
    const res = await ingestRushTendencies(2024, { now: NOW, fetcher: async () => ({ records }) });
    expect(res.status).toBe("ok");
    expect(res.rowsWritten).toBe(1);
    expect(mocks.deleteMany).toHaveBeenCalledWith({ where: { season: 2024 } });
    const d = (mocks.createMany.mock.calls[0]![0] as { data: Array<Record<string, unknown>> }).data[0]!;
    expect(d["gsisId"]).toBe("00-1");
    expect(d["runs"]).toBe(4);
    expect(d["guardRuns"]).toBe(3);
    expect(d["endRuns"]).toBe(1);
    expect(d["middleRuns"]).toBe(2);
    expect(d["leftRuns"]).toBe(1);
    expect(d["rightRuns"]).toBe(1);
    expect(d["epaPerRun"]).toBeCloseTo(0.15, 4); // 0.6 / 4
    expect(d["team"]).toBe("KC");
    expect(d["fetchedAt"]).toBe(NOW);
  });

  it("stops on denied clearance and reports source errors", async () => {
    (nflverseIngestionGate as Mock).mockReturnValueOnce({ ok: false, blocks: ["B"] });
    expect((await ingestRushTendencies(2024, { fetcher: async () => ({ records: [] }) })).status).toBe("clearance-denied");
    const err = await ingestRushTendencies(2024, { fetcher: async () => { throw new Error("down"); } });
    expect(err.status).toBe("source-error");
    expect(mocks.deleteMany).not.toHaveBeenCalled();
  });
});
