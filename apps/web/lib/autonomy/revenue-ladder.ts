/**
 * Proof-gated revenue ladder readiness — pure.
 *
 * Pricing phases (FOUNDING → PROVEN → ESTABLISHED → AUTHORITY) only advance
 * on verified milestones. This module never flips env gates; it tells the
 * operator what is still blocking honest monetization.
 */

export type LadderStep = "FOUNDING" | "PROVEN" | "ESTABLISHED" | "AUTHORITY";

export interface RevenueLadderInput {
  readonly canonicalSettled: number;
  readonly calibrationPublished: boolean;
  readonly clvBeatCloseRate: number | null; // 0..1 when known
  readonly settlementHealthy: boolean;
  readonly boardNotSuppressed: boolean;
  readonly liveBoardEnabled: boolean;
  readonly publicPicksEnabled: boolean;
  readonly performanceStatsEnabled: boolean;
  readonly minSettledProven?: number;
  readonly minSettledEstablished?: number;
  readonly clvFloorEstablished?: number;
}

export interface RevenueLadderReport {
  readonly currentStep: LadderStep;
  readonly nextStep: LadderStep | null;
  readonly blockersToNext: readonly string[];
  readonly canHonestlyMonetizePublicTrackRecord: boolean;
  readonly operatorMessage: string;
  readonly milestones: ReadonlyArray<{
    readonly step: LadderStep;
    readonly met: boolean;
    readonly requirement: string;
  }>;
}

export function evaluateRevenueLadder(input: RevenueLadderInput): RevenueLadderReport {
  const minProven = input.minSettledProven ?? 100;
  const minEst = input.minSettledEstablished ?? 500;
  const clvFloor = input.clvFloorEstablished ?? 0.524;

  const provenMet =
    input.canonicalSettled >= minProven &&
    input.calibrationPublished &&
    input.settlementHealthy;

  const establishedMet =
    provenMet &&
    input.canonicalSettled >= minEst &&
    input.clvBeatCloseRate !== null &&
    input.clvBeatCloseRate >= clvFloor;

  // AUTHORITY is multi-season — never auto-claim from single window
  const authorityMet = false;

  let current: LadderStep = "FOUNDING";
  if (establishedMet) current = "ESTABLISHED";
  else if (provenMet) current = "PROVEN";

  const milestones = [
    {
      step: "FOUNDING" as const,
      met: true,
      requirement: "Founding rates live; public performance gated until proof.",
    },
    {
      step: "PROVEN" as const,
      met: provenMet,
      requirement: `≥${minProven} settled + published calibration + healthy settlement`,
    },
    {
      step: "ESTABLISHED" as const,
      met: establishedMet,
      requirement: `≥${minEst} settled + verified CLV ≥${(clvFloor * 100).toFixed(1)}%`,
    },
    {
      step: "AUTHORITY" as const,
      met: authorityMet,
      requirement: "Multi-season ROI + owner audit — never auto-advanced",
    },
  ];

  const nextStep: LadderStep | null =
    current === "FOUNDING" ? "PROVEN" : current === "PROVEN" ? "ESTABLISHED" : current === "ESTABLISHED" ? "AUTHORITY" : null;

  const blockers: string[] = [];
  if (nextStep === "PROVEN") {
    if (input.canonicalSettled < minProven) {
      blockers.push(`Settled sample ${input.canonicalSettled}/${minProven}`);
    }
    if (!input.calibrationPublished) blockers.push("Calibration not published");
    if (!input.settlementHealthy) blockers.push("Settlement not healthy");
  } else if (nextStep === "ESTABLISHED") {
    if (input.canonicalSettled < minEst) {
      blockers.push(`Settled sample ${input.canonicalSettled}/${minEst}`);
    }
    if (input.clvBeatCloseRate === null) blockers.push("CLV beat-close rate unknown");
    else if (input.clvBeatCloseRate < clvFloor) {
      blockers.push(
        `CLV ${(input.clvBeatCloseRate * 100).toFixed(1)}% < floor ${(clvFloor * 100).toFixed(1)}%`,
      );
    }
  } else if (nextStep === "AUTHORITY") {
    blockers.push("Multi-season ROI + owner audit required");
  }

  const canHonestlyMonetizePublicTrackRecord =
    provenMet &&
    input.settlementHealthy &&
    input.boardNotSuppressed &&
    input.performanceStatsEnabled;

  const operatorMessage = canHonestlyMonetizePublicTrackRecord
    ? `Ladder ${current}: public track record evidence is in place — packaging step-up still requires founder YES.`
    : `Ladder ${current}: next ${nextStep ?? "—"} blocked by: ${blockers.join("; ") || "none"}. ` +
      `Do not enable PERFORMANCE_STATS / LIVE_BOARD until blockers clear.`;

  return {
    currentStep: current,
    nextStep,
    blockersToNext: blockers,
    canHonestlyMonetizePublicTrackRecord,
    operatorMessage,
    milestones,
  };
}
