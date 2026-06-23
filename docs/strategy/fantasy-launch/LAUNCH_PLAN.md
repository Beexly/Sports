# Fantasy Launch Plan — soft-launch now → loud kickoff

> Customer-facing launch for the Galaxy Fantasy product. Owner decision (locked):
> **soft-launch the draft/best-ball tools now → loud "ribbon-cutting" at NFL kickoff.**
> Revenue vehicle: the **$49/yr Founding Fantasy tier**. Picks/calibration stay the proof
> engine behind the brand; fantasy is the season-timed revenue bridge.

## Why now (the window)
Best-ball drafting ramps all summer and **peaks in August** (4for4 maps the windows: early
offseason May–June, fragile mini-camp ADP June–July, optimal high-volume preseason late
Aug–Sept). NFL 2026: **HOF Game Aug 6 · Preseason Wk1 Aug 13 · Kickoff Sept 9.** The closer
to kickoff, the more draft-hungry the audience — and the less runway to fill the funnel. So
we open the real-data draft/best-ball tools *now* and convert into the peak.

## The two-phase ribbon-cutting
**Phase A — Soft launch (now → August).** Quietly open `/launch` + the real-data Draft and
Best Ball tools; sell the Founding Fantasy tier; build the audience and bank public ADP
"receipts." No paid spend. The page is the shareable artifact.

**Phase B — Loud kickoff (around Sept 9).** Flip the owned weekly-projection model live (only
after its backtest clears), which unlocks the full in-season suite (start/sit, waivers,
trade). Headline: *"the only fantasy projection that publishes its own calibration."* Push
hard across the organic channels (see `ORGANIC_PLAYBOOK.md`), anchored to HOF Game, preseason,
and kickoff.

## What's live vs gated at soft launch
- **Live (real, cleared data):** Draft Assistant, Best Ball, read-only Sleeper league sync.
- **Preview (clearly labelled, not paywalled as live):** Start-Sit, Waivers/FAAB, Trade —
  they need forward weekly projections (Phase 2). Never shown as live; never fabricated.

## The Founding offer
- **Fantasy tier — $4.99/mo · $49/yr**, founding rate **locked for life** (grandfather
  guarantee). Sits below Pro ($99/yr); fantasy suite is its value, betting depth + alerts stay
  Pro/Elite. Pricing benchmark: credible fantasy-tools subscriptions cluster ~$40–$100/yr
  (FantasyPros MVP $71.88, Fantasy Life+ T2 $99.99, 4for4 Pro $59, RotoViz ~$60) — $49 founding
  undercuts the band while clearly beating "free Sleeper" on decision tools.

## Owner prerequisites (must happen before live revenue)
1. Create `STRIPE_FANTASY_MONTHLY_PRICE_ID` + `STRIPE_FANTASY_ANNUAL_PRICE_ID` (test → live).
   Until then the Fantasy CTA returns a graceful 503.
2. Flip `PROJECTIONS_PROVIDER` so the tools render the real nflverse graded pool (the
   integrity payoff: paid tools on real data, with freshness + attribution on the badge).
3. (Phase B) Run the weekly-model backtest + calibration proposal, then flip
   `canPublishProjections`.

## Compliance posture
We are a **tools/analytics subscription**, not a DFS/contest operator — the low-risk lane
(no entry fees, no payouts). Use player names + stats freely (facts); avoid player
photos/team logos. Contests stay deferred + founder/legal-gated (see the master plan).
