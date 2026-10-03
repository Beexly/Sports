import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

vi.mock("@sports/db", () => ({ db: { game: { findUnique: vi.fn(), findMany: vi.fn() } } }));

import { db } from "@sports/db";
import { loadGameDetail, loadGamesMeta } from "@/lib/games/game-detail";
import type { BoardStateRow } from "@/lib/board/state";

const findUnique = db.game.findUnique as Mock;

const reading = (over: Partial<BoardStateRow> & { id: string }): BoardStateRow => ({
  gameId: "game-1",
  matchup: "BUF @ KC",
  sport: "NFL",
  market: "MONEYLINE",
  status: "PUBLISHED_TODAY",
  edgeIndex: 12,
  confidence: null,
  rankingP: null,
  rankingSource: null,
  gateReason: null,
  updatedAt: "2026-09-12T12:00:00.000Z",
  ...over,
});

const oddsRow = (bookmaker: string, homePrice: number | null, awayPrice: number | null) => ({
  bookmaker,
  market: "H2H",
  fetchedAt: new Date("2026-09-12T11:00:00.000Z"),
  homePrice,
  awayPrice,
  spread: null,
  homeSpreadPrice: null,
  awaySpreadPrice: null,
  total: null,
  overPrice: null,
  underPrice: null,
});

const gameRow = (odds: ReturnType<typeof oddsRow>[]) => ({
  id: "game-1",
  awayTeamName: "BUF",
  homeTeamName: "KC",
  commenceTime: new Date("2026-09-13T17:00:00.000Z"),
  status: "SCHEDULED",
  homeScore: null,
  awayScore: null,
  sport: { name: "NFL" },
  odds,
});

beforeEach(() => findUnique.mockReset());

describe("loadGameDetail", () => {
  it("composes game meta, best lines, and grouped readings", async () => {
    findUnique.mockResolvedValue(
      gameRow([oddsRow("draftkings", -150, 130), oddsRow("fanduel", -145, 125)]),
    );
    const detail = await loadGameDetail("game-1", [
      reading({ id: "r1" }),
      reading({ id: "r2", gameId: "other", matchup: "X @ Y" }),
    ]);
    expect(detail?.matchup).toBe("BUF @ KC");
    expect(detail?.sport).toBe("NFL");
    expect(detail?.status).toBe("SCHEDULED");
    expect(detail?.best).not.toBeNull();
    expect(detail?.best?.bookCount).toBe(2);
    expect(detail?.game?.readings).toHaveLength(1);
    expect(detail?.game?.bestEdge).toBe(12);
  });

  it("returns null best when fewer than two books quote", async () => {
    findUnique.mockResolvedValue(gameRow([oddsRow("draftkings", -150, 130)]));
    const detail = await loadGameDetail("game-1", [reading({ id: "r1" })]);
    expect(detail?.best).toBeNull();
    expect(detail?.game?.readings).toHaveLength(1);
  });

  it("returns null when the game is unknown", async () => {
    findUnique.mockResolvedValue(null);
    expect(await loadGameDetail("nope", [])).toBeNull();
  });

  it("returns null for an empty gameId without touching the db", async () => {
    expect(await loadGameDetail("", [])).toBeNull();
    expect(findUnique).not.toHaveBeenCalled();
  });
});

describe("loadGamesMeta", () => {
  const findMany = db.game.findMany as Mock;
  beforeEach(() => findMany.mockReset());

  it("maps known ids and skips unknown ones", async () => {
    findMany.mockResolvedValue([
      {
        id: "game-1",
        commenceTime: new Date("2026-09-13T17:00:00.000Z"),
        status: "SCHEDULED",
        homeScore: null,
        awayScore: null,
      },
    ]);
    const meta = await loadGamesMeta(["game-1", "game-9"]);
    expect(meta.get("game-1")?.status).toBe("SCHEDULED");
    expect(meta.get("game-1")?.commenceTime).toBe("2026-09-13T17:00:00.000Z");
    expect(meta.has("game-9")).toBe(false);
  });

  it("returns an empty map without querying for no ids", async () => {
    expect((await loadGamesMeta([])).size).toBe(0);
    expect(findMany).not.toHaveBeenCalled();
  });
});
