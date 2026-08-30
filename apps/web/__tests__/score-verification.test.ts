import { describe, it, expect } from "vitest";
import {
  indexFinals,
  lookupFinal,
  crossCheckScore,
  normalizeTeamToken,
} from "@/lib/data-sources/score-verification";
import type { NormalizedGame } from "@/lib/data-sources/free-adapters/espn-scores";

function game(p: Partial<NormalizedGame> & { gameId: string }): NormalizedGame {
  return {
    sourceId: "espn-public-api",
    sport: "nfl",
    gameId: p.gameId,
    startTime: p.startTime ?? "2026-01-04T18:00:00Z",
    state: p.state ?? "post",
    completed: p.completed ?? true,
    statusDetail: "Final",
    venue: null,
    home: p.home ?? { team: "Kansas City Chiefs", abbreviation: "KC", score: 27 },
    away: p.away ?? { team: "Baltimore Ravens", abbreviation: "BAL", score: 20 },
    attribution: "Scores data via ESPN",
  };
}

describe("score-verification (free settlement support)", () => {
  it("indexes only completed games with both scores", () => {
    const idx = indexFinals([
      game({ gameId: "1" }),
      game({ gameId: "2", completed: false, state: "pre", home: { team: "A", abbreviation: "A", score: null }, away: { team: "B", abbreviation: "B", score: null } }),
    ]);
    expect(idx.finals.length).toBe(1);
  });

  it("matches by abbreviation or full name on the same date", () => {
    const idx = indexFinals([game({ gameId: "1" })]);
    expect(lookupFinal(idx, "KC", "BAL", "2026-01-04T00:00:00Z")?.gameId).toBe("1");
    expect(lookupFinal(idx, "Kansas City Chiefs", "Baltimore Ravens", "2026-01-04T23:00:00Z")?.gameId).toBe("1");
    // wrong date → no match
    expect(lookupFinal(idx, "KC", "BAL", "2026-01-05T00:00:00Z")).toBeNull();
    // flipped home/away → no false match (directional)
    expect(lookupFinal(idx, "BAL", "KC", "2026-01-04T00:00:00Z")).toBeNull();
  });

  it("cross-checks our score against ESPN's free final", () => {
    const idx = indexFinals([game({ gameId: "1" })]);
    const agree = crossCheckScore(idx, { homeIdentifier: "KC", awayIdentifier: "BAL", dateIso: "2026-01-04T18:00:00Z", homeScore: 27, awayScore: 20 });
    expect(agree.matched).toBe(true);
    expect(agree.agrees).toBe(true);

    const disagree = crossCheckScore(idx, { homeIdentifier: "KC", awayIdentifier: "BAL", dateIso: "2026-01-04T18:00:00Z", homeScore: 24, awayScore: 20 });
    expect(disagree.agrees).toBe(false);

    const unmatched = crossCheckScore(idx, { homeIdentifier: "NYG", awayIdentifier: "DAL", dateIso: "2026-01-04T18:00:00Z", homeScore: 0, awayScore: 0 });
    expect(unmatched.matched).toBe(false);
    expect(unmatched.agrees).toBeNull(); // never settle from an unmatched free lookup
  });

  it("normalizes team tokens", () => {
    expect(normalizeTeamToken("Kansas City Chiefs")).toBe("kansascitychiefs");
    expect(normalizeTeamToken("K.C.")).toBe("kc");
  });
});
