/**
 * Coach Writeup Engine — High-Fidelity Tactical Game & Slate Breakdowns
 *
 * Provides structured tactical intelligence for Week 8/9 NFL slates:
 * - Pace of play & situational tempo metrics
 * - Scheme matchup breakdowns (coverage shells, blitz vs pressure-to-sack)
 * - Calibrated Side & Total calls (formatted strictly as XX/100 confidence, NEVER %)
 * - N_eff target & volume notes for player props
 * - Correlated Same Game Parlay (SGP) tickets with joint devigged edge
 * - DFS Captain, Cash core, and GPP primary stack + bring-back blueprints
 * - Quad-Engine scientific citations (arxiv, openalex, kaggle, huggingface)
 *
 * DOCTRINE & GUARDRAILS:
 * - NEVER render confidence as a % (always format as XX/100).
 * - NEVER publish or package any pick where decision === 'PASS' or expectedClv < 0.
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
  sideExpectedClv: number; // strictly > 0
  sideDecision: 'PLAY'; // strictly "PLAY"
  totalSelection: string;
  totalConfidence: string; // strictly "XX/100", never "%"
  totalExpectedClv: number; // strictly > 0
  totalDecision: 'PLAY'; // strictly "PLAY"
  rationale: string;
}

export interface PropCall {
  playerId: string;
  playerName: string;
  propType: string;
  line: number;
  side: 'OVER' | 'UNDER';
  confidence: string; // strictly "XX/100"
  expectedClv: number; // strictly > 0
  decision: 'PLAY'; // strictly "PLAY"
  nEffTargetNotes: string;
}

export interface CorrelatedSgpTicket {
  title: string;
  legs: Array<{
    description: string;
    pickType: string;
    selection: string;
    line?: number;
    confidence: string; // strictly "XX/100"
    expectedClv: number; // strictly > 0
    decision: 'PLAY';
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
 * Rejects any pick where decision === 'PASS' or expectedClv < 0.
 * Enforces citation prefixes (arxiv:, openalex:, kaggle:, hf:).
 */
export function buildCoachGameWriteup(input: Partial<CoachGameWriteup> & {
  matchup: string;
  windowSlot: WindowSlot;
}): CoachGameWriteup {
  const sideTotal = input.sideTotalCall;
  if (sideTotal) {
    if (sideTotal.sideDecision === ('PASS' as unknown) || sideTotal.totalDecision === ('PASS' as unknown)) {
      throw new Error(`Cannot package a writeup with decision === 'PASS'. Only positive edge plays allowed.`);
    }
    if (sideTotal.sideExpectedClv < 0 || sideTotal.totalExpectedClv < 0) {
      throw new Error(`Cannot package a writeup with expectedClv < 0.`);
    }
  }

  const props = input.topProps ?? [];
  for (const prop of props) {
    if (prop.decision === ('PASS' as unknown) || prop.expectedClv < 0) {
      throw new Error(`Prop ${prop.playerName} has invalid decision or negative expectedClv.`);
    }
  }

  const sgp = input.correlatedSgpTicket;
  if (sgp) {
    for (const leg of sgp.legs) {
      if (leg.decision === ('PASS' as unknown) || leg.expectedClv < 0) {
        throw new Error(`SGP leg ${leg.selection} has invalid decision or negative expectedClv.`);
      }
    }
  }

  const citations: QuadEngineCitations = input.quadEngineCitations ?? {
    arxiv: ["arxiv:2305.18290", "arxiv:2401.03462"],
    openalex: ["openalex:W4285718290"],
    kaggle: ["kaggle:nfl-big-data-bowl-2024"],
    hf: ["hf:models/gse-nfl-xgboost-v5"],
  };

  // Validate citation prefixes
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
      sideDecision: "PLAY",
      totalSelection: input.sideTotalCall.totalSelection,
      totalConfidence: formatConfidenceScore(input.sideTotalCall.totalConfidence),
      totalExpectedClv: input.sideTotalCall.totalExpectedClv,
      totalDecision: "PLAY",
      rationale: input.sideTotalCall.rationale,
    },
    topProps: input.topProps.map((p) => ({
      ...p,
      confidence: formatConfidenceScore(p.confidence),
      decision: "PLAY" as const,
    })),
    correlatedSgpTicket: {
      ...input.correlatedSgpTicket,
      legs: input.correlatedSgpTicket.legs.map((l) => ({
        ...l,
        confidence: formatConfidenceScore(l.confidence),
        decision: "PLAY" as const,
      })),
    },
    dfsStacks: input.dfsStacks,
    quadEngineCitations: citations,
  };
}

/**
 * Packaged plays only. Empty until a side or total clears expectedClv > 0
 * against the posted number. Week-8 identity lives on LIVE_WEEK8_2026_BOARD.
 */
export const LIVE_SLATE_COACH_WRITEUPS: readonly CoachGameWriteup[] = [];

export function getWriteupsForWindowSlot(windowSlot: string): CoachGameWriteup[] {
  return LIVE_SLATE_COACH_WRITEUPS.filter((w) => {
    if (windowSlot === "WEEKEND_PASS" || windowSlot === "WEEKLY_PASS") return true;
    if (windowSlot === "SUN_MAIN") {
      return w.windowSlot === "SUN_EARLY" || w.windowSlot === "SUN_LATE" || w.windowSlot === "SUN_MAIN";
    }
    return w.windowSlot === windowSlot;
  });
}

export function getRedactedTeasersForWindowSlot(windowSlot: string) {
  const cards = LIVE_WEEK8_2026_BOARD.filter((w) => {
    if (windowSlot === "WEEKEND_PASS" || windowSlot === "WEEKLY_PASS" || windowSlot === "ALL") return true;
    if (windowSlot === "SUN_MAIN") {
      return w.windowSlot === "SUN_EARLY" || w.windowSlot === "SUN_LATE";
    }
    return w.windowSlot === windowSlot;
  });
  return cards.map((w) => ({
    id: w.id,
    gameId: w.espnEventId,
    windowSlot: w.windowSlot,
    matchup: w.matchup,
    kickoff: w.kickoff,
    postedDetails: w.postedDetails,
    postedTotal: w.postedTotal,
    publication: w.publication,
    passReason: w.passReason,
    paceOfPlay: {
      neutralSecPerSnap: null,
      noHuddleRate: null,
      passEpaPlay: null,
      notes: w.passReason,
    },
    schemeMatchup: {
      coverageShell: `Posted ${w.postedDetails}. Total ${w.postedTotal}. Shell not recorded.`,
      blitzRateVsPressureToSack: "not recorded",
      notes: w.passReason,
    },
    lockedSummary: {
      sideConfidence: "not recorded",
      sideExpectedClvCents: "n/a",
      totalConfidence: "not recorded",
      totalExpectedClvCents: "n/a",
      propsCount: 0,
      hasSgp: false,
      sgpMarketOdds: null,
      hasDfs: false,
    },
  }));
}
