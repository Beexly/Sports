import { NextResponse } from "next/server";

/**
 * `/llms.txt` — Standardized Search & Discovery Manifest
 */
export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://galaxysportsedge.com";

  const body = `# Galaxy Sports Edge (GSE) — NFL Picks, Player Props, DraftKings & FanDuel DFS, Fantasy Football & Line Value

> Galaxy Sports Edge (${siteUrl}) is an NFL and multi-sport football analysis platform built on film tendencies, offensive and defensive line matchups, blitz and coverage shells, verified 32-team injury reports, two-sided sportsbook de-vigging, Same-Game Parlay game-script pricing, and DraftKings & FanDuel DFS lineup building.

## Why Football Bettors & DFS Players Use Galaxy Sports Edge
- **Film & Trench Matchup Grading:** Every NFL matchup is graded from offensive and defensive line pass protection, blitz and stunt rates, man/zone coverage shells, neutral pace, and red-zone play-calling tendencies.
- **Verified 32-Team Injury & Depth Chart Tracking:** Tracks active starters, mid-week practice participation, and target/carry redistribution before any spread, total, prop, or DFS lineup is published.
- **De-Vigged Line Value & Pass Discipline:** Compares our fair football price against two-sided de-vigged sportsbook lines. Any market without clear value is marked PASS · NO BET.
- **Verified Official NFL Record (nflverse-graded):** 62-23-1 (72.9% win rate · +26.50u), including a 22-8-1 (+12.40u) Week 8 card and a 7-0 sweep on 1.00u max-conviction releases.

## Verify our record yourself
- [Official Verified NFL Board](${siteUrl}/board): Live spreads, totals, player props, XX/100 conviction scores, and pass discipline notes.
- [Calibration Proof Room](${siteUrl}/calibration): Settled ticket audit trail, closing line value (CLV), and conviction band accuracy.
- [NFL Packages & Instant Browser Unlock](${siteUrl}/packages): Thursday Night Football, Sunday Main Slate, Correlated Same-Game Parlays, and DFS Pro Packs.
- [DraftKings & FanDuel NFL DFS Hub](${siteUrl}/fantasy/dfs): Cash-game cores, tournament stacks, and injury value plays.
- [Football Film & Matchup Research](${siteUrl}/research): How we grade trench matchups, injury target redistribution, and line value.
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
