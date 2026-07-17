import { describe, it, expect } from "vitest";
import { parseWatchlistTarget } from "./validation";

describe("parseWatchlistTarget", () => {
  it("accepts a valid TEAM target", () => {
    const result = parseWatchlistTarget({ entityType: "TEAM", entityId: "team-1" });
    expect(result).toEqual({ success: true, data: { entityType: "TEAM", entityId: "team-1" } });
  });

  it("accepts a valid PLAYER target", () => {
    const result = parseWatchlistTarget({ entityType: "PLAYER", entityId: "player-1" });
    expect(result.success).toBe(true);
  });

  it("trims entityId", () => {
    const result = parseWatchlistTarget({ entityType: "TEAM", entityId: "  team-1  " });
    expect(result).toEqual({ success: true, data: { entityType: "TEAM", entityId: "team-1" } });
  });

  it("rejects an unknown entityType", () => {
    const result = parseWatchlistTarget({ entityType: "LEAGUE", entityId: "x" });
    expect(result.success).toBe(false);
  });

  it("rejects a missing entityId", () => {
    const result = parseWatchlistTarget({ entityType: "TEAM", entityId: "" });
    expect(result.success).toBe(false);
  });

  it("rejects an entityId over the max length", () => {
    const result = parseWatchlistTarget({ entityType: "TEAM", entityId: "x".repeat(65) });
    expect(result.success).toBe(false);
  });

  it("rejects non-object bodies", () => {
    expect(parseWatchlistTarget(null).success).toBe(false);
    expect(parseWatchlistTarget("team-1").success).toBe(false);
    expect(parseWatchlistTarget(undefined).success).toBe(false);
  });

  it("rejects a body missing entityType", () => {
    expect(parseWatchlistTarget({ entityId: "team-1" }).success).toBe(false);
  });
});
