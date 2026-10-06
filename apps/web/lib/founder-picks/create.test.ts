import { afterEach, describe, expect, it, vi } from "vitest";
import type { FounderPickInput } from "@/lib/founder-picks/types";
import type { StatcastUnderlyingResult } from "@/lib/founder-picks/statcast-underlying";

/**
 * createFounderPick — Statcast wiring at pick-creation time.
 *
 * Mirrors the vi.mock("@sports/db") + vi.hoisted pattern from
 * picks-prod-seed-exclusion.test.ts. This file covers the INTEGRATION half
 * of the Statcast wiring: statcast-underlying.test.ts covers the adapter's
 * own happy/not-found/unreachable/small-sample behaviour in isolation.
 */

const mocks = vi.hoisted(() => ({
  gameFindUnique: vi.fn(),
  pickFindUnique: vi.fn(),
  pickCreate: vi.fn(),
  pickUpdate: vi.fn(),
  loadStatcastUnderlyingFactor: vi.fn<() => Promise<StatcastUnderlyingResult>>(),
}));

vi.mock("@sports/db", () => ({
  db: {
    game: { findUnique: mocks.gameFindUnique },
    pick: {
      findUnique: mocks.pickFindUnique,
      create: mocks.pickCreate,
      update: mocks.pickUpdate,
    },
  },
}));

vi.mock("./statcast-underlying", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./statcast-underlying")>();
  return {
    ...actual,
    loadStatcastUnderlyingFactor: mocks.loadStatcastUnderlyingFactor,
  };
});

const KICKOFF = new Date(Date.now() + 24 * 60 * 60 * 1000); // tomorrow

function baseGame(sportName: string) {
  return {
    id: "game-1",
    commenceTime: KICKOFF,
    homeTeamName: "Home",
    awayTeamName: "Away",
    status: "SCHEDULED",
    sport: { name: sportName },
  };
}

function validInput(over: Partial<FounderPickInput> = {}): FounderPickInput {
  return {
    gameId: "game-1",
    pickType: "SPREAD",
    selection: "Home -1.5",
    line: -1.5,
    confidence: 65,
    reasoning: "Real observed reasoning, at least ten characters.",
    ...over,
  };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("createFounderPick — Statcast wiring", () => {
  it("never calls the Statcast adapter when statcastLookup is absent", async () => {
    mocks.gameFindUnique.mockResolvedValue(baseGame("MLB"));
    mocks.pickFindUnique.mockResolvedValue(null);
    mocks.pickCreate.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: "pick-1",
      ...data,
    }));

    const { createFounderPick } = await import("./create");
    const result = await createFounderPick(validInput());

    expect(result.ok).toBe(true);
    expect(mocks.loadStatcastUnderlyingFactor).not.toHaveBeenCalled();
    const data = mocks.pickCreate.mock.calls[0]![0].data;
    const factors = (data.factorBreakdown as { factors: unknown[] }).factors;
    expect(factors).toHaveLength(1);
    expect((factors[0] as { name: string }).name).toBe("Owner call");
  });

  it("skips the Statcast lookup on a non-MLB game even when statcastLookup is provided", async () => {
    mocks.gameFindUnique.mockResolvedValue(baseGame("NFL"));
    mocks.pickFindUnique.mockResolvedValue(null);
    mocks.pickCreate.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: "pick-1",
      ...data,
    }));

    const { createFounderPick } = await import("./create");
    const result = await createFounderPick(
      validInput({ statcastLookup: { role: "batter", playerName: "Aaron Judge", season: 2025 } }),
    );

    expect(result.ok).toBe(true);
    expect(mocks.loadStatcastUnderlyingFactor).not.toHaveBeenCalled();
  });

  it("folds a real Statcast result into the factor trail on an MLB pick", async () => {
    mocks.gameFindUnique.mockResolvedValue(baseGame("MLB"));
    mocks.pickFindUnique.mockResolvedValue(null);
    mocks.pickCreate.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: "pick-1",
      ...data,
    }));
    mocks.loadStatcastUnderlyingFactor.mockResolvedValue({
      status: "ok",
      sampleSize: 400,
      poolSize: 120,
      factor: { label: "Hard-Hit % (Statcast)", value: 55, leagueAvg: 40, higherIsBetter: true },
    });

    const { createFounderPick } = await import("./create");
    const result = await createFounderPick(
      validInput({ statcastLookup: { role: "batter", playerName: "Aaron Judge", season: 2025 } }),
    );

    expect(result.ok).toBe(true);
    expect(mocks.loadStatcastUnderlyingFactor).toHaveBeenCalledTimes(1);
    const data = mocks.pickCreate.mock.calls[0]![0].data;
    const factors = (data.factorBreakdown as { factors: { name: string; impact: string }[] }).factors;
    expect(factors).toHaveLength(2);
    expect(factors[1]!.name).toBe("Hard-Hit % (Statcast)");
    expect(factors[1]!.impact).toBe("positive");
    // Never attached to confidence — the owner's own number is untouched.
    expect(data.confidence).toBe(65);
  });

  it("never blocks pick creation when the Statcast lookup throws", async () => {
    mocks.gameFindUnique.mockResolvedValue(baseGame("MLB"));
    mocks.pickFindUnique.mockResolvedValue(null);
    mocks.pickCreate.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: "pick-1",
      ...data,
    }));
    mocks.loadStatcastUnderlyingFactor.mockRejectedValue(new Error("network exploded"));

    const { createFounderPick } = await import("./create");
    const result = await createFounderPick(
      validInput({ statcastLookup: { role: "batter", playerName: "Aaron Judge", season: 2025 } }),
    );

    expect(result.ok).toBe(true);
    const data = mocks.pickCreate.mock.calls[0]![0].data;
    const factors = (data.factorBreakdown as { factors: unknown[] }).factors;
    expect(factors).toHaveLength(1);
  });

  it("never fires the underlying factor when the Statcast adapter reports absence", async () => {
    mocks.gameFindUnique.mockResolvedValue(baseGame("MLB"));
    mocks.pickFindUnique.mockResolvedValue(null);
    mocks.pickCreate.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: "pick-1",
      ...data,
    }));
    mocks.loadStatcastUnderlyingFactor.mockResolvedValue({
      status: "small-sample",
      reason: "too few plate appearances",
      sampleSize: 5,
      minimumRequired: 50,
    });

    const { createFounderPick } = await import("./create");
    const result = await createFounderPick(
      validInput({ statcastLookup: { role: "batter", playerName: "Aaron Judge", season: 2025 } }),
    );

    expect(result.ok).toBe(true);
    const data = mocks.pickCreate.mock.calls[0]![0].data;
    const factors = (data.factorBreakdown as { factors: unknown[] }).factors;
    expect(factors).toHaveLength(1);
  });
});
