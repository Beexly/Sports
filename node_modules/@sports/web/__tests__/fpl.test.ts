import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  parseFplTeams,
  parseFplPlayers,
  parseFplFixtures,
  FPL_ATTRIBUTION,
  type FplBootstrap,
} from "@/lib/data-sources/free-adapters/fpl";

const FIX = resolve(__dirname, "fixtures");
const read = (f: string) => JSON.parse(readFileSync(resolve(FIX, f), "utf8"));
const bootstrap: FplBootstrap = read("fpl-bootstrap.json");

describe("FPL adapter (free EPL facts, gated)", () => {
  it("parses team table facts", () => {
    const teams = parseFplTeams(bootstrap);
    expect(teams.length).toBe(3);
    const t = teams[0]!;
    expect(t.name).toBeTruthy();
    expect(t.short).toMatch(/^[A-Z]{3}$/);
    expect(typeof t.points).toBe("number");
  });

  it("parses players with position + team mapped, FACTS only", () => {
    const players = parseFplPlayers(bootstrap);
    expect(players.length).toBe(3);
    const p = players[0]!;
    expect(p.name).toBeTruthy();
    expect(["GKP", "DEF", "MID", "FWD", "UNK"]).toContain(p.position);
    expect(p.teamShort).toMatch(/^[A-Z]{3}$/); // joined from numeric team id
    expect(typeof p.minutes).toBe("number");
    expect(typeof p.goals).toBe("number");
    // proprietary derived metrics must NOT be present on our shape
    expect((p as Record<string, unknown>).ict_index).toBeUndefined();
    expect((p as Record<string, unknown>).strength).toBeUndefined();
  });

  it("parses fixtures with team codes mapped from ids", () => {
    const fixtures = parseFplFixtures(read("fpl-fixtures.json"), bootstrap);
    expect(fixtures.length).toBeGreaterThan(0);
    const f = fixtures[0]!;
    // team_h/team_a in the fixture point at teams present in the trimmed bootstrap (ids 1-3)
    expect(typeof f.finished).toBe("boolean");
    expect(f.homeScore === null || typeof f.homeScore === "number").toBe(true);
    expect(f.kickoff === null || typeof f.kickoff === "string").toBe(true);
  });

  it("is defensive against empty input", () => {
    expect(parseFplTeams({})).toEqual([]);
    expect(parseFplPlayers({})).toEqual([]);
    expect(parseFplFixtures([], {})).toEqual([]);
  });

  it("carries attribution", () => {
    expect(FPL_ATTRIBUTION).toContain("Fantasy Premier League");
  });
});
