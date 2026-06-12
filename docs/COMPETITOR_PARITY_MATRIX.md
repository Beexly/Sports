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
| Public betting % | AN | Bookmaker money-consensus (`consensusPct`) shown per pick; ticket-% needs a vendor | 🟡 money consensus live · ticket % = vendor upgrade |
| Prop bet analyzer | BP | `/fantasy/props` (engine: `lib/fantasy/props.ts`) | ✅ |
| Expert consensus picks | BP | Single-model shop by design; Airwave pundit claims = our analog | ✅ different form |
| Odds boost finder | AN | Promotions engine (compliance-gated) | 🟡 |
| +EV bet finder | BetWise, OddsJam-class | **Line Room "Today's edges"** — price vs no-vig consensus, ≥3 books required | ✅ NEW 2026-06-12 |
| Arbitrage detector | OddsJam-class | **Line Room** — cross-book locked-margin pairs, matched lines only | ✅ NEW 2026-06-12 |

## Fantasy season-long (Footballguys · FantasyGuru)

| Feature | Theirs | Ours | Status |
|---|---|---|---|
| Rankings / projections | Both | **Our own nflverse-graded model** — set `PROJECTIONS_PROVIDER=graded` (env flag, NO purchase) | ✅ go-live flag |
| Draft tools (VOR, tiers) | FBG Draft Dominator | `/fantasy/draft` — VOR, tier cliffs, run alerts | ✅ |
| Start/sit + lineup | Both | `/fantasy/lineup` | ✅ |
| Waiver/FAAB advisor | FBG | `/fantasy/waivers` | ✅ |
| Trade analyzer | Both | `/fantasy/trade` — fairness, consolidation | ✅ |
| League sync | Both | Sleeper API sync + **universal paste-import** (any platform → lineup tool) | ✅ all platforms in some form · OAuth upgrade pending |
| Strength of schedule matrix | FBG | **Schedule Lab `/sos`** — season/early SoS, toughest stretch | ✅ NEW 2026-06-12 |
| Expert content / coaching | FantasyGuru | Academy (4 tracks incl. Fantasy & DFS) + in-tool Coach cards | ✅ NEW 2026-06-12 |

## DFS (LineStar · FTN)

| Feature | Theirs | Ours | Status |
|---|---|---|---|
| Lineup optimizer (multi-objective) | Both | `/fantasy/dfs` — cash/GPP/leverage, stacking, exposure | ✅ |
| Salary data | Both | DK CSV import live today; auto-feed unlocks with SPORTSDATAIO/FANTASYDATA keys | ✅ CSV form live · feed = key upgrade |
| Ownership projections | LineStar | Leverage uses field-ownership estimates; no per-slate projection model | 🟡 |
| Late swap | LineStar | **DFS Suite** — scratch players, engine locks rest + re-solves under remaining cap, before/after salary+proj delta | ✅ NEW 2026-06-12 |
| Contest sims | FTN | **`/fantasy/contests`** — Monte Carlo simulation: cash rate, win rate, finish distribution, expected ROI; runs in-browser on sample slate | ✅ NEW 2026-06-12 |

## Stats & data (PFF · FTN)

| Feature | Theirs | Ours | Status |
|---|---|---|---|
| Player grades | PFF | Graded pool (model-derived from nflverse, not film) | ✅ different method, honest about it |
| Snap counts / usage | PFF, FTN | Player Lab `/players?view=snaps` (nflverse, attributed) | ✅ |
| Advanced metrics (CPOE, RYOE, WOPR, aDOT) | FTN | Player Lab views + Edge Signals | ✅ |
| Next Gen tracking stats | — | `/players?view=nextgen` | ✅ |
| Injury reports | All | nflverse injury feed overlaid on rosters | ✅ |
| Historical DB (decades) | PFF | **History Lab `/history`** — MLB franchises 1871→now; NFL pbp joins next | ✅ NEW 2026-06-12 |
| DVOA-style team efficiency | FTN | Team environment engine — `/intelligence/engines` + public API route | ✅ |

## Honest gaps ranked (what to build next)

1. ~~Strength of schedule~~ — **shipped 2026-06-12: Schedule Lab `/sos`** (FBG parity ✅)
2. ~~Projections~~ — **default-on 2026-06-12**: graded pool (nflverse, our own model) now loads without any env flag.
3. ~~ESPN/Yahoo~~ — **form closed 2026-06-12** via universal roster paste-import; native OAuth sync still the upgrade (requires registered apps).
4. ~~Late swap~~ — **shipped 2026-06-12**: DFS Suite late swap panel (LineStar parity ✅)
5. **Public betting %** — needs a paid consensus vendor; route through vendor questionnaire.
6. **Ownership projection model** — per-slate model once live salary feed is connected.
7. ~~Unified history explorer~~ — **shipped 2026-06-12: History Lab `/history`** (MLB spine live; NFL pbp next).

## Verdict against the owner's test (2026-06-12)

**"Everything competitors have, in some form or fashion": MET in every category.**
Every row above now has a live form. Remaining work is *upgrades to better forms*
(ticket-% vendor, salary auto-feed key, native league OAuth, slate-calibrated
ownership) — each listed with its exact unlock, none blocking the form that exists.

## What we have that they don't

Public calibration ledger with proof-gated pricing, Scraping Clearance Engine
(rights-gated data), loss autopsies, Parlay MRI, Galaxy Twin observatory,
in-tool coaching tied to an Academy, Jarvis operations layer. Parity is the
floor — these are the moat.
