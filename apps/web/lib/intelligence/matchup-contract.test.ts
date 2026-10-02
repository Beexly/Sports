import { describe, expect, it } from "vitest";
import {
  computeMatchupDeltaLeaf,
  evaluateMatchupContract,
  type MatchupContractInput,
  type MatchupSource,
} from "./matchup-contract";

const LIVE_SOURCE: MatchupSource<unknown> = { status: "live", rows: [{ value: 1 }] };

function validInput(overrides: Partial<MatchupContractInput> = {}): MatchupContractInput {
  return {
    generatedAt: "2026-10-02T12:00:00.000Z",
    season: 2026,
    week: 5,
    playerModel: { status: "live", season: 2026, profiles: [{ player: "Player A" }] },
    schedule: { status: "live", week: 5, rows: [{ game: "A-B" }] },
    environment: LIVE_SOURCE,
    pressureCoverage: LIVE_SOURCE,
    sourceUrls: { playerModel: "https://example.test/players", schedule: "https://example.test/schedule" },
    ...overrides,
  };
}

describe("matchup refusal contract", () => {
  it("returns source-error when a gating player source is missing", () => {
    const result = evaluateMatchupContract(validInput({ playerModel: null }));

    expect(result.status).toBe("source-error");
    expect(result.rows).toEqual([]);
    expect(result.gamesCovered).toBe(0);
    expect(result.matchupsRead).toBe(0);
    expect(result.canPublishProjections).toBe(false);
    expect(result.error).toBe("player model unavailable");
  });

  it("returns source-error when a gating source succeeds with no profiles", () => {
    const result = evaluateMatchupContract(
      validInput({ playerModel: { status: "live", season: 2026, profiles: [] } }),
    );

    expect(result.status).toBe("source-error");
    expect(result.error).toBe("no player profiles");
    expect(result.canPublishProjections).toBe(false);
  });

  it("returns source-error when the schedule is empty after a successful read", () => {
    const result = evaluateMatchupContract(
      validInput({ schedule: { status: "live", rows: [] } }),
    );

    expect(result.status).toBe("source-error");
    expect(result.error).toBe("no scheduled games");
    expect(result.rows).toEqual([]);
  });

  it("returns source-error when a gating source reports source-error", () => {
    const result = evaluateMatchupContract(
      validInput({ schedule: { status: "source-error", rows: [], error: "schedule timeout" } }),
    );

    expect(result.status).toBe("source-error");
    expect(result.error).toBe("schedule timeout");
    expect(result.canPublishProjections).toBe(false);
  });

  it("keeps the result live when enrichment sources are missing and withholds deltas", () => {
    const result = evaluateMatchupContract(
      validInput({ environment: null, pressureCoverage: null }),
    );

    expect(result.status).toBe("live");
    expect(result.enrichment).toEqual({ environment: null, pressureCoverage: null });
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.result.delta).toBeNull();
    expect(result.matchupsRead).toBe(0);
  });

  it("also treats errored enrichment sources as non-gating", () => {
    const unavailable: MatchupSource<unknown> = { status: "source-error", rows: [], error: "offline" };
    const result = evaluateMatchupContract(
      validInput({ environment: unavailable, pressureCoverage: unavailable }),
    );

    expect(result.status).toBe("live");
    expect(result.enrichment).toEqual({ environment: "source-error", pressureCoverage: "source-error" });
    expect(result.rows[0]?.result.delta).toBeNull();
  });

  it("keeps successful reads non-publishable and counts only non-null deltas", () => {
    const result = evaluateMatchupContract(validInput());

    expect(result.status).toBe("live");
    expect(result.canPublishProjections).toBe(false);
    expect(result.gamesCovered).toBe(1);
    expect(result.rows.every((row) => row.result.delta === null)).toBe(true);
    expect(result.matchupsRead).toBe(0);
  });

  it("withholds a leaf when the opponent is null", () => {
    expect(computeMatchupDeltaLeaf(null, [{ contribution: 1 }])).toEqual({
      delta: null,
      grade: "unknown",
      topDriver: null,
      topMagnitude: 0,
    });
  });

  it("withholds a leaf when contributions are empty", () => {
    expect(computeMatchupDeltaLeaf({ team: "Opponent" }, [])).toEqual({
      delta: null,
      grade: "unknown",
      topDriver: null,
      topMagnitude: 0,
    });
  });
});
