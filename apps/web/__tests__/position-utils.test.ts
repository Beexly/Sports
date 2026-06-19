import { describe, it, expect } from "vitest";
import {
  normalizeNFLPosition,
  nflPositionGroup,
  nflPositionInfo,
  normalizeNBAPosition,
  nbaPositionGroup,
  normalizeMLBPosition,
  mlbPositionGroup,
  normalizeNHLPosition,
  nhlPositionGroup,
  positionDisplayName,
  isFantasyRelevant,
  positionsForSport,
  depthChartOrder,
  statLabelsForPosition,
} from "@/lib/sports/position-utils";

// ---------------------------------------------------------------------------
// NFL — normalizeNFLPosition
// ---------------------------------------------------------------------------
describe("normalizeNFLPosition", () => {
  it('normalizes "Quarterback" → "QB"', () => {
    expect(normalizeNFLPosition("Quarterback")).toBe("QB");
  });

  it('normalizes "WR" → "WR"', () => {
    expect(normalizeNFLPosition("WR")).toBe("WR");
  });

  it('normalizes "Free Safety" → "FS"', () => {
    expect(normalizeNFLPosition("Free Safety")).toBe("FS");
  });

  it('normalizes "running back" (lowercase) → "RB"', () => {
    expect(normalizeNFLPosition("running back")).toBe("RB");
  });

  it('normalizes "Wide Receiver" → "WR"', () => {
    expect(normalizeNFLPosition("Wide Receiver")).toBe("WR");
  });

  it('normalizes "Tight End" → "TE"', () => {
    expect(normalizeNFLPosition("Tight End")).toBe("TE");
  });

  it('normalizes "Halfback" → "HB"', () => {
    expect(normalizeNFLPosition("Halfback")).toBe("HB");
  });

  it('normalizes "Fullback" → "FB"', () => {
    expect(normalizeNFLPosition("Fullback")).toBe("FB");
  });

  it('normalizes "Offensive Tackle" → "OT"', () => {
    expect(normalizeNFLPosition("Offensive Tackle")).toBe("OT");
  });

  it('normalizes "LT" → "LT"', () => {
    expect(normalizeNFLPosition("LT")).toBe("LT");
  });

  it('normalizes "Guard" → "OG"', () => {
    expect(normalizeNFLPosition("Guard")).toBe("OG");
  });

  it('normalizes "center" (lowercase) → "C"', () => {
    expect(normalizeNFLPosition("center")).toBe("C");
  });

  it('normalizes "Defensive End" → "DE"', () => {
    expect(normalizeNFLPosition("Defensive End")).toBe("DE");
  });

  it('normalizes "Nose Tackle" → "NT"', () => {
    expect(normalizeNFLPosition("Nose Tackle")).toBe("NT");
  });

  it('normalizes "EDGE" → "EDGE"', () => {
    expect(normalizeNFLPosition("EDGE")).toBe("EDGE");
  });

  it('normalizes "Linebacker" → "LB"', () => {
    expect(normalizeNFLPosition("Linebacker")).toBe("LB");
  });

  it('normalizes "Cornerback" → "CB"', () => {
    expect(normalizeNFLPosition("Cornerback")).toBe("CB");
  });

  it('normalizes "Strong Safety" → "SS"', () => {
    expect(normalizeNFLPosition("Strong Safety")).toBe("SS");
  });

  it('normalizes "Kicker" → "K"', () => {
    expect(normalizeNFLPosition("Kicker")).toBe("K");
  });

  it('normalizes "Punter" → "P"', () => {
    expect(normalizeNFLPosition("Punter")).toBe("P");
  });

  it('normalizes "Long Snapper" → "LS"', () => {
    expect(normalizeNFLPosition("Long Snapper")).toBe("LS");
  });

  it("returns uppercased original for unknown position", () => {
    expect(normalizeNFLPosition("unknown")).toBe("UNKNOWN");
  });
});

// ---------------------------------------------------------------------------
// NFL — nflPositionGroup
// ---------------------------------------------------------------------------
describe("nflPositionGroup", () => {
  it('groups "QB" → "QB"', () => {
    expect(nflPositionGroup("QB")).toBe("QB");
  });

  it('groups "WR" → "WR"', () => {
    expect(nflPositionGroup("WR")).toBe("WR");
  });

  it('groups "CB" → "DB"', () => {
    expect(nflPositionGroup("CB")).toBe("DB");
  });

  it('groups "LT" → "OL"', () => {
    expect(nflPositionGroup("LT")).toBe("OL");
  });

  it('groups "Tight End" → "TE"', () => {
    expect(nflPositionGroup("Tight End")).toBe("TE");
  });

  it('groups "Running Back" → "RB"', () => {
    expect(nflPositionGroup("Running Back")).toBe("RB");
  });

  it('groups "Fullback" → "RB"', () => {
    expect(nflPositionGroup("Fullback")).toBe("RB");
  });

  it('groups "OG" → "OL"', () => {
    expect(nflPositionGroup("OG")).toBe("OL");
  });

  it('groups "DE" → "DL"', () => {
    expect(nflPositionGroup("DE")).toBe("DL");
  });

  it('groups "NT" → "DL"', () => {
    expect(nflPositionGroup("NT")).toBe("DL");
  });

  it('groups "EDGE" → "DL"', () => {
    expect(nflPositionGroup("EDGE")).toBe("DL");
  });

  it('groups "OLB" → "LB"', () => {
    expect(nflPositionGroup("OLB")).toBe("LB");
  });

  it('groups "Safety" → "DB"', () => {
    expect(nflPositionGroup("Safety")).toBe("DB");
  });

  it('groups "FS" → "DB"', () => {
    expect(nflPositionGroup("FS")).toBe("DB");
  });

  it('groups "K" → "ST"', () => {
    expect(nflPositionGroup("K")).toBe("ST");
  });

  it('groups "PR" → "ST"', () => {
    expect(nflPositionGroup("PR")).toBe("ST");
  });
});

// ---------------------------------------------------------------------------
// NFL — nflPositionInfo
// ---------------------------------------------------------------------------
describe("nflPositionInfo", () => {
  it("WR → isSkillPosition=true, isOffense=true, isDefense=false", () => {
    const info = nflPositionInfo("WR");
    expect(info.isSkillPosition).toBe(true);
    expect(info.isOffense).toBe(true);
    expect(info.isDefense).toBe(false);
  });

  it("CB → isDefense=true, isOffense=false", () => {
    const info = nflPositionInfo("CB");
    expect(info.isDefense).toBe(true);
    expect(info.isOffense).toBe(false);
  });

  it("QB → isSkillPosition=true, isOffense=true", () => {
    const info = nflPositionInfo("QB");
    expect(info.isSkillPosition).toBe(true);
    expect(info.isOffense).toBe(true);
  });

  it("OT → isSkillPosition=false, isOffense=true", () => {
    const info = nflPositionInfo("OT");
    expect(info.isSkillPosition).toBe(false);
    expect(info.isOffense).toBe(true);
  });

  it("DE → isDefense=true, isSkillPosition=false", () => {
    const info = nflPositionInfo("DE");
    expect(info.isDefense).toBe(true);
    expect(info.isSkillPosition).toBe(false);
  });

  it("returns sport=NFL", () => {
    expect(nflPositionInfo("QB").sport).toBe("NFL");
  });

  it("carries raw input", () => {
    expect(nflPositionInfo("Quarterback").raw).toBe("Quarterback");
  });
});

// ---------------------------------------------------------------------------
// NBA — normalizeNBAPosition
// ---------------------------------------------------------------------------
describe("normalizeNBAPosition", () => {
  it('normalizes "Point Guard" → "PG"', () => {
    expect(normalizeNBAPosition("Point Guard")).toBe("PG");
  });

  it('normalizes "Shooting Guard" → "SG"', () => {
    expect(normalizeNBAPosition("Shooting Guard")).toBe("SG");
  });

  it('normalizes "Small Forward" → "SF"', () => {
    expect(normalizeNBAPosition("Small Forward")).toBe("SF");
  });

  it('normalizes "Power Forward" → "PF"', () => {
    expect(normalizeNBAPosition("Power Forward")).toBe("PF");
  });

  it('normalizes "Center" → "C"', () => {
    expect(normalizeNBAPosition("Center")).toBe("C");
  });

  it('normalizes "G/F" → "G-F"', () => {
    expect(normalizeNBAPosition("G/F")).toBe("G-F");
  });

  it('normalizes "F/C" → "F-C"', () => {
    expect(normalizeNBAPosition("F/C")).toBe("F-C");
  });

  it('normalizes "G-F" → "G-F"', () => {
    expect(normalizeNBAPosition("G-F")).toBe("G-F");
  });
});

// ---------------------------------------------------------------------------
// NBA — nbaPositionGroup
// ---------------------------------------------------------------------------
describe("nbaPositionGroup", () => {
  it('"PG" → "G"', () => {
    expect(nbaPositionGroup("PG")).toBe("G");
  });

  it('"SG" → "G"', () => {
    expect(nbaPositionGroup("SG")).toBe("G");
  });

  it('"PF" → "F"', () => {
    expect(nbaPositionGroup("PF")).toBe("F");
  });

  it('"C" → "C"', () => {
    expect(nbaPositionGroup("C")).toBe("C");
  });

  it('"G/F" → "G-F"', () => {
    expect(nbaPositionGroup("G/F")).toBe("G-F");
  });

  it('"F-C" → "F-C"', () => {
    expect(nbaPositionGroup("F-C")).toBe("F-C");
  });
});

// ---------------------------------------------------------------------------
// MLB — normalizeMLBPosition
// ---------------------------------------------------------------------------
describe("normalizeMLBPosition", () => {
  it('"Starting Pitcher" → "SP"', () => {
    expect(normalizeMLBPosition("Starting Pitcher")).toBe("SP");
  });

  it('"Relief Pitcher" → "RP"', () => {
    expect(normalizeMLBPosition("Relief Pitcher")).toBe("RP");
  });

  it('"Closer" → "CL"', () => {
    expect(normalizeMLBPosition("Closer")).toBe("CL");
  });

  it('"Catcher" → "C"', () => {
    expect(normalizeMLBPosition("Catcher")).toBe("C");
  });

  it('"Shortstop" → "SS"', () => {
    expect(normalizeMLBPosition("Shortstop")).toBe("SS");
  });

  it('"First Base" → "1B"', () => {
    expect(normalizeMLBPosition("First Base")).toBe("1B");
  });

  it('"LF" → "LF"', () => {
    expect(normalizeMLBPosition("LF")).toBe("LF");
  });

  it('"Center Field" → "CF"', () => {
    expect(normalizeMLBPosition("Center Field")).toBe("CF");
  });

  it('"Designated Hitter" → "DH"', () => {
    expect(normalizeMLBPosition("Designated Hitter")).toBe("DH");
  });

  it('"Utility" → "UTIL"', () => {
    expect(normalizeMLBPosition("Utility")).toBe("UTIL");
  });
});

// ---------------------------------------------------------------------------
// MLB — mlbPositionGroup
// ---------------------------------------------------------------------------
describe("mlbPositionGroup", () => {
  it('"SP" → "SP"', () => {
    expect(mlbPositionGroup("SP")).toBe("SP");
  });

  it('"CL" → "RP"', () => {
    expect(mlbPositionGroup("CL")).toBe("RP");
  });

  it('"SS" → "IF"', () => {
    expect(mlbPositionGroup("SS")).toBe("IF");
  });

  it('"CF" → "OF"', () => {
    expect(mlbPositionGroup("CF")).toBe("OF");
  });

  it('"C" → "C"', () => {
    expect(mlbPositionGroup("C")).toBe("C");
  });

  it('"DH" → "DH"', () => {
    expect(mlbPositionGroup("DH")).toBe("DH");
  });

  it('"UTIL" → "UTIL"', () => {
    expect(mlbPositionGroup("UTIL")).toBe("UTIL");
  });

  it('"1B" → "IF"', () => {
    expect(mlbPositionGroup("1B")).toBe("IF");
  });

  it('"RF" → "OF"', () => {
    expect(mlbPositionGroup("RF")).toBe("OF");
  });
});

// ---------------------------------------------------------------------------
// NHL — normalizeNHLPosition
// ---------------------------------------------------------------------------
describe("normalizeNHLPosition", () => {
  it('"Goaltender" → "G"', () => {
    expect(normalizeNHLPosition("Goaltender")).toBe("G");
  });

  it('"Goalie" → "G"', () => {
    expect(normalizeNHLPosition("Goalie")).toBe("G");
  });

  it('"Defenseman" → "D"', () => {
    expect(normalizeNHLPosition("Defenseman")).toBe("D");
  });

  it('"Defense" → "D"', () => {
    expect(normalizeNHLPosition("Defense")).toBe("D");
  });

  it('"Left Wing" → "LW"', () => {
    expect(normalizeNHLPosition("Left Wing")).toBe("LW");
  });

  it('"Right Wing" → "RW"', () => {
    expect(normalizeNHLPosition("Right Wing")).toBe("RW");
  });

  it('"Forward" → "F"', () => {
    expect(normalizeNHLPosition("Forward")).toBe("F");
  });

  it('"Center" → "C"', () => {
    expect(normalizeNHLPosition("Center")).toBe("C");
  });
});

// ---------------------------------------------------------------------------
// NHL — nhlPositionGroup
// ---------------------------------------------------------------------------
describe("nhlPositionGroup", () => {
  it('"G" → "G"', () => {
    expect(nhlPositionGroup("G")).toBe("G");
  });

  it('"D" → "D"', () => {
    expect(nhlPositionGroup("D")).toBe("D");
  });

  it('"LW" → "F"', () => {
    expect(nhlPositionGroup("LW")).toBe("F");
  });

  it('"RW" → "F"', () => {
    expect(nhlPositionGroup("RW")).toBe("F");
  });

  it('"C" → "F"', () => {
    expect(nhlPositionGroup("C")).toBe("F");
  });

  it('"Forward" → "F"', () => {
    expect(nhlPositionGroup("Forward")).toBe("F");
  });
});

// ---------------------------------------------------------------------------
// positionDisplayName
// ---------------------------------------------------------------------------
describe("positionDisplayName", () => {
  it('NFL "QB" → "Quarterback"', () => {
    expect(positionDisplayName("NFL", "QB")).toBe("Quarterback");
  });

  it('NFL "WR" → "Wide Receiver"', () => {
    expect(positionDisplayName("NFL", "WR")).toBe("Wide Receiver");
  });

  it('NBA "PG" → "Point Guard"', () => {
    expect(positionDisplayName("NBA", "PG")).toBe("Point Guard");
  });

  it('NBA "SF" → "Small Forward"', () => {
    expect(positionDisplayName("NBA", "SF")).toBe("Small Forward");
  });

  it('MLB "SP" → "Starting Pitcher"', () => {
    expect(positionDisplayName("MLB", "SP")).toBe("Starting Pitcher");
  });

  it('MLB "SS" → "Shortstop"', () => {
    expect(positionDisplayName("MLB", "SS")).toBe("Shortstop");
  });

  it('NHL "G" → "Goaltender"', () => {
    expect(positionDisplayName("NHL", "G")).toBe("Goaltender");
  });

  it('NHL "D" → "Defenseman"', () => {
    expect(positionDisplayName("NHL", "D")).toBe("Defenseman");
  });

  it("unknown position → returns pos as-is", () => {
    expect(positionDisplayName("NFL", "XYZ")).toBe("XYZ");
  });
});

// ---------------------------------------------------------------------------
// isFantasyRelevant
// ---------------------------------------------------------------------------
describe("isFantasyRelevant", () => {
  it('NFL "QB" → true', () => {
    expect(isFantasyRelevant("NFL", "QB")).toBe(true);
  });

  it('NFL "WR" → true', () => {
    expect(isFantasyRelevant("NFL", "WR")).toBe(true);
  });

  it('NFL "K" → true', () => {
    expect(isFantasyRelevant("NFL", "K")).toBe(true);
  });

  it('NFL "OT" → false', () => {
    expect(isFantasyRelevant("NFL", "OT")).toBe(false);
  });

  it('NFL "DE" → false', () => {
    expect(isFantasyRelevant("NFL", "DE")).toBe(false);
  });

  it('NBA "PG" → true', () => {
    expect(isFantasyRelevant("NBA", "PG")).toBe(true);
  });

  it('NBA "C" → true', () => {
    expect(isFantasyRelevant("NBA", "C")).toBe(true);
  });

  it('MLB "SP" → true', () => {
    expect(isFantasyRelevant("MLB", "SP")).toBe(true);
  });

  it('MLB "CF" → true', () => {
    expect(isFantasyRelevant("MLB", "CF")).toBe(true);
  });

  it('MLB "UTIL" → false', () => {
    expect(isFantasyRelevant("MLB", "UTIL")).toBe(false);
  });

  it('NHL "G" → true', () => {
    expect(isFantasyRelevant("NHL", "G")).toBe(true);
  });

  it('NHL "D" → true', () => {
    expect(isFantasyRelevant("NHL", "D")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// positionsForSport
// ---------------------------------------------------------------------------
describe("positionsForSport", () => {
  it("NFL returns array containing QB, WR, RB", () => {
    const positions = positionsForSport("NFL");
    expect(positions).toContain("QB");
    expect(positions).toContain("WR");
    expect(positions).toContain("RB");
  });

  it("NBA returns length 5", () => {
    expect(positionsForSport("NBA")).toHaveLength(5);
  });

  it("NBA contains PG, SG, SF, PF, C", () => {
    const positions = positionsForSport("NBA");
    expect(positions).toContain("PG");
    expect(positions).toContain("SG");
    expect(positions).toContain("SF");
    expect(positions).toContain("PF");
    expect(positions).toContain("C");
  });

  it("MLB contains SP and SS", () => {
    const positions = positionsForSport("MLB");
    expect(positions).toContain("SP");
    expect(positions).toContain("SS");
  });

  it("NHL contains G, D, LW, RW, C", () => {
    const positions = positionsForSport("NHL");
    expect(positions).toContain("G");
    expect(positions).toContain("D");
    expect(positions).toContain("LW");
    expect(positions).toContain("RW");
    expect(positions).toContain("C");
  });

  it("CFB returns same as NFL", () => {
    expect(positionsForSport("CFB")).toEqual(positionsForSport("NFL"));
  });

  it("unknown sport returns empty array", () => {
    // @ts-expect-error testing unknown sport
    expect(positionsForSport("UNKNOWN")).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// depthChartOrder
// ---------------------------------------------------------------------------
describe("depthChartOrder", () => {
  it("NFL QB → 0", () => {
    expect(depthChartOrder("NFL", "QB")).toBe(0);
  });

  it("NFL RB → 1", () => {
    expect(depthChartOrder("NFL", "RB")).toBe(1);
  });

  it("NFL DL → 5", () => {
    expect(depthChartOrder("NFL", "DL")).toBe(5);
  });

  it("NFL ST → 8", () => {
    expect(depthChartOrder("NFL", "ST")).toBe(8);
  });

  it("NBA G → 0", () => {
    expect(depthChartOrder("NBA", "G")).toBe(0);
  });

  it("NBA F → 1", () => {
    expect(depthChartOrder("NBA", "F")).toBe(1);
  });

  it("NBA C → 2", () => {
    expect(depthChartOrder("NBA", "C")).toBe(2);
  });

  it("MLB SP → 0", () => {
    expect(depthChartOrder("MLB", "SP")).toBe(0);
  });

  it("MLB IF → 3", () => {
    expect(depthChartOrder("MLB", "IF")).toBe(3);
  });

  it("MLB DH → 5", () => {
    expect(depthChartOrder("MLB", "DH")).toBe(5);
  });

  it("NHL G → 0", () => {
    expect(depthChartOrder("NHL", "G")).toBe(0);
  });

  it("NHL D → 1", () => {
    expect(depthChartOrder("NHL", "D")).toBe(1);
  });

  it("NHL F → 2", () => {
    expect(depthChartOrder("NHL", "F")).toBe(2);
  });

  it("QB is ordered before RB", () => {
    expect(depthChartOrder("NFL", "QB")).toBeLessThan(depthChartOrder("NFL", "RB"));
  });
});

// ---------------------------------------------------------------------------
// statLabelsForPosition
// ---------------------------------------------------------------------------
describe("statLabelsForPosition", () => {
  it('NFL QB → contains "Pass Yards"', () => {
    expect(statLabelsForPosition("NFL", "QB")).toContain("Pass Yards");
  });

  it('NFL QB → contains "TDs", "INTs", "QBR", "Completion %"', () => {
    const labels = statLabelsForPosition("NFL", "QB");
    expect(labels).toContain("TDs");
    expect(labels).toContain("INTs");
    expect(labels).toContain("QBR");
    expect(labels).toContain("Completion %");
  });

  it('NFL RB → contains "Rush Yards"', () => {
    expect(statLabelsForPosition("NFL", "RB")).toContain("Rush Yards");
  });

  it('NFL WR → contains "Rec Yards", "Targets"', () => {
    const labels = statLabelsForPosition("NFL", "WR");
    expect(labels).toContain("Rec Yards");
    expect(labels).toContain("Targets");
  });

  it('NFL TE → contains "Receptions"', () => {
    expect(statLabelsForPosition("NFL", "TE")).toContain("Receptions");
  });

  it('NFL CB → contains "Tackles", "INTs"', () => {
    const labels = statLabelsForPosition("NFL", "CB");
    expect(labels).toContain("Tackles");
    expect(labels).toContain("INTs");
  });

  it('NBA → contains "Points", "Rebounds", "Assists"', () => {
    const labels = statLabelsForPosition("NBA", "PG");
    expect(labels).toContain("Points");
    expect(labels).toContain("Rebounds");
    expect(labels).toContain("Assists");
  });

  it('MLB SP → contains "ERA"', () => {
    expect(statLabelsForPosition("MLB", "SP")).toContain("ERA");
  });

  it('MLB SP → contains "WHIP", "K/9"', () => {
    const labels = statLabelsForPosition("MLB", "SP");
    expect(labels).toContain("WHIP");
    expect(labels).toContain("K/9");
  });

  it('MLB RP → contains "Saves"', () => {
    expect(statLabelsForPosition("MLB", "RP")).toContain("Saves");
  });

  it('MLB CF (hitter) → contains "AVG", "OBP", "HR"', () => {
    const labels = statLabelsForPosition("MLB", "CF");
    expect(labels).toContain("AVG");
    expect(labels).toContain("OBP");
    expect(labels).toContain("HR");
  });

  it('NHL G → contains "GAA"', () => {
    expect(statLabelsForPosition("NHL", "G")).toContain("GAA");
  });

  it('NHL G → contains "Save%", "Shutouts"', () => {
    const labels = statLabelsForPosition("NHL", "G");
    expect(labels).toContain("Save%");
    expect(labels).toContain("Shutouts");
  });

  it('NHL D → contains "G", "A", "Pts"', () => {
    const labels = statLabelsForPosition("NHL", "D");
    expect(labels).toContain("G");
    expect(labels).toContain("A");
    expect(labels).toContain("Pts");
  });

  it("unknown sport returns empty array", () => {
    // @ts-expect-error testing unknown sport
    expect(statLabelsForPosition("UNKNOWN", "QB")).toHaveLength(0);
  });
});
