import { NextResponse } from "next/server";

/**
 * `/llms-full.txt` — Extended Football Matchup, Props, Parlays & DFS Reference
 */
export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://galaxysportsedge.com";

  const body = `# Galaxy Sports Edge (GSE) — Complete NFL Matchup, Props, Parlays, DFS & Glass-Ledger Reference (${siteUrl})

## 1. Overview
Galaxy Sports Edge (${siteUrl}, operated by Galaxy Sports Network LLC) provides plain-English, film-backed NFL analysis and pre-kickoff cryptographic forecast commitments across:
- **NFL Game Picks:** Against the spread (ATS), game totals, team totals, and moneyline value spots.
- **360-Degree NFL Player Props:** Quarter and half props, quarterback passing and rushing, running back carries and receiving, wide receiver and tight end target shares, kicking props, defensive sacks and tackles, and touchdown scorers.
- **DraftKings & FanDuel NFL DFS:** Showdown captain-mode lineups, main-slate cash-game cores, and correlated tournament stacks.
- **Correlated Same-Game Parlays (SGPs):** Multi-leg tickets built around connected on-field game scripts rather than disconnected box-score guesses.

Public Glass Ledger Record: **Weeks 8–9 Staked 43-17-1 (+22.20u, n=61) · Week 8 Staked 36-13-1 (+20.14u, n=50) · Week 8 Base 38-13-1 (+22.85u, n=52) · Week 8 All-In 47-19-1 (+24.92u, n=67)**.

## 2. Our 5-Step Football Breakdown Process (GSE & GSI)
1. **Step 1 — Active 32-Team Roster, Beat-Writer & GSI Sports Medicine Verification:**
   - Confirms active starting quarterbacks, offensive line availability, injured reserve and mid-week practice-report participation across all 32 NFL beat desks, and vacated target/carry shares before grading any market.
   - **GSI (Texas Nonprofit Corp #15043440630001, 501(c)(3) application pending) Biomechanics & Recovery Research:** Evaluates position-specific return-to-play degradation curves across high-ankle syndesmotic sprains, hamstring sprint-speed caps and re-injury risk, turf toe push-off loss, quarterback rib/shoulder velocity changes, concussion return protocols, and short-week trench recovery deficits.
2. **Step 2 — Coaching Trees, Tendencies & Film Charting:**
   - Evaluates head coach, offensive coordinator, and defensive coordinator play-calling trees, pass rate over expectation, neutral pace, motion at the snap, personnel groupings (11, 12, 21), blitz and stunt tendencies, and two-high vs single-high coverage shells.
3. **Step 3 — Offensive & Defensive Line Trench Matchups:**
   - Measures pocket protection time, weakest-link offensive line pressure leaks, edge rush win rates, interior run-blocking displacement, and fourth-quarter defensive front fatigue.
4. **Step 4 — Situational, Officiating & Weather Context:**
   - Accounts for Thursday Night short rest, cross-country travel, altitude, referee crew penalty tendencies, outdoor wind and precipitation effects on kicking and deep passing, and late-game clock scripts.
5. **Step 5 — Two-Sided De-Vigged Line Comparison & Pass Discipline:**
   - Compares our fair football price against live de-vigged sportsbook odds. Confidence is always displayed as XX/100 (never as a raw percentage), and any market without clear line value is marked PASS · NO BET.

## 3. Primary Links
- Live Sealed Board: ${siteUrl}/board
- Week 10 Games & SHA-256 Commitments: ${siteUrl}/games
- Football Packages & Storefront: ${siteUrl}/packages
- Calibration & Reconciled Glass Ledger: ${siteUrl}/calibration
- DraftKings & FanDuel DFS Hub: ${siteUrl}/fantasy/dfs
- Summary Guide: ${siteUrl}/llms.txt
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
