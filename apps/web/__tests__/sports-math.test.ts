/**
 * Sports math utilities test suite.
 * Covers: spread↔moneyline, totals prob, vig, alt lines, run lines, team normalization.
 * Minimum 40 tests.
 */

import { describe, it, expect } from "vitest";
import {
  spreadToMoneyline,
  moneylineToSpread,
  spreadToImpliedProb,
  vigFromPair,
  altLineFromMain,
  totalToOverUnderProb,
  convertRunLine,
} from "@/lib/sports/spread-math";
import {
  normalizeTeamName,
  teamsForSport,
  teamAbbreviations,
} from "@/lib/sports/team-normalize";

// ---------------------------------------------------------------------------
// spreadToMoneyline
// ---------------------------------------------------------------------------

describe("spreadToMoneyline", () => {
  it("pick-em (spread=0) returns -110/-110", () => {
    const result = spreadToMoneyline(0);
    expect(result.favorite).toBe(-110);
    expect(result.underdog).toBe(-110);
  });

  it("NFL spread=3 favourite is around -120 to -135 (sigma=13.45 empirical)", () => {
    // NFL sigma=13.45 gives ~55.5% win prob at 3 pts → around -125
    const result = spreadToMoneyline(3, "nfl");
    expect(result.favorite).toBeLessThanOrEqual(-115);
    expect(result.favorite).toBeGreaterThanOrEqual(-145);
    expect(result.underdog).toBeGreaterThan(100);
  });

  it("NFL spread=7 gives stronger favourite than spread=3", () => {
    const s3 = spreadToMoneyline(3, "nfl");
    const s7 = spreadToMoneyline(7, "nfl");
    expect(s7.favorite).toBeLessThan(s3.favorite); // more negative = stronger fav
  });

  it("NFL spread=14 gives very negative favourite odds", () => {
    const result = spreadToMoneyline(14, "nfl");
    // NFL sigma=13.45 empirical: spread=14 → ~-283
    expect(result.favorite).toBeLessThan(-200);
  });

  it("NBA spread=7 is different (stronger) than NFL spread=7", () => {
    const nba = spreadToMoneyline(7, "nba");
    const nfl = spreadToMoneyline(7, "nfl");
    // NBA sigma is smaller → same spread → higher win prob → more negative fav odds
    expect(nba.favorite).toBeLessThan(nfl.favorite);
  });

  it("favourite odds are always negative", () => {
    [1, 3, 7, 10, 14].forEach((spread) => {
      const result = spreadToMoneyline(spread, "nfl");
      expect(result.favorite).toBeLessThan(0);
    });
  });

  it("underdog odds are always positive", () => {
    [1, 3, 7, 10, 14].forEach((spread) => {
      const result = spreadToMoneyline(spread, "nfl");
      expect(result.underdog).toBeGreaterThan(0);
    });
  });

  it("larger spread → more extreme moneyline", () => {
    const s3 = spreadToMoneyline(3, "nfl");
    const s10 = spreadToMoneyline(10, "nfl");
    expect(Math.abs(s10.favorite)).toBeGreaterThan(Math.abs(s3.favorite));
  });

  it("default sport matches nfl", () => {
    const def = spreadToMoneyline(7);
    const nfl = spreadToMoneyline(7, "nfl");
    expect(def.favorite).toBe(nfl.favorite);
    expect(def.underdog).toBe(nfl.underdog);
  });
});

// ---------------------------------------------------------------------------
// moneylineToSpread
// ---------------------------------------------------------------------------

describe("moneylineToSpread", () => {
  it("-150 favourite maps to a positive spread", () => {
    const spread = moneylineToSpread(-150);
    expect(spread).toBeGreaterThan(0);
  });

  it("-200 maps to larger spread than -150", () => {
    const s150 = moneylineToSpread(-150);
    const s200 = moneylineToSpread(-200);
    expect(s200).toBeGreaterThan(s150);
  });

  it("positive moneyline is treated as favourite (flips sign)", () => {
    // +150 treated as -150 from favourite's perspective
    const pos = moneylineToSpread(150);
    const neg = moneylineToSpread(-150);
    expect(pos).toBeCloseTo(neg, 1);
  });

  it("roundtrip NFL: spreadToMoneyline then moneylineToSpread ≈ original", () => {
    const originalSpread = 6.5;
    const { favorite } = spreadToMoneyline(originalSpread, "nfl");
    const recovered = moneylineToSpread(favorite, "nfl");
    expect(recovered).toBeCloseTo(originalSpread, 0); // within 1 point (integer rounding)
  });

  it("roundtrip NBA: spread 10 round-trips correctly", () => {
    const originalSpread = 10;
    const { favorite } = spreadToMoneyline(originalSpread, "nba");
    const recovered = moneylineToSpread(favorite, "nba");
    expect(recovered).toBeCloseTo(originalSpread, 0);
  });
});

// ---------------------------------------------------------------------------
// spreadToImpliedProb
// ---------------------------------------------------------------------------

describe("spreadToImpliedProb", () => {
  it("spread=0 → exactly 0.5", () => {
    expect(spreadToImpliedProb(0)).toBe(0.5);
  });

  it("spread=7 NFL → > 0.6 (NFL sigma=13.45 empirical)", () => {
    // NFL is a high-variance sport; spread=7 gives ~62.7% win prob
    expect(spreadToImpliedProb(7, "nfl")).toBeGreaterThan(0.6);
  });

  it("spread=14 NFL → > 0.7 (empirical, lower than tight sigma sports)", () => {
    // NFL spread=14 → ~73.9% win prob given sigma=13.45
    expect(spreadToImpliedProb(14, "nfl")).toBeGreaterThan(0.7);
  });

  it("prob is monotonically increasing with spread", () => {
    const probs = [0, 3, 7, 10, 14, 20].map((s) =>
      spreadToImpliedProb(s, "nfl")
    );
    for (let i = 1; i < probs.length; i++) {
      expect(probs[i]).toBeGreaterThan(probs[i - 1]!);
    }
  });

  it("always between 0.5 and 1", () => {
    [1, 3, 7, 14, 21].forEach((s) => {
      const p = spreadToImpliedProb(s, "nfl");
      expect(p).toBeGreaterThanOrEqual(0.5);
      expect(p).toBeLessThan(1);
    });
  });

  it("NBA has higher implied prob at same spread (smaller sigma)", () => {
    const nba = spreadToImpliedProb(7, "nba");
    const nfl = spreadToImpliedProb(7, "nfl");
    expect(nba).toBeGreaterThan(nfl);
  });
});

// ---------------------------------------------------------------------------
// vigFromPair
// ---------------------------------------------------------------------------

describe("vigFromPair", () => {
  it("(-110, -110) → vig ≈ 4.7%", () => {
    const { vigPct } = vigFromPair(-110, -110);
    expect(vigPct).toBeCloseTo(0.047, 2);
  });

  it("(-110, -110) → overround ≈ 4.76%", () => {
    const { overround } = vigFromPair(-110, -110);
    expect(overround).toBeCloseTo(0.0476, 2);
  });

  it("(-120, +100) → overround is non-negative", () => {
    const { overround } = vigFromPair(-120, 100);
    expect(overround).toBeGreaterThanOrEqual(0);
  });

  it("(-105, -105) has lower vig than (-110, -110)", () => {
    const vig105 = vigFromPair(-105, -105).vigPct;
    const vig110 = vigFromPair(-110, -110).vigPct;
    expect(vig105).toBeLessThan(vig110);
  });

  it("overround + 1 ≈ sum of implied probs", () => {
    const { overround } = vigFromPair(-120, 105);
    // -120 → 120/220 ≈ 0.545; +105 → 100/205 ≈ 0.488
    const pA = 120 / 220;
    const pB = 100 / 205;
    expect(overround).toBeCloseTo(pA + pB - 1, 4);
  });
});

// ---------------------------------------------------------------------------
// altLineFromMain
// ---------------------------------------------------------------------------

describe("altLineFromMain", () => {
  it("moving from -3.5 to -6.5 makes the favourite more expensive", () => {
    // At -3.5 at -110; moving to -6.5 (bigger fav) → price should be more negative
    const altPrice = altLineFromMain(-110, 3.5, 6.5, "nfl");
    expect(altPrice).toBeLessThan(-110);
  });

  it("moving from -6.5 to -3.5 makes the favourite cheaper", () => {
    const altPrice = altLineFromMain(-250, 6.5, 3.5, "nfl");
    expect(altPrice).toBeGreaterThan(-250);
  });

  it("returns a valid American-odds integer", () => {
    const result = altLineFromMain(-110, 3.5, 7, "nfl");
    expect(Number.isInteger(result)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// totalToOverUnderProb
// ---------------------------------------------------------------------------

describe("totalToOverUnderProb", () => {
  it("projected === total → overProb ≈ underProb ≈ 0.5", () => {
    const { overProb, underProb } = totalToOverUnderProb(47.5, 47.5);
    expect(overProb).toBeCloseTo(0.5, 1);
    expect(underProb).toBeCloseTo(0.5, 1);
  });

  it("projected > total by 10 → overProb > 0.8", () => {
    const { overProb } = totalToOverUnderProb(40, 50);
    expect(overProb).toBeGreaterThan(0.8);
  });

  it("projected < total by 10 → underProb > 0.8", () => {
    const { underProb } = totalToOverUnderProb(50, 40);
    expect(underProb).toBeGreaterThan(0.8);
  });

  it("pushProb ≥ 0", () => {
    const { pushProb } = totalToOverUnderProb(47, 47);
    expect(pushProb).toBeGreaterThanOrEqual(0);
  });

  it("overProb + underProb + pushProb ≈ 1.0", () => {
    const { overProb, underProb, pushProb } = totalToOverUnderProb(47.5, 49);
    expect(overProb + underProb + pushProb).toBeCloseTo(1.0, 5);
  });

  it("integer total has non-zero pushProb", () => {
    const { pushProb } = totalToOverUnderProb(47, 47);
    expect(pushProb).toBeGreaterThan(0);
  });

  it("half-point total has pushProb ≈ 0", () => {
    const { pushProb } = totalToOverUnderProb(47.5, 47.5);
    expect(pushProb).toBeCloseTo(0, 5);
  });

  it("custom stdDev shifts probabilities", () => {
    // Narrower stdDev → stronger over signal for same difference
    const tight = totalToOverUnderProb(40, 50, 5);
    const wide = totalToOverUnderProb(40, 50, 20);
    expect(tight.overProb).toBeGreaterThan(wide.overProb);
  });
});

// ---------------------------------------------------------------------------
// convertRunLine
// ---------------------------------------------------------------------------

describe("convertRunLine", () => {
  it("favourite is at -1.5", () => {
    const result = convertRunLine(-200);
    expect(result.favoriteRunLine).toBe(-1.5);
  });

  it("underdog is at +1.5", () => {
    const result = convertRunLine(-200);
    expect(result.underdogRunLine).toBe(1.5);
  });

  it("heavy favourite (-200) gets boosted runLinePrice", () => {
    const result = convertRunLine(-200);
    // Empirical shift: -200 + 65 = -135
    expect(result.runLinePrice).toBeGreaterThan(-200);
    expect(result.runLinePrice).toBeLessThan(0); // still favoured
  });

  it("positive ml treated as favourite", () => {
    const pos = convertRunLine(200);
    const neg = convertRunLine(-200);
    expect(pos.runLinePrice).toBe(neg.runLinePrice);
  });
});

// ---------------------------------------------------------------------------
// normalizeTeamName
// ---------------------------------------------------------------------------

describe("normalizeTeamName", () => {
  it("'Chiefs' → Kansas City Chiefs (NFL)", () => {
    const info = normalizeTeamName("Chiefs", "nfl");
    expect(info?.canonical).toBe("Kansas City Chiefs");
  });

  it("'Kansas City Chiefs' → canonical", () => {
    const info = normalizeTeamName("Kansas City Chiefs");
    expect(info?.canonical).toBe("Kansas City Chiefs");
  });

  it("'KC' → Kansas City Chiefs (NFL context)", () => {
    const info = normalizeTeamName("KC", "nfl");
    expect(info?.canonical).toBe("Kansas City Chiefs");
  });

  it("unknown name → null", () => {
    const info = normalizeTeamName("Galaxy Moonbeams");
    expect(info).toBeNull();
  });

  it("'Lakers' → Los Angeles Lakers", () => {
    const info = normalizeTeamName("Lakers");
    expect(info?.canonical).toBe("Los Angeles Lakers");
  });

  it("'LA Lakers' → Los Angeles Lakers", () => {
    const info = normalizeTeamName("LA Lakers", "nba");
    expect(info?.canonical).toBe("Los Angeles Lakers");
  });

  it("'NYY' → New York Yankees (MLB)", () => {
    const info = normalizeTeamName("NYY", "mlb");
    expect(info?.canonical).toBe("New York Yankees");
  });

  it("'Patriots' → New England Patriots", () => {
    const info = normalizeTeamName("Patriots", "nfl");
    expect(info?.canonical).toBe("New England Patriots");
  });

  it("'Golden State Warriors' → canonical", () => {
    const info = normalizeTeamName("Golden State Warriors");
    expect(info?.canonical).toBe("Golden State Warriors");
  });

  it("abbreviation 'BUF' → Buffalo Bills (NFL)", () => {
    const info = normalizeTeamName("BUF", "nfl");
    expect(info?.canonical).toBe("Buffalo Bills");
  });

  it("'Cowboys' → Dallas Cowboys", () => {
    const info = normalizeTeamName("Cowboys");
    expect(info?.canonical).toBe("Dallas Cowboys");
  });

  it("case insensitive: 'chiefs' → Kansas City Chiefs", () => {
    const info = normalizeTeamName("chiefs", "nfl");
    expect(info?.canonical).toBe("Kansas City Chiefs");
  });

  it("returns correct sport on result", () => {
    const info = normalizeTeamName("Patriots", "nfl");
    expect(info?.sport).toBe("nfl");
  });

  it("returns abbreviation on result", () => {
    const info = normalizeTeamName("Kansas City Chiefs");
    expect(info?.abbreviation).toBe("KC");
  });

  it("'49ers' → San Francisco 49ers", () => {
    const info = normalizeTeamName("49ers", "nfl");
    expect(info?.canonical).toBe("San Francisco 49ers");
  });

  it("'Bruins' → Boston Bruins (NHL)", () => {
    const info = normalizeTeamName("Bruins", "nhl");
    expect(info?.canonical).toBe("Boston Bruins");
  });
});

// ---------------------------------------------------------------------------
// teamsForSport
// ---------------------------------------------------------------------------

describe("teamsForSport", () => {
  it("NFL has exactly 32 teams", () => {
    expect(teamsForSport("nfl")).toHaveLength(32);
  });

  it("NBA has exactly 30 teams", () => {
    expect(teamsForSport("nba")).toHaveLength(30);
  });

  it("MLB has exactly 30 teams", () => {
    expect(teamsForSport("mlb")).toHaveLength(30);
  });

  it("NHL has exactly 32 teams", () => {
    expect(teamsForSport("nhl")).toHaveLength(32);
  });

  it("all NFL teams have required fields", () => {
    teamsForSport("nfl").forEach((team) => {
      expect(team.canonical).toBeTruthy();
      expect(team.short).toBeTruthy();
      expect(team.abbreviation).toBeTruthy();
      expect(team.sport).toBe("nfl");
    });
  });

  it("all NBA teams have sport=nba", () => {
    teamsForSport("nba").forEach((team) => {
      expect(team.sport).toBe("nba");
    });
  });
});

// ---------------------------------------------------------------------------
// teamAbbreviations
// ---------------------------------------------------------------------------

describe("teamAbbreviations", () => {
  it("NFL abbreviations has 32 entries", () => {
    const abbrs = teamAbbreviations("nfl");
    expect(Object.keys(abbrs)).toHaveLength(32);
  });

  it("KC maps to Kansas City Chiefs in NFL", () => {
    const abbrs = teamAbbreviations("nfl");
    expect(abbrs["KC"]).toBe("Kansas City Chiefs");
  });

  it("NYY maps to New York Yankees in MLB", () => {
    const abbrs = teamAbbreviations("mlb");
    expect(abbrs["NYY"]).toBe("New York Yankees");
  });

  it("all values are non-empty strings", () => {
    const abbrs = teamAbbreviations("nba");
    Object.values(abbrs).forEach((name) => {
      expect(typeof name).toBe("string");
      expect(name.length).toBeGreaterThan(0);
    });
  });
});
