import { NextResponse } from "next/server";
import {
  computeThalerHedonicBundleFraming,
  buildSahniPersonalizedEmailDispatch,
  computeXLearnerPromoUpliftScore,
} from "../../../../lib/marketing/marketing-science-conversion-engine";

export async function GET() {
  const hedonicFraming = computeThalerHedonicBundleFraming(
    [
      { label: "Week 9 TNF (JAX @ BAL) 360° Full-Board Call Sheet", standaloneValueUsd: 29 },
      { label: "10,000-World x 175-Snap Trench Braid & Failed-Avalanche Simulator", standaloneValueUsd: 19 },
      { label: "DK/FD Showdown Optimal Cash & 150-Max GPP Lineup Packet", standaloneValueUsd: 15 },
      { label: "Stage 0 Roster Gate & Conformal PASS Audit Trail", standaloneValueUsd: 12 },
    ],
    9.99,
    49.0,
  );

  const upliftDefault = computeXLearnerPromoUpliftScore({
    priorFreeViews: 3,
    clickedPicksTab: true,
    daysSinceSignup: 1,
    priceSensitivityScore: 0.62,
  });

  const emailDispatch = buildSahniPersonalizedEmailDispatch(
    "Member",
    "JAX @ BAL",
    "16-5 (76.2%, +10.45u)",
    "JAX +3.5, UNDER 47.5 & Zay Flowers OVER 5.5 Receptions",
  );

  return NextResponse.json({
    status: "LIVE_READY",
    generatedAt: "2026-11-04T20:56:00-06:00",
    officialRecord: {
      wins: 16,
      losses: 5,
      pushes: 0,
      winRatePct: 76.2,
      netUnits: 10.45,
      recordDisplay: "16-5 (76.2%, +10.45u)",
    },
    tnfMatchup: "JAX @ BAL",
    stage0ActiveStarters: {
      balQb1: "Tyler Huntley",
      balRb1: "Derrick Henry",
      jaxQb1: "Trevor Lawrence",
      jaxRb1: "Tank Bigsby",
      blockedInactives: ["Lamar Jackson (Out)", "Travis Etienne Jr. (Out)"],
    },
    decisivePlays: [
      {
        market: "Full-Game Spread",
        selection: "JAX +3.5 (-110)",
        modelProb: 0.579,
        devigMarketProb: 0.512,
        edgePct: 6.7,
        confidenceScore: "76/100",
        publishAllowed: true,
      },
      {
        market: "Full-Game Total",
        selection: "UNDER 47.5 (-110)",
        modelProb: 0.594,
        devigMarketProb: 0.512,
        edgePct: 8.2,
        confidenceScore: "79/100",
        publishAllowed: true,
      },
      {
        market: "Player Receptions Prop",
        selection: "Zay Flowers OVER 5.5 Receptions (-115)",
        modelProb: 0.618,
        devigMarketProb: 0.523,
        edgePct: 9.5,
        confidenceScore: "81/100",
        publishAllowed: true,
      },
    ],
    conformalPassGrades: [
      { selection: "BAL -3.5", decision: "PASS", publishAllowed: false },
      { selection: "JAX Moneyline (+150)", decision: "PASS", publishAllowed: false },
      { selection: "Tank Bigsby OVER 64.5 Rush Yds", decision: "PASS", publishAllowed: false },
      { selection: "3-Leg Same Game Parlay", decision: "PASS", publishAllowed: false },
    ],
    hedonicFraming,
    upliftDefault,
    emailDispatch,
  });
}
