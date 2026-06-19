import { describe, it, expect } from "vitest";
import { pickOgImageUrl } from "@/lib/seo/og-image-url";

describe("pickOgImageUrl", () => {
  it("builds a correct URL from basic inputs", () => {
    const url = pickOgImageUrl("NFL", "Cowboys", "Eagles");
    expect(url).toBe("/og/pick/nfl-cowboys-eagles");
  });

  it("lowercases all parts", () => {
    const url = pickOgImageUrl("NBA", "CELTICS", "LAKERS");
    expect(url).toBe("/og/pick/nba-celtics-lakers");
  });

  it("replaces spaces with dashes", () => {
    const url = pickOgImageUrl("NFL", "Dallas Cowboys", "Philadelphia Eagles");
    expect(url).toBe("/og/pick/nfl-dallas-cowboys-philadelphia-eagles");
  });

  it("strips special characters", () => {
    const url = pickOgImageUrl("NFL", "Dallas Cowboys!", "Eagles & Co.");
    expect(url).toBe("/og/pick/nfl-dallas-cowboys-eagles--co");
  });

  it("handles mixed case sport and team names", () => {
    const url = pickOgImageUrl("Nba", "Los Angeles Lakers", "Boston Celtics");
    expect(url).toBe("/og/pick/nba-los-angeles-lakers-boston-celtics");
  });

  it("starts with /og/pick/ prefix", () => {
    const url = pickOgImageUrl("MLB", "Yankees", "RedSox");
    expect(url.startsWith("/og/pick/")).toBe(true);
  });

  it("handles numeric characters in team names", () => {
    const url = pickOgImageUrl("F1", "Team1", "Team2");
    expect(url).toBe("/og/pick/f1-team1-team2");
  });

  it("collapses multiple spaces into single dash", () => {
    const url = pickOgImageUrl("NFL", "Team  A", "Team  B");
    // \s+ regex collapses consecutive spaces into a single dash
    expect(url).toBe("/og/pick/nfl-team-a-team-b");
  });
});
