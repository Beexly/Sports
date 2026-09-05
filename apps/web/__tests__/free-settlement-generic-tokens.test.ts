import { describe, it, expect } from "vitest";
import {
  expandTeamMatchTokens,
  finalMatchesPick,
  settlePendingPicks,
  teamTokensMatch,
  GENERIC_TEAM_TOKENS,
  MIN_CONTAINMENT_TOKEN_LENGTH,
  type PendingPick,
  type TrustedFinal,
} from "@/lib/data-sources/free-settlement";

/**
 * Regression for the 2026-09-05 settlement backlog (22 of the 36 overdue picks were
 * MLS). Two matcher defects held or mis-graded picks:
 *   1. bare club-kind fragments ("fc", "sc", "united") and 2-3 letter abbreviations
 *      matched by substring containment, so one final satisfied many picks; and
 *   2. each pick side was tested against the UNION of both final sides, so a single
 *      shared token satisfied home and away at once.
 * The board below is the real ESPN soccer/usa.1 scoreboard for 2026-08-29 (13
 * finals, all completed), fetched on 2026-09-05. Every one of these games had a
 * published pick that was still PENDING a week later.
 */
function final(
  startIso: string,
  home: [string, string, number],
  away: [string, string, number],
): TrustedFinal {
  return {
    date: startIso.slice(0, 10),
    startIso,
    home: { name: home[0], abbr: home[1], score: home[2] },
    away: { name: away[0], abbr: away[1], score: away[2] },
    confirmation: "SINGLE_SOURCE",
    sources: ["espn-public-api"],
  };
}

const MLS_2026_08_29: readonly TrustedFinal[] = [
  final("2026-08-29T20:30:00Z", ["Seattle Sounders FC", "SEA", 2], ["Chicago Fire FC", "CHI", 2]),
  final("2026-08-29T23:30:00Z", ["Atlanta United FC", "ATL", 0], ["Charlotte FC", "CLT", 2]),
  final("2026-08-29T23:30:00Z", ["D.C. United", "DC", 0], ["LAFC", "LAFC", 0]),
  final("2026-08-29T23:30:00Z", ["Inter Miami CF", "MIA", 7], ["CF Montréal", "MTL", 1]),
  final("2026-08-29T23:30:00Z", ["Red Bull New York", "RBNY", 1], ["Philadelphia Union", "PHI", 3]),
  final("2026-08-29T23:30:00Z", ["Toronto FC", "TOR", 1], ["New York City FC", "NYC", 1]),
  final("2026-08-30T00:30:00Z", ["Houston Dynamo FC", "HOU", 0], ["San Jose Earthquakes", "SJ", 0]),
  final("2026-08-30T00:30:00Z", ["Minnesota United FC", "MIN", 3], ["Orlando City SC", "ORL", 3]),
  final("2026-08-30T00:30:00Z", ["Nashville SC", "NSH", 4], ["FC Cincinnati", "CIN", 0]),
  final("2026-08-30T00:30:00Z", ["Sporting Kansas City", "SKC", 0], ["Vancouver Whitecaps", "VAN", 3]),
  final("2026-08-30T01:30:00Z", ["Colorado Rapids", "COL", 1], ["Real Salt Lake", "RSL", 0]),
  final("2026-08-30T02:30:00Z", ["Portland Timbers", "POR", 1], ["Austin FC", "ATX", 2]),
  final("2026-08-30T02:30:00Z", ["San Diego FC", "SD", 3], ["LA Galaxy", "LA", 1]),
];

/** The published picks, named the way the odds feed names them (Game.homeTeamName / awayTeamName). */
const MLS_PICKS: ReadonlyArray<{ home: string; away: string; kickoff: string; homeWon: boolean | null }> = [
  { home: "Seattle Sounders FC", away: "Chicago Fire", kickoff: "2026-08-29T20:30:00.000Z", homeWon: null },
  { home: "Atlanta United FC", away: "Charlotte FC", kickoff: "2026-08-29T23:30:00.000Z", homeWon: false },
  { home: "D.C. United", away: "Los Angeles FC", kickoff: "2026-08-29T23:30:00.000Z", homeWon: null },
  { home: "Inter Miami CF", away: "CF Montreal", kickoff: "2026-08-29T23:30:00.000Z", homeWon: true },
  { home: "New York Red Bulls", away: "Philadelphia Union", kickoff: "2026-08-29T23:30:00.000Z", homeWon: false },
  { home: "Toronto FC", away: "New York City FC", kickoff: "2026-08-29T23:30:00.000Z", homeWon: null },
  { home: "Houston Dynamo FC", away: "San Jose Earthquakes", kickoff: "2026-08-30T00:30:00.000Z", homeWon: null },
  { home: "Minnesota United FC", away: "Orlando City SC", kickoff: "2026-08-30T00:30:00.000Z", homeWon: null },
  { home: "Nashville SC", away: "FC Cincinnati", kickoff: "2026-08-30T00:30:00.000Z", homeWon: true },
  { home: "Sporting Kansas City", away: "Vancouver Whitecaps FC", kickoff: "2026-08-30T00:30:00.000Z", homeWon: false },
  { home: "Colorado Rapids", away: "Real Salt Lake", kickoff: "2026-08-30T01:30:00.000Z", homeWon: true },
  { home: "Portland Timbers", away: "Austin FC", kickoff: "2026-08-30T02:30:00.000Z", homeWon: false },
  { home: "San Diego FC", away: "LA Galaxy", kickoff: "2026-08-30T02:30:00.000Z", homeWon: true },
];

function mlPick(i: number, side: "home" | "away"): PendingPick {
  const p = MLS_PICKS[i]!;
  return {
    pickId: `mls-${i}-${side}`,
    pickType: "MONEYLINE",
    selection: `${side === "home" ? p.home : p.away} ML (model signal)`,
    line: 0,
    homeTeam: p.home,
    awayTeam: p.away,
    sportKey: "soccer_usa_mls",
    gameDateIso: p.kickoff,
  };
}

describe("expandTeamMatchTokens drops bare club-kind fragments", () => {
  it("never emits fc / sc / united / city as standalone tokens", () => {
    for (const name of ["Toronto FC", "Nashville SC", "D.C. United", "Orlando City SC", "Sporting Kansas City", "Real Salt Lake", "Inter Miami CF"]) {
      const tokens = expandTeamMatchTokens(name);
      for (const t of tokens) expect(GENERIC_TEAM_TOKENS.has(t)).toBe(false);
      // The full normalized name still carries the suffix, so exact matching keeps working.
      expect(tokens).toContain(name.toLowerCase().replace(/[^a-z0-9]/g, ""));
    }
  });

  it("keeps real nicknames and known aliases", () => {
    expect(expandTeamMatchTokens("Toronto Blue Jays")).toContain("bluejays");
    expect(expandTeamMatchTokens("Los Angeles FC")).toContain("lafc");
    expect(expandTeamMatchTokens("Seattle Sounders FC")).toContain("sounders");
  });
});

describe("teamTokensMatch", () => {
  it("matches abbreviations only exactly, never by containment", () => {
    expect(MIN_CONTAINMENT_TOKEN_LENGTH).toBe(4);
    expect(teamTokensMatch("la", "la")).toBe(true);
    expect(teamTokensMatch("la", "atlantaunitedfc")).toBe(false); // atLAnta
    expect(teamTokensMatch("la", "orlandocitysc")).toBe(false); // orLAndo
    expect(teamTokensMatch("fla", "saintfrancisredflash")).toBe(false); // redFLAsh
    expect(teamTokensMatch("dc", "dcunited")).toBe(false);
    expect(teamTokensMatch("dcunited", "dcunited")).toBe(true);
  });

  it("still matches a real nickname fragment inside a full name", () => {
    expect(teamTokensMatch("cubs", "chicagocubs")).toBe(true);
    expect(teamTokensMatch("navy", "navymidshipmen")).toBe(true);
    expect(teamTokensMatch("sounders", "seattlesoundersfc")).toBe(true);
  });
});

describe("finalMatchesPick is bipartite", () => {
  const austinNashville = final("2026-08-30T00:30:00Z", ["Nashville SC", "NSH", 4], ["Austin FC", "ATX", 2]);

  it("does not let one shared fragment satisfy both pick sides", () => {
    const charlotteAtToronto = mlPick(5, "home"); // Toronto FC vs New York City FC
    expect(finalMatchesPick({ ...charlotteAtToronto, homeTeam: "Toronto FC", awayTeam: "Charlotte FC" }, austinNashville)).toBe(false);
  });

  it("matches the real fixture in either orientation", () => {
    const portlandAustin = MLS_2026_08_29[11]!;
    const pick = mlPick(11, "away");
    expect(finalMatchesPick(pick, portlandAustin)).toBe(true);
    expect(finalMatchesPick({ ...pick, homeTeam: pick.awayTeam, awayTeam: pick.homeTeam }, portlandAustin)).toBe(true);
  });
});

describe("NFL Week 1 regression: 2-3 letter ESPN abbreviations never grade a pick off another game", () => {
  // Reproduced verbatim against origin/main's matcher on 2026-09-05: "tennesseetitans"
  // and "newyorkjets" both contain "ne" (New England), and "chiefs"/"cardinals" hit
  // CHI/CAR. Under the fixed matcher an abbreviation matches only exactly.
  const neAtSea = final("2026-09-10T00:20:00Z", ["Seattle Seahawks", "SEA", 0], ["New England Patriots", "NE", 0]);
  const chiAtCar = final("2026-09-13T17:00:00Z", ["Carolina Panthers", "CAR", 0], ["Chicago Bears", "CHI", 0]);
  const nyjAtTen = final("2026-09-13T17:00:00Z", ["Tennessee Titans", "TEN", 20], ["New York Jets", "NYJ", 17]);

  it("Jets @ Titans does not match the Patriots @ Seahawks final", () => {
    const pick = { ...mlPick(0, "home"), homeTeam: "Tennessee Titans", awayTeam: "New York Jets" };
    expect(finalMatchesPick(pick, neAtSea)).toBe(false);
    expect(finalMatchesPick(pick, nyjAtTen)).toBe(true);
  });

  it("Cardinals @ Chiefs does not match the Bears @ Panthers final", () => {
    const pick = { ...mlPick(0, "home"), homeTeam: "Kansas City Chiefs", awayTeam: "Arizona Cardinals" };
    expect(finalMatchesPick(pick, chiAtCar)).toBe(false);
  });
});

describe("the 2026-08-29 MLS board grades 13/13 with zero holds", () => {
  it("settles every pick against exactly its own final", () => {
    const picks = MLS_PICKS.map((_, i) => mlPick(i, "home"));
    const outcomes = settlePendingPicks(picks, MLS_2026_08_29);
    const held = outcomes.filter((o) => o.status === "HELD");
    const pending = outcomes.filter((o) => o.status === "PENDING");
    expect(held.map((o) => o.pickId)).toEqual([]);
    expect(pending.map((o) => o.pickId)).toEqual([]);
    for (const [i, o] of outcomes.entries()) {
      if (o.status !== "SETTLED") throw new Error(`${o.pickId} not settled`);
      const f = MLS_2026_08_29[i]!;
      expect([o.homeScore, o.awayScore]).toEqual([f.home.score, f.away.score]);
      // Draw grading for a two-way soccer moneyline is the engine's call
      // (calculatePickResult), not the matcher's; only decided games assert a side.
      const expected = MLS_PICKS[i]!.homeWon;
      if (expected !== null) expect(o.result).toBe(expected ? "WIN" : "LOSS");
    }
  });
});

describe("a missing true final never grades a pick off a different game", () => {
  it("holds Saint Francis @ Buffalo Bulls as NO_FINAL when only South Florida Bulls @ Florida is on the board", () => {
    const board: TrustedFinal[] = [
      final("2025-09-06T23:00:00Z", ["Florida Gators", "FLA", 18], ["South Florida Bulls", "USF", 16]),
    ];
    const pick: PendingPick = {
      pickId: "cfb-1",
      pickType: "MONEYLINE",
      selection: "Buffalo Bulls ML (-2500)",
      line: -2500,
      homeTeam: "Buffalo Bulls",
      awayTeam: "Saint Francis Red Flash",
      sportKey: "americanfootball_ncaaf",
      gameDateIso: "2025-09-06T19:30:00.000Z",
    };
    const [out] = settlePendingPicks([pick], board);
    expect(out).toEqual({ pickId: "cfb-1", status: "PENDING", reason: "NO_FINAL" });
  });

  it("still settles the Buffalo pick once its own final is present alongside the collision", () => {
    const board: TrustedFinal[] = [
      final("2025-09-06T23:00:00Z", ["Florida Gators", "FLA", 18], ["South Florida Bulls", "USF", 16]),
      final("2025-09-06T19:30:00Z", ["Buffalo Bulls", "BUFF", 45], ["Saint Francis Red Flash", "SFPA", 6]),
    ];
    const pick: PendingPick = {
      pickId: "cfb-2",
      pickType: "MONEYLINE",
      selection: "Buffalo Bulls ML (-2500)",
      line: -2500,
      homeTeam: "Buffalo Bulls",
      awayTeam: "Saint Francis Red Flash",
      sportKey: "americanfootball_ncaaf",
      gameDateIso: "2025-09-06T19:30:00.000Z",
    };
    const [out] = settlePendingPicks([pick], board);
    expect(out?.status).toBe("SETTLED");
    if (out?.status !== "SETTLED") throw new Error("not settled");
    expect(out.result).toBe("WIN");
    expect([out.homeScore, out.awayScore]).toEqual([45, 6]);
  });
});
