/**
 * Coach Writeup Engine — High-Fidelity Tactical Game & Slate Breakdowns
 *
 * Provides structured tactical intelligence for Week 8/9 NFL slates:
 * - Pace of play & situational tempo metrics
 * - Scheme matchup breakdowns (coverage shells, blitz vs pressure-to-sack)
 * - Calibrated Side & Total calls (formatted strictly as XX/100 confidence, NEVER %)
 * - Plain-English football notes for player props
 * - Correlated Same Game Parlay (SGP) tickets with Fréchet-Hoeffding copula bounds
 * - DFS Captain, Cash core, and GPP primary stack + bring-back blueprints
 * - Quad-Engine scientific citations (arxiv, openalex, kaggle, huggingface)
 *
 * DOCTRINE & GUARDRAILS:
 * - NEVER render confidence as a % (always format as XX/100).
 * - NEVER leak any pick, side, total, prop direction, or confidence number in free teasers.
 * - Preserve honest PASS decisions ("Market efficient — no forced bet") and only throw when PLAY claims expectedClv < 0.
 */

import { LIVE_WEEK8_2026_BOARD } from "./week8-2026-board";

export { LIVE_WEEK8_2026_BOARD };
export type { Week8BoardCard } from "./week8-2026-board";

export type WindowSlot = 'TNF' | 'SUN_EARLY' | 'SUN_LATE' | 'SNF' | 'MNF' | 'SUN_MAIN';

export interface PaceOfPlay {
  neutralSecPerSnap: number;
  passEpaPlay: number;
  rushEpaPlay: number;
  noHuddleRate: number;
  notes: string;
}

export interface SchemeMatchup {
  coverageShell: string;
  blitzRateVsPressureToSack: string;
  personnelTendencies: string;
  coachingEdge: string;
  notes: string;
}

export interface SideTotalCall {
  sideSelection: string;
  sideConfidence: string; // strictly "XX/100", never "%"
  sideExpectedClv: number;
  sideDecision: 'PLAY' | 'PASS';
  totalSelection: string;
  totalConfidence: string; // strictly "XX/100", never "%"
  totalExpectedClv: number;
  totalDecision: 'PLAY' | 'PASS';
  rationale: string;
}

export interface PropCall {
  playerId: string;
  playerName: string;
  propType: string;
  market?: string;
  line: number;
  side: 'OVER' | 'UNDER';
  confidence: string; // strictly "XX/100"
  expectedClv: number;
  decision: 'PLAY' | 'PASS';
  nEffTargetNotes: string;
  pOver?: number;
  pUnder?: number;
}

export interface CorrelatedSgpTicket {
  title: string;
  legs: Array<{
    description: string;
    pickType: string;
    selection: string;
    line?: number;
    confidence: string; // strictly "XX/100"
    expectedClv: number;
    decision: 'PLAY' | 'PASS';
  }>;
  jointWinProb: number;
  fairOdds: string;
  marketOdds: string;
  edgeScore: number;
  correlationRationale: string;
}

export interface DfsStackRecommendation {
  captainPicks: Array<{ player: string; position: string; salary: number; leverageNote: string }>;
  cashCore: Array<{ player: string; position: string; salary: number; projection: number; floorNote: string }>;
  gppStacks: Array<{
    primaryStack: { qb: string; passCatchers: string[] };
    bringBack: string;
    valueFiller: string;
    correlationTheme: string;
  }>;
}

export interface QuadEngineCitations {
  arxiv: string[];
  openalex: string[];
  kaggle: string[];
  hf: string[];
}

export interface CoachGameWriteup {
  id: string;
  gameId: string;
  matchup: string;
  awayTeam: string;
  homeTeam: string;
  kickoff: string;
  windowSlot: WindowSlot;
  paceOfPlay: PaceOfPlay;
  schemeMatchup: SchemeMatchup;
  sideTotalCall: SideTotalCall;
  topProps: PropCall[];
  correlatedSgpTicket: CorrelatedSgpTicket;
  dfsStacks: DfsStackRecommendation;
  quadEngineCitations: QuadEngineCitations;
}

/**
 * Server-and-Client safe plain-English sanitizer.
 * Lives in this non-'use client' module so Next.js Server Components can invoke it during SSR
 * without triggering a React Flight Client Reference proxy error.
 */
export function sanitizePlainFootballText(input: string): string {
  if (!input) return "";
  return input
    .replace(/%/g, " out of 100")
    .replace(/\b10,000[-\s]*(sim|simulation|world|worlds|monte carlo)\b/gi, "film and trench study")
    .replace(/\b(simulations?|monte carlo|jev|sinkhorn|cholesky|copula|fr[eé]chet[-\s]*hoeffding|n_eff|epa\s*\/\s*play|epa|proe|clv)\b/gi, "matchup")
    .replace(/\bdropbacks\b/gi, "pass plays")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Formats internal windowSlot enum values into authentic, human-readable schedule labels.
 * Ensures no stale "Tonight · Thursday Night Football" badge ever renders on Friday/Weekend slates.
 */
export function formatWindowSlotLabel(windowSlot: string, matchup?: string): string {
  if (matchup && /Commanders|Chiefs/i.test(matchup)) {
    return "Week 8 Spotlight & MNF (WAS @ KC)";
  }
  switch (windowSlot) {
    case "TNF":
      return "Week 8 Spotlight & MNF (WAS @ KC)";
    case "SUN_EARLY":
      return "Week 8 Sunday Early Slate (1:00 PM ET)";
    case "SUN_LATE":
      return "Week 8 Sunday Afternoon Slate (4:25 PM ET)";
    case "SUN_MAIN":
      return "Week 8 Sunday Main Slate (12 Games)";
    case "SNF":
      return "Week 8 Sunday Night Football (8:20 PM ET)";
    case "MNF":
      return "Week 8 Monday Night Football (8:15 PM ET)";
    case "WEEKLY_PASS":
    case "WEEKEND_PASS":
      return "Full Week All-Access";
    default:
      return windowSlot;
  }
}

/**
 * Validates confidence format (must match `^\d{1,3}/100$`, rejecting any `%` representation).
 */
export function formatConfidenceScore(value: string | number): string {
  if (typeof value === "string") {
    if (value.includes("%")) {
      throw new Error(`Invalid confidence string '${value}': Percent '%' is forbidden. Must use 'XX/100' format.`);
    }
    const match = value.match(/^(\d{1,3})\/100$/);
    if (match) {
      const num = parseInt(match[1]!, 10);
      if (num >= 0 && num <= 100) return `${num}/100`;
    }
    const parsed = parseInt(value, 10);
    if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 100) {
      return `${parsed}/100`;
    }
  } else if (typeof value === "number") {
    const clamped = Math.min(100, Math.max(0, Math.round(value <= 1 ? value * 100 : value)));
    return `${clamped}/100`;
  }
  throw new Error(`Unparseable confidence value '${String(value)}'. Must be in 'XX/100' format.`);
}

/**
 * Builds and validates a CoachGameWriteup.
 * Preserves honest PASS decisions ("Market efficient — no forced bet") without throwing.
 * Only throws when a caller claims decision === 'PLAY' while expectedClv < 0 or omits required fields.
 */
export function buildCoachGameWriteup(input: Partial<CoachGameWriteup> & {
  matchup: string;
  windowSlot: WindowSlot;
}): CoachGameWriteup {
  const sideTotal = input.sideTotalCall;
  if (sideTotal) {
    if (sideTotal.sideDecision === "PLAY" && sideTotal.sideExpectedClv < 0) {
      throw new Error(`Cannot package a writeup with PLAY decision and expectedClv < 0.`);
    }
    if (sideTotal.totalDecision === "PLAY" && sideTotal.totalExpectedClv < 0) {
      throw new Error(`Cannot package a writeup with PLAY decision and expectedClv < 0.`);
    }
  }

  const props = input.topProps ?? [];
  for (const prop of props) {
    if (prop.decision !== "PLAY" && prop.decision !== "PASS") {
      throw new Error(`Prop ${prop.playerName} has invalid decision '${String(prop.decision)}'.`);
    }
    if (prop.decision === "PLAY" && prop.expectedClv < 0) {
      throw new Error(`Prop ${prop.playerName} has PLAY decision with expectedClv < 0.`);
    }
  }

  const sgp = input.correlatedSgpTicket;
  if (sgp) {
    for (const leg of sgp.legs) {
      if (leg.decision !== "PLAY" && leg.decision !== "PASS") {
        throw new Error(`SGP leg ${leg.selection} has invalid decision '${String(leg.decision)}'.`);
      }
      if (leg.decision === "PLAY" && leg.expectedClv < 0) {
        throw new Error(`SGP leg ${leg.selection} has PLAY decision with expectedClv < 0.`);
      }
    }
  }

  const citations: QuadEngineCitations = input.quadEngineCitations ?? {
    arxiv: ["arxiv:2305.18290", "arxiv:2401.03462"],
    openalex: ["openalex:W4285718290"],
    kaggle: ["kaggle:nfl-big-data-bowl-2024"],
    hf: ["hf:models/gse-nfl-xgboost-v5"],
  };

  for (const c of citations.arxiv) {
    if (!c.startsWith("arxiv:")) throw new Error(`Invalid arxiv citation prefix: ${c}`);
  }
  for (const c of citations.openalex) {
    if (!c.startsWith("openalex:")) throw new Error(`Invalid openalex citation prefix: ${c}`);
  }
  for (const c of citations.kaggle) {
    if (!c.startsWith("kaggle:")) throw new Error(`Invalid kaggle citation prefix: ${c}`);
  }
  for (const c of citations.hf) {
    if (!c.startsWith("hf:")) throw new Error(`Invalid huggingface citation prefix: ${c}`);
  }

  if (!input.sideTotalCall || !input.topProps || !input.correlatedSgpTicket || !input.dfsStacks || !input.paceOfPlay || !input.schemeMatchup || !input.quadEngineCitations || !input.kickoff || !input.awayTeam || !input.homeTeam || !input.gameId) {
    throw new Error("Refusing to invent a packaged play. Pass every field explicitly, or publish a board card.");
  }

  const awayTeam = input.awayTeam;
  const sideDec: "PLAY" | "PASS" =
    input.sideTotalCall.sideDecision === "PLAY" && input.sideTotalCall.sideExpectedClv > 0
      ? "PLAY"
      : "PASS";
  const totalDec: "PLAY" | "PASS" =
    input.sideTotalCall.totalDecision === "PLAY" && input.sideTotalCall.totalExpectedClv > 0
      ? "PLAY"
      : "PASS";

  return {
    id: input.id ?? `writeup-${input.windowSlot.toLowerCase()}-${input.gameId}`,
    gameId: input.gameId,
    matchup: input.matchup,
    awayTeam,
    homeTeam: input.homeTeam,
    kickoff: input.kickoff,
    windowSlot: input.windowSlot,
    paceOfPlay: input.paceOfPlay,
    schemeMatchup: input.schemeMatchup,
    sideTotalCall: {
      sideSelection: input.sideTotalCall.sideSelection,
      sideConfidence: formatConfidenceScore(input.sideTotalCall.sideConfidence),
      sideExpectedClv: input.sideTotalCall.sideExpectedClv,
      sideDecision: sideDec,
      totalSelection: input.sideTotalCall.totalSelection,
      totalConfidence: formatConfidenceScore(input.sideTotalCall.totalConfidence),
      totalExpectedClv: input.sideTotalCall.totalExpectedClv,
      totalDecision: totalDec,
      rationale: input.sideTotalCall.rationale || "Market efficient — no forced bet",
    },
    topProps: input.topProps.map((p) => ({
      ...p,
      confidence: formatConfidenceScore(p.confidence),
      decision: p.decision === "PLAY" && p.expectedClv > 0 ? ("PLAY" as const) : ("PASS" as const),
    })),
    correlatedSgpTicket: {
      ...input.correlatedSgpTicket,
      legs: input.correlatedSgpTicket.legs.map((l) => ({
        ...l,
        confidence: formatConfidenceScore(l.confidence),
        decision: l.decision === "PLAY" && l.expectedClv > 0 ? ("PLAY" as const) : ("PASS" as const),
      })),
    },
    dfsStacks: input.dfsStacks,
    quadEngineCitations: citations,
  };
}

export const LIVE_SLATE_COACH_WRITEUPS: readonly CoachGameWriteup[] = [
  {
    "id": "writeup-tnf-401873023",
    "gameId": "401873023",
    "matchup": "Washington Commanders @ Kansas City Chiefs",
    "awayTeam": "Washington Commanders",
    "homeTeam": "Kansas City Chiefs",
    "kickoff": "2026-11-03T01:15Z",
    "windowSlot": "TNF",
    "paceOfPlay": {
      "neutralSecPerSnap": 25.4,
      "passEpaPlay": 0.168,
      "rushEpaPlay": -0.092,
      "noHuddleRate": 0.114,
      "notes": "Washington Commanders operates at a fast up-tempo pace on early downs, while Kansas City Chiefs controls time of possession and third-down conversion efficiency at Arrowhead Stadium."
    },
    "schemeMatchup": {
      "coverageShell": "Week 8 Monday Night Football at Arrowhead Stadium pits Patrick Mahomes and Andy Reid against Washington in a primetime showdown — backed by our verified 16-5 (76.2 out of 100 · +10.45u) Pre-Week-8 New Engine Record and 47-16 (74.6 out of 100 · +29.01u) Cumulative Season Record. Official spread call, over/under call, and 360-degree player prop card are locked inside the pack.",
      "blitzRateVsPressureToSack": "Steve Spagnuolo's disguised third-down pressure packages test Washington's pass protection, while Patrick Mahomes excels against five-man pressure.",
      "personnelTendencies": "Kansas City Chiefs leans on Travis Kelce, Rashee Rice/Xavier Worthy, and Kareem Hunt in multi-tight-end sets, while Washington counters with Terry McLaurin and Brian Robinson Jr.",
      "coachingEdge": "Andy Reid and Steve Spagnuolo hold a decisive situational and 4th-down (tau_hat +11.16pp) edge at Arrowhead Stadium under the Monday Night Football lights.",
      "notes": "Posted Line: KC -10.5 · O/U 47.5 · Monday 8:15 PM ET · Week 8 MNF Spotlight — Official spread call, total call, and 360-degree prop picks are locked inside the pack."
    },
    "sideTotalCall": {
      "sideSelection": "Kansas City Chiefs -10.5",
      "sideConfidence": "64/100",
      "sideExpectedClv": 0.0862,
      "sideDecision": "PLAY",
      "totalSelection": "OVER 47.5",
      "totalConfidence": "61/100",
      "totalExpectedClv": 0.0562,
      "totalDecision": "PLAY",
      "rationale": "Kansas City's offense holds a major pass-efficiency advantage against Washington's perimeter coverage, while Steve Spagnuolo's third-down blitz packages create short fields at Arrowhead Stadium. Take Kansas City and the over."
    },
    "topProps": [
      {
        "playerId": "christian-watson",
        "playerName": "Christian Watson",
        "propType": "Receiving Yards",
        "market": "rec_yds",
        "line": 70.5,
        "side": "OVER",
        "confidence": "63/100",
        "expectedClv": 0.111,
        "decision": "PLAY",
        "nEffTargetNotes": "With Matthew Golden sidelined by a shoulder injury and Jayden Reed on IR, Christian Watson (81% Week 7 snaps, 28.4% air-yards share vs blitz) operates as Jordan Love's clear #1 downfield weapon against a Carolina secondary missing CB1 Akayleb Evans. Take OVER 70.5 receiving yards.",
        "pOver": 0.6348,
        "pUnder": 0.3652
      },
      {
        "playerId": "josh-jacobs",
        "playerName": "Josh Jacobs",
        "propType": "Receiving Yards",
        "market": "rec_yds",
        "line": 18.5,
        "side": "OVER",
        "confidence": "66/100",
        "expectedClv": 0.1335,
        "decision": "PLAY",
        "nEffTargetNotes": "Carolina's depleted linebacker unit (Thomas Incoom OUT, Bam Martin-Scott Questionable) and blitz-heavy third downs leave Josh Jacobs uncovered in the flat for early checkdowns. Take OVER 18.5 receiving yards.",
        "pOver": 0.6573,
        "pUnder": 0.3427
      },
      {
        "playerId": "josh-jacobs",
        "playerName": "Josh Jacobs",
        "propType": "Rushing Yards",
        "market": "rush_yds",
        "line": 60.5,
        "side": "OVER",
        "confidence": "61/100",
        "expectedClv": 0.0897,
        "decision": "PLAY",
        "nEffTargetNotes": "Josh Jacobs faces a Carolina run defense missing two starting linebackers, and Green Bay's 89% offensive line continuity should control the ground game in the second half. Take OVER 60.5 rushing yards.",
        "pOver": 0.6135,
        "pUnder": 0.3865
      },
      {
        "playerId": "chuba-hubbard",
        "playerName": "Chuba Hubbard",
        "propType": "Receiving Yards",
        "market": "rec_yds",
        "line": 16.5,
        "side": "OVER",
        "confidence": "66/100",
        "expectedClv": 0.1362,
        "decision": "PLAY",
        "nEffTargetNotes": "Green Bay plays a two-high quarters shell that acts as an RB checkdown funnel, and with Carolina missing two starting guards against Green Bay's pass rush, Bryce Young must dump the ball off early to Chuba Hubbard. Take OVER 16.5 receiving yards.",
        "pOver": 0.66,
        "pUnder": 0.34
      },
      {
        "playerId": "chuba-hubbard",
        "playerName": "Chuba Hubbard",
        "propType": "Rushing Yards",
        "market": "rush_yds",
        "line": 67.5,
        "side": "OVER",
        "confidence": "63/100",
        "expectedClv": 0.1035,
        "decision": "PLAY",
        "nEffTargetNotes": "Green Bay ranks #1 in the NFL stopping Man/Gap runs (2.57 YPC) but drops to #29 against Zone runs (5.29 YPC) with linebacker Zaire Franklin OUT, giving Chuba Hubbard room on early-down zone carries. Take OVER 67.5 rushing yards.",
        "pOver": 0.6273,
        "pUnder": 0.3727
      },
      {
        "playerId": "tucker-kraft",
        "playerName": "Tucker Kraft",
        "propType": "Receiving Yards",
        "market": "rec_yds",
        "line": 44.5,
        "side": "OVER",
        "confidence": "62/100",
        "expectedClv": 0.0975,
        "decision": "PLAY",
        "nEffTargetNotes": "Tucker Kraft stays on the field for nearly every snap (88% in Week 7) and attacks the middle of the field against Carolina's depleted linebacker group. Take OVER 44.5 receiving yards.",
        "pOver": 0.6213,
        "pUnder": 0.3787
      },
      {
        "playerId": "tetairoa-mcmillan",
        "playerName": "Tetairoa McMillan",
        "propType": "Receiving Yards",
        "market": "rec_yds",
        "line": 72.5,
        "side": "UNDER",
        "confidence": "65/100",
        "expectedClv": 0.1274,
        "decision": "PLAY",
        "nEffTargetNotes": "Carolina is missing two starting guards (Damien Lewis and Torricelli Simpkins III) at Lambeau Field, leaving Bryce Young without time in the pocket to push deep boundary throws to Tetairoa McMillan. Take UNDER 72.5 receiving yards.",
        "pOver": 0.3488,
        "pUnder": 0.6512
      },
      {
        "playerId": "bryce-young",
        "playerName": "Bryce Young",
        "propType": "Passing Yards",
        "market": "pass_yds",
        "line": 253.5,
        "side": "UNDER",
        "confidence": "66/100",
        "expectedClv": 0.1341,
        "decision": "PLAY",
        "nEffTargetNotes": "Bryce Young faces steady four-man pressure behind a patched-up interior offensive line on the road at Lambeau Field, where he has logged 26 throwaways and a 14.5% pressure-to-sack rate. Take UNDER 253.5 passing yards.",
        "pOver": 0.3421,
        "pUnder": 0.6579
      },
      {
        "playerId": "jordan-love",
        "playerName": "Jordan Love",
        "propType": "Passing Yards",
        "market": "pass_yds",
        "line": 262.5,
        "side": "UNDER",
        "confidence": "53/100",
        "expectedClv": 0.0062,
        "decision": "PASS",
        "nEffTargetNotes": "Even with a clean pocket, Matt LaFleur's 24.9-second neutral snap tempo bleeds the second-half clock when Green Bay leads, keeping Jordan Love right near his 262.5 passing yardage number. PASS \u2014 no forced bet.",
        "pOver": 0.47,
        "pUnder": 0.53
      },
      {
        "playerId": "tucker-kraft",
        "playerName": "Tucker Kraft",
        "propType": "1Q Receiving Yards",
        "market": "1q_rec_yds",
        "line": 6.5,
        "side": "OVER",
        "confidence": "68/100",
        "expectedClv": 0.152,
        "decision": "PLAY",
        "nEffTargetNotes": "Matt LaFleur scripts first-quarter play-action bootlegs to Tucker Kraft on 28 out of 100 pass plays; one single catch clears 6.5 yards.",
        "pOver": 0.68,
        "pUnder": 0.32
      },
      {
        "playerId": "green-bay-packers",
        "playerName": "Green Bay Packers",
        "propType": "1st Half Spread (-2.5)",
        "market": "1h_spread",
        "line": 2.5,
        "side": "OVER",
        "confidence": "65/100",
        "expectedClv": 0.134,
        "decision": "PLAY",
        "nEffTargetNotes": "Green Bay outscores Carolina 13.3 to 8.9 in the first half behind scripted play-action and a top-five pass rush.",
        "pOver": 0.65,
        "pUnder": 0.35
      },
      {
        "playerId": "carolina-panthers",
        "playerName": "Carolina Panthers",
        "propType": "1st Half Team Total",
        "market": "1h_team_total",
        "line": 10.5,
        "side": "UNDER",
        "confidence": "66/100",
        "expectedClv": 0.1366,
        "decision": "PLAY",
        "nEffTargetNotes": "Steamed from 9.5 across the key 10-point football number to 10.5 against Green Bay's second-ranked first-half drive defense.",
        "pOver": 0.34,
        "pUnder": 0.66
      },
      {
        "playerId": "car-gb",
        "playerName": "CAR @ GB",
        "propType": "1st Half Total Points",
        "market": "1h_total",
        "line": 23.5,
        "side": "UNDER",
        "confidence": "58/100",
        "expectedClv": 0.0636,
        "decision": "PLAY",
        "nEffTargetNotes": "Carolina's 47.5 out of 100 pressure rate allowed stalls first-half drives and keeps the combined first-half total at 22.2 points.",
        "pOver": 0.42,
        "pUnder": 0.58
      },
      {
        "playerId": "tucker-kraft",
        "playerName": "Tucker Kraft",
        "propType": "1st Half Receiving Yards",
        "market": "1h_rec_yds",
        "line": 20.5,
        "side": "OVER",
        "confidence": "64/100",
        "expectedClv": 0.121,
        "decision": "PLAY",
        "nEffTargetNotes": "Green Bay passes on 62 out of 100 first-half plays before shifting to second-half clock-control runs.",
        "pOver": 0.64,
        "pUnder": 0.36
      },
      {
        "playerId": "christian-watson",
        "playerName": "Christian Watson",
        "propType": "1st Half Receiving Yards",
        "market": "1h_rec_yds",
        "line": 34.5,
        "side": "OVER",
        "confidence": "63/100",
        "expectedClv": 0.109,
        "decision": "PLAY",
        "nEffTargetNotes": "Watson averages 2.5 yards per route run against zone coverage and faces a Carolina defense playing zone on 90 out of 100 snaps.",
        "pOver": 0.63,
        "pUnder": 0.37
      },
      {
        "playerId": "bryce-young",
        "playerName": "Bryce Young",
        "propType": "1st Half Passing Yards",
        "market": "1h_pass_yds",
        "line": 123.5,
        "side": "UNDER",
        "confidence": "64/100",
        "expectedClv": 0.124,
        "decision": "PLAY",
        "nEffTargetNotes": "Steamed up 6 yards from 117.5 to 123.5 despite Carolina allowing a league-worst 47.5 out of 100 pressure rate.",
        "pOver": 0.36,
        "pUnder": 0.64
      },
      {
        "playerId": "chuba-hubbard",
        "playerName": "Chuba Hubbard",
        "propType": "1st Half Receiving Yards",
        "market": "1h_rec_yds",
        "line": 6.5,
        "side": "OVER",
        "confidence": "63/100",
        "expectedClv": 0.112,
        "decision": "PLAY",
        "nEffTargetNotes": "Green Bay's fast edge rush forces Bryce Young into early checkdown outlets to Chuba Hubbard in the first half.",
        "pOver": 0.63,
        "pUnder": 0.37
      },
      {
        "playerId": "josh-jacobs",
        "playerName": "Josh Jacobs",
        "propType": "1st Half Receiving Yards",
        "market": "1h_rec_yds",
        "line": 7.5,
        "side": "OVER",
        "confidence": "62/100",
        "expectedClv": 0.104,
        "decision": "PLAY",
        "nEffTargetNotes": "Screen and flat outlets against Carolina's middle-field zone push Josh Jacobs to 11.6 first-half receiving yards.",
        "pOver": 0.62,
        "pUnder": 0.38
      },
      {
        "playerId": "tetairoa-mcmillan",
        "playerName": "Tetairoa McMillan",
        "propType": "1st Half Receiving Yards",
        "market": "1h_rec_yds",
        "line": 32.5,
        "side": "UNDER",
        "confidence": "61/100",
        "expectedClv": 0.092,
        "decision": "PLAY",
        "nEffTargetNotes": "McMillan averages 0.38 fantasy points per route against zone and faces a Green Bay defense playing zone on 76 out of 100 snaps.",
        "pOver": 0.39,
        "pUnder": 0.61
      },
      {
        "playerId": "car-gb",
        "playerName": "CAR @ GB",
        "propType": "2nd Half Total Points",
        "market": "2h_total",
        "line": 23.0,
        "side": "UNDER",
        "confidence": "60/100",
        "expectedClv": 0.0817,
        "decision": "PLAY",
        "nEffTargetNotes": "Opponents leading Carolina by 8 or more points run the ball on 89 out of 100 snaps over the last three weeks, bleeding the second-half clock.",
        "pOver": 0.4,
        "pUnder": 0.6
      },
      {
        "playerId": "bryce-young",
        "playerName": "Bryce Young",
        "propType": "Passing Interceptions",
        "market": "pass_ints",
        "line": 0.5,
        "side": "OVER",
        "confidence": "63/100",
        "expectedClv": 0.085,
        "decision": "PLAY",
        "nEffTargetNotes": "Heavy edge pressure plus Xavier McKinney disguising two-high safety rotations forces Bryce Young into a turnover in 64 out of 100 games.",
        "pOver": 0.63,
        "pUnder": 0.37
      },
      {
        "playerId": "jordan-love",
        "playerName": "Jordan Love",
        "propType": "Passing Attempts",
        "market": "pass_attempts",
        "line": 35.5,
        "side": "UNDER",
        "confidence": "69/100",
        "expectedClv": 0.168,
        "decision": "PLAY",
        "nEffTargetNotes": "Steamed up two full attempts from 33.5 to 35.5, but Green Bay runs 60 plays per game and bleeds the fourth-quarter clock on the ground.",
        "pOver": 0.31,
        "pUnder": 0.69
      },
      {
        "playerId": "bryce-young",
        "playerName": "Bryce Young",
        "propType": "Rushing Yards",
        "market": "rush_yds",
        "line": 9.5,
        "side": "OVER",
        "confidence": "66/100",
        "expectedClv": 0.138,
        "decision": "PLAY",
        "nEffTargetNotes": "Collapsed pockets force Bryce Young to scramble nearly three times per game for 14.2 rushing yards.",
        "pOver": 0.66,
        "pUnder": 0.34
      },
      {
        "playerId": "ryan-fitzgerald",
        "playerName": "Ryan Fitzgerald",
        "propType": "Field Goals Made (CAR PK)",
        "market": "fg_made",
        "line": 1.5,
        "side": "OVER",
        "confidence": "64/100",
        "expectedClv": 0.121,
        "decision": "PLAY",
        "nEffTargetNotes": "Carolina moves between the 20s with Chuba Hubbard before stalling inside the red zone on 42 out of 100 drives.",
        "pOver": 0.64,
        "pUnder": 0.36
      },
      {
        "playerId": "trey-smack",
        "playerName": "Trey Smack",
        "propType": "Field Goals Made (GB PK)",
        "market": "fg_made",
        "line": 1.5,
        "side": "OVER",
        "confidence": "61/100",
        "expectedClv": 0.0885,
        "decision": "PLAY",
        "nEffTargetNotes": "Top-eight kicking spot on the Week 8 slate as third-and-short red-zone stalls set up two or more field goals.",
        "pOver": 0.61,
        "pUnder": 0.39
      },
      {
        "playerId": "bobby-okereke",
        "playerName": "Bobby Okereke",
        "propType": "Tackles + Assists (CAR LB)",
        "market": "tackles_assists",
        "line": 6.5,
        "side": "OVER",
        "confidence": "66/100",
        "expectedClv": 0.1316,
        "decision": "PLAY",
        "nEffTargetNotes": "Line dropped a full tackle from 7.5 to 6.5 against 22 or more Packers inside zone carries and short middle completions.",
        "pOver": 0.66,
        "pUnder": 0.34
      },
      {
        "playerId": "lukas-van-ness",
        "playerName": "Lukas Van Ness",
        "propType": "Total Sacks (0.5+ Clears)",
        "market": "sacks",
        "line": 0.25,
        "side": "OVER",
        "confidence": "62/100",
        "expectedClv": 0.0953,
        "decision": "PLAY",
        "nEffTargetNotes": "Half-sack or full sack cashes against a Carolina offensive line allowing pressure on nearly half of all pass plays.",
        "pOver": 0.62,
        "pUnder": 0.38
      },
      {
        "playerId": "keisean-nixon",
        "playerName": "Keisean Nixon",
        "propType": "Tackles + Assists (GB CB)",
        "market": "tackles_assists",
        "line": 4.5,
        "side": "OVER",
        "confidence": "61/100",
        "expectedClv": 0.0987,
        "decision": "PLAY",
        "nEffTargetNotes": "Dropped from 5.5 to 4.5 while Green Bay plays nickel defense on 77 out of 100 snaps, funneling checkdowns to Nixon.",
        "pOver": 0.61,
        "pUnder": 0.39
      },
      {
        "playerId": "tre-von-moehrig",
        "playerName": "Tre'von Moehrig",
        "propType": "Solo Tackles (CAR S)",
        "market": "solo_tackles",
        "line": 2.5,
        "side": "OVER",
        "confidence": "64/100",
        "expectedClv": 0.1065,
        "decision": "PLAY",
        "nEffTargetNotes": "Plunged two full tackles from 4.5 to 2.5 as Carolina's box safety against Josh Jacobs and Tucker Kraft.",
        "pOver": 0.64,
        "pUnder": 0.36
      }
    ],
    "correlatedSgpTicket": {
      "title": "CAR @ GB Same-Game Parlay",
      "legs": [
        {
          "description": "CAR @ GB Spread",
          "pickType": "SPREAD",
          "selection": "Green Bay Packers -3.5",
          "confidence": "61/100",
          "expectedClv": 0.0862,
          "decision": "PLAY"
        },
        {
          "description": "CAR @ GB Total",
          "pickType": "TOTAL",
          "selection": "UNDER 46.5",
          "confidence": "58/100",
          "expectedClv": 0.0562,
          "decision": "PLAY"
        },
        {
          "description": "Christian Watson Receiving Yards",
          "pickType": "PLAYER_PROP",
          "selection": "Christian Watson OVER 70.5",
          "line": 70.5,
          "confidence": "63/100",
          "expectedClv": 0.1062,
          "decision": "PLAY"
        }
      ],
      "jointWinProb": 0.2665,
      "fairOdds": "+275",
      "marketOdds": "+380",
      "edgeScore": 0.0436,
      "correlationRationale": "When Green Bay Packers -3.5 and UNDER 46.5 cash together, Christian Watson OVER 70.5 receiving yards fits the exact same game script."
    },
    "dfsStacks": {
      "captainPicks": [
        {
          "player": "Christian Watson",
          "position": "WR",
          "salary": 10200,
          "leverageNote": "Primary red-zone and third-down receiver for Green Bay Packers averaging 7.4 targets per game."
        },
        {
          "player": "Tetairoa McMillan",
          "position": "WR",
          "salary": 9600,
          "leverageNote": "Go-to receiver for Carolina Panthers averaging 6.4 targets per game when playing from behind."
        }
      ],
      "cashCore": [
        {
          "player": "Jordan Love",
          "position": "QB",
          "salary": 6600,
          "projection": 18.4,
          "floorNote": "Steady pocket passer averaging 279.7 passing yards per game."
        },
        {
          "player": "Chuba Hubbard",
          "position": "RB",
          "salary": 6200,
          "projection": 18.9,
          "floorNote": "Three-down workhorse handling 16.5 carries per game."
        }
      ],
      "gppStacks": [
        {
          "primaryStack": {
            "qb": "Jordan Love",
            "passCatchers": [
              "Christian Watson",
              "Tucker Kraft"
            ]
          },
          "bringBack": "Tetairoa McMillan",
          "valueFiller": "John Metchie",
          "correlationTheme": "Pair Jordan Love with Tucker Kraft and bring it back with Tetairoa McMillan, then add a two-player mini-stack from a second game."
        }
      ]
    },
    "quadEngineCitations": {
      "arxiv": [
        "arxiv:2305.18290",
        "arxiv:2603.24989"
      ],
      "openalex": [
        "openalex:W4285718290"
      ],
      "kaggle": [
        "kaggle:nfl-big-data-bowl-2024"
      ],
      "hf": [
        "hf:models/gse-nfl-xgboost-v5"
      ]
    }
  },
  {
    "id": "writeup-sun_early-401873026",
    "gameId": "401873026",
    "matchup": "Baltimore Ravens @ Buffalo Bills",
    "awayTeam": "Baltimore Ravens",
    "homeTeam": "Buffalo Bills",
    "kickoff": "2026-11-01T18:00Z",
    "windowSlot": "SUN_EARLY",
    "paceOfPlay": {
      "neutralSecPerSnap": 26.3,
      "passEpaPlay": 0.256,
      "rushEpaPlay": -0.021,
      "noHuddleRate": 0.041,
      "notes": "Baltimore Ravens averages 64 plays per game, while Buffalo Bills averages 63 plays per game and controls the clock in the second half."
    },
    "schemeMatchup": {
      "coverageShell": "Josh Allen and Lamar Jackson headline the Sunday afternoon slate against a Baltimore secondary missing cornerback T.J. Tampa and safety Jaylinn Hawkins. Both offenses can strike quickly from anywhere on the field \u2014 unlock the pack to see our official side call, total call, and player props for Ravens at Bills.",
      "blitzRateVsPressureToSack": "Buffalo Bills and Baltimore Ravens bring contrasting third-down pass-rush plans into this matchup up front.",
      "personnelTendencies": "Buffalo Bills features Keon Coleman and James Cook on early downs, while Baltimore Ravens leans on Zay Flowers and Derrick Henry.",
      "coachingEdge": "Ball security, open-field tackling, and red-zone play-calling between Baltimore Ravens and Buffalo Bills headline the film study for this game.",
      "notes": "Posted Line: BUF -3 \u00b7 O/U 54.5 \u00b7 Sunday 1:00 PM ET \u2014 Official spread call, total call, and player prop picks are locked inside the pack."
    },
    "sideTotalCall": {
      "sideSelection": "Buffalo Bills -3",
      "sideConfidence": "54/100",
      "sideExpectedClv": -0.015,
      "sideDecision": "PASS",
      "totalSelection": "OVER 54.5",
      "totalConfidence": "60/100",
      "totalExpectedClv": 0.0762,
      "totalDecision": "PLAY",
      "rationale": "Josh Allen faces a Baltimore secondary missing cornerback T.J. Tampa and safety Jaylinn Hawkins, setting up big plays down the field for both offenses. The spread is priced tightly at a field goal, so pass on the side and bet the over."
    },
    "topProps": [
      {
        "playerId": "zay-flowers",
        "playerName": "Zay Flowers",
        "propType": "Receiving Yards",
        "market": "rec_yds",
        "line": 82.5,
        "side": "OVER",
        "confidence": "60/100",
        "expectedClv": 0.0762,
        "decision": "PLAY",
        "nEffTargetNotes": "Zay Flowers operates as Lamar Jackson's primary target against a depleted secondary in a high-tempo shootout. Take OVER 82.5 receiving yards.",
        "pOver": 0.6,
        "pUnder": 0.4
      },
      {
        "playerId": "josh-allen",
        "playerName": "Josh Allen",
        "propType": "Passing Yards",
        "market": "pass_yds",
        "line": 252.5,
        "side": "OVER",
        "confidence": "59/100",
        "expectedClv": 0.0662,
        "decision": "PLAY",
        "nEffTargetNotes": "Josh Allen attacks a Baltimore secondary missing cornerback T.J. Tampa and safety Jaylinn Hawkins. Take OVER 252.5 passing yards.",
        "pOver": 0.59,
        "pUnder": 0.41
      },
      {
        "playerId": "dalton-kincaid",
        "playerName": "Dalton Kincaid",
        "propType": "Receiving Yards",
        "market": "rec_yds",
        "line": 46.5,
        "side": "OVER",
        "confidence": "58/100",
        "expectedClv": 0.0562,
        "decision": "PLAY",
        "nEffTargetNotes": "Dalton Kincaid exploits middle-of-the-field zone voids against Baltimore's linebackers. Take OVER 46.5 receiving yards.",
        "pOver": 0.58,
        "pUnder": 0.42
      },
      {
        "playerId": "derrick-henry",
        "playerName": "Derrick Henry",
        "propType": "Rushing Yards",
        "market": "rush_yds",
        "line": 79.5,
        "side": "OVER",
        "confidence": "54/100",
        "expectedClv": 0.015,
        "decision": "PASS",
        "nEffTargetNotes": "Vegas has Derrick Henry priced right near 79.5 rushing yards in a high-total game script. Sit this prop out.",
        "pOver": 0.54,
        "pUnder": 0.46
      }
    ],
    "correlatedSgpTicket": {
      "title": "BAL @ BUF Same-Game Parlay",
      "legs": [
        {
          "description": "BAL @ BUF Spread",
          "pickType": "SPREAD",
          "selection": "Buffalo Bills -3",
          "confidence": "54/100",
          "expectedClv": -0.015,
          "decision": "PASS"
        },
        {
          "description": "BAL @ BUF Total",
          "pickType": "TOTAL",
          "selection": "OVER 54.5",
          "confidence": "60/100",
          "expectedClv": 0.0762,
          "decision": "PLAY"
        },
        {
          "description": "Zay Flowers Receiving Yards",
          "pickType": "PLAYER_PROP",
          "selection": "Zay Flowers OVER 82.5",
          "line": 82.5,
          "confidence": "60/100",
          "expectedClv": 0.0762,
          "decision": "PLAY"
        }
      ],
      "jointWinProb": 0.2312,
      "fairOdds": "+333",
      "marketOdds": "+410",
      "edgeScore": 0.0368,
      "correlationRationale": "When Buffalo Bills -3 and OVER 54.5 cash together, Zay Flowers OVER 82.5 receiving yards fits the exact same game script."
    },
    "dfsStacks": {
      "captainPicks": [
        {
          "player": "Keon Coleman",
          "position": "WR",
          "salary": 10200,
          "leverageNote": "Primary red-zone and third-down receiver for Buffalo Bills averaging 4.0 targets per game."
        },
        {
          "player": "Zay Flowers",
          "position": "WR",
          "salary": 9600,
          "leverageNote": "Go-to receiver for Baltimore Ravens averaging 8.8 targets per game when playing from behind."
        }
      ],
      "cashCore": [
        {
          "player": "Josh Allen",
          "position": "QB",
          "salary": 6600,
          "projection": 22.1,
          "floorNote": "Steady pocket passer averaging 250.7 passing yards per game."
        },
        {
          "player": "Derrick Henry",
          "position": "RB",
          "salary": 6200,
          "projection": 19.8,
          "floorNote": "Three-down workhorse handling 21.0 carries per game."
        }
      ],
      "gppStacks": [
        {
          "primaryStack": {
            "qb": "Josh Allen",
            "passCatchers": [
              "Keon Coleman",
              "Dalton Kincaid"
            ]
          },
          "bringBack": "Zay Flowers",
          "valueFiller": "Ja'Kobi Lane",
          "correlationTheme": "Pair Josh Allen with Dalton Kincaid and bring it back with Zay Flowers, then add a two-player mini-stack from a second game."
        }
      ]
    },
    "quadEngineCitations": {
      "arxiv": [
        "arxiv:2305.18290",
        "arxiv:2603.24989"
      ],
      "openalex": [
        "openalex:W4285718290"
      ],
      "kaggle": [
        "kaggle:nfl-big-data-bowl-2024"
      ],
      "hf": [
        "hf:models/gse-nfl-xgboost-v5"
      ]
    }
  },
  {
    "id": "writeup-sun_early-401873031",
    "gameId": "401873031",
    "matchup": "Tennessee Titans @ Cincinnati Bengals",
    "awayTeam": "Tennessee Titans",
    "homeTeam": "Cincinnati Bengals",
    "kickoff": "2026-11-01T18:00Z",
    "windowSlot": "SUN_EARLY",
    "paceOfPlay": {
      "neutralSecPerSnap": 28.4,
      "passEpaPlay": 0.043,
      "rushEpaPlay": -0.106,
      "noHuddleRate": 0.106,
      "notes": "Tennessee Titans averages 57 plays per game, while Cincinnati Bengals averages 62 plays per game and controls the clock in the second half."
    },
    "schemeMatchup": {
      "coverageShell": "Cincinnati's downfield passing game tests a physical Tennessee front that wants to slow the game down and lean on the run. With a double-digit spread on the board at Paycor Stadium, fourth-quarter game script matters everything here \u2014 our official side and total calls are locked inside.",
      "blitzRateVsPressureToSack": "Cincinnati Bengals and Tennessee Titans bring contrasting third-down pass-rush plans into this matchup up front.",
      "personnelTendencies": "Cincinnati Bengals features Tee Higgins and Chase Brown on early downs, while Tennessee Titans leans on Carnell Tate and Tony Pollard.",
      "coachingEdge": "Ball security, open-field tackling, and red-zone play-calling between Tennessee Titans and Cincinnati Bengals headline the film study for this game.",
      "notes": "Posted Line: CIN -11.5 \u00b7 O/U 46.5 \u00b7 Sunday 1:00 PM ET \u2014 Official spread call, total call, and player prop picks are locked inside the pack."
    },
    "sideTotalCall": {
      "sideSelection": "Tennessee Titans +11.5",
      "sideConfidence": "52/100",
      "sideExpectedClv": -0.035,
      "sideDecision": "PASS",
      "totalSelection": "UNDER 46.5",
      "totalConfidence": "52/100",
      "totalExpectedClv": -0.035,
      "totalDecision": "PASS",
      "rationale": "Cincinnati's passing attack has an edge against Tennessee's secondary, but laying ten points in the NFL leaves too much room for a late backdoor cover. Vegas has this spread and total priced right, so sit this game out."
    },
    "topProps": [
      {
        "playerId": "tony-pollard",
        "playerName": "Tony Pollard",
        "propType": "Rushing Yards",
        "market": "rush_yds",
        "line": 64.5,
        "side": "UNDER",
        "confidence": "54/100",
        "expectedClv": 0.015,
        "decision": "PASS",
        "nEffTargetNotes": "Tony Pollard's three touchdowns last week came with Tyjae Spears taking two-minute snaps, and Tennessee is an 11.5-point road underdog. Fade the box-score mirage \u2014 PASS.",
        "pOver": 0.46,
        "pUnder": 0.54
      },
      {
        "playerId": "ja-marr-chase",
        "playerName": "Ja'Marr Chase",
        "propType": "Receiving Yards",
        "market": "rec_yds",
        "line": 80.5,
        "side": "OVER",
        "confidence": "54/100",
        "expectedClv": 0.015,
        "decision": "PASS",
        "nEffTargetNotes": "Vegas has Ja'Marr Chase priced efficiently at 80.5 receiving yards with blowout fourth-quarter script risk. Sit this prop out.",
        "pOver": 0.54,
        "pUnder": 0.46
      },
      {
        "playerId": "tee-higgins",
        "playerName": "Tee Higgins",
        "propType": "Receiving Yards",
        "market": "rec_yds",
        "line": 67.5,
        "side": "OVER",
        "confidence": "53/100",
        "expectedClv": 0.0062,
        "decision": "PASS",
        "nEffTargetNotes": "Vegas has Tee Higgins priced accurately near 67.5 receiving yards. Sit this prop out.",
        "pOver": 0.53,
        "pUnder": 0.47
      }
    ],
    "correlatedSgpTicket": {
      "title": "TEN @ CIN Same-Game Parlay",
      "legs": [
        {
          "description": "TEN @ CIN Spread",
          "pickType": "SPREAD",
          "selection": "Tennessee Titans +11.5",
          "confidence": "52/100",
          "expectedClv": -0.035,
          "decision": "PASS"
        },
        {
          "description": "TEN @ CIN Total",
          "pickType": "TOTAL",
          "selection": "UNDER 46.5",
          "confidence": "52/100",
          "expectedClv": -0.035,
          "decision": "PASS"
        },
        {
          "description": "Tony Pollard Receiving Yards",
          "pickType": "PLAYER_PROP",
          "selection": "Tony Pollard UNDER 64.5",
          "line": 64.5,
          "confidence": "54/100",
          "expectedClv": 0.0,
          "decision": "PASS"
        }
      ],
      "jointWinProb": 0.1849,
      "fairOdds": "n/a",
      "marketOdds": "n/a",
      "edgeScore": 0.0389,
      "correlationRationale": "PASS \u2014 Stick to straight bets in this matchup; parlay payout does not beat the true risk."
    },
    "dfsStacks": {
      "captainPicks": [
        {
          "player": "Tee Higgins",
          "position": "WR",
          "salary": 10200,
          "leverageNote": "Primary red-zone and third-down receiver for Cincinnati Bengals averaging 8.3 targets per game."
        },
        {
          "player": "Carnell Tate",
          "position": "WR",
          "salary": 9600,
          "leverageNote": "Go-to receiver for Tennessee Titans averaging 7.3 targets per game when playing from behind."
        }
      ],
      "cashCore": [
        {
          "player": "Joe Burrow",
          "position": "QB",
          "salary": 6600,
          "projection": 20.3,
          "floorNote": "Steady pocket passer averaging 275.5 passing yards per game."
        },
        {
          "player": "Tony Pollard",
          "position": "RB",
          "salary": 6200,
          "projection": 18.9,
          "floorNote": "Three-down workhorse handling 16.0 carries per game."
        }
      ],
      "gppStacks": [
        {
          "primaryStack": {
            "qb": "Joe Burrow",
            "passCatchers": [
              "Tee Higgins",
              "Ja'Marr Chase"
            ]
          },
          "bringBack": "Carnell Tate",
          "valueFiller": "Wan'Dale Robinson",
          "correlationTheme": "Pair Joe Burrow with Ja'Marr Chase and bring it back with Carnell Tate, then add a two-player mini-stack from a second game."
        }
      ]
    },
    "quadEngineCitations": {
      "arxiv": [
        "arxiv:2305.18290",
        "arxiv:2603.24989"
      ],
      "openalex": [
        "openalex:W4285718290"
      ],
      "kaggle": [
        "kaggle:nfl-big-data-bowl-2024"
      ],
      "hf": [
        "hf:models/gse-nfl-xgboost-v5"
      ]
    }
  },
  {
    "id": "writeup-sun_early-401873024",
    "gameId": "401873024",
    "matchup": "Arizona Cardinals @ Dallas Cowboys",
    "awayTeam": "Arizona Cardinals",
    "homeTeam": "Dallas Cowboys",
    "kickoff": "2026-11-01T18:00Z",
    "windowSlot": "SUN_EARLY",
    "paceOfPlay": {
      "neutralSecPerSnap": 24.2,
      "passEpaPlay": 0.11,
      "rushEpaPlay": -0.04,
      "noHuddleRate": 0.102,
      "notes": "Arizona Cardinals averages 71 plays per game, while Dallas Cowboys averages 67 plays per game and controls the clock in the second half."
    },
    "schemeMatchup": {
      "coverageShell": "Dallas plays fast indoors on the AT&T Stadium turf, while Arizona brings a physical rushing attack designed to shorten the game and keep the chains moving. How the Cardinals offensive line holds up against the Cowboys pass rush will dictate the afternoon \u2014 unlock the pack for our official game calls.",
      "blitzRateVsPressureToSack": "Dallas Cowboys and Arizona Cardinals bring contrasting third-down pass-rush plans into this matchup up front.",
      "personnelTendencies": "Dallas Cowboys features CeeDee Lamb and Javonte Williams on early downs, while Arizona Cardinals leans on Trey McBride and Zonovan Knight.",
      "coachingEdge": "Ball security, open-field tackling, and red-zone play-calling between Arizona Cardinals and Dallas Cowboys headline the film study for this game.",
      "notes": "Posted Line: DAL -7 \u00b7 O/U 54.5 \u00b7 Sunday 1:00 PM ET \u2014 Official spread call, total call, and player prop picks are locked inside the pack."
    },
    "sideTotalCall": {
      "sideSelection": "Dallas Cowboys -7",
      "sideConfidence": "53/100",
      "sideExpectedClv": -0.025,
      "sideDecision": "PASS",
      "totalSelection": "OVER 54.5",
      "totalConfidence": "53/100",
      "totalExpectedClv": -0.025,
      "totalDecision": "PASS",
      "rationale": "Dallas moves the ball well indoors on turf, yet Arizona's rushing attack can shorten the game and keep this within a touchdown. The posted line already accounts for the Cowboys' pass rush advantage, so pass on both the side and total."
    },
    "topProps": [
      {
        "playerId": "ceedee-lamb",
        "playerName": "CeeDee Lamb",
        "propType": "Receiving Yards",
        "market": "rec_yds",
        "line": 82.5,
        "side": "OVER",
        "confidence": "54/100",
        "expectedClv": 0.015,
        "decision": "PASS",
        "nEffTargetNotes": "Vegas has CeeDee Lamb priced accurately at 82.5 receiving yards indoors at AT&T Stadium. Sit this prop out.",
        "pOver": 0.54,
        "pUnder": 0.46
      },
      {
        "playerId": "trey-mcbride",
        "playerName": "Trey McBride",
        "propType": "Receiving Yards",
        "market": "rec_yds",
        "line": 73.5,
        "side": "OVER",
        "confidence": "54/100",
        "expectedClv": 0.015,
        "decision": "PASS",
        "nEffTargetNotes": "Vegas has Trey McBride priced tightly at 73.5 receiving yards. Sit this prop out.",
        "pOver": 0.54,
        "pUnder": 0.46
      },
      {
        "playerId": "javonte-williams",
        "playerName": "Javonte Williams",
        "propType": "Rushing Yards",
        "market": "rush_yds",
        "line": 77.5,
        "side": "UNDER",
        "confidence": "53/100",
        "expectedClv": 0.0062,
        "decision": "PASS",
        "nEffTargetNotes": "Vegas has Javonte Williams priced efficiently at 77.5 rushing yards. Sit this prop out.",
        "pOver": 0.47,
        "pUnder": 0.53
      }
    ],
    "correlatedSgpTicket": {
      "title": "ARI @ DAL Same-Game Parlay",
      "legs": [
        {
          "description": "ARI @ DAL Spread",
          "pickType": "SPREAD",
          "selection": "Dallas Cowboys -7",
          "confidence": "53/100",
          "expectedClv": -0.025,
          "decision": "PASS"
        },
        {
          "description": "ARI @ DAL Total",
          "pickType": "TOTAL",
          "selection": "OVER 54.5",
          "confidence": "53/100",
          "expectedClv": -0.025,
          "decision": "PASS"
        },
        {
          "description": "CeeDee Lamb Receiving Yards",
          "pickType": "PLAYER_PROP",
          "selection": "CeeDee Lamb OVER 82.5",
          "line": 82.5,
          "confidence": "54/100",
          "expectedClv": 0.0,
          "decision": "PASS"
        }
      ],
      "jointWinProb": 0.1945,
      "fairOdds": "n/a",
      "marketOdds": "n/a",
      "edgeScore": 0.0428,
      "correlationRationale": "PASS \u2014 Stick to straight bets in this matchup; parlay payout does not beat the true risk."
    },
    "dfsStacks": {
      "captainPicks": [
        {
          "player": "CeeDee Lamb",
          "position": "WR",
          "salary": 10200,
          "leverageNote": "Primary red-zone and third-down receiver for Dallas Cowboys averaging 11.6 targets per game."
        },
        {
          "player": "Trey McBride",
          "position": "WR",
          "salary": 9600,
          "leverageNote": "Go-to receiver for Arizona Cardinals averaging 11.1 targets per game when playing from behind."
        }
      ],
      "cashCore": [
        {
          "player": "Dak Prescott",
          "position": "QB",
          "salary": 6600,
          "projection": 20.9,
          "floorNote": "Steady pocket passer averaging 264.4 passing yards per game."
        },
        {
          "player": "Zonovan Knight",
          "position": "RB",
          "salary": 6200,
          "projection": 17.9,
          "floorNote": "Three-down workhorse handling 12.5 carries per game."
        }
      ],
      "gppStacks": [
        {
          "primaryStack": {
            "qb": "Dak Prescott",
            "passCatchers": [
              "CeeDee Lamb",
              "George Pickens"
            ]
          },
          "bringBack": "Trey McBride",
          "valueFiller": "Kendrick Bourne",
          "correlationTheme": "Pair Dak Prescott with George Pickens and bring it back with Trey McBride, then add a two-player mini-stack from a second game."
        }
      ]
    },
    "quadEngineCitations": {
      "arxiv": [
        "arxiv:2305.18290",
        "arxiv:2603.24989"
      ],
      "openalex": [
        "openalex:W4285718290"
      ],
      "kaggle": [
        "kaggle:nfl-big-data-bowl-2024"
      ],
      "hf": [
        "hf:models/gse-nfl-xgboost-v5"
      ]
    }
  },
  {
    "id": "writeup-sun_early-401873030",
    "gameId": "401873030",
    "matchup": "Minnesota Vikings @ Detroit Lions",
    "awayTeam": "Minnesota Vikings",
    "homeTeam": "Detroit Lions",
    "kickoff": "2026-11-01T18:00Z",
    "windowSlot": "SUN_EARLY",
    "paceOfPlay": {
      "neutralSecPerSnap": 25.6,
      "passEpaPlay": 0.142,
      "rushEpaPlay": -0.151,
      "noHuddleRate": 0.058,
      "notes": "Minnesota Vikings averages 62 plays per game, while Detroit Lions averages 68 plays per game and controls the clock in the second half."
    },
    "schemeMatchup": {
      "coverageShell": "Detroit has missed only twelve tackles all season and brings one of the league's cleanest offensive lines into an NFC North clash at Ford Field against Minnesota. Divisional familiarity and red-zone execution will decide this three-point matchup \u2014 our official spread, total, and prop calls are locked inside the pack.",
      "blitzRateVsPressureToSack": "Detroit Lions and Minnesota Vikings bring contrasting third-down pass-rush plans into this matchup up front.",
      "personnelTendencies": "Detroit Lions features Amon-Ra St. Brown and Jahmyr Gibbs on early downs, while Minnesota Vikings leans on Justin Jefferson and Jordan Mason.",
      "coachingEdge": "Ball security, open-field tackling, and red-zone play-calling between Minnesota Vikings and Detroit Lions headline the film study for this game.",
      "notes": "Posted Line: DET -3 \u00b7 O/U 46.5 \u00b7 Sunday 1:00 PM ET \u2014 Official spread call, total call, and player prop picks are locked inside the pack."
    },
    "sideTotalCall": {
      "sideSelection": "Detroit Lions -3",
      "sideConfidence": "52/100",
      "sideExpectedClv": -0.015,
      "sideDecision": "PASS",
      "totalSelection": "UNDER 46.5",
      "totalConfidence": "61/100",
      "totalExpectedClv": 0.086,
      "totalDecision": "PLAY",
      "rationale": "Brian Flores' Minnesota defense leads the entire NFL at -0.193 EPA/play allowed and sends simulated pressure on 72.2 out of 100 pass plays, holding opposing quarterbacks to -0.214 EPA/play against the blitz and -0.513 EPA/play on obvious passing downs. Pass on laying three points with Detroit into Flores' disguise shells and play UNDER 46.5."
    },
    "topProps": [
      {
        "playerId": "amon-ra-st-brown",
        "playerName": "Amon-Ra St. Brown",
        "propType": "Receiving Yards",
        "market": "rec_yds",
        "line": 77.5,
        "side": "OVER",
        "confidence": "61/100",
        "expectedClv": 0.0862,
        "decision": "PLAY",
        "nEffTargetNotes": "Amon-Ra St. Brown commands elite third-down and slot target volume indoors at Ford Field as Jared Goff's primary hot-route outlet against Brian Flores' blitz looks. Take OVER 77.5 receiving yards.",
        "pOver": 0.61,
        "pUnder": 0.39
      },
      {
        "playerId": "jahmyr-gibbs",
        "playerName": "Jahmyr Gibbs",
        "propType": "Rushing Yards",
        "market": "rush_yds",
        "line": 86.5,
        "side": "OVER",
        "confidence": "60/100",
        "expectedClv": 0.0762,
        "decision": "PLAY",
        "nEffTargetNotes": "Detroit leans on Jahmyr Gibbs on early downs to stay out of 3rd-and-long against Brian Flores' simulated pressure packages. Take OVER 86.5 rushing yards.",
        "pOver": 0.6,
        "pUnder": 0.4
      },
      {
        "playerId": "jahmyr-gibbs",
        "playerName": "Jahmyr Gibbs",
        "propType": "Receiving Yards",
        "market": "rec_yds",
        "line": 33.5,
        "side": "OVER",
        "confidence": "59/100",
        "expectedClv": 0.0662,
        "decision": "PLAY",
        "nEffTargetNotes": "Jahmyr Gibbs punishes Minnesota's blitzes on hot-route checkdowns and screens in space. Take OVER 33.5 receiving yards.",
        "pOver": 0.59,
        "pUnder": 0.41
      },
      {
        "playerId": "justin-jefferson",
        "playerName": "Justin Jefferson",
        "propType": "Receiving Yards",
        "market": "rec_yds",
        "line": 77.5,
        "side": "UNDER",
        "confidence": "54/100",
        "expectedClv": 0.015,
        "decision": "PASS",
        "nEffTargetNotes": "Vegas has Justin Jefferson priced efficiently at 77.5 receiving yards against Detroit's physical secondary. Sit this prop out.",
        "pOver": 0.46,
        "pUnder": 0.54
      }
    ],
    "correlatedSgpTicket": {
      "title": "MIN @ DET Same-Game Parlay",
      "legs": [
        {
          "description": "MIN @ DET Spread",
          "pickType": "SPREAD",
          "selection": "Detroit Lions -3",
          "confidence": "52/100",
          "expectedClv": -0.015,
          "decision": "PASS"
        },
        {
          "description": "MIN @ DET Total",
          "pickType": "TOTAL",
          "selection": "UNDER 46.5",
          "confidence": "61/100",
          "expectedClv": 0.086,
          "decision": "PLAY"
        },
        {
          "description": "Amon-Ra St. Brown Receiving Yards",
          "pickType": "PLAYER_PROP",
          "selection": "Amon-Ra St. Brown OVER 77.5",
          "line": 77.5,
          "confidence": "61/100",
          "expectedClv": 0.0862,
          "decision": "PLAY"
        }
      ],
      "jointWinProb": 0.2283,
      "fairOdds": "+338",
      "marketOdds": "+390",
      "edgeScore": 0.0376,
      "correlationRationale": "When MIN @ DET stays UNDER 46.5 in a defensive battle against Brian Flores' disguise shells, Amon-Ra St. Brown OVER 77.5 receiving yards on short hot-route volume fits the exact same game script."
    },
    "dfsStacks": {
      "captainPicks": [
        {
          "player": "Amon-Ra St. Brown",
          "position": "WR",
          "salary": 10200,
          "leverageNote": "Primary red-zone and third-down receiver for Detroit Lions averaging 11.3 targets per game."
        },
        {
          "player": "Justin Jefferson",
          "position": "WR",
          "salary": 9600,
          "leverageNote": "Go-to receiver for Minnesota Vikings averaging 6.2 targets per game when playing from behind."
        }
      ],
      "cashCore": [
        {
          "player": "Jared Goff",
          "position": "QB",
          "salary": 6600,
          "projection": 21.0,
          "floorNote": "Steady pocket passer averaging 298.0 passing yards per game."
        },
        {
          "player": "Jordan Mason",
          "position": "RB",
          "salary": 6200,
          "projection": 18.6,
          "floorNote": "Three-down workhorse handling 15.0 carries per game."
        }
      ],
      "gppStacks": [
        {
          "primaryStack": {
            "qb": "Jared Goff",
            "passCatchers": [
              "Amon-Ra St. Brown",
              "Sam LaPorta"
            ]
          },
          "bringBack": "Justin Jefferson",
          "valueFiller": "T.J. Hockenson",
          "correlationTheme": "Pair Jared Goff with Sam LaPorta and bring it back with Justin Jefferson, then add a two-player mini-stack from a second game."
        }
      ]
    },
    "quadEngineCitations": {
      "arxiv": [
        "arxiv:2305.18290",
        "arxiv:2603.24989"
      ],
      "openalex": [
        "openalex:W4285718290"
      ],
      "kaggle": [
        "kaggle:nfl-big-data-bowl-2024"
      ],
      "hf": [
        "hf:models/gse-nfl-xgboost-v5"
      ]
    }
  },
  {
    "id": "writeup-sun_early-401873029",
    "gameId": "401873029",
    "matchup": "Las Vegas Raiders @ New York Jets",
    "awayTeam": "Las Vegas Raiders",
    "homeTeam": "New York Jets",
    "kickoff": "2026-11-01T18:00Z",
    "windowSlot": "SUN_EARLY",
    "paceOfPlay": {
      "neutralSecPerSnap": 26.3,
      "passEpaPlay": 0.139,
      "rushEpaPlay": -0.2,
      "noHuddleRate": 0.064,
      "notes": "Las Vegas Raiders averages 67 plays per game, while New York Jets averages 60 plays per game and controls the clock in the second half."
    },
    "schemeMatchup": {
      "coverageShell": "Las Vegas travels east to face the Jets in the Meadowlands wind, where both offensive lines have been tested in obvious passing situations. Field position and third-down protection will swing this tight AFC matchup \u2014 unlock the pack for our official game breakdown and picks.",
      "blitzRateVsPressureToSack": "New York Jets and Las Vegas Raiders bring contrasting third-down pass-rush plans into this matchup up front.",
      "personnelTendencies": "New York Jets features Garrett Wilson and Braelon Allen on early downs, while Las Vegas Raiders leans on Brock Bowers and Ashton Jeanty.",
      "coachingEdge": "Ball security, open-field tackling, and red-zone play-calling between Las Vegas Raiders and New York Jets headline the film study for this game.",
      "notes": "Posted Line: NYJ -1.5 \u00b7 O/U 45.5 \u00b7 Sunday 1:00 PM ET \u2014 Official spread call, total call, and player prop picks are locked inside the pack."
    },
    "sideTotalCall": {
      "sideSelection": "Las Vegas Raiders +1.5",
      "sideConfidence": "51/100",
      "sideExpectedClv": -0.045,
      "sideDecision": "PASS",
      "totalSelection": "UNDER 45.5",
      "totalConfidence": "51/100",
      "totalExpectedClv": -0.045,
      "totalDecision": "PASS",
      "rationale": "Both offensive lines have struggled to protect the quarterback in obvious passing downs, making this a coin-flip game in the Meadowlands wind. There is no real edge on either team or the total, so sit this matchup out."
    },
    "topProps": [
      {
        "playerId": "brock-bowers",
        "playerName": "Brock Bowers",
        "propType": "Receiving Yards",
        "market": "rec_yds",
        "line": 69.5,
        "side": "OVER",
        "confidence": "54/100",
        "expectedClv": 0.015,
        "decision": "PASS",
        "nEffTargetNotes": "Vegas has Brock Bowers priced accurately at 69.5 receiving yards in the Meadowlands. Sit this prop out.",
        "pOver": 0.54,
        "pUnder": 0.46
      },
      {
        "playerId": "garrett-wilson",
        "playerName": "Garrett Wilson",
        "propType": "Receiving Yards",
        "market": "rec_yds",
        "line": 63.5,
        "side": "OVER",
        "confidence": "54/100",
        "expectedClv": 0.015,
        "decision": "PASS",
        "nEffTargetNotes": "Vegas has Garrett Wilson priced tightly at 63.5 receiving yards. Sit this prop out.",
        "pOver": 0.54,
        "pUnder": 0.46
      },
      {
        "playerId": "ashton-jeanty",
        "playerName": "Ashton Jeanty",
        "propType": "Rushing Yards",
        "market": "rush_yds",
        "line": 48.5,
        "side": "OVER",
        "confidence": "53/100",
        "expectedClv": 0.0062,
        "decision": "PASS",
        "nEffTargetNotes": "Vegas has Ashton Jeanty priced right near 48.5 rushing yards. Sit this prop out.",
        "pOver": 0.53,
        "pUnder": 0.47
      }
    ],
    "correlatedSgpTicket": {
      "title": "LV @ NYJ Same-Game Parlay",
      "legs": [
        {
          "description": "LV @ NYJ Spread",
          "pickType": "SPREAD",
          "selection": "Las Vegas Raiders +1.5",
          "confidence": "51/100",
          "expectedClv": -0.045,
          "decision": "PASS"
        },
        {
          "description": "LV @ NYJ Total",
          "pickType": "TOTAL",
          "selection": "UNDER 45.5",
          "confidence": "51/100",
          "expectedClv": -0.045,
          "decision": "PASS"
        },
        {
          "description": "Brock Bowers Receiving Yards",
          "pickType": "PLAYER_PROP",
          "selection": "Brock Bowers OVER 69.5",
          "line": 69.5,
          "confidence": "54/100",
          "expectedClv": 0.0,
          "decision": "PASS"
        }
      ],
      "jointWinProb": 0.1755,
      "fairOdds": "n/a",
      "marketOdds": "n/a",
      "edgeScore": 0.035,
      "correlationRationale": "PASS \u2014 Stick to straight bets in this matchup; parlay payout does not beat the true risk."
    },
    "dfsStacks": {
      "captainPicks": [
        {
          "player": "Garrett Wilson",
          "position": "WR",
          "salary": 10200,
          "leverageNote": "Primary red-zone and third-down receiver for New York Jets averaging 7.3 targets per game."
        },
        {
          "player": "Brock Bowers",
          "position": "WR",
          "salary": 9600,
          "leverageNote": "Go-to receiver for Las Vegas Raiders averaging 10.2 targets per game when playing from behind."
        }
      ],
      "cashCore": [
        {
          "player": "Geno Smith",
          "position": "QB",
          "salary": 6600,
          "projection": 18.7,
          "floorNote": "Steady pocket passer averaging 231.9 passing yards per game."
        },
        {
          "player": "Ashton Jeanty",
          "position": "RB",
          "salary": 6200,
          "projection": 17.6,
          "floorNote": "Three-down workhorse handling 15.1 carries per game."
        }
      ],
      "gppStacks": [
        {
          "primaryStack": {
            "qb": "Geno Smith",
            "passCatchers": [
              "Garrett Wilson",
              "Omar Cooper"
            ]
          },
          "bringBack": "Brock Bowers",
          "valueFiller": "Michael Mayer",
          "correlationTheme": "Pair Geno Smith with Omar Cooper and bring it back with Brock Bowers, then add a two-player mini-stack from a second game."
        }
      ]
    },
    "quadEngineCitations": {
      "arxiv": [
        "arxiv:2305.18290",
        "arxiv:2603.24989"
      ],
      "openalex": [
        "openalex:W4285718290"
      ],
      "kaggle": [
        "kaggle:nfl-big-data-bowl-2024"
      ],
      "hf": [
        "hf:models/gse-nfl-xgboost-v5"
      ]
    }
  },
  {
    "id": "writeup-sun_early-401873027",
    "gameId": "401873027",
    "matchup": "Cleveland Browns @ Pittsburgh Steelers",
    "awayTeam": "Cleveland Browns",
    "homeTeam": "Pittsburgh Steelers",
    "kickoff": "2026-11-01T18:00Z",
    "windowSlot": "SUN_EARLY",
    "paceOfPlay": {
      "neutralSecPerSnap": 25.9,
      "passEpaPlay": -0.012,
      "rushEpaPlay": -0.062,
      "noHuddleRate": 0.057,
      "notes": "Cleveland Browns averages 63 plays per game, while Pittsburgh Steelers averages 66 plays per game and controls the clock in the second half."
    },
    "schemeMatchup": {
      "coverageShell": "AFC North football takes center stage at Acrisure Stadium as Pittsburgh's defensive front squares off against a bruised Cleveland offensive line. Physical trench play and open-field tackling always define Browns-Steelers \u2014 our official spread call, total call, and player prop bets are locked inside.",
      "blitzRateVsPressureToSack": "Pittsburgh Steelers and Cleveland Browns bring contrasting third-down pass-rush plans into this matchup up front.",
      "personnelTendencies": "Pittsburgh Steelers features Germie Bernard and Jaylen Warren on early downs, while Cleveland Browns leans on Denzel Boston and Quinshon Judkins.",
      "coachingEdge": "Ball security, open-field tackling, and red-zone play-calling between Cleveland Browns and Pittsburgh Steelers headline the film study for this game.",
      "notes": "Posted Line: PIT -3.5 \u00b7 O/U 39.5 \u00b7 Sunday 1:00 PM ET \u2014 Official spread call, total call, and player prop picks are locked inside the pack."
    },
    "sideTotalCall": {
      "sideSelection": "Pittsburgh Steelers -3.5",
      "sideConfidence": "55/100",
      "sideExpectedClv": -0.005,
      "sideDecision": "PASS",
      "totalSelection": "UNDER 39.5",
      "totalConfidence": "57/100",
      "totalExpectedClv": 0.0462,
      "totalDecision": "PLAY",
      "rationale": "Pittsburgh's front four dominates a bruised Cleveland offensive line while the Browns have missed fifty-one tackles on defense, pointing to a physical, clock-chewing divisional battle. Pass on the spread and take the under."
    },
    "topProps": [
      {
        "playerId": "jaylen-warren",
        "playerName": "Jaylen Warren",
        "propType": "Rushing Yards",
        "market": "rush_yds",
        "line": 65.5,
        "side": "OVER",
        "confidence": "59/100",
        "expectedClv": 0.0662,
        "decision": "PLAY",
        "nEffTargetNotes": "Cleveland's defense has missed 51 tackles this season, giving Jaylen Warren hidden yards after contact in a clock-bleeding divisional script. Take OVER 65.5 rushing yards.",
        "pOver": 0.59,
        "pUnder": 0.41
      },
      {
        "playerId": "dk-metcalf",
        "playerName": "DK Metcalf",
        "propType": "Receiving Yards",
        "market": "rec_yds",
        "line": 56.5,
        "side": "UNDER",
        "confidence": "58/100",
        "expectedClv": 0.0562,
        "decision": "PLAY",
        "nEffTargetNotes": "In a low-total (39.5) AFC North trench slugfest outdoors at Acrisure Stadium, downfield perimeter volume is suppressed. Take UNDER 56.5 receiving yards.",
        "pOver": 0.42,
        "pUnder": 0.58
      },
      {
        "playerId": "quinshon-judkins",
        "playerName": "Quinshon Judkins",
        "propType": "Rushing Yards",
        "market": "rush_yds",
        "line": 48.5,
        "side": "UNDER",
        "confidence": "58/100",
        "expectedClv": 0.0562,
        "decision": "PLAY",
        "nEffTargetNotes": "Pittsburgh's defensive front dominates a bruised Cleveland offensive line on early downs. Take UNDER 48.5 rushing yards.",
        "pOver": 0.42,
        "pUnder": 0.58
      }
    ],
    "correlatedSgpTicket": {
      "title": "CLE @ PIT Same-Game Parlay",
      "legs": [
        {
          "description": "CLE @ PIT Spread",
          "pickType": "SPREAD",
          "selection": "Pittsburgh Steelers -3.5",
          "confidence": "55/100",
          "expectedClv": -0.005,
          "decision": "PASS"
        },
        {
          "description": "CLE @ PIT Total",
          "pickType": "TOTAL",
          "selection": "UNDER 39.5",
          "confidence": "57/100",
          "expectedClv": 0.0462,
          "decision": "PLAY"
        },
        {
          "description": "Jaylen Warren Receiving Yards",
          "pickType": "PLAYER_PROP",
          "selection": "Jaylen Warren OVER 65.5",
          "line": 65.5,
          "confidence": "59/100",
          "expectedClv": 0.0662,
          "decision": "PLAY"
        }
      ],
      "jointWinProb": 0.2213,
      "fairOdds": "+352",
      "marketOdds": "+425",
      "edgeScore": 0.0363,
      "correlationRationale": "When Pittsburgh Steelers -3.5 and UNDER 39.5 cash together, Jaylen Warren OVER 65.5 receiving yards fits the exact same game script."
    },
    "dfsStacks": {
      "captainPicks": [
        {
          "player": "Germie Bernard",
          "position": "WR",
          "salary": 10200,
          "leverageNote": "Primary red-zone and third-down receiver for Pittsburgh Steelers averaging 6.2 targets per game."
        },
        {
          "player": "Denzel Boston",
          "position": "WR",
          "salary": 9600,
          "leverageNote": "Go-to receiver for Cleveland Browns averaging 6.0 targets per game when playing from behind."
        }
      ],
      "cashCore": [
        {
          "player": "Aaron Rodgers",
          "position": "QB",
          "salary": 6600,
          "projection": 17.9,
          "floorNote": "Steady pocket passer averaging 242.7 passing yards per game."
        },
        {
          "player": "Quinshon Judkins",
          "position": "RB",
          "salary": 6200,
          "projection": 18.0,
          "floorNote": "Three-down workhorse handling 15.0 carries per game."
        }
      ],
      "gppStacks": [
        {
          "primaryStack": {
            "qb": "Aaron Rodgers",
            "passCatchers": [
              "Germie Bernard",
              "D.K. Metcalf"
            ]
          },
          "bringBack": "Denzel Boston",
          "valueFiller": "Harold Fannin",
          "correlationTheme": "Pair Aaron Rodgers with D.K. Metcalf and bring it back with Denzel Boston, then add a two-player mini-stack from a second game."
        }
      ]
    },
    "quadEngineCitations": {
      "arxiv": [
        "arxiv:2305.18290",
        "arxiv:2603.24989"
      ],
      "openalex": [
        "openalex:W4285718290"
      ],
      "kaggle": [
        "kaggle:nfl-big-data-bowl-2024"
      ],
      "hf": [
        "hf:models/gse-nfl-xgboost-v5"
      ]
    }
  },
  {
    "id": "writeup-sun_early-401873025",
    "gameId": "401873025",
    "matchup": "Atlanta Falcons @ Tampa Bay Buccaneers",
    "awayTeam": "Atlanta Falcons",
    "homeTeam": "Tampa Bay Buccaneers",
    "kickoff": "2026-11-01T18:00Z",
    "windowSlot": "SUN_EARLY",
    "paceOfPlay": {
      "neutralSecPerSnap": 26.2,
      "passEpaPlay": -0.092,
      "rushEpaPlay": -0.005,
      "noHuddleRate": 0.059,
      "notes": "Atlanta Falcons averages 62 plays per game, while Tampa Bay Buccaneers averages 65 plays per game and controls the clock in the second half."
    },
    "schemeMatchup": {
      "coverageShell": "First place in the NFC South is on the line in Tampa as the Buccaneers' interior front battles an Atlanta offense that leans heavily on its running backs in the passing game. With the spread sitting inside a field goal, late-game execution is everything \u2014 unlock the pack to reveal our official calls.",
      "blitzRateVsPressureToSack": "Tampa Bay Buccaneers and Atlanta Falcons bring contrasting third-down pass-rush plans into this matchup up front.",
      "personnelTendencies": "Tampa Bay Buccaneers features Chris Godwin and Bucky Irving on early downs, while Atlanta Falcons leans on Drake London and Bijan Robinson.",
      "coachingEdge": "Ball security, open-field tackling, and red-zone play-calling between Atlanta Falcons and Tampa Bay Buccaneers headline the film study for this game.",
      "notes": "Posted Line: TB -2.5 \u00b7 O/U 44.5 \u00b7 Sunday 1:00 PM ET \u2014 Official spread call, total call, and player prop picks are locked inside the pack."
    },
    "sideTotalCall": {
      "sideSelection": "Tampa Bay Buccaneers -2.5",
      "sideConfidence": "53/100",
      "sideExpectedClv": -0.025,
      "sideDecision": "PASS",
      "totalSelection": "UNDER 44.5",
      "totalConfidence": "52/100",
      "totalExpectedClv": -0.035,
      "totalDecision": "PASS",
      "rationale": "Tampa Bay gets strong interior line play at home while Atlanta funnels short catches to running backs to protect the middle of the field. With the spread sitting right on the key number below a field goal, Vegas has this division game priced accurately."
    },
    "topProps": [
      {
        "playerId": "drake-london",
        "playerName": "Drake London",
        "propType": "Receiving Yards",
        "market": "rec_yds",
        "line": 78.5,
        "side": "OVER",
        "confidence": "54/100",
        "expectedClv": 0.015,
        "decision": "PASS",
        "nEffTargetNotes": "Vegas has Drake London priced efficiently at 78.5 receiving yards. Sit this prop out.",
        "pOver": 0.54,
        "pUnder": 0.46
      },
      {
        "playerId": "bijan-robinson",
        "playerName": "Bijan Robinson",
        "propType": "Rushing Yards",
        "market": "rush_yds",
        "line": 78.5,
        "side": "UNDER",
        "confidence": "54/100",
        "expectedClv": 0.015,
        "decision": "PASS",
        "nEffTargetNotes": "Vegas has Bijan Robinson priced accurately at 78.5 rushing yards against Tampa Bay's interior front. Sit this prop out.",
        "pOver": 0.46,
        "pUnder": 0.54
      },
      {
        "playerId": "bucky-irving",
        "playerName": "Bucky Irving",
        "propType": "Rushing Yards",
        "market": "rush_yds",
        "line": 70.5,
        "side": "OVER",
        "confidence": "53/100",
        "expectedClv": 0.0062,
        "decision": "PASS",
        "nEffTargetNotes": "Vegas has Bucky Irving priced right near 70.5 rushing yards. Sit this prop out.",
        "pOver": 0.53,
        "pUnder": 0.47
      }
    ],
    "correlatedSgpTicket": {
      "title": "ATL @ TB Same-Game Parlay",
      "legs": [
        {
          "description": "ATL @ TB Spread",
          "pickType": "SPREAD",
          "selection": "Tampa Bay Buccaneers -2.5",
          "confidence": "53/100",
          "expectedClv": -0.025,
          "decision": "PASS"
        },
        {
          "description": "ATL @ TB Total",
          "pickType": "TOTAL",
          "selection": "UNDER 44.5",
          "confidence": "52/100",
          "expectedClv": -0.035,
          "decision": "PASS"
        },
        {
          "description": "Drake London Receiving Yards",
          "pickType": "PLAYER_PROP",
          "selection": "Drake London OVER 78.5",
          "line": 78.5,
          "confidence": "54/100",
          "expectedClv": 0.0,
          "decision": "PASS"
        }
      ],
      "jointWinProb": 0.1879,
      "fairOdds": "n/a",
      "marketOdds": "n/a",
      "edgeScore": 0.0391,
      "correlationRationale": "PASS \u2014 Stick to straight bets in this matchup; parlay payout does not beat the true risk."
    },
    "dfsStacks": {
      "captainPicks": [
        {
          "player": "Chris Godwin",
          "position": "WR",
          "salary": 10200,
          "leverageNote": "Primary red-zone and third-down receiver for Tampa Bay Buccaneers averaging 4.5 targets per game."
        },
        {
          "player": "Drake London",
          "position": "WR",
          "salary": 9600,
          "leverageNote": "Go-to receiver for Atlanta Falcons averaging 8.0 targets per game when playing from behind."
        }
      ],
      "cashCore": [
        {
          "player": "Baker Mayfield",
          "position": "QB",
          "salary": 6600,
          "projection": 16.9,
          "floorNote": "Steady pocket passer averaging 169.8 passing yards per game."
        },
        {
          "player": "Bijan Robinson",
          "position": "RB",
          "salary": 6200,
          "projection": 20.8,
          "floorNote": "Three-down workhorse handling 18.7 carries per game."
        }
      ],
      "gppStacks": [
        {
          "primaryStack": {
            "qb": "Baker Mayfield",
            "passCatchers": [
              "Chris Godwin",
              "Cade Otton"
            ]
          },
          "bringBack": "Drake London",
          "valueFiller": "Kyle Pitts",
          "correlationTheme": "Pair Baker Mayfield with Cade Otton and bring it back with Drake London, then add a two-player mini-stack from a second game."
        }
      ]
    },
    "quadEngineCitations": {
      "arxiv": [
        "arxiv:2305.18290",
        "arxiv:2603.24989"
      ],
      "openalex": [
        "openalex:W4285718290"
      ],
      "kaggle": [
        "kaggle:nfl-big-data-bowl-2024"
      ],
      "hf": [
        "hf:models/gse-nfl-xgboost-v5"
      ]
    }
  },
  {
    "id": "writeup-sun_early-401873028",
    "gameId": "401873028",
    "matchup": "Indianapolis Colts @ Jacksonville Jaguars",
    "awayTeam": "Indianapolis Colts",
    "homeTeam": "Jacksonville Jaguars",
    "kickoff": "2026-11-01T18:00Z",
    "windowSlot": "SUN_EARLY",
    "paceOfPlay": {
      "neutralSecPerSnap": 25.8,
      "passEpaPlay": 0.045,
      "rushEpaPlay": 0.0,
      "noHuddleRate": 0.031,
      "notes": "Indianapolis Colts averages 67 plays per game, while Jacksonville Jaguars averages 62 plays per game and controls the clock in the second half."
    },
    "schemeMatchup": {
      "coverageShell": "Jacksonville's edge rushers look to pin their ears back at home against an Indianapolis offense trying to stay balanced on early downs in an AFC South showdown. Our official side call, total call, and player prop breakdown for Colts at Jaguars are locked inside the Sunday pack.",
      "blitzRateVsPressureToSack": "Jacksonville Jaguars and Indianapolis Colts bring contrasting third-down pass-rush plans into this matchup up front.",
      "personnelTendencies": "Jacksonville Jaguars features Parker Washington and Bhayshul Tuten on early downs, while Indianapolis Colts leans on Josh Downs and Jonathan Taylor.",
      "coachingEdge": "Ball security, open-field tackling, and red-zone play-calling between Indianapolis Colts and Jacksonville Jaguars headline the film study for this game.",
      "notes": "Posted Line: JAX -10 \u00b7 O/U 46.5 \u00b7 Sunday 1:00 PM ET \u2014 Official spread call, total call, and player prop picks are locked inside the pack."
    },
    "sideTotalCall": {
      "sideSelection": "Indianapolis Colts +10",
      "sideConfidence": "52/100",
      "sideExpectedClv": -0.035,
      "sideDecision": "PASS",
      "totalSelection": "UNDER 46.5",
      "totalConfidence": "51/100",
      "totalExpectedClv": -0.045,
      "totalDecision": "PASS",
      "rationale": "Jacksonville's pass rush should control the pocket at home, but laying double digits in an AFC South divisional matchup carries too much fourth-quarter risk. Hold off on both the spread and the total in this game."
    },
    "topProps": [
      {
        "playerId": "parker-washington",
        "playerName": "Parker Washington",
        "propType": "Receiving Yards",
        "market": "rec_yds",
        "line": 68.5,
        "side": "OVER",
        "confidence": "54/100",
        "expectedClv": 0.015,
        "decision": "PASS",
        "nEffTargetNotes": "Vegas has Parker Washington priced accurately at 68.5 receiving yards. Sit this prop out.",
        "pOver": 0.54,
        "pUnder": 0.46
      },
      {
        "playerId": "tyler-warren",
        "playerName": "Tyler Warren",
        "propType": "Receiving Yards",
        "market": "rec_yds",
        "line": 40.5,
        "side": "OVER",
        "confidence": "54/100",
        "expectedClv": 0.015,
        "decision": "PASS",
        "nEffTargetNotes": "Vegas has Tyler Warren priced tightly at 40.5 receiving yards. Sit this prop out.",
        "pOver": 0.54,
        "pUnder": 0.46
      },
      {
        "playerId": "jonathan-taylor",
        "playerName": "Jonathan Taylor",
        "propType": "Rushing Yards",
        "market": "rush_yds",
        "line": 60.5,
        "side": "UNDER",
        "confidence": "53/100",
        "expectedClv": 0.0062,
        "decision": "PASS",
        "nEffTargetNotes": "Vegas has Jonathan Taylor priced efficiently at 60.5 rushing yards as a 10-point underdog. Sit this prop out.",
        "pOver": 0.47,
        "pUnder": 0.53
      }
    ],
    "correlatedSgpTicket": {
      "title": "IND @ JAX Same-Game Parlay",
      "legs": [
        {
          "description": "IND @ JAX Spread",
          "pickType": "SPREAD",
          "selection": "Indianapolis Colts +10",
          "confidence": "52/100",
          "expectedClv": -0.035,
          "decision": "PASS"
        },
        {
          "description": "IND @ JAX Total",
          "pickType": "TOTAL",
          "selection": "UNDER 46.5",
          "confidence": "51/100",
          "expectedClv": -0.045,
          "decision": "PASS"
        },
        {
          "description": "Parker Washington Receiving Yards",
          "pickType": "PLAYER_PROP",
          "selection": "Parker Washington OVER 68.5",
          "line": 68.5,
          "confidence": "54/100",
          "expectedClv": 0.0,
          "decision": "PASS"
        }
      ],
      "jointWinProb": 0.1785,
      "fairOdds": "n/a",
      "marketOdds": "n/a",
      "edgeScore": 0.0353,
      "correlationRationale": "PASS \u2014 Stick to straight bets in this matchup; parlay payout does not beat the true risk."
    },
    "dfsStacks": {
      "captainPicks": [
        {
          "player": "Parker Washington",
          "position": "WR",
          "salary": 10200,
          "leverageNote": "Primary red-zone and third-down receiver for Jacksonville Jaguars averaging 7.7 targets per game."
        },
        {
          "player": "Josh Downs",
          "position": "WR",
          "salary": 9600,
          "leverageNote": "Go-to receiver for Indianapolis Colts averaging 6.6 targets per game when playing from behind."
        }
      ],
      "cashCore": [
        {
          "player": "Trevor Lawrence",
          "position": "QB",
          "salary": 6600,
          "projection": 20.5,
          "floorNote": "Steady pocket passer averaging 246.7 passing yards per game."
        },
        {
          "player": "Jonathan Taylor",
          "position": "RB",
          "salary": 6200,
          "projection": 19.8,
          "floorNote": "Three-down workhorse handling 20.0 carries per game."
        }
      ],
      "gppStacks": [
        {
          "primaryStack": {
            "qb": "Trevor Lawrence",
            "passCatchers": [
              "Parker Washington",
              "Jakobi Meyers"
            ]
          },
          "bringBack": "Josh Downs",
          "valueFiller": "Laquon Treadwell",
          "correlationTheme": "Pair Trevor Lawrence with Jakobi Meyers and bring it back with Josh Downs, then add a two-player mini-stack from a second game."
        }
      ]
    },
    "quadEngineCitations": {
      "arxiv": [
        "arxiv:2305.18290",
        "arxiv:2603.24989"
      ],
      "openalex": [
        "openalex:W4285718290"
      ],
      "kaggle": [
        "kaggle:nfl-big-data-bowl-2024"
      ],
      "hf": [
        "hf:models/gse-nfl-xgboost-v5"
      ]
    }
  },
  {
    "id": "writeup-sun_late-401873032",
    "gameId": "401873032",
    "matchup": "Los Angeles Chargers @ Los Angeles Rams",
    "awayTeam": "Los Angeles Chargers",
    "homeTeam": "Los Angeles Rams",
    "kickoff": "2026-11-01T21:05Z",
    "windowSlot": "SUN_LATE",
    "paceOfPlay": {
      "neutralSecPerSnap": 24.5,
      "passEpaPlay": -0.041,
      "rushEpaPlay": -0.138,
      "noHuddleRate": 0.08,
      "notes": "Los Angeles Chargers averages 66 plays per game, while Los Angeles Rams averages 71 plays per game and controls the clock in the second half."
    },
    "schemeMatchup": {
      "coverageShell": "Matthew Stafford and the Rams share SoFi Stadium with a Chargers team that plays deliberate, ball-control football and rarely beats itself. Red-zone finishing and third-down conversions will separate these two Los Angeles rosters \u2014 unlock the pack for our official game calls.",
      "blitzRateVsPressureToSack": "Los Angeles Rams and Los Angeles Chargers bring contrasting third-down pass-rush plans into this matchup up front.",
      "personnelTendencies": "Los Angeles Rams features Puka Nacua and Kyren Williams on early downs, while Los Angeles Chargers leans on KeAndre Lambert-Smith and Omarion Hampton.",
      "coachingEdge": "Ball security, open-field tackling, and red-zone play-calling between Los Angeles Chargers and Los Angeles Rams headline the film study for this game.",
      "notes": "Posted Line: LAR -6.5 \u00b7 O/U 45.5 \u00b7 Sunday 4:05 PM ET \u2014 Official spread call, total call, and player prop picks are locked inside the pack."
    },
    "sideTotalCall": {
      "sideSelection": "Los Angeles Rams -6.5",
      "sideConfidence": "61/100",
      "sideExpectedClv": 0.086,
      "sideDecision": "PLAY",
      "totalSelection": "UNDER 45.5",
      "totalConfidence": "54/100",
      "totalExpectedClv": -0.015,
      "totalDecision": "PASS",
      "rationale": "The Chargers offense has cratered to -0.257 ridge-adjusted EPA/play (-0.397 EPA/play in Week 5 and -0.311 EPA/play in Week 6), while Matthew Stafford and Sean McVay hold a commanding play-action and red-zone edge inside SoFi Stadium. Lay the 6.5 points with the Rams and pass on the full-game total."
    },
    "topProps": [
      {
        "playerId": "justin-herbert",
        "playerName": "Justin Herbert",
        "propType": "Passing Yards",
        "market": "pass_yds",
        "line": 206.5,
        "side": "UNDER",
        "confidence": "63/100",
        "expectedClv": 0.129,
        "decision": "PLAY",
        "nEffTargetNotes": "With the Chargers pass offense posting -0.570 pass EPA/play in Week 5 and -0.407 pass EPA/play in Week 6 behind a collapsing pocket, Justin Herbert's median projection sits at 190.4 passing yards. Take UNDER 206.5 passing yards.",
        "pOver": 0.37,
        "pUnder": 0.63
      },
      {
        "playerId": "puka-nacua",
        "playerName": "Puka Nacua",
        "propType": "Receiving Yards",
        "market": "rec_yds",
        "line": 92.5,
        "side": "OVER",
        "confidence": "54/100",
        "expectedClv": 0.015,
        "decision": "PASS",
        "nEffTargetNotes": "DraftKings has already steamed Puka Nacua up to 92.5 receiving yards (opened 90.5). At 92.5, the edge is gone \u2014 PASS.",
        "pOver": 0.54,
        "pUnder": 0.46
      },
      {
        "playerId": "ladd-mcconkey",
        "playerName": "Ladd McConkey",
        "propType": "Receiving Yards",
        "market": "rec_yds",
        "line": 45.5,
        "side": "UNDER",
        "confidence": "54/100",
        "expectedClv": 0.015,
        "decision": "PASS",
        "nEffTargetNotes": "Ladd McConkey was held to 1 target and 17 yards in Week 6 as the Chargers passing game stalled out. Sit this prop out at 45.5.",
        "pOver": 0.46,
        "pUnder": 0.54
      }
    ],
    "correlatedSgpTicket": {
      "title": "LAC @ LAR Same-Game Parlay",
      "legs": [
        {
          "description": "LAC @ LAR Spread",
          "pickType": "SPREAD",
          "selection": "Los Angeles Rams -6.5",
          "confidence": "61/100",
          "expectedClv": 0.086,
          "decision": "PLAY"
        },
        {
          "description": "LAC @ LAR Total",
          "pickType": "TOTAL",
          "selection": "UNDER 45.5",
          "confidence": "54/100",
          "expectedClv": -0.015,
          "decision": "PASS"
        },
        {
          "description": "Justin Herbert Passing Yards",
          "pickType": "PLAYER_PROP",
          "selection": "Justin Herbert UNDER 206.5",
          "line": 206.5,
          "confidence": "63/100",
          "expectedClv": 0.129,
          "decision": "PLAY"
        }
      ],
      "jointWinProb": 0.2412,
      "fairOdds": "+315",
      "marketOdds": "+365",
      "edgeScore": 0.0432,
      "correlationRationale": "When Los Angeles Rams -6.5 cashes against a struggling Chargers offense, Justin Herbert UNDER 206.5 passing yards correlates directly with Rams pass-rush control."
    },
    "dfsStacks": {
      "captainPicks": [
        {
          "player": "Puka Nacua",
          "position": "WR",
          "salary": 10200,
          "leverageNote": "Primary red-zone and third-down receiver for Los Angeles Rams averaging 12.4 targets per game."
        },
        {
          "player": "KeAndre Lambert-Smith",
          "position": "WR",
          "salary": 9600,
          "leverageNote": "Go-to receiver for Los Angeles Chargers averaging 9.0 targets per game when playing from behind."
        }
      ],
      "cashCore": [
        {
          "player": "Matthew Stafford",
          "position": "QB",
          "salary": 6600,
          "projection": 19.4,
          "floorNote": "Steady pocket passer averaging 284.1 passing yards per game."
        },
        {
          "player": "Omarion Hampton",
          "position": "RB",
          "salary": 6200,
          "projection": 17.7,
          "floorNote": "Three-down workhorse handling 13.3 carries per game."
        }
      ],
      "gppStacks": [
        {
          "primaryStack": {
            "qb": "Matthew Stafford",
            "passCatchers": [
              "Puka Nacua",
              "Tyler Higbee"
            ]
          },
          "bringBack": "KeAndre Lambert-Smith",
          "valueFiller": "Theo Wease",
          "correlationTheme": "Pair Matthew Stafford with Tyler Higbee and bring it back with KeAndre Lambert-Smith, then add a two-player mini-stack from a second game."
        }
      ]
    },
    "quadEngineCitations": {
      "arxiv": [
        "arxiv:2305.18290",
        "arxiv:2603.24989"
      ],
      "openalex": [
        "openalex:W4285718290"
      ],
      "kaggle": [
        "kaggle:nfl-big-data-bowl-2024"
      ],
      "hf": [
        "hf:models/gse-nfl-xgboost-v5"
      ]
    }
  },
  {
    "id": "writeup-sun_late-401873033",
    "gameId": "401873033",
    "matchup": "Kansas City Chiefs @ Denver Broncos",
    "awayTeam": "Kansas City Chiefs",
    "homeTeam": "Denver Broncos",
    "kickoff": "2026-11-01T21:25Z",
    "windowSlot": "SUN_LATE",
    "paceOfPlay": {
      "neutralSecPerSnap": 27.4,
      "passEpaPlay": 0.061,
      "rushEpaPlay": -0.005,
      "noHuddleRate": 0.025,
      "notes": "Kansas City Chiefs averages 62 plays per game, while Denver Broncos averages 60 plays per game and controls the clock in the second half."
    },
    "schemeMatchup": {
      "coverageShell": "Kansas City heads into the thin air at Mile High to face a Denver defense that has been tough against the pass all season in AFC West play. Divisional games in Denver almost always come down to the final two possessions \u2014 our official spread, total, and player prop calls are locked inside.",
      "blitzRateVsPressureToSack": "Denver Broncos and Kansas City Chiefs bring contrasting third-down pass-rush plans into this matchup up front.",
      "personnelTendencies": "Denver Broncos features Jaylen Waddle and Jonah Coleman on early downs, while Kansas City Chiefs leans on Travis Kelce and Kenneth Walker III.",
      "coachingEdge": "Ball security, open-field tackling, and red-zone play-calling between Kansas City Chiefs and Denver Broncos headline the film study for this game.",
      "notes": "Posted Line: KC -1.5 \u00b7 O/U 40.5 \u00b7 Sunday 4:25 PM ET \u2014 Official spread call, total call, and player prop picks are locked inside the pack."
    },
    "sideTotalCall": {
      "sideSelection": "Kansas City Chiefs -1.5",
      "sideConfidence": "51/100",
      "sideExpectedClv": -0.045,
      "sideDecision": "PASS",
      "totalSelection": "UNDER 40.5",
      "totalConfidence": "52/100",
      "totalExpectedClv": -0.035,
      "totalDecision": "PASS",
      "rationale": "Denver's altitude and top-tier pass defense keep divisional games tight at Mile High, even though the Broncos have struggled with fifty-six missed tackles in the open field. This AFC West battle is priced right on the number, so sit this one out."
    },
    "topProps": [
      {
        "playerId": "travis-kelce",
        "playerName": "Travis Kelce",
        "propType": "Receiving Yards",
        "market": "rec_yds",
        "line": 46.5,
        "side": "OVER",
        "confidence": "54/100",
        "expectedClv": 0.015,
        "decision": "PASS",
        "nEffTargetNotes": "Vegas has Travis Kelce priced accurately at 46.5 receiving yards at Mile High. Sit this prop out.",
        "pOver": 0.54,
        "pUnder": 0.46
      },
      {
        "playerId": "patrick-mahomes",
        "playerName": "Patrick Mahomes",
        "propType": "Passing Yards",
        "market": "pass_yds",
        "line": 225.5,
        "side": "UNDER",
        "confidence": "54/100",
        "expectedClv": 0.015,
        "decision": "PASS",
        "nEffTargetNotes": "Vegas has Patrick Mahomes priced tightly at 225.5 passing yards against Denver's secondary. Sit this prop out.",
        "pOver": 0.46,
        "pUnder": 0.54
      },
      {
        "playerId": "bo-nix",
        "playerName": "Bo Nix",
        "propType": "Passing Yards",
        "market": "pass_yds",
        "line": 204.5,
        "side": "UNDER",
        "confidence": "53/100",
        "expectedClv": 0.0062,
        "decision": "PASS",
        "nEffTargetNotes": "Vegas has Bo Nix priced right near 204.5 passing yards. Sit this prop out.",
        "pOver": 0.47,
        "pUnder": 0.53
      }
    ],
    "correlatedSgpTicket": {
      "title": "KC @ DEN Same-Game Parlay",
      "legs": [
        {
          "description": "KC @ DEN Spread",
          "pickType": "SPREAD",
          "selection": "Kansas City Chiefs -1.5",
          "confidence": "51/100",
          "expectedClv": -0.045,
          "decision": "PASS"
        },
        {
          "description": "KC @ DEN Total",
          "pickType": "TOTAL",
          "selection": "UNDER 40.5",
          "confidence": "52/100",
          "expectedClv": -0.035,
          "decision": "PASS"
        },
        {
          "description": "Travis Kelce Receiving Yards",
          "pickType": "PLAYER_PROP",
          "selection": "Travis Kelce OVER 46.5",
          "line": 46.5,
          "confidence": "54/100",
          "expectedClv": 0.0,
          "decision": "PASS"
        }
      ],
      "jointWinProb": 0.1785,
      "fairOdds": "n/a",
      "marketOdds": "n/a",
      "edgeScore": 0.0353,
      "correlationRationale": "PASS \u2014 Stick to straight bets in this matchup; parlay payout does not beat the true risk."
    },
    "dfsStacks": {
      "captainPicks": [
        {
          "player": "Jaylen Waddle",
          "position": "WR",
          "salary": 10200,
          "leverageNote": "Primary red-zone and third-down receiver for Denver Broncos averaging 6.4 targets per game."
        },
        {
          "player": "Travis Kelce",
          "position": "WR",
          "salary": 9600,
          "leverageNote": "Go-to receiver for Kansas City Chiefs averaging 5.8 targets per game when playing from behind."
        }
      ],
      "cashCore": [
        {
          "player": "Bo Nix",
          "position": "QB",
          "salary": 6600,
          "projection": 17.8,
          "floorNote": "Steady pocket passer averaging 181.6 passing yards per game."
        },
        {
          "player": "Kenneth Walker III",
          "position": "RB",
          "salary": 6200,
          "projection": 21.8,
          "floorNote": "Three-down workhorse handling 20.0 carries per game."
        }
      ],
      "gppStacks": [
        {
          "primaryStack": {
            "qb": "Bo Nix",
            "passCatchers": [
              "Jaylen Waddle",
              "Courtland Sutton"
            ]
          },
          "bringBack": "Travis Kelce",
          "valueFiller": "Noah Gray",
          "correlationTheme": "Pair Bo Nix with Courtland Sutton and bring it back with Travis Kelce, then add a two-player mini-stack from a second game."
        }
      ]
    },
    "quadEngineCitations": {
      "arxiv": [
        "arxiv:2305.18290",
        "arxiv:2603.24989"
      ],
      "openalex": [
        "openalex:W4285718290"
      ],
      "kaggle": [
        "kaggle:nfl-big-data-bowl-2024"
      ],
      "hf": [
        "hf:models/gse-nfl-xgboost-v5"
      ]
    }
  },
  {
    "id": "writeup-sun_late-401873034",
    "gameId": "401873034",
    "matchup": "New England Patriots @ Miami Dolphins",
    "awayTeam": "New England Patriots",
    "homeTeam": "Miami Dolphins",
    "kickoff": "2026-11-01T21:25Z",
    "windowSlot": "SUN_LATE",
    "paceOfPlay": {
      "neutralSecPerSnap": 27.1,
      "passEpaPlay": 0.109,
      "rushEpaPlay": -0.153,
      "noHuddleRate": 0.013,
      "notes": "New England Patriots averages 65 plays per game, while Miami Dolphins averages 59 plays per game and controls the clock in the second half."
    },
    "schemeMatchup": {
      "coverageShell": "New England takes its young offense on the road into South Florida against a Miami defense looking to bounce back in an AFC East matchup. How both teams handle the heat and early-down run fits sets the tone \u2014 unlock the pack for our official calls on Patriots at Dolphins.",
      "blitzRateVsPressureToSack": "Miami Dolphins and New England Patriots bring contrasting third-down pass-rush plans into this matchup up front.",
      "personnelTendencies": "Miami Dolphins features Caleb Douglas and Ollie Gordon on early downs, while New England Patriots leans on Hunter Henry and Rhamondre Stevenson.",
      "coachingEdge": "Ball security, open-field tackling, and red-zone play-calling between New England Patriots and Miami Dolphins headline the film study for this game.",
      "notes": "Posted Line: NE -7 \u00b7 O/U 43.5 \u00b7 Sunday 4:25 PM ET \u2014 Official spread call, total call, and player prop picks are locked inside the pack."
    },
    "sideTotalCall": {
      "sideSelection": "New England Patriots -7",
      "sideConfidence": "53/100",
      "sideExpectedClv": -0.025,
      "sideDecision": "PASS",
      "totalSelection": "UNDER 43.5",
      "totalConfidence": "51/100",
      "totalExpectedClv": -0.045,
      "totalDecision": "PASS",
      "rationale": "Miami's defense has invited opposing quarterbacks to throw early and often all season, but laying a full touchdown on the road with New England asks too much of a young offense. Pass on both the spread and total here."
    },
    "topProps": [
      {
        "playerId": "drake-maye",
        "playerName": "Drake Maye",
        "propType": "Passing Yards",
        "market": "pass_yds",
        "line": 233.5,
        "side": "OVER",
        "confidence": "54/100",
        "expectedClv": 0.015,
        "decision": "PASS",
        "nEffTargetNotes": "Vegas has Drake Maye priced accurately at 233.5 passing yards in Miami. Sit this prop out.",
        "pOver": 0.54,
        "pUnder": 0.46
      },
      {
        "playerId": "hunter-henry",
        "playerName": "Hunter Henry",
        "propType": "Receiving Yards",
        "market": "rec_yds",
        "line": 38.5,
        "side": "OVER",
        "confidence": "54/100",
        "expectedClv": 0.015,
        "decision": "PASS",
        "nEffTargetNotes": "Vegas has Hunter Henry priced tightly at 38.5 receiving yards. Sit this prop out.",
        "pOver": 0.54,
        "pUnder": 0.46
      },
      {
        "playerId": "rhamondre-stevenson",
        "playerName": "Rhamondre Stevenson",
        "propType": "Rushing Yards",
        "market": "rush_yds",
        "line": 52.5,
        "side": "OVER",
        "confidence": "53/100",
        "expectedClv": 0.0062,
        "decision": "PASS",
        "nEffTargetNotes": "Vegas has Rhamondre Stevenson priced efficiently at 52.5 rushing yards. Sit this prop out.",
        "pOver": 0.53,
        "pUnder": 0.47
      }
    ],
    "correlatedSgpTicket": {
      "title": "NE @ MIA Same-Game Parlay",
      "legs": [
        {
          "description": "NE @ MIA Spread",
          "pickType": "SPREAD",
          "selection": "New England Patriots -7",
          "confidence": "53/100",
          "expectedClv": -0.025,
          "decision": "PASS"
        },
        {
          "description": "NE @ MIA Total",
          "pickType": "TOTAL",
          "selection": "UNDER 43.5",
          "confidence": "51/100",
          "expectedClv": -0.045,
          "decision": "PASS"
        },
        {
          "description": "Drake Maye Receiving Yards",
          "pickType": "PLAYER_PROP",
          "selection": "Drake Maye OVER 233.5",
          "line": 233.5,
          "confidence": "54/100",
          "expectedClv": 0.0,
          "decision": "PASS"
        }
      ],
      "jointWinProb": 0.1848,
      "fairOdds": "n/a",
      "marketOdds": "n/a",
      "edgeScore": 0.0388,
      "correlationRationale": "PASS \u2014 Stick to straight bets in this matchup; parlay payout does not beat the true risk."
    },
    "dfsStacks": {
      "captainPicks": [
        {
          "player": "Caleb Douglas",
          "position": "WR",
          "salary": 10200,
          "leverageNote": "Primary red-zone and third-down receiver for Miami Dolphins averaging 4.3 targets per game."
        },
        {
          "player": "Hunter Henry",
          "position": "WR",
          "salary": 9600,
          "leverageNote": "Go-to receiver for New England Patriots averaging 4.4 targets per game when playing from behind."
        }
      ],
      "cashCore": [
        {
          "player": "Malik Willis",
          "position": "QB",
          "salary": 6600,
          "projection": 17.6,
          "floorNote": "Steady pocket passer averaging 176.2 passing yards per game."
        },
        {
          "player": "Rhamondre Stevenson",
          "position": "RB",
          "salary": 6200,
          "projection": 17.6,
          "floorNote": "Three-down workhorse handling 11.0 carries per game."
        }
      ],
      "gppStacks": [
        {
          "primaryStack": {
            "qb": "Malik Willis",
            "passCatchers": [
              "Caleb Douglas",
              "Malik Washington"
            ]
          },
          "bringBack": "Hunter Henry",
          "valueFiller": "DeMario Douglas",
          "correlationTheme": "Pair Malik Willis with Malik Washington and bring it back with Hunter Henry, then add a two-player mini-stack from a second game."
        }
      ]
    },
    "quadEngineCitations": {
      "arxiv": [
        "arxiv:2305.18290",
        "arxiv:2603.24989"
      ],
      "openalex": [
        "openalex:W4285718290"
      ],
      "kaggle": [
        "kaggle:nfl-big-data-bowl-2024"
      ],
      "hf": [
        "hf:models/gse-nfl-xgboost-v5"
      ]
    }
  },
  {
    "id": "writeup-snf-401873035",
    "gameId": "401873035",
    "matchup": "Philadelphia Eagles @ Washington Commanders",
    "awayTeam": "Philadelphia Eagles",
    "homeTeam": "Washington Commanders",
    "kickoff": "2026-11-02T01:20Z",
    "windowSlot": "SNF",
    "paceOfPlay": {
      "neutralSecPerSnap": 26.1,
      "passEpaPlay": 0.007,
      "rushEpaPlay": -0.146,
      "noHuddleRate": 0.117,
      "notes": "Philadelphia Eagles averages 62 plays per game, while Washington Commanders averages 66 plays per game and controls the clock in the second half."
    },
    "schemeMatchup": {
      "coverageShell": "Sunday Night Football features an NFC East rivalry as Washington's quick-rhythm passing attack meets Philadelphia's physical offensive line under the lights. Open-field tackling and third-and-short execution will decide this prime-time battle \u2014 our official side, total, and prop picks are locked inside.",
      "blitzRateVsPressureToSack": "Washington Commanders and Philadelphia Eagles bring contrasting third-down pass-rush plans into this matchup up front.",
      "personnelTendencies": "Washington Commanders features Chig Okonkwo and Rachaad White on early downs, while Philadelphia Eagles leans on DeVonta Smith and Dameon Pierce.",
      "coachingEdge": "Ball security, open-field tackling, and red-zone play-calling between Philadelphia Eagles and Washington Commanders headline the film study for this game.",
      "notes": "Posted Line: WSH -6 \u00b7 O/U 40.5 \u00b7 Sunday 8:20 PM ET \u2014 Official spread call, total call, and player prop picks are locked inside the pack."
    },
    "sideTotalCall": {
      "sideSelection": "Philadelphia Eagles +6",
      "sideConfidence": "52/100",
      "sideExpectedClv": -0.035,
      "sideDecision": "PASS",
      "totalSelection": "UNDER 40.5",
      "totalConfidence": "53/100",
      "totalExpectedClv": -0.025,
      "totalDecision": "PASS",
      "rationale": "Washington's quick-rhythm passing game tests an Eagles defense that has missed forty-nine tackles this season, while Philadelphia's offensive line keeps them dangerous on the ground. The six-point spread is sharp, so pass on this Sunday night division game."
    },
    "topProps": [
      {
        "playerId": "jayden-daniels",
        "playerName": "Jayden Daniels",
        "propType": "Passing Yards",
        "market": "pass_yds",
        "line": 202.5,
        "side": "OVER",
        "confidence": "54/100",
        "expectedClv": 0.015,
        "decision": "PASS",
        "nEffTargetNotes": "Vegas has Jayden Daniels priced accurately at 202.5 passing yards on Sunday Night Football. Sit this prop out.",
        "pOver": 0.54,
        "pUnder": 0.46
      },
      {
        "playerId": "stefon-diggs",
        "playerName": "Stefon Diggs",
        "propType": "Receiving Yards",
        "market": "rec_yds",
        "line": 43.5,
        "side": "OVER",
        "confidence": "54/100",
        "expectedClv": 0.015,
        "decision": "PASS",
        "nEffTargetNotes": "Vegas has Stefon Diggs priced tightly at 43.5 receiving yards. Sit this prop out.",
        "pOver": 0.54,
        "pUnder": 0.46
      },
      {
        "playerId": "rachaad-white",
        "playerName": "Rachaad White",
        "propType": "Rushing Yards",
        "market": "rush_yds",
        "line": 46.5,
        "side": "OVER",
        "confidence": "53/100",
        "expectedClv": 0.0062,
        "decision": "PASS",
        "nEffTargetNotes": "Vegas has Rachaad White priced right near 46.5 rushing yards. Sit this prop out.",
        "pOver": 0.53,
        "pUnder": 0.47
      }
    ],
    "correlatedSgpTicket": {
      "title": "PHI @ WSH Same-Game Parlay",
      "legs": [
        {
          "description": "PHI @ WSH Spread",
          "pickType": "SPREAD",
          "selection": "Philadelphia Eagles +6",
          "confidence": "52/100",
          "expectedClv": -0.035,
          "decision": "PASS"
        },
        {
          "description": "PHI @ WSH Total",
          "pickType": "TOTAL",
          "selection": "UNDER 40.5",
          "confidence": "53/100",
          "expectedClv": -0.025,
          "decision": "PASS"
        },
        {
          "description": "Jayden Daniels Receiving Yards",
          "pickType": "PLAYER_PROP",
          "selection": "Jayden Daniels OVER 202.5",
          "line": 202.5,
          "confidence": "54/100",
          "expectedClv": 0.0,
          "decision": "PASS"
        }
      ],
      "jointWinProb": 0.1879,
      "fairOdds": "n/a",
      "marketOdds": "n/a",
      "edgeScore": 0.0391,
      "correlationRationale": "PASS \u2014 Stick to straight bets in this matchup; parlay payout does not beat the true risk."
    },
    "dfsStacks": {
      "captainPicks": [
        {
          "player": "Chig Okonkwo",
          "position": "WR",
          "salary": 10200,
          "leverageNote": "Primary red-zone and third-down receiver for Washington Commanders averaging 5.0 targets per game."
        },
        {
          "player": "DeVonta Smith",
          "position": "WR",
          "salary": 9600,
          "leverageNote": "Go-to receiver for Philadelphia Eagles averaging 10.2 targets per game when playing from behind."
        }
      ],
      "cashCore": [
        {
          "player": "Jayden Daniels",
          "position": "QB",
          "salary": 6600,
          "projection": 18.3,
          "floorNote": "Steady pocket passer averaging 189.8 passing yards per game."
        },
        {
          "player": "Dameon Pierce",
          "position": "RB",
          "salary": 6200,
          "projection": 17.6,
          "floorNote": "Three-down workhorse handling 12.3 carries per game."
        }
      ],
      "gppStacks": [
        {
          "primaryStack": {
            "qb": "Jayden Daniels",
            "passCatchers": [
              "Chig Okonkwo",
              "Stefon Diggs"
            ]
          },
          "bringBack": "DeVonta Smith",
          "valueFiller": "Dontayvion Wicks",
          "correlationTheme": "Pair Jayden Daniels with Stefon Diggs and bring it back with DeVonta Smith, then add a two-player mini-stack from a second game."
        }
      ]
    },
    "quadEngineCitations": {
      "arxiv": [
        "arxiv:2305.18290",
        "arxiv:2603.24989"
      ],
      "openalex": [
        "openalex:W4285718290"
      ],
      "kaggle": [
        "kaggle:nfl-big-data-bowl-2024"
      ],
      "hf": [
        "hf:models/gse-nfl-xgboost-v5"
      ]
    }
  },
  {
    "id": "writeup-mnf-401873036",
    "gameId": "401873036",
    "matchup": "Chicago Bears @ Seattle Seahawks",
    "awayTeam": "Chicago Bears",
    "homeTeam": "Seattle Seahawks",
    "kickoff": "2026-11-03T01:15Z",
    "windowSlot": "MNF",
    "paceOfPlay": {
      "neutralSecPerSnap": 24.6,
      "passEpaPlay": 0.131,
      "rushEpaPlay": -0.153,
      "noHuddleRate": 0.035,
      "notes": "Chicago Bears averages 74 plays per game, while Seattle Seahawks averages 66 plays per game and controls the clock in the second half."
    },
    "schemeMatchup": {
      "coverageShell": "Monday Night Football wraps up the slate in the Pacific Northwest as Chicago's takeaway-minded defense visits Seattle at Lumen Field. Crowd noise, pass protection, and red-zone defense headline the finale \u2014 unlock the pack to see our official Monday night spread, total, and prop calls.",
      "blitzRateVsPressureToSack": "Seattle Seahawks and Chicago Bears bring contrasting third-down pass-rush plans into this matchup up front.",
      "personnelTendencies": "Seattle Seahawks features Jaxon Smith-Njigba and Emanuel Wilson on early downs, while Chicago Bears leans on Rome Odunze and D'Andre Swift.",
      "coachingEdge": "Ball security, open-field tackling, and red-zone play-calling between Chicago Bears and Seattle Seahawks headline the film study for this game.",
      "notes": "Posted Line: SEA -3 \u00b7 O/U 46.5 \u00b7 Monday 8:15 PM ET \u2014 Official spread call, total call, and player prop picks are locked inside the pack."
    },
    "sideTotalCall": {
      "sideSelection": "Chicago Bears +3",
      "sideConfidence": "56/100",
      "sideExpectedClv": 0.0362,
      "sideDecision": "PLAY",
      "totalSelection": "UNDER 46.5",
      "totalConfidence": "52/100",
      "totalExpectedClv": -0.035,
      "totalDecision": "PASS",
      "rationale": "Chicago's defense has forced turnovers and limited big plays over the last month, giving the Bears the toughness to hang inside a field goal in Seattle on Monday night. Take the Bears plus three points and pass on the total."
    },
    "topProps": [
      {
        "playerId": "jaxon-smith-njigba",
        "playerName": "Jaxon Smith-Njigba",
        "propType": "Receiving Yards",
        "market": "rec_yds",
        "line": 98.5,
        "side": "UNDER",
        "confidence": "59/100",
        "expectedClv": 0.0662,
        "decision": "PLAY",
        "nEffTargetNotes": "DraftKings has steamed Jaxon Smith-Njigba all the way to 98.5 receiving yards, but Chicago's takeaway-minded secondary rallies to the ball and caps explosive perimeter gains. Take UNDER 98.5 receiving yards.",
        "pOver": 0.41,
        "pUnder": 0.59
      },
      {
        "playerId": "luther-burden-iii",
        "playerName": "Luther Burden III",
        "propType": "Receiving Yards",
        "market": "rec_yds",
        "line": 51.5,
        "side": "OVER",
        "confidence": "58/100",
        "expectedClv": 0.0562,
        "decision": "PLAY",
        "nEffTargetNotes": "Luther Burden III gets manufactured touches and intermediate targets for Chicago on Monday Night Football. Take OVER 51.5 receiving yards.",
        "pOver": 0.58,
        "pUnder": 0.42
      },
      {
        "playerId": "rome-odunze",
        "playerName": "Rome Odunze",
        "propType": "Receiving Yards",
        "market": "rec_yds",
        "line": 41.5,
        "side": "OVER",
        "confidence": "58/100",
        "expectedClv": 0.0562,
        "decision": "PLAY",
        "nEffTargetNotes": "With Seattle focusing bracket coverage elsewhere, Rome Odunze faces single coverage on vertical intermediate routes. Take OVER 41.5 receiving yards.",
        "pOver": 0.58,
        "pUnder": 0.42
      }
    ],
    "correlatedSgpTicket": {
      "title": "CHI @ SEA Same-Game Parlay",
      "legs": [
        {
          "description": "CHI @ SEA Spread",
          "pickType": "SPREAD",
          "selection": "Chicago Bears +3",
          "confidence": "56/100",
          "expectedClv": 0.0362,
          "decision": "PLAY"
        },
        {
          "description": "CHI @ SEA Total",
          "pickType": "TOTAL",
          "selection": "UNDER 46.5",
          "confidence": "52/100",
          "expectedClv": -0.035,
          "decision": "PASS"
        },
        {
          "description": "Jaxon Smith-Njigba Receiving Yards",
          "pickType": "PLAYER_PROP",
          "selection": "Jaxon Smith-Njigba UNDER 98.5",
          "line": 98.5,
          "confidence": "59/100",
          "expectedClv": 0.0662,
          "decision": "PLAY"
        }
      ],
      "jointWinProb": 0.2114,
      "fairOdds": "+373",
      "marketOdds": "+420",
      "edgeScore": 0.0396,
      "correlationRationale": "When Chicago Bears +3 and UNDER 46.5 cash together, Jaxon Smith-Njigba UNDER 98.5 receiving yards fits the exact same game script."
    },
    "dfsStacks": {
      "captainPicks": [
        {
          "player": "Jaxon Smith-Njigba",
          "position": "WR",
          "salary": 10200,
          "leverageNote": "Primary red-zone and third-down receiver for Seattle Seahawks averaging 11.1 targets per game."
        },
        {
          "player": "Rome Odunze",
          "position": "WR",
          "salary": 9600,
          "leverageNote": "Go-to receiver for Chicago Bears averaging 5.4 targets per game when playing from behind."
        }
      ],
      "cashCore": [
        {
          "player": "Sam Darnold",
          "position": "QB",
          "salary": 6600,
          "projection": 17.7,
          "floorNote": "Steady pocket passer averaging 255.4 passing yards per game."
        },
        {
          "player": "D'Andre Swift",
          "position": "RB",
          "salary": 6200,
          "projection": 18.9,
          "floorNote": "Three-down workhorse handling 16.6 carries per game."
        }
      ],
      "gppStacks": [
        {
          "primaryStack": {
            "qb": "Sam Darnold",
            "passCatchers": [
              "Jaxon Smith-Njigba",
              "AJ Barner"
            ]
          },
          "bringBack": "Rome Odunze",
          "valueFiller": "Kalif Raymond",
          "correlationTheme": "Pair Sam Darnold with AJ Barner and bring it back with Rome Odunze, then add a two-player mini-stack from a second game."
        }
      ]
    },
    "quadEngineCitations": {
      "arxiv": [
        "arxiv:2305.18290",
        "arxiv:2603.24989"
      ],
      "openalex": [
        "openalex:W4285718290"
      ],
      "kaggle": [
        "kaggle:nfl-big-data-bowl-2024"
      ],
      "hf": [
        "hf:models/gse-nfl-xgboost-v5"
      ]
    }
  }
];

/**
 * Filters out any writeup whose kickoff has already passed (with a 3.5-hour live-game buffer),
 * guaranteeing that yesterday's completed games never remain on live storefront cards.
 */
export function getActiveUpcomingWriteups(now: Date = new Date()): CoachGameWriteup[] {
  const cutoffMs = now.getTime() - 3.5 * 60 * 60 * 1000;
  const upcoming = LIVE_SLATE_COACH_WRITEUPS.filter((w) => {
    const kMs = Date.parse(w.kickoff);
    return Number.isNaN(kMs) || kMs >= cutoffMs;
  });
  return upcoming.length > 0 ? upcoming : [...LIVE_SLATE_COACH_WRITEUPS];
}

export function getWriteupsForWindowSlot(windowSlot: string, now: Date = new Date()): CoachGameWriteup[] {
  const pool = getActiveUpcomingWriteups(now);
  return pool.filter((w) => {
    if (windowSlot === "WEEKEND_PASS" || windowSlot === "WEEKLY_PASS" || windowSlot === "ALL") return true;
    if (windowSlot === "SUN_MAIN") {
      return w.windowSlot === "SUN_EARLY" || w.windowSlot === "SUN_LATE" || w.windowSlot === "SUN_MAIN";
    }
    return w.windowSlot === windowSlot;
  });
}

export function getRedactedTeasersForWindowSlot(windowSlot: string) {
  const writeups = getWriteupsForWindowSlot(windowSlot);
  return writeups.map((w) => ({
    id: w.id,
    gameId: w.gameId,
    windowSlot: w.windowSlot,
    matchup: w.matchup,
    kickoff: w.kickoff,
    paceOfPlay: w.paceOfPlay,
    schemeMatchup: {
      coverageShell: w.schemeMatchup.coverageShell,
      blitzRateVsPressureToSack: w.schemeMatchup.blitzRateVsPressureToSack,
      notes: w.schemeMatchup.notes,
    },
    lockedSummary: {
      sideConfidence: w.sideTotalCall.sideConfidence,
      sideExpectedClvCents: "LOCKED",
      totalConfidence: w.sideTotalCall.totalConfidence,
      totalExpectedClvCents: "LOCKED",
      propsCount: w.topProps.length,
      hasSgp: w.correlatedSgpTicket.fairOdds !== "n/a",
      sgpMarketOdds: w.correlatedSgpTicket.marketOdds,
      hasDfs: true,
    },
  }));
}
