/**
 * Pick grounding — the anti-fabrication core of the glass box.
 *
 * Serializes ONLY the real, stored signals for a pick (its FactorBreakdown plus
 * the immutable PickSignalSnapshot) into a deterministic context block. Nothing
 * else is ever put in front of the model. The explanation agent builds its
 * prompt from this and nothing more — so the model can only describe what the
 * engine actually used, never invent a reason.
 *
 * Pure, no I/O. The route supplies the loaded rows.
 */

import type { FactorBreakdown } from "@sports/types";

/** Human labels for the PickSignalSnapshot had*Signal flags (present-only). */
export const SIGNAL_LABELS: Readonly<Record<string, string>> = {
  hadOddsSignal: "market odds",
  hadLineMovementSignal: "line movement",
  hadRestSignal: "rest days",
  hadScheduleSignal: "schedule",
  hadAtsFormSignal: "ATS form",
  hadH2HSignal: "head-to-head",
  hadVenueSignal: "venue form",
  hadWeatherSignal: "weather",
  hadInjurySignal: "injuries",
  hadRatingsSignal: "team ratings",
  hadPlayerSignal: "player availability",
  hadOfficialsSignal: "officials",
  hadVenueEnvironmentSignal: "venue environment",
  hadPaceSignal: "pace",
  hadMilestoneSignal: "milestones",
};

export interface GroundingGame {
  readonly homeTeamName: string;
  readonly awayTeamName: string;
  readonly sport: string;
  readonly commenceTime: Date;
}

export interface GroundingPick {
  readonly pickType: string; // SPREAD | MONEYLINE | TOTAL
  readonly selection: string;
  readonly line: number;
  readonly confidence: number;
  readonly edgeScore: number;
  readonly modelVersion: string;
  readonly generatedAt: Date;
  readonly result: string; // PENDING | WIN | LOSS | PUSH | VOID
  readonly factorBreakdown: FactorBreakdown | null;
  // CLV (optional — only after settlement grading; not yet stored on this
  // deployment, so the route leaves these unset and the block stays inert).
  readonly clvKind?: string | null;
  readonly clvValue?: number | null;
  readonly clvVerdict?: string | null;
}

export interface GroundingSnapshot {
  readonly capturedAt: Date;
  readonly confidenceAtPrediction: number;
  readonly dataQualityScore: number;
  readonly bookmakerCount: number;
  readonly lineMovementDelta: number | null;
  readonly settlementResult: string | null;
  /** Raw had*Signal booleans from PickSignalSnapshot. */
  readonly signalFlags: Readonly<Record<string, boolean>>;
}

export interface GroundingInput {
  readonly game: GroundingGame;
  readonly pick: GroundingPick;
  readonly snapshot: GroundingSnapshot | null;
}

export interface GroundedContext {
  /** The deterministic context block — the ONLY data the model sees. */
  readonly context: string;
  /** ISO of the snapshot (citation anchor); null if no snapshot. */
  readonly snapshotIso: string | null;
  /** ISO of pick generation (citation anchor). */
  readonly generatedIso: string;
  /** Real factor names available to cite (for downstream checks/UX). */
  readonly factorNames: readonly string[];
  /** True once the pick has a decisive settled result. */
  readonly isSettled: boolean;
}

function fmtSigned(n: number, digits = 1): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(digits)}`;
}

/**
 * Build the grounded context block for a pick. Deterministic: the same inputs
 * always produce the same text (no clock, no randomness), so it is fully
 * testable and cache-friendly.
 */
export function buildGroundedContext(input: GroundingInput): GroundedContext {
  const { game, pick, snapshot } = input;
  const fb = pick.factorBreakdown;
  const lines: string[] = [];

  const generatedIso = pick.generatedAt.toISOString();
  const snapshotIso = snapshot ? snapshot.capturedAt.toISOString() : null;

  lines.push(`GAME: ${game.awayTeamName} @ ${game.homeTeamName} (${game.sport})`);
  lines.push(`COMMENCE: ${game.commenceTime.toISOString()}`);
  lines.push(`PICK: ${pick.selection} [${pick.pickType}]`);
  lines.push(`CONFIDENCE: ${pick.confidence}/100   EDGE INDEX: ${Math.round(pick.edgeScore)}/100`);
  lines.push(`MODEL VERSION: ${pick.modelVersion}`);
  lines.push(`FACTOR BREAKDOWN — citation token: factor_breakdown at ${generatedIso}`);

  const factorNames: string[] = [];
  if (fb) {
    // Component sub-scores (the priced drivers of confidence).
    const components: Array<[string, number | undefined]> = [
      ["Bookmaker Consensus", fb.consensusScore],
      ["Market Depth", fb.marketDepthScore],
      ["Pricing Edge", fb.edgeScore],
      ["Line Movement", fb.lineMovementScore],
      ["Volatility Penalty", fb.volatilityPenalty],
      ["Head-to-Head", fb.headToHeadScore],
      ["Venue Form", fb.venueFormScore],
      ["Cross-Market", fb.crossMarketScore],
      ["Schedule Stress", fb.scheduleStressScore],
      ["Uncertainty Penalty", fb.uncertaintyPenalty],
    ];
    for (const [name, value] of components) {
      if (value === undefined || value === null || value === 0) continue;
      lines.push(`  - ${name}: ${fmtSigned(value)}`);
    }
    // Human-readable factor list (names are what the explanation should reference).
    for (const f of fb.factors ?? []) {
      factorNames.push(f.name);
      lines.push(`  • ${f.name} [${f.impact}, weight ${fmtSigned(f.weight)}]: ${f.description}`);
    }
  } else {
    lines.push("  (no factor breakdown stored)");
  }

  if (snapshot) {
    const present = Object.entries(snapshot.signalFlags)
      .filter(([, v]) => v === true)
      .map(([k]) => SIGNAL_LABELS[k] ?? k);
    lines.push(`SIGNAL SNAPSHOT — citation token: signal_snapshot at ${snapshotIso}`);
    lines.push(`  signals present at prediction: ${present.length ? present.join(", ") : "none"}`);
    lines.push(`  confidence at prediction: ${snapshot.confidenceAtPrediction}/100`);
    lines.push(`  data quality: ${Math.round(snapshot.dataQualityScore)}/100   books: ${snapshot.bookmakerCount}`);
    if (snapshot.lineMovementDelta != null) {
      lines.push(`  line movement since open: ${fmtSigned(snapshot.lineMovementDelta)}`);
    }
  } else {
    lines.push("SIGNAL SNAPSHOT: none recorded for this pick.");
  }

  const decisiveResult = pick.result === "WIN" || pick.result === "LOSS" || pick.result === "PUSH";
  if (decisiveResult) {
    lines.push(`OUTCOME: ${pick.result}`);
    if (pick.clvVerdict && pick.clvValue != null) {
      const val =
        pick.clvKind === "PROBABILITY"
          ? `${fmtSigned(pick.clvValue * 100, 1)}pp`
          : `${fmtSigned(pick.clvValue, 1)} pts`;
      lines.push(`CLOSING-LINE VALUE: ${pick.clvVerdict} (${val})`);
    }
  }

  return {
    context: lines.join("\n"),
    snapshotIso,
    generatedIso,
    factorNames,
    isSettled: decisiveResult,
  };
}
