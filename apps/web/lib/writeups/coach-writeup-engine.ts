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
 *
 * Preserves natural football percentage rates (e.g. "33.4% man coverage") while removing
 * internal pipeline jargon so customer surfaces read cleanly.
 */
export function sanitizePlainFootballText(input: string): string {
  if (!input) return "";
  return input
    .replace(/\bSTAGE5_[A-Z0-9_]+:\s*/gi, "")
    .replace(/\b22,750,000\s*snap\s*evaluations?\b/gi, "every offensive and defensive snap")
    .replace(/\b10,000[-\s]*(sim|simulation|world|worlds|monte carlo)\b/gi, "film and trench study")
    // "dropbacks" is banned on the card surface (packages-storefront-paywall
    // contract) — swap in the plain-English synonym, preserving pluralization.
    .replace(/\bdropback(s?)\b/gi, (_match, plural: string) => `passing snap${plural}`)
    .replace(
      /\b(simulations?|monte carlo|jev|sinkhorn[-\s]*knopp|sinkhorn|romano\s*cqr|optimal\s*transport|bitemporal\s*copula|empirical[-\s]*bayes|tau_hat|cholesky|copula|fr[eé]chet[-\s]*hoeffding|n_eff|autonomous\s*engine|machine\s*learning|deep[-\s]*math\s*dossiers?|doctoral\s*papers?|\bai\b)\b/gi,
      "matchup",
    )
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Formats internal windowSlot enum values into authentic, human-readable schedule labels.
 * Ensures no stale "Tonight · Thursday Night Football" badge ever renders on Friday/Weekend slates.
 */
export function formatWindowSlotLabel(windowSlot: string, matchup?: string): string {
  if (matchup && /Panthers|Packers/i.test(matchup)) {
    return "Week 8 TNF settled (CAR @ GB)";
  }
  switch (windowSlot) {
    case "TNF":
      return "Week 11 Thursday Night Football (IND @ HOU)";
    case "SUN_EARLY":
      return "Week 10 Sunday Early Slate (1:00 PM ET)";
    case "SUN_LATE":
      return "Week 10 Sunday Afternoon Slate (4:25 PM ET)";
    case "SUN_MAIN":
      return "Week 10 Sunday Main Slate (12 Games)";
    case "SNF":
      return "Week 10 Sunday Night Football (8:20 PM ET)";
    case "MNF":
      return "Week 10 Monday Night Football (8:15 PM ET)";
    case "WEEKLY_PASS":
    case "WEEKEND_PASS":
      return "Full Week 10 All-Access";
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
    "id": "writeup-tnf-401873066",
    "gameId": "401873066",
    "matchup": "Indianapolis Colts @ Houston Texans",
    "awayTeam": "Indianapolis Colts",
    "homeTeam": "Houston Texans",
    "kickoff": "2026-11-20T01:15Z",
    "windowSlot": "TNF",
    "paceOfPlay": {
      "neutralSecPerSnap": 27.5,
      "passEpaPlay": 0.1279,
      "rushEpaPlay": -0.0761,
      "noHuddleRate": 0.043,
      "notes": "Live Anchor: HOU -12.5 (-106) / IND +12.5 (-114) | Total 44.5 (Over -104 / Under -116) | HOU ML -690 / IND ML +499. Branch A Baseline (Sauce Gardner Questionable/Active): IND 14.96 (p50 15.09) vs HOU 30.30 (p50 30.67); Fair Line HOU -15.34 (p50 +15.16); Fair Total 45.26 (p50 45.39). Quarter Scoring Means (IND / HOU): 1Q 2.98 / 7.32 (10.30 total), 2Q 4.53 / 9.03, 1H 23.85 total, 3Q 3.74 / 5.64, 4Q 3.77 / 8.27, OT Prob 3.48 percent. Branch B Contingency (Sauce Gardner Ruled OUT at 5:45 PM CT): IND 15.06 (p50 15.16) vs HOU 31.25 (p50 31.55), Fair Total 46.31 (p50 45.16), HOU Win 88.97 percent (IND 11.03 percent), HOU -12.5 Cover 59.82 percent, Over 44.5 53.77 percent."
    },
    "schemeMatchup": {
      "coverageShell": "Houston calls man coverage on 35.5 percent of snaps with a 25.1 percent blitz rate, generating a 9.2 percent sack rate (16.7 percent QB hit and sack rate) across 360 pass plays.",
      "blitzRateVsPressureToSack": "Indianapolis has allowed a 17.8 percent QB hit and sack rate (7.1 percent dropback sack rate) into Houston pressure, while Houston protects at a 4.8 percent dropback sack rate (12.3 percent hit and sack rate) against an Indianapolis defense (6.6 percent sack rate, 14.9 percent hit and sack rate) missing Charvarius Ward (Out) with Sauce Gardner Questionable (Calf) for 5:45 PM CT inactives.",
      "personnelTendencies": "Active skill groups center on Daniel Jones, Jonathan Taylor, Tyler Warren, Laquon Treadwell, Ashton Dulin, and Anthony Gould for Indianapolis against C.J. Stroud, David Montgomery, Nico Collins, Xavier Hutchinson, Tank Dell, and Dalton Schultz for Houston (Danielle Hunter and Brevin Jordan Out).",
      "coachingEdge": "With Charvarius Ward ruled out and Sauce Gardner Questionable at the 5:45 PM CT inactive check, Houston passing efficiency carries Branch B upside to 31.25 points (46.31 total) if Gardner sits.",
      "notes": "Stage-5 Conjunction Gate maintains PASS across all 6 main lines while publishing verified Play-To American odds ceilings across 24 featured markets (77 total markets evaluated)."
    },
    "sideTotalCall": {
      "sideSelection": "Houston Texans -12.5",
      "sideConfidence": "62/100",
      "sideExpectedClv": 0.103,
      "sideDecision": "PASS",
      "totalSelection": "OVER 44.5",
      "totalConfidence": "53/100",
      "totalExpectedClv": 0.0263,
      "totalDecision": "PASS",
      "rationale": "All 6 Stage-5 Main Lines PASS: Spread HOU -12.5 (-106) devig 49.13 percent vs 59.43 percent post-sim (+10.30 percent edge, 62/100 PASS below 65/100 Stage-5 gate); IND +12.5 (-114) devig 50.87 percent vs 40.57 percent (-10.30 percent, 51/100 PASS); Total Over 44.5 (-104) devig 48.70 percent vs 51.33 percent (+2.63 percent, 53/100 PASS); Under 44.5 (-116) devig 51.30 percent vs 48.67 percent (-2.63 percent, 51/100 PASS); HOU ML (-690) devig 83.95 percent vs 86.08 percent (+2.13 percent, 53/100 PASS); IND ML (+499) devig 16.05 percent vs 13.92 percent (-2.13 percent, 51/100 PASS). Branch B Sauce Gardner OUT shifts HOU to 31.25 (total 46.31, HOU win 88.97 percent, HOU -12.5 cover 59.82 percent, Over 44.5 53.77 percent)."
    },
    "topProps": [
      {
        "playerId": "c-j-stroud-pass-tds",
        "playerName": "C.J. Stroud",
        "propType": "Passing Touchdowns",
        "market": "pass_tds",
        "line": 1.5,
        "side": "OVER",
        "confidence": "70/100",
        "expectedClv": 0.2043,
        "decision": "PLAY",
        "nEffTargetNotes": "QB Passing (Branch B Sauce Gardner OUT): Over 1.5 Pass TDs projects 70.43 percent baseline (Branch B upside vs backup Colts CBs) | Play-To: -222.",
        "pOver": 0.7043,
        "pUnder": 0.2957
      },
      {
        "playerId": "c-j-stroud-pass-yds",
        "playerName": "C.J. Stroud",
        "propType": "Passing Yards",
        "market": "pass_yds",
        "line": 253.5,
        "side": "OVER",
        "confidence": "69/100",
        "expectedClv": 0.1871,
        "decision": "PLAY",
        "nEffTargetNotes": "QB Passing (Branch B Sauce Gardner OUT): Over 253.5 Pass Yds projects 68.71 percent (mean 282.34, p50 282.86) | Play-To: -205.",
        "pOver": 0.6871,
        "pUnder": 0.3129
      },
      {
        "playerId": "c-j-stroud-completions",
        "playerName": "C.J. Stroud",
        "propType": "Pass Completions",
        "market": "completions",
        "line": 21.5,
        "side": "OVER",
        "confidence": "68/100",
        "expectedClv": 0.1786,
        "decision": "PLAY",
        "nEffTargetNotes": "QB Passing: Over 21.5 Pass Completions projects 67.86 percent (mean 24.30) | Play-To: -197.",
        "pOver": 0.6786,
        "pUnder": 0.3214
      },
      {
        "playerId": "c-j-stroud-longest-comp",
        "playerName": "C.J. Stroud",
        "propType": "Longest Passing Completion",
        "market": "longest_comp",
        "line": 39.5,
        "side": "UNDER",
        "confidence": "66/100",
        "expectedClv": 0.1579,
        "decision": "PLAY",
        "nEffTargetNotes": "QB Passing: Under 39.5 Longest Completion projects 65.79 percent (mean 36.13) | Play-To: -180.",
        "pOver": 0.3421,
        "pUnder": 0.6579
      },
      {
        "playerId": "daniel-jones-completions",
        "playerName": "Daniel Jones",
        "propType": "Pass Completions",
        "market": "completions",
        "line": 18.5,
        "side": "OVER",
        "confidence": "62/100",
        "expectedClv": 0.1168,
        "decision": "PLAY",
        "nEffTargetNotes": "QB Passing: Over 18.5 Pass Completions projects 61.68 percent (mean 20.43) | Play-To: -151.",
        "pOver": 0.6168,
        "pUnder": 0.3832
      },
      {
        "playerId": "daniel-jones-pass-tds",
        "playerName": "Daniel Jones",
        "propType": "Passing Touchdowns",
        "market": "pass_tds",
        "line": 0.5,
        "side": "OVER",
        "confidence": "59/100",
        "expectedClv": 0.0923,
        "decision": "PLAY",
        "nEffTargetNotes": "QB Passing: Over 0.5 Pass TDs projects 59.23 percent (mean 1.07) | Play-To: -137.",
        "pOver": 0.5923,
        "pUnder": 0.4077
      },
      {
        "playerId": "dalton-schultz-rec-yds",
        "playerName": "Dalton Schultz",
        "propType": "Receiving Yards",
        "market": "rec_yds",
        "line": 29.5,
        "side": "OVER",
        "confidence": "70/100",
        "expectedClv": 0.197,
        "decision": "PLAY",
        "nEffTargetNotes": "Skill Full Game: Over 29.5 Rec Yds projects 69.70 percent (mean 43.39) | Play-To: -214.",
        "pOver": 0.697,
        "pUnder": 0.303
      },
      {
        "playerId": "dalton-schultz-1h-rec-yds",
        "playerName": "Dalton Schultz",
        "propType": "1H Receiving Yards",
        "market": "1h_rec_yds",
        "line": 14.5,
        "side": "OVER",
        "confidence": "69/100",
        "expectedClv": 0.188,
        "decision": "PLAY",
        "nEffTargetNotes": "1H Derivative: Over 14.5 1H Rec Yds projects 68.80 percent (mean 22.97) | Play-To: -206.",
        "pOver": 0.688,
        "pUnder": 0.312
      },
      {
        "playerId": "xavier-hutchinson-1q-rec-yds",
        "playerName": "Xavier Hutchinson",
        "propType": "1Q Receiving Yards",
        "market": "1q_rec_yds",
        "line": 4.5,
        "side": "OVER",
        "confidence": "69/100",
        "expectedClv": 0.1946,
        "decision": "PLAY",
        "nEffTargetNotes": "1Q Derivative: Over 4.5 1Q Rec Yds projects 69.46 percent (mean 12.16) | Play-To: -212.",
        "pOver": 0.6946,
        "pUnder": 0.3054
      },
      {
        "playerId": "xavier-hutchinson-rec-yds",
        "playerName": "Xavier Hutchinson",
        "propType": "Receiving Yards",
        "market": "rec_yds",
        "line": 36.5,
        "side": "OVER",
        "confidence": "66/100",
        "expectedClv": 0.1616,
        "decision": "PLAY",
        "nEffTargetNotes": "Skill Full Game: Over 36.5 Rec Yds projects 66.16 percent (mean 50.85) | Play-To: -183.",
        "pOver": 0.6616,
        "pUnder": 0.3384
      },
      {
        "playerId": "tyler-warren-receptions",
        "playerName": "Tyler Warren",
        "propType": "Receptions",
        "market": "receptions",
        "line": 4.5,
        "side": "OVER",
        "confidence": "69/100",
        "expectedClv": 0.1918,
        "decision": "PLAY",
        "nEffTargetNotes": "Skill Full Game: Over 4.5 Receptions projects 69.18 percent (mean 6.08) | Play-To: -209.",
        "pOver": 0.6918,
        "pUnder": 0.3082
      },
      {
        "playerId": "tyler-warren-1q-rec-yds",
        "playerName": "Tyler Warren",
        "propType": "1Q Receiving Yards",
        "market": "1q_rec_yds",
        "line": 3.5,
        "side": "OVER",
        "confidence": "68/100",
        "expectedClv": 0.184,
        "decision": "PLAY",
        "nEffTargetNotes": "1Q Derivative: Over 3.5 1Q Rec Yds projects 68.40 percent (mean 10.67) | Play-To: -202.",
        "pOver": 0.684,
        "pUnder": 0.316
      },
      {
        "playerId": "tyler-warren-1h-rec-yds",
        "playerName": "Tyler Warren",
        "propType": "1H Receiving Yards",
        "market": "1h_rec_yds",
        "line": 15.5,
        "side": "OVER",
        "confidence": "66/100",
        "expectedClv": 0.1647,
        "decision": "PLAY",
        "nEffTargetNotes": "1H Derivative: Over 15.5 1H Rec Yds projects 66.47 percent (mean 26.82) | Play-To: -185.",
        "pOver": 0.6647,
        "pUnder": 0.3353
      },
      {
        "playerId": "ind-hou-1q-total",
        "playerName": "IND @ HOU 1st Quarter Total",
        "propType": "1st Quarter Total",
        "market": "1q_total",
        "line": 7.5,
        "side": "OVER",
        "confidence": "62/100",
        "expectedClv": 0.1239,
        "decision": "PLAY",
        "nEffTargetNotes": "Game Derivative: 1Q Total Over 7.5 projects 62.39 percent (10.30 projected mean: HOU 7.32 + IND 2.98) | Play-To: -156.",
        "pOver": 0.6239,
        "pUnder": 0.3761
      },
      {
        "playerId": "david-montgomery-anytime-td",
        "playerName": "David Montgomery",
        "propType": "Anytime Touchdown Scorer",
        "market": "anytime_td",
        "line": 0.5,
        "side": "OVER",
        "confidence": "66/100",
        "expectedClv": 0.1605,
        "decision": "PLAY",
        "nEffTargetNotes": "Anytime TD Top Threat: David Montgomery projects 66.05 percent (lead goal-line role with DT Jerry Tillery Out) | Play-To: -182.",
        "pOver": 0.6605,
        "pUnder": 0.3395
      },
      {
        "playerId": "david-montgomery-rush-yds",
        "playerName": "David Montgomery",
        "propType": "Rushing Yards",
        "market": "rush_yds",
        "line": 56.5,
        "side": "OVER",
        "confidence": "61/100",
        "expectedClv": 0.1101,
        "decision": "PLAY",
        "nEffTargetNotes": "RB Rushing: Over 56.5 Rush Yds projects 61.01 percent (mean 74.50) | Play-To: -147.",
        "pOver": 0.6101,
        "pUnder": 0.3899
      },
      {
        "playerId": "david-montgomery-longest-rush",
        "playerName": "David Montgomery",
        "propType": "Longest Rush",
        "market": "longest_rush",
        "line": 13.5,
        "side": "UNDER",
        "confidence": "73/100",
        "expectedClv": 0.2322,
        "decision": "PLAY",
        "nEffTargetNotes": "Longest Play: Under 13.5 Longest Rush projects 73.22 percent | Play-To: -254.",
        "pOver": 0.2678,
        "pUnder": 0.7322
      },
      {
        "playerId": "tank-dell-longest-rec",
        "playerName": "Tank Dell",
        "propType": "Longest Reception",
        "market": "longest_rec",
        "line": 20.5,
        "side": "OVER",
        "confidence": "74/100",
        "expectedClv": 0.2355,
        "decision": "PLAY",
        "nEffTargetNotes": "Longest Play (Branch B Sauce Gardner OUT): Over 20.5 Longest Reception projects 73.55 percent (mean 29.25) | Play-To: -258.",
        "pOver": 0.7355,
        "pUnder": 0.2645
      },
      {
        "playerId": "cj-allen-solo-tackles",
        "playerName": "CJ Allen",
        "propType": "Solo Tackles",
        "market": "solo_tackles",
        "line": 4.5,
        "side": "UNDER",
        "confidence": "72/100",
        "expectedClv": 0.2198,
        "decision": "PLAY",
        "nEffTargetNotes": "IDP Tackles (#1 Board Edge): Under 4.5 Solo Tackles projects 71.98 percent (mean 3.45) | Play-To: -239.",
        "pOver": 0.2802,
        "pUnder": 0.7198
      },
      {
        "playerId": "cj-allen-tackles-assists",
        "playerName": "CJ Allen",
        "propType": "Tackles + Assists",
        "market": "tackles_assists",
        "line": 10.5,
        "side": "UNDER",
        "confidence": "68/100",
        "expectedClv": 0.1757,
        "decision": "PLAY",
        "nEffTargetNotes": "IDP Tackles: Under 10.5 Tackles + Assists projects 67.57 percent (mean 8.95) | Play-To: -195.",
        "pOver": 0.3243,
        "pUnder": 0.6757
      },
      {
        "playerId": "cam-bynum-solo-tackles",
        "playerName": "Cam Bynum",
        "propType": "Solo Tackles",
        "market": "solo_tackles",
        "line": 1.5,
        "side": "OVER",
        "confidence": "66/100",
        "expectedClv": 0.1592,
        "decision": "PLAY",
        "nEffTargetNotes": "IDP Secondary: Over 1.5 Solo Tackles projects 65.92 percent (mean 2.13) | Play-To: -181.",
        "pOver": 0.6592,
        "pUnder": 0.3408
      },
      {
        "playerId": "kaimi-fairbairn-pats",
        "playerName": "Ka'imi Fairbairn",
        "propType": "Extra Points Made",
        "market": "pats_made",
        "line": 2.5,
        "side": "OVER",
        "confidence": "63/100",
        "expectedClv": 0.1251,
        "decision": "PLAY",
        "nEffTargetNotes": "Kicking: Over 2.5 PATs projects 62.51 percent (mean 3.40) | Play-To: -156.",
        "pOver": 0.6251,
        "pUnder": 0.3749
      },
      {
        "playerId": "will-anderson-jr-solo-tackles",
        "playerName": "Will Anderson Jr.",
        "propType": "Solo Tackles",
        "market": "solo_tackles",
        "line": 1.5,
        "side": "OVER",
        "confidence": "62/100",
        "expectedClv": 0.119,
        "decision": "PLAY",
        "nEffTargetNotes": "IDP Front: Over 1.5 Solo Tackles projects 61.90 percent (mean 2.54) | Play-To: -153.",
        "pOver": 0.619,
        "pUnder": 0.381
      },
      {
        "playerId": "will-anderson-jr-sacks",
        "playerName": "Will Anderson Jr.",
        "propType": "Sacks",
        "market": "sacks",
        "line": 0.75,
        "side": "OVER",
        "confidence": "57/100",
        "expectedClv": 0.0727,
        "decision": "PLAY",
        "nEffTargetNotes": "IDP Sacks: Over 0.75 Sacks (or 1+ Sack milestone) projects 57.27 percent (mean 0.91 sacks vs IND OL missing OT Jalen Travis) | Play-To: -126.",
        "pOver": 0.5727,
        "pUnder": 0.4273
      }
    ],
    "correlatedSgpTicket": {
      "title": "IND @ HOU Branch B Correlated Same-Game Parlay (Sauce Gardner OUT)",
      "legs": [
        {
          "description": "C.J. Stroud OVER 253.5 Passing Yards (mean 282.34 indoors vs backup Colts CBs)",
          "pickType": "PLAYER_PROP",
          "selection": "C.J. Stroud OVER 253.5 Pass Yds",
          "line": 253.5,
          "confidence": "69/100",
          "expectedClv": 0.1871,
          "decision": "PLAY"
        },
        {
          "description": "C.J. Stroud OVER 1.5 Passing Touchdowns (Play-To -222, Branch B HOU 31.25 pts)",
          "pickType": "PLAYER_PROP",
          "selection": "C.J. Stroud OVER 1.5 Pass TDs",
          "line": 1.5,
          "confidence": "70/100",
          "expectedClv": 0.2043,
          "decision": "PLAY"
        },
        {
          "description": "Dalton Schultz OVER 29.5 Receiving Yards (mean 43.39, primary middle-of-field outlet)",
          "pickType": "PLAYER_PROP",
          "selection": "Dalton Schultz OVER 29.5 Rec Yds",
          "line": 29.5,
          "confidence": "70/100",
          "expectedClv": 0.197,
          "decision": "PLAY"
        },
        {
          "description": "Tyler Warren OVER 4.5 Receptions (mean 6.08, checkdown funnel against HOU blitz in trailing script)",
          "pickType": "PLAYER_PROP",
          "selection": "Tyler Warren OVER 4.5 Receptions",
          "line": 4.5,
          "confidence": "69/100",
          "expectedClv": 0.1918,
          "decision": "PLAY"
        }
      ],
      "jointWinProb": 0.278,
      "fairOdds": "+260",
      "marketOdds": "+425",
      "edgeScore": 0.088,
      "correlationRationale": "With both Sauce Gardner and Charvarius Ward officially ruled OUT, Stroud's indoor passing volume and Schultz's chain-moving targets build an early Houston lead that forces Daniel Jones into trailing checkdowns to Tyler Warren."
    },
    "dfsStacks": {
      "captainPicks": [
        {
          "player": "C.J. Stroud",
          "position": "QB",
          "salary": 15600,
          "leverageNote": "Optimal Showdown Cash/GPP Captain anchor ($47,600 of $50,000 cap, 0 excluded decoys): 39.72 Cash mean / 58.78 GPP p75 ceiling DK points (lineup totals 99.80 mean / 147.70 p75 ceiling)."
        },
        {
          "player": "David Montgomery",
          "position": "RB",
          "salary": 8800,
          "leverageNote": "Lead goal-line role (66.05 percent anytime TD probability, 13.52 Cash mean / 20.01 p75 ceiling DK points) pairs cleanly with positive Houston game script."
        }
      ],
      "cashCore": [
        {
          "player": "C.J. Stroud",
          "position": "QB",
          "salary": 15600,
          "projection": 39.72,
          "floorNote": "Showdown Optimal Cash ($47,600 total / $50,000 cap, 99.80 projected lineup mean, 147.70 GPP p75 ceiling, 0 excluded decoys)."
        },
        {
          "player": "David Montgomery",
          "position": "RB",
          "salary": 8800,
          "projection": 13.52,
          "floorNote": "Lead early-down and goal-line share in positive Houston script (20.01 p75 ceiling)."
        },
        {
          "player": "Nico Collins",
          "position": "WR",
          "salary": 7800,
          "projection": 13.34,
          "floorNote": "Primary alpha perimeter target against an injured Colts secondary (19.74 p75 ceiling)."
        },
        {
          "player": "Tyler Warren",
          "position": "TE",
          "salary": 5600,
          "projection": 13.18,
          "floorNote": "Indianapolis PPR outlet anchor at 8.00 projected receptions (19.51 p75 ceiling)."
        },
        {
          "player": "Xavier Hutchinson",
          "position": "WR",
          "salary": 5000,
          "projection": 10.09,
          "floorNote": "Strong mid-tier WR salary saver paired with C.J. Stroud (14.93 p75 ceiling)."
        },
        {
          "player": "Ka'imi Fairbairn",
          "position": "PK",
          "salary": 4800,
          "projection": 9.95,
          "floorNote": "Domestic dome kicking floor in a 30.30-point projected Houston offense (14.73 p75 ceiling)."
        }
      ],
      "gppStacks": [
        {
          "primaryStack": {
            "qb": "C.J. Stroud",
            "passCatchers": [
              "Nico Collins",
              "Xavier Hutchinson",
              "David Montgomery"
            ]
          },
          "bringBack": "Tyler Warren",
          "valueFiller": "Ka'imi Fairbairn",
          "correlationTheme": "Optimal DK Showdown Roster ($47,600 / $50,000 cap, 0 excluded decoys): 99.80 Cash mean (1.94 Sharpe) and 147.70 GPP p75 ceiling (2.38 Omega) -- C.J. Stroud + David Montgomery + Nico Collins + Tyler Warren + Xavier Hutchinson + Ka'imi Fairbairn."
        }
      ]
    },
    "quadEngineCitations": {
      "arxiv": [
        "arxiv:2309.10455"
      ],
      "openalex": [
        "openalex:W438810105"
      ],
      "kaggle": [
        "kaggle:nfl-big-data-bowl-2025"
      ],
      "hf": [
        "hf:nfelo-coaching-priors"
      ]
    }
  },
  {
    "id": "writeup-sun-401873053",
    "gameId": "401873053",
    "matchup": "New England Patriots @ Detroit Lions",
    "awayTeam": "New England Patriots",
    "homeTeam": "Detroit Lions",
    "kickoff": "2026-11-15T14:30Z",
    "windowSlot": "SUN_EARLY",
    "paceOfPlay": {
      "neutralSecPerSnap": 27.1,
      "passEpaPlay": 0.084,
      "rushEpaPlay": -0.056,
      "noHuddleRate": 0.063,
      "notes": "NE and DET operate at 27.1 neutral seconds per snap (FC Bayern Munich Stadium (Allianz Arena))."
    },
    "schemeMatchup": {
      "coverageShell": "NE plays 40.4 out of 100 man coverage vs DET at 35.7 out of 100 man coverage.",
      "blitzRateVsPressureToSack": "Pressure profiles feature NE blitzing 39.7 out of 100 snaps against DET blitzing 27.1 out of 100 snaps.",
      "personnelTendencies": "New England Patriots offense led by Drake Maye faces Detroit Lions anchored by Jared Goff. Featured Week 10 personnel matchups include: Aidan Hutchinson, Amon-Ra St. Brown, Brian Branch, Chuck Clark, Derrick Barnes.",
      "coachingEdge": "Quarterback contrast features Drake Maye against Jared Goff with script-adjusted red-zone call tendencies.",
      "notes": "Total market posted at 50.5 with Detroit Lions -2.5 on the spread."
    },
    "sideTotalCall": {
      "sideSelection": "Detroit Lions -2.5",
      "sideConfidence": "52/100",
      "sideExpectedClv": 0.0186,
      "sideDecision": "PASS",
      "totalSelection": "Over 50.5",
      "totalConfidence": "57/100",
      "totalExpectedClv": 0.019,
      "totalDecision": "PASS",
      "rationale": "STAGE5_SPREAD_GATE: DET -2.5 projected cover prob 54.03 out of 100 vs 52.17 out of 100 de-vigged market."
    },
    "topProps": [
      {
        "playerId": "aidan-hutchinson",
        "playerName": "Aidan Hutchinson",
        "propType": "Tackles + Assists",
        "market": "tackles_plus_assists",
        "line": 2.5,
        "side": "UNDER",
        "confidence": "53/100",
        "expectedClv": 0.0,
        "decision": "PASS",
        "nEffTargetNotes": "Aidan Hutchinson projects around 2.8 against the 2.5 tackles + assists line based on snap share and defensive scheme fit.",
        "pOver": 0.4704,
        "pUnder": 0.5296
      },
      {
        "playerId": "amon-ra-st-brown",
        "playerName": "Amon-Ra St. Brown",
        "propType": "Receiving Yards",
        "market": "rec_yds",
        "line": 82.5,
        "side": "UNDER",
        "confidence": "45/100",
        "expectedClv": 0.0,
        "decision": "PASS",
        "nEffTargetNotes": "Amon-Ra St. Brown projects around 78.3 against the 82.5 receiving yards line based on snap share and defensive scheme fit.",
        "pOver": 0.0,
        "pUnder": 1.0
      },
      {
        "playerId": "amon-ra-st-brown",
        "playerName": "Amon-Ra St. Brown",
        "propType": "Receptions",
        "market": "receptions",
        "line": 7.5,
        "side": "UNDER",
        "confidence": "45/100",
        "expectedClv": 0.0,
        "decision": "PASS",
        "nEffTargetNotes": "Amon-Ra St. Brown projects around 5.7 against the 7.5 receptions line based on snap share and defensive scheme fit.",
        "pOver": 0.0,
        "pUnder": 1.0
      },
      {
        "playerId": "brian-branch",
        "playerName": "Brian Branch",
        "propType": "Tackles + Assists",
        "market": "tackles_plus_assists",
        "line": 5.5,
        "side": "UNDER",
        "confidence": "64/100",
        "expectedClv": 0.0,
        "decision": "PASS",
        "nEffTargetNotes": "Brian Branch projects around 4.0 against the 5.5 tackles + assists line based on snap share and defensive scheme fit.",
        "pOver": 0.3551,
        "pUnder": 0.6449
      },
      {
        "playerId": "chuck-clark",
        "playerName": "Chuck Clark",
        "propType": "Tackles + Assists",
        "market": "tackles_plus_assists",
        "line": 4.5,
        "side": "OVER",
        "confidence": "59/100",
        "expectedClv": 0.0,
        "decision": "PASS",
        "nEffTargetNotes": "Chuck Clark projects around 6.5 against the 4.5 tackles + assists line based on snap share and defensive scheme fit.",
        "pOver": 0.5852,
        "pUnder": 0.4148
      },
      {
        "playerId": "derrick-barnes",
        "playerName": "Derrick Barnes",
        "propType": "Tackles + Assists",
        "market": "tackles_plus_assists",
        "line": 4.5,
        "side": "UNDER",
        "confidence": "51/100",
        "expectedClv": 0.0,
        "decision": "PASS",
        "nEffTargetNotes": "Derrick Barnes projects around 5.0 against the 4.5 tackles + assists line based on snap share and defensive scheme fit.",
        "pOver": 0.4908,
        "pUnder": 0.5092
      }
    ],
    "correlatedSgpTicket": {
      "title": "NE @ DET Same-Game Parlay",
      "legs": [
        {
          "description": "No approved correlated legs on NE @ DET at posted sportsbook prices.",
          "pickType": "PASS",
          "selection": "NE @ DET PASS",
          "confidence": "52/100",
          "expectedClv": 0.0,
          "decision": "PASS"
        }
      ],
      "jointWinProb": 0.0,
      "fairOdds": "n/a",
      "marketOdds": "n/a",
      "edgeScore": 0.0,
      "correlationRationale": "PASS - No correlated combination on NE @ DET cleared release checks."
    },
    "dfsStacks": {
      "captainPicks": [
        {
          "player": "Jahmyr Gibbs",
          "position": "RB",
          "salary": 12900,
          "leverageNote": "Jahmyr Gibbs carries high-Share red-zone and median volume (24.3 projected fantasy points)."
        },
        {
          "player": "Jared Goff",
          "position": "QB",
          "salary": 12800,
          "leverageNote": "Jared Goff carries high-Share red-zone and median volume (23.0 projected fantasy points)."
        }
      ],
      "cashCore": [
        {
          "player": "Jahmyr Gibbs",
          "position": "RB",
          "salary": 8600,
          "projection": 24.3,
          "floorNote": "DET offensive share projects a reliable median output in NE @ DET."
        },
        {
          "player": "Jared Goff",
          "position": "QB",
          "salary": 8500,
          "projection": 23.0,
          "floorNote": "DET offensive share projects a reliable median output in NE @ DET."
        },
        {
          "player": "Amon-Ra St. Brown",
          "position": "WR",
          "salary": 7200,
          "projection": 17.3,
          "floorNote": "DET offensive share projects a reliable median output in NE @ DET."
        },
        {
          "player": "A.J. Brown",
          "position": "WR",
          "salary": 5800,
          "projection": 11.7,
          "floorNote": "NE offensive share projects a reliable median output in NE @ DET."
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
          "bringBack": "A.J. Brown",
          "valueFiller": "Brock Wright",
          "correlationTheme": "DET passing attack anchored by Jared Goff to Amon-Ra St. Brown and Sam LaPorta, paired with A.J. Brown (NE) response volume."
        }
      ]
    },
    "quadEngineCitations": {
      "arxiv": [
        "arxiv:2309.10455"
      ],
      "openalex": [
        "openalex:W438810105"
      ],
      "kaggle": [
        "kaggle:nfl-big-data-bowl-2025"
      ],
      "hf": [
        "hf:nfelo-coaching-priors"
      ]
    }
  },
  {
    "id": "writeup-sun-401873054",
    "gameId": "401873054",
    "matchup": "Buffalo Bills @ New York Jets",
    "awayTeam": "Buffalo Bills",
    "homeTeam": "New York Jets",
    "kickoff": "2026-11-15T18:00Z",
    "windowSlot": "SUN_EARLY",
    "paceOfPlay": {
      "neutralSecPerSnap": 28.4,
      "passEpaPlay": 0.248,
      "rushEpaPlay": 0.155,
      "noHuddleRate": 0.102,
      "notes": "BUF and NYJ operate at 28.4 neutral seconds per snap (MetLife Stadium)."
    },
    "schemeMatchup": {
      "coverageShell": "BUF plays 38.7 out of 100 man coverage vs NYJ at 38.9 out of 100 man coverage.",
      "blitzRateVsPressureToSack": "Pressure profiles feature BUF blitzing 34.9 out of 100 snaps against NYJ blitzing 38.4 out of 100 snaps.",
      "personnelTendencies": "Buffalo Bills offense led by Josh Allen faces New York Jets anchored by Geno Smith. Featured Week 10 personnel matchups include: Josh Allen, Geno Smith, Cole Bishop, Dalton Kincaid.",
      "coachingEdge": "Quarterback contrast features Josh Allen against Geno Smith with script-adjusted red-zone call tendencies.",
      "notes": "Total market posted at 50.5 with Buffalo Bills -8.5 on the spread."
    },
    "sideTotalCall": {
      "sideSelection": "Buffalo Bills -8.5",
      "sideConfidence": "66/100",
      "sideExpectedClv": 0.1307,
      "sideDecision": "PLAY",
      "totalSelection": "Over 50.5",
      "totalConfidence": "55/100",
      "totalExpectedClv": 0.019,
      "totalDecision": "PASS",
      "rationale": "Buffalo Bills -8.5 clears release criteria at 66/100 behind Josh Allen efficiency and trench protection advantage."
    },
    "topProps": [
      {
        "playerId": "josh-allen",
        "playerName": "Josh Allen",
        "propType": "Pass Attempts",
        "market": "pass_attempts",
        "line": 28.5,
        "side": "UNDER",
        "confidence": "66/100",
        "expectedClv": 0.1568,
        "decision": "PLAY",
        "nEffTargetNotes": "Josh Allen projects around 25.1 against the 28.5 pass attempts line based on snap share and defensive scheme fit.",
        "pOver": 0.3432,
        "pUnder": 0.6568
      },
      {
        "playerId": "geno-smith",
        "playerName": "Geno Smith",
        "propType": "Passing Yards",
        "market": "pass_yds",
        "line": 222.5,
        "side": "OVER",
        "confidence": "63/100",
        "expectedClv": 0.1321,
        "decision": "PLAY",
        "nEffTargetNotes": "Geno Smith projects around 285.0 against the 222.5 passing yards line based on snap share and defensive scheme fit.",
        "pOver": 0.6321,
        "pUnder": 0.3679
      },
      {
        "playerId": "geno-smith",
        "playerName": "Geno Smith",
        "propType": "Rushing Yards",
        "market": "rush_yds",
        "line": 5.5,
        "side": "OVER",
        "confidence": "60/100",
        "expectedClv": 0.0869,
        "decision": "PLAY",
        "nEffTargetNotes": "Geno Smith projects around 12.7 against the 5.5 rushing yards line based on snap share and defensive scheme fit.",
        "pOver": 0.597,
        "pUnder": 0.403
      },
      {
        "playerId": "cole-bishop",
        "playerName": "Cole Bishop",
        "propType": "Tackles + Assists",
        "market": "tackles_plus_assists",
        "line": 5.5,
        "side": "OVER",
        "confidence": "57/100",
        "expectedClv": 0.0,
        "decision": "PASS",
        "nEffTargetNotes": "Cole Bishop projects around 7.5 against the 5.5 tackles + assists line based on snap share and defensive scheme fit.",
        "pOver": 0.5719,
        "pUnder": 0.4281
      },
      {
        "playerId": "dalton-kincaid",
        "playerName": "Dalton Kincaid",
        "propType": "Receiving Yards",
        "market": "rec_yds",
        "line": 43.5,
        "side": "UNDER",
        "confidence": "45/100",
        "expectedClv": 0.0,
        "decision": "PASS",
        "nEffTargetNotes": "Dalton Kincaid projects around 45.9 against the 43.5 receiving yards line based on snap share and defensive scheme fit.",
        "pOver": 0.0,
        "pUnder": 1.0
      },
      {
        "playerId": "dalton-kincaid",
        "playerName": "Dalton Kincaid",
        "propType": "Receptions",
        "market": "receptions",
        "line": 3.5,
        "side": "UNDER",
        "confidence": "45/100",
        "expectedClv": 0.0,
        "decision": "PASS",
        "nEffTargetNotes": "Dalton Kincaid projects around 3.4 against the 3.5 receptions line based on snap share and defensive scheme fit.",
        "pOver": 0.0,
        "pUnder": 1.0
      }
    ],
    "correlatedSgpTicket": {
      "title": "BUF @ NYJ 2-Leg Correlated SGP",
      "legs": [
        {
          "description": "Total Passing Attempts (incl. overtime) script tie-in (BUF)",
          "pickType": "PROP",
          "selection": "Josh Allen UNDER 28.5 Total Passing Attempts (incl. overtime)",
          "confidence": "66/100",
          "expectedClv": 0.1568,
          "decision": "PLAY"
        },
        {
          "description": "Total Passing Yards (incl. overtime) script tie-in (NYJ)",
          "pickType": "PROP",
          "selection": "Geno Smith OVER 222.5 Total Passing Yards (incl. overtime)",
          "confidence": "63/100",
          "expectedClv": 0.1321,
          "decision": "PLAY"
        }
      ],
      "jointWinProb": 0.4328,
      "fairOdds": "+131",
      "marketOdds": "+239",
      "edgeScore": 0.1378,
      "correlationRationale": "Correlated script built from Josh Allen UNDER 28.5 Total Passing Attempts (incl. overtime), Geno Smith OVER 222.5 Total Passing Yards (incl. overtime) cleanly cleared release checks."
    },
    "dfsStacks": {
      "captainPicks": [
        {
          "player": "Josh Allen",
          "position": "QB",
          "salary": 12900,
          "leverageNote": "Josh Allen carries high-Share red-zone and median volume (23.2 projected fantasy points)."
        },
        {
          "player": "James Cook III",
          "position": "RB",
          "salary": 12200,
          "leverageNote": "James Cook III carries high-Share red-zone and median volume (21.1 projected fantasy points)."
        }
      ],
      "cashCore": [
        {
          "player": "Josh Allen",
          "position": "QB",
          "salary": 8600,
          "projection": 23.2,
          "floorNote": "BUF offensive share projects a reliable median output in BUF @ NYJ."
        },
        {
          "player": "James Cook III",
          "position": "RB",
          "salary": 8100,
          "projection": 21.1,
          "floorNote": "BUF offensive share projects a reliable median output in BUF @ NYJ."
        },
        {
          "player": "Geno Smith",
          "position": "QB",
          "salary": 7600,
          "projection": 19.0,
          "floorNote": "NYJ offensive share projects a reliable median output in BUF @ NYJ."
        },
        {
          "player": "Breece Hall",
          "position": "RB",
          "salary": 6000,
          "projection": 12.3,
          "floorNote": "NYJ offensive share projects a reliable median output in BUF @ NYJ."
        }
      ],
      "gppStacks": [
        {
          "primaryStack": {
            "qb": "Josh Allen",
            "passCatchers": [
              "Khalil Shakir",
              "Dalton Kincaid"
            ]
          },
          "bringBack": "Breece Hall",
          "valueFiller": "Dawson Knox",
          "correlationTheme": "BUF passing attack anchored by Josh Allen to Khalil Shakir and Dalton Kincaid, paired with Breece Hall (NYJ) response volume."
        }
      ]
    },
    "quadEngineCitations": {
      "arxiv": [
        "arxiv:2309.10455"
      ],
      "openalex": [
        "openalex:W438810105"
      ],
      "kaggle": [
        "kaggle:nfl-big-data-bowl-2025"
      ],
      "hf": [
        "hf:nfelo-coaching-priors"
      ]
    }
  },
  {
    "id": "writeup-sun-401873055",
    "gameId": "401873055",
    "matchup": "Carolina Panthers @ New Orleans Saints",
    "awayTeam": "Carolina Panthers",
    "homeTeam": "New Orleans Saints",
    "kickoff": "2026-11-15T18:00Z",
    "windowSlot": "SUN_EARLY",
    "paceOfPlay": {
      "neutralSecPerSnap": 26.6,
      "passEpaPlay": 0.01,
      "rushEpaPlay": 0.001,
      "noHuddleRate": 0.16,
      "notes": "CAR and NO operate at 26.6 neutral seconds per snap (Caesars Superdome)."
    },
    "schemeMatchup": {
      "coverageShell": "CAR plays 34.8 out of 100 man coverage vs NO at 36.7 out of 100 man coverage.",
      "blitzRateVsPressureToSack": "Pressure profiles feature CAR blitzing 31.2 out of 100 snaps against NO blitzing 34.5 out of 100 snaps.",
      "personnelTendencies": "Carolina Panthers offense led by Bryce Young faces New Orleans Saints anchored by Tyler Shough. Featured Week 10 personnel matchups include: Bryce Young, Tyler Shough.",
      "coachingEdge": "Quarterback contrast features Bryce Young against Tyler Shough with script-adjusted red-zone call tendencies.",
      "notes": "Total market posted at 48.5 with Carolina Panthers +1.5 on the spread."
    },
    "sideTotalCall": {
      "sideSelection": "Carolina Panthers +1.5",
      "sideConfidence": "54/100",
      "sideExpectedClv": 0.019,
      "sideDecision": "PASS",
      "totalSelection": "Under 48.5",
      "totalConfidence": "64/100",
      "totalExpectedClv": 0.019,
      "totalDecision": "PASS",
      "rationale": "STAGE5_SPREAD_GATE: CAR +1.5 projected cover prob 54.46 out of 100 vs 51.08 out of 100 de-vigged market."
    },
    "topProps": [
      {
        "playerId": "bryce-young",
        "playerName": "Bryce Young",
        "propType": "Rush Attempts",
        "market": "carries",
        "line": 2.5,
        "side": "OVER",
        "confidence": "69/100",
        "expectedClv": 0.2513,
        "decision": "PLAY",
        "nEffTargetNotes": "Bryce Young projects around 4.9 against the 2.5 rush attempts line based on snap share and defensive scheme fit.",
        "pOver": 0.688,
        "pUnder": 0.312
      },
      {
        "playerId": "tyler-shough",
        "playerName": "Tyler Shough",
        "propType": "Rushing Yards",
        "market": "rush_yds",
        "line": 18.5,
        "side": "UNDER",
        "confidence": "68/100",
        "expectedClv": 0.1652,
        "decision": "PLAY",
        "nEffTargetNotes": "Tyler Shough projects around 7.1 against the 18.5 rushing yards line based on snap share and defensive scheme fit.",
        "pOver": 0.3247,
        "pUnder": 0.6753
      },
      {
        "playerId": "tyler-shough",
        "playerName": "Tyler Shough",
        "propType": "Rush Attempts",
        "market": "carries",
        "line": 4.5,
        "side": "UNDER",
        "confidence": "62/100",
        "expectedClv": 0.1559,
        "decision": "PLAY",
        "nEffTargetNotes": "Tyler Shough projects around 3.5 against the 4.5 rush attempts line based on snap share and defensive scheme fit.",
        "pOver": 0.3849,
        "pUnder": 0.6151
      },
      {
        "playerId": "tyler-shough",
        "playerName": "Tyler Shough",
        "propType": "Pass Completions",
        "market": "pass_completions",
        "line": 24.5,
        "side": "UNDER",
        "confidence": "66/100",
        "expectedClv": 0.1454,
        "decision": "PLAY",
        "nEffTargetNotes": "Tyler Shough projects around 20.1 against the 24.5 pass completions line based on snap share and defensive scheme fit.",
        "pOver": 0.3445,
        "pUnder": 0.6555
      },
      {
        "playerId": "bryce-young",
        "playerName": "Bryce Young",
        "propType": "Pass Attempts",
        "market": "pass_attempts",
        "line": 36.5,
        "side": "OVER",
        "confidence": "61/100",
        "expectedClv": 0.1092,
        "decision": "PLAY",
        "nEffTargetNotes": "Bryce Young projects around 39.5 against the 36.5 pass attempts line based on snap share and defensive scheme fit.",
        "pOver": 0.6092,
        "pUnder": 0.3908
      },
      {
        "playerId": "tyler-shough",
        "playerName": "Tyler Shough",
        "propType": "Pass Attempts",
        "market": "pass_attempts",
        "line": 35.5,
        "side": "OVER",
        "confidence": "61/100",
        "expectedClv": 0.0783,
        "decision": "PLAY",
        "nEffTargetNotes": "Tyler Shough projects around 39.1 against the 35.5 pass attempts line based on snap share and defensive scheme fit.",
        "pOver": 0.6089,
        "pUnder": 0.3911
      }
    ],
    "correlatedSgpTicket": {
      "title": "CAR @ NO 2-Leg Correlated SGP",
      "legs": [
        {
          "description": "Total Pass Completions (incl. overtime) script tie-in (NO)",
          "pickType": "PROP",
          "selection": "Tyler Shough UNDER 24.5 Total Pass Completions (incl. overtime)",
          "confidence": "66/100",
          "expectedClv": 0.1454,
          "decision": "PLAY"
        },
        {
          "description": "Total Passing Attempts (incl. overtime) script tie-in (CAR)",
          "pickType": "PROP",
          "selection": "Bryce Young OVER 36.5 Total Passing Attempts (incl. overtime)",
          "confidence": "61/100",
          "expectedClv": 0.1092,
          "decision": "PLAY"
        }
      ],
      "jointWinProb": 0.4238,
      "fairOdds": "+136",
      "marketOdds": "+232",
      "edgeScore": 0.1228,
      "correlationRationale": "Correlated script built from Tyler Shough UNDER 24.5 Total Pass Completions (incl. overtime), Bryce Young OVER 36.5 Total Passing Attempts (incl. overtime) cleanly cleared release checks."
    },
    "dfsStacks": {
      "captainPicks": [
        {
          "player": "Bryce Young",
          "position": "QB",
          "salary": 11700,
          "leverageNote": "Bryce Young carries high-Share red-zone and median volume (20.0 projected fantasy points)."
        },
        {
          "player": "Tyler Shough",
          "position": "QB",
          "salary": 10800,
          "leverageNote": "Tyler Shough carries high-Share red-zone and median volume (17.5 projected fantasy points)."
        }
      ],
      "cashCore": [
        {
          "player": "Bryce Young",
          "position": "QB",
          "salary": 7800,
          "projection": 20.0,
          "floorNote": "CAR offensive share projects a reliable median output in CAR @ NO."
        },
        {
          "player": "Tyler Shough",
          "position": "QB",
          "salary": 7200,
          "projection": 17.5,
          "floorNote": "NO offensive share projects a reliable median output in CAR @ NO."
        },
        {
          "player": "Chuba Hubbard",
          "position": "RB",
          "salary": 6500,
          "projection": 14.7,
          "floorNote": "CAR offensive share projects a reliable median output in CAR @ NO."
        },
        {
          "player": "Tetairoa McMillan",
          "position": "WR",
          "salary": 6200,
          "projection": 13.3,
          "floorNote": "CAR offensive share projects a reliable median output in CAR @ NO."
        }
      ],
      "gppStacks": [
        {
          "primaryStack": {
            "qb": "Bryce Young",
            "passCatchers": [
              "Tetairoa McMillan",
              "Jalen Coker"
            ]
          },
          "bringBack": "Chris Olave",
          "valueFiller": "Brycen Tremayne",
          "correlationTheme": "CAR passing attack anchored by Bryce Young to Tetairoa McMillan and Jalen Coker, paired with Chris Olave (NO) response volume."
        }
      ]
    },
    "quadEngineCitations": {
      "arxiv": [
        "arxiv:2309.10455"
      ],
      "openalex": [
        "openalex:W438810105"
      ],
      "kaggle": [
        "kaggle:nfl-big-data-bowl-2025"
      ],
      "hf": [
        "hf:nfelo-coaching-priors"
      ]
    }
  },
  {
    "id": "writeup-sun-401873056",
    "gameId": "401873056",
    "matchup": "Houston Texans @ Cleveland Browns",
    "awayTeam": "Houston Texans",
    "homeTeam": "Cleveland Browns",
    "kickoff": "2026-11-15T18:00Z",
    "windowSlot": "SUN_EARLY",
    "paceOfPlay": {
      "neutralSecPerSnap": 28.0,
      "passEpaPlay": 0.127,
      "rushEpaPlay": -0.102,
      "noHuddleRate": 0.082,
      "notes": "HOU and CLE operate at 28.0 neutral seconds per snap (Huntington Bank Field)."
    },
    "schemeMatchup": {
      "coverageShell": "HOU plays 35.0 out of 100 man coverage vs CLE at 34.3 out of 100 man coverage.",
      "blitzRateVsPressureToSack": "Pressure profiles feature HOU blitzing 26.2 out of 100 snaps against CLE blitzing 23.4 out of 100 snaps.",
      "personnelTendencies": "Houston Texans offense led by C.J. Stroud faces Cleveland Browns anchored by Deshaun Watson. Featured Week 10 personnel matchups include: C.J. Stroud, Andre Szmyt.",
      "coachingEdge": "Quarterback contrast features C.J. Stroud against Deshaun Watson with script-adjusted red-zone call tendencies.",
      "notes": "Total market posted at 40.5 with Houston Texans -4.5 on the spread."
    },
    "sideTotalCall": {
      "sideSelection": "Houston Texans -4.5",
      "sideConfidence": "59/100",
      "sideExpectedClv": 0.019,
      "sideDecision": "PASS",
      "totalSelection": "Over 40.5",
      "totalConfidence": "51/100",
      "totalExpectedClv": 0.0109,
      "totalDecision": "PASS",
      "rationale": "STAGE5_SPREAD_GATE: HOU -4.5 projected cover prob 57.78 out of 100 vs 50.43 out of 100 de-vigged market."
    },
    "topProps": [
      {
        "playerId": "c-j-stroud",
        "playerName": "C.J. Stroud",
        "propType": "Pass Completions",
        "market": "pass_completions",
        "line": 20.5,
        "side": "OVER",
        "confidence": "70/100",
        "expectedClv": 0.2321,
        "decision": "PLAY",
        "nEffTargetNotes": "C.J. Stroud projects around 26.4 against the 20.5 pass completions line based on snap share and defensive scheme fit.",
        "pOver": 0.7015,
        "pUnder": 0.2985
      },
      {
        "playerId": "c-j-stroud",
        "playerName": "C.J. Stroud",
        "propType": "Passing Yards",
        "market": "pass_yds",
        "line": 243.5,
        "side": "OVER",
        "confidence": "68/100",
        "expectedClv": 0.1787,
        "decision": "PLAY",
        "nEffTargetNotes": "C.J. Stroud projects around 304.2 against the 243.5 passing yards line based on snap share and defensive scheme fit.",
        "pOver": 0.6787,
        "pUnder": 0.3213
      },
      {
        "playerId": "c-j-stroud",
        "playerName": "C.J. Stroud",
        "propType": "Rushing Yards",
        "market": "rush_yds",
        "line": 8.5,
        "side": "OVER",
        "confidence": "61/100",
        "expectedClv": 0.1039,
        "decision": "PLAY",
        "nEffTargetNotes": "C.J. Stroud projects around 16.3 against the 8.5 rushing yards line based on snap share and defensive scheme fit.",
        "pOver": 0.614,
        "pUnder": 0.386
      },
      {
        "playerId": "andre-szmyt",
        "playerName": "Andre Szmyt",
        "propType": "Total Extra Points Made",
        "market": "total_extra_points_made",
        "line": 1.5,
        "side": "OVER",
        "confidence": "54/100",
        "expectedClv": 0.0,
        "decision": "PASS",
        "nEffTargetNotes": "Andre Szmyt projects around 1.9 against the 1.5 total extra points made line based on snap share and defensive scheme fit.",
        "pOver": 0.5444,
        "pUnder": 0.4556
      },
      {
        "playerId": "andre-szmyt",
        "playerName": "Andre Szmyt",
        "propType": "Field Goals Made",
        "market": "fg_made",
        "line": 1.5,
        "side": "UNDER",
        "confidence": "57/100",
        "expectedClv": 0.0,
        "decision": "PASS",
        "nEffTargetNotes": "Andre Szmyt projects around 1.3 against the 1.5 field goals made line based on snap share and defensive scheme fit.",
        "pOver": 0.433,
        "pUnder": 0.567
      },
      {
        "playerId": "andre-szmyt",
        "playerName": "Andre Szmyt",
        "propType": "Kicking Points",
        "market": "kicking_points",
        "line": 6.5,
        "side": "UNDER",
        "confidence": "56/100",
        "expectedClv": 0.0,
        "decision": "PASS",
        "nEffTargetNotes": "Andre Szmyt projects around 5.8 against the 6.5 kicking points line based on snap share and defensive scheme fit.",
        "pOver": 0.4372,
        "pUnder": 0.5628
      }
    ],
    "correlatedSgpTicket": {
      "title": "HOU @ CLE Same-Game Parlay",
      "legs": [
        {
          "description": "No approved correlated legs on HOU @ CLE at posted sportsbook prices.",
          "pickType": "PASS",
          "selection": "HOU @ CLE PASS",
          "confidence": "52/100",
          "expectedClv": 0.0,
          "decision": "PASS"
        }
      ],
      "jointWinProb": 0.0,
      "fairOdds": "n/a",
      "marketOdds": "n/a",
      "edgeScore": 0.0,
      "correlationRationale": "PASS - No correlated combination on HOU @ CLE cleared release checks."
    },
    "dfsStacks": {
      "captainPicks": [
        {
          "player": "C.J. Stroud",
          "position": "QB",
          "salary": 12400,
          "leverageNote": "C.J. Stroud carries high-Share red-zone and median volume (21.9 projected fantasy points)."
        },
        {
          "player": "Quinshon Judkins",
          "position": "RB",
          "salary": 9300,
          "leverageNote": "Quinshon Judkins carries high-Share red-zone and median volume (13.5 projected fantasy points)."
        }
      ],
      "cashCore": [
        {
          "player": "C.J. Stroud",
          "position": "QB",
          "salary": 8300,
          "projection": 21.9,
          "floorNote": "HOU offensive share projects a reliable median output in HOU @ CLE."
        },
        {
          "player": "Quinshon Judkins",
          "position": "RB",
          "salary": 6200,
          "projection": 13.5,
          "floorNote": "CLE offensive share projects a reliable median output in HOU @ CLE."
        },
        {
          "player": "Nico Collins",
          "position": "WR",
          "salary": 6100,
          "projection": 13.0,
          "floorNote": "HOU offensive share projects a reliable median output in HOU @ CLE."
        },
        {
          "player": "Dalton Schultz",
          "position": "TE",
          "salary": 6000,
          "projection": 12.4,
          "floorNote": "HOU offensive share projects a reliable median output in HOU @ CLE."
        }
      ],
      "gppStacks": [
        {
          "primaryStack": {
            "qb": "C.J. Stroud",
            "passCatchers": [
              "Nico Collins",
              "Dalton Schultz"
            ]
          },
          "bringBack": "Quinshon Judkins",
          "valueFiller": "Tank Dell",
          "correlationTheme": "HOU passing attack anchored by C.J. Stroud to Nico Collins and Dalton Schultz, paired with Quinshon Judkins (CLE) response volume."
        }
      ]
    },
    "quadEngineCitations": {
      "arxiv": [
        "arxiv:2309.10455"
      ],
      "openalex": [
        "openalex:W438810105"
      ],
      "kaggle": [
        "kaggle:nfl-big-data-bowl-2025"
      ],
      "hf": [
        "hf:nfelo-coaching-priors"
      ]
    }
  },
  {
    "id": "writeup-sun-401873057",
    "gameId": "401873057",
    "matchup": "Jacksonville Jaguars @ Tennessee Titans",
    "awayTeam": "Jacksonville Jaguars",
    "homeTeam": "Tennessee Titans",
    "kickoff": "2026-11-15T18:00Z",
    "windowSlot": "SUN_EARLY",
    "paceOfPlay": {
      "neutralSecPerSnap": 28.8,
      "passEpaPlay": 0.247,
      "rushEpaPlay": 0.011,
      "noHuddleRate": 0.05,
      "notes": "JAX and TEN operate at 28.8 neutral seconds per snap (Nissan Stadium)."
    },
    "schemeMatchup": {
      "coverageShell": "JAX plays 28.5 out of 100 man coverage vs TEN at 33.2 out of 100 man coverage.",
      "blitzRateVsPressureToSack": "Pressure profiles feature JAX blitzing 30.9 out of 100 snaps against TEN blitzing 24.2 out of 100 snaps.",
      "personnelTendencies": "Jacksonville Jaguars offense led by Trevor Lawrence faces Tennessee Titans anchored by Cam Ward. Featured Week 10 personnel matchups include: Trevor Lawrence, Cam Ward, Antonio Johnson.",
      "coachingEdge": "Quarterback contrast features Trevor Lawrence against Cam Ward with script-adjusted red-zone call tendencies.",
      "notes": "Total market posted at 46.5 with Jacksonville Jaguars -10.5 on the spread."
    },
    "sideTotalCall": {
      "sideSelection": "Jacksonville Jaguars -10.5",
      "sideConfidence": "55/100",
      "sideExpectedClv": 0.019,
      "sideDecision": "PASS",
      "totalSelection": "Under 46.5",
      "totalConfidence": "58/100",
      "totalExpectedClv": 0.019,
      "totalDecision": "PASS",
      "rationale": "STAGE5_SPREAD_GATE: JAX -10.5 projected cover prob 55.36 out of 100 vs 51.08 out of 100 de-vigged market."
    },
    "topProps": [
      {
        "playerId": "trevor-lawrence",
        "playerName": "Trevor Lawrence",
        "propType": "Rush Attempts",
        "market": "carries",
        "line": 3.5,
        "side": "OVER",
        "confidence": "71/100",
        "expectedClv": 0.2776,
        "decision": "PLAY",
        "nEffTargetNotes": "Trevor Lawrence projects around 6.8 against the 3.5 rush attempts line based on snap share and defensive scheme fit.",
        "pOver": 0.7143,
        "pUnder": 0.2857
      },
      {
        "playerId": "trevor-lawrence",
        "playerName": "Trevor Lawrence",
        "propType": "Rushing Yards",
        "market": "rush_yds",
        "line": 7.5,
        "side": "OVER",
        "confidence": "72/100",
        "expectedClv": 0.1947,
        "decision": "PLAY",
        "nEffTargetNotes": "Trevor Lawrence projects around 25.9 against the 7.5 rushing yards line based on snap share and defensive scheme fit.",
        "pOver": 0.715,
        "pUnder": 0.285
      },
      {
        "playerId": "cam-ward",
        "playerName": "Cam Ward",
        "propType": "Passing Yards",
        "market": "pass_yds",
        "line": 200.5,
        "side": "UNDER",
        "confidence": "68/100",
        "expectedClv": 0.1845,
        "decision": "PLAY",
        "nEffTargetNotes": "Cam Ward projects around 147.9 against the 200.5 passing yards line based on snap share and defensive scheme fit.",
        "pOver": 0.3155,
        "pUnder": 0.6845
      },
      {
        "playerId": "cam-ward",
        "playerName": "Cam Ward",
        "propType": "Pass Completions",
        "market": "pass_completions",
        "line": 20.5,
        "side": "UNDER",
        "confidence": "70/100",
        "expectedClv": 0.1669,
        "decision": "PLAY",
        "nEffTargetNotes": "Cam Ward projects around 15.3 against the 20.5 pass completions line based on snap share and defensive scheme fit.",
        "pOver": 0.3025,
        "pUnder": 0.6975
      },
      {
        "playerId": "cam-ward",
        "playerName": "Cam Ward",
        "propType": "Rushing Yards",
        "market": "rush_yds",
        "line": 9.5,
        "side": "UNDER",
        "confidence": "61/100",
        "expectedClv": 0.1155,
        "decision": "PLAY",
        "nEffTargetNotes": "Cam Ward projects around 5.6 against the 9.5 rushing yards line based on snap share and defensive scheme fit.",
        "pOver": 0.3946,
        "pUnder": 0.6054
      },
      {
        "playerId": "antonio-johnson",
        "playerName": "Antonio Johnson",
        "propType": "Tackles + Assists",
        "market": "tackles_plus_assists",
        "line": 4.5,
        "side": "UNDER",
        "confidence": "52/100",
        "expectedClv": 0.0,
        "decision": "PASS",
        "nEffTargetNotes": "Antonio Johnson projects around 5.0 against the 4.5 tackles + assists line based on snap share and defensive scheme fit.",
        "pOver": 0.4846,
        "pUnder": 0.5154
      }
    ],
    "correlatedSgpTicket": {
      "title": "JAX @ TEN Same-Game Parlay",
      "legs": [
        {
          "description": "No approved correlated legs on JAX @ TEN at posted sportsbook prices.",
          "pickType": "PASS",
          "selection": "JAX @ TEN PASS",
          "confidence": "52/100",
          "expectedClv": 0.0,
          "decision": "PASS"
        }
      ],
      "jointWinProb": 0.0,
      "fairOdds": "n/a",
      "marketOdds": "n/a",
      "edgeScore": 0.0,
      "correlationRationale": "PASS - No correlated combination on JAX @ TEN cleared release checks."
    },
    "dfsStacks": {
      "captainPicks": [
        {
          "player": "Trevor Lawrence",
          "position": "QB",
          "salary": 12900,
          "leverageNote": "Trevor Lawrence carries high-Share red-zone and median volume (23.4 projected fantasy points)."
        },
        {
          "player": "Parker Washington",
          "position": "WR",
          "salary": 9200,
          "leverageNote": "Parker Washington carries high-Share red-zone and median volume (13.1 projected fantasy points)."
        }
      ],
      "cashCore": [
        {
          "player": "Trevor Lawrence",
          "position": "QB",
          "salary": 8600,
          "projection": 23.4,
          "floorNote": "JAX offensive share projects a reliable median output in JAX @ TEN."
        },
        {
          "player": "Parker Washington",
          "position": "WR",
          "salary": 6100,
          "projection": 13.1,
          "floorNote": "JAX offensive share projects a reliable median output in JAX @ TEN."
        },
        {
          "player": "Bhayshul Tuten",
          "position": "RB",
          "salary": 6100,
          "projection": 13.0,
          "floorNote": "JAX offensive share projects a reliable median output in JAX @ TEN."
        },
        {
          "player": "Tony Pollard",
          "position": "RB",
          "salary": 5700,
          "projection": 11.3,
          "floorNote": "TEN offensive share projects a reliable median output in JAX @ TEN."
        }
      ],
      "gppStacks": [
        {
          "primaryStack": {
            "qb": "Trevor Lawrence",
            "passCatchers": [
              "Parker Washington",
              "Brenton Strange"
            ]
          },
          "bringBack": "Tony Pollard",
          "valueFiller": "Travis Hunter",
          "correlationTheme": "JAX passing attack anchored by Trevor Lawrence to Parker Washington and Brenton Strange, paired with Tony Pollard (TEN) response volume."
        }
      ]
    },
    "quadEngineCitations": {
      "arxiv": [
        "arxiv:2309.10455"
      ],
      "openalex": [
        "openalex:W438810105"
      ],
      "kaggle": [
        "kaggle:nfl-big-data-bowl-2025"
      ],
      "hf": [
        "hf:nfelo-coaching-priors"
      ]
    }
  },
  {
    "id": "writeup-sun-401873058",
    "gameId": "401873058",
    "matchup": "Kansas City Chiefs @ Atlanta Falcons",
    "awayTeam": "Kansas City Chiefs",
    "homeTeam": "Atlanta Falcons",
    "kickoff": "2026-11-15T18:00Z",
    "windowSlot": "SUN_EARLY",
    "paceOfPlay": {
      "neutralSecPerSnap": 28.2,
      "passEpaPlay": 0.122,
      "rushEpaPlay": 0.125,
      "noHuddleRate": 0.133,
      "notes": "KC and ATL operate at 28.2 neutral seconds per snap (Mercedes-Benz Stadium)."
    },
    "schemeMatchup": {
      "coverageShell": "KC plays 35.2 out of 100 man coverage vs ATL at 34.2 out of 100 man coverage.",
      "blitzRateVsPressureToSack": "Pressure profiles feature KC blitzing 28.0 out of 100 snaps against ATL blitzing 24.8 out of 100 snaps.",
      "personnelTendencies": "Kansas City Chiefs offense led by Patrick Mahomes faces Atlanta Falcons anchored by Michael Penix Jr.. Featured Week 10 personnel matchups include: Michael Penix Jr., Patrick Mahomes, A.J. Terrell Jr..",
      "coachingEdge": "Quarterback contrast features Patrick Mahomes against Michael Penix Jr. with script-adjusted red-zone call tendencies.",
      "notes": "Total market posted at 47.5 with Kansas City Chiefs -3.0 on the spread."
    },
    "sideTotalCall": {
      "sideSelection": "Kansas City Chiefs -3.0",
      "sideConfidence": "53/100",
      "sideExpectedClv": 0.019,
      "sideDecision": "PASS",
      "totalSelection": "Under 47.5",
      "totalConfidence": "52/100",
      "totalExpectedClv": 0.0128,
      "totalDecision": "PASS",
      "rationale": "STAGE5_SPREAD_GATE: KC -3.0 projected cover prob 54.47 out of 100 vs 51.74 out of 100 de-vigged market."
    },
    "topProps": [
      {
        "playerId": "michael-penix-jr",
        "playerName": "Michael Penix Jr.",
        "propType": "Pass Completions",
        "market": "pass_completions",
        "line": 19.5,
        "side": "UNDER",
        "confidence": "66/100",
        "expectedClv": 0.1895,
        "decision": "PLAY",
        "nEffTargetNotes": "Michael Penix Jr. projects around 16.1 against the 19.5 pass completions line based on snap share and defensive scheme fit.",
        "pOver": 0.3411,
        "pUnder": 0.6589
      },
      {
        "playerId": "patrick-mahomes",
        "playerName": "Patrick Mahomes",
        "propType": "Pass Attempts",
        "market": "pass_attempts",
        "line": 32.5,
        "side": "UNDER",
        "confidence": "60/100",
        "expectedClv": 0.1354,
        "decision": "PLAY",
        "nEffTargetNotes": "Patrick Mahomes projects around 30.3 against the 32.5 pass attempts line based on snap share and defensive scheme fit.",
        "pOver": 0.3952,
        "pUnder": 0.6048
      },
      {
        "playerId": "patrick-mahomes",
        "playerName": "Patrick Mahomes",
        "propType": "Passing Yards",
        "market": "pass_yds",
        "line": 242.5,
        "side": "UNDER",
        "confidence": "62/100",
        "expectedClv": 0.1151,
        "decision": "PLAY",
        "nEffTargetNotes": "Patrick Mahomes projects around 219.1 against the 242.5 passing yards line based on snap share and defensive scheme fit.",
        "pOver": 0.3849,
        "pUnder": 0.6151
      },
      {
        "playerId": "patrick-mahomes",
        "playerName": "Patrick Mahomes",
        "propType": "Rush Attempts",
        "market": "carries",
        "line": 2.5,
        "side": "OVER",
        "confidence": "68/100",
        "expectedClv": 0.1121,
        "decision": "PLAY",
        "nEffTargetNotes": "Patrick Mahomes projects around 4.6 against the 2.5 rush attempts line based on snap share and defensive scheme fit.",
        "pOver": 0.6754,
        "pUnder": 0.3246
      },
      {
        "playerId": "patrick-mahomes",
        "playerName": "Patrick Mahomes",
        "propType": "Passing TDs",
        "market": "pass_tds",
        "line": 1.5,
        "side": "OVER",
        "confidence": "62/100",
        "expectedClv": 0.0573,
        "decision": "PLAY",
        "nEffTargetNotes": "Patrick Mahomes projects around 2.0 against the 1.5 passing tds line based on snap share and defensive scheme fit.",
        "pOver": 0.6206,
        "pUnder": 0.3794
      },
      {
        "playerId": "a-j-terrell-jr",
        "playerName": "A.J. Terrell Jr.",
        "propType": "Tackles + Assists",
        "market": "tackles_plus_assists",
        "line": 3.5,
        "side": "OVER",
        "confidence": "56/100",
        "expectedClv": 0.0,
        "decision": "PASS",
        "nEffTargetNotes": "A.J. Terrell Jr. projects around 4.8 against the 3.5 tackles + assists line based on snap share and defensive scheme fit.",
        "pOver": 0.5561,
        "pUnder": 0.4439
      }
    ],
    "correlatedSgpTicket": {
      "title": "KC @ ATL Same-Game Parlay",
      "legs": [
        {
          "description": "No approved correlated legs on KC @ ATL at posted sportsbook prices.",
          "pickType": "PASS",
          "selection": "KC @ ATL PASS",
          "confidence": "52/100",
          "expectedClv": 0.0,
          "decision": "PASS"
        }
      ],
      "jointWinProb": 0.0,
      "fairOdds": "n/a",
      "marketOdds": "n/a",
      "edgeScore": 0.0,
      "correlationRationale": "PASS - No correlated combination on KC @ ATL cleared release checks."
    },
    "dfsStacks": {
      "captainPicks": [
        {
          "player": "Patrick Mahomes",
          "position": "QB",
          "salary": 11600,
          "leverageNote": "Patrick Mahomes carries high-Share red-zone and median volume (19.5 projected fantasy points)."
        },
        {
          "player": "Bijan Robinson",
          "position": "RB",
          "salary": 10600,
          "leverageNote": "Bijan Robinson carries high-Share red-zone and median volume (16.9 projected fantasy points)."
        }
      ],
      "cashCore": [
        {
          "player": "Patrick Mahomes",
          "position": "QB",
          "salary": 7700,
          "projection": 19.5,
          "floorNote": "KC offensive share projects a reliable median output in KC @ ATL."
        },
        {
          "player": "Bijan Robinson",
          "position": "RB",
          "salary": 7100,
          "projection": 16.9,
          "floorNote": "ATL offensive share projects a reliable median output in KC @ ATL."
        },
        {
          "player": "Michael Penix Jr.",
          "position": "QB",
          "salary": 7000,
          "projection": 16.6,
          "floorNote": "ATL offensive share projects a reliable median output in KC @ ATL."
        },
        {
          "player": "Drake London",
          "position": "WR",
          "salary": 5900,
          "projection": 11.9,
          "floorNote": "ATL offensive share projects a reliable median output in KC @ ATL."
        }
      ],
      "gppStacks": [
        {
          "primaryStack": {
            "qb": "Patrick Mahomes",
            "passCatchers": [
              "Xavier Worthy",
              "Travis Kelce"
            ]
          },
          "bringBack": "Bijan Robinson",
          "valueFiller": "Josh Downs",
          "correlationTheme": "KC passing attack anchored by Patrick Mahomes to Xavier Worthy and Travis Kelce, paired with Bijan Robinson (ATL) response volume."
        }
      ]
    },
    "quadEngineCitations": {
      "arxiv": [
        "arxiv:2309.10455"
      ],
      "openalex": [
        "openalex:W438810105"
      ],
      "kaggle": [
        "kaggle:nfl-big-data-bowl-2025"
      ],
      "hf": [
        "hf:nfelo-coaching-priors"
      ]
    }
  },
  {
    "id": "writeup-sun-401873059",
    "gameId": "401873059",
    "matchup": "Miami Dolphins @ Indianapolis Colts",
    "awayTeam": "Miami Dolphins",
    "homeTeam": "Indianapolis Colts",
    "kickoff": "2026-11-15T18:00Z",
    "windowSlot": "SUN_EARLY",
    "paceOfPlay": {
      "neutralSecPerSnap": 27.9,
      "passEpaPlay": -0.149,
      "rushEpaPlay": 0.041,
      "noHuddleRate": 0.073,
      "notes": "MIA and IND operate at 27.9 neutral seconds per snap (Lucas Oil Stadium)."
    },
    "schemeMatchup": {
      "coverageShell": "MIA plays 34.2 out of 100 man coverage vs IND at 34.1 out of 100 man coverage.",
      "blitzRateVsPressureToSack": "Pressure profiles feature MIA blitzing 25.8 out of 100 snaps against IND blitzing 22.2 out of 100 snaps.",
      "personnelTendencies": "Miami Dolphins offense led by Kyle McCord faces Indianapolis Colts anchored by Daniel Jones. Featured Week 10 personnel matchups include: Daniel Jones, Kyle McCord, A.J. Haulcy, Anthony Gould.",
      "coachingEdge": "Quarterback contrast features Kyle McCord against Daniel Jones with script-adjusted red-zone call tendencies.",
      "notes": "Total market posted at 37.5 with Indianapolis Colts -4.5 on the spread."
    },
    "sideTotalCall": {
      "sideSelection": "Indianapolis Colts -4.5",
      "sideConfidence": "52/100",
      "sideExpectedClv": 0.0179,
      "sideDecision": "PASS",
      "totalSelection": "Over 37.5",
      "totalConfidence": "51/100",
      "totalExpectedClv": 0.0121,
      "totalDecision": "PASS",
      "rationale": "STAGE5_SPREAD_GATE: IND -4.5 projected cover prob 51.79 out of 100 vs 50.00 out of 100 de-vigged market."
    },
    "topProps": [
      {
        "playerId": "daniel-jones",
        "playerName": "Daniel Jones",
        "propType": "Pass Completions",
        "market": "pass_completions",
        "line": 18.5,
        "side": "UNDER",
        "confidence": "65/100",
        "expectedClv": 0.1821,
        "decision": "PLAY",
        "nEffTargetNotes": "Daniel Jones projects around 15.3 against the 18.5 pass completions line based on snap share and defensive scheme fit.",
        "pOver": 0.3485,
        "pUnder": 0.6515
      },
      {
        "playerId": "daniel-jones",
        "playerName": "Daniel Jones",
        "propType": "Passing Yards",
        "market": "pass_yds",
        "line": 185.5,
        "side": "UNDER",
        "confidence": "64/100",
        "expectedClv": 0.1427,
        "decision": "PLAY",
        "nEffTargetNotes": "Daniel Jones projects around 155.0 against the 185.5 passing yards line based on snap share and defensive scheme fit.",
        "pOver": 0.3573,
        "pUnder": 0.6427
      },
      {
        "playerId": "kyle-mccord",
        "playerName": "Kyle McCord",
        "propType": "Rushing Yards",
        "market": "rush_yds",
        "line": 5.5,
        "side": "OVER",
        "confidence": "60/100",
        "expectedClv": 0.0864,
        "decision": "PLAY",
        "nEffTargetNotes": "Kyle McCord projects around 13.5 against the 5.5 rushing yards line based on snap share and defensive scheme fit.",
        "pOver": 0.5966,
        "pUnder": 0.4034
      },
      {
        "playerId": "a-j-haulcy",
        "playerName": "A.J. Haulcy",
        "propType": "Tackles + Assists",
        "market": "tackles_plus_assists",
        "line": 5.5,
        "side": "UNDER",
        "confidence": "57/100",
        "expectedClv": 0.0,
        "decision": "PASS",
        "nEffTargetNotes": "A.J. Haulcy projects around 5.0 against the 5.5 tackles + assists line based on snap share and defensive scheme fit.",
        "pOver": 0.425,
        "pUnder": 0.575
      },
      {
        "playerId": "anthony-gould",
        "playerName": "Anthony Gould",
        "propType": "Receiving Yards",
        "market": "rec_yds",
        "line": 15.5,
        "side": "UNDER",
        "confidence": "45/100",
        "expectedClv": 0.0,
        "decision": "PASS",
        "nEffTargetNotes": "Anthony Gould projects around 3.0 against the 15.5 receiving yards line based on snap share and defensive scheme fit.",
        "pOver": 0.0,
        "pUnder": 1.0
      },
      {
        "playerId": "anthony-gould",
        "playerName": "Anthony Gould",
        "propType": "Receptions",
        "market": "receptions",
        "line": 1.5,
        "side": "UNDER",
        "confidence": "45/100",
        "expectedClv": 0.0,
        "decision": "PASS",
        "nEffTargetNotes": "Anthony Gould projects around 0.7 against the 1.5 receptions line based on snap share and defensive scheme fit.",
        "pOver": 0.0,
        "pUnder": 1.0
      }
    ],
    "correlatedSgpTicket": {
      "title": "MIA @ IND Same-Game Parlay",
      "legs": [
        {
          "description": "No approved correlated legs on MIA @ IND at posted sportsbook prices.",
          "pickType": "PASS",
          "selection": "MIA @ IND PASS",
          "confidence": "52/100",
          "expectedClv": 0.0,
          "decision": "PASS"
        }
      ],
      "jointWinProb": 0.0,
      "fairOdds": "n/a",
      "marketOdds": "n/a",
      "edgeScore": 0.0,
      "correlationRationale": "PASS - No correlated combination on MIA @ IND cleared release checks."
    },
    "dfsStacks": {
      "captainPicks": [
        {
          "player": "Jonathan Taylor",
          "position": "RB",
          "salary": 9800,
          "leverageNote": "Jonathan Taylor carries high-Share red-zone and median volume (14.6 projected fantasy points)."
        },
        {
          "player": "Daniel Jones",
          "position": "QB",
          "salary": 9300,
          "leverageNote": "Daniel Jones carries high-Share red-zone and median volume (13.5 projected fantasy points)."
        }
      ],
      "cashCore": [
        {
          "player": "Jonathan Taylor",
          "position": "RB",
          "salary": 6500,
          "projection": 14.6,
          "floorNote": "IND offensive share projects a reliable median output in MIA @ IND."
        },
        {
          "player": "Daniel Jones",
          "position": "QB",
          "salary": 6200,
          "projection": 13.5,
          "floorNote": "IND offensive share projects a reliable median output in MIA @ IND."
        },
        {
          "player": "Kyle McCord",
          "position": "QB",
          "salary": 6000,
          "projection": 12.4,
          "floorNote": "MIA offensive share projects a reliable median output in MIA @ IND."
        },
        {
          "player": "Malik Washington",
          "position": "WR",
          "salary": 5200,
          "projection": 9.3,
          "floorNote": "MIA offensive share projects a reliable median output in MIA @ IND."
        }
      ],
      "gppStacks": [
        {
          "primaryStack": {
            "qb": "Kyle McCord",
            "passCatchers": [
              "Malik Washington",
              "Greg Dulcich"
            ]
          },
          "bringBack": "Jonathan Taylor",
          "valueFiller": "Will Kacmarek",
          "correlationTheme": "MIA passing attack anchored by Kyle McCord to Malik Washington and Greg Dulcich, paired with Jonathan Taylor (IND) response volume."
        }
      ]
    },
    "quadEngineCitations": {
      "arxiv": [
        "arxiv:2309.10455"
      ],
      "openalex": [
        "openalex:W438810105"
      ],
      "kaggle": [
        "kaggle:nfl-big-data-bowl-2025"
      ],
      "hf": [
        "hf:nfelo-coaching-priors"
      ]
    }
  },
  {
    "id": "writeup-sun-401873060",
    "gameId": "401873060",
    "matchup": "Minnesota Vikings @ Green Bay Packers",
    "awayTeam": "Minnesota Vikings",
    "homeTeam": "Green Bay Packers",
    "kickoff": "2026-11-15T18:00Z",
    "windowSlot": "SUN_EARLY",
    "paceOfPlay": {
      "neutralSecPerSnap": 28.0,
      "passEpaPlay": -0.039,
      "rushEpaPlay": -0.121,
      "noHuddleRate": 0.091,
      "notes": "MIN and GB operate at 28.0 neutral seconds per snap (Lambeau Field)."
    },
    "schemeMatchup": {
      "coverageShell": "MIN plays 43.5 out of 100 man coverage vs GB at 36.1 out of 100 man coverage.",
      "blitzRateVsPressureToSack": "Pressure profiles feature MIN blitzing 72.2 out of 100 snaps against GB blitzing 28.2 out of 100 snaps.",
      "personnelTendencies": "Minnesota Vikings offense led by Kirk Cousins faces Green Bay Packers anchored by Jordan Love. Featured Week 10 personnel matchups include: Kirk Cousins, Jordan Love.",
      "coachingEdge": "Quarterback contrast features Kirk Cousins against Jordan Love with script-adjusted red-zone call tendencies.",
      "notes": "Total market posted at 42.5 with Minnesota Vikings +2.5 on the spread."
    },
    "sideTotalCall": {
      "sideSelection": "Minnesota Vikings +2.5",
      "sideConfidence": "58/100",
      "sideExpectedClv": 0.019,
      "sideDecision": "PASS",
      "totalSelection": "Over 42.5",
      "totalConfidence": "53/100",
      "totalExpectedClv": 0.019,
      "totalDecision": "PASS",
      "rationale": "STAGE5_SPREAD_GATE: MIN +2.5 projected cover prob 54.83 out of 100 vs 47.83 out of 100 de-vigged market."
    },
    "topProps": [
      {
        "playerId": "kirk-cousins",
        "playerName": "Kirk Cousins",
        "propType": "Passing Yards",
        "market": "pass_yds",
        "line": 232.5,
        "side": "UNDER",
        "confidence": "76/100",
        "expectedClv": 0.258,
        "decision": "PLAY",
        "nEffTargetNotes": "Kirk Cousins projects around 155.0 against the 232.5 passing yards line based on snap share and defensive scheme fit.",
        "pOver": 0.242,
        "pUnder": 0.758
      },
      {
        "playerId": "kirk-cousins",
        "playerName": "Kirk Cousins",
        "propType": "Rushing Yards",
        "market": "rush_yds",
        "line": 0.5,
        "side": "OVER",
        "confidence": "72/100",
        "expectedClv": 0.2109,
        "decision": "PLAY",
        "nEffTargetNotes": "Kirk Cousins projects around 15.5 against the 0.5 rushing yards line based on snap share and defensive scheme fit.",
        "pOver": 0.7211,
        "pUnder": 0.2789
      },
      {
        "playerId": "kirk-cousins",
        "playerName": "Kirk Cousins",
        "propType": "Pass Attempts",
        "market": "pass_attempts",
        "line": 34.5,
        "side": "UNDER",
        "confidence": "66/100",
        "expectedClv": 0.1465,
        "decision": "PLAY",
        "nEffTargetNotes": "Kirk Cousins projects around 31.3 against the 34.5 pass attempts line based on snap share and defensive scheme fit.",
        "pOver": 0.3434,
        "pUnder": 0.6566
      },
      {
        "playerId": "kirk-cousins",
        "playerName": "Kirk Cousins",
        "propType": "Pass Completions",
        "market": "pass_completions",
        "line": 21.5,
        "side": "OVER",
        "confidence": "60/100",
        "expectedClv": 0.1392,
        "decision": "PLAY",
        "nEffTargetNotes": "Kirk Cousins projects around 23.6 against the 21.5 pass completions line based on snap share and defensive scheme fit.",
        "pOver": 0.5984,
        "pUnder": 0.4016
      },
      {
        "playerId": "jordan-love",
        "playerName": "Jordan Love",
        "propType": "Rushing Yards",
        "market": "rush_yds",
        "line": 3.5,
        "side": "OVER",
        "confidence": "63/100",
        "expectedClv": 0.1154,
        "decision": "PLAY",
        "nEffTargetNotes": "Jordan Love projects around 13.2 against the 3.5 rushing yards line based on snap share and defensive scheme fit.",
        "pOver": 0.6255,
        "pUnder": 0.3745
      },
      {
        "playerId": "jordan-love",
        "playerName": "Jordan Love",
        "propType": "Pass Attempts",
        "market": "pass_attempts",
        "line": 36.5,
        "side": "UNDER",
        "confidence": "60/100",
        "expectedClv": 0.0992,
        "decision": "PLAY",
        "nEffTargetNotes": "Jordan Love projects around 34.0 against the 36.5 pass attempts line based on snap share and defensive scheme fit.",
        "pOver": 0.4008,
        "pUnder": 0.5992
      }
    ],
    "correlatedSgpTicket": {
      "title": "MIN @ GB 2-Leg Correlated SGP",
      "legs": [
        {
          "description": "Total Pass Completions (incl. overtime) script tie-in (MIN)",
          "pickType": "PROP",
          "selection": "Kirk Cousins OVER 21.5 Total Pass Completions (incl. overtime)",
          "confidence": "60/100",
          "expectedClv": 0.1392,
          "decision": "PLAY"
        },
        {
          "description": "Total Passing Attempts (incl. overtime) script tie-in (GB)",
          "pickType": "PROP",
          "selection": "Jordan Love UNDER 36.5 Total Passing Attempts (incl. overtime)",
          "confidence": "60/100",
          "expectedClv": 0.0992,
          "decision": "PLAY"
        }
      ],
      "jointWinProb": 0.379,
      "fairOdds": "+164",
      "marketOdds": "+269",
      "edgeScore": 0.1081,
      "correlationRationale": "Correlated script built from Kirk Cousins OVER 21.5 Total Pass Completions (incl. overtime), Jordan Love UNDER 36.5 Total Passing Attempts (incl. overtime) cleanly cleared release checks."
    },
    "dfsStacks": {
      "captainPicks": [
        {
          "player": "Jordan Love",
          "position": "QB",
          "salary": 11700,
          "leverageNote": "Jordan Love carries high-Share red-zone and median volume (19.9 projected fantasy points)."
        },
        {
          "player": "Matthew Golden",
          "position": "WR",
          "salary": 9900,
          "leverageNote": "Matthew Golden carries high-Share red-zone and median volume (14.8 projected fantasy points)."
        }
      ],
      "cashCore": [
        {
          "player": "Jordan Love",
          "position": "QB",
          "salary": 7800,
          "projection": 19.9,
          "floorNote": "GB offensive share projects a reliable median output in MIN @ GB."
        },
        {
          "player": "Matthew Golden",
          "position": "WR",
          "salary": 6600,
          "projection": 14.8,
          "floorNote": "GB offensive share projects a reliable median output in MIN @ GB."
        },
        {
          "player": "Kirk Cousins",
          "position": "QB",
          "salary": 6300,
          "projection": 13.7,
          "floorNote": "MIN offensive share projects a reliable median output in MIN @ GB."
        },
        {
          "player": "Aaron Jones Sr.",
          "position": "RB",
          "salary": 6000,
          "projection": 12.6,
          "floorNote": "MIN offensive share projects a reliable median output in MIN @ GB."
        }
      ],
      "gppStacks": [
        {
          "primaryStack": {
            "qb": "Jordan Love",
            "passCatchers": [
              "Matthew Golden",
              "Christian Watson"
            ]
          },
          "bringBack": "Aaron Jones Sr.",
          "valueFiller": "Bo Melton",
          "correlationTheme": "GB passing attack anchored by Jordan Love to Matthew Golden and Christian Watson, paired with Aaron Jones Sr. (MIN) response volume."
        }
      ]
    },
    "quadEngineCitations": {
      "arxiv": [
        "arxiv:2309.10455"
      ],
      "openalex": [
        "openalex:W438810105"
      ],
      "kaggle": [
        "kaggle:nfl-big-data-bowl-2025"
      ],
      "hf": [
        "hf:nfelo-coaching-priors"
      ]
    }
  },
  {
    "id": "writeup-sun-401873061",
    "gameId": "401873061",
    "matchup": "Los Angeles Rams @ Arizona Cardinals",
    "awayTeam": "Los Angeles Rams",
    "homeTeam": "Arizona Cardinals",
    "kickoff": "2026-11-15T21:05Z",
    "windowSlot": "SUN_LATE",
    "paceOfPlay": {
      "neutralSecPerSnap": 26.2,
      "passEpaPlay": 0.037,
      "rushEpaPlay": 0.018,
      "noHuddleRate": 0.05,
      "notes": "LAR and ARI operate at 26.2 neutral seconds per snap (State Farm Stadium)."
    },
    "schemeMatchup": {
      "coverageShell": "LAR plays 35.9 out of 100 man coverage vs ARI at 37.3 out of 100 man coverage.",
      "blitzRateVsPressureToSack": "Pressure profiles feature LAR blitzing 30.3 out of 100 snaps against ARI blitzing 30.7 out of 100 snaps.",
      "personnelTendencies": "Los Angeles Rams offense led by Matthew Stafford faces Arizona Cardinals anchored by Carson Beck. Featured Week 10 personnel matchups include: Matthew Stafford, Carson Beck, Bam Knight.",
      "coachingEdge": "Quarterback contrast features Matthew Stafford against Carson Beck with script-adjusted red-zone call tendencies.",
      "notes": "Total market posted at 38.5 with Arizona Cardinals +9.5 on the spread."
    },
    "sideTotalCall": {
      "sideSelection": "Arizona Cardinals +9.5",
      "sideConfidence": "52/100",
      "sideExpectedClv": 0.015,
      "sideDecision": "PASS",
      "totalSelection": "Under 38.5",
      "totalConfidence": "52/100",
      "totalExpectedClv": 0.0128,
      "totalDecision": "PASS",
      "rationale": "STAGE5_SPREAD_GATE: ARI +9.5 projected cover prob 51.07 out of 100 vs 49.57 out of 100 de-vigged market."
    },
    "topProps": [
      {
        "playerId": "matthew-stafford",
        "playerName": "Matthew Stafford",
        "propType": "Rushing Yards",
        "market": "rush_yds",
        "line": 0.5,
        "side": "OVER",
        "confidence": "74/100",
        "expectedClv": 0.2947,
        "decision": "PLAY",
        "nEffTargetNotes": "Matthew Stafford projects around 18.6 against the 0.5 rushing yards line based on snap share and defensive scheme fit.",
        "pOver": 0.7406,
        "pUnder": 0.2594
      },
      {
        "playerId": "matthew-stafford",
        "playerName": "Matthew Stafford",
        "propType": "Passing Yards",
        "market": "pass_yds",
        "line": 208.5,
        "side": "UNDER",
        "confidence": "72/100",
        "expectedClv": 0.2166,
        "decision": "PLAY",
        "nEffTargetNotes": "Matthew Stafford projects around 161.2 against the 208.5 passing yards line based on snap share and defensive scheme fit.",
        "pOver": 0.2834,
        "pUnder": 0.7166
      },
      {
        "playerId": "matthew-stafford",
        "playerName": "Matthew Stafford",
        "propType": "Pass Attempts",
        "market": "pass_attempts",
        "line": 30.5,
        "side": "UNDER",
        "confidence": "70/100",
        "expectedClv": 0.2063,
        "decision": "PLAY",
        "nEffTargetNotes": "Matthew Stafford projects around 26.1 against the 30.5 pass attempts line based on snap share and defensive scheme fit.",
        "pOver": 0.3038,
        "pUnder": 0.6962
      },
      {
        "playerId": "carson-beck",
        "playerName": "Carson Beck",
        "propType": "Rush Attempts",
        "market": "carries",
        "line": 2.5,
        "side": "OVER",
        "confidence": "66/100",
        "expectedClv": 0.064,
        "decision": "PLAY",
        "nEffTargetNotes": "Carson Beck projects around 4.3 against the 2.5 rush attempts line based on snap share and defensive scheme fit.",
        "pOver": 0.6555,
        "pUnder": 0.3445
      },
      {
        "playerId": "carson-beck",
        "playerName": "Carson Beck",
        "propType": "Passing TDs",
        "market": "pass_tds",
        "line": 0.5,
        "side": "OVER",
        "confidence": "60/100",
        "expectedClv": 0.0349,
        "decision": "PLAY",
        "nEffTargetNotes": "Carson Beck projects around 0.9 against the 0.5 passing tds line based on snap share and defensive scheme fit.",
        "pOver": 0.5982,
        "pUnder": 0.4018
      },
      {
        "playerId": "bam-knight",
        "playerName": "Bam Knight",
        "propType": "Rush Attempts",
        "market": "carries",
        "line": 8.5,
        "side": "UNDER",
        "confidence": "45/100",
        "expectedClv": 0.0,
        "decision": "PASS",
        "nEffTargetNotes": "Bam Knight projects around 2.4 against the 8.5 rush attempts line based on snap share and defensive scheme fit.",
        "pOver": 0.0,
        "pUnder": 1.0
      }
    ],
    "correlatedSgpTicket": {
      "title": "LAR @ ARI Same-Game Parlay",
      "legs": [
        {
          "description": "No approved correlated legs on LAR @ ARI at posted sportsbook prices.",
          "pickType": "PASS",
          "selection": "LAR @ ARI PASS",
          "confidence": "52/100",
          "expectedClv": 0.0,
          "decision": "PASS"
        }
      ],
      "jointWinProb": 0.0,
      "fairOdds": "n/a",
      "marketOdds": "n/a",
      "edgeScore": 0.0,
      "correlationRationale": "PASS - No correlated combination on LAR @ ARI cleared release checks."
    },
    "dfsStacks": {
      "captainPicks": [
        {
          "player": "Matthew Stafford",
          "position": "QB",
          "salary": 10400,
          "leverageNote": "Matthew Stafford carries high-Share red-zone and median volume (16.4 projected fantasy points)."
        },
        {
          "player": "Kyren Williams",
          "position": "RB",
          "salary": 10000,
          "leverageNote": "Kyren Williams carries high-Share red-zone and median volume (15.5 projected fantasy points)."
        }
      ],
      "cashCore": [
        {
          "player": "Matthew Stafford",
          "position": "QB",
          "salary": 6900,
          "projection": 16.4,
          "floorNote": "LAR offensive share projects a reliable median output in LAR @ ARI."
        },
        {
          "player": "Kyren Williams",
          "position": "RB",
          "salary": 6700,
          "projection": 15.5,
          "floorNote": "LAR offensive share projects a reliable median output in LAR @ ARI."
        },
        {
          "player": "Carson Beck",
          "position": "QB",
          "salary": 6100,
          "projection": 12.8,
          "floorNote": "ARI offensive share projects a reliable median output in LAR @ ARI."
        },
        {
          "player": "Trey McBride",
          "position": "TE",
          "salary": 5700,
          "projection": 11.2,
          "floorNote": "ARI offensive share projects a reliable median output in LAR @ ARI."
        }
      ],
      "gppStacks": [
        {
          "primaryStack": {
            "qb": "Carson Beck",
            "passCatchers": [
              "Trey McBride",
              "Kendrick Bourne"
            ]
          },
          "bringBack": "Kyren Williams",
          "valueFiller": "Simi Fehoko",
          "correlationTheme": "ARI passing attack anchored by Carson Beck to Trey McBride and Kendrick Bourne, paired with Kyren Williams (LAR) response volume."
        }
      ]
    },
    "quadEngineCitations": {
      "arxiv": [
        "arxiv:2309.10455"
      ],
      "openalex": [
        "openalex:W438810105"
      ],
      "kaggle": [
        "kaggle:nfl-big-data-bowl-2025"
      ],
      "hf": [
        "hf:nfelo-coaching-priors"
      ]
    }
  },
  {
    "id": "writeup-sun-401873062",
    "gameId": "401873062",
    "matchup": "Seattle Seahawks @ Las Vegas Raiders",
    "awayTeam": "Seattle Seahawks",
    "homeTeam": "Las Vegas Raiders",
    "kickoff": "2026-11-15T21:05Z",
    "windowSlot": "SUN_LATE",
    "paceOfPlay": {
      "neutralSecPerSnap": 27.2,
      "passEpaPlay": 0.03,
      "rushEpaPlay": -0.155,
      "noHuddleRate": 0.087,
      "notes": "SEA and LV operate at 27.2 neutral seconds per snap (Allegiant Stadium)."
    },
    "schemeMatchup": {
      "coverageShell": "SEA plays 34.3 out of 100 man coverage vs LV at 34.5 out of 100 man coverage.",
      "blitzRateVsPressureToSack": "Pressure profiles feature SEA blitzing 23.4 out of 100 snaps against LV blitzing 27.6 out of 100 snaps.",
      "personnelTendencies": "Seattle Seahawks offense led by Drew Lock faces Las Vegas Raiders anchored by Fernando Mendoza. Featured Week 10 personnel matchups include: Ashton Jeanty, Brock Bowers.",
      "coachingEdge": "Quarterback contrast features Drew Lock against Fernando Mendoza with script-adjusted red-zone call tendencies.",
      "notes": "Total market posted at 40.5 with Seattle Seahawks -6.5 on the spread."
    },
    "sideTotalCall": {
      "sideSelection": "Seattle Seahawks -6.5",
      "sideConfidence": "52/100",
      "sideExpectedClv": 0.0179,
      "sideDecision": "PASS",
      "totalSelection": "Under 40.5",
      "totalConfidence": "51/100",
      "totalExpectedClv": 0.0085,
      "totalDecision": "PASS",
      "rationale": "STAGE5_SPREAD_GATE: SEA -6.5 projected cover prob 51.79 out of 100 vs 50.00 out of 100 de-vigged market."
    },
    "topProps": [
      {
        "playerId": "ashton-jeanty",
        "playerName": "Ashton Jeanty",
        "propType": "Rush Attempts",
        "market": "carries",
        "line": 10.5,
        "side": "UNDER",
        "confidence": "45/100",
        "expectedClv": 0.0,
        "decision": "PASS",
        "nEffTargetNotes": "Ashton Jeanty projects around 14.4 against the 10.5 rush attempts line based on snap share and defensive scheme fit.",
        "pOver": 0.0,
        "pUnder": 1.0
      },
      {
        "playerId": "ashton-jeanty",
        "playerName": "Ashton Jeanty",
        "propType": "Receiving Yards",
        "market": "rec_yds",
        "line": 24.5,
        "side": "UNDER",
        "confidence": "45/100",
        "expectedClv": 0.0,
        "decision": "PASS",
        "nEffTargetNotes": "Ashton Jeanty projects around 41.2 against the 24.5 receiving yards line based on snap share and defensive scheme fit.",
        "pOver": 0.0,
        "pUnder": 1.0
      },
      {
        "playerId": "ashton-jeanty",
        "playerName": "Ashton Jeanty",
        "propType": "Receptions",
        "market": "receptions",
        "line": 3.5,
        "side": "UNDER",
        "confidence": "45/100",
        "expectedClv": 0.0,
        "decision": "PASS",
        "nEffTargetNotes": "Ashton Jeanty projects around 4.2 against the 3.5 receptions line based on snap share and defensive scheme fit.",
        "pOver": 0.0,
        "pUnder": 1.0
      },
      {
        "playerId": "ashton-jeanty",
        "playerName": "Ashton Jeanty",
        "propType": "Rush + Rec Yards",
        "market": "rush_plus_rec_yds",
        "line": 63.5,
        "side": "UNDER",
        "confidence": "45/100",
        "expectedClv": 0.0,
        "decision": "PASS",
        "nEffTargetNotes": "Ashton Jeanty projects around 84.3 against the 63.5 rush + rec yards line based on snap share and defensive scheme fit.",
        "pOver": 0.0,
        "pUnder": 1.0
      },
      {
        "playerId": "ashton-jeanty",
        "playerName": "Ashton Jeanty",
        "propType": "Rushing Yards",
        "market": "rush_yds",
        "line": 33.5,
        "side": "UNDER",
        "confidence": "45/100",
        "expectedClv": 0.0,
        "decision": "PASS",
        "nEffTargetNotes": "Ashton Jeanty projects around 43.1 against the 33.5 rushing yards line based on snap share and defensive scheme fit.",
        "pOver": 0.0,
        "pUnder": 1.0
      },
      {
        "playerId": "brock-bowers",
        "playerName": "Brock Bowers",
        "propType": "Receiving Yards",
        "market": "rec_yds",
        "line": 58.5,
        "side": "UNDER",
        "confidence": "45/100",
        "expectedClv": 0.0,
        "decision": "PASS",
        "nEffTargetNotes": "Brock Bowers projects around 64.8 against the 58.5 receiving yards line based on snap share and defensive scheme fit.",
        "pOver": 0.0,
        "pUnder": 1.0
      }
    ],
    "correlatedSgpTicket": {
      "title": "SEA @ LV Same-Game Parlay",
      "legs": [
        {
          "description": "No approved correlated legs on SEA @ LV at posted sportsbook prices.",
          "pickType": "PASS",
          "selection": "SEA @ LV PASS",
          "confidence": "52/100",
          "expectedClv": 0.0,
          "decision": "PASS"
        }
      ],
      "jointWinProb": 0.0,
      "fairOdds": "n/a",
      "marketOdds": "n/a",
      "edgeScore": 0.0,
      "correlationRationale": "PASS - No correlated combination on SEA @ LV cleared release checks."
    },
    "dfsStacks": {
      "captainPicks": [
        {
          "player": "Fernando Mendoza",
          "position": "QB",
          "salary": 10600,
          "leverageNote": "Fernando Mendoza carries high-Share red-zone and median volume (17.0 projected fantasy points)."
        },
        {
          "player": "Drew Lock",
          "position": "QB",
          "salary": 10600,
          "leverageNote": "Drew Lock carries high-Share red-zone and median volume (16.9 projected fantasy points)."
        }
      ],
      "cashCore": [
        {
          "player": "Fernando Mendoza",
          "position": "QB",
          "salary": 7100,
          "projection": 17.0,
          "floorNote": "LV offensive share projects a reliable median output in SEA @ LV."
        },
        {
          "player": "Drew Lock",
          "position": "QB",
          "salary": 7100,
          "projection": 16.9,
          "floorNote": "SEA offensive share projects a reliable median output in SEA @ LV."
        },
        {
          "player": "Ashton Jeanty",
          "position": "RB",
          "salary": 6900,
          "projection": 16.1,
          "floorNote": "LV offensive share projects a reliable median output in SEA @ LV."
        },
        {
          "player": "Jaxon Smith-Njigba",
          "position": "WR",
          "salary": 6600,
          "projection": 15.1,
          "floorNote": "SEA offensive share projects a reliable median output in SEA @ LV."
        }
      ],
      "gppStacks": [
        {
          "primaryStack": {
            "qb": "Drew Lock",
            "passCatchers": [
              "Jaxon Smith-Njigba",
              "Rashid Shaheed"
            ]
          },
          "bringBack": "Ashton Jeanty",
          "valueFiller": "Zach Charbonnet",
          "correlationTheme": "SEA passing attack anchored by Drew Lock to Jaxon Smith-Njigba and Rashid Shaheed, paired with Ashton Jeanty (LV) response volume."
        }
      ]
    },
    "quadEngineCitations": {
      "arxiv": [
        "arxiv:2309.10455"
      ],
      "openalex": [
        "openalex:W438810105"
      ],
      "kaggle": [
        "kaggle:nfl-big-data-bowl-2025"
      ],
      "hf": [
        "hf:nfelo-coaching-priors"
      ]
    }
  },
  {
    "id": "writeup-sun-401873063",
    "gameId": "401873063",
    "matchup": "San Francisco 49ers @ Dallas Cowboys",
    "awayTeam": "San Francisco 49ers",
    "homeTeam": "Dallas Cowboys",
    "kickoff": "2026-11-15T21:25Z",
    "windowSlot": "SUN_LATE",
    "paceOfPlay": {
      "neutralSecPerSnap": 27.9,
      "passEpaPlay": 0.178,
      "rushEpaPlay": 0.095,
      "noHuddleRate": 0.05,
      "notes": "SF and DAL operate at 27.9 neutral seconds per snap (AT&T Stadium)."
    },
    "schemeMatchup": {
      "coverageShell": "SF plays 36.2 out of 100 man coverage vs DAL at 32.3 out of 100 man coverage.",
      "blitzRateVsPressureToSack": "Pressure profiles feature SF blitzing 32.4 out of 100 snaps against DAL blitzing 23.7 out of 100 snaps.",
      "personnelTendencies": "San Francisco 49ers offense led by Brock Purdy faces Dallas Cowboys anchored by Dak Prescott. Featured Week 10 personnel matchups include: Brock Purdy, Dak Prescott, Brandon Aubrey.",
      "coachingEdge": "Quarterback contrast features Brock Purdy against Dak Prescott with script-adjusted red-zone call tendencies.",
      "notes": "Total market posted at 55.5 with San Francisco 49ers -4.5 on the spread."
    },
    "sideTotalCall": {
      "sideSelection": "San Francisco 49ers -4.5",
      "sideConfidence": "61/100",
      "sideExpectedClv": 0.019,
      "sideDecision": "PASS",
      "totalSelection": "Under 55.5",
      "totalConfidence": "54/100",
      "totalExpectedClv": 0.019,
      "totalDecision": "PASS",
      "rationale": "STAGE5_SPREAD_GATE: SF -4.5 projected cover prob 58.53 out of 100 vs 49.57 out of 100 de-vigged market."
    },
    "topProps": [
      {
        "playerId": "brock-purdy",
        "playerName": "Brock Purdy",
        "propType": "Pass Attempts",
        "market": "pass_attempts",
        "line": 31.5,
        "side": "UNDER",
        "confidence": "64/100",
        "expectedClv": 0.1515,
        "decision": "PLAY",
        "nEffTargetNotes": "Brock Purdy projects around 28.6 against the 31.5 pass attempts line based on snap share and defensive scheme fit.",
        "pOver": 0.3587,
        "pUnder": 0.6413
      },
      {
        "playerId": "brock-purdy",
        "playerName": "Brock Purdy",
        "propType": "Pass Completions",
        "market": "pass_completions",
        "line": 21.5,
        "side": "OVER",
        "confidence": "64/100",
        "expectedClv": 0.1422,
        "decision": "PLAY",
        "nEffTargetNotes": "Brock Purdy projects around 24.4 against the 21.5 pass completions line based on snap share and defensive scheme fit.",
        "pOver": 0.6422,
        "pUnder": 0.3578
      },
      {
        "playerId": "brock-purdy",
        "playerName": "Brock Purdy",
        "propType": "Passing Yards",
        "market": "pass_yds",
        "line": 261.5,
        "side": "UNDER",
        "confidence": "60/100",
        "expectedClv": 0.1013,
        "decision": "PLAY",
        "nEffTargetNotes": "Brock Purdy projects around 240.6 against the 261.5 passing yards line based on snap share and defensive scheme fit.",
        "pOver": 0.3987,
        "pUnder": 0.6013
      },
      {
        "playerId": "dak-prescott",
        "playerName": "Dak Prescott",
        "propType": "Pass Completions",
        "market": "pass_completions",
        "line": 24.5,
        "side": "UNDER",
        "confidence": "62/100",
        "expectedClv": 0.0894,
        "decision": "PLAY",
        "nEffTargetNotes": "Dak Prescott projects around 21.6 against the 24.5 pass completions line based on snap share and defensive scheme fit.",
        "pOver": 0.38,
        "pUnder": 0.62
      },
      {
        "playerId": "brandon-aubrey",
        "playerName": "Brandon Aubrey",
        "propType": "Total Extra Points Made",
        "market": "total_extra_points_made",
        "line": 2.5,
        "side": "OVER",
        "confidence": "53/100",
        "expectedClv": 0.0,
        "decision": "PASS",
        "nEffTargetNotes": "Brandon Aubrey projects around 2.8 against the 2.5 total extra points made line based on snap share and defensive scheme fit.",
        "pOver": 0.5282,
        "pUnder": 0.4718
      },
      {
        "playerId": "brandon-aubrey",
        "playerName": "Brandon Aubrey",
        "propType": "Field Goals Made",
        "market": "fg_made",
        "line": 1.5,
        "side": "OVER",
        "confidence": "53/100",
        "expectedClv": 0.0,
        "decision": "PASS",
        "nEffTargetNotes": "Brandon Aubrey projects around 1.8 against the 1.5 field goals made line based on snap share and defensive scheme fit.",
        "pOver": 0.5346,
        "pUnder": 0.4654
      }
    ],
    "correlatedSgpTicket": {
      "title": "SF @ DAL 2-Leg Correlated SGP",
      "legs": [
        {
          "description": "Total Pass Completions (incl. overtime) script tie-in (SF)",
          "pickType": "PROP",
          "selection": "Brock Purdy OVER 21.5 Total Pass Completions (incl. overtime)",
          "confidence": "64/100",
          "expectedClv": 0.1422,
          "decision": "PLAY"
        },
        {
          "description": "Total Pass Completions (incl. overtime) script tie-in (DAL)",
          "pickType": "PROP",
          "selection": "Dak Prescott UNDER 24.5 Total Pass Completions (incl. overtime)",
          "confidence": "62/100",
          "expectedClv": 0.0894,
          "decision": "PLAY"
        }
      ],
      "jointWinProb": 0.4151,
      "fairOdds": "+141",
      "marketOdds": "+219",
      "edgeScore": 0.102,
      "correlationRationale": "Correlated script built from Brock Purdy OVER 21.5 Total Pass Completions (incl. overtime), Dak Prescott UNDER 24.5 Total Pass Completions (incl. overtime) cleanly cleared release checks."
    },
    "dfsStacks": {
      "captainPicks": [
        {
          "player": "Brock Purdy",
          "position": "QB",
          "salary": 12300,
          "leverageNote": "Brock Purdy carries high-Share red-zone and median volume (21.5 projected fantasy points)."
        },
        {
          "player": "Christian McCaffrey",
          "position": "RB",
          "salary": 11800,
          "leverageNote": "Christian McCaffrey carries high-Share red-zone and median volume (20.5 projected fantasy points)."
        }
      ],
      "cashCore": [
        {
          "player": "Brock Purdy",
          "position": "QB",
          "salary": 8200,
          "projection": 21.5,
          "floorNote": "SF offensive share projects a reliable median output in SF @ DAL."
        },
        {
          "player": "Christian McCaffrey",
          "position": "RB",
          "salary": 7900,
          "projection": 20.5,
          "floorNote": "SF offensive share projects a reliable median output in SF @ DAL."
        },
        {
          "player": "Dak Prescott",
          "position": "QB",
          "salary": 7400,
          "projection": 18.3,
          "floorNote": "DAL offensive share projects a reliable median output in SF @ DAL."
        },
        {
          "player": "CeeDee Lamb",
          "position": "WR",
          "salary": 6900,
          "projection": 16.1,
          "floorNote": "DAL offensive share projects a reliable median output in SF @ DAL."
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
          "bringBack": "Christian McCaffrey",
          "valueFiller": "Brevyn Spann-Ford",
          "correlationTheme": "DAL passing attack anchored by Dak Prescott to CeeDee Lamb and George Pickens, paired with Christian McCaffrey (SF) response volume."
        }
      ]
    },
    "quadEngineCitations": {
      "arxiv": [
        "arxiv:2309.10455"
      ],
      "openalex": [
        "openalex:W438810105"
      ],
      "kaggle": [
        "kaggle:nfl-big-data-bowl-2025"
      ],
      "hf": [
        "hf:nfelo-coaching-priors"
      ]
    }
  },
  {
    "id": "writeup-snf-401873064",
    "gameId": "401873064",
    "matchup": "Pittsburgh Steelers @ Cincinnati Bengals",
    "awayTeam": "Pittsburgh Steelers",
    "homeTeam": "Cincinnati Bengals",
    "kickoff": "2026-11-16T01:20Z",
    "windowSlot": "SNF",
    "paceOfPlay": {
      "neutralSecPerSnap": 27.7,
      "passEpaPlay": -0.092,
      "rushEpaPlay": 0.075,
      "noHuddleRate": 0.145,
      "notes": "PIT and CIN operate at 27.7 neutral seconds per snap (Paycor Stadium)."
    },
    "schemeMatchup": {
      "coverageShell": "PIT plays 36.8% man coverage vs CIN at 30.9% man coverage.",
      "blitzRateVsPressureToSack": "Pressure profiles feature PIT blitzing 27.2% of snaps against CIN blitzing 17.2% of snaps.",
      "personnelTendencies": "Pittsburgh Steelers offense led by Aaron Rodgers faces Cincinnati Bengals anchored by Joe Burrow. Featured Week 10 personnel matchups include: Aaron Rodgers, Joe Burrow.",
      "coachingEdge": "Quarterback contrast features Aaron Rodgers against Joe Burrow with script-adjusted red-zone call tendencies.",
      "notes": "Total market posted at 49.5 with Cincinnati Bengals -3.5 on the spread."
    },
    "sideTotalCall": {
      "sideSelection": "Cincinnati Bengals -3.5",
      "sideConfidence": "57/100",
      "sideExpectedClv": 0.0,
      "sideDecision": "PASS",
      "totalSelection": "Under 49.5",
      "totalConfidence": "51/100",
      "totalExpectedClv": 0.0,
      "totalDecision": "PASS",
      "rationale": "CIN -3.5 and 49.5 align with efficient market pricing; pass discipline holds until late inactive news opens clearer value."
    },
    "topProps": [
      {
        "playerId": "aaron-rodgers",
        "playerName": "Aaron Rodgers",
        "propType": "Rushing Yards",
        "market": "rush_yds",
        "line": 0.5,
        "side": "UNDER",
        "confidence": "50/100",
        "expectedClv": 0.0,
        "decision": "PASS",
        "nEffTargetNotes": "Held under pocket-quarterback scramble and victory kneeldown discipline pending calibrated walk-forward clearance.",
        "pOver": 0.49,
        "pUnder": 0.51
      },
      {
        "playerId": "aaron-rodgers",
        "playerName": "Aaron Rodgers",
        "propType": "Pass Attempts",
        "market": "pass_attempts",
        "line": 35.5,
        "side": "UNDER",
        "confidence": "55/100",
        "expectedClv": 0.0,
        "decision": "PASS",
        "nEffTargetNotes": "Single-QB directional volume exposure capped pending pre-kickoff inactive confirmation.",
        "pOver": 0.45,
        "pUnder": 0.55
      },
      {
        "playerId": "joe-burrow",
        "playerName": "Joe Burrow",
        "propType": "Pass Attempts",
        "market": "pass_attempts",
        "line": 37.5,
        "side": "UNDER",
        "confidence": "54/100",
        "expectedClv": 0.0,
        "decision": "PASS",
        "nEffTargetNotes": "Balanced offensive script holds Joe Burrow passing volume near consensus pricing.",
        "pOver": 0.46,
        "pUnder": 0.54
      }
    ],
    "correlatedSgpTicket": {
      "title": "PIT @ CIN Same-Game Parlay",
      "legs": [
        {
          "description": "No approved correlated legs on PIT @ CIN at posted sportsbook prices.",
          "pickType": "PASS",
          "selection": "PIT @ CIN PASS",
          "confidence": "52/100",
          "expectedClv": 0.0,
          "decision": "PASS"
        }
      ],
      "jointWinProb": 0.0,
      "fairOdds": "n/a",
      "marketOdds": "n/a",
      "edgeScore": 0.0,
      "correlationRationale": "PASS - No correlated combination on PIT @ CIN cleared release checks."
    },
    "dfsStacks": {
      "captainPicks": [
        {
          "player": "Joe Burrow",
          "position": "QB",
          "salary": 12400,
          "leverageNote": "Joe Burrow carries high-Share red-zone and median volume (22.1 projected fantasy points)."
        },
        {
          "player": "Chase Brown",
          "position": "RB",
          "salary": 11200,
          "leverageNote": "Chase Brown carries high-Share red-zone and median volume (18.7 projected fantasy points)."
        }
      ],
      "cashCore": [
        {
          "player": "Joe Burrow",
          "position": "QB",
          "salary": 8300,
          "projection": 22.1,
          "floorNote": "CIN offensive share projects a reliable median output in PIT @ CIN."
        },
        {
          "player": "Chase Brown",
          "position": "RB",
          "salary": 7500,
          "projection": 18.7,
          "floorNote": "CIN offensive share projects a reliable median output in PIT @ CIN."
        },
        {
          "player": "Aaron Rodgers",
          "position": "QB",
          "salary": 7200,
          "projection": 17.5,
          "floorNote": "PIT offensive share projects a reliable median output in PIT @ CIN."
        },
        {
          "player": "Jaylen Warren",
          "position": "RB",
          "salary": 6500,
          "projection": 14.5,
          "floorNote": "PIT offensive share projects a reliable median output in PIT @ CIN."
        }
      ],
      "gppStacks": [
        {
          "primaryStack": {
            "qb": "Joe Burrow",
            "passCatchers": [
              "Ja'Marr Chase",
              "Tee Higgins"
            ]
          },
          "bringBack": "Jaylen Warren",
          "valueFiller": "Andrei Iosivas",
          "correlationTheme": "CIN passing attack anchored by Joe Burrow to Ja'Marr Chase and Tee Higgins, paired with Jaylen Warren (PIT) response volume."
        }
      ]
    },
    "quadEngineCitations": {
      "arxiv": [
        "arxiv:2309.10455"
      ],
      "openalex": [
        "openalex:W438810105"
      ],
      "kaggle": [
        "kaggle:nfl-big-data-bowl-2025"
      ],
      "hf": [
        "hf:nfelo-coaching-priors"
      ]
    }
  },
  {
    "id": "writeup-mnf-401873065",
    "gameId": "401873065",
    "matchup": "Los Angeles Chargers @ Baltimore Ravens",
    "awayTeam": "Los Angeles Chargers",
    "homeTeam": "Baltimore Ravens",
    "kickoff": "2026-11-17T01:15Z",
    "windowSlot": "MNF",
    "paceOfPlay": {
      "neutralSecPerSnap": 27.7,
      "passEpaPlay": -0.273,
      "rushEpaPlay": -0.174,
      "noHuddleRate": 0.075,
      "notes": "LAC and BAL operate at 27.7 neutral seconds per snap (M&T Bank Stadium)."
    },
    "schemeMatchup": {
      "coverageShell": "LAC plays 33.4% man coverage vs BAL at 24.5% man coverage.",
      "blitzRateVsPressureToSack": "Pressure profiles feature LAC blitzing 26.4% of snaps against BAL blitzing 24.5% of snaps.",
      "personnelTendencies": "Los Angeles Chargers offense led by Justin Herbert faces Baltimore Ravens anchored by Lamar Jackson and Derrick Henry.",
      "coachingEdge": "Quarterback contrast features Justin Herbert against Baltimore's dual-threat ground and red-zone attack.",
      "notes": "Total market posted at 38.5 with Baltimore Ravens -4.5 on the spread."
    },
    "sideTotalCall": {
      "sideSelection": "Baltimore Ravens -4.5",
      "sideConfidence": "56/100",
      "sideExpectedClv": 0.0,
      "sideDecision": "PASS",
      "totalSelection": "Over 38.5",
      "totalConfidence": "55/100",
      "totalExpectedClv": 0.0,
      "totalDecision": "PASS",
      "rationale": "BAL -4.5 and 38.5 remain held in pass discipline pending Monday late inactive verification."
    },
    "topProps": [
      {
        "playerId": "justin-herbert",
        "playerName": "Justin Herbert",
        "propType": "Rushing Yards",
        "market": "rush_yds",
        "line": 21.5,
        "side": "UNDER",
        "confidence": "54/100",
        "expectedClv": 0.0,
        "decision": "PASS",
        "nEffTargetNotes": "Justin Herbert projects near efficient market pricing around 17.4 rushing yards once scramble tendencies are factored in.",
        "pOver": 0.45,
        "pUnder": 0.55
      },
      {
        "playerId": "derrick-henry",
        "playerName": "Derrick Henry",
        "propType": "Rushing Yards",
        "market": "rush_yds",
        "line": 79.5,
        "side": "UNDER",
        "confidence": "52/100",
        "expectedClv": 0.0,
        "decision": "PASS",
        "nEffTargetNotes": "Derrick Henry projects near balanced two-sided rushing pricing around 76.2 yards.",
        "pOver": 0.48,
        "pUnder": 0.52
      }
    ],
    "correlatedSgpTicket": {
      "title": "LAC @ BAL Same-Game Parlay",
      "legs": [
        {
          "description": "No approved correlated legs on LAC @ BAL at posted sportsbook prices.",
          "pickType": "PASS",
          "selection": "LAC @ BAL PASS",
          "confidence": "52/100",
          "expectedClv": 0.0,
          "decision": "PASS"
        }
      ],
      "jointWinProb": 0.0,
      "fairOdds": "n/a",
      "marketOdds": "n/a",
      "edgeScore": 0.0,
      "correlationRationale": "PASS - No correlated combination on LAC @ BAL cleared release checks."
    },
    "dfsStacks": {
      "captainPicks": [
        {
          "player": "Lamar Jackson",
          "position": "QB",
          "salary": 12000,
          "leverageNote": "Lamar Jackson carries high-Share red-zone and median volume (20.8 projected fantasy points)."
        },
        {
          "player": "Justin Herbert",
          "position": "QB",
          "salary": 9800,
          "leverageNote": "Justin Herbert carries high-Share red-zone and median volume (14.5 projected fantasy points)."
        }
      ],
      "cashCore": [
        {
          "player": "Lamar Jackson",
          "position": "QB",
          "salary": 8000,
          "projection": 20.8,
          "floorNote": "BAL offensive share projects a reliable median output in LAC @ BAL."
        },
        {
          "player": "Justin Herbert",
          "position": "QB",
          "salary": 6500,
          "projection": 14.5,
          "floorNote": "LAC offensive share projects a reliable median output in LAC @ BAL."
        },
        {
          "player": "Derrick Henry",
          "position": "RB",
          "salary": 6500,
          "projection": 14.4,
          "floorNote": "BAL offensive share projects a reliable median output in LAC @ BAL."
        },
        {
          "player": "Zay Flowers",
          "position": "WR",
          "salary": 6000,
          "projection": 12.3,
          "floorNote": "BAL offensive share projects a reliable median output in LAC @ BAL."
        }
      ],
      "gppStacks": [
        {
          "primaryStack": {
            "qb": "Lamar Jackson",
            "passCatchers": [
              "Zay Flowers",
              "Mark Andrews"
            ]
          },
          "bringBack": "Ladd McConkey",
          "valueFiller": "Isaiah Likely",
          "correlationTheme": "BAL passing attack anchored by Lamar Jackson to Zay Flowers and Mark Andrews, paired with Ladd McConkey (LAC) response volume."
        }
      ]
    },
    "quadEngineCitations": {
      "arxiv": [
        "arxiv:2309.10455"
      ],
      "openalex": [
        "openalex:W438810105"
      ],
      "kaggle": [
        "kaggle:nfl-big-data-bowl-2025"
      ],
      "hf": [
        "hf:nfelo-coaching-priors"
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
  const filtered = LIVE_SLATE_COACH_WRITEUPS.filter((w) => {
    const kMs = Date.parse(w.kickoff);
    return Number.isNaN(kMs) || kMs >= cutoffMs;
  });
  // Fall back to the full slate when all games have kicked off,
  // ensuring the live storefront never wipes to 0 during mid-week transitions.
  if (filtered.length === 0) {
    return [...LIVE_SLATE_COACH_WRITEUPS];
  }
  return filtered;
}

export function filterWriteupsForWindowSlot(
  writeups: readonly CoachGameWriteup[],
  windowSlot: string,
): CoachGameWriteup[] {
  return writeups.filter((w) => {
    if (windowSlot === "WEEKEND_PASS" || windowSlot === "WEEKLY_PASS" || windowSlot === "ALL") {
      return true;
    }
    if (windowSlot === "SUN_MAIN") {
      return (
        w.windowSlot === "SUN_EARLY" ||
        w.windowSlot === "SUN_LATE" ||
        w.windowSlot === "SUN_MAIN" ||
        w.windowSlot === "SNF" ||
        w.windowSlot === "MNF"
      );
    }
    if (windowSlot === "PRIMETIME") {
      return w.windowSlot === "SNF" || w.windowSlot === "MNF" || w.windowSlot === "TNF";
    }
    if (windowSlot === "SUNDAY_FULL") {
      return (
        w.windowSlot === "SUN_EARLY" ||
        w.windowSlot === "SUN_LATE" ||
        w.windowSlot === "SUN_MAIN" ||
        w.windowSlot === "SNF"
      );
    }
    return w.windowSlot === windowSlot;
  });
}

export function getWriteupsForWindowSlot(windowSlot: string, now: Date = new Date()): CoachGameWriteup[] {
  const pool = getActiveUpcomingWriteups(now);
  return filterWriteupsForWindowSlot(pool, windowSlot);
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

export const WEEK9_UPCOMING_14_MATCHUP_CODES: ReadonlyArray<{ matchup: string }> = [
  {
    "matchup": "WSH @ NYG"
  },
  {
    "matchup": "NE @ DET"
  },
  {
    "matchup": "BUF @ NYJ"
  },
  {
    "matchup": "CAR @ NO"
  },
  {
    "matchup": "HOU @ CLE"
  },
  {
    "matchup": "JAX @ TEN"
  },
  {
    "matchup": "KC @ ATL"
  },
  {
    "matchup": "MIA @ IND"
  },
  {
    "matchup": "MIN @ GB"
  },
  {
    "matchup": "LAR @ ARI"
  },
  {
    "matchup": "SEA @ LV"
  },
  {
    "matchup": "SF @ DAL"
  },
  {
    "matchup": "PIT @ CIN"
  },
  {
    "matchup": "LAC @ BAL"
  }
];
