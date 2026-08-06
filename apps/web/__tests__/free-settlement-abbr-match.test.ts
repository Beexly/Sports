import { describe, expect, it } from "vitest";
import {
  finalMatchesPick,
  orientToPickHome,
  settlePendingPicks,
  type PendingPick,
  type TrustedFinal,
} from "@/lib/data-sources/free-settlement";

const DATE = "2026-07-15";

const finalDodgers: TrustedFinal = {
  date: DATE,
  home: { name: "Los Angeles Dodgers", abbr: "LAD", score: 5 },
  away: { name: "San Francisco Giants", abbr: "SF", score: 3 },
  confirmation: "SINGLE_SOURCE",
  sources: ["espn-public-api"],
};

const pickAbbr: PendingPick = {
  pickId: "p1",
  pickType: "MONEYLINE",
  selection: "LAD",
  line: 0,
  homeTeam: "LAD",
  awayTeam: "SF",
  sportKey: "baseball_mlb",
  gameDateIso: `${DATE}T02:10:00Z`,
};

describe("free-settlement abbr + name matching", () => {
  it("matches pick abbr tokens to final full names via abbr field", () => {
    expect(finalMatchesPick(pickAbbr, finalDodgers)).toBe(true);
  });

  it("orients pick home abbr LAD to final home Dodgers", () => {
    expect(orientToPickHome(pickAbbr, finalDodgers)).toEqual({
      homeScore: 5,
      awayScore: 3,
    });
  });

  it("settles MONEYLINE when only abbr identifiers are stored on the pick", () => {
    const out = settlePendingPicks([pickAbbr], [finalDodgers])[0]!;
    expect(out.status).toBe("SETTLED");
    if (out.status === "SETTLED") {
      expect(out.result).toBe("WIN");
      expect(out.homeScore).toBe(5);
    }
  });
});
