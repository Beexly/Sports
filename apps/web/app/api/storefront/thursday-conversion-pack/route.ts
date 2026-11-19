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
      { label: "Week 11 TNF (IND @ HOU) Full 77-Market Board & Play-To Price Sheet", standaloneValueUsd: 29 },
      { label: "Trench Protection, Blitz & 5:45 PM CT Inactive Pivot Breakdown", standaloneValueUsd: 19 },
      { label: "DraftKings Showdown Cash & GPP Optimal Lineup Packet", standaloneValueUsd: 15 },
      { label: "Strict Stage-5 Pass Discipline & Active Injury Exclusions", standaloneValueUsd: 12 },
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
    "IND @ HOU",
    PUBLIC_RECORD_LINE,
    "Week 11 TNF IND @ HOU Free Trench Brief + Locked 77-Market Board & Showdown Lineups",
  );

  return NextResponse.json({
    status: "LIVE_READY",
    generatedAt: "2026-11-19T16:15:00-06:00",
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
      houRb1: "David Montgomery",
      blockedInactives: [
        "Danielle Hunter (Out)",
        "Charvarius Ward (Out)",
        "Jalen Travis (Out)",
        "Jerry Tillery (Out)",
        "Brevin Jordan (Out)",
      ],
      watchAt1745Ct: [
        "Sauce Gardner (Questionable - Calf)",
        "Jaylin Smith (Questionable - Hamstring)",
      ],
    },
    decisivePlays: [
      {
        market: "Game Environment Brief (Free Public Read)",
        selection:
          "IND OL 17.8 percent QB hit/sack rate vs HOU D 9.2 percent sack rate & 25.1 percent blitz; 5:45 PM CT Sauce Gardner watch (Zero Free Picks Leaked)",
        modelProb: 0.5943,
        devigMarketProb: 0.4913,
        edgePct: 10.3,
        confidenceScore: "62/100",
        publishAllowed: true,
      },
      {
        market: "Week 11 TNF Locked 77-Market Board & Showdown Pack",
        selection:
          "LOCKED BEHIND TNF PACK (77 DraftKings Markets, Play-To Odds Limits, 5:45 PM CT Pivot & Showdown Lineups)",
        modelProb: 0.697,
        devigMarketProb: 0.5,
        edgePct: 19.7,
        confidenceScore: "70/100",
        publishAllowed: true,
      },
    ],
    conformalPassGrades: [
      {
        selection: "IND @ HOU Main Spread HOU -12.5 (-106) PASS (62/100 below 65/100 gate)",
        decision: "PASS",
        publishAllowed: false,
      },
      {
        selection: "IND @ HOU Full-Game Total Over 44.5 (-104) PASS (53/100)",
        decision: "PASS",
        publishAllowed: false,
      },
      {
        selection: "All 77 Unpriced ESPN Core DK Props PASS (Live Play-To Odds Ceilings Inside Member Pack)",
        decision: "PASS",
        publishAllowed: false,
      },
    ],
    hedonicFraming,
    upliftDefault,
    emailDispatch,
  });
}
