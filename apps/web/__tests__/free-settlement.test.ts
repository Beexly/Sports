import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseEspnScoreboard } from "@/lib/data-sources/free-adapters/espn-scores";
import { parseHenrygdScoreboard, type NcaaGame } from "@/lib/data-sources/free-adapters/henrygd-ncaa";
import {
  buildTrustedFinals,
  finalBindsToKickoff,
  MAX_KICKOFF_DRIFT_MS,
  settlePendingPicks,
  type PendingPick,
  type TrustedFinal,
} from "@/lib/data-sources/free-settlement";

const FIX = resolve(__dirname, "fixtures");
const read = (f: string) => JSON.parse(readFileSync(resolve(FIX, f), "utf8"));

const espn = parseEspnScoreboard(read("espn-ncaaf-scoreboard.json"), "ncaaf");
const henry = parseHenrygdScoreboard(read("henrygd-scoreboard.json"));

// Navy beat Army 17-16 (home win by 1) on 2025-12-13 — confirmed by both sources.
const basePick: Omit<PendingPick, "pickId" | "pickType" | "selection" | "line"> = {
  homeTeam: "Navy",
  awayTeam: "Army",
  sportKey: "football_ncaaf",
  gameDateIso: "2025-12-13",
};
const pick = (over: Partial<PendingPick>): PendingPick => ({ pickId: "p", pickType: "MONEYLINE", selection: "Navy", line: 0, ...basePick, ...over });

describe("buildTrustedFinals", () => {
  it("marks the Army-Navy final CONFIRMED when both free sources agree", () => {
    const finals = buildTrustedFinals(espn, henry);
    const navy = finals.find((f) => /Navy/i.test(f.home.name) || /Navy/i.test(f.away.name));
    expect(navy).toBeDefined();
    expect(navy!.confirmation).toBe("CONFIRMED");
    expect(navy!.sources).toContain("espn-public-api");
    expect(navy!.sources).toContain("henrygd-ncaa");
  });

  it("marks a lone-source final SINGLE_SOURCE", () => {
    const finals = buildTrustedFinals(espn, []);
    const navy = finals.find((f) => /Navy/i.test(f.home.name));
    expect(navy!.confirmation).toBe("SINGLE_SOURCE");
  });

  it("marks conflicting scores DISPUTED", () => {
    const tampered: NcaaGame[] = henry.map((g) => ({ ...g, home: { ...g.home, score: 99 } }));
    const finals = buildTrustedFinals(espn, tampered);
    const navy = finals.find((f) => /Navy/i.test(f.home.name));
    expect(navy!.confirmation).toBe("DISPUTED");
  });
});

describe("settlePendingPicks", () => {
  const finals = buildTrustedFinals(espn, henry);

  it("settles a moneyline winner as WIN with CONFIRMED trust", () => {
    const out = settlePendingPicks([pick({ pickType: "MONEYLINE", selection: "Navy" })], finals)[0]!;
    expect(out.status).toBe("SETTLED");
    if (out.status !== "SETTLED") throw new Error("not settled");
    expect(out.result).toBe("WIN");
    expect(out.confirmation).toBe("CONFIRMED");
    expect(out.homeScore).toBe(17);
    expect(out.awayScore).toBe(16);
  });

  it("grades a spread the favorite failed to cover as LOSS", () => {
    // Navy -3.5 (home favored) but only won by 1.
    const out = settlePendingPicks([pick({ pickType: "SPREAD", selection: "Navy", line: -3.5 })], finals)[0]!;
    expect(out.status === "SETTLED" ? out.result : out.status).toBe("LOSS");
  });

  it("grades the underdog spread as WIN", () => {
    // Same game, home-perspective line is -3.5; the away pick (Army +3.5) covers.
    const out = settlePendingPicks([pick({ pickType: "SPREAD", selection: "Army", line: -3.5 })], finals)[0]!;
    expect(out.status === "SETTLED" ? out.result : out.status).toBe("WIN");
  });

  it("grades totals against the combined score (33)", () => {
    const over = settlePendingPicks([pick({ pickType: "TOTAL", selection: "OVER", line: 30.5 })], finals)[0]!;
    const under = settlePendingPicks([pick({ pickType: "TOTAL", selection: "UNDER", line: 30.5 })], finals)[0]!;
    expect(over.status === "SETTLED" ? over.result : over.status).toBe("WIN");
    expect(under.status === "SETTLED" ? under.result : under.status).toBe("LOSS");
  });

  it("HOLDS picks when the final is disputed, never settling blindly", () => {
    const tampered: NcaaGame[] = henry.map((g) => ({ ...g, home: { ...g.home, score: 99 } }));
    const disputed = buildTrustedFinals(espn, tampered);
    const out = settlePendingPicks([pick({ pickType: "MONEYLINE", selection: "Navy" })], disputed)[0]!;
    expect(out.status).toBe("HELD");
    expect(out.status === "HELD" ? out.reason : out.status).toBe("DISPUTED");
  });

  it("leaves picks with no matching final PENDING with NO_FINAL reason", () => {
    const out = settlePendingPicks([pick({ homeTeam: "Alabama", awayTeam: "Auburn" })], finals)[0]!;
    expect(out.status).toBe("PENDING");
    expect(out.status === "PENDING" ? out.reason : null).toBe("NO_FINAL");
  });


  it("still settles on a single source, flagged for audit", () => {
    const single = buildTrustedFinals(espn, []);
    const out = settlePendingPicks([pick({ pickType: "MONEYLINE", selection: "Navy" })], single)[0]!;
    expect(out.status === "SETTLED" ? out.confirmation : out.status).toBe("SINGLE_SOURCE");
  });
});

// ─── Kickoff binding ───────────────────────────────────────────────────────────

/**
 * The grader holds when SEVERAL same-matchup finals are in the window, but a
 * LONE previous-meeting final had nothing to be held against: nearestCandidates
 * returns a one-element list unchanged. That is how a pick on a game which had
 * started but had no published result yet was graded off the previous meeting
 * of the same series, on nothing but a team-name match.
 *
 * Measured on production 2026-09-06: 87 published picks carried a settledAt
 * EARLIER than their game's commenceTime, 63 of them MONEYLINE graded WIN/LOSS.
 */
describe("finalBindsToKickoff", () => {
  const HOUR = 60 * 60 * 1000;

  function final(opts: { startIso?: string; date: string }): TrustedFinal {
    return {
      date: opts.date,
      ...(opts.startIso ? { startIso: opts.startIso } : {}),
      home: { name: "Phillies", abbr: "PHI", score: 4 },
      away: { name: "Braves", abbr: "ATL", score: 2 },
      confirmation: "CONFIRMED",
      sources: ["espn-public-api"],
    };
  }

  const kickoff = "2026-09-06T23:10:00.000Z";

  it("accepts a final that starts at the game's kickoff", () => {
    expect(finalBindsToKickoff(kickoff, final({ startIso: kickoff, date: "2026-09-06" }))).toBe(true);
  });

  it("accepts a delayed start inside the drift bound", () => {
    const delayed = new Date(Date.parse(kickoff) + 3 * HOUR).toISOString();
    expect(finalBindsToKickoff(kickoff, final({ startIso: delayed, date: "2026-09-06" }))).toBe(true);
  });

  it("REJECTS the previous day's meeting of the same series", () => {
    const yesterday = new Date(Date.parse(kickoff) - 24 * HOUR).toISOString();
    expect(finalBindsToKickoff(kickoff, final({ startIso: yesterday, date: "2026-09-05" }))).toBe(false);
  });

  it("rejects exactly at the boundary and accepts just inside it", () => {
    const justOver = new Date(Date.parse(kickoff) - (MAX_KICKOFF_DRIFT_MS + 1)).toISOString();
    const justUnder = new Date(Date.parse(kickoff) - (MAX_KICKOFF_DRIFT_MS - 1)).toISOString();
    expect(finalBindsToKickoff(kickoff, final({ startIso: justOver, date: "2026-09-06" }))).toBe(false);
    expect(finalBindsToKickoff(kickoff, final({ startIso: justUnder, date: "2026-09-06" }))).toBe(true);
  });

  it("falls back to the day when the KICKOFF is date-only, because midnight is not a kickoff", () => {
    // Clock math against a date-only kickoff would read a 7pm final as 19h
    // adrift and reject every legitimate settlement on that path.
    const evening = "2026-09-06T23:10:00.000Z";
    expect(finalBindsToKickoff("2026-09-06", final({ startIso: evening, date: "2026-09-06" }))).toBe(true);
  });

  it("falls back to one day when the FINAL carries no start time, and refuses two", () => {
    expect(finalBindsToKickoff(kickoff, final({ date: "2026-09-05" }))).toBe(true);
    expect(finalBindsToKickoff(kickoff, final({ date: "2026-09-04" }))).toBe(false);
  });
});

/**
 * Structural guard: the free settlement runner must not hand the grader a pick
 * whose game has not started. Asserted against the source because the query is
 * the guard — a unit test of the surrounding function would mock the very call
 * being pinned. settle-backfill.ts and the zero-sit lane already scope their
 * loads this way; the runner did not, and that is what fed 298 published
 * PENDING picks on future games into the grader every cycle.
 */
describe("free-settlement-runner PENDING load", () => {
  it("scopes the pick query to games that have already started", () => {
    const src = readFileSync(
      resolve(__dirname, "..", "lib", "data-sources", "free-settlement-runner.ts"),
      "utf8",
    );
    const start = src.indexOf("db.pick.findMany");
    expect(start).toBeGreaterThan(-1);
    const where = src.slice(start, start + 900);
    expect(where).toContain('result: "PENDING"');
    expect(where).toMatch(/commenceTime:\s*\{\s*lte:/);
  });
});

/**
 * The integration that matters: settlePendingPicks must not grade a pick off a
 * final that cannot be its game. Pinning finalBindsToKickoff alone is not
 * enough — the filter has to actually be wired into the grader, and a unit test
 * of the helper passes happily while the call site is missing.
 */
describe("settlePendingPicks — a lone out-of-window final never grades a pick", () => {
  const HOUR = 60 * 60 * 1000;
  const kickoff = "2026-09-06T23:10:00.000Z";

  function seriesFinal(startIso: string, homeScore: number, awayScore: number): TrustedFinal {
    return {
      date: startIso.slice(0, 10),
      startIso,
      home: { name: "Phillies", abbr: "PHI", score: homeScore },
      away: { name: "Braves", abbr: "ATL", score: awayScore },
      confirmation: "CONFIRMED",
      sources: ["espn-public-api"],
    };
  }

  const seriesPick: PendingPick = {
    pickId: "series-pick",
    pickType: "MONEYLINE",
    selection: "Phillies",
    line: 0,
    homeTeam: "Phillies",
    awayTeam: "Braves",
    sportKey: "baseball_mlb",
    gameDateIso: kickoff,
  };

  it("leaves the pick PENDING when the only final is the previous day's meeting", () => {
    const yesterday = new Date(Date.parse(kickoff) - 24 * HOUR).toISOString();
    const out = settlePendingPicks([seriesPick], [seriesFinal(yesterday, 4, 2)])[0]!;
    // Before this guard the pick was graded WIN off a game it was not on.
    expect(out.status).toBe("PENDING");
  });

  it("still grades the pick when the final is its own game", () => {
    const out = settlePendingPicks([seriesPick], [seriesFinal(kickoff, 4, 2)])[0]!;
    expect(out.status).toBe("SETTLED");
  });
});

describe("finalBindsToKickoff — a malformed timestamp is not evidence", () => {
  function final(opts: { startIso?: string; date: string }): TrustedFinal {
    return {
      date: opts.date,
      ...(opts.startIso ? { startIso: opts.startIso } : {}),
      home: { name: "Phillies", abbr: "PHI", score: 4 },
      away: { name: "Braves", abbr: "ATL", score: 2 },
      confirmation: "CONFIRMED",
      sources: ["espn-public-api"],
    };
  }
  const kickoff = "2026-09-06T23:10:00.000Z";

  it("falls back to the one-day rule when startIso cannot be parsed, instead of accepting it", () => {
    // Returning true here let a malformed timestamp through the +/-2-day
    // candidate filter and settle a pick off a stale score (CodeRabbit, #717).
    expect(finalBindsToKickoff(kickoff, final({ startIso: "not-a-date", date: "2026-09-04" }))).toBe(
      false,
    );
    expect(finalBindsToKickoff(kickoff, final({ startIso: "not-a-date", date: "2026-09-06" }))).toBe(
      true,
    );
  });
});

/**
 * Structural, and deliberately so: the guard IS the transactional reread, and a
 * unit test around runFreePathSettlement would have to mock $transaction, which
 * is the very thing being pinned. Devin Review (#717) found that the findMany
 * predicate alone leaves a race — a schedule correction can postpone a loaded
 * game before the transaction runs.
 */
describe("free-settlement-runner write-time kickoff guard", () => {
  it("re-reads commenceTime inside the transaction and refuses a game that has not started", () => {
    const src = readFileSync(
      resolve(__dirname, "..", "lib", "data-sources", "free-settlement-runner.ts"),
      "utf8",
    );
    const txStart = src.indexOf("db.$transaction");
    expect(txStart).toBeGreaterThan(-1);
    const body = src.slice(txStart, txStart + 1400);
    expect(body).toContain("commenceTime: true");
    expect(body).toMatch(/commenceTime\.getTime\(\)\s*>\s*settledAt\.getTime\(\)/);
    expect(body).toContain("KICKOFF_MOVED");
    // The read alone is not the guard: Prisma's default isolation does not lock
    // the game row, so the predicate must ride in the WRITE (Devin Review, #717).
    const writes = src.slice(txStart, txStart + 6000);
    expect(writes).toMatch(/tx\.pick\.updateMany\([\s\S]{0,200}?game:\s*\{\s*commenceTime:\s*\{\s*lte:\s*settledAt/);
    expect(writes).toMatch(/tx\.game\.updateMany\([\s\S]{0,160}?commenceTime:\s*\{\s*lte:\s*settledAt/);
    // The guard must run before the score-conditional block, so it also covers
    // a VOID or a scoreless outcome.
    expect(body.indexOf("KICKOFF_MOVED")).toBeLessThan(body.indexOf("o.homeScore != null"));
  });
});

/**
 * The doubleheader hold belongs in the SHARED grader, not only in the score
 * persister. free-settlement-runner, settle-backfill and the zero-sit lane all
 * call settlePendingPicks and all already hand it the full board, so one guard
 * here covers every path that can publish a graded result (Devin Review, #717).
 */
describe("settlePendingPicks — an unfinished doubleheader holds", () => {
  const HOUR = 60 * 60 * 1000;
  const gameTwo = "2026-09-06T23:10:00.000Z";
  const gameOne = new Date(Date.parse(gameTwo) - 3 * HOUR).toISOString();

  const dhPick: PendingPick = {
    pickId: "dh-pick",
    pickType: "MONEYLINE",
    selection: "Phillies",
    line: 0,
    homeTeam: "Phillies",
    awayTeam: "Braves",
    sportKey: "baseball_mlb",
    gameDateIso: gameTwo,
  };

  function gameOneFinal(): TrustedFinal {
    return {
      date: gameOne.slice(0, 10),
      startIso: gameOne,
      home: { name: "Phillies", abbr: "PHI", score: 4 },
      away: { name: "Braves", abbr: "ATL", score: 2 },
      confirmation: "CONFIRMED",
      sources: ["espn-public-api"],
    };
  }

  function boardRow(startTime: string, completed: boolean) {
    return {
      sourceId: "espn-public-api" as const,
      sport: "mlb" as const,
      gameId: `row-${startTime}`,
      startTime,
      state: completed ? "post" : "pre",
      completed,
      statusDetail: "",
      venue: null,
      home: { team: "Phillies", abbreviation: "PHI", score: completed ? 4 : null },
      away: { team: "Braves", abbreviation: "ATL", score: completed ? 2 : null },
      attribution: "Scores data via ESPN",
    };
  }

  it("holds a game-two pick while only game one is final", () => {
    const out = settlePendingPicks([dhPick], [gameOneFinal()], {
      postponedCandidates: [boardRow(gameOne, true), boardRow(gameTwo, false)] as never,
    })[0]!;
    expect(out.status).toBe("HELD");
    expect(out.status === "HELD" ? out.reason : "").toBe("AMBIGUOUS_MATCH");
  });

  it("settles normally when the board lists a single fixture that day", () => {
    const soleFinal: TrustedFinal = {
      date: gameTwo.slice(0, 10),
      startIso: gameTwo,
      home: { name: "Phillies", abbr: "PHI", score: 4 },
      away: { name: "Braves", abbr: "ATL", score: 2 },
      confirmation: "CONFIRMED",
      sources: ["espn-public-api"],
    };
    const out = settlePendingPicks([dhPick], [soleFinal], {
      postponedCandidates: [boardRow(gameTwo, true)] as never,
    })[0]!;
    expect(out.status).toBe("SETTLED");
  });
});
