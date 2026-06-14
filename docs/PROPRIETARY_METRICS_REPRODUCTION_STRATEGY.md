# Proprietary NFL Metrics — How They're Built & How We Reproduce the Equivalent

Goal: match the *information* the major proprietary providers sell, without paying
their licenses — by building our own metrics from **public/open data + open
methodologies**, validated by our own calibration. Same dish, our kitchen,
commodity ingredients.

## The one rule that keeps this legal (and on-brand)

We **never scrape, copy, or republish a provider's proprietary OUTPUT** (PFF's
grades, NGS's raw tracking feed, DVOA's numbers). Those are protected. We build
*our own* metrics from inputs we may lawfully use, and we ship them under our own
name with our own calibration. This is exactly the posture in
`apps/web/lib/scraping/` — facts + open-licensed data, gated by the clearance
engine; proprietary predictions/outputs are on the "never extract" list.

So "Burger King vs McDonald's" is the right frame **for the derived metrics built
on commodity inputs** — but be honest: you can't get the *exact* same numbers,
because the most valuable inputs (tracking feed, human grades) are the moat. We
build an *equivalent*, often a better-explained one.

## The unifying lens: every provider's edge is one of four moats

| Moat type | Who | Reproducible? |
|---|---|---|
| **Tracking hardware** — RFID/optical player tracking | NFL Next Gen Stats (and ESPN win-rate metrics derived from it) | NO for the raw feed (stadium hardware + exclusive deal). YES for the published aggregates + outcome models. |
| **Human charting labor** — analysts grading every snap | PFF, Sports Info Solutions, parts of FTN/Football Outsiders | EXPENSIVE to match exactly; APPROXIMATE-able from public charting (PFR) + ML. |
| **Open methodology** — a formula over public play-by-play | DVOA/DYAR, ESPN QBR & FPI, EPA/CPOE, AV | YES — fully reproducible from public PBP. This is most of "advanced analytics." |
| **Market pricing** — book lines / consensus | Pinnacle, odds aggregators | YES via de-vig consensus (we already built the calibration for this). |

## The goldmine that changes everything: nflfastR already ships ~75% of it, free

`nflverse`/`nflfastR` (CC-BY-4.0) publishes **play-by-play that already contains
EPA, Win Probability, Completion Probability + CPOE, success rate, air yards, YAC,
xpass**, plus separate public releases of **NGS weekly aggregates**
(`load_nextgen_stats`), **PFR advanced charting** (`pfr_advstats`: pressures,
hurries, blocks, coverage), rosters, snaps, schedules, injuries, combine. ffverse
adds **expected fantasy points** (`ff_opportunity`). The Big Data Bowl (Kaggle)
releases real **tracking samples** for research.

We already ingest several of these: `apps/web/lib/nflverse/next-gen-stats.ts`
(NGS aggregates), `pressure-coverage.ts` (PFR advanced), `pbp.ts` (EPA/WP),
`apps/web/lib/intelligence/expected-points.ts` (ffverse xYAC). The methodologies
behind most "proprietary" numbers are open — the computed values are largely
already in the free data.

## Provider-by-provider teardown

### 1. NFL Next Gen Stats (NFL · AWS · Zebra · Wilson)
- **How:** RFID chips in shoulder pads + ball capture x/y position ~10×/sec; newer
  4K optical adds skeletal tracking (~29 points/player at higher rates). ~75 AWS
  SageMaker models turn that geometry into features (separation, cushion, time-to-
  throw, closing speed) and into **"over expected"** models (completion
  probability, expected YAC, expected rushing yards) and 0–99 composite scores.
- **Moat:** the raw tracking feed (hardware in every stadium + exclusive league
  deal). Irreproducible.
- **Public substitutes:** NGS *aggregates* are free via nflverse (we ingest them).
  The outcome models (CP/CPOE, xYAC) are reproducible from public PBP. Geometry
  models can be trained on Big Data Bowl tracking samples.
- **Our build:** ingest the aggregates into the system of record; rebuild/extend
  CP/CPOE and xYAC from PBP; (advanced) train separation/space models on BDB and
  apply via our outcome framework.
- **Honest gap:** we will NOT have live full-season raw tracking. We get the
  aggregates + outcome approximations, not the sub-second geometry.

### 2. Pro Football Focus (PFF)
- **How:** human analysts grade *every player on every snap* on a −2…+2 scale
  (0.5 steps; 0 = "did their job"), grading **process not outcome** (a great throw
  that's dropped still grades up). Grades are reviewed off All-22 tape, adjusted
  for situation (lots of context points/play), then normalized to 0–100 at game
  and season level. They also publish structured participation/charting data.
- **Moat:** the *labor* — a trained, QC'd grading operation + decades of charting +
  a consistent rubric.
- **Public substitutes:** PFR advanced charting (pressures, coverage, blocking) via
  nflverse is the closest public "who-did-what." EPA-credit allocation per player
  approximates the value side.
- **Our build:** NOT a copy of their grades. An **execution-approximation** layer
  (ML over PBP + public charting + outcomes) feeding our own composite player
  rating. Honest: process-grading can't be fully recovered without film charting.

### 3. ESPN QBR (Total QBR)
- **How:** divides credit for each play among the players involved, weights by EPA
  and clutch (win-probability leverage), with completion/air-yards context. A
  formula over (mostly) public play data + some charting.
- **Reproduce:** a QBR-like composite from nflfastR EPA + a WP-leverage weight +
  completion context. Very doable.

### 4. ESPN FPI (Football Power Index)
- **How:** a predictive team-strength rating (preseason prior + in-season update)
  that outputs win probabilities and projections.
- **Reproduce:** **we already built Elo** (`elo-backtest.ts`). Extend it to an
  FPI-like rating: preseason priors (roster/market), efficiency inputs (our DVOA-
  like metric), in-season update. Calibrate with the backtest framework.

### 5. ESPN Pass/Run Block & Pass-Rush Win Rates (PRWR/PBWR/RBWR)
- **How:** derived from NGS tracking geometry at the line of scrimmage (did the
  blocker/rusher win within N seconds).
- **Moat:** tracking. **Reproduce:** approximate from PFR pressure/block charting +
  Big Data Bowl line-of-scrimmage tracking.

### 6. Football Outsiders / FTN — DVOA & DYAR
- **How:** value of each play vs the **league-average baseline for that exact
  situation** (down, distance, field position, etc.), **opponent-adjusted**, summed
  and expressed relative to average (DVOA) or as cumulative value (DYAR). The exact
  baselines are their recipe, but the *concept* is open.
- **Reproduce:** **highly doable** from nflfastR success/EPA + a situational
  baseline + an opponent adjustment. This is the single best value-for-effort
  build — a "Galaxy Opponent-Adjusted Efficiency" metric. No tracking, no charting.

### 7. Sports Info Solutions (SIS) — Total Points, charting
- **How:** human charting (like PFF) + an EPA-style allocation of "points" to
  players. Charting moat.
- **Reproduce:** approximate Total-Points-style allocation via EPA distribution from
  PBP; can't match their charted detail without charting.

### 8. Pro Football Reference — Approximate Value (AV), advanced stats
- **How:** AV is a published-methodology single-number season value; the advanced
  stats are charting that nflverse already mirrors.
- **Reproduce:** compute an AV-like value from box + PBP; ingest the advanced stats
  (we already pull `pfr_advstats`).

### 9. Newer ML-grading shops (SumerSports, Telemetry, etc.)
- **How:** license tracking + train ML grades/win metrics.
- **Moat:** tracking. **Reproduce:** same path as NGS — aggregates + outcome models
  + BDB.

### 10. Betting markets (Pinnacle / consensus / odds aggregators)
- **How:** sharp pricing + liquidity → efficient lines.
- **Reproduce:** de-vig consensus → fair value. **We built the calibration backtest
  (`market-backtest.ts`)**; extend to a live consensus fair-value and an "edge vs
  our model" signal.

### 11. Fantasy projection houses (4for4, ETR, FantasyPros consensus)
- **How:** proprietary projection models over usage/efficiency.
- **Reproduce:** **we built a backtested projection method today**
  (`player-projection.ts`); extend it with the public signal stack below.

## What we genuinely CANNOT match (say it plainly)
- **NGS raw tracking feed** — hardware moat. We get aggregates + outcome
  approximations, never the live sub-second geometry.
- **PFF/SIS exact human grades** — labor moat. We approximate; we don't replicate.
- **Any provider's exact numbers** — we build *equivalents*, never copies (and that's
  the point: copies would be infringement).

## The build plan, mapped onto what we already have

This session already built the substrate: a player-data **system of record** (5
models + clearance-gated ingestion), the **HistoricalGame** settled archive, a
**calibration/backtest framework** (Brier/ECE/reliability), **Elo**, and a
**backtested projection** method. The metrics engine sits right on top.

- **Phase A — Ingest the public pillars into the system of record.** Persist PBP
  (with nflfastR's EPA/CPOE/success/WP), NGS aggregates, PFR advanced, ff_opportunity
  — reusing the `apps/web/lib/ingestion/*` + `nflverse-gate` pattern and adding
  models alongside the player tables. (Today these are fetched read-only and thrown
  away; persist them.)
- **Phase B — Rebuild the open models in the prediction engine.** Opponent-adjusted
  efficiency (DVOA-like), per-player EPA allocation, CPOE, an xYAC model, a QBR-like
  QB composite, and an FPI-like power rating (extend Elo). Each calibrated with the
  backtest framework — every metric ships with its measured error.
- **Phase C — Our composite glass-box ratings (the "Galaxy Index").** A transparent,
  weighted blend of the Phase-B signals → 0–100, position-normalized, **validated
  against real outcomes** (does the rating predict next-season production / wins?
  — measurable with the projection + calibration backtests already built). The
  existing `galaxy_player_index` concept becomes a real, calibrated number.
- **Phase D — Tracking models (advanced).** Train separation/space/xYAC-from-geometry
  on Big Data Bowl samples; apply to full seasons via the outcome framework.
- **Phase E — Surface it.** Gated/public routes like the calibration/projection ones
  already shipped, each returning its backtest error, plus a player "ratings" page.

## Our actual edge — why ours can be *better*, not just cheaper

We are not selling a free knockoff. PFF is opaque human judgment; NGS is a
black-box feed; DVOA is a secret recipe. Ours is **glass-box** (open methodology),
**calibration-proven** (every metric ships with its backtest error, the way the
projections and Elo backtest already do), and **unified** (one system of record →
one rating). Transparent + provably-calibrated is the credible "best site of 2026"
angle — and it's defensible because it's ours.

## Highest value-for-effort order (recommended)
1. Persist PBP + the public stat pillars (Phase A) — unlocks everything.
2. Opponent-adjusted efficiency (DVOA-like) — biggest signal, zero moat (Phase B).
3. FPI-like power rating extending Elo — we're halfway there.
4. Galaxy Index composite, calibrated (Phase C) — the differentiator.
5. Tracking models on BDB (Phase D) — last, hardest, smallest marginal gain.
