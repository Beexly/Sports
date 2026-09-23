import { describe, expect, it } from "vitest";
import {
  isResearchPowerRatingsEnabled,
  lookupResearchRating,
  mergeResearchRatings,
  parseCompositePowerRatingsCsv,
  parseObjectivePowerRatingsCsv,
  resolveNflTeamAbbr,
  type ResearchTeamRating,
} from "./research-power-ratings.js";

const COMPOSITE_CSV = `rank,team,composite,std_dev,fpi,fpi_rank
1,BUF,5.8,0.6,5.5,2
2,LAR,5.5,0.6,4.7,3
3,MIA,-8.0,0.9,-8.0,31
`;

const OBJECTIVE_CSV = `tier,rank,team,market_implied_win_pct
The Favorites,1,LAR,74.2
Very Bad,32,MIA,21.9
`;

describe("isResearchPowerRatingsEnabled — default OFF", () => {
  it("unset is false", () => {
    expect(isResearchPowerRatingsEnabled({})).toBe(false);
  });
  it("explicit true/1/yes/on only", () => {
    expect(isResearchPowerRatingsEnabled({ RESEARCH_POWER_RATINGS_ENABLED: "true" })).toBe(true);
    expect(isResearchPowerRatingsEnabled({ RESEARCH_POWER_RATINGS_ENABLED: "1" })).toBe(true);
    expect(isResearchPowerRatingsEnabled({ RESEARCH_POWER_RATINGS_ENABLED: "yes" })).toBe(true);
    expect(isResearchPowerRatingsEnabled({ RESEARCH_POWER_RATINGS_ENABLED: "on" })).toBe(true);
    expect(isResearchPowerRatingsEnabled({ RESEARCH_POWER_RATINGS_ENABLED: "TRUE" })).toBe(true);
    expect(isResearchPowerRatingsEnabled({ RESEARCH_POWER_RATINGS_ENABLED: "maybe" })).toBe(false);
    expect(isResearchPowerRatingsEnabled({ RESEARCH_POWER_RATINGS_ENABLED: "" })).toBe(false);
  });
});

describe("resolveNflTeamAbbr", () => {
  it("accepts abbreviations and full names", () => {
    expect(resolveNflTeamAbbr("BUF")).toBe("BUF");
    expect(resolveNflTeamAbbr("buf")).toBe("BUF");
    expect(resolveNflTeamAbbr("Buffalo Bills")).toBe("BUF");
    expect(resolveNflTeamAbbr("Kansas City Chiefs")).toBe("KC");
    expect(resolveNflTeamAbbr("Los Angeles Rams")).toBe("LAR");
  });
  it("returns null for unknown tokens — never guess", () => {
    expect(resolveNflTeamAbbr("")).toBeNull();
    expect(resolveNflTeamAbbr("London Silly Nannies")).toBeNull();
    expect(resolveNflTeamAbbr("XXX")).toBeNull();
  });
});

describe("parseCompositePowerRatingsCsv", () => {
  it("reads points-vs-average ratings keyed by abbr", () => {
    const rows = parseCompositePowerRatingsCsv(COMPOSITE_CSV);
    expect(rows).toHaveLength(3);
    const buf = rows.find((r) => r.team === "BUF");
    expect(buf?.rating).toBeCloseTo(5.8);
    expect(buf?.winPctVsAvg).toBeNull();
    expect(buf?.rank).toBe(1);
  });
  it("returns [] on empty or header-only input", () => {
    expect(parseCompositePowerRatingsCsv("")).toEqual([]);
    expect(parseCompositePowerRatingsCsv("rank,team,composite")).toEqual([]);
  });
  it("skips unknown teams and non-numeric ratings", () => {
    const rows = parseCompositePowerRatingsCsv(
      "rank,team,composite\n1,ZZZ,5.0\n2,BUF,abc\n",
    );
    expect(rows).toEqual([]);
  });
});

describe("parseObjectivePowerRatingsCsv", () => {
  it("reads market-implied win% vs average as a (0,1) rate", () => {
    const rows = parseObjectivePowerRatingsCsv(OBJECTIVE_CSV);
    expect(rows).toHaveLength(2);
    const lar = rows.find((r) => r.team === "LAR");
    expect(lar?.winPctVsAvg).toBeCloseTo(0.742);
    expect(lar?.rating).toBeNull();
  });
  it("rejects out-of-range percentages", () => {
    const rows = parseObjectivePowerRatingsCsv(
      "tier,rank,team,market_implied_win_pct\nA,1,BUF,100\n",
    );
    expect(rows).toEqual([]);
  });
});

describe("mergeResearchRatings", () => {
  it("prefers composite points and keeps win% when both exist", () => {
    const merged = mergeResearchRatings(
      parseCompositePowerRatingsCsv(COMPOSITE_CSV),
      parseObjectivePowerRatingsCsv(OBJECTIVE_CSV),
    );
    const lar = merged.get("LAR");
    expect(lar?.rating).toBeCloseTo(5.5);
    expect(lar?.winPctVsAvg).toBeCloseTo(0.742);
  });
  it("keeps win%-only teams", () => {
    const onlyObj: ResearchTeamRating[] = [
      { team: "BUF", rating: null, winPctVsAvg: 0.7, rank: 1 },
    ];
    const merged = mergeResearchRatings([], onlyObj);
    expect(merged.get("BUF")?.winPctVsAvg).toBeCloseTo(0.7);
  });
});

describe("lookupResearchRating", () => {
  it("resolves full names into the table", () => {
    const merged = mergeResearchRatings(
      parseCompositePowerRatingsCsv(COMPOSITE_CSV),
      parseObjectivePowerRatingsCsv(OBJECTIVE_CSV),
    );
    const table = {
      teams: merged,
      asOf: "2026-09-22T00:00:00.000Z",
      source: "research_power_ratings",
      rowCount: merged.size,
    };
    expect(lookupResearchRating(table, "Buffalo Bills")?.rating).toBeCloseTo(5.8);
    expect(lookupResearchRating(table, "London Silly Nannies")).toBeNull();
  });
});
