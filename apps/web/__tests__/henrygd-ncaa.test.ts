import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  parseHenrygdScoreboard,
  parseHenrygdRankings,
  parseHenrygdStandings,
  splitSchoolVotes,
  toIsoDate,
  henrygdBaseUrl,
  henrygdDatedPath,
  HENRYGD_ATTRIBUTION,
  HENRYGD_PATHS,
} from "@/lib/data-sources/free-adapters/henrygd-ncaa";

const FIX = resolve(__dirname, "fixtures");
const readFix = (f: string) => JSON.parse(readFileSync(resolve(FIX, f), "utf8"));

describe("henrygd NCAA adapter (free, no key)", () => {
  it("parses scoreboard finals with normalized scores + state", () => {
    const games = parseHenrygdScoreboard(readFix("henrygd-scoreboard.json"));
    expect(games.length).toBeGreaterThanOrEqual(1);
    const g = games[0]!;
    expect(g.sourceId).toBe("henrygd-ncaa");
    expect(g.home.team).toBeTruthy();
    expect(g.home.abbr).toMatch(/^[A-Z0-9]+$/); // abbreviation exposed for cross-source joins
    expect(g.home.score === null || typeof g.home.score === "number").toBe(true);
    expect(["pre", "in", "post", "unknown"]).toContain(g.state);
    expect(g.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(g.attribution).toBe(HENRYGD_ATTRIBUTION);
  });

  it("parses rankings and splits first-place votes from the school", () => {
    const ranks = parseHenrygdRankings(readFix("henrygd-rankings.json"));
    expect(ranks.length).toBe(5);
    expect(ranks[0]!.rank).toBe(1);
    expect(ranks[0]!.school).not.toMatch(/\(/); // votes stripped
    expect(splitSchoolVotes("Indiana (66)")).toEqual({ school: "Indiana", votes: 66 });
    expect(splitSchoolVotes("Texas")).toEqual({ school: "Texas", votes: null });
  });

  it("parses conference standings with records + streak", () => {
    const groups = parseHenrygdStandings(readFix("henrygd-standings.json"));
    expect(groups.length).toBeGreaterThan(0);
    const t = groups[0]!.teams[0]!;
    expect(t.school).toBeTruthy();
    expect(t.overallWins === null || typeof t.overallWins === "number").toBe(true);
    expect(t.streak === null || typeof t.streak === "string").toBe(true);
  });

  it("converts MM/DD/YYYY to ISO and is defensive", () => {
    expect(toIsoDate("12/13/2025")).toBe("2025-12-13");
    expect(toIsoDate("1/2/2026")).toBe("2026-01-02");
    expect(toIsoDate("garbage")).toBe("");
  });

  it("exposes verified sport paths and builds dated scoreboard paths", () => {
    expect(HENRYGD_PATHS.cfb).toBe("football/fbs");
    expect(HENRYGD_PATHS.mbb).toBe("basketball-men/d1");
    expect(henrygdDatedPath(HENRYGD_PATHS.mbb, "2025-03-20")).toBe("basketball-men/d1/2025/03/20/all-conf");
    expect(henrygdDatedPath("football/fbs", "not-a-date")).toBe("football/fbs"); // defensive fallback
  });

  it("prefers a self-hosted base URL over the public demo", () => {
    expect(henrygdBaseUrl({ HENRYGD_NCAA_BASE_URL: "http://ncaa-api:3000/" })).toBe("http://ncaa-api:3000");
    expect(henrygdBaseUrl({})).toContain("henrygd.me");
  });
});
