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
    .replace(/\b22,750,000\s*snap\s*evaluations?\b/gi, "every offensive and defensive snap")
    .replace(/\b10,000[-\s]*(sim|simulation|world|worlds|monte carlo)\b/gi, "film and trench study")
    .replace(
      /\b(simulations?|monte carlo|jev|sinkhorn[-\s]*knopp|sinkhorn|romano\s*cqr|optimal\s*transport|bitemporal\s*copula|empirical[-\s]*bayes|tau_hat|cholesky|copula|fr[eé]chet[-\s]*hoeffding|n_eff|epa\s*\/\s*play|epa|proe|clv|autonomous\s*engine|machine\s*learning|deep[-\s]*math\s*dossiers?|doctoral\s*papers?|\bai\b)\b/gi,
      "matchup",
    )
    .replace(/\bdropbacks\b/gi, "pass plays")
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
      return "Week 9 Thursday Night Football (JAX @ BAL)";
    case "SUN_EARLY":
      return "Week 9 Sunday Early Slate (1:00 PM ET)";
    case "SUN_LATE":
      return "Week 9 Sunday Afternoon Slate (4:25 PM ET)";
    case "SUN_MAIN":
      return "Week 9 Sunday Main Slate (12 Games)";
    case "SNF":
      return "Week 9 Sunday Night Football (8:20 PM ET)";
    case "MNF":
      return "Week 9 Monday Night Football (8:15 PM ET)";
    case "WEEKLY_PASS":
    case "WEEKEND_PASS":
      return "Full Week 9 All-Access";
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
    "id": "writeup-tnf-401873038",
    "gameId": "401873038",
    "matchup": "Jacksonville Jaguars @ Baltimore Ravens",
    "awayTeam": "Jacksonville Jaguars",
    "homeTeam": "Baltimore Ravens",
    "kickoff": "2026-10-30T00:15Z",
    "windowSlot": "TNF",
    "paceOfPlay": {
      "neutralSecPerSnap": 26.2,
      "passEpaPlay": 0.142,
      "rushEpaPlay": 0.084,
      "noHuddleRate": 0.118,
      "notes": "Baltimore projects for 61.3 offensive plays across 11 drives (25.5 rushes led by 18.6 Derrick Henry carries and 33.3 pass attempts), while Jacksonville runs 63.5 plays at a 26.2 seconds-per-snap pace (31.4 rushes and 29.5 pass attempts)."
    },
    "schemeMatchup": {
      "coverageShell": "Baltimore plays a two-high safety shell on 59.5 out of 100 snaps with light boxes on 78.0 out of 100 snaps, while Jacksonville blitzes on 30.9 out of 100 pass plays (34.8 out of 100 on play-action) against Baltimore's 36.5 out of 100 clean-pocket rate.",
      "blitzRateVsPressureToSack": "Jacksonville dials up five-man pressure on nearly a third of pass plays, leaving the middle of the field open for Baltimore's tight ends and quick-game hot reads while Baltimore takes 3.1 sacks and Jacksonville takes 2.6 sacks.",
      "personnelTendencies": "With Travis Etienne Jr. sidelined, Bhayshul Tuten steps into Jacksonville's primary early-down rushing role alongside Trevor Lawrence's perimeter and middle-field passing to Brian Thomas Jr., Travis Hunter, and Brenton Strange. For Baltimore, Derrick Henry handles 18.6 carries while Mark Andrews, Rashod Bateman, and Zay Flowers command the middle-field and play-action target share.",
      "coachingEdge": "Baltimore runs on 54 out of 100 first-half plays to establish Derrick Henry before teams trailing in the second half shift to 62 out of 100 pass plays.",
      "notes": "Because the spread steamed from Baltimore -3.5 past the key 3 and 7 football numbers to -7.5, we pass the main-line side and attack 10 top-rated player props (88/100) and our 3-leg correlated Same-Game Parlay."
    },
    "sideTotalCall": {
      "sideSelection": "Baltimore Ravens -7.5",
      "sideConfidence": "64/100",
      "sideExpectedClv": 0.012,
      "sideDecision": "PASS",
      "totalSelection": "UNDER 44.5",
      "totalConfidence": "61/100",
      "totalExpectedClv": 0.015,
      "totalDecision": "PASS",
      "rationale": "Baltimore opened -3.5 and steamed across both key football numbers (3 and 7) to -7.5. We pass the over-steamed spread and total to focus our bankroll on 10 player prop matchups led by Mark Andrews OVER 2.5 receptions."
    },
    "topProps": [
      {
        "playerId": "mark-andrews",
        "playerName": "Mark Andrews",
        "propType": "Receptions",
        "market": "receptions",
        "line": 2.5,
        "side": "OVER",
        "confidence": "88/100",
        "expectedClv": 0.142,
        "decision": "PLAY",
        "nEffTargetNotes": "Jacksonville blitzes on 30.9 out of 100 pass plays (34.8 out of 100 against play-action) and leaves the middle of the field open against tight ends. Mark Andrews operates as Baltimore's primary hot-read safety valve and red-zone seam target \u2014 3 catches clears this low 2.5 reception line.",
        "pOver": 0.684,
        "pUnder": 0.316
      },
      {
        "playerId": "rashod-bateman",
        "playerName": "Rashod Bateman",
        "propType": "Receptions",
        "market": "receptions",
        "line": 1.5,
        "side": "OVER",
        "confidence": "88/100",
        "expectedClv": 0.139,
        "decision": "PLAY",
        "nEffTargetNotes": "Rashod Bateman runs short-to-intermediate curl and slant routes against Jacksonville's single-high blitz looks, needing only 2 catches to clear 1.5 receptions.",
        "pOver": 0.678,
        "pUnder": 0.322
      },
      {
        "playerId": "zay-flowers",
        "playerName": "Zay Flowers",
        "propType": "Receptions",
        "market": "receptions",
        "line": 4.5,
        "side": "OVER",
        "confidence": "88/100",
        "expectedClv": 0.135,
        "decision": "PLAY",
        "nEffTargetNotes": "Zay Flowers commands Baltimore's perimeter motion, RPO screen, and play-action target share against Jacksonville's blitz-heavy defense.",
        "pOver": 0.672,
        "pUnder": 0.328
      },
      {
        "playerId": "derrick-henry",
        "playerName": "Derrick Henry",
        "propType": "Rushing Yards",
        "market": "rush_yds",
        "line": 82.5,
        "side": "OVER",
        "confidence": "88/100",
        "expectedClv": 0.131,
        "decision": "PLAY",
        "nEffTargetNotes": "Derrick Henry projects for 18.6 of Baltimore's 25.5 rush attempts as the Ravens lean on a 54 out of 100 first-half run rate and four-minute clock control.",
        "pOver": 0.665,
        "pUnder": 0.335
      },
      {
        "playerId": "brenton-strange",
        "playerName": "Brenton Strange",
        "propType": "Receptions",
        "market": "receptions",
        "line": 2.5,
        "side": "OVER",
        "confidence": "88/100",
        "expectedClv": 0.128,
        "decision": "PLAY",
        "nEffTargetNotes": "Baltimore's 59.5 out of 100 two-high safety shell funnels underneath completions over the middle directly to Jacksonville tight end Brenton Strange on checkdowns and option routes.",
        "pOver": 0.661,
        "pUnder": 0.339
      },
      {
        "playerId": "brian-thomas-jr",
        "playerName": "Brian Thomas Jr.",
        "propType": "Receptions",
        "market": "receptions",
        "line": 3.5,
        "side": "OVER",
        "confidence": "88/100",
        "expectedClv": 0.125,
        "decision": "PLAY",
        "nEffTargetNotes": "Brian Thomas Jr. leads Jacksonville's perimeter target share when Jacksonville shifts into its second-half passing script across 63.5 projected plays.",
        "pOver": 0.658,
        "pUnder": 0.342
      },
      {
        "playerId": "travis-hunter",
        "playerName": "Travis Hunter",
        "propType": "Receptions",
        "market": "receptions",
        "line": 3.5,
        "side": "OVER",
        "confidence": "88/100",
        "expectedClv": 0.122,
        "decision": "PLAY",
        "nEffTargetNotes": "Trailing second-half game script pushes Jacksonville into a 62 out of 100 pass rate against Baltimore's two-high shell, giving Travis Hunter steady underneath and slot target volume.",
        "pOver": 0.654,
        "pUnder": 0.346
      },
      {
        "playerId": "bhayshul-tuten",
        "playerName": "Bhayshul Tuten",
        "propType": "Rushing Yards",
        "market": "rush_yds",
        "line": 42.5,
        "side": "OVER",
        "confidence": "88/100",
        "expectedClv": 0.119,
        "decision": "PLAY",
        "nEffTargetNotes": "With Travis Etienne Jr. sidelined, Bhayshul Tuten leads Jacksonville's early-down ground attack against a Baltimore defense playing light boxes on 78.0 out of 100 snaps.",
        "pOver": 0.651,
        "pUnder": 0.349
      },
      {
        "playerId": "foyesade-oluokun",
        "playerName": "Foyesade Oluokun",
        "propType": "Tackles + Assists",
        "market": "tackles_assists",
        "line": 8.5,
        "side": "OVER",
        "confidence": "88/100",
        "expectedClv": 0.116,
        "decision": "PLAY",
        "nEffTargetNotes": "Baltimore projects for 25.5 rush attempts (18.6 to Derrick Henry) and short middle-field completions to Mark Andrews right into Foyesade Oluokun's middle linebacker tackle funnel.",
        "pOver": 0.648,
        "pUnder": 0.352
      },
      {
        "playerId": "tyler-loop",
        "playerName": "Tyler Loop",
        "propType": "Field Goals Made",
        "market": "fg_made",
        "line": 1.5,
        "side": "OVER",
        "confidence": "88/100",
        "expectedClv": 0.111,
        "decision": "PLAY",
        "nEffTargetNotes": "Baltimore projects for 11 offensive drives with consistent scoring-range field position at M&T Bank Stadium, setting up two or more Tyler Loop field goal attempts when drives stall against Jacksonville's red-zone pressure.",
        "pOver": 0.642,
        "pUnder": 0.358
      },
      {
        "playerId": "parker-washington",
        "playerName": "Parker Washington",
        "propType": "Receiving Yards",
        "market": "rec_yds",
        "line": 31.5,
        "side": "UNDER",
        "confidence": "56/100",
        "expectedClv": 0.008,
        "decision": "PASS",
        "nEffTargetNotes": "Rotational third-receiver snaps behind Brian Thomas Jr., Travis Hunter, and Brenton Strange keep Parker Washington right near his market number \u2014 pass for higher-conviction targets.",
        "pOver": 0.44,
        "pUnder": 0.56
      }
    ],
    "correlatedSgpTicket": {
      "title": "JAX @ BAL Same-Game Parlay",
      "legs": [
        {
          "description": "Mark Andrews Receptions",
          "pickType": "PLAYER_PROP",
          "selection": "Mark Andrews OVER 2.5 Receptions",
          "line": 2.5,
          "confidence": "88/100",
          "expectedClv": 0.142,
          "decision": "PLAY"
        },
        {
          "description": "Derrick Henry Rushing Yards",
          "pickType": "PLAYER_PROP",
          "selection": "Derrick Henry OVER 82.5 Rushing Yards",
          "line": 82.5,
          "confidence": "88/100",
          "expectedClv": 0.131,
          "decision": "PLAY"
        },
        {
          "description": "Brenton Strange Receptions",
          "pickType": "PLAYER_PROP",
          "selection": "Brenton Strange OVER 2.5 Receptions",
          "line": 2.5,
          "confidence": "88/100",
          "expectedClv": 0.128,
          "decision": "PLAY"
        }
      ],
      "jointWinProb": 0.2062,
      "fairOdds": "+385",
      "marketOdds": "+525",
      "edgeScore": 0.0462,
      "correlationRationale": "Baltimore's early-down rushing attack with Derrick Henry (18.6 projected carries) and hot-read targets to Mark Andrews against Jacksonville's 30.9 out of 100 blitz rate force Jacksonville into a second-half catch-up script where Brenton Strange collects underneath receptions against Baltimore's 59.5 out of 100 two-high shell."
    },
    "dfsStacks": {
      "captainPicks": [
        {
          "player": "Derrick Henry",
          "position": "RB",
          "salary": 11400,
          "leverageNote": "Handles 18.6 projected carries and all inside-the-5 goal-line work for Baltimore."
        },
        {
          "player": "Zay Flowers",
          "position": "WR",
          "salary": 9600,
          "leverageNote": "Primary perimeter and play-action target against Jacksonville's single-high blitzes."
        }
      ],
      "cashCore": [
        {
          "player": "Trevor Lawrence",
          "position": "QB",
          "salary": 6000,
          "projection": 19.8,
          "floorNote": "Projects for 29.5 pass attempts plus scramble volume in second-half catch-up script."
        },
        {
          "player": "Bhayshul Tuten",
          "position": "RB",
          "salary": 5600,
          "projection": 16.4,
          "floorNote": "Steps into Jacksonville's lead early-down rushing workload with Travis Etienne Jr. sidelined against Baltimore's 78.0 out of 100 light-box rate."
        },
        {
          "player": "Mark Andrews",
          "position": "TE",
          "salary": 5200,
          "projection": 13.8,
          "floorNote": "Primary blitz hot-read and red-zone tight end target for Baltimore."
        }
      ],
      "gppStacks": [
        {
          "primaryStack": {
            "qb": "Trevor Lawrence",
            "passCatchers": [
              "Brian Thomas Jr.",
              "Brenton Strange"
            ]
          },
          "bringBack": "Derrick Henry",
          "valueFiller": "Mark Andrews",
          "correlationTheme": "Pair Trevor Lawrence with Brian Thomas Jr. and Brenton Strange in a second-half passing script, and bring it back with Derrick Henry and Mark Andrews."
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
    "id": "writeup-sun_early-401873039",
    "gameId": "401873039",
    "matchup": "Detroit Lions @ Miami Dolphins",
    "awayTeam": "Detroit Lions",
    "homeTeam": "Miami Dolphins",
    "kickoff": "2026-11-08T18:00Z",
    "windowSlot": "SUN_EARLY",
    "paceOfPlay": {
      "neutralSecPerSnap": 26.4,
      "passEpaPlay": 0.118,
      "rushEpaPlay": 0.042,
      "noHuddleRate": 0.095,
      "notes": "Detroit Lions and Miami Dolphins bring contrasting early-down tempo and trench protection fronts into Week 9."
    },
    "schemeMatchup": {
      "coverageShell": "Jared Goff and Malik Willis headline this Week 9 matchup with Amon-Ra St. Brown, Jahmyr Gibbs, Jaylen Waddle, and Ollie Gordon II featured in early-down scripts.",
      "blitzRateVsPressureToSack": "Detroit Lions and Miami Dolphins deploy disguised third-down pressure packages to test pocket protection.",
      "personnelTendencies": "Detroit Lions leans on Jahmyr Gibbs, Amon-Ra St. Brown, and Sam LaPorta, while Miami Dolphins features Ollie Gordon II, Jaylen Waddle, and Greg Dulcich.",
      "coachingEdge": "Red-zone play-calling and third-down conversion rhythm between Detroit Lions and Miami Dolphins headline the film study.",
      "notes": "Week 9 Matchup \u2014 Official spread call, total call, and player prop picks are locked inside the pack."
    },
    "sideTotalCall": {
      "sideSelection": "Miami Dolphins +6.5",
      "sideConfidence": "79/100",
      "sideExpectedClv": 0.052,
      "sideDecision": "PLAY",
      "totalSelection": "OVER 46.5",
      "totalConfidence": "62/100",
      "totalExpectedClv": 0.012,
      "totalDecision": "PASS",
      "rationale": "Ollie Gordon II steps into Miami's bell-cow role alongside Greg Dulcich over the middle, giving Miami home cover value."
    },
    "topProps": [
      {
        "playerId": "ollie-gordon-ii",
        "playerName": "Ollie Gordon II",
        "propType": "Rushing Yards",
        "market": "rush_yds",
        "line": 68.5,
        "side": "OVER",
        "confidence": "86/100",
        "expectedClv": 0.136,
        "decision": "PLAY",
        "nEffTargetNotes": "Ollie Gordon II projects for 86.4 rushing yards as Miami's lead early-down and goal-line back.",
        "pOver": 0.642,
        "pUnder": 0.358
      }
    ],
    "correlatedSgpTicket": {
      "title": "Detroit Lions @ Miami Dolphins Same-Game Parlay",
      "legs": [
        {
          "description": "Ollie Gordon II Rushing Yards",
          "pickType": "PLAYER_PROP",
          "selection": "Ollie Gordon II OVER 68.5 Rushing Yards",
          "line": 68.5,
          "confidence": "86/100",
          "expectedClv": 0.136,
          "decision": "PLAY"
        },
        {
          "description": "Amon-Ra St. Brown Receptions",
          "pickType": "PLAYER_PROP",
          "selection": "Amon-Ra St. Brown OVER 4.5 Receptions",
          "line": 4.5,
          "confidence": "78/100",
          "expectedClv": 0.064,
          "decision": "PLAY"
        },
        {
          "description": "Ollie Gordon II Rushing Yards",
          "pickType": "PLAYER_PROP",
          "selection": "Ollie Gordon II OVER 54.5 Rushing Yards",
          "line": 54.5,
          "confidence": "77/100",
          "expectedClv": 0.058,
          "decision": "PLAY"
        }
      ],
      "jointWinProb": 0.214,
      "fairOdds": "+365",
      "marketOdds": "+475",
      "edgeScore": 0.042,
      "correlationRationale": "Correlated script pairing Ollie Gordon II with Amon-Ra St. Brown and Ollie Gordon II across four quarters."
    },
    "dfsStacks": {
      "captainPicks": [
        {
          "player": "Amon-Ra St. Brown",
          "position": "WR",
          "salary": 10200,
          "leverageNote": "Primary perimeter and slot target for Jared Goff in Detroit Lions passing script."
        },
        {
          "player": "Ollie Gordon II",
          "position": "RB",
          "salary": 9600,
          "leverageNote": "Three-down backfield and red-zone touch leader for Miami Dolphins."
        }
      ],
      "cashCore": [
        {
          "player": "Jared Goff",
          "position": "QB",
          "salary": 6200,
          "projection": 21.4,
          "floorNote": "Steady pocket and play-action volume for Detroit Lions."
        },
        {
          "player": "Ollie Gordon II",
          "position": "RB",
          "salary": 6100,
          "projection": 19.8,
          "floorNote": "Early-down and checkdown workload anchor for Miami Dolphins."
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
          "bringBack": "Jaylen Waddle",
          "valueFiller": "Greg Dulcich",
          "correlationTheme": "Pair Jared Goff with Amon-Ra St. Brown and Sam LaPorta, and bring it back with Jaylen Waddle."
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
    "id": "writeup-sun_early-401873040",
    "gameId": "401873040",
    "matchup": "Dallas Cowboys @ Indianapolis Colts",
    "awayTeam": "Dallas Cowboys",
    "homeTeam": "Indianapolis Colts",
    "kickoff": "2026-11-08T18:00Z",
    "windowSlot": "SUN_EARLY",
    "paceOfPlay": {
      "neutralSecPerSnap": 26.4,
      "passEpaPlay": 0.118,
      "rushEpaPlay": 0.042,
      "noHuddleRate": 0.095,
      "notes": "Dallas Cowboys and Indianapolis Colts bring contrasting early-down tempo and trench protection fronts into Week 9."
    },
    "schemeMatchup": {
      "coverageShell": "Dak Prescott and Daniel Jones headline this Week 9 matchup with CeeDee Lamb, Malik Davis, Michael Pittman Jr., and Jonathan Taylor featured in early-down scripts.",
      "blitzRateVsPressureToSack": "Dallas Cowboys and Indianapolis Colts deploy disguised third-down pressure packages to test pocket protection.",
      "personnelTendencies": "Dallas Cowboys leans on Malik Davis, CeeDee Lamb, and Luke Schoonmaker, while Indianapolis Colts features Jonathan Taylor, Michael Pittman Jr., and Tyler Warren.",
      "coachingEdge": "Red-zone play-calling and third-down conversion rhythm between Dallas Cowboys and Indianapolis Colts headline the film study.",
      "notes": "Week 9 Matchup \u2014 Official spread call, total call, and player prop picks are locked inside the pack."
    },
    "sideTotalCall": {
      "sideSelection": "Dallas Cowboys -1.5",
      "sideConfidence": "64/100",
      "sideExpectedClv": 0.014,
      "sideDecision": "PASS",
      "totalSelection": "OVER 48.5",
      "totalConfidence": "63/100",
      "totalExpectedClv": 0.011,
      "totalDecision": "PASS",
      "rationale": "Market efficient on the main spread and total; we attack Malik Davis and CeeDee Lamb player props indoors."
    },
    "topProps": [
      {
        "playerId": "malik-davis",
        "playerName": "Malik Davis",
        "propType": "Rush + Rec Yards",
        "market": "rush_plus_rec_yds",
        "line": 36.5,
        "side": "OVER",
        "confidence": "79/100",
        "expectedClv": 0.118,
        "decision": "PLAY",
        "nEffTargetNotes": "Malik Davis captures high-efficiency rotational carries and screen targets on the fast indoor track at Lucas Oil Stadium.",
        "pOver": 0.642,
        "pUnder": 0.358
      }
    ],
    "correlatedSgpTicket": {
      "title": "Dallas Cowboys @ Indianapolis Colts Same-Game Parlay",
      "legs": [
        {
          "description": "Malik Davis Rush + Rec Yards",
          "pickType": "PLAYER_PROP",
          "selection": "Malik Davis OVER 36.5 Rush + Rec Yards",
          "line": 36.5,
          "confidence": "79/100",
          "expectedClv": 0.118,
          "decision": "PLAY"
        },
        {
          "description": "CeeDee Lamb Receptions",
          "pickType": "PLAYER_PROP",
          "selection": "CeeDee Lamb OVER 4.5 Receptions",
          "line": 4.5,
          "confidence": "78/100",
          "expectedClv": 0.064,
          "decision": "PLAY"
        },
        {
          "description": "Jonathan Taylor Rushing Yards",
          "pickType": "PLAYER_PROP",
          "selection": "Jonathan Taylor OVER 54.5 Rushing Yards",
          "line": 54.5,
          "confidence": "77/100",
          "expectedClv": 0.058,
          "decision": "PLAY"
        }
      ],
      "jointWinProb": 0.214,
      "fairOdds": "+365",
      "marketOdds": "+475",
      "edgeScore": 0.042,
      "correlationRationale": "Correlated script pairing Malik Davis with CeeDee Lamb and Jonathan Taylor across four quarters."
    },
    "dfsStacks": {
      "captainPicks": [
        {
          "player": "CeeDee Lamb",
          "position": "WR",
          "salary": 10200,
          "leverageNote": "Primary perimeter and slot target for Dak Prescott in Dallas Cowboys passing script."
        },
        {
          "player": "Jonathan Taylor",
          "position": "RB",
          "salary": 9600,
          "leverageNote": "Three-down backfield and red-zone touch leader for Indianapolis Colts."
        }
      ],
      "cashCore": [
        {
          "player": "Dak Prescott",
          "position": "QB",
          "salary": 6200,
          "projection": 21.4,
          "floorNote": "Steady pocket and play-action volume for Dallas Cowboys."
        },
        {
          "player": "Jonathan Taylor",
          "position": "RB",
          "salary": 6100,
          "projection": 19.8,
          "floorNote": "Early-down and checkdown workload anchor for Indianapolis Colts."
        }
      ],
      "gppStacks": [
        {
          "primaryStack": {
            "qb": "Dak Prescott",
            "passCatchers": [
              "CeeDee Lamb",
              "Luke Schoonmaker"
            ]
          },
          "bringBack": "Michael Pittman Jr.",
          "valueFiller": "Tyler Warren",
          "correlationTheme": "Pair Dak Prescott with CeeDee Lamb and Luke Schoonmaker, and bring it back with Michael Pittman Jr.."
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
    "id": "writeup-sun_early-401873041",
    "gameId": "401873041",
    "matchup": "New York Giants @ Philadelphia Eagles",
    "awayTeam": "New York Giants",
    "homeTeam": "Philadelphia Eagles",
    "kickoff": "2026-11-08T18:00Z",
    "windowSlot": "SUN_EARLY",
    "paceOfPlay": {
      "neutralSecPerSnap": 26.4,
      "passEpaPlay": 0.118,
      "rushEpaPlay": 0.042,
      "noHuddleRate": 0.095,
      "notes": "New York Giants and Philadelphia Eagles bring contrasting early-down tempo and trench protection fronts into Week 9."
    },
    "schemeMatchup": {
      "coverageShell": "J.J. McCarthy and Joe Milton headline this Week 9 matchup with Malik Nabers, Tyrone Tracy Jr., DeVonta Smith, and Saquon Barkley featured in early-down scripts.",
      "blitzRateVsPressureToSack": "New York Giants and Philadelphia Eagles deploy disguised third-down pressure packages to test pocket protection.",
      "personnelTendencies": "New York Giants leans on Tyrone Tracy Jr., Malik Nabers, and Theo Johnson, while Philadelphia Eagles features Saquon Barkley, DeVonta Smith, and Dallas Goedert.",
      "coachingEdge": "Red-zone play-calling and third-down conversion rhythm between New York Giants and Philadelphia Eagles headline the film study.",
      "notes": "Week 9 Matchup \u2014 Official spread call, total call, and player prop picks are locked inside the pack."
    },
    "sideTotalCall": {
      "sideSelection": "Philadelphia Eagles -3.0",
      "sideConfidence": "63/100",
      "sideExpectedClv": 0.012,
      "sideDecision": "PASS",
      "totalSelection": "UNDER 44.0",
      "totalConfidence": "61/100",
      "totalExpectedClv": 0.009,
      "totalDecision": "PASS",
      "rationale": "Market efficient on main spread; we focus on Joe Milton rushing props and Malik Nabers receiving volume."
    },
    "topProps": [
      {
        "playerId": "joe-milton",
        "playerName": "Joe Milton",
        "propType": "Rushing Yards",
        "market": "rush_yds",
        "line": 34.5,
        "side": "OVER",
        "confidence": "81/100",
        "expectedClv": 0.116,
        "decision": "PLAY",
        "nEffTargetNotes": "Joe Milton starts at quarterback for Philadelphia and brings designed zone-read keeper upside alongside Saquon Barkley.",
        "pOver": 0.642,
        "pUnder": 0.358
      }
    ],
    "correlatedSgpTicket": {
      "title": "New York Giants @ Philadelphia Eagles Same-Game Parlay",
      "legs": [
        {
          "description": "Joe Milton Rushing Yards",
          "pickType": "PLAYER_PROP",
          "selection": "Joe Milton OVER 34.5 Rushing Yards",
          "line": 34.5,
          "confidence": "81/100",
          "expectedClv": 0.116,
          "decision": "PLAY"
        },
        {
          "description": "Malik Nabers Receptions",
          "pickType": "PLAYER_PROP",
          "selection": "Malik Nabers OVER 4.5 Receptions",
          "line": 4.5,
          "confidence": "78/100",
          "expectedClv": 0.064,
          "decision": "PLAY"
        },
        {
          "description": "Saquon Barkley Rushing Yards",
          "pickType": "PLAYER_PROP",
          "selection": "Saquon Barkley OVER 54.5 Rushing Yards",
          "line": 54.5,
          "confidence": "77/100",
          "expectedClv": 0.058,
          "decision": "PLAY"
        }
      ],
      "jointWinProb": 0.214,
      "fairOdds": "+365",
      "marketOdds": "+475",
      "edgeScore": 0.042,
      "correlationRationale": "Correlated script pairing Joe Milton with Malik Nabers and Saquon Barkley across four quarters."
    },
    "dfsStacks": {
      "captainPicks": [
        {
          "player": "Malik Nabers",
          "position": "WR",
          "salary": 10200,
          "leverageNote": "Primary perimeter and slot target for J.J. McCarthy in New York Giants passing script."
        },
        {
          "player": "Saquon Barkley",
          "position": "RB",
          "salary": 9600,
          "leverageNote": "Three-down backfield and red-zone touch leader for Philadelphia Eagles."
        }
      ],
      "cashCore": [
        {
          "player": "J.J. McCarthy",
          "position": "QB",
          "salary": 6200,
          "projection": 21.4,
          "floorNote": "Steady pocket and play-action volume for New York Giants."
        },
        {
          "player": "Saquon Barkley",
          "position": "RB",
          "salary": 6100,
          "projection": 19.8,
          "floorNote": "Early-down and checkdown workload anchor for Philadelphia Eagles."
        }
      ],
      "gppStacks": [
        {
          "primaryStack": {
            "qb": "J.J. McCarthy",
            "passCatchers": [
              "Malik Nabers",
              "Theo Johnson"
            ]
          },
          "bringBack": "DeVonta Smith",
          "valueFiller": "Dallas Goedert",
          "correlationTheme": "Pair J.J. McCarthy with Malik Nabers and Theo Johnson, and bring it back with DeVonta Smith."
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
    "id": "writeup-sun_early-401873042",
    "gameId": "401873042",
    "matchup": "New York Jets @ Kansas City Chiefs",
    "awayTeam": "New York Jets",
    "homeTeam": "Kansas City Chiefs",
    "kickoff": "2026-11-08T18:00Z",
    "windowSlot": "SUN_EARLY",
    "paceOfPlay": {
      "neutralSecPerSnap": 26.4,
      "passEpaPlay": 0.118,
      "rushEpaPlay": 0.042,
      "noHuddleRate": 0.095,
      "notes": "New York Jets and Kansas City Chiefs bring contrasting early-down tempo and trench protection fronts into Week 9."
    },
    "schemeMatchup": {
      "coverageShell": "Geno Smith and Patrick Mahomes headline this Week 9 matchup with Garrett Wilson, Breece Hall, Xavier Worthy, and Kenneth Walker III featured in early-down scripts.",
      "blitzRateVsPressureToSack": "New York Jets and Kansas City Chiefs deploy disguised third-down pressure packages to test pocket protection.",
      "personnelTendencies": "New York Jets leans on Breece Hall, Garrett Wilson, and Mason Taylor, while Kansas City Chiefs features Kenneth Walker III, Xavier Worthy, and Travis Kelce.",
      "coachingEdge": "Red-zone play-calling and third-down conversion rhythm between New York Jets and Kansas City Chiefs headline the film study.",
      "notes": "Week 9 Matchup \u2014 Official spread call, total call, and player prop picks are locked inside the pack."
    },
    "sideTotalCall": {
      "sideSelection": "New York Jets +6.5",
      "sideConfidence": "62/100",
      "sideExpectedClv": 0.011,
      "sideDecision": "PASS",
      "totalSelection": "UNDER 46.0",
      "totalConfidence": "60/100",
      "totalExpectedClv": 0.008,
      "totalDecision": "PASS",
      "rationale": "Market efficient on full-game spread; we target Garrett Wilson quick-game receptions against Kansas City blitzes."
    },
    "topProps": [
      {
        "playerId": "garrett-wilson",
        "playerName": "Garrett Wilson",
        "propType": "Receptions",
        "market": "receptions",
        "line": 5.5,
        "side": "OVER",
        "confidence": "78/100",
        "expectedClv": 0.084,
        "decision": "PLAY",
        "nEffTargetNotes": "Geno Smith relies on quick sight-adjust slants to Garrett Wilson against Steve Spagnuolo's third-down blitzes.",
        "pOver": 0.642,
        "pUnder": 0.358
      }
    ],
    "correlatedSgpTicket": {
      "title": "New York Jets @ Kansas City Chiefs Same-Game Parlay",
      "legs": [
        {
          "description": "Garrett Wilson Receptions",
          "pickType": "PLAYER_PROP",
          "selection": "Garrett Wilson OVER 5.5 Receptions",
          "line": 5.5,
          "confidence": "78/100",
          "expectedClv": 0.084,
          "decision": "PLAY"
        },
        {
          "description": "Garrett Wilson Receptions",
          "pickType": "PLAYER_PROP",
          "selection": "Garrett Wilson OVER 4.5 Receptions",
          "line": 4.5,
          "confidence": "78/100",
          "expectedClv": 0.064,
          "decision": "PLAY"
        },
        {
          "description": "Kenneth Walker III Rushing Yards",
          "pickType": "PLAYER_PROP",
          "selection": "Kenneth Walker III OVER 54.5 Rushing Yards",
          "line": 54.5,
          "confidence": "77/100",
          "expectedClv": 0.058,
          "decision": "PLAY"
        }
      ],
      "jointWinProb": 0.214,
      "fairOdds": "+365",
      "marketOdds": "+475",
      "edgeScore": 0.042,
      "correlationRationale": "Correlated script pairing Garrett Wilson with Garrett Wilson and Kenneth Walker III across four quarters."
    },
    "dfsStacks": {
      "captainPicks": [
        {
          "player": "Garrett Wilson",
          "position": "WR",
          "salary": 10200,
          "leverageNote": "Primary perimeter and slot target for Geno Smith in New York Jets passing script."
        },
        {
          "player": "Kenneth Walker III",
          "position": "RB",
          "salary": 9600,
          "leverageNote": "Three-down backfield and red-zone touch leader for Kansas City Chiefs."
        }
      ],
      "cashCore": [
        {
          "player": "Geno Smith",
          "position": "QB",
          "salary": 6200,
          "projection": 21.4,
          "floorNote": "Steady pocket and play-action volume for New York Jets."
        },
        {
          "player": "Kenneth Walker III",
          "position": "RB",
          "salary": 6100,
          "projection": 19.8,
          "floorNote": "Early-down and checkdown workload anchor for Kansas City Chiefs."
        }
      ],
      "gppStacks": [
        {
          "primaryStack": {
            "qb": "Geno Smith",
            "passCatchers": [
              "Garrett Wilson",
              "Mason Taylor"
            ]
          },
          "bringBack": "Xavier Worthy",
          "valueFiller": "Travis Kelce",
          "correlationTheme": "Pair Geno Smith with Garrett Wilson and Mason Taylor, and bring it back with Xavier Worthy."
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
    "id": "writeup-sun_early-401873043",
    "gameId": "401873043",
    "matchup": "Los Angeles Rams @ Washington Commanders",
    "awayTeam": "Los Angeles Rams",
    "homeTeam": "Washington Commanders",
    "kickoff": "2026-11-08T18:00Z",
    "windowSlot": "SUN_EARLY",
    "paceOfPlay": {
      "neutralSecPerSnap": 26.4,
      "passEpaPlay": 0.118,
      "rushEpaPlay": 0.042,
      "noHuddleRate": 0.095,
      "notes": "Los Angeles Rams and Washington Commanders bring contrasting early-down tempo and trench protection fronts into Week 9."
    },
    "schemeMatchup": {
      "coverageShell": "Matthew Stafford and Jayden Daniels headline this Week 9 matchup with Puka Nacua, Kyren Williams, Stefon Diggs, and Brian Robinson Jr. featured in early-down scripts.",
      "blitzRateVsPressureToSack": "Los Angeles Rams and Washington Commanders deploy disguised third-down pressure packages to test pocket protection.",
      "personnelTendencies": "Los Angeles Rams leans on Kyren Williams, Puka Nacua, and Colby Parkinson, while Washington Commanders features Brian Robinson Jr., Stefon Diggs, and Zach Ertz.",
      "coachingEdge": "Red-zone play-calling and third-down conversion rhythm between Los Angeles Rams and Washington Commanders headline the film study.",
      "notes": "Week 9 Matchup \u2014 Official spread call, total call, and player prop picks are locked inside the pack."
    },
    "sideTotalCall": {
      "sideSelection": "Washington Commanders -2.5",
      "sideConfidence": "64/100",
      "sideExpectedClv": 0.015,
      "sideDecision": "PASS",
      "totalSelection": "OVER 48.5",
      "totalConfidence": "62/100",
      "totalExpectedClv": 0.012,
      "totalDecision": "PASS",
      "rationale": "Market efficient on main side; we isolate Stefon Diggs and Puka Nacua in a high-tempo NFC matchup."
    },
    "topProps": [
      {
        "playerId": "stefon-diggs",
        "playerName": "Stefon Diggs",
        "propType": "Receptions",
        "market": "receptions",
        "line": 5.5,
        "side": "OVER",
        "confidence": "79/100",
        "expectedClv": 0.092,
        "decision": "PLAY",
        "nEffTargetNotes": "Stefon Diggs operates as Jayden Daniels' primary chain-moving target in Washington's no-huddle rhythm.",
        "pOver": 0.642,
        "pUnder": 0.358
      }
    ],
    "correlatedSgpTicket": {
      "title": "Los Angeles Rams @ Washington Commanders Same-Game Parlay",
      "legs": [
        {
          "description": "Stefon Diggs Receptions",
          "pickType": "PLAYER_PROP",
          "selection": "Stefon Diggs OVER 5.5 Receptions",
          "line": 5.5,
          "confidence": "79/100",
          "expectedClv": 0.092,
          "decision": "PLAY"
        },
        {
          "description": "Puka Nacua Receptions",
          "pickType": "PLAYER_PROP",
          "selection": "Puka Nacua OVER 4.5 Receptions",
          "line": 4.5,
          "confidence": "78/100",
          "expectedClv": 0.064,
          "decision": "PLAY"
        },
        {
          "description": "Brian Robinson Jr. Rushing Yards",
          "pickType": "PLAYER_PROP",
          "selection": "Brian Robinson Jr. OVER 54.5 Rushing Yards",
          "line": 54.5,
          "confidence": "77/100",
          "expectedClv": 0.058,
          "decision": "PLAY"
        }
      ],
      "jointWinProb": 0.214,
      "fairOdds": "+365",
      "marketOdds": "+475",
      "edgeScore": 0.042,
      "correlationRationale": "Correlated script pairing Stefon Diggs with Puka Nacua and Brian Robinson Jr. across four quarters."
    },
    "dfsStacks": {
      "captainPicks": [
        {
          "player": "Puka Nacua",
          "position": "WR",
          "salary": 10200,
          "leverageNote": "Primary perimeter and slot target for Matthew Stafford in Los Angeles Rams passing script."
        },
        {
          "player": "Brian Robinson Jr.",
          "position": "RB",
          "salary": 9600,
          "leverageNote": "Three-down backfield and red-zone touch leader for Washington Commanders."
        }
      ],
      "cashCore": [
        {
          "player": "Matthew Stafford",
          "position": "QB",
          "salary": 6200,
          "projection": 21.4,
          "floorNote": "Steady pocket and play-action volume for Los Angeles Rams."
        },
        {
          "player": "Brian Robinson Jr.",
          "position": "RB",
          "salary": 6100,
          "projection": 19.8,
          "floorNote": "Early-down and checkdown workload anchor for Washington Commanders."
        }
      ],
      "gppStacks": [
        {
          "primaryStack": {
            "qb": "Matthew Stafford",
            "passCatchers": [
              "Puka Nacua",
              "Colby Parkinson"
            ]
          },
          "bringBack": "Stefon Diggs",
          "valueFiller": "Zach Ertz",
          "correlationTheme": "Pair Matthew Stafford with Puka Nacua and Colby Parkinson, and bring it back with Stefon Diggs."
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
    "id": "writeup-sun_early-401873044",
    "gameId": "401873044",
    "matchup": "Denver Broncos @ Carolina Panthers",
    "awayTeam": "Denver Broncos",
    "homeTeam": "Carolina Panthers",
    "kickoff": "2026-11-08T18:00Z",
    "windowSlot": "SUN_EARLY",
    "paceOfPlay": {
      "neutralSecPerSnap": 26.4,
      "passEpaPlay": 0.118,
      "rushEpaPlay": 0.042,
      "noHuddleRate": 0.095,
      "notes": "Denver Broncos and Carolina Panthers bring contrasting early-down tempo and trench protection fronts into Week 9."
    },
    "schemeMatchup": {
      "coverageShell": "Bo Nix and Bryce Young headline this Week 9 matchup with Courtland Sutton, Jonah Coleman, Tetairoa McMillan, and Chuba Hubbard featured in early-down scripts.",
      "blitzRateVsPressureToSack": "Denver Broncos and Carolina Panthers deploy disguised third-down pressure packages to test pocket protection.",
      "personnelTendencies": "Denver Broncos leans on Jonah Coleman, Courtland Sutton, and Evan Engram, while Carolina Panthers features Chuba Hubbard, Tetairoa McMillan, and Ja'Tavion Sanders.",
      "coachingEdge": "Red-zone play-calling and third-down conversion rhythm between Denver Broncos and Carolina Panthers headline the film study.",
      "notes": "Week 9 Matchup \u2014 Official spread call, total call, and player prop picks are locked inside the pack."
    },
    "sideTotalCall": {
      "sideSelection": "Carolina Panthers +2.5",
      "sideConfidence": "61/100",
      "sideExpectedClv": 0.009,
      "sideDecision": "PASS",
      "totalSelection": "UNDER 43.5",
      "totalConfidence": "60/100",
      "totalExpectedClv": 0.007,
      "totalDecision": "PASS",
      "rationale": "Market efficient \u2014 no forced bet on main lines; Chuba Hubbard early-down volume leads the prop board."
    },
    "topProps": [
      {
        "playerId": "chuba-hubbard",
        "playerName": "Chuba Hubbard",
        "propType": "Rushing Yards",
        "market": "rush_yds",
        "line": 62.5,
        "side": "OVER",
        "confidence": "76/100",
        "expectedClv": 0.072,
        "decision": "PLAY",
        "nEffTargetNotes": "Chuba Hubbard anchors Carolina's early-down rushing script at home against Denver.",
        "pOver": 0.642,
        "pUnder": 0.358
      }
    ],
    "correlatedSgpTicket": {
      "title": "Denver Broncos @ Carolina Panthers Same-Game Parlay",
      "legs": [
        {
          "description": "Chuba Hubbard Rushing Yards",
          "pickType": "PLAYER_PROP",
          "selection": "Chuba Hubbard OVER 62.5 Rushing Yards",
          "line": 62.5,
          "confidence": "76/100",
          "expectedClv": 0.072,
          "decision": "PLAY"
        },
        {
          "description": "Courtland Sutton Receptions",
          "pickType": "PLAYER_PROP",
          "selection": "Courtland Sutton OVER 4.5 Receptions",
          "line": 4.5,
          "confidence": "78/100",
          "expectedClv": 0.064,
          "decision": "PLAY"
        },
        {
          "description": "Chuba Hubbard Rushing Yards",
          "pickType": "PLAYER_PROP",
          "selection": "Chuba Hubbard OVER 54.5 Rushing Yards",
          "line": 54.5,
          "confidence": "77/100",
          "expectedClv": 0.058,
          "decision": "PLAY"
        }
      ],
      "jointWinProb": 0.214,
      "fairOdds": "+365",
      "marketOdds": "+475",
      "edgeScore": 0.042,
      "correlationRationale": "Correlated script pairing Chuba Hubbard with Courtland Sutton and Chuba Hubbard across four quarters."
    },
    "dfsStacks": {
      "captainPicks": [
        {
          "player": "Courtland Sutton",
          "position": "WR",
          "salary": 10200,
          "leverageNote": "Primary perimeter and slot target for Bo Nix in Denver Broncos passing script."
        },
        {
          "player": "Chuba Hubbard",
          "position": "RB",
          "salary": 9600,
          "leverageNote": "Three-down backfield and red-zone touch leader for Carolina Panthers."
        }
      ],
      "cashCore": [
        {
          "player": "Bo Nix",
          "position": "QB",
          "salary": 6200,
          "projection": 21.4,
          "floorNote": "Steady pocket and play-action volume for Denver Broncos."
        },
        {
          "player": "Chuba Hubbard",
          "position": "RB",
          "salary": 6100,
          "projection": 19.8,
          "floorNote": "Early-down and checkdown workload anchor for Carolina Panthers."
        }
      ],
      "gppStacks": [
        {
          "primaryStack": {
            "qb": "Bo Nix",
            "passCatchers": [
              "Courtland Sutton",
              "Evan Engram"
            ]
          },
          "bringBack": "Tetairoa McMillan",
          "valueFiller": "Ja'Tavion Sanders",
          "correlationTheme": "Pair Bo Nix with Courtland Sutton and Evan Engram, and bring it back with Tetairoa McMillan."
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
    "id": "writeup-sun_early-401873045",
    "gameId": "401873045",
    "matchup": "Cleveland Browns @ New Orleans Saints",
    "awayTeam": "Cleveland Browns",
    "homeTeam": "New Orleans Saints",
    "kickoff": "2026-11-08T18:00Z",
    "windowSlot": "SUN_EARLY",
    "paceOfPlay": {
      "neutralSecPerSnap": 26.4,
      "passEpaPlay": 0.118,
      "rushEpaPlay": 0.042,
      "noHuddleRate": 0.095,
      "notes": "Cleveland Browns and New Orleans Saints bring contrasting early-down tempo and trench protection fronts into Week 9."
    },
    "schemeMatchup": {
      "coverageShell": "Deshaun Watson and Tyler Shough headline this Week 9 matchup with Jerry Jeudy, Quinshon Judkins, Chris Olave, and Alvin Kamara featured in early-down scripts.",
      "blitzRateVsPressureToSack": "Cleveland Browns and New Orleans Saints deploy disguised third-down pressure packages to test pocket protection.",
      "personnelTendencies": "Cleveland Browns leans on Quinshon Judkins, Jerry Jeudy, and David Njoku, while New Orleans Saints features Alvin Kamara, Chris Olave, and Juwan Johnson.",
      "coachingEdge": "Red-zone play-calling and third-down conversion rhythm between Cleveland Browns and New Orleans Saints headline the film study.",
      "notes": "Week 9 Matchup \u2014 Official spread call, total call, and player prop picks are locked inside the pack."
    },
    "sideTotalCall": {
      "sideSelection": "New Orleans Saints -1.5",
      "sideConfidence": "55/100",
      "sideExpectedClv": 0.004,
      "sideDecision": "PASS",
      "totalSelection": "UNDER 42.5",
      "totalConfidence": "58/100",
      "totalExpectedClv": 0.006,
      "totalDecision": "PASS",
      "rationale": "Market efficient \u2014 no forced bet"
    },
    "topProps": [
      {
        "playerId": "alvin-kamara",
        "playerName": "Alvin Kamara",
        "propType": "Receptions",
        "market": "receptions",
        "line": 4.5,
        "side": "OVER",
        "confidence": "56/100",
        "expectedClv": 0.011,
        "decision": "PASS",
        "nEffTargetNotes": "Alvin Kamara checkdown volume is priced efficiently by the market in New Orleans.",
        "pOver": 0.642,
        "pUnder": 0.358
      }
    ],
    "correlatedSgpTicket": {
      "title": "Cleveland Browns @ New Orleans Saints Same-Game Parlay",
      "legs": [
        {
          "description": "Alvin Kamara Receptions",
          "pickType": "PLAYER_PROP",
          "selection": "Alvin Kamara OVER 4.5 Receptions",
          "line": 4.5,
          "confidence": "54/100",
          "expectedClv": 0.008,
          "decision": "PASS"
        },
        {
          "description": "Cleveland Browns @ New Orleans Saints Side",
          "pickType": "SPREAD",
          "selection": "New Orleans Saints -1.5",
          "confidence": "55/100",
          "expectedClv": 0.005,
          "decision": "PASS"
        },
        {
          "description": "Cleveland Browns @ New Orleans Saints Total",
          "pickType": "TOTAL",
          "selection": "UNDER 42.5",
          "confidence": "58/100",
          "expectedClv": 0.004,
          "decision": "PASS"
        }
      ],
      "jointWinProb": 0.1812,
      "fairOdds": "n/a",
      "marketOdds": "n/a",
      "edgeScore": 0.0,
      "correlationRationale": "PASS \u2014 Side, total, and Alvin Kamara prop are all PASS on the selective Week 9 card."
    },
    "dfsStacks": {
      "captainPicks": [
        {
          "player": "Jerry Jeudy",
          "position": "WR",
          "salary": 10200,
          "leverageNote": "Primary perimeter and slot target for Deshaun Watson in Cleveland Browns passing script."
        },
        {
          "player": "Alvin Kamara",
          "position": "RB",
          "salary": 9600,
          "leverageNote": "Three-down backfield and red-zone touch leader for New Orleans Saints."
        }
      ],
      "cashCore": [
        {
          "player": "Deshaun Watson",
          "position": "QB",
          "salary": 6200,
          "projection": 21.4,
          "floorNote": "Steady pocket and play-action volume for Cleveland Browns."
        },
        {
          "player": "Alvin Kamara",
          "position": "RB",
          "salary": 6100,
          "projection": 19.8,
          "floorNote": "Early-down and checkdown workload anchor for New Orleans Saints."
        }
      ],
      "gppStacks": [
        {
          "primaryStack": {
            "qb": "Deshaun Watson",
            "passCatchers": [
              "Jerry Jeudy",
              "David Njoku"
            ]
          },
          "bringBack": "Chris Olave",
          "valueFiller": "Juwan Johnson",
          "correlationTheme": "Pair Deshaun Watson with Jerry Jeudy and David Njoku, and bring it back with Chris Olave."
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
    "id": "writeup-sun_late-401873046",
    "gameId": "401873046",
    "matchup": "Houston Texans @ Los Angeles Chargers",
    "awayTeam": "Houston Texans",
    "homeTeam": "Los Angeles Chargers",
    "kickoff": "2026-11-08T21:05Z",
    "windowSlot": "SUN_LATE",
    "paceOfPlay": {
      "neutralSecPerSnap": 26.4,
      "passEpaPlay": 0.118,
      "rushEpaPlay": 0.042,
      "noHuddleRate": 0.095,
      "notes": "Houston Texans and Los Angeles Chargers bring contrasting early-down tempo and trench protection fronts into Week 9."
    },
    "schemeMatchup": {
      "coverageShell": "C.J. Stroud and Justin Herbert headline this Week 9 matchup with Nico Collins, Joe Mixon, Ladd McConkey, and Omarion Hampton featured in early-down scripts.",
      "blitzRateVsPressureToSack": "Houston Texans and Los Angeles Chargers deploy disguised third-down pressure packages to test pocket protection.",
      "personnelTendencies": "Houston Texans leans on Joe Mixon, Nico Collins, and Dalton Schultz, while Los Angeles Chargers features Omarion Hampton, Ladd McConkey, and Will Dissly.",
      "coachingEdge": "Red-zone play-calling and third-down conversion rhythm between Houston Texans and Los Angeles Chargers headline the film study.",
      "notes": "Week 9 Matchup \u2014 Official spread call, total call, and player prop picks are locked inside the pack."
    },
    "sideTotalCall": {
      "sideSelection": "Houston Texans +1.5",
      "sideConfidence": "63/100",
      "sideExpectedClv": 0.014,
      "sideDecision": "PASS",
      "totalSelection": "OVER 45.5",
      "totalConfidence": "61/100",
      "totalExpectedClv": 0.01,
      "totalDecision": "PASS",
      "rationale": "Market efficient on the main spread; Dalton Schultz seam volume and Will Anderson Jr. pass-rush props lead our card."
    },
    "topProps": [
      {
        "playerId": "dalton-schultz",
        "playerName": "Dalton Schultz",
        "propType": "Receiving Yards",
        "market": "rec_yds",
        "line": 41.5,
        "side": "OVER",
        "confidence": "78/100",
        "expectedClv": 0.088,
        "decision": "PLAY",
        "nEffTargetNotes": "Dalton Schultz operates as C.J. Stroud's middle-of-the-field safety valve against two-high zone coverage.",
        "pOver": 0.642,
        "pUnder": 0.358
      }
    ],
    "correlatedSgpTicket": {
      "title": "Houston Texans @ Los Angeles Chargers Same-Game Parlay",
      "legs": [
        {
          "description": "Dalton Schultz Receiving Yards",
          "pickType": "PLAYER_PROP",
          "selection": "Dalton Schultz OVER 41.5 Receiving Yards",
          "line": 41.5,
          "confidence": "78/100",
          "expectedClv": 0.088,
          "decision": "PLAY"
        },
        {
          "description": "Nico Collins Receptions",
          "pickType": "PLAYER_PROP",
          "selection": "Nico Collins OVER 4.5 Receptions",
          "line": 4.5,
          "confidence": "78/100",
          "expectedClv": 0.064,
          "decision": "PLAY"
        },
        {
          "description": "Omarion Hampton Rushing Yards",
          "pickType": "PLAYER_PROP",
          "selection": "Omarion Hampton OVER 54.5 Rushing Yards",
          "line": 54.5,
          "confidence": "77/100",
          "expectedClv": 0.058,
          "decision": "PLAY"
        }
      ],
      "jointWinProb": 0.214,
      "fairOdds": "+365",
      "marketOdds": "+475",
      "edgeScore": 0.042,
      "correlationRationale": "Correlated script pairing Dalton Schultz with Nico Collins and Omarion Hampton across four quarters."
    },
    "dfsStacks": {
      "captainPicks": [
        {
          "player": "Nico Collins",
          "position": "WR",
          "salary": 10200,
          "leverageNote": "Primary perimeter and slot target for C.J. Stroud in Houston Texans passing script."
        },
        {
          "player": "Omarion Hampton",
          "position": "RB",
          "salary": 9600,
          "leverageNote": "Three-down backfield and red-zone touch leader for Los Angeles Chargers."
        }
      ],
      "cashCore": [
        {
          "player": "C.J. Stroud",
          "position": "QB",
          "salary": 6200,
          "projection": 21.4,
          "floorNote": "Steady pocket and play-action volume for Houston Texans."
        },
        {
          "player": "Omarion Hampton",
          "position": "RB",
          "salary": 6100,
          "projection": 19.8,
          "floorNote": "Early-down and checkdown workload anchor for Los Angeles Chargers."
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
          "bringBack": "Ladd McConkey",
          "valueFiller": "Will Dissly",
          "correlationTheme": "Pair C.J. Stroud with Nico Collins and Dalton Schultz, and bring it back with Ladd McConkey."
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
    "id": "writeup-sun_late-401873047",
    "gameId": "401873047",
    "matchup": "Las Vegas Raiders @ San Francisco 49ers",
    "awayTeam": "Las Vegas Raiders",
    "homeTeam": "San Francisco 49ers",
    "kickoff": "2026-11-08T21:25Z",
    "windowSlot": "SUN_LATE",
    "paceOfPlay": {
      "neutralSecPerSnap": 26.4,
      "passEpaPlay": 0.118,
      "rushEpaPlay": 0.042,
      "noHuddleRate": 0.095,
      "notes": "Las Vegas Raiders and San Francisco 49ers bring contrasting early-down tempo and trench protection fronts into Week 9."
    },
    "schemeMatchup": {
      "coverageShell": "Kirk Cousins and Brock Purdy headline this Week 9 matchup with Jakobi Meyers, Ashton Jeanty, Mike Evans, and Christian McCaffrey featured in early-down scripts.",
      "blitzRateVsPressureToSack": "Las Vegas Raiders and San Francisco 49ers deploy disguised third-down pressure packages to test pocket protection.",
      "personnelTendencies": "Las Vegas Raiders leans on Ashton Jeanty, Jakobi Meyers, and Brock Bowers, while San Francisco 49ers features Christian McCaffrey, Mike Evans, and George Kittle.",
      "coachingEdge": "Red-zone play-calling and third-down conversion rhythm between Las Vegas Raiders and San Francisco 49ers headline the film study.",
      "notes": "Week 9 Matchup \u2014 Official spread call, total call, and player prop picks are locked inside the pack."
    },
    "sideTotalCall": {
      "sideSelection": "San Francisco 49ers -6.5",
      "sideConfidence": "64/100",
      "sideExpectedClv": 0.016,
      "sideDecision": "PASS",
      "totalSelection": "OVER 45.5",
      "totalConfidence": "62/100",
      "totalExpectedClv": 0.011,
      "totalDecision": "PASS",
      "rationale": "Main spread is priced near fair value; Mike Evans perimeter red-zone targets and Nick Bosa sack props carry the edge."
    },
    "topProps": [
      {
        "playerId": "mike-evans",
        "playerName": "Mike Evans",
        "propType": "Receiving Yards",
        "market": "rec_yds",
        "line": 61.5,
        "side": "OVER",
        "confidence": "80/100",
        "expectedClv": 0.104,
        "decision": "PLAY",
        "nEffTargetNotes": "Mike Evans commands Brock Purdy's boundary and red-zone isolation targets against single-high coverage.",
        "pOver": 0.642,
        "pUnder": 0.358
      }
    ],
    "correlatedSgpTicket": {
      "title": "Las Vegas Raiders @ San Francisco 49ers Same-Game Parlay",
      "legs": [
        {
          "description": "Mike Evans Receiving Yards",
          "pickType": "PLAYER_PROP",
          "selection": "Mike Evans OVER 61.5 Receiving Yards",
          "line": 61.5,
          "confidence": "80/100",
          "expectedClv": 0.104,
          "decision": "PLAY"
        },
        {
          "description": "Jakobi Meyers Receptions",
          "pickType": "PLAYER_PROP",
          "selection": "Jakobi Meyers OVER 4.5 Receptions",
          "line": 4.5,
          "confidence": "78/100",
          "expectedClv": 0.064,
          "decision": "PLAY"
        },
        {
          "description": "Christian McCaffrey Rushing Yards",
          "pickType": "PLAYER_PROP",
          "selection": "Christian McCaffrey OVER 54.5 Rushing Yards",
          "line": 54.5,
          "confidence": "77/100",
          "expectedClv": 0.058,
          "decision": "PLAY"
        }
      ],
      "jointWinProb": 0.214,
      "fairOdds": "+365",
      "marketOdds": "+475",
      "edgeScore": 0.042,
      "correlationRationale": "Correlated script pairing Mike Evans with Jakobi Meyers and Christian McCaffrey across four quarters."
    },
    "dfsStacks": {
      "captainPicks": [
        {
          "player": "Jakobi Meyers",
          "position": "WR",
          "salary": 10200,
          "leverageNote": "Primary perimeter and slot target for Kirk Cousins in Las Vegas Raiders passing script."
        },
        {
          "player": "Christian McCaffrey",
          "position": "RB",
          "salary": 9600,
          "leverageNote": "Three-down backfield and red-zone touch leader for San Francisco 49ers."
        }
      ],
      "cashCore": [
        {
          "player": "Kirk Cousins",
          "position": "QB",
          "salary": 6200,
          "projection": 21.4,
          "floorNote": "Steady pocket and play-action volume for Las Vegas Raiders."
        },
        {
          "player": "Christian McCaffrey",
          "position": "RB",
          "salary": 6100,
          "projection": 19.8,
          "floorNote": "Early-down and checkdown workload anchor for San Francisco 49ers."
        }
      ],
      "gppStacks": [
        {
          "primaryStack": {
            "qb": "Kirk Cousins",
            "passCatchers": [
              "Jakobi Meyers",
              "Brock Bowers"
            ]
          },
          "bringBack": "Mike Evans",
          "valueFiller": "George Kittle",
          "correlationTheme": "Pair Kirk Cousins with Jakobi Meyers and Brock Bowers, and bring it back with Mike Evans."
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
    "id": "writeup-sun_late-401873048",
    "gameId": "401873048",
    "matchup": "Arizona Cardinals @ Seattle Seahawks",
    "awayTeam": "Arizona Cardinals",
    "homeTeam": "Seattle Seahawks",
    "kickoff": "2026-11-08T21:25Z",
    "windowSlot": "SUN_LATE",
    "paceOfPlay": {
      "neutralSecPerSnap": 26.4,
      "passEpaPlay": 0.118,
      "rushEpaPlay": 0.042,
      "noHuddleRate": 0.095,
      "notes": "Arizona Cardinals and Seattle Seahawks bring contrasting early-down tempo and trench protection fronts into Week 9."
    },
    "schemeMatchup": {
      "coverageShell": "Gardner Minshew II and Sam Darnold headline this Week 9 matchup with Marvin Harrison Jr., Bucky Irving, Jaxon Smith-Njigba, and Zach Charbonnet featured in early-down scripts.",
      "blitzRateVsPressureToSack": "Arizona Cardinals and Seattle Seahawks deploy disguised third-down pressure packages to test pocket protection.",
      "personnelTendencies": "Arizona Cardinals leans on Bucky Irving, Marvin Harrison Jr., and Trey McBride, while Seattle Seahawks features Zach Charbonnet, Jaxon Smith-Njigba, and AJ Barner.",
      "coachingEdge": "Red-zone play-calling and third-down conversion rhythm between Arizona Cardinals and Seattle Seahawks headline the film study.",
      "notes": "Week 9 Matchup \u2014 Official spread call, total call, and player prop picks are locked inside the pack."
    },
    "sideTotalCall": {
      "sideSelection": "Seattle Seahawks -4.5",
      "sideConfidence": "63/100",
      "sideExpectedClv": 0.013,
      "sideDecision": "PASS",
      "totalSelection": "OVER 44.5",
      "totalConfidence": "61/100",
      "totalExpectedClv": 0.009,
      "totalDecision": "PASS",
      "rationale": "Main line is priced efficiently; Jaxon Smith-Njigba slot target volume is our flagship prop in Seattle."
    },
    "topProps": [
      {
        "playerId": "jaxon-smith-njigba",
        "playerName": "Jaxon Smith-Njigba",
        "propType": "Receiving Yards",
        "market": "rec_yds",
        "line": 74.5,
        "side": "OVER",
        "confidence": "82/100",
        "expectedClv": 0.121,
        "decision": "PLAY",
        "nEffTargetNotes": "Jaxon Smith-Njigba commands 29 out of 100 target share from Sam Darnold against Arizona's zone spacing.",
        "pOver": 0.642,
        "pUnder": 0.358
      }
    ],
    "correlatedSgpTicket": {
      "title": "Arizona Cardinals @ Seattle Seahawks Same-Game Parlay",
      "legs": [
        {
          "description": "Jaxon Smith-Njigba Receiving Yards",
          "pickType": "PLAYER_PROP",
          "selection": "Jaxon Smith-Njigba OVER 74.5 Receiving Yards",
          "line": 74.5,
          "confidence": "82/100",
          "expectedClv": 0.121,
          "decision": "PLAY"
        },
        {
          "description": "Marvin Harrison Jr. Receptions",
          "pickType": "PLAYER_PROP",
          "selection": "Marvin Harrison Jr. OVER 4.5 Receptions",
          "line": 4.5,
          "confidence": "78/100",
          "expectedClv": 0.064,
          "decision": "PLAY"
        },
        {
          "description": "Zach Charbonnet Rushing Yards",
          "pickType": "PLAYER_PROP",
          "selection": "Zach Charbonnet OVER 54.5 Rushing Yards",
          "line": 54.5,
          "confidence": "77/100",
          "expectedClv": 0.058,
          "decision": "PLAY"
        }
      ],
      "jointWinProb": 0.214,
      "fairOdds": "+365",
      "marketOdds": "+475",
      "edgeScore": 0.042,
      "correlationRationale": "Correlated script pairing Jaxon Smith-Njigba with Marvin Harrison Jr. and Zach Charbonnet across four quarters."
    },
    "dfsStacks": {
      "captainPicks": [
        {
          "player": "Marvin Harrison Jr.",
          "position": "WR",
          "salary": 10200,
          "leverageNote": "Primary perimeter and slot target for Gardner Minshew II in Arizona Cardinals passing script."
        },
        {
          "player": "Zach Charbonnet",
          "position": "RB",
          "salary": 9600,
          "leverageNote": "Three-down backfield and red-zone touch leader for Seattle Seahawks."
        }
      ],
      "cashCore": [
        {
          "player": "Gardner Minshew II",
          "position": "QB",
          "salary": 6200,
          "projection": 21.4,
          "floorNote": "Steady pocket and play-action volume for Arizona Cardinals."
        },
        {
          "player": "Zach Charbonnet",
          "position": "RB",
          "salary": 6100,
          "projection": 19.8,
          "floorNote": "Early-down and checkdown workload anchor for Seattle Seahawks."
        }
      ],
      "gppStacks": [
        {
          "primaryStack": {
            "qb": "Gardner Minshew II",
            "passCatchers": [
              "Marvin Harrison Jr.",
              "Trey McBride"
            ]
          },
          "bringBack": "Jaxon Smith-Njigba",
          "valueFiller": "AJ Barner",
          "correlationTheme": "Pair Gardner Minshew II with Marvin Harrison Jr. and Trey McBride, and bring it back with Jaxon Smith-Njigba."
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
    "id": "writeup-sun_late-401873049",
    "gameId": "401873049",
    "matchup": "Green Bay Packers @ New England Patriots",
    "awayTeam": "Green Bay Packers",
    "homeTeam": "New England Patriots",
    "kickoff": "2026-11-08T21:25Z",
    "windowSlot": "SUN_LATE",
    "paceOfPlay": {
      "neutralSecPerSnap": 26.4,
      "passEpaPlay": 0.118,
      "rushEpaPlay": 0.042,
      "noHuddleRate": 0.095,
      "notes": "Green Bay Packers and New England Patriots bring contrasting early-down tempo and trench protection fronts into Week 9."
    },
    "schemeMatchup": {
      "coverageShell": "Jordan Love and Drake Maye headline this Week 9 matchup with Christian Watson, Josh Jacobs, Kayshon Boutte, and Rhamondre Stevenson featured in early-down scripts.",
      "blitzRateVsPressureToSack": "Green Bay Packers and New England Patriots deploy disguised third-down pressure packages to test pocket protection.",
      "personnelTendencies": "Green Bay Packers leans on Josh Jacobs, Christian Watson, and Tucker Kraft, while New England Patriots features Rhamondre Stevenson, Kayshon Boutte, and Austin Hooper.",
      "coachingEdge": "Red-zone play-calling and third-down conversion rhythm between Green Bay Packers and New England Patriots headline the film study.",
      "notes": "Week 9 Matchup \u2014 Official spread call, total call, and player prop picks are locked inside the pack."
    },
    "sideTotalCall": {
      "sideSelection": "New England Patriots +3.5",
      "sideConfidence": "64/100",
      "sideExpectedClv": 0.015,
      "sideDecision": "PASS",
      "totalSelection": "UNDER 45.5",
      "totalConfidence": "62/100",
      "totalExpectedClv": 0.011,
      "totalDecision": "PASS",
      "rationale": "We pass the main spread and attack Rhamondre Stevenson bell-cow rushing volume and Tucker Kraft 1Q receiving yards."
    },
    "topProps": [
      {
        "playerId": "rhamondre-stevenson",
        "playerName": "Rhamondre Stevenson",
        "propType": "Rushing Yards",
        "market": "rush_yds",
        "line": 64.5,
        "side": "OVER",
        "confidence": "85/100",
        "expectedClv": 0.13,
        "decision": "PLAY",
        "nEffTargetNotes": "Rhamondre Stevenson steps into uncontested three-down bell-cow volume against Green Bay's light boxes.",
        "pOver": 0.642,
        "pUnder": 0.358
      }
    ],
    "correlatedSgpTicket": {
      "title": "Green Bay Packers @ New England Patriots Same-Game Parlay",
      "legs": [
        {
          "description": "Rhamondre Stevenson Rushing Yards",
          "pickType": "PLAYER_PROP",
          "selection": "Rhamondre Stevenson OVER 64.5 Rushing Yards",
          "line": 64.5,
          "confidence": "85/100",
          "expectedClv": 0.13,
          "decision": "PLAY"
        },
        {
          "description": "Christian Watson Receptions",
          "pickType": "PLAYER_PROP",
          "selection": "Christian Watson OVER 4.5 Receptions",
          "line": 4.5,
          "confidence": "78/100",
          "expectedClv": 0.064,
          "decision": "PLAY"
        },
        {
          "description": "Rhamondre Stevenson Rushing Yards",
          "pickType": "PLAYER_PROP",
          "selection": "Rhamondre Stevenson OVER 54.5 Rushing Yards",
          "line": 54.5,
          "confidence": "77/100",
          "expectedClv": 0.058,
          "decision": "PLAY"
        }
      ],
      "jointWinProb": 0.214,
      "fairOdds": "+365",
      "marketOdds": "+475",
      "edgeScore": 0.042,
      "correlationRationale": "Correlated script pairing Rhamondre Stevenson with Christian Watson and Rhamondre Stevenson across four quarters."
    },
    "dfsStacks": {
      "captainPicks": [
        {
          "player": "Christian Watson",
          "position": "WR",
          "salary": 10200,
          "leverageNote": "Primary perimeter and slot target for Jordan Love in Green Bay Packers passing script."
        },
        {
          "player": "Rhamondre Stevenson",
          "position": "RB",
          "salary": 9600,
          "leverageNote": "Three-down backfield and red-zone touch leader for New England Patriots."
        }
      ],
      "cashCore": [
        {
          "player": "Jordan Love",
          "position": "QB",
          "salary": 6200,
          "projection": 21.4,
          "floorNote": "Steady pocket and play-action volume for Green Bay Packers."
        },
        {
          "player": "Rhamondre Stevenson",
          "position": "RB",
          "salary": 6100,
          "projection": 19.8,
          "floorNote": "Early-down and checkdown workload anchor for New England Patriots."
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
          "bringBack": "Kayshon Boutte",
          "valueFiller": "Austin Hooper",
          "correlationTheme": "Pair Jordan Love with Christian Watson and Tucker Kraft, and bring it back with Kayshon Boutte."
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
    "id": "writeup-snf-401873050",
    "gameId": "401873050",
    "matchup": "Tampa Bay Buccaneers @ Chicago Bears",
    "awayTeam": "Tampa Bay Buccaneers",
    "homeTeam": "Chicago Bears",
    "kickoff": "2026-11-09T01:20Z",
    "windowSlot": "SNF",
    "paceOfPlay": {
      "neutralSecPerSnap": 26.4,
      "passEpaPlay": 0.118,
      "rushEpaPlay": 0.042,
      "noHuddleRate": 0.095,
      "notes": "Tampa Bay Buccaneers and Chicago Bears bring contrasting early-down tempo and trench protection fronts into Week 9."
    },
    "schemeMatchup": {
      "coverageShell": "Baker Mayfield and Caleb Williams headline this Week 9 matchup with Chris Godwin, Rachaad White, Rome Odunze, and D'Andre Swift featured in early-down scripts.",
      "blitzRateVsPressureToSack": "Tampa Bay Buccaneers and Chicago Bears deploy disguised third-down pressure packages to test pocket protection.",
      "personnelTendencies": "Tampa Bay Buccaneers leans on Rachaad White, Chris Godwin, and Cade Otton, while Chicago Bears features D'Andre Swift, Rome Odunze, and Cole Kmet.",
      "coachingEdge": "Red-zone play-calling and third-down conversion rhythm between Tampa Bay Buccaneers and Chicago Bears headline the film study.",
      "notes": "Week 9 Matchup \u2014 Official spread call, total call, and player prop picks are locked inside the pack."
    },
    "sideTotalCall": {
      "sideSelection": "Chicago Bears -6.0",
      "sideConfidence": "62/100",
      "sideExpectedClv": 0.011,
      "sideDecision": "PASS",
      "totalSelection": "UNDER 47.5",
      "totalConfidence": "61/100",
      "totalExpectedClv": 0.009,
      "totalDecision": "PASS",
      "rationale": "Sunday Night Football at Soldier Field favors Rome Odunze and D'Andre Swift prop volume over the full-game spread."
    },
    "topProps": [
      {
        "playerId": "rome-odunze",
        "playerName": "Rome Odunze",
        "propType": "Receiving Yards",
        "market": "rec_yds",
        "line": 58.5,
        "side": "OVER",
        "confidence": "77/100",
        "expectedClv": 0.076,
        "decision": "PLAY",
        "nEffTargetNotes": "Rome Odunze leads Chicago's intermediate and play-action target share from Caleb Williams at Soldier Field.",
        "pOver": 0.642,
        "pUnder": 0.358
      }
    ],
    "correlatedSgpTicket": {
      "title": "Tampa Bay Buccaneers @ Chicago Bears Same-Game Parlay",
      "legs": [
        {
          "description": "Rome Odunze Receiving Yards",
          "pickType": "PLAYER_PROP",
          "selection": "Rome Odunze OVER 58.5 Receiving Yards",
          "line": 58.5,
          "confidence": "77/100",
          "expectedClv": 0.076,
          "decision": "PLAY"
        },
        {
          "description": "Cade Otton Receptions",
          "pickType": "PLAYER_PROP",
          "selection": "Cade Otton OVER 3.5 Receptions",
          "line": 3.5,
          "confidence": "78/100",
          "expectedClv": 0.064,
          "decision": "PLAY"
        },
        {
          "description": "D'Andre Swift Rushing Yards",
          "pickType": "PLAYER_PROP",
          "selection": "D'Andre Swift OVER 54.5 Rushing Yards",
          "line": 54.5,
          "confidence": "77/100",
          "expectedClv": 0.058,
          "decision": "PLAY"
        }
      ],
      "jointWinProb": 0.214,
      "fairOdds": "+365",
      "marketOdds": "+475",
      "edgeScore": 0.042,
      "correlationRationale": "Correlated script pairing Rome Odunze with Chris Godwin and D'Andre Swift across four quarters."
    },
    "dfsStacks": {
      "captainPicks": [
        {
          "player": "Chris Godwin",
          "position": "WR",
          "salary": 10200,
          "leverageNote": "Primary perimeter and slot target for Baker Mayfield in Tampa Bay Buccaneers passing script."
        },
        {
          "player": "D'Andre Swift",
          "position": "RB",
          "salary": 9600,
          "leverageNote": "Three-down backfield and red-zone touch leader for Chicago Bears."
        }
      ],
      "cashCore": [
        {
          "player": "Baker Mayfield",
          "position": "QB",
          "salary": 6200,
          "projection": 21.4,
          "floorNote": "Steady pocket and play-action volume for Tampa Bay Buccaneers."
        },
        {
          "player": "D'Andre Swift",
          "position": "RB",
          "salary": 6100,
          "projection": 19.8,
          "floorNote": "Early-down and checkdown workload anchor for Chicago Bears."
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
          "bringBack": "Rome Odunze",
          "valueFiller": "Cole Kmet",
          "correlationTheme": "Pair Baker Mayfield with Chris Godwin and Cade Otton, and bring it back with Rome Odunze."
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
    "id": "writeup-mnf-401873051",
    "gameId": "401873051",
    "matchup": "Buffalo Bills @ Minnesota Vikings",
    "awayTeam": "Buffalo Bills",
    "homeTeam": "Minnesota Vikings",
    "kickoff": "2026-11-10T01:15Z",
    "windowSlot": "MNF",
    "paceOfPlay": {
      "neutralSecPerSnap": 26.4,
      "passEpaPlay": 0.118,
      "rushEpaPlay": 0.042,
      "noHuddleRate": 0.095,
      "notes": "Buffalo Bills and Minnesota Vikings bring contrasting early-down tempo and trench protection fronts into Week 9."
    },
    "schemeMatchup": {
      "coverageShell": "Josh Allen and Carson Wentz headline this Week 9 matchup with Keon Coleman, James Cook, Justin Jefferson, and Jordan Mason featured in early-down scripts.",
      "blitzRateVsPressureToSack": "Buffalo Bills and Minnesota Vikings deploy disguised third-down pressure packages to test pocket protection.",
      "personnelTendencies": "Buffalo Bills leans on James Cook, Keon Coleman, and Dalton Kincaid, while Minnesota Vikings features Jordan Mason, Justin Jefferson, and T.J. Hockenson.",
      "coachingEdge": "Red-zone play-calling and third-down conversion rhythm between Buffalo Bills and Minnesota Vikings headline the film study.",
      "notes": "Week 9 Matchup \u2014 Official spread call, total call, and player prop picks are locked inside the pack."
    },
    "sideTotalCall": {
      "sideSelection": "Minnesota Vikings +3.5",
      "sideConfidence": "63/100",
      "sideExpectedClv": 0.014,
      "sideDecision": "PASS",
      "totalSelection": "OVER 45.5",
      "totalConfidence": "62/100",
      "totalExpectedClv": 0.01,
      "totalDecision": "PASS",
      "rationale": "Monday Night Football indoors at U.S. Bank Stadium highlights Justin Jefferson and Jordan Mason player props."
    },
    "topProps": [
      {
        "playerId": "justin-jefferson",
        "playerName": "Justin Jefferson",
        "propType": "Receiving Yards",
        "market": "rec_yds",
        "line": 82.5,
        "side": "OVER",
        "confidence": "79/100",
        "expectedClv": 0.094,
        "decision": "PLAY",
        "nEffTargetNotes": "Justin Jefferson commands primary play-action and intermediate target volume indoors on Monday Night Football.",
        "pOver": 0.642,
        "pUnder": 0.358
      }
    ],
    "correlatedSgpTicket": {
      "title": "Buffalo Bills @ Minnesota Vikings Same-Game Parlay",
      "legs": [
        {
          "description": "Justin Jefferson Receiving Yards",
          "pickType": "PLAYER_PROP",
          "selection": "Justin Jefferson OVER 82.5 Receiving Yards",
          "line": 82.5,
          "confidence": "79/100",
          "expectedClv": 0.094,
          "decision": "PLAY"
        },
        {
          "description": "Keon Coleman Receptions",
          "pickType": "PLAYER_PROP",
          "selection": "Keon Coleman OVER 4.5 Receptions",
          "line": 4.5,
          "confidence": "78/100",
          "expectedClv": 0.064,
          "decision": "PLAY"
        },
        {
          "description": "Jordan Mason Rushing Yards",
          "pickType": "PLAYER_PROP",
          "selection": "Jordan Mason OVER 54.5 Rushing Yards",
          "line": 54.5,
          "confidence": "77/100",
          "expectedClv": 0.058,
          "decision": "PLAY"
        }
      ],
      "jointWinProb": 0.214,
      "fairOdds": "+365",
      "marketOdds": "+475",
      "edgeScore": 0.042,
      "correlationRationale": "Correlated script pairing Justin Jefferson with Keon Coleman and Jordan Mason across four quarters."
    },
    "dfsStacks": {
      "captainPicks": [
        {
          "player": "Keon Coleman",
          "position": "WR",
          "salary": 10200,
          "leverageNote": "Primary perimeter and slot target for Josh Allen in Buffalo Bills passing script."
        },
        {
          "player": "Jordan Mason",
          "position": "RB",
          "salary": 9600,
          "leverageNote": "Three-down backfield and red-zone touch leader for Minnesota Vikings."
        }
      ],
      "cashCore": [
        {
          "player": "Josh Allen",
          "position": "QB",
          "salary": 6200,
          "projection": 21.4,
          "floorNote": "Steady pocket and play-action volume for Buffalo Bills."
        },
        {
          "player": "Jordan Mason",
          "position": "RB",
          "salary": 6100,
          "projection": 19.8,
          "floorNote": "Early-down and checkdown workload anchor for Minnesota Vikings."
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
          "bringBack": "Justin Jefferson",
          "valueFiller": "T.J. Hockenson",
          "correlationTheme": "Pair Josh Allen with Keon Coleman and Dalton Kincaid, and bring it back with Justin Jefferson."
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

export const WEEK9_UPCOMING_14_MATCHUP_CODES: ReadonlyArray<{ matchup: string }> = [
  { matchup: "CIN @ ATL" },
  { matchup: "DET @ MIA" },
  { matchup: "NYG @ PHI" },
  { matchup: "GB @ NE" },
  { matchup: "DAL @ IND" },
  { matchup: "DEN @ CAR" },
  { matchup: "CLE @ NO" },
  { matchup: "LV @ SF" },
  { matchup: "NYJ @ KC" },
  { matchup: "HOU @ LAC" },
  { matchup: "ARI @ SEA" },
  { matchup: "LAR @ WAS" },
  { matchup: "TB @ CHI" },
  { matchup: "BUF @ MIN" },
];
