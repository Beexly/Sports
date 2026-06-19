/**
 * Sports position classification utilities — pure, zero dependencies.
 *
 * Position normalization, grouping, display labels, fantasy relevance,
 * and position-specific stat categories for NFL, NBA, MLB, and NHL.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Sport = "NFL" | "NBA" | "MLB" | "NHL" | "CFB" | "NCAAB";

export type NFLPositionGroup =
  | "QB"
  | "RB"
  | "WR"
  | "TE"
  | "OL"
  | "DL"
  | "LB"
  | "DB"
  | "ST"
  | "COACH";

export type NBAPositionGroup = "G" | "F" | "C" | "G-F" | "F-C";

export type MLBPositionGroup = "SP" | "RP" | "C" | "IF" | "OF" | "DH" | "UTIL";

export type NHLPositionGroup = "G" | "D" | "F";

export interface PositionInfo {
  readonly sport: Sport;
  readonly raw: string;
  readonly normalized: string;
  readonly group: string;
  readonly displayName: string;
  readonly isSkillPosition: boolean;
  readonly isOffense: boolean;
  readonly isDefense: boolean;
}

// ---------------------------------------------------------------------------
// Internal lookup maps
// ---------------------------------------------------------------------------

const NFL_NORMALIZE_MAP: Record<string, string> = {
  // QB
  quarterback: "QB",
  qb: "QB",

  // RB
  "running back": "RB",
  rb: "RB",
  hb: "HB",
  halfback: "HB",
  fb: "FB",
  fullback: "FB",

  // WR
  "wide receiver": "WR",
  wr: "WR",

  // TE
  "tight end": "TE",
  te: "TE",

  // OL
  "offensive tackle": "OT",
  ot: "OT",
  lt: "LT",
  rt: "RT",
  "left tackle": "LT",
  "right tackle": "RT",
  "offensive guard": "OG",
  og: "OG",
  guard: "OG",
  lg: "LG",
  rg: "RG",
  "left guard": "LG",
  "right guard": "RG",
  center: "C",
  c: "C",

  // DL
  "defensive end": "DE",
  de: "DE",
  "defensive tackle": "DT",
  dt: "DT",
  "nose tackle": "NT",
  nt: "NT",
  edge: "EDGE",

  // LB
  linebacker: "LB",
  lb: "LB",
  "middle linebacker": "MLB",
  mlb: "MLB",
  "outside linebacker": "OLB",
  olb: "OLB",
  "inside linebacker": "ILB",
  ilb: "ILB",
  will: "WILL",
  mike: "MIKE",
  sam: "SAM",

  // DB
  cornerback: "CB",
  cb: "CB",
  safety: "S",
  s: "S",
  "free safety": "FS",
  fs: "FS",
  "strong safety": "SS",
  ss: "SS",

  // ST
  kicker: "K",
  k: "K",
  punter: "P",
  p: "P",
  "long snapper": "LS",
  ls: "LS",
  "punt returner": "PR",
  pr: "PR",
  "kick returner": "KR",
  kr: "KR",
  "special teams": "ST",
  st: "ST",
};

const NBA_NORMALIZE_MAP: Record<string, string> = {
  "point guard": "PG",
  pg: "PG",
  "shooting guard": "SG",
  sg: "SG",
  "small forward": "SF",
  sf: "SF",
  "power forward": "PF",
  pf: "PF",
  center: "C",
  c: "C",
  guard: "G",
  g: "G",
  forward: "F",
  f: "F",
  "g/f": "G-F",
  "g-f": "G-F",
  "f/c": "F-C",
  "f-c": "F-C",
};

const MLB_NORMALIZE_MAP: Record<string, string> = {
  "starting pitcher": "SP",
  sp: "SP",
  "relief pitcher": "RP",
  rp: "RP",
  closer: "CL",
  cl: "CL",
  pitcher: "RP",
  catcher: "C",
  c: "C",
  "first base": "1B",
  "1b": "1B",
  "second base": "2B",
  "2b": "2B",
  "third base": "3B",
  "3b": "3B",
  shortstop: "SS",
  ss: "SS",
  "left field": "LF",
  lf: "LF",
  "center field": "CF",
  cf: "CF",
  "right field": "RF",
  rf: "RF",
  "designated hitter": "DH",
  dh: "DH",
  utility: "UTIL",
  util: "UTIL",
};

const NHL_NORMALIZE_MAP: Record<string, string> = {
  goaltender: "G",
  goalie: "G",
  g: "G",
  defense: "D",
  defenseman: "D",
  defenceman: "D",
  d: "D",
  forward: "F",
  f: "F",
  "left wing": "LW",
  lw: "LW",
  "right wing": "RW",
  rw: "RW",
  center: "C",
  c: "C",
};

// ---------------------------------------------------------------------------
// NFL Display names
// ---------------------------------------------------------------------------

const NFL_DISPLAY_NAMES: Record<string, string> = {
  QB: "Quarterback",
  RB: "Running Back",
  HB: "Halfback",
  FB: "Fullback",
  WR: "Wide Receiver",
  TE: "Tight End",
  OT: "Offensive Tackle",
  LT: "Left Tackle",
  RT: "Right Tackle",
  OG: "Offensive Guard",
  LG: "Left Guard",
  RG: "Right Guard",
  C: "Center",
  DE: "Defensive End",
  DT: "Defensive Tackle",
  NT: "Nose Tackle",
  EDGE: "Edge Rusher",
  LB: "Linebacker",
  MLB: "Middle Linebacker",
  OLB: "Outside Linebacker",
  ILB: "Inside Linebacker",
  WILL: "Will Linebacker",
  MIKE: "Mike Linebacker",
  SAM: "Sam Linebacker",
  CB: "Cornerback",
  S: "Safety",
  FS: "Free Safety",
  SS: "Strong Safety",
  K: "Kicker",
  P: "Punter",
  LS: "Long Snapper",
  PR: "Punt Returner",
  KR: "Kick Returner",
  ST: "Special Teams",
};

const NBA_DISPLAY_NAMES: Record<string, string> = {
  PG: "Point Guard",
  SG: "Shooting Guard",
  SF: "Small Forward",
  PF: "Power Forward",
  C: "Center",
  G: "Guard",
  F: "Forward",
  "G-F": "Guard-Forward",
  "F-C": "Forward-Center",
};

const MLB_DISPLAY_NAMES: Record<string, string> = {
  SP: "Starting Pitcher",
  RP: "Relief Pitcher",
  CL: "Closer",
  C: "Catcher",
  "1B": "First Base",
  "2B": "Second Base",
  "3B": "Third Base",
  SS: "Shortstop",
  LF: "Left Field",
  CF: "Center Field",
  RF: "Right Field",
  DH: "Designated Hitter",
  UTIL: "Utility",
};

const NHL_DISPLAY_NAMES: Record<string, string> = {
  G: "Goaltender",
  D: "Defenseman",
  F: "Forward",
  LW: "Left Wing",
  RW: "Right Wing",
  C: "Center",
};

// ---------------------------------------------------------------------------
// NFL helpers
// ---------------------------------------------------------------------------

/**
 * Normalize an NFL position string to its canonical abbreviation.
 * Case-insensitive. Unknown inputs return the original uppercased.
 */
export function normalizeNFLPosition(pos: string): string {
  const key = pos.trim().toLowerCase();
  return NFL_NORMALIZE_MAP[key] ?? pos.toUpperCase();
}

/**
 * Map a normalized (or raw) NFL position to its position group.
 */
export function nflPositionGroup(pos: string): NFLPositionGroup {
  const normalized = normalizeNFLPosition(pos);
  switch (normalized) {
    case "QB":
      return "QB";
    case "RB":
    case "HB":
    case "FB":
      return "RB";
    case "WR":
      return "WR";
    case "TE":
      return "TE";
    case "OT":
    case "LT":
    case "RT":
    case "OG":
    case "LG":
    case "RG":
    case "C":
      return "OL";
    case "DE":
    case "DT":
    case "NT":
    case "EDGE":
      return "DL";
    case "LB":
    case "MLB":
    case "OLB":
    case "ILB":
    case "WILL":
    case "MIKE":
    case "SAM":
      return "LB";
    case "CB":
    case "S":
    case "FS":
    case "SS":
      return "DB";
    case "K":
    case "P":
    case "LS":
    case "PR":
    case "KR":
    case "ST":
      return "ST";
    default:
      return "ST";
  }
}

/**
 * Return full PositionInfo for an NFL position.
 */
export function nflPositionInfo(pos: string): PositionInfo {
  const normalized = normalizeNFLPosition(pos);
  const group = nflPositionGroup(normalized);
  const displayName = NFL_DISPLAY_NAMES[normalized] ?? normalized;

  const isSkillPosition = ["QB", "RB", "WR", "TE"].includes(group);
  const isOffense = ["QB", "RB", "WR", "TE", "OL"].includes(group);
  const isDefense = ["DL", "LB", "DB"].includes(group);

  return {
    sport: "NFL",
    raw: pos,
    normalized,
    group,
    displayName,
    isSkillPosition,
    isOffense,
    isDefense,
  };
}

// ---------------------------------------------------------------------------
// NBA helpers
// ---------------------------------------------------------------------------

/**
 * Normalize an NBA position string to its canonical abbreviation.
 */
export function normalizeNBAPosition(pos: string): string {
  const key = pos.trim().toLowerCase();
  return NBA_NORMALIZE_MAP[key] ?? pos.toUpperCase();
}

/**
 * Map a normalized NBA position to its position group.
 */
export function nbaPositionGroup(pos: string): NBAPositionGroup {
  const normalized = normalizeNBAPosition(pos);
  switch (normalized) {
    case "PG":
    case "SG":
    case "G":
      return "G";
    case "SF":
    case "PF":
    case "F":
      return "F";
    case "C":
      return "C";
    case "G-F":
    case "G/F":
      return "G-F";
    case "F-C":
    case "F/C":
      return "F-C";
    default:
      return "F";
  }
}

// ---------------------------------------------------------------------------
// MLB helpers
// ---------------------------------------------------------------------------

/**
 * Normalize an MLB position string to its canonical abbreviation.
 */
export function normalizeMLBPosition(pos: string): string {
  const key = pos.trim().toLowerCase();
  return MLB_NORMALIZE_MAP[key] ?? pos.toUpperCase();
}

/**
 * Map a normalized MLB position to its position group.
 */
export function mlbPositionGroup(pos: string): MLBPositionGroup {
  const normalized = normalizeMLBPosition(pos);
  switch (normalized) {
    case "SP":
      return "SP";
    case "RP":
    case "CL":
      return "RP";
    case "C":
      return "C";
    case "1B":
    case "2B":
    case "3B":
    case "SS":
      return "IF";
    case "LF":
    case "CF":
    case "RF":
      return "OF";
    case "DH":
      return "DH";
    case "UTIL":
      return "UTIL";
    default:
      return "UTIL";
  }
}

// ---------------------------------------------------------------------------
// NHL helpers
// ---------------------------------------------------------------------------

/**
 * Normalize an NHL position string to its canonical abbreviation.
 */
export function normalizeNHLPosition(pos: string): string {
  const key = pos.trim().toLowerCase();
  return NHL_NORMALIZE_MAP[key] ?? pos.toUpperCase();
}

/**
 * Map a normalized NHL position to its position group.
 */
export function nhlPositionGroup(pos: string): NHLPositionGroup {
  const normalized = normalizeNHLPosition(pos);
  switch (normalized) {
    case "G":
      return "G";
    case "D":
      return "D";
    default:
      // F, LW, RW, C all map to Forward group
      return "F";
  }
}

// ---------------------------------------------------------------------------
// Cross-sport utilities
// ---------------------------------------------------------------------------

/**
 * Return a human-readable display name for a position in any sport.
 */
export function positionDisplayName(sport: Sport, pos: string): string {
  switch (sport) {
    case "NFL":
    case "CFB": {
      const normalized = normalizeNFLPosition(pos);
      return NFL_DISPLAY_NAMES[normalized] ?? pos;
    }
    case "NBA":
    case "NCAAB": {
      const normalized = normalizeNBAPosition(pos);
      return NBA_DISPLAY_NAMES[normalized] ?? pos;
    }
    case "MLB": {
      const normalized = normalizeMLBPosition(pos);
      return MLB_DISPLAY_NAMES[normalized] ?? pos;
    }
    case "NHL": {
      const normalized = normalizeNHLPosition(pos);
      return NHL_DISPLAY_NAMES[normalized] ?? pos;
    }
    default:
      return pos;
  }
}

/**
 * Return whether a position is relevant for fantasy sports in the given sport.
 */
export function isFantasyRelevant(sport: Sport, pos: string): boolean {
  switch (sport) {
    case "NFL":
    case "CFB": {
      const normalized = normalizeNFLPosition(pos);
      return ["QB", "RB", "HB", "WR", "TE", "K"].includes(normalized);
    }
    case "NBA":
    case "NCAAB":
      // All NBA positions are fantasy relevant
      return true;
    case "MLB": {
      const normalized = normalizeMLBPosition(pos);
      return ["SP", "RP", "CL", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH"].includes(
        normalized
      );
    }
    case "NHL":
      // All NHL positions are fantasy relevant
      return true;
    default:
      return false;
  }
}

/**
 * Return the list of canonical positions for a sport.
 */
export function positionsForSport(sport: Sport): readonly string[] {
  switch (sport) {
    case "NFL":
    case "CFB":
      return [
        "QB",
        "RB",
        "FB",
        "WR",
        "TE",
        "OT",
        "OG",
        "C",
        "DE",
        "DT",
        "EDGE",
        "LB",
        "CB",
        "S",
        "K",
        "P",
        "LS",
      ] as const;
    case "NBA":
    case "NCAAB":
      return ["PG", "SG", "SF", "PF", "C"] as const;
    case "MLB":
      return ["SP", "RP", "CL", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH"] as const;
    case "NHL":
      return ["G", "D", "LW", "RW", "C"] as const;
    default:
      return [] as const;
  }
}

/**
 * Return the display order for a position group (lower = displayed first on depth chart).
 */
export function depthChartOrder(sport: Sport, group: string): number {
  switch (sport) {
    case "NFL":
    case "CFB": {
      const order: Record<string, number> = {
        QB: 0,
        RB: 1,
        WR: 2,
        TE: 3,
        OL: 4,
        DL: 5,
        LB: 6,
        DB: 7,
        ST: 8,
        COACH: 9,
      };
      return order[group] ?? 99;
    }
    case "NBA":
    case "NCAAB": {
      const order: Record<string, number> = {
        G: 0,
        F: 1,
        C: 2,
        "G-F": 3,
        "F-C": 4,
      };
      return order[group] ?? 99;
    }
    case "MLB": {
      const order: Record<string, number> = {
        SP: 0,
        RP: 1,
        C: 2,
        IF: 3,
        OF: 4,
        DH: 5,
        UTIL: 6,
      };
      return order[group] ?? 99;
    }
    case "NHL": {
      const order: Record<string, number> = {
        G: 0,
        D: 1,
        F: 2,
      };
      return order[group] ?? 99;
    }
    default:
      return 99;
  }
}

/**
 * Return the key stat display labels for a position in a given sport.
 */
export function statLabelsForPosition(sport: Sport, pos: string): readonly string[] {
  switch (sport) {
    case "NFL":
    case "CFB": {
      const normalized = normalizeNFLPosition(pos);
      const group = nflPositionGroup(normalized);
      switch (group) {
        case "QB":
          return ["Pass Yards", "TDs", "INTs", "QBR", "Completion %"] as const;
        case "RB":
          return ["Rush Yards", "Carries", "Yds/Carry", "TDs", "Receptions"] as const;
        case "WR":
        case "TE":
          return ["Rec Yards", "Receptions", "Targets", "TDs", "YPR"] as const;
        case "DL":
        case "LB":
        case "DB":
          return ["Tackles", "Sacks", "INTs", "PBUs", "TFLs"] as const;
        default:
          return [] as const;
      }
    }
    case "NBA":
    case "NCAAB":
      return ["Points", "Rebounds", "Assists", "Steals", "Blocks", "FG%"] as const;
    case "MLB": {
      const normalized = normalizeMLBPosition(pos);
      const group = mlbPositionGroup(normalized);
      switch (group) {
        case "SP":
          return ["ERA", "WHIP", "K/9", "BB/9", "Win", "IP"] as const;
        case "RP":
          return ["ERA", "WHIP", "Saves", "K/9", "Holds"] as const;
        default:
          // All hitters: C, IF, OF, DH, UTIL
          return ["AVG", "OBP", "SLG", "HR", "RBI", "R", "SB"] as const;
      }
    }
    case "NHL": {
      const normalized = normalizeNHLPosition(pos);
      const group = nhlPositionGroup(normalized);
      switch (group) {
        case "G":
          return ["GAA", "Save%", "Shutouts", "W-L-OTL"] as const;
        default:
          // D and F
          return ["G", "A", "Pts", "+/-", "PIM", "TOI"] as const;
      }
    }
    default:
      return [] as const;
  }
}
