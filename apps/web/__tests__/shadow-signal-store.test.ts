import { describe, it, expect, vi, beforeEach } from "vitest";

const findUnique = vi.fn();
const upsertFilter = vi.fn();
const upsertSignal = vi.fn();
const updateMany = vi.fn();
const findMany = vi.fn();

vi.mock("@sports/db", () => ({
  db: {
    filterStateSnapshot: {
      findUnique: (...a: unknown[]) => findUnique(...a),
      upsert: (...a: unknown[]) => upsertFilter(...a),
    },
    shadowSignal: {
      upsert: (...a: unknown[]) => upsertSignal(...a),
      updateMany: (...a: unknown[]) => updateMany(...a),
      findMany: (...a: unknown[]) => findMany(...a),
    },
  },
}));

const FALLBACK = { nTeams: 4, seed: 1, nParticles: 64 } as const;

describe("shadow-signal-store", () => {
  beforeEach(() => {
    vi.resetModules();
    [findUnique, upsertFilter, upsertSignal, updateMany, findMany].forEach((m) => m.mockReset());
  });

  it("round-trips a warm filter through save/load, preserving accumulated evidence", async () => {
    const { TeamStrengthFilter } = await import("@sports/prediction-engine");
    const mod = await import("../lib/ops/shadow-signal-store");

    const warm = new TeamStrengthFilter({ ...FALLBACK });
    for (let i = 0; i < 25; i++) {
      warm.predictStates();
      warm.update(0, 1, 1);
    }
    const warmProb = warm.predictHomeWinProbability(0, 1);

    upsertFilter.mockResolvedValue({});
    expect(await mod.saveFilter("nba", warm)).toBe(true);

    // What was written is what we hand back — through a JSON round trip, as a DB would.
    const written = upsertFilter.mock.calls[0]![0] as { create: { payload: unknown; observations: number } };
    expect(written.create.observations).toBe(25);
    findUnique.mockResolvedValue({
      version: 1,
      payload: JSON.parse(JSON.stringify(written.create.payload)),
    });

    const { filter, restored } = await mod.loadFilter("nba", { ...FALLBACK });
    expect(restored).toBe(true);
    expect(filter.diagnostics().observations).toBe(25);
    expect(filter.predictHomeWinProbability(0, 1)).toBe(warmProb);
  });

  it("returns a COLD filter when nothing is stored (the serverless default)", async () => {
    findUnique.mockResolvedValue(null);
    const mod = await import("../lib/ops/shadow-signal-store");
    const { filter, restored } = await mod.loadFilter("nba", { ...FALLBACK });
    expect(restored).toBe(false);
    expect(filter.diagnostics().observations).toBe(0);
  });

  it("ignores a version-mismatched snapshot instead of throwing", async () => {
    findUnique.mockResolvedValue({ version: 999, payload: { nonsense: true } });
    const mod = await import("../lib/ops/shadow-signal-store");
    const { restored } = await mod.loadFilter("nba", { ...FALLBACK });
    expect(restored).toBe(false);
  });

  it("ignores a corrupt payload instead of wedging the caller", async () => {
    findUnique.mockResolvedValue({ version: 1, payload: { version: 1, nTeams: "not-a-number" } });
    const mod = await import("../lib/ops/shadow-signal-store");
    const { restored } = await mod.loadFilter("nba", { ...FALLBACK });
    expect(restored).toBe(false);
  });

  it("fails open on a DB error rather than throwing", async () => {
    findUnique.mockRejectedValue(new Error("connection reset"));
    upsertFilter.mockRejectedValue(new Error("connection reset"));
    const { TeamStrengthFilter } = await import("@sports/prediction-engine");
    const mod = await import("../lib/ops/shadow-signal-store");

    expect((await mod.loadFilter("nba", { ...FALLBACK })).restored).toBe(false);
    expect(await mod.saveFilter("nba", new TeamStrengthFilter({ ...FALLBACK }))).toBe(false);
  });

  it("upserts a shadow signal on (gameId, modelVersion) so a re-run cannot duplicate", async () => {
    upsertSignal.mockResolvedValue({});
    const mod = await import("../lib/ops/shadow-signal-store");
    await mod.recordShadowSignal({
      gameId: "g1",
      modelVersion: "v5.2.6",
      shadowProb: 0.61,
      marketProb: 0.58,
    });
    const call = upsertSignal.mock.calls[0]![0] as {
      where: { gameId_modelVersion: { gameId: string; modelVersion: string } };
    };
    expect(call.where.gameId_modelVersion).toEqual({ gameId: "g1", modelVersion: "v5.2.6" });
  });

  it("settles only rows that are still unsettled", async () => {
    updateMany.mockResolvedValue({ count: 2 });
    const mod = await import("../lib/ops/shadow-signal-store");
    expect(await mod.settleShadowSignal("g1", 1)).toBe(2);
    const call = updateMany.mock.calls[0]![0] as { where: { outcome: null | object } };
    expect(call.where.outcome).toBeNull();
  });

  it("loadSettledShadowSignals returns [] on error, never throws", async () => {
    findMany.mockRejectedValue(new Error("down"));
    const mod = await import("../lib/ops/shadow-signal-store");
    expect(await mod.loadSettledShadowSignals(new Date(0))).toEqual([]);
  });
});
