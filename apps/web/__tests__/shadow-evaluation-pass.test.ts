import { describe, it, expect, vi, beforeEach } from "vitest";
import { createTeamIndexRegistry, TeamStrengthFilter } from "@sports/prediction-engine";

const shadowSignalFindMany = vi.fn();
const gameFindMany = vi.fn();
const pickFindMany = vi.fn();

vi.mock("@sports/db", () => ({
  db: {
    shadowSignal: { findMany: (...a: unknown[]) => shadowSignalFindMany(...a) },
    game: { findMany: (...a: unknown[]) => gameFindMany(...a) },
    pick: { findMany: (...a: unknown[]) => pickFindMany(...a) },
  },
}));

const loadFilter = vi.fn();
const saveFilter = vi.fn();
const recordShadowSignal = vi.fn();
const settleShadowSignal = vi.fn();

vi.mock("../lib/ops/shadow-signal-store", () => ({
  loadFilter: (...a: unknown[]) => loadFilter(...a),
  saveFilter: (...a: unknown[]) => saveFilter(...a),
  recordShadowSignal: (...a: unknown[]) => recordShadowSignal(...a),
  settleShadowSignal: (...a: unknown[]) => settleShadowSignal(...a),
}));

function coldLoad(nTeams = 8) {
  return {
    filter: new TeamStrengthFilter({ nTeams, seed: 1, nParticles: 100 }),
    registry: createTeamIndexRegistry("nba", nTeams),
    restored: false,
  };
}

describe("runShadowEvaluationPass", () => {
  beforeEach(() => {
    vi.resetModules();
    [shadowSignalFindMany, gameFindMany, pickFindMany, loadFilter, saveFilter, recordShadowSignal, settleShadowSignal].forEach(
      (m) => m.mockReset(),
    );
    shadowSignalFindMany.mockResolvedValue([]);
    gameFindMany.mockResolvedValue([]);
    pickFindMany.mockResolvedValue([]);
    saveFilter.mockResolvedValue(true);
    recordShadowSignal.mockResolvedValue(true);
    settleShadowSignal.mockResolvedValue(1);
  });

  it("skips a pick with no proof receipt (no real market prob) rather than fabricating 0.5", async () => {
    loadFilter.mockResolvedValue(coldLoad());
    pickFindMany.mockResolvedValue([
      {
        selection: "Celtics",
        confidence: 65,
        modelVersion: "v1",
        proofReceipt: null,
        game: { id: "g1", homeTeamName: "Celtics", awayTeamName: "Lakers" },
      },
    ]);
    const { runShadowEvaluationPass } = await import("../lib/ops/shadow-evaluation-pass");
    const result = await runShadowEvaluationPass("basketball_nba");
    expect(result.evaluated).toBe(0);
    expect(result.skipped).toBe(1);
    expect(recordShadowSignal).not.toHaveBeenCalled();
  });

  it("converts an AWAY-side selection to the home side correctly (the exact bug class this exists to prevent)", async () => {
    loadFilter.mockResolvedValue(coldLoad());
    // Pick selected the AWAY team (Lakers) with a real de-vigged fair prob of 0.7
    // FOR LAKERS. The home-side (Celtics) probability must be 1 - 0.7 = 0.3.
    pickFindMany.mockResolvedValue([
      {
        selection: "Lakers",
        confidence: 70,
        modelVersion: "v1",
        proofReceipt: { marketFairProb: 0.7 },
        game: { id: "g1", homeTeamName: "Celtics", awayTeamName: "Lakers" },
      },
    ]);
    const { runShadowEvaluationPass } = await import("../lib/ops/shadow-evaluation-pass");
    const result = await runShadowEvaluationPass("basketball_nba");
    expect(result.evaluated).toBe(1);
    expect(recordShadowSignal).toHaveBeenCalledTimes(1);
    const call = recordShadowSignal.mock.calls[0]![0] as { marketProb: number; liveConfidence: number };
    expect(call.marketProb).toBeCloseTo(0.3, 10);
    expect(call.liveConfidence).toBe(30); // 100 - 70
  });

  it("keeps a HOME-side selection unconverted", async () => {
    loadFilter.mockResolvedValue(coldLoad());
    pickFindMany.mockResolvedValue([
      {
        selection: "Celtics",
        confidence: 62,
        modelVersion: "v1",
        proofReceipt: { marketFairProb: 0.6 },
        game: { id: "g2", homeTeamName: "Celtics", awayTeamName: "Lakers" },
      },
    ]);
    const { runShadowEvaluationPass } = await import("../lib/ops/shadow-evaluation-pass");
    await runShadowEvaluationPass("basketball_nba");
    const call = recordShadowSignal.mock.calls[0]![0] as { marketProb: number; liveConfidence: number };
    expect(call.marketProb).toBeCloseTo(0.6, 10);
    expect(call.liveConfidence).toBe(62);
  });

  it("absorbs a settled game BEFORE evaluating the current slate (ordering)", async () => {
    loadFilter.mockResolvedValue(coldLoad());
    shadowSignalFindMany.mockResolvedValue([{ gameId: "settled-1" }]);
    gameFindMany.mockResolvedValue([
      {
        id: "settled-1",
        homeTeamName: "Celtics",
        awayTeamName: "Lakers",
        homeScore: 110,
        awayScore: 100,
      },
    ]);
    pickFindMany.mockResolvedValue([
      {
        selection: "Celtics",
        confidence: 60,
        modelVersion: "v1",
        proofReceipt: { marketFairProb: 0.55 },
        game: { id: "upcoming-1", homeTeamName: "Celtics", awayTeamName: "Lakers" },
      },
    ]);
    const { runShadowEvaluationPass } = await import("../lib/ops/shadow-evaluation-pass");
    const result = await runShadowEvaluationPass("basketball_nba");
    expect(result.settledAbsorbed).toBe(1);
    expect(settleShadowSignal).toHaveBeenCalledWith("settled-1", 1);
    expect(result.evaluated).toBe(1);
    expect(result.observations).toBe(1); // the settlement was absorbed into the filter
  });

  it("skips a draw rather than encoding it as a home or away win", async () => {
    loadFilter.mockResolvedValue(coldLoad());
    shadowSignalFindMany.mockResolvedValue([{ gameId: "draw-1" }]);
    gameFindMany.mockResolvedValue([
      { id: "draw-1", homeTeamName: "A", awayTeamName: "B", homeScore: 2, awayScore: 2 },
    ]);
    const { runShadowEvaluationPass } = await import("../lib/ops/shadow-evaluation-pass");
    const result = await runShadowEvaluationPass("soccer_epl");
    expect(result.settledAbsorbed).toBe(0);
    expect(settleShadowSignal).not.toHaveBeenCalled();
    expect(result.notes.some((n) => n.includes("draw skipped"))).toBe(true);
  });

  it("never throws even when every DB call rejects", async () => {
    loadFilter.mockResolvedValue(coldLoad());
    shadowSignalFindMany.mockRejectedValue(new Error("down"));
    pickFindMany.mockRejectedValue(new Error("down"));
    saveFilter.mockResolvedValue(false);
    const { runShadowEvaluationPass } = await import("../lib/ops/shadow-evaluation-pass");
    const result = await runShadowEvaluationPass("basketball_nba");
    expect(result.saved).toBe(false);
    expect(result.notes.some((n) => n.includes("settlement sweep failed"))).toBe(true);
    expect(result.notes.some((n) => n.includes("evaluation sweep failed"))).toBe(true);
    expect(result.notes.some((n) => n.includes("filter save FAILED"))).toBe(true);
  });

  it("saves the filter and registry together at the end of the cycle", async () => {
    loadFilter.mockResolvedValue(coldLoad());
    const { runShadowEvaluationPass } = await import("../lib/ops/shadow-evaluation-pass");
    await runShadowEvaluationPass("basketball_nba");
    expect(saveFilter).toHaveBeenCalledTimes(1);
    const [scope, filter, registry] = saveFilter.mock.calls[0]! as [string, { snapshot: () => unknown }, unknown];
    expect(scope).toBe("basketball_nba");
    // Not `toBeInstanceOf` — vi.resetModules() between tests gives the
    // dynamically re-imported module its own class registration, so the
    // statically-imported TeamStrengthFilter here is a different identity
    // for the same real class. Check the real API surface instead.
    expect(typeof filter.snapshot).toBe("function");
    expect(registry).toBeDefined();
  });
});
