import { describe, it, expect } from "vitest";
import {
  settlePendingPicks,
  type PendingPick,
  type TrustedFinal,
} from "@/lib/data-sources/free-settlement";

/**
 * ENTITY-RESOLUTION INTEGRITY — the candidate window must use the date it already has.
 *
 * `settlePendingPicks` accepts any team-matching final within ±2 calendar days of the
 * pick's game date. In every daily-schedule league a series is 3-4 games between the
 * SAME two teams on CONSECUTIVE days, so every game of an ordinary series has two or
 * three team-matching finals inside that window with different scores. That is not a
 * genuine ambiguity — the pick carries the game's own date, and exactly one final sits
 * on it.
 *
 * Both failure directions are covered here:
 *   - the wrong-game direction: a Friday pick must never grade off Sunday's score;
 *   - the stuck direction: a Friday pick must not be HELD as AMBIGUOUS_MATCH just
 *     because Saturday and Sunday are also on the board.
 * A true same-date doubleheader stays ambiguous and stays HELD.
 *
 * Assertions are runtime — apps/web/tsconfig.json excludes tests from typecheck.
 */

function yankeesFinal(date: string, home: number, away: number): TrustedFinal {
  return {
    date,
    home: { name: "New York Yankees", abbr: "NYY", score: home },
    away: { name: "Boston Red Sox", abbr: "BOS", score: away },
    confirmation: "CONFIRMED",
    sources: ["espn-public-api"],
  };
}

function yankeesPick(date: string): PendingPick {
  return {
    pickId: `p-${date}`,
    pickType: "MONEYLINE",
    selection: "New York Yankees",
    line: 0,
    homeTeam: "New York Yankees",
    awayTeam: "Boston Red Sox",
    sportKey: "baseball_mlb",
    gameDateIso: `${date}T23:05:00.000Z`,
  };
}

// A perfectly ordinary 3-game series: Yankees win, then lose twice.
const SERIES: TrustedFinal[] = [
  yankeesFinal("2025-08-15", 4, 2), // Yankees WIN
  yankeesFinal("2025-08-16", 1, 7), // Yankees LOSS
  yankeesFinal("2025-08-17", 5, 9), // Yankees LOSS
];

describe("consecutive-day series settles on the pick's own date", () => {
  it("each game of a 3-game series settles against its OWN final, not a neighbour's", () => {
    const out = settlePendingPicks(
      [yankeesPick("2025-08-15"), yankeesPick("2025-08-16"), yankeesPick("2025-08-17")],
      SERIES,
    );

    expect(out.map((o) => o.status)).toEqual(["SETTLED", "SETTLED", "SETTLED"]);
    // Game 1 (4-2 Yankees) → WIN; games 2 and 3 → LOSS. If the window picked a
    // neighbouring day's final these would not line up.
    expect(out.map((o) => (o.status === "SETTLED" ? o.result : o.status))).toEqual([
      "WIN",
      "LOSS",
      "LOSS",
    ]);
    const scores = out.map((o) =>
      o.status === "SETTLED" ? `${o.homeScore}-${o.awayScore}` : o.status,
    );
    expect(scores).toEqual(["4-2", "1-7", "5-9"]);
  });

  it("the ±2 day tolerance still covers a final recorded on an adjacent date", () => {
    // Source date-convention skew / a next-day resume: the pick's own date has no
    // final, so the adjacent one is still eligible.
    const out = settlePendingPicks([yankeesPick("2025-08-15")], [yankeesFinal("2025-08-16", 1, 7)])[0]!;
    expect(out.status).toBe("SETTLED");
    expect(out.status === "SETTLED" ? out.homeScore : null).toBe(1);
  });

  it("a genuine same-date doubleheader is still HELD as AMBIGUOUS_MATCH", () => {
    const out = settlePendingPicks(
      [yankeesPick("2025-08-15")],
      [yankeesFinal("2025-08-15", 4, 2), yankeesFinal("2025-08-15", 3, 8)],
    )[0]!;
    expect(out.status).toBe("HELD");
    expect(out.status === "HELD" ? out.reason : null).toBe("AMBIGUOUS_MATCH");
  });

  it("a doubleheader on the pick's date is not rescued by an adjacent-day final", () => {
    // Narrowing to the pick's own date must not reach past an ambiguity to a
    // neighbouring day that happens to be unambiguous.
    const out = settlePendingPicks(
      [yankeesPick("2025-08-15")],
      [
        yankeesFinal("2025-08-15", 4, 2),
        yankeesFinal("2025-08-15", 3, 8),
        yankeesFinal("2025-08-16", 1, 7),
      ],
    )[0]!;
    expect(out.status).toBe("HELD");
  });

  it("still leaves a pick with no team-matching final PENDING", () => {
    const out = settlePendingPicks(
      [yankeesPick("2025-08-15")],
      [
        {
          date: "2025-08-15",
          home: { name: "Milwaukee Brewers", abbr: "MIL", score: 3 },
          away: { name: "Chicago Cubs", abbr: "CHC", score: 1 },
          confirmation: "CONFIRMED",
          sources: ["espn-public-api"],
        },
      ],
    )[0]!;
    expect(out.status).toBe("PENDING");
    expect(out.status === "PENDING" ? out.reason : null).toBe("NO_FINAL");
  });
});
