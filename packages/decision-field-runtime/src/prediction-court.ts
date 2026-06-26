/**
 * THE PREDICTION COURT — every prediction goes on trial.
 *
 * Scores24 gives tips. GSE puts each prediction on trial and grades PROCESS separately from OUTCOME:
 * a winning prediction can have bad process (lucky), a losing one can have good process (unlucky), a
 * push is never a win, a prediction without odds/source/time is downgraded, a claim stronger than its
 * authority ceiling is a process failure, and one fixture result never becomes a public performance
 * claim. Fixture-only.
 *
 * Pure + deterministic. Spec: docs/product/PREDICTION_COURT.md.
 */

import { type MaxPermittedStrength, rankOf } from "./decision-state-stat-contract.js";

export type TrialResult = "WIN" | "LOSS" | "PUSH" | "VOID" | "UNKNOWN";
export type EvidenceQuality = "RICH" | "THIN" | "MISSING";
export type ProcessGrade =
  | "GOOD_PROCESS"
  | "THIN_EVIDENCE"
  | "BAD_PRICE"
  | "WRONG_READ"
  | "OVERFIT_TREND"
  | "DATA_MISSING"
  | "AUTHORITY_TOO_STRONG";
export type OutcomeGrade = "DESERVED_WIN" | "LUCKY_WIN" | "UNLUCKY_LOSS" | "FAIR_LOSS" | "PUSH" | "PENDING";

export interface PredictionTrialInput {
  readonly predictionId: string;
  readonly matchId: string;
  readonly publishedAtLabel: string | null; // null → missing time
  readonly market: string;
  readonly selection: string;
  readonly oddsAtPublish: number | null; // null → cannot be priced
  readonly closingOdds: number | null; // for CLV
  readonly sourceRefs: readonly string[]; // empty → unsourced
  readonly evidenceQuality: EvidenceQuality;
  readonly claimStrength: MaxPermittedStrength; // how strongly it was expressed
  readonly authorityCeiling: MaxPermittedStrength; // what was permitted at publish
  readonly readContradictedByReality?: boolean; // did the underlying read get falsified?
  readonly fromOverfitTrend?: boolean;
  readonly result: TrialResult; // UNKNOWN for upcoming events
}

export interface PredictionTrial {
  readonly predictionId: string;
  readonly matchId: string;
  readonly market: string;
  readonly selection: string;
  readonly result: TrialResult;
  readonly processGrade: ProcessGrade;
  readonly outcomeGrade: OutcomeGrade;
  readonly clv: number | null; // closing-line value (publish vs close), null if either missing
  readonly authorityRespected: boolean;
  readonly whatChanged: string;
  readonly autopsy: string;
  readonly lesson: string;
  readonly memoryWrite: string;
  readonly publicSafe: boolean;
  /** Hard flag: a fixture trial is NEVER a public performance claim. */
  readonly countsAsPublicPerformance: false;
  readonly fixtureWatermarked: true;
}

/** Closing-line value from decimal odds: positive if we beat the close. */
export function computeCLV(oddsAtPublish: number | null, closingOdds: number | null): number | null {
  if (oddsAtPublish == null || closingOdds == null || closingOdds <= 1 || oddsAtPublish <= 1) return null;
  // implied probabilities; beating the close means our implied prob was lower than the close's.
  const pubImplied = 1 / oddsAtPublish;
  const closeImplied = 1 / closingOdds;
  return Math.round((closeImplied - pubImplied) * 1000) / 1000; // >0 = we got a better price than close
}

/** Grade a prediction. Process first (independent of result), then outcome. */
export function gradePrediction(i: PredictionTrialInput): PredictionTrial {
  const authorityRespected = rankOf(i.claimStrength) <= rankOf(i.authorityCeiling);

  // PROCESS — graded from how the prediction was made, NOT whether it won.
  let processGrade: ProcessGrade;
  if (i.oddsAtPublish == null || i.publishedAtLabel == null || i.sourceRefs.length === 0 || i.evidenceQuality === "MISSING") {
    processGrade = "DATA_MISSING";
  } else if (!authorityRespected) {
    processGrade = "AUTHORITY_TOO_STRONG"; // expressed louder than the evidence permitted
  } else if (i.fromOverfitTrend) {
    processGrade = "OVERFIT_TREND";
  } else if (i.readContradictedByReality) {
    processGrade = "WRONG_READ";
  } else if (i.closingOdds != null && i.oddsAtPublish != null && i.oddsAtPublish < i.closingOdds && computeCLV(i.oddsAtPublish, i.closingOdds)! < 0) {
    processGrade = "BAD_PRICE"; // took a worse number than the close
  } else if (i.evidenceQuality === "THIN") {
    processGrade = "THIN_EVIDENCE";
  } else {
    processGrade = "GOOD_PROCESS";
  }

  // OUTCOME — graded from the result, separately. A push is NEVER a win.
  const goodProcess = processGrade === "GOOD_PROCESS";
  let outcomeGrade: OutcomeGrade;
  switch (i.result) {
    case "WIN":
      outcomeGrade = goodProcess ? "DESERVED_WIN" : "LUCKY_WIN";
      break;
    case "LOSS":
      outcomeGrade = goodProcess ? "UNLUCKY_LOSS" : "FAIR_LOSS";
      break;
    case "PUSH":
    case "VOID":
      outcomeGrade = "PUSH";
      break;
    default:
      outcomeGrade = "PENDING";
  }

  const clv = computeCLV(i.oddsAtPublish, i.closingOdds);
  return {
    predictionId: i.predictionId,
    matchId: i.matchId,
    market: i.market,
    selection: i.selection,
    result: i.result,
    processGrade,
    outcomeGrade,
    clv,
    authorityRespected,
    whatChanged: clv == null ? "No closing line captured — CLV undefined." : clv > 0 ? "We beat the closing line." : clv < 0 ? "The market closed better than our price." : "The line did not move materially.",
    autopsy:
      `${i.market} — ${i.selection}. Process: ${processGrade}. Result: ${i.result}. ` +
      (authorityRespected ? "Claim stayed within its authority ceiling." : "Claim EXCEEDED its authority ceiling — a process failure regardless of result."),
    lesson:
      processGrade === "GOOD_PROCESS"
        ? "Repeat the process; the result is one sample."
        : processGrade === "AUTHORITY_TOO_STRONG"
          ? "Express no louder than the evidence permits."
          : processGrade === "DATA_MISSING"
            ? "A prediction without price, time, and source cannot be graded — capture them at publish."
            : "Tighten the read before publishing.",
    memoryWrite: "Written to the Learning Ledger as a trial; one result moves no model weight (needs a confirmed, FDR-disciplined sample).",
    publicSafe: true,
    countsAsPublicPerformance: false,
    fixtureWatermarked: true,
  };
}

/**
 * A fixture trial NEVER aggregates into a public win-rate. This returns a structural assertion, not a
 * performance number — calling it is how a surface proves it is not making a public-performance claim.
 */
export function publicPerformanceStatus(trials: readonly PredictionTrial[]): { isPublicPerformanceClaim: false; note: string; settledCount: number } {
  return {
    isPublicPerformanceClaim: false,
    settledCount: trials.filter((t) => t.result !== "UNKNOWN").length,
    note: "Fixture prediction trials. Not a public performance claim. Public performance requires a settled, calibrated, owner-gated sample (currently held).",
  };
}

// ───────────────────────── Fixture trials (the three matches) ─────────────────────────
export const PREDICTION_TRIAL_FIXTURES: readonly PredictionTrialInput[] = [
  // Ecuador–Germany (ended): total under 3 (2 goals → WIN), corners over 9.5 (3+2=5 → LOSS),
  // cards under 3.5 (4 cards → LOSS), Germany TT under 2.5 (1 → WIN), draw (lost), correct score 1-1 (LOSS).
  { predictionId: "p-eg-u3", matchId: "fixture-soccer-ecu-ger-2026", publishedAtLabel: "pre-match", market: "Total goals", selection: "Under 3", oddsAtPublish: 1.72, closingOdds: 1.68, sourceRefs: ["odds-api(fixture)", "xg-model(fixture)"], evidenceQuality: "RICH", claimStrength: "INFO_ONLY", authorityCeiling: "INFO_ONLY", result: "WIN" },
  { predictionId: "p-eg-c95", matchId: "fixture-soccer-ecu-ger-2026", publishedAtLabel: "pre-match", market: "Corners", selection: "Over 9.5", oddsAtPublish: 1.95, closingOdds: 2.0, sourceRefs: ["odds-api(fixture)"], evidenceQuality: "THIN", claimStrength: "INFO_ONLY", authorityCeiling: "INFO_ONLY", result: "LOSS" },
  { predictionId: "p-eg-cards", matchId: "fixture-soccer-ecu-ger-2026", publishedAtLabel: "pre-match", market: "Cards", selection: "Under 3.5", oddsAtPublish: 1.8, closingOdds: 1.75, sourceRefs: ["referee-context(fixture)"], evidenceQuality: "THIN", claimStrength: "INFO_ONLY", authorityCeiling: "INFO_ONLY", result: "LOSS" },
  { predictionId: "p-eg-gertt", matchId: "fixture-soccer-ecu-ger-2026", publishedAtLabel: "pre-match", market: "Team total", selection: "Germany Under 2.5", oddsAtPublish: 1.66, closingOdds: 1.7, sourceRefs: ["odds-api(fixture)", "xg-model(fixture)"], evidenceQuality: "RICH", claimStrength: "INFO_ONLY", authorityCeiling: "INFO_ONLY", result: "WIN" },
  // a deliberately over-strong claim to exercise AUTHORITY_TOO_STRONG (fixture only)
  { predictionId: "p-eg-overclaim", matchId: "fixture-soccer-ecu-ger-2026", publishedAtLabel: "pre-match", market: "Match result", selection: "Ecuador", oddsAtPublish: 5.2, closingOdds: 5.0, sourceRefs: ["xg-model(fixture)"], evidenceQuality: "RICH", claimStrength: "PUBLIC_ACTION", authorityCeiling: "INFO_ONLY", result: "WIN" },
  // Rays–Royals: Rays win (WIN)
  { predictionId: "p-tb-ml", matchId: "fixture-mlb-tb-kc-2026", publishedAtLabel: "pre-match", market: "Moneyline", selection: "Tampa Bay Rays", oddsAtPublish: 1.56, closingOdds: 1.6, sourceRefs: ["odds-api(fixture)", "pitcher-context(fixture)"], evidenceQuality: "RICH", claimStrength: "INFO_ONLY", authorityCeiling: "INFO_ONLY", result: "WIN" },
  // Roughriders–Argonauts: upcoming → UNKNOWN (pending)
  { predictionId: "p-cfl-u585", matchId: "fixture-cfl-ssk-tor-2026", publishedAtLabel: "pre-match", market: "Total points", selection: "Under 58.5", oddsAtPublish: 1.9, closingOdds: null, sourceRefs: ["odds-api(fixture)", "pace-trend(fixture)"], evidenceQuality: "RICH", claimStrength: "INFO_ONLY", authorityCeiling: "INFO_ONLY", result: "UNKNOWN" },
];

export function buildAllPredictionTrials(): readonly PredictionTrial[] {
  return PREDICTION_TRIAL_FIXTURES.map(gradePrediction);
}
