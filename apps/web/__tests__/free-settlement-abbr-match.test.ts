import { describe, expect, it } from "vitest";
import {
  expandTeamMatchTokens,
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

  it("matches full city name to ESPN nickname display", () => {
    const pick: PendingPick = {
      pickId: "1",
      pickType: "MONEYLINE",
      selection: "HOME",
      line: 0,
      homeTeam: "Los Angeles Angels",
      awayTeam: "Boston Red Sox",
      sportKey: "baseball_mlb",
      gameDateIso: "2026-07-15T00:00:00.000Z",
    };
    const final: TrustedFinal = {
      date: "2026-07-15",
      home: { name: "Angels", abbr: "LAA", score: 5 },
      away: { name: "Red Sox", abbr: "BOS", score: 3 },
      confirmation: "SINGLE_SOURCE",
      sources: ["espn"],
    };
    expect(finalMatchesPick(pick, final)).toBe(true);
    expect(expandTeamMatchTokens("Los Angeles Angels")).toEqual(
      expect.arrayContaining(["losangelesangels", "angels"]),
    );
  });

  it("matches Blue Jays two-word nickname", () => {
    const tokens = expandTeamMatchTokens("Toronto Blue Jays");
    expect(tokens).toEqual(
      expect.arrayContaining(["bluejays", "jays", "torontobluejays"]),
    );
  });
});

describe("alias + city-strip matching", () => {
  it("matches Oakland Athletics to ESPN Athletics / ATH", () => {
    const pick: PendingPick = {
      pickId: "oa",
      pickType: "MONEYLINE",
      selection: "HOME",
      line: 0,
      homeTeam: "Oakland Athletics",
      awayTeam: "Houston Astros",
      sportKey: "baseball_mlb",
      gameDateIso: "2026-07-15T00:00:00.000Z",
    };
    const final: TrustedFinal = {
      date: "2026-07-15",
      home: { name: "Athletics", abbr: "ATH", score: 4 },
      away: { name: "Astros", abbr: "HOU", score: 2 },
      confirmation: "SINGLE_SOURCE",
      sources: ["espn"],
    };
    expect(finalMatchesPick(pick, final)).toBe(true);
  });

  it("matches LAFC style MLS short names", () => {
    const pick: PendingPick = {
      pickId: "mls1",
      pickType: "MONEYLINE",
      selection: "HOME",
      line: 0,
      homeTeam: "Los Angeles FC",
      awayTeam: "Seattle Sounders FC",
      sportKey: "soccer_usa_mls",
      gameDateIso: "2026-07-15T00:00:00.000Z",
    };
    const final: TrustedFinal = {
      date: "2026-07-15",
      home: { name: "LAFC", abbr: "LAFC", score: 2 },
      away: { name: "Sounders", abbr: "SEA", score: 1 },
      confirmation: "SINGLE_SOURCE",
      sources: ["espn"],
    };
    expect(finalMatchesPick(pick, final)).toBe(true);
  });
});
