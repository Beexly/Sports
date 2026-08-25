import { describe, it, expect } from "vitest";
import {
  expandTeamMatchTokens,
  finalMatchesPick,
  orientToPickHome,
  settlePendingPicks,
  teamTokensMatch,
  type PendingPick,
  type TrustedFinal,
} from "@/lib/data-sources/free-settlement";

/**
 * ENTITY-RESOLUTION INTEGRITY — settlement must never bind a pick to a DIFFERENT game.
 *
 * `settlePendingPicks` accepts any trusted final within ±2 calendar days of the pick's
 * game date, so on any given board the *wrong* game between overlapping opponents is
 * routinely in the candidate list. Matching therefore has to be exact: a near-miss here
 * does not fail loudly, it publishes a WIN/LOSS against another team's scoreline and
 * corrupts the settled track record the PROVEN pricing gate is measured on.
 *
 * Every case below feeds COLLIDING inputs and asserts the matcher REFUSES (fail closed,
 * pick stays PENDING for RCA) rather than settling against the neighbouring game.
 * Assertions are runtime — apps/web/tsconfig.json excludes tests from typecheck.
 */

const espnSources = ["espn-public-api", "henrygd-ncaa"] as const;

function pick(over: Partial<PendingPick>): PendingPick {
  return {
    pickId: "p1",
    pickType: "MONEYLINE",
    selection: "HOME",
    line: 0,
    homeTeam: "Home",
    awayTeam: "Away",
    sportKey: "baseball_mlb",
    gameDateIso: "2025-08-15T23:05:00.000Z",
    ...over,
  };
}

function final(
  home: { name: string; abbr: string; score: number },
  away: { name: string; abbr: string; score: number },
  date = "2025-08-17",
): TrustedFinal {
  return { date, home, away, confirmation: "CONFIRMED", sources: [...espnSources] };
}

describe("token matching is exact — no substring containment", () => {
  it('"sox" must not match "chicagowhitesox" (Red Sox vs White Sox)', () => {
    expect(teamTokensMatch("sox", "chicagowhitesox")).toBe(false);
  });

  it('"as" must not match "houstonastros" or "texasrangers" (Athletics alias)', () => {
    expect(teamTokensMatch("as", "houstonastros")).toBe(false);
    expect(teamTokensMatch("as", "texasrangers")).toBe(false);
  });

  it('"chicago" must not match "chicagocubs" (bare-city alias)', () => {
    expect(teamTokensMatch("chicago", "chicagocubs")).toBe(false);
  });

  it("does not emit non-identifying bare fragments as match tokens", () => {
    // "Sox" is shared by Boston and Chicago; "FC"/"State"/"United" are league or
    // school qualifiers, not identities. The full string and the two-word nickname
    // still carry the identity.
    expect(expandTeamMatchTokens("Boston Red Sox")).not.toContain("sox");
    expect(expandTeamMatchTokens("Boston Red Sox")).toEqual(
      expect.arrayContaining(["bostonredsox", "redsox"]),
    );
    expect(expandTeamMatchTokens("Chicago White Sox")).not.toContain("sox");
    expect(expandTeamMatchTokens("Los Angeles FC")).not.toContain("fc");
    expect(expandTeamMatchTokens("Michigan State")).not.toContain("state");
    expect(expandTeamMatchTokens("D.C. United")).not.toContain("united");
    expect(expandTeamMatchTokens("Miami (FL)")).not.toContain("fl");
  });
});

describe("settlement must refuse a neighbouring game (fail closed)", () => {
  it("a Red Sox pick never settles against a White Sox final at the same venue", () => {
    // Yankees host Boston, then host Chicago two days later. Boston's final is missing
    // from this board (late/held); only the White Sox final is present.
    const p = pick({
      pickId: "redsox",
      homeTeam: "New York Yankees",
      awayTeam: "Boston Red Sox",
      selection: "Boston Red Sox",
    });
    const whiteSoxFinal = final(
      { name: "New York Yankees", abbr: "NYY", score: 9 },
      { name: "Chicago White Sox", abbr: "CHW", score: 1 },
    );
    expect(finalMatchesPick(p, whiteSoxFinal)).toBe(false);
    const out = settlePendingPicks([p], [whiteSoxFinal])[0]!;
    expect(out.status).toBe("PENDING");
    expect(out.status === "PENDING" ? out.reason : null).toBe("NO_FINAL");
  });

  it("an Athletics pick never settles against an Astros final", () => {
    const p = pick({
      pickId: "athletics",
      homeTeam: "Texas Rangers",
      awayTeam: "Athletics",
      selection: "Athletics",
    });
    const astrosFinal = final(
      { name: "Texas Rangers", abbr: "TEX", score: 7 },
      { name: "Houston Astros", abbr: "HOU", score: 2 },
    );
    expect(finalMatchesPick(p, astrosFinal)).toBe(false);
    expect(settlePendingPicks([p], [astrosFinal])[0]!.status).toBe("PENDING");
  });

  it("both pick teams matching the SAME final side never settles", () => {
    // Crosstown pick (White Sox host Cubs). The board has a Cubs game against a THIRD
    // team. "chicago" (White Sox alias) used to reach "chicagocubs" while "cubs"
    // reached the same side, satisfying a union-of-both-sides match with one team.
    const p = pick({
      pickId: "crosstown",
      homeTeam: "Chicago White Sox",
      awayTeam: "Chicago Cubs",
      selection: "Chicago Cubs",
    });
    const unrelated = final(
      { name: "Milwaukee Brewers", abbr: "MIL", score: 8 },
      { name: "Chicago Cubs", abbr: "CHC", score: 0 },
      "2025-08-16",
    );
    expect(finalMatchesPick(p, unrelated)).toBe(false);
    expect(orientToPickHome(p, unrelated)).toBeNull();
    expect(settlePendingPicks([p], [unrelated])[0]!.status).toBe("PENDING");
  });

  it("a pick whose two teams are the same string is refused, not graded on a guessed orientation", () => {
    // A corrupt Game row (homeTeamName === awayTeamName) used to satisfy the
    // union-of-both-sides test — that one team appears in the final, twice — and
    // orientToPickHome then latched onto whichever side it tested first. There is no
    // evidence for which way round to grade, so it must refuse.
    const p = pick({
      pickId: "degenerate",
      homeTeam: "Boston Red Sox",
      awayTeam: "Boston Red Sox",
      selection: "Boston Red Sox",
    });
    const f = final(
      { name: "New York Yankees", abbr: "NYY", score: 2 },
      { name: "Boston Red Sox", abbr: "BOS", score: 5 },
      "2025-08-15",
    );
    expect(finalMatchesPick(p, f)).toBe(false);
    expect(orientToPickHome(p, f)).toBeNull();
    expect(settlePendingPicks([p], [f])[0]!.status).toBe("PENDING");
  });

  it('an MLS pick never settles against another club sharing the "FC" suffix', () => {
    const p = pick({
      pickId: "mls",
      sportKey: "soccer_usa_mls",
      homeTeam: "Seattle Sounders FC",
      awayTeam: "Los Angeles FC",
    });
    const otherMatch = final(
      { name: "Austin FC", abbr: "ATX", score: 3 },
      { name: "Chicago Fire FC", abbr: "CHI", score: 0 },
      "2025-08-16",
    );
    expect(finalMatchesPick(p, otherMatch)).toBe(false);
    expect(settlePendingPicks([p], [otherMatch])[0]!.status).toBe("PENDING");
  });

  it("a college pick never settles against the OTHER school in the same state", () => {
    // "Michigan State" ⊃ "Michigan": the classic college collision. Both programs are
    // ingested for ncaaf/ncaab and both play most Saturdays.
    const p = pick({
      pickId: "college",
      sportKey: "americanfootball_ncaaf",
      homeTeam: "Michigan State",
      awayTeam: "Purdue",
    });
    const wolverines = final(
      { name: "Michigan", abbr: "MICH", score: 31 },
      { name: "Purdue", abbr: "PUR", score: 10 },
      "2025-08-16",
    );
    expect(finalMatchesPick(p, wolverines)).toBe(false);
    expect(settlePendingPicks([p], [wolverines])[0]!.status).toBe("PENDING");
  });

  it("the two LA franchises never cross-bind through their shared abbreviation", () => {
    // LAC is the Chargers (NFL) and the Clippers (NBA); DEN is the Broncos and the
    // Nuggets. Containment made the abbr a substring of the pick's own full token
    // ("lac" ⊂ "lachargers", "den" ⊂ "denverbroncos"), so an NFL pick matched an
    // NBA final outright.
    const chargers = pick({
      pickId: "lac",
      sportKey: "americanfootball_nfl",
      homeTeam: "LA Chargers",
      awayTeam: "Denver Broncos",
    });
    const clippersFinal = final(
      { name: "LA Clippers", abbr: "LAC", score: 112 },
      { name: "Denver Nuggets", abbr: "DEN", score: 108 },
      "2025-08-16",
    );
    expect(finalMatchesPick(chargers, clippersFinal)).toBe(false);
    expect(settlePendingPicks([chargers], [clippersFinal])[0]!.status).toBe("PENDING");
  });
});

describe("legitimate matches still settle (no loosening, no over-tightening)", () => {
  it("abbr-only pick still binds to the full-name final via the abbr field", () => {
    const p = pick({
      pickId: "abbr",
      homeTeam: "LAD",
      awayTeam: "SF",
      selection: "LAD",
      gameDateIso: "2026-07-15T02:10:00Z",
    });
    const f = final(
      { name: "Los Angeles Dodgers", abbr: "LAD", score: 5 },
      { name: "San Francisco Giants", abbr: "SF", score: 3 },
      "2026-07-15",
    );
    expect(orientToPickHome(p, f)).toEqual({ homeScore: 5, awayScore: 3 });
    expect(settlePendingPicks([p], [f])[0]!.status).toBe("SETTLED");
  });

  it("reversed orientation still swaps to the pick's home", () => {
    const p = pick({
      pickId: "rev",
      sportKey: "americanfootball_ncaaf",
      homeTeam: "Navy",
      awayTeam: "Army",
      selection: "Navy",
      gameDateIso: "2025-12-13T18:00:00Z",
    });
    const f = final(
      { name: "Army", abbr: "ARMY", score: 16 },
      { name: "Navy", abbr: "NAVY", score: 17 },
      "2025-12-13",
    );
    expect(orientToPickHome(p, f)).toEqual({ homeScore: 17, awayScore: 16 });
  });

  it("Oakland Athletics still binds to the ESPN Athletics/ATH final", () => {
    const p = pick({
      pickId: "oak",
      homeTeam: "Oakland Athletics",
      awayTeam: "Houston Astros",
      gameDateIso: "2026-07-15T00:00:00.000Z",
    });
    const f = final(
      { name: "Athletics", abbr: "ATH", score: 4 },
      { name: "Astros", abbr: "HOU", score: 2 },
      "2026-07-15",
    );
    expect(finalMatchesPick(p, f)).toBe(true);
    expect(settlePendingPicks([p], [f])[0]!.status).toBe("SETTLED");
  });

  it("Red Sox and White Sox each still bind to their OWN final", () => {
    const boston = pick({
      pickId: "bos",
      homeTeam: "New York Yankees",
      awayTeam: "Boston Red Sox",
    });
    const bostonFinal = final(
      { name: "New York Yankees", abbr: "NYY", score: 2 },
      { name: "Boston Red Sox", abbr: "BOS", score: 5 },
      "2025-08-15",
    );
    expect(settlePendingPicks([boston], [bostonFinal])[0]!.status).toBe("SETTLED");

    const chicago = pick({
      pickId: "chw",
      homeTeam: "New York Yankees",
      awayTeam: "Chicago White Sox",
    });
    const chicagoFinal = final(
      { name: "New York Yankees", abbr: "NYY", score: 9 },
      { name: "Chicago White Sox", abbr: "CHW", score: 1 },
      "2025-08-15",
    );
    expect(settlePendingPicks([chicago], [chicagoFinal])[0]!.status).toBe("SETTLED");
  });

});
