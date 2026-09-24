import { describe, expect, it } from "vitest";
import { reconstructConsensusBookSet } from "@/lib/claims/publish-time-consensus-evidence";

const LOCK = new Date("2026-09-23T20:00:00.000Z");
const SOURCE = {
  sourceId: "snapshot-1",
  provider: "odds_api",
  capturedAt: LOCK,
};

function row(
  bookmaker: string,
  market: "H2H" | "SPREADS" | "TOTALS" = "H2H",
  fetchedAt: Date = LOCK,
) {
  return {
    gameId: "game-1",
    bookmaker,
    market,
    homePrice: -110,
    awayPrice: -110,
    homeSpreadPrice: -110,
    awaySpreadPrice: -110,
    spread: -3.5,
    total: 47.5,
    overPrice: -110,
    underPrice: -110,
    fetchedAt,
  };
}

function pick(overrides: Partial<Parameters<typeof reconstructConsensusBookSet>[0]> = {}) {
  return {
    id: "pick-1",
    gameId: "game-1",
    pickType: "MONEYLINE" as const,
    generatedAt: LOCK,
    bookmakerCount: 3,
    ...overrides,
  };
}

describe("reconstructConsensusBookSet", () => {
  it("uses the latest usable two-sided row per real book at pick lock", () => {
    const result = reconstructConsensusBookSet(
      pick(),
      [
        row("draftkings"),
        row("fanduel", "H2H", new Date(LOCK.getTime() - 60_000)),
        row("draftkings", "H2H", new Date(LOCK.getTime() - 60_000)),
        row("betmgm"),
        row("rundown_default"),
        row("bovada", "H2H", new Date(LOCK.getTime() + 60_000)),
      ],
      SOURCE,
    );
    expect(result).not.toBeNull();
    expect(result!.books).toEqual(["betmgm", "draftkings", "fanduel"]);
    expect(result!.sourceId).toBe("snapshot-1");
    expect(result!.capturedAt).toEqual(LOCK);
    expect(result!.bookSetId).toMatch(/^books-v1-/);
  });

  it("uses the scorer's market-specific priced set for TOTAL and SPREAD", () => {
    const total = reconstructConsensusBookSet(
      pick({ pickType: "TOTAL", bookmakerCount: 2 }),
      [row("draftkings", "TOTALS"), row("fanduel", "TOTALS")],
      SOURCE,
    );
    expect(total?.books).toEqual(["draftkings", "fanduel"]);

    const spread = reconstructConsensusBookSet(
      pick({ pickType: "SPREAD", bookmakerCount: 2 }),
      [row("draftkings", "SPREADS"), row("fanduel", "SPREADS")],
      SOURCE,
    );
    expect(spread?.books).toEqual(["draftkings", "fanduel"]);
  });

  it("fails closed on count mismatch, invalid capture time, or missing rows", () => {
    expect(reconstructConsensusBookSet(pick(), [row("draftkings")], SOURCE)).toBeNull();
    expect(reconstructConsensusBookSet(
      pick(),
      [row("draftkings"), row("fanduel"), row("betmgm")],
      { ...SOURCE, capturedAt: new Date("invalid") },
    )).toBeNull();
    expect(reconstructConsensusBookSet(pick(), [], SOURCE)).toBeNull();
  });
});
