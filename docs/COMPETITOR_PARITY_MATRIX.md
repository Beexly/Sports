# Competitor Parity Matrix

Owner directive: *"If we do not have EVERYTHING our competitors have in some form or
fashion, we aren't doing things correctly — especially with stats and data."*

This is the standing audit. Honest statuses only: ✅ live · 🟡 built but gated on a
data key/contract · ❌ missing. Update this file whenever a surface ships.

Competitor set: LineStar, PFF, Footballguys, FantasyGuru/Elite Sports, FTN,
Action Network, Dimers, BetWise, BettingPros.

## Betting (Action Network · Dimers · BettingPros · BetWise)

| Feature | Theirs | Ours | Status |
|---|---|---|---|
| Odds comparison / best line | AN, BP, Dimers | **Line Room `/odds`** — best price per side, consensus, no-vig | ✅ NEW 2026-06-12 |
| Line movement tracking | AN | Pick factor trail + `lineMovementSpread` per game | ✅ |
| Best bets / picks with confidence | Dimers, BP | `/picks` + Board, confidence gated by proof ladder | ✅ |
| Win probability per game | Dimers | No-vig implied prob in Line Room (market-derived) | ✅ (market, not model — honest) |
| Bet tracking / CLV ledger | AN PRO | `/track` CLV Tracker | ✅ |
| Parlay analysis | AN | `/parlay-mri` (correlation MRI) | ✅ |
| Public betting % | AN | Requires a consensus-data vendor (no legal free source) | ❌ vendor needed |
| Prop bet analyzer | BP | `/fantasy/props` (engine: `lib/fantasy/props.ts`) | ✅ |
| Expert consensus picks | BP | Single-model shop by design; Airwave pundit claims = our analog | ✅ different form |
| Odds boost finder | AN | Promotions engine (compliance-gated) | 🟡 |
| +EV bet finder | BetWise, OddsJam-class | **Line Room "Today's edges"** — price vs no-vig consensus, ≥3 books required | ✅ NEW 2026-06-12 |
| Arbitrage detector | OddsJam-class | **Line Room** — cross-book locked-margin pairs, matched lines only | ✅ NEW 2026-06-12 |

## Fantasy season-long (Footballguys · FantasyGuru)

| Feature | Theirs | Ours | Status |
|---|---|---|---|
| Rankings / projections | Both | Graded pool engine; flips live with `PROJECTIONS_PROVIDER=live` | 🟡 needs licensed feed |
| Draft tools (VOR, tiers) | FBG Draft Dominator | `/fantasy/draft` — VOR, tier cliffs, run alerts | ✅ |
| Start/sit + lineup | Both | `/fantasy/lineup` | ✅ |
| Waiver/FAAB advisor | FBG | `/fantasy/waivers` | ✅ |
| Trade analyzer | Both | `/fantasy/trade` — fairness, consolidation | ✅ |
| League sync | Both | Sleeper connect (read-only, live rosters) | ✅ Sleeper · ❌ ESPN/Yahoo |
| Strength of schedule matrix | FBG | **Schedule Lab `/sos`** — season/early SoS, toughest stretch | ✅ NEW 2026-06-12 |
| Expert content / coaching | FantasyGuru | Academy (4 tracks incl. Fantasy & DFS) + in-tool Coach cards | ✅ NEW 2026-06-12 |

## DFS (LineStar · FTN)

| Feature | Theirs | Ours | Status |
|---|---|---|---|
| Lineup optimizer (multi-objective) | Both | `/fantasy/dfs` — cash/GPP/leverage, stacking, exposure | ✅ |
| Salary data | Both | DK CSV import live; live feed gated on SPORTSDATAIO/FANTASYDATA keys | 🟡 key needed |
| Ownership projections | LineStar | Leverage uses field-ownership estimates; no per-slate projection model | 🟡 |
| Late swap | LineStar | Not built | ❌ low priority until live slates |
| Contest sims | FTN | `/fantasy/contests` (sample-slate banner until feed) | 🟡 |

## Stats & data (PFF · FTN)

| Feature | Theirs | Ours | Status |
|---|---|---|---|
| Player grades | PFF | Graded pool (model-derived from nflverse, not film) | ✅ different method, honest about it |
| Snap counts / usage | PFF, FTN | Player Lab `/players?view=snaps` (nflverse, attributed) | ✅ |
| Advanced metrics (CPOE, RYOE, WOPR, aDOT) | FTN | Player Lab views + Edge Signals | ✅ |
| Next Gen tracking stats | — | `/players?view=nextgen` | ✅ |
| Injury reports | All | nflverse injury feed overlaid on rosters | ✅ |
| Historical DB (decades) | PFF | Lahman (MLB) + nflverse pbp; no unified history explorer | 🟡 |
| DVOA-style team efficiency | FTN | Team environment engine — `/intelligence/engines` + public API route | ✅ |

## Honest gaps ranked (what to build next)

1. ~~Strength of schedule~~ — **shipped 2026-06-12: Schedule Lab `/sos`** (FBG parity ✅)
2. **ESPN/Yahoo league sync** — OAuth apps + ToS review required, not just code.
3. **Public betting %** — needs a paid consensus vendor; route through vendor questionnaire.
4. **Ownership projection model** — per-slate model once live salary feed is connected.
5. **Unified history explorer** — Lahman + nflverse pbp behind one query surface.

## What we have that they don't

Public calibration ledger with proof-gated pricing, Scraping Clearance Engine
(rights-gated data), loss autopsies, Parlay MRI, Galaxy Twin observatory,
in-tool coaching tied to an Academy, Jarvis operations layer. Parity is the
floor — these are the moat.
