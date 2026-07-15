import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  gameFindMany: vi.fn(),
  getReadinessGates: vi.fn(),
  isPublicPicksSurfaceStale: vi.fn(),
  getFreshPublicOddsSportKeys: vi.fn(),
}));

vi.mock("@sports/db", () => ({
  db: { game: { findMany: mocks.gameFindMany } },
}));
vi.mock("@sports/prediction-engine", () => ({
  getReadinessGates: mocks.getReadinessGates,
}));
vi.mock("@/lib/data-reliability/public-freshness-gate", () => ({
  isPublicPicksSurfaceStale: mocks.isPublicPicksSurfaceStale,
  getFreshPublicOddsSportKeys: mocks.getFreshPublicOddsSportKeys,
}));

function gameWithPicks(picks: Array<Record<string, unknown>>) {
  return {
    id: "game-1",
    homeTeamName: "Boston Celtics",
    awayTeamName: "Los Angeles Lakers",
    commenceTime: new Date("2026-07-15T00:30:00Z"),
    openingSpread: -4,
    openingTotal: 218.5,
    lineMovementSpread: -0.5,
    dataQualityScore: 90,
    sport: { name: "NBA", key: "basketball_nba" },
    picks,
  };
}

async function metadataForPreview() {
  vi.resetModules();
  const { generateMetadata } = await import("@/app/preview/[sport]/[slug]/page");
  return generateMetadata({
    params: Promise.resolve({
      sport: "nba",
      slug: "los-angeles-lakers-vs-boston-celtics",
    }),
  });
}

describe("matchup preview candidate projection", () => {
  beforeEach(() => {
    mocks.gameFindMany.mockReset();
    mocks.getReadinessGates.mockReturnValue({
      canExposePublicPicks: true,
      forceNoBetIfStale: false,
    });
    mocks.isPublicPicksSurfaceStale.mockResolvedValue(false);
    mocks.getFreshPublicOddsSportKeys.mockResolvedValue(
      new Set(["basketball_nba"]),
    );
  });

  it("skips an invalid highest-confidence row and uses the first canonical candidate", async () => {
    mocks.gameFindMany.mockResolvedValue([
      gameWithPicks([
        { pickType: "SPREAD", selection: "Boston Celtics -3.25", line: -3.25 },
        { pickType: "SPREAD", selection: "Boston Celtics -4.5", line: -4.5 },
      ]),
    ]);

    const metadata = await metadataForPreview();

    expect(metadata.description).toContain("Boston Celtics -4.5");
    expect(metadata.description).not.toContain("-3.25");
    expect(mocks.gameFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          picks: expect.objectContaining({
            take: 10,
            where: expect.objectContaining({ tier: "FREE" }),
            select: { pickType: true, selection: true, line: true },
          }),
        }),
      }),
    );
  });

  it("publishes no pick claim when every bounded candidate is invalid", async () => {
    mocks.gameFindMany.mockResolvedValue([
      gameWithPicks([
        { pickType: "SPREAD", selection: "Boston Celtics -3.25", line: -3.25 },
        { pickType: "SPREAD", selection: "Boston Celtics stale", line: -4.5 },
      ]),
    ]);

    const metadata = await metadataForPreview();

    expect(metadata.description).toContain("Model read, line, and matchup context.");
    expect(metadata.description).not.toContain("-3.25");
    expect(metadata.description).not.toContain("stale");
    const query = mocks.gameFindMany.mock.calls[0]?.[0] as {
      include: { picks: { select: Record<string, boolean> } };
    };
    expect(query.include.picks.select).not.toHaveProperty("confidence");
    expect(query.include.picks.select).not.toHaveProperty("reasoning");
    expect(query.include.picks.select).not.toHaveProperty("reasoningShort");
  });

  it("withholds every pick when the public-picks readiness gate is closed", async () => {
    mocks.getReadinessGates.mockReturnValue({
      canExposePublicPicks: false,
      forceNoBetIfStale: true,
    });
    mocks.gameFindMany.mockResolvedValue([
      gameWithPicks([
        { pickType: "SPREAD", selection: "Boston Celtics -4.5", line: -4.5 },
      ]),
    ]);

    const metadata = await metadataForPreview();

    expect(metadata.description).not.toContain("Boston Celtics -4.5");
    expect(mocks.isPublicPicksSurfaceStale).not.toHaveBeenCalled();
  });

  it("withholds every pick when freshness cannot be proven for the sport", async () => {
    mocks.getReadinessGates.mockReturnValue({
      canExposePublicPicks: true,
      forceNoBetIfStale: true,
    });
    mocks.getFreshPublicOddsSportKeys.mockResolvedValue(new Set(["americanfootball_nfl"]));
    mocks.gameFindMany.mockResolvedValue([
      gameWithPicks([
        { pickType: "SPREAD", selection: "Boston Celtics -4.5", line: -4.5 },
      ]),
    ]);

    const metadata = await metadataForPreview();

    expect(metadata.description).not.toContain("Boston Celtics -4.5");
  });

  it("withholds every pick below the public data-quality floor", async () => {
    mocks.gameFindMany.mockResolvedValue([
      { ...gameWithPicks([
        { pickType: "SPREAD", selection: "Boston Celtics -4.5", line: -4.5 },
      ]), dataQualityScore: 10 },
    ]);

    const metadata = await metadataForPreview();

    expect(metadata.description).not.toContain("Boston Celtics -4.5");
  });
});
