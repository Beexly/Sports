import { NextResponse } from "next/server";
import { PUBLIC_RECORD_LINE } from "@/lib/ledger/public-record";
import { verifiedLedger } from "@/lib/ledger/verified-ledger-view";
import {
  computeThalerHedonicBundleFraming,
  buildSahniPersonalizedEmailDispatch,
  computeXLearnerPromoUpliftScore,
} from "../../../../lib/marketing/marketing-science-conversion-engine";

export async function GET() {
  const hedonicFraming = computeThalerHedonicBundleFraming(
    [
      { label: "Week 11 TNF (IND @ HOU) Full-Board Matchup & Prop Call Sheet", standaloneValueUsd: 29 },
      { label: "Trench Protection, Blitz & Coverage Matchup Breakdown", standaloneValueUsd: 19 },
      { label: "DK/FD Showdown Captain & Optimal Lineup Packet", standaloneValueUsd: 15 },
      { label: "Active Injury Replacements & Pass Discipline Notes", standaloneValueUsd: 12 },
    ],
    9.0,
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
    "IND @ HOU",
    PUBLIC_RECORD_LINE,
    "Week 11 TNF IND @ HOU Matchup Environment + Member Props & 3-Leg SGP Inside Package",
  );

  return NextResponse.json({
    status: "LIVE_READY",
    generatedAt: "2026-11-18T22:00:00-06:00",
    officialRecord: {
      wins: verifiedLedger.official.wlp.wins,
      losses: verifiedLedger.official.wlp.losses,
      pushes: verifiedLedger.official.wlp.pushes,
      winRatePct: verifiedLedger.official.gate.winRate,
      netUnits: verifiedLedger.official.units.total,
      recordDisplay: PUBLIC_RECORD_LINE,
    },
    tnfMatchup: "IND @ HOU",
    stage0ActiveStarters: {
      indQb1: "Daniel Jones",
      indRb1: "Jonathan Taylor",
      houQb1: "C.J. Stroud",
      houWr1: "Nico Collins",
      houWr2: "Tank Dell",
      blockedInactives: ["Bernhard Raimann (Out)", "Luke Travis (Out)", "Woody Marks (Out)"],
    },
    decisivePlays: [
      {
        market: "Week 11 TNF Environment Preview (Free)",
        selection: "IND @ HOU Indoors Pace & Trench Protection Environment Brief",
        modelProb: 0.501,
        devigMarketProb: 0.5,
        edgePct: 0.1,
        confidenceScore: "50/100",
        publishAllowed: false,
      },
      {
        market: "Week 11 TNF Pack ($9 Member Release)",
        selection: "SEALED BEHIND WEEK 11 TNF PACK (Side/Total Gate, Player Props, SGP & Showdown Lineups)",
        modelProb: 0.54,
        devigMarketProb: 0.5,
        edgePct: 4.0,
        confidenceScore: "54/100",
        publishAllowed: false,
      },
    ],
    conformalPassGrades: [
      { selection: "IND @ HOU Full-Game Spread (HOU -12.5 / IND +12.5 PASS)", decision: "PASS", publishAllowed: false },
      { selection: "IND @ HOU Full-Game Total (O/U 43.5 PASS)", decision: "PASS", publishAllowed: false },
    ],
    hedonicFraming,
    upliftDefault,
    emailDispatch,
  });
}
