import { NextResponse } from "next/server";
import {
  computeThalerHedonicBundleFraming,
  buildSahniPersonalizedEmailDispatch,
  computeXLearnerPromoUpliftScore,
} from "../../../../lib/marketing/marketing-science-conversion-engine";

export async function GET() {
  const hedonicFraming = computeThalerHedonicBundleFraming(
    [
      { label: "Week 9 TNF (JAX @ BAL) Full-Board Matchup & Prop Call Sheet", standaloneValueUsd: 29 },
      { label: "Trench Protection, Blitz & Coverage Matchup Breakdown", standaloneValueUsd: 19 },
      { label: "DK/FD Showdown Captain & Optimal Lineup Packet", standaloneValueUsd: 15 },
      { label: "Active Injury Replacements & Pass Discipline Notes", standaloneValueUsd: 12 },
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
    "36-13-1 (73.5%) · +20.14u Verified | All-in 47-19-1 (+24.92u)",
    "Mark Andrews OVER 2.5 Receptions (88/100 Free Teaser) + 9 Locked TNF Plays & 3-Leg SGP",
  );

  return NextResponse.json({
    status: "LIVE_READY",
    generatedAt: "2026-11-05T16:55:00-06:00",
    officialRecord: {
      wins: 47,
      losses: 19,
      pushes: 1,
      winRatePct: 71.2,
      netUnits: 24.92,
      recordDisplay: "36-13-1 (73.5%) · +20.14u Verified | All-in 47-19-1 (+24.92u)",
    },
    tnfMatchup: "JAX @ BAL",
    stage0ActiveStarters: {
      balQb1: "Joe Fagnano / Jacoby Brissett",
      balRb1: "Derrick Henry",
      jaxQb1: "Trevor Lawrence",
      jaxRb1: "Bhayshul Tuten",
      blockedInactives: ["Lamar Jackson (Out)", "Tyler Huntley (Out)", "Travis Etienne Jr. (Out)"],
    },
    decisivePlays: [
      {
        market: "Player Receptions Prop (Free Teaser)",
        selection: "Mark Andrews OVER 2.5 Receptions",
        modelProb: 0.684,
        devigMarketProb: 0.542,
        edgePct: 14.2,
        confidenceScore: "88/100",
        publishAllowed: true,
      },
      {
        market: "9 Locked Top-Confidence TNF Plays (88/100)",
        selection: "🔒 LOCKED BEHIND TNF PACK (9 Player Matchups + 3-Leg SGP + Showdown Captain Lineups)",
        modelProb: 0.665,
        devigMarketProb: 0.535,
        edgePct: 13.0,
        confidenceScore: "88/100",
        publishAllowed: true,
      },
    ],
    conformalPassGrades: [
      { selection: "JAX @ BAL Spread PASS at -7.5 (Steamed from -3.5)", decision: "PASS", publishAllowed: false },
      { selection: "JAX @ BAL Full-Game Total (UNDER 44.5 PASS)", decision: "PASS", publishAllowed: false },
      { selection: "Parker Washington Receiving Yards (PASS)", decision: "PASS", publishAllowed: false },
    ],
    hedonicFraming,
    upliftDefault,
    emailDispatch,
  });
}
