import { describe, it, expect } from "vitest";
import { teamsMatch, normalizeTeamName } from "../sports-db-client.js";

describe("normalizeTeamName", () => {
  it("lowercases and trims", () => {
    expect(normalizeTeamName("  Boston Celtics  ")).toBe("boston celtics");
    expect(normalizeTeamName("LOS ANGELES LAKERS")).toBe("los angeles lakers");
  });

  it("collapses multiple spaces", () => {
    expect(normalizeTeamName("New  York  Yankees")).toBe("new york yankees");
  });
});

describe("teamsMatch", () => {
  it("matches identical names (case-insensitive)", () => {
    expect(teamsMatch("Boston Celtics", "Boston Celtics")).toBe(true);
    expect(teamsMatch("boston celtics", "BOSTON CELTICS")).toBe(true);
  });

  it("matches when db name is substring of sdb name", () => {
    expect(teamsMatch("Celtics", "Boston Celtics")).toBe(true);
  });

  it("matches when sdb name is substring of db name", () => {
    expect(teamsMatch("Boston Celtics", "Celtics")).toBe(true);
  });

  it("does NOT match completely different teams", () => {
    expect(teamsMatch("Boston Celtics", "Chicago Bulls")).toBe(false);
    expect(teamsMatch("New York Yankees", "Boston Red Sox")).toBe(false);
  });

  it("matches by last word (team nickname)", () => {
    // "Lakers" matches "Los Angeles Lakers"
    expect(teamsMatch("Los Angeles Lakers", "Lakers")).toBe(true);
    expect(teamsMatch("Golden State Warriors", "Warriors")).toBe(true);
  });

  it("matches alias — LA Lakers = Los Angeles Lakers", () => {
    expect(teamsMatch("Los Angeles Lakers", "LA Lakers")).toBe(true);
  });

  it("matches alias — LA Clippers = Los Angeles Clippers", () => {
    expect(teamsMatch("Los Angeles Clippers", "LA Clippers")).toBe(true);
  });

  it("does NOT match home vs away team cross-match", () => {
    expect(teamsMatch("Indiana Pacers", "Boston Celtics")).toBe(false);
  });

  it("handles NHL city names like Colorado Avalanche", () => {
    expect(teamsMatch("Colorado Avalanche", "Colorado Avalanche")).toBe(true);
  });

  it("handles MLB partial names — Yankees", () => {
    expect(teamsMatch("New York Yankees", "New York Yankees")).toBe(true);
    expect(teamsMatch("New York Yankees", "Yankees")).toBe(true);
  });

  it("handles MLS names", () => {
    expect(teamsMatch("LA Galaxy", "LA Galaxy")).toBe(true);
    expect(teamsMatch("Seattle Sounders FC", "Seattle Sounders")).toBe(true);
  });
});
