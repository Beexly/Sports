import {
  evaluateLegacySliceSuppressionBypass,
  evaluateMutualDefensiveAttritionTotalOverride,
  evaluateQbKneeldownAndLeadScriptRushHaircut,
  evaluateRookieSnapAndTargetRampOverride,
  NE_CHI_20261022_ATTRITION,
  type MutualDefensiveAttritionResult,
  type QbRushHaircutResult,
} from "./x-situational-80-rules.js";
import {
  evaluateLbVoidTeRbVsSlotAbsorption,
  type SinkhornRoleResult,
} from "./role-isomorphism-realloc.js";

export interface MasterOverlayResult {
  readonly spreadPublishState: "PLAY" | "CANDIDATE" | "PASS" | "WITHHOLD";
  readonly totalPublishState: "PLAY" | "CANDIDATE" | "PASS" | "WITHHOLD";
  readonly attrition: MutualDefensiveAttritionResult;
  readonly sinkhorn: SinkhornRoleResult;
  readonly qbHooks: readonly QbRushHaircutResult[];
  readonly rookieOverrides: readonly { player: string; overrideApplied: boolean }[];
}

/** 2026-10-22 NE @ CHI overlay. Static 2026-09-25 NFL slice veto is bypassed. */
export function runMasterSituationalReasoningOverlay(): MasterOverlayResult {
  const attrition = evaluateMutualDefensiveAttritionTotalOverride(NE_CHI_20261022_ATTRITION);
  const spread = evaluateLegacySliceSuppressionBypass({
    sport: "NFL",
    pickType: "SPREAD",
    selection: "CHI -3.0",
    line: -3,
    v6BitmaskPresent: true,
    corpusMindReceiptPresent: true,
    legacyShouldSuppress: true,
  });
  const total = evaluateLegacySliceSuppressionBypass({
    sport: "NFL",
    pickType: "TOTAL",
    selection: "OVER 50.5",
    line: 50.5,
    v6BitmaskPresent: true,
    corpusMindReceiptPresent: attrition.recommendedAction === "PLAY_OVER",
    legacyShouldSuppress: true,
  });
  const sinkhorn = evaluateLbVoidTeRbVsSlotAbsorption({
    homeIlb1Out: true,
    homeIlb2Out: true,
    homeNickelCbActive: true,
    slotWrName: "DeMario Douglas",
    te1Name: "Hunter Henry",
    te2Name: "Eli Raridon",
    rbName: "Rhamondre Stevenson",
  });
  const qbHooks = [
    evaluateQbKneeldownAndLeadScriptRushHaircut({
      player: "Caleb Williams",
      line: 19.5,
      role: "leading_home_qb",
      pEnterVictoryFormation: 1,
    }),
    evaluateQbKneeldownAndLeadScriptRushHaircut({
      player: "Drake Maye",
      line: 27.5,
      role: "trailing_qb",
      pEnterVictoryFormation: 0,
      trailingTwoMinute: true,
    }),
  ];
  const rookieOverrides = [
    evaluateRookieSnapAndTargetRampOverride({
      player: "Colston Loveland",
      week: 7,
      routeParticipation: 0.71,
      kalmanVelocityPerWeek: 0.06,
      bocpdRunLength: 2,
      veteranShadowedByCb1: true,
    }),
    evaluateRookieSnapAndTargetRampOverride({
      player: "Rome Odunze",
      week: 7,
      routeParticipation: 0.68,
      kalmanVelocityPerWeek: 0.05,
      bocpdRunLength: 2,
      veteranShadowedByCb1: true,
    }),
  ];
  return {
    spreadPublishState: spread.publishState,
    totalPublishState: attrition.recommendedAction === "PLAY_OVER" ? total.publishState : "PASS",
    attrition,
    sinkhorn,
    qbHooks,
    rookieOverrides,
  };
}
