import { describe, it, expect } from "vitest";
import {
  settlePendingPicks,
  type PendingPick,
  type TrustedFinal,
} from "@/lib/data-sources/free-settlement";

/**
 * Reversed-orientation settlement — exercises the swap branch in orientToPickHome
 * (free-settlement.ts, the `ph === fa` case) that EVERY existing fixture skips.
 *
 * In the repo's free-settlement fixtures Navy is the HOME team in BOTH free sources,
 * so the final's orientation already matches the pick's and the swap path is never
 * taken. Here we build a TrustedFinal whose home/away are the OPPOSITE of the pick's:
 *
 *   pick:  homeTeam = "Navy", awayTeam = "Army"
 *   final: home = Army (16), away = Navy (17)   ← reversed vs the pick
 *
 * settlePendingPicks must orient the final to the PICK's home (Navy), i.e. SWAP so
 * the settled homeScore = 17 (Navy) and awayScore = 16 (Army). Grading then uses the
 * pick's home-perspective contract:
 *   - Navy MONEYLINE  → Navy won 17-16 → WIN
 *   - Navy -3.5 SPREAD → Navy won by only 1, did not cover -3.5 → LOSS
 *   - Navy -1.5 SPREAD → Navy won by only 1, did not cover -1.5 → LOSS
 * and the symmetric away/total cases prove the home-perspective line is graded
 * against the PICK's home, not the final's stored orientation.
 *
 * Shapes verified against free-settlement.ts: PendingPick {pickId, pickType,
 * selection, line, homeTeam, awayTeam, sportKey, gameDateIso}; TrustedFinal {date,
 * home:{name,abbr,score}, away:{name,abbr,score}, confirmation, sources}; a SETTLED
 * outcome carries {status:"SETTLED", result, confirmation, homeScore, awayScore,
 * sources}.
 */

const DATE = "2025-12-13";

// REVERSED orientation: the final stores Army as home and Navy as away, the opposite
// of the pick below. A correct implementation must swap to the pick's home (Navy).
const reversedFinal: TrustedFinal = {
  date: DATE,
  home: { name: "Army", abbr: "ARMY", score: 16 },
  away: { name: "Navy", abbr: "NAVY", score: 17 },
  confirmation: "CONFIRMED",
  sources: ["espn-public-api", "henrygd-ncaa"],
};

const basePick: Omit<PendingPick, "pickId" | "pickType" | "selection" | "line"> = {
  homeTeam: "Navy", // pick's home is Navy — OPPOSITE of the final's home (Army)
  awayTeam: "Army",
  sportKey: "football_ncaaf",
  gameDateIso: `${DATE}T18:00:00Z`,
};
const pick = (over: Partial<PendingPick>): PendingPick => ({
  pickId: "p",
  pickType: "MONEYLINE",
  selection: "Navy",
  line: 0,
  ...basePick,
  ...over,
});

describe("free-settlement reversed-orientation swap (orientToPickHome ph === fa branch)", () => {
  it("swaps the final to the pick's home: settled homeScore=17 (Navy), awayScore=16 (Army)", () => {
    const out = settlePendingPicks([pick({ pickType: "MONEYLINE", selection: "Navy" })], [reversedFinal])[0]!;
    expect(out.status).toBe("SETTLED");
    if (out.status !== "SETTLED") throw new Error("expected SETTLED");
    // Even though the final stored Army home / Navy away, the settled scores are
    // oriented to the PICK's home (Navy = 17, Army = 16).
    expect(out.homeScore).toBe(17);
    expect(out.awayScore).toBe(16);
    expect(out.confirmation).toBe("CONFIRMED");
    expect(out.sources).toEqual(["espn-public-api", "henrygd-ncaa"]);
  });

  it("Navy MONEYLINE settles WIN after the swap (Navy won 17-16)", () => {
    const out = settlePendingPicks([pick({ pickType: "MONEYLINE", selection: "Navy" })], [reversedFinal])[0]!;
    expect(out.status === "SETTLED" ? out.result : out.status).toBe("WIN");
  });

  it("Army MONEYLINE (the away side) settles LOSS after the swap", () => {
    const out = settlePendingPicks([pick({ pickType: "MONEYLINE", selection: "Army" })], [reversedFinal])[0]!;
    expect(out.status === "SETTLED" ? out.result : out.status).toBe("LOSS");
  });

  it("Navy -3.5 SPREAD settles LOSS — home favored but won by only 1 (line graded vs PICK's home)", () => {
    // home-perspective line -3.5 against Navy=home (17) / Army=away (16): homeCoverMargin
    // = (17-16) + (-3.5) = -2.5 < 0 → Navy did not cover → LOSS.
    const out = settlePendingPicks([pick({ pickType: "SPREAD", selection: "Navy", line: -3.5 })], [reversedFinal])[0]!;
    expect(out.status === "SETTLED" ? out.result : out.status).toBe("LOSS");
  });

  it("Army +3.5 SPREAD (away side, home-perspective line -3.5) settles WIN after the swap", () => {
    // Same home-perspective line -3.5; the away pick covers when home wins by < 3.5.
    const out = settlePendingPicks([pick({ pickType: "SPREAD", selection: "Army", line: -3.5 })], [reversedFinal])[0]!;
    expect(out.status === "SETTLED" ? out.result : out.status).toBe("WIN");
  });

  it("Navy -1.5 SPREAD settles LOSS — Navy won by exactly 1, short of the 1.5 (vs PICK's home)", () => {
    // homeCoverMargin = (17-16) + (-1.5) = -0.5 < 0 → Navy did not cover -1.5 → LOSS.
    // This is the case that would FLIP if the scores were taken in the final's
    // (un-swapped) orientation, so it proves the line is graded against the PICK's home.
    const out = settlePendingPicks([pick({ pickType: "SPREAD", selection: "Navy", line: -1.5 })], [reversedFinal])[0]!;
    expect(out.status === "SETTLED" ? out.result : out.status).toBe("LOSS");
  });

  it("TOTAL is orientation-invariant: combined 33 grades OVER 30.5 WIN / UNDER 30.5 LOSS", () => {
    const over = settlePendingPicks([pick({ pickType: "TOTAL", selection: "OVER", line: 30.5 })], [reversedFinal])[0]!;
    const under = settlePendingPicks([pick({ pickType: "TOTAL", selection: "UNDER", line: 30.5 })], [reversedFinal])[0]!;
    expect(over.status === "SETTLED" ? over.result : over.status).toBe("WIN");
    expect(under.status === "SETTLED" ? under.result : under.status).toBe("LOSS");
  });
});
