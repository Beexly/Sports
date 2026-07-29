/**
 * No-Bet Gate — product surface of refuse-default.
 * Aligns with galaxysportsedge.com "The No-Bet Gate".
 * Fire on calibrated edge e = pLo - q, never confidence.
 */

export type NoBetCode =
  | "LIVE_BOARD_OFF"
  | "FRESHNESS_FAILED"
  | "PRICE_BELOW_THRESHOLD"
  | "MODEL_DISAGREEMENT"
  | "SAMPLE_FLOOR"
  | "WIDTH_EXCEEDED"
  | "EDGE_BELOW_TAU"
  | "STALE_ODDS"
  | "MISSING_INPUT"
  | "RIGHTS_HOLD";

export interface NoBetEvidence {
  readonly oddsAgeMs: number;
  readonly maxOddsAgeMs: number;
  readonly n: number;
  readonly nMin: number;
  readonly width: number;
  readonly widthMax: number;
  readonly pLo: number;
  readonly q: number;
  readonly tau: number;
  readonly liveBoardEnabled: boolean;
  readonly missingInput?: string | null;
  readonly rightsHold?: boolean;
}

export interface NoBetDecision {
  readonly action: "PLAY" | "NO_BET";
  readonly codes: readonly NoBetCode[];
  readonly modelVersion: string;
  readonly edge: number;
  readonly summary: string;
  readonly logged: true;
}

export const NO_BET_COPY: Record<NoBetCode, string> = {
  LIVE_BOARD_OFF: "Live board flag is off — founder-gated.",
  FRESHNESS_FAILED: "Quote freshness failed the age clamp.",
  PRICE_BELOW_THRESHOLD: "Price does not clear the edge threshold.",
  MODEL_DISAGREEMENT: "Model disagreement width is too wide.",
  SAMPLE_FLOOR: "Settled sample below floor for honest fire.",
  WIDTH_EXCEEDED: "Posterior width exceeds risk budget.",
  EDGE_BELOW_TAU: "Lower-bound edge below tau.",
  STALE_ODDS: "Odds age exceeds maxOddsAgeMs.",
  MISSING_INPUT: "Required input absent — not evaluated.",
  RIGHTS_HOLD: "Source rights hold — cannot publish.",
};

export function evaluateNoBet(
  e: NoBetEvidence,
  modelVersion = "gse-gate-1.0.0",
): NoBetDecision {
  const codes: NoBetCode[] = [];

  if (!e.liveBoardEnabled) codes.push("LIVE_BOARD_OFF");
  if (e.rightsHold) codes.push("RIGHTS_HOLD");
  if (e.missingInput) codes.push("MISSING_INPUT");
  if (e.oddsAgeMs > e.maxOddsAgeMs) {
    codes.push("STALE_ODDS", "FRESHNESS_FAILED");
  }
  if (e.n < e.nMin) codes.push("SAMPLE_FLOOR");
  if (e.width > e.widthMax) {
    codes.push("WIDTH_EXCEEDED", "MODEL_DISAGREEMENT");
  }
  const edge = e.pLo - e.q;
  if (!(edge > e.tau)) {
    codes.push("EDGE_BELOW_TAU", "PRICE_BELOW_THRESHOLD");
  }

  if (codes.length > 0) {
    return {
      action: "NO_BET",
      codes: [...new Set(codes)],
      modelVersion,
      edge,
      summary: `No-Bet is intelligence. ${codes.length} gate(s) closed.`,
      logged: true,
    };
  }

  return {
    action: "PLAY",
    codes: [],
    modelVersion,
    edge,
    summary: "All gates open under current evidence.",
    logged: true,
  };
}
