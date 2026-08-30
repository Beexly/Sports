import { describe, expect, it } from "vitest";
import { RESEARCH_LOG_METHOD_TAG, playerResearchLog } from "../player-research-log.js";

describe("playerResearchLog", () => {
  it("keeps finite features and drops NaN, never priced", () => {
    const r = playerResearchLog({
      playerId: "00-123",
      edgeGap: 0.9,
      avgSeparation: 3.0,
      cpoe: Number.NaN,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("expected ok");
    expect(r.features.edgeGap).toBe(0.9);
    expect(r.features.avgSeparation).toBe(3.0);
    expect(r.features.cpoe).toBeNull();
    expect(r.priced).toBe(false);
    expect(RESEARCH_LOG_METHOD_TAG).toBe("player_research_log_v1");
  });

  it("refuses a blank player id", () => {
    expect(playerResearchLog({ playerId: "  " }).ok).toBe(false);
  });
});
