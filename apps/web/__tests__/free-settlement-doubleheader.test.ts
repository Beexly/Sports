import { describe, it, expect } from "vitest";
import { settlePendingPicks, type PendingPick, type TrustedFinal } from "@/lib/data-sources/free-settlement";
import { classifySettlementRootCause } from "@/lib/settlement/root-cause-analysis";

// Rangers @ Astros doubleheader, both games same calendar date. Game 1: Astros win
// 4-2. Game 2: Rangers win 6-1. A pick written against Game 2 must never be graded
// off Game 1's score just because both finals fall inside the date-tolerance window.
const basePick: Omit<PendingPick, "pickId" | "pickType" | "selection" | "line"> = {
  homeTeam: "Astros",
  awayTeam: "Rangers",
  sportKey: "baseball_mlb",
  gameDateIso: "2025-08-15",
};
const pick = (over: Partial<PendingPick> = {}): PendingPick => ({
  pickId: "p1",
  pickType: "MONEYLINE",
  selection: "Astros",
  line: 0,
  ...basePick,
  ...over,
});

const gameOneFinal: TrustedFinal = {
  date: "2025-08-15",
  home: { name: "Houston Astros", abbr: "HOU", score: 4 },
  away: { name: "Texas Rangers", abbr: "TEX", score: 2 },
  confirmation: "CONFIRMED",
  sources: ["espn-public-api", "henrygd-ncaa"],
};

const gameTwoFinal: TrustedFinal = {
  date: "2025-08-15",
  home: { name: "Houston Astros", abbr: "HOU", score: 1 },
  away: { name: "Texas Rangers", abbr: "TEX", score: 6 },
  confirmation: "CONFIRMED",
  sources: ["espn-public-api", "henrygd-ncaa"],
};

// A redundant record of the SAME game (e.g. re-fetched later, identical score).
const gameOneFinalDuplicate: TrustedFinal = {
  ...gameOneFinal,
  sources: ["espn-public-api"],
};

describe("settlePendingPicks — same-day doubleheader guard (PL1)", () => {
  it("HOLDs with AMBIGUOUS_MATCH when two candidate finals disagree on score", () => {
    const out = settlePendingPicks([pick()], [gameOneFinal, gameTwoFinal])[0]!;
    expect(out.status).toBe("HELD");
    if (out.status !== "HELD") throw new Error("expected HELD");
    expect(out.reason).toBe("AMBIGUOUS_MATCH");
    expect(out.sources).toEqual(
      expect.arrayContaining(["espn-public-api", "henrygd-ncaa"]),
    );
  });

  it("never grades the pick as a WIN/LOSS off either candidate when ambiguous", () => {
    const out = settlePendingPicks([pick()], [gameOneFinal, gameTwoFinal])[0]!;
    expect(out.status).not.toBe("SETTLED");
  });

  it("settles normally when the two candidates are redundant records of one game (regression guard)", () => {
    const out = settlePendingPicks([pick()], [gameOneFinal, gameOneFinalDuplicate])[0]!;
    expect(out.status).toBe("SETTLED");
    if (out.status !== "SETTLED") throw new Error("expected SETTLED");
    expect(out.result).toBe("WIN");
    expect(out.homeScore).toBe(4);
    expect(out.awayScore).toBe(2);
  });

  it("single-final case is unaffected (no behavior change)", () => {
    const out = settlePendingPicks([pick()], [gameTwoFinal])[0]!;
    expect(out.status).toBe("SETTLED");
    if (out.status !== "SETTLED") throw new Error("expected SETTLED");
    expect(out.result).toBe("LOSS");
    expect(out.homeScore).toBe(1);
    expect(out.awayScore).toBe(6);
  });

  it("classifySettlementRootCause resolves an AMBIGUOUS_MATCH hold to AMBIGUOUS_MATCHUP / wave C", () => {
    const finding = classifySettlementRootCause({
      pickId: "p1",
      sportKey: "baseball_mlb",
      ageHours: 5,
      graceHours: 3,
      outcomeStatus: "HELD",
      holdReason: "AMBIGUOUS_MATCH",
    });
    expect(finding.code).toBe("AMBIGUOUS_MATCHUP");
    expect(finding.clearanceWave).toBe("C");
    expect(finding.category).toBe("MATCHING");
  });

  it("classifySettlementRootCause still resolves a plain DISPUTED hold correctly (no regression)", () => {
    const finding = classifySettlementRootCause({
      pickId: "p2",
      sportKey: "baseball_mlb",
      ageHours: 5,
      graceHours: 3,
      outcomeStatus: "HELD",
      holdReason: "DISPUTED",
    });
    expect(finding.code).toBe("DISPUTED_SCORES");
  });
});
