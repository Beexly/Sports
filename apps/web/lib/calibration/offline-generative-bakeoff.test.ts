import { describe, expect, it } from "vitest";
import {
  OFFLINE_BAKEOFF_FIXTURE,
  runOfflineGenerativeBakeoff,
} from "./offline-generative-bakeoff";

describe("runOfflineGenerativeBakeoff", () => {
  it("scores fixture without DB", () => {
    const r = runOfflineGenerativeBakeoff(OFFLINE_BAKEOFF_FIXTURE);
    expect(r.n).toBe(6);
    const market = r.byScore.find((s) => s.score === "market");
    const model = r.byScore.find((s) => s.score === "model");
    expect(market?.n).toBe(6);
    expect(model?.brier).not.toBeNull();
    expect(r.bySport.length).toBe(3);
  });

  it("handles empty", () => {
    const r = runOfflineGenerativeBakeoff([]);
    expect(r.n).toBe(0);
    expect(r.byScore.every((s) => s.brier === null)).toBe(true);
  });
});
