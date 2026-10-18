import { describe, expect, it } from "vitest";
import {
  buildNflInjuryEvidence,
  isNflSportKey,
  type InjuryEvidenceRow,
} from "./nfl-injury-evidence";

const NOW = new Date("2026-10-17T18:00:00.000Z");
const FETCHED = new Date("2026-10-17T15:00:35.268Z");

function row(over: Partial<InjuryEvidenceRow> = {}): InjuryEvidenceRow {
  return {
    playerName: "Player One",
    team: "HOU",
    position: "WR",
    reportStatus: "Questionable",
    practiceStatus: "Limited Participation",
    primaryInjury: "Hamstring",
    season: 2026,
    week: 6,
    sourceId: "nflverse",
    fetchedAt: FETCHED,
    ...over,
  };
}

function base(over: Record<string, unknown> = {}) {
  return {
    sportKey: "americanfootball_nfl",
    homeTeamName: "Houston Texans",
    awayTeamName: "Jacksonville Jaguars",
    season: 2026,
    week: 6,
    homeInjuries: [] as InjuryEvidenceRow[],
    awayInjuries: [] as InjuryEvidenceRow[],
    now: NOW,
    ...over,
  };
}

describe("buildNflInjuryEvidence", () => {
  it("aggregates both teams' real week-6 rows with names, statuses and counts", () => {
    const evidence = buildNflInjuryEvidence(
      base({
        homeInjuries: [
          row({ playerName: "C.J. Stroud", position: "QB", reportStatus: "Questionable", primaryInjury: "Concussion" }),
          row({ playerName: "Laremy Tunsil", position: "OT", reportStatus: "Out", primaryInjury: "Knee" }),
          row({ playerName: "Practice Only", position: "LB", reportStatus: "", practiceStatus: "Full Participation", primaryInjury: "Ankle" }),
        ],
        awayInjuries: [
          row({ playerName: "Trevor Lawrence", team: "JAX", position: "QB", reportStatus: "Doubtful", primaryInjury: "Shoulder" }),
        ],
      }),
    );

    expect(evidence).not.toBeNull();
    expect(evidence!.sourceCategory).toBe("PLAYER_AVAILABILITY");
    expect(evidence!.sourceName).toBe("nflverse");
    expect(evidence!.status).toBe("AVAILABLE");
    expect(evidence!.season).toBe(2026);
    expect(evidence!.week).toBe(6);
    expect(evidence!.trustLevel).toBe(0.9);
    expect(evidence!.isBootstrap).toBe(false);
    expect(evidence!.fetchedAt).toBe("2026-10-17T15:00:35.268Z");
    expect(evidence!.totalListedPlayers).toBe(4);
    expect(evidence!.teamsWithoutReport).toEqual([]);

    const hou = evidence!.teams.find((t) => t.team === "HOU")!;
    expect(hou.teamName).toBe("Houston Texans");
    expect(hou.listedPlayers).toBe(3);
    expect(hou.byStatus).toEqual({ Questionable: 1, Out: 1 });
    // Game-status players only, Out first; practice-only row is counted, not named.
    expect(hou.players.map((p) => p.playerName)).toEqual(["Laremy Tunsil", "C.J. Stroud"]);
    expect(hou.players[0]).toEqual({
      playerName: "Laremy Tunsil",
      position: "OT",
      reportStatus: "Out",
      practiceStatus: "Limited Participation",
      primaryInjury: "Knee",
    });

    const jax = evidence!.teams.find((t) => t.team === "JAX")!;
    expect(jax.listedPlayers).toBe(1);
    expect(jax.byStatus).toEqual({ Doubtful: 1 });
    expect(jax.players[0].playerName).toBe("Trevor Lawrence");

    expect(evidence!.whyUsedOrBlocked).toContain("NFL week 6 injury report (nflverse");
    expect(evidence!.whyUsedOrBlocked).toContain("HOU 3 listed (1 Out, 1 Questionable)");
  });

  it("ignores earlier-week rows instead of presenting a stale report as current", () => {
    const evidence = buildNflInjuryEvidence(
      base({
        homeInjuries: [row({ week: 5, playerName: "Last Week Guy" })],
        awayInjuries: [row({ team: "JAX", week: 6, playerName: "Current Guy" })],
      }),
    );

    expect(evidence).not.toBeNull();
    expect(evidence!.teams.map((t) => t.team)).toEqual(["JAX"]);
    expect(evidence!.totalListedPlayers).toBe(1);
    expect(evidence!.teamsWithoutReport).toEqual(["HOU (Houston Texans)"]);
    expect(evidence!.whyUsedOrBlocked).toContain("No week-6 report rows for HOU (Houston Texans)");
    expect(JSON.stringify(evidence)).not.toContain("Last Week Guy");
  });

  it("fails closed (null) when neither team has rows at the current week", () => {
    expect(buildNflInjuryEvidence(base())).toBeNull();
    expect(
      buildNflInjuryEvidence(base({ homeInjuries: [row({ week: 5 })], awayInjuries: [] })),
    ).toBeNull();
  });

  it("fails closed when season/week or team names are unresolved", () => {
    const injuries = [row()];
    expect(buildNflInjuryEvidence(base({ homeInjuries: injuries, season: null }))).toBeNull();
    expect(buildNflInjuryEvidence(base({ homeInjuries: injuries, week: null }))).toBeNull();
    expect(
      buildNflInjuryEvidence(base({ homeInjuries: injuries, homeTeamName: "TBD" })),
    ).toBeNull();
  });

  it("returns null for non-NFL sports (no NCAAF injury feed is wired)", () => {
    const injuries = [row()];
    expect(
      buildNflInjuryEvidence(
        base({ homeInjuries: injuries, sportKey: "americanfootball_ncaaf", homeTeamName: "Texas Longhorns", awayTeamName: "Oklahoma Sooners" }),
      ),
    ).toBeNull();
    expect(isNflSportKey("americanfootball_nfl")).toBe(true);
    expect(isNflSportKey("americanfootball_ncaaf")).toBe(false);
  });

  it("reports the real sourceId and caps named players per team", () => {
    const many = Array.from({ length: 15 }, (_, i) =>
      row({ playerName: `Player ${String(i).padStart(2, "0")}`, reportStatus: "Out" }),
    );
    const evidence = buildNflInjuryEvidence(base({ homeInjuries: many }))!;
    expect(evidence.teams[0].listedPlayers).toBe(15);
    expect(evidence.teams[0].byStatus).toEqual({ Out: 15 });
    expect(evidence.teams[0].players).toHaveLength(10);
    expect(evidence.sourceName).toBe("nflverse");
  });
});
