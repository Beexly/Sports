# SIGNAL-GAP 2026-10-13 (Section 5a)

Diff: METRIC_UNIVERSE.md (the catalog of every measurable signal, 127 NFL
metrics + 138 gap items + 20 situational factors) against the re-founding
brief's Section 2 (the 10 ingestion domains the engine must know).

## Section 2's ten domains vs METRIC_UNIVERSE coverage

| # | Domain (Section 2) | METRIC_UNIVERSE coverage | Gap |
|---|---|---|---|
| 1 | On-field | 127 NFL metrics: EPA, WPA, Success Rate, Air Yards, YAC, XYAC, CPOE, CP, pressures, TTT, separation, motion%, PA%, RPO% ... | Deep catalog. WIRING gap, not knowledge gap (see below). |
| 2 | Off-field | Not cataloged (contracts, personal, legal) | GAP: no records, no ingestion path |
| 3 | Cognitive | Situational Context Canon (20 factors) touches coach/game context; pressers/depth moves/tendency breaks NOT cataloged | GAP: cognitive domain has no metric list |
| 4 | Physical/injury | Not in the 127 (injury/practice-participation/biometrics absent) | GAP |
| 5 | Environmental | Weather in the situational canon; air density/wind physics NOT cataloged | PARTIAL: physics constants live in repo engines (stadium_microclimate), not the catalog |
| 6 | Market | Not cataloged (line movement, prices, de-vig, cross-book) | GAP: the catalog is stats-only; market signals live in repo code (galaxy-kalshi-book, devig) |
| 7 | Historical | Equations Library (28) + copulas in repo (SGP copula engine, 1,088-game correlations) | PARTIAL: catalog lacks the copula/empirical layer |
| 8 | Social | Not cataloged | GAP |
| 9 | Nutrition/recovery | Not cataloged (load management, recovery) | GAP |
| 10 | DFS/ownership | Not cataloged (ownership, chalk, leverage, stacks) | GAP |

## The honest headline

METRIC_UNIVERSE is 90% of the ON-FIELD universe and ~0% of the OTHER NINE
domains. The re-founding brief is right: the catalog itself is the floor.
The gap list below is therefore TWO lists: (A) the metric-universe items not
yet WIRED into the reasoning engine, and (B) the domains that need a catalog
of their own before they can even be wired.

## (A) On-field: cataloged but not wired into the reasoning engine

The engine's per-game fact surface today (run_game.py) consumes:
EPA facets (pass/rush/turnover), OL state (starters_out, continuity), tau_hat,
weather. That is 4 of the 127. The nearest high-value unwired set, per
METRIC_UNIVERSE's own Top-10 missing-free list (all nflverse/NGS, all free):

1. EPA (wired in facets) - but WPA, Success Rate, Air Yards, YAC, XYAC, CPOE,
   CP are all in the same nflverse play-by-play and NOT in the facets.
2. NGS block: Separation, Rush YAC, Air Accuracy, Time to Throw - free, not wired.
3. Situational Context Canon (20 factors: rest, travel, altitude, turf, division,
   trap-game...) - cataloged, not in the fact surface.

Wire order (cheapest first, same data source as the already-wired facets):
- Extend `reasoning_engine/facets.py` epa_facets to also emit SR, air yards,
  YAC, WPA from the same parquet (zero new deps, one function).
- Add NGS weekly load to the ingestion layer (public CSV mirrors are uncertain;
  nflverse is the reliable path) as a separate signal record set.
- Lift the 20 situational factors into `Signal` records with
  verification="REPORTED" until measured.

## (B) Domains needing their own catalog + ingestion (not in METRIC_UNIVERSE)

| Domain | First ingestion path (live, keyless) | Landed today? |
|---|---|---|
| Market | Kalshi public read API + ESPN scoreboard odds (de-vig) | YES (kalshi digest, 80 markets) |
| Environmental | Open-Meteo forecast + air density | YES (weather pilot, 8 venues) |
| Physical/injury | ESPN injuries endpoint through the injury gate | YES (800 rows) |
| Cognitive | ESPN news + Google News RSS (pressers, depth moves) | IN FLIGHT (agent 5) |
| DFS/ownership | repo DK census artifacts + ESPN fantasy public | IN FLIGHT (agent 6) |
| Social | X intel stream (already committing to docs) + RSS | PARTIAL (x-intel runs exist) |
| Historical | repo copula artifacts + nflverse full PBP | PARTIAL (copula engine exists) |
| Off-field | ESPN news categories; manual drops via mind guardian | NO - guardian path exists, no source wired |
| Nutrition | No free structured source identified; REPORTED-tier only | NO |

## Wire-order verdict (highest leverage first)

1. Extend epa_facets (SR/air/yards/YAC/WPA/CPOE) - one function, same parquet,
   feeds L1 facts immediately. SMALLEST CHANGE, BIGGEST FACT-COVERAGE JUMP.
2. Kalshi->MarketPrior->bayes.update is LIVE; next is wiring the per-game
   scoreboard odds (ESPN inline, already ingested repo-side) as priors so
   every game card gets a posterior, not just Kalshi-listed games.
3. Situational canon -> Signal records (REPORTED tier), then measure.
4. Cognitive + DFS land (agents running) -> their Signal specs plug into
   signals.py loaders.
5. Off-field/nutrition: honest REPORTED tier via news categories; no
   fabricated numbers.
