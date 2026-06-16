import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  parseEspnBoxscore,
  espnSummaryUrl,
  type EspnSummary,
} from "@/lib/data-sources/free-adapters/espn-boxscore";

const FIX = resolve(__dirname, "fixtures");
const summary: EspnSummary = JSON.parse(readFileSync(resolve(FIX, "espn-nfl-summary.json"), "utf8"));

describe("ESPN box-score adapter (free, cleared, facts-only)", () => {
  it("parses team-level statistics", () => {
    const box = parseEspnBoxscore(summary, "nfl");
    expect(box.teams.length).toBe(2);
    expect(box.teams[0]!.abbreviation).toMatch(/^[A-Z]{2,4}$/);
    expect(box.teams[0]!.stats.length).toBeGreaterThan(0);
    expect(box.teams[0]!.stats[0]).toHaveProperty("label");
    expect(box.teams[0]!.stats[0]).toHaveProperty("value");
  });

  it("maps player stats by category with labels zipped to values", () => {
    const box = parseEspnBoxscore(summary, "nfl");
    const team0 = box.players[0]!;
    expect(team0.abbreviation).toBeTruthy();
    const passing = team0.categories.find((c) => c.category === "passing")!;
    expect(passing).toBeDefined();
    const qb = passing.players[0]!;
    expect(qb.name).toBeTruthy();
    // labels (C/ATT, YDS, TD, ...) became keys mapped to the athlete's values
    expect(Object.keys(qb.stats).length).toBeGreaterThan(0);
    expect(qb.stats).toHaveProperty("YDS");
  });

  it("parses injuries (player + status)", () => {
    const box = parseEspnBoxscore(summary, "nfl");
    expect(box.injuries.length).toBeGreaterThan(0);
    const first = box.injuries.find((t) => t.injuries.length > 0)!;
    expect(first.injuries[0]!.player).toBeTruthy();
    expect(first.injuries[0]!.status).toBeTruthy();
  });

  it("attaches attribution and is defensive against empty payloads", () => {
    expect(parseEspnBoxscore(summary, "nfl").attribution).toContain("ESPN");
    const empty = parseEspnBoxscore({}, "nba");
    expect(empty.teams).toEqual([]);
    expect(empty.players).toEqual([]);
    expect(empty.injuries).toEqual([]);
  });

  it("builds the verified per-sport summary URL", () => {
    expect(espnSummaryUrl("nfl", "401772900")).toBe(
      "https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=401772900",
    );
    expect(espnSummaryUrl("nba", "x")).toContain("basketball/nba/summary?event=x");
  });
});
