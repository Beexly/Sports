import { NextResponse } from "next/server";

/**
 * `/llms.txt` — Standardized Search & Discovery Manifest
 */
export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://galaxysportsedge.com";

  const body = `# Galaxy Sports Edge (GSE) — NFL Picks, Player Props, DraftKings & FanDuel DFS, Fantasy Football & Glass-Ledger Forecast Verification

> Galaxy Sports Edge (${siteUrl}, operated by Galaxy Sports Network LLC) is an NFL analysis and cryptographic forecast-verification platform built on film tendencies, offensive and defensive line matchups, blitz and coverage shells, verified 32-team injury reports, two-sided sportsbook de-vigging, Same-Game Parlay game-script pricing, and DraftKings & FanDuel DFS lineup building.

## Why Football Bettors, Creators & AI Teams Use Galaxy Sports Edge
- **Film & Trench Matchup Grading:** Every NFL matchup is graded from offensive and defensive line pass protection, blitz and stunt rates, man/zone coverage shells, neutral pace, and red-zone play-calling tendencies.
- **GSI (Texas Nonprofit Corp #15043440630001, 501(c)(3) application pending) Biomechanics & Recovery Research:** Tracks position-specific return-to-play degradation curves (high-ankle syndesmotic cutting loss, hamstring sprint caps and re-injury risk, turf toe, quarterback rib/shoulder velocity loss, and short-week trench recovery deficits).
- **Verified 32-Team Injury, Beat-Writer & Depth Chart Tracking:** Tracks active starters, mid-week practice participation, open-media rep velocity across all 32 NFL beat desks, and target/carry redistribution before any spread, total, prop, or DFS lineup is published.
- **De-Vigged Line Value & Pass Discipline:** Compares our fair football price against two-sided de-vigged sportsbook lines. Any market without clear value is marked PASS · NO BET.
- **Public Glass Ledger (Every Pick Recorded, Wins & Losses):** Weeks 8–9 Staked Main/Derivative 43-17-1 (+22.20u, n=61) · Week 8 Staked 36-13-1 (+20.14u, n=50) · Week 8 Base 38-13-1 (+22.85u, n=52) · Week 8 All-In 47-19-1 (+24.92u, n=67). Openly verifiable via \`python scripts/audit/recompute_public_ledger.py --strict\`.

## Verify our record yourself
- [Week 10 Sealed Board](${siteUrl}/board): Live spreads, totals, player props, XX/100 conviction scores, and pass discipline notes.
- [Calibration Proof Room & Glass Ledger](${siteUrl}/calibration): Component-by-component settlement audit trail, sample size n, Brier scores, and pre-kickoff SHA-256 Merkle commitments.
- [Week 10 NFL Games & Hash Commitments](${siteUrl}/games): All 14 Week 10 matchups starting with WSH @ NYG TNF.
- [NFL Packages & Instant Browser Unlock](${siteUrl}/packages): Thursday Night Football, Sunday Main Slate, Correlated Same-Game Parlays, and DFS Pro Packs.
- [DraftKings & FanDuel NFL DFS Hub](${siteUrl}/fantasy/dfs): Cash-game cores, tournament stacks, and injury value plays.
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
