import { describe, expect, it } from "vitest";
import {
  findMatchingTeamInText,
  normalizeComparableText,
  parseSportsScore,
} from "../team-text-match.js";

describe("normalizeComparableText", () => {
  it("strips diacritics and punctuation", () => {
    expect(normalizeComparableText("São Paulo FC!")).toBe("sao paulo fc");
  });
});

describe("findMatchingTeamInText", () => {
  it("prefers longer team names", () => {
    const hit = findMatchingTeamInText("New York Knicks vs Boston", [
      "New York",
      "New York Knicks",
      "Boston",
    ]);
    expect(hit).toBe("New York Knicks");
  });

  it("does not match short tokens inside words", () => {
    expect(findMatchingTeamInText("LATE GAME", ["LA"])).toBeNull();
  });
});

describe("parseSportsScore", () => {
  it("parses hyphen scores", () => {
    expect(parseSportsScore("Final 101-98")).toEqual({ away: 101, home: 98 });
  });
});
