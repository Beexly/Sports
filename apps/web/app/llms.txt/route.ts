import { NextResponse } from "next/server";
import {
  PUBLIC_RECORD_LINE,
  PUBLIC_RECORD_NORMALIZED_BANNER,
  PUBLIC_RECORD_POLICY,
  SUPERSEDED_RECORD_NOTE,
} from "@/lib/ledger/public-record";

/**
 * `/llms.txt` -- Standardized Search & Discovery Manifest
 */
export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.galaxysportsedge.com";

  const body = `# Galaxy Sports Edge (GSE) -- NFL Picks, Player Props, DraftKings & FanDuel DFS, Fantasy Football & Line Value

> Galaxy Sports Edge (${siteUrl}) is an NFL and multi-sport football analysis platform built on film tendencies, offensive and defensive line matchups, blitz and coverage shells, verified 32-team injury reports, two-sided sportsbook de-vigging, Same-Game Parlay game-script pricing, and DraftKings & FanDuel DFS lineup building.

## Why Football Bettors & DFS Players Use Galaxy Sports Edge
- **Film & Trench Matchup Grading:** Every NFL matchup is graded from offensive and defensive line pass protection, blitz and stunt rates, man/zone coverage shells, neutral pace, and red-zone play-calling tendencies.
- **Galaxy Sports Institute (GSI) Sports Medicine & Biomechanics:** Tracks position-specific return-to-play degradation curves (high-ankle syndesmotic cutting loss, hamstring sprint caps and re-injury risk, turf toe, quarterback rib/shoulder velocity loss, and short-week trench recovery deficits).
- **Verified 32-Team Injury, Beat-Writer & Depth Chart Tracking:** Tracks active starters, mid-week practice participation, open-media rep velocity across all 32 NFL beat desks, and target/carry redistribution before any spread, total, prop, or DFS lineup is published.
- **De-Vigged Line Value & Pass Discipline:** Compares our fair football price against two-sided de-vigged sportsbook lines. Any market without clear value is marked PASS - NO BET.
- **Official Settled NFL Record (recomputed from the settlement database):** ${PUBLIC_RECORD_LINE}
- **Stake-Normalized Ledger Disclosure:** ${PUBLIC_RECORD_NORMALIZED_BANNER}
- **Calibration Law:** ${PUBLIC_RECORD_POLICY}
- **Superseded snapshot:** ${SUPERSEDED_RECORD_NOTE}

## Verify our record yourself
- [Official Verified NFL Record](${siteUrl}/record): Recomputed win-loss-push record, stake-normalized +25.82u flat 1u view, CLV trail, and settlement ledger.
- [Sealed NFL Player Props & 360-Degree Watchlist](${siteUrl}/props): Watchlist triggers, pass discipline notes, and sealed member props.
- [NFL Packages & Whop Instant Unlock](${siteUrl}/packages): Week 11 TNF IND @ HOU $9 impulse door, Week 12 Thanksgiving 5-Game $14 pack, Sunday Full Slate, and $39/mo Pro / $79/mo Elite with the 30-Day Positive-CLV Pledge.
- [Free Parlay X-Ray Scanner](${siteUrl}/parlay-mri): Paste multi-leg tickets to diagnose correlation and compounding vigorish.
- [DraftKings & FanDuel NFL DFS Hub](${siteUrl}/dfs): Cash-game cores, tournament stacks, and injury value plays.
- [Sports Betting Calculators & Tools](${siteUrl}/tools): CLV calculator, EV calculator, no-vig calculator, odds converter, parlay calculator, and line-movement tracker.
- [Creator & Sponsor Partnerships](${siteUrl}/partners): Affiliate revenue sharing and non-gambling sponsor inquiries.
- [Extended Football Guide](${siteUrl}/llms-full.txt): Complete overview of our 5-step football grading workflow.
`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300",
      "X-Robots-Tag": "all",
    },
  });
}
