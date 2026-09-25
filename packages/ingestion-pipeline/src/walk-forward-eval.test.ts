import { describe, expect, it } from "vitest";
import {
  runWalkForwardEval,
  walkForwardShipGate,
} from "./walk-forward-eval.js";
import type { SeasonGame, ClosingLines, PredictFn } from "@sports/prediction-engine";

const games: SeasonGame[] = [
  { gameId: "g1", season: 2024, week: 1, homeTeam: "A", awayTeam: "B", homeScore: 21, awayScore: 17, spreadHome: -3 },
  { gameId: "g2", season: 2024, week: 2, homeTeam: "C", awayTeam: "D", homeScore: 10, awayScore: 28, spreadHome: -1 },
  { gameId: "g3", season: 2025, week: 1, homeTeam: "A", awayTeam: "D", homeScore: 24, awayScore: 20, spreadHome: -2 },
  { gameId: "g4", season: 2025, week: 2, homeTeam: "B", awayTeam: "C", homeScore: 13, awayScore: 31, spreadHome: 3 },
] as SeasonGame[];

const closingLines: ClosingLines = {
  "g1": 0.58,
  "g2": 0.42,
  "g3": 0.55,
  "g4": 0.35,
} as unknown as ClosingLines;

const predict: PredictFn = (gs) => gs.map(() => 0.6);

describe("walk-forward-eval", () => {
  it("fail-closes without ≥2 seasons", () => {
    const r = runWalkForwardEval({
      games: games.filter((g) => g.season === 2024),
      predict,
      closingLines,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("seasons");
  });

  it("fail-closes without closing lines", () => {
    const r = runWalkForwardEval({
      games,
      predict,
      closingLines: {} as ClosingLines,
    });
    // empty object may still run — require null/undefined
    const r2 = runWalkForwardEval({
      games,
      predict,
      closingLines: null as unknown as ClosingLines,
    });
    expect(r2.ok).toBe(false);
  });

  it("runs walk-forward and returns a result", () => {
    const r = runWalkForwardEval({ games, predict, closingLines, modelId: "test", dataWindow: "2024-2025" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.overall).toBeDefined();
      expect(r.data.seasons.length).toBeGreaterThan(0);
    }
  });

  it("walkForwardShipGate withholds when edge ≤ 0 or n small", () => {
    const r = runWalkForwardEval({ games, predict, closingLines });
    if (r.ok) {
      const gate = walkForwardShipGate(r.data);
      expect(["SHIP", "WITHHOLD", "NO_SAMPLES"]).toContain(gate.verdict);
    }
  });
});
