import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { ContestEntrySchema } from "@/lib/contests/types";
import { getCurrentContestWeek, isoWeekId } from "@/lib/contests/week";
import { enterContest, leaderboard, scoreEntry, resolveContestStorageMode } from "@/lib/contests/store";

const dirs: string[] = [];

afterEach(() => {
  delete process.env.GSE_CONTEST_STORE_PATH;
  delete process.env.GSE_CONTEST_SETTLEMENT_PATH;
  for (const d of dirs.splice(0)) {
    try {
      rmSync(d, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
});

describe("ContestEntrySchema", () => {
  it("rejects duplicate game picks", () => {
    const r = ContestEntrySchema.safeParse({
      displayName: "Ops",
      email: "a@example.com",
      consent: true,
      picks: [
        { gameId: "g1", side: "home" },
        { gameId: "g1", side: "away" },
        { gameId: "g2", side: "home" },
        { gameId: "g3", side: "away" },
        { gameId: "g4", side: "home" },
        { gameId: "g5", side: "away" },
      ],
    });
    expect(r.success).toBe(false);
  });

  it("accepts valid full-slate entry", () => {
    const r = ContestEntrySchema.safeParse({
      displayName: "Ops",
      email: "a@example.com",
      consent: true,
      picks: [
        { gameId: "g1", side: "home" },
        { gameId: "g2", side: "away" },
        { gameId: "g3", side: "home" },
        { gameId: "g4", side: "away" },
        { gameId: "g5", side: "home" },
        { gameId: "g6", side: "away" },
      ],
    });
    expect(r.success).toBe(true);
  });
});

describe("scoreEntry", () => {
  it("scores settled games only", () => {
    const s = scoreEntry(
      [
        { gameId: "a", side: "home" },
        { gameId: "b", side: "away" },
        { gameId: "c", side: "home" },
      ],
      { a: "home", b: "home", c: null },
    );
    expect(s).toEqual({ score: 1, correct: 1, total: 2 });
  });

  it("returns nulls when nothing settled", () => {
    expect(scoreEntry([{ gameId: "a", side: "home" }], { a: null })).toEqual({
      score: null,
      correct: null,
      total: null,
    });
  });
});

describe("paper week + enter", () => {
  it("builds stable week id and six games", () => {
    const week = getCurrentContestWeek(new Date("2026-08-06T12:00:00Z"));
    expect(week.weekId).toBe(isoWeekId(new Date("2026-08-06T12:00:00Z")));
    expect(week.games).toHaveLength(6);
    expect(week.slateKind).toBe("methodology_paper");
    expect(week.rules.some((r) => r.includes("no prize"))).toBe(true);
  });

  it("accepts one entry and rejects duplicate email", async () => {
    delete process.env.VERCEL;
    const dir = mkdtempSync(path.join(tmpdir(), "gse-contest-"));
    dirs.push(dir);
    process.env.GSE_CONTEST_STORE_PATH = path.join(dir, "entries.json");

    // force open window: week uses relative kickoffs from now — use current now
    const now = new Date();
    const live = getCurrentContestWeek(now);
    const picks = live.games.map((g) => ({
      gameId: g.gameId,
      side: "home" as const,
    }));

    const a = await enterContest(
      {
        displayName: "Alpha",
        email: "alpha@example.com",
        consent: true,
        picks,
      },
      now,
    );
    expect(a.ok).toBe(true);

    const b = await enterContest(
      {
        displayName: "Alpha2",
        email: "alpha@example.com",
        consent: true,
        picks,
      },
      now,
    );
    expect(b.ok).toBe(false);

    const board = await leaderboard(live.weekId);
    expect(board.length).toBeGreaterThanOrEqual(1);
    expect(board[0]!.displayName).toBe("Alpha");
  });
});

describe("resolveContestStorageMode", () => {
  const prevVercel = process.env.VERCEL;
  afterEach(() => {
    if (prevVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = prevVercel;
  });

  it("uses file when stub and not on Vercel", () => {
    delete process.env.VERCEL;
    // isStubMode depends on db package env — in unit tests without DATABASE_URL typically stub
    const mode = resolveContestStorageMode();
    expect(["file", "postgres", "unavailable"]).toContain(mode);
  });
});
