import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  gameInSlateWindow,
  resolveSlateWindow,
  slateDayKey,
  slateWindowForDay,
} from "@/lib/picks/slate-window";

/**
 * 2026-09-05: /api/picks, daily-slate and the board selected picks by the day
 * they were generated; book-priced picks never re-stamp generatedAt, so 80 of
 * today's 91 book-priced NCAAF picks were invisible (read-only production SQL).
 * The slate is now the Eastern calendar day the GAME starts in, on rows the
 * pipeline still refreshes.
 */
describe("slate window", () => {
  it("is the US Eastern calendar day: NFL Sunday runs 04:00Z Sunday to 04:00Z Monday in September (EDT)", () => {
    const w = slateWindowForDay("2026-09-13");
    expect(w.start.toISOString()).toBe("2026-09-13T04:00:00.000Z");
    expect(w.end.toISOString()).toBe("2026-09-14T04:00:00.000Z");
    // Sunday Night Football (8:20pm ET) is Monday in UTC and still Sunday's slate.
    const snf = new Date("2026-09-14T00:20:00.000Z");
    expect(snf >= w.start && snf < w.end).toBe(true);
    expect(slateDayKey(snf)).toBe("2026-09-13");
  });

  it("follows the DST change (EST in December: 05:00Z)", () => {
    const w = slateWindowForDay("2026-12-13");
    expect(w.start.toISOString()).toBe("2026-12-13T05:00:00.000Z");
    expect(w.end.toISOString()).toBe("2026-12-14T05:00:00.000Z");
    // The night of the fall-back (2026-11-01) is 25 hours long.
    const fallBack = slateWindowForDay("2026-11-01");
    expect(fallBack.end.getTime() - fallBack.start.getTime()).toBe(25 * 60 * 60 * 1000);
  });

  it("names today's Eastern day when ?date= is missing or malformed, never an Invalid Date", () => {
    const now = new Date("2026-09-06T02:30:00.000Z"); // 10:30pm ET Saturday
    expect(resolveSlateWindow(null, now).dayKey).toBe("2026-09-05");
    expect(resolveSlateWindow("garbage", now).dayKey).toBe("2026-09-05");
    expect(resolveSlateWindow("2026-09-06T00:00:00Z", now).dayKey).toBe("2026-09-05");
    const named = resolveSlateWindow("2026-09-13", now);
    expect(named.dayKey).toBe("2026-09-13");
    expect(Number.isNaN(named.start.getTime())).toBe(false);
  });

  it("produces the Prisma fragment on the game relation", () => {
    const w = resolveSlateWindow("2026-09-13", new Date("2026-09-13T15:00:00Z"));
    expect(gameInSlateWindow(w)).toEqual({ commenceTime: { gte: w.start, lt: w.end } });
  });
});

describe("the public loaders select by game start, not by generatedAt", () => {
  const root = resolve(__dirname, "..");
  for (const rel of ["app/api/picks/route.ts", "app/api/picks/daily-slate/route.ts", "lib/board/state.ts"]) {
    it(rel, () => {
      const src = readFileSync(resolve(root, rel), "utf8");
      expect(src).toContain("gameInSlateWindow(");
      expect(src).toContain("freshPickWhere(");
      // The old day-bound on generatedAt must be gone from every WHERE clause.
      expect(src).not.toMatch(/generatedAt:\s*\{\s*gte:\s*(startOfDay|start)\b/);
    });
  }
});
