# Competitor leverage memo — 2026-09-12

Source: three last-night teardown JSONs (Downloads/extract-data-2026-09-12*.json):
Statcast leaderboard schema (201 features), 50-URL DFS/projection/prop sweep
(71 features: LineStar, RotoGrinders, FantasyLabs, Oddsshopper, props.cash,
Outlier, SaberSim, PickFinder, Daily Fantasy Fuel, FantasyPros, PFR,
Football Outsiders, rbsdm, nflsavant), Statcast retention mechanics (53).

## What competitors actually sell (it is not predictions)

1. ALERTS (retention engine): new/updated prop lines (PickFinder), injury and
   lineup-change pushes (props.cash), 5-minute line-movement refresh (Daily
   Fantasy Fuel), net-positive player alerts + starter/odds/situation trends
   (LineStar), breaking-news scratch alerts (SaberSim). Every one is a reason
   to come back tomorrow.
2. EXPORT LOCK-IN: 1-click DK/FD lineup export (Daily Fantasy Fuel),
   Pick'Em app export (PickFinder), CSV download (Statcast free; FanGraphs
   gates it "Members Only" — export IS the paid conversion lever).
3. DAILY HABIT SURFACES: LineStar Daily Dashboard, PropFinder cheatsheets,
   slate-and-pulse pages. Same shape every day, fresh numbers.
4. ACTIVE TOOLS STAY STABLE: optimizer customization, lineup sorting and
   filtering, projection model selectors, sortable columns everywhere.
5. SOCIAL PROOF (earned): props.cash "200,000 fans", PickFinder "150,000+
   bettors". No bought numbers. We claim none until we earn them.
6. HONESTY AS POSITIONING: FanGraphs "these are not projections"; every
   table carries sample, pagination, and completeness notes.

## Our state (verified this session, no guessing)

- Watchlist alert-dispatch EXISTS (lib/watchlist/alert-dispatch.ts) but no
  product alert preference or delivery is wired to it.
- DK import exists (dk-import); DK/FD EXPORT does not. Zero CSV export
  anywhere in apps/web.
- Slate → game → readings now exists (/slate, /slate/[sport], /games/[gameId])
  but has no follow/subscribe action on any entity.
- Calibration proof is our differentiator and nobody else sells it; it does
  not retain alone.

## Proposed build order (retention-first)

P1 Game/player follow → alert on line movement, injury flag, new readings.
   Reuses alert-dispatch + nflverse injury report. Recurring value per user.
P2 DK/FD export from our optimizer (import path already parses the format).
   Workflow lock-in; gate CSV behind Pro exactly as FanGraphs does.
P3 Daily cheatsheet surface per league (habit shape, fresh numbers).
P4 Statcast/NextGen/PFR cleared-source ingestion for data depth (L14 input).
P5 Community proof only from real counts (entitlement-gated user counts).

Out of scope for this memo: Cinematic-vs-stable presentation split and the
House decision are answered separately. No gate, flag, or entitlement logic
changes proposed here; P1 delivery channel and P2 paywall placement are
founder calls when specced.
