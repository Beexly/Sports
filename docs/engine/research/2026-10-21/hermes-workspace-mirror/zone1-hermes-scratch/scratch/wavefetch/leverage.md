# External repo leverage, batch 2 — 28 repos, read 2026-09-09 01:50–02:10 UTC

Method: README, LICENSE and key docs fetched from raw.githubusercontent (api.github.com is blocked
from this sandbox), four repos shallow-cloned (nfl-edge-finder, sports-skills, nfl-value-board,
gooseline-model-hq, edge-record). Every claim below cites the file it came from. Nothing was copied
into Sports. Ranked by what GSE can act on before and after kickoff.

## A. Act now (changes what tonight's work should do)

### A1. The legal second book already exists on main: TheRundown carries Kalshi as affiliate 25
- Evidence: `Sports packages/data-ingestion/src/rundown-client.ts:34-49` maps affiliate `"25"` to
  book key `kalshi` and says in its own comment "Kalshi here is Rundown's licensed feed, not the
  Kalshi Trade API (Dev Agreement §3 still blocks that path)". api-evangelist/therundown README
  confirms Rundown "aggregates ... prediction markets like Kalshi and Polymarket" on the free plan.
- Why it fails today: Rundown free plan is 20K data points/day, 1 req/s, 5-minute delay
  (api-evangelist/therundown, plans table). Our cadence (refresh 4x/h × sports × dates, no 429
  cooldown, AGENTS.md "Second book root cause") burns the quota early and it 429s all day.
- Action (HP-16 step 0, before any PredExon code): make the Rundown thin-fill cheap enough to
  survive the day: call it only for games under `MIN_BOOKMAKERS`, NFL/NCAAF on game days only,
  one call per sport per cycle, 30-minute cooldown after a 429. Verify `kalshi` passes
  `isRealBookmakerKey` (apps/web/lib/calibration/publish-time-market-p.ts). If it does, the
  two-book NFL board is a cadence fix, not a new integration.

### A2. Kalshi fee-aware fair value (for any Kalshi-priced quote, via Rundown or PredExon)
- gooseline-model-hq `src/nfl/rundown.py:28,255-284`: edge = p − ask − fee(ask), with
  `kalshi_fee(p)`; nfl-edge-finder `docs/KALSHI_API_NOTES.md` gives the documented schedule:
  taker `ceil(0.07 · C · P · (1−P))`, maker `ceil(0.0175 · C · P · (1−P))`, on
  `quadratic_with_maker_fees` series (KXNFLGAME/SPREAD/TOTAL), `fee_multiplier` 1, no settlement fee.
- Action: `galaxy-kalshi-book.ts` de-vigs on YES/NO mids (`:120-150`). A Kalshi quote used as a
  BOOK price for edge should subtract the taker fee at the ask, or it overstates edge by up to
  1.75 cents at P 0.5. One function, one test.

### A3. Kalshi settlement semantics differ from sportsbooks (grading rules if Kalshi is a book)
- nfl-edge-finder `docs/KALSHI_SETTLEMENT.md` (from `rules_primary` text + 61,068 archived 2025
  markets): game winner **tie settles both sides at $0.50** (8 markets = 4 ties); postponed >48h
  settles at fair price; player props: inactive player → $0.00, active-no-snap → pregame fair
  price (348 of 33,684 = 1.03%), ≥1 snap → binary on stat.
- Action: settlement `calculatePickResult` treats a tie moneyline as PUSH; a Kalshi-book pick is
  economically a half-loss on the fee. Record the rule in the line-integrity evidence, do not
  change grading tonight.

### A4. Doctrine evidence for HP-14: a team-rating model adds nothing to the closing line
- nfl-edge-finder `research/game_model/RESULTS.md`: walk-forward 2014–2025, n 3,151 games,
  EPA ridge ratings: closing spread RMSE 12.88 vs model 13.26; optimal blend weight on the model
  **0.0**; encompassing regression 1.01 on spread, 0.03 on model; ATS when the model disagrees by
  >3 points: 50.0% (n 928, CI 46.8–53.2). Same early season.
- Action: HP-14 publishes on e = p − q where p is market-anchored. This result says the only
  edges worth publishing in NFL game markets come from (a) earlier-in-week vs close, (b) venue
  disagreement (Kalshi vs books), (c) availability/weather shocks that reprice with lag. The
  brief already forbids the 0.58 fair-prob floor; add: never publish an NFL moneyline on a
  model-vs-close disagreement alone. This is also the marketing line: we measured what everyone
  else sells.

### A5. Free availability and weather feeds, verified by download 2026-09-04 (nfl-edge-finder `docs/DATA_SOURCE_AUDIT.md` §1, §3b)
- Sleeper `/v1/players/nfl` (14.6 MB): `injury_status`, `injury_body_part`,
  `practice_participation`, `depth_chart_order`, `status` — registered in our registry (`sleeper`).
- NWS `api.weather.gov` hourly gridpoint (registered `nws-weather`); Open-Meteo forecast and
  **previous-runs** API (forecast-vintage backtests) (registered `open-meteo`).
- ESPN `site.api.espn.com/.../injuries` (9 MB all teams) returned 200 from GitHub runners.
- nflverse 2026 (CC-BY 4.0): `depth_charts_2026.parquet` daily snapshots with `dt` timestamps
  from 2026-03-22 (494k rows); `injuries_2026` NOT yet published; `roster_weekly_2026` week 1
  present; `games.csv` 2026 full 272-game slate **with spread_line, total_line and moneylines for
  weeks 1–5** (Lee Sharpe consensus, vintage undocumented, treat as near-close).
- Action: ledger C-264 (satellite season-resolution skips 2026 depth charts when player-week
  stats are absent) is confirmed as a real loss: depth charts and rosters exist for 2026 today,
  injuries do not. Resolve season per asset. `games.csv` lines are a free NFL reference line and a
  1999–2026 historical closing-line proxy for CLV backtests; check `nflverse-source.ts` reads them.

## B. Adopt as reference (ideas, not code)

- **LeSingh1/edge-nfl (MIT)** `README`: isotonic calibrator keyed by stat type, correction
  **clamped to ±0.20 "so a thin bucket cannot fake confidence"**, quarter Kelly. Maps onto our
  thin strata (NFL n 28, NCAAF n 65): a clamped per-stratum correction is the honest shape for
  the calibration pipeline (R&D lane, `CALIBRATION_ADJUSTMENTS_ENABLED` stays off).
- **daypatell/nfl-value-board** `scripts/model.py`: EV uses the RAW vigged price; disagreement
  labels ("FAVORITE FLIP", "MARGIN MISMATCH", "AGREEMENT") use the de-vigged probability; Elo
  with 20k Monte Carlo, NFL margin SD 13.5, MIN_EDGE 3 pp. The EV-vs-opinion separation is a clean
  factor-trail vocabulary. No license file.
- **gooseline-model-hq** `docs/methodology.md`: walk-forward with embargo, "if NLL degrades >2%
  under embargo the model does not ship", reliability rule "no populated decile (n ≥ 50) may
  deviate more than 0.10", leakage assert. Good promotion-gate language for
  `.claude/skills/model-promotion-gate`. Bayesian ridge + Kalman ratings (NFL), MLB pipeline.
- **machina-sports/sports-skills (MIT code, "personal use only" data terms)**: our
  `kalshi-series.ts` header already cites it. New since: `markets` skill joins ESPN schedules to
  Kalshi/Polymarket by team (`skills/markets`, `references/team-ids.md`), the exact alias problem
  behind the Kalshi second-book gap PR #724 owns; `betting` skill has de-vig/Kelly math; the
  autonomous-agent contract (`README` "Autonomous Agent Contract") is a good template for our
  agent briefs. Hermes Agent is a listed host: Hermes may install it for read-only cross-checks of
  our board, never as product data (terms).
- **edge-record** (`record/predictions.jsonl`, `line_history.json`, `methodology.md`): a
  competitor's "public verifiable track record, every prediction timestamped before kickoff"
  with zero settled games. Our receipts are commitments, not timestamps; the positioning line
  writes itself and belongs in HP-12 drafts.
- **andrewnexys/edgefinder-cli**: paid competitor ($20/$50/$150 per month) distributed as a CLI
  and an MCP server with magic-link login. Distribution idea for the agent directory (HP-12):
  a read-only GSE MCP server over the public truth surface and Edge Index.
- **pmxt (MIT SDKs, hosted unified API incl. Kalshi)** and **ccxt (MIT, now Kalshi/Polymarket
  public REST+WS)**: mature clients. Direct Kalshi reads are public and rate-limit friendly
  (nfl-edge-finder: 2,649 requests at 4 rps, zero 429s, base `api.elections.kalshi.com`), but
  our registry gate is legal, not technical: Developer Agreement v1.1 §3/§3.1 (`source-registry.ts:240-253`,
  `commercialUse false, verdict paid-required`). pmxt's hosted API is a second vendor route of the
  same shape as PredExon; its terms are unread. Backup only.
- **Pinnacle** (api-evangelist profile → `api-search/pinnacle` OpenAPI + AsyncAPI, docs
  pinnacleapi.github.io): the sharpest reference line, customer/partner gated; we already carry
  `pinnacle-unofficial` in the registry. **Smarkets** and **PredictIt** have public APIs
  (aland4747 list, "Exchanges & Platforms"): Smarkets is a UK-regulated sports exchange and a
  possible soccer reference; not for tonight.
- **aland4747/awesome-prediction-markets**: SimpleFunctions unified Kalshi+Polymarket REST and
  MCP ("free during beta"); Probalytics, Marketlens, Oddpool, TREMOR are paid cross-venue data
  vendors. Kalshi market data "Auth: No, 100/min". Reference for the registry candidates table.

## C. Ignore (with the reason)
- api-evangelist/novig, swish-analytics: enrichment stubs, no API content. gammastack: no public API.
- 3bsalam-1/Car-Info: car price API, paste error. rzhang539/PokiAPI-ML-predictions: no README.
- elsantos305/predmarket: README is a download-link page to a `Software_1.6.zip` inside the repo;
  do not run anything from it.
- jangles-byte/Pythia: geopolitical forecasting mashup, not sports. Football_Prediction_Project:
  dead since 2024. Nicolas-Pedernera/predictions-graphql-api: portfolio app (one good pattern:
  pure scoring function unit-tested apart from I/O, which we already do).
- shawn14/nfl-betting-system: untouched Next.js template. ianalloway/sports-betting-ml: NBA
  XGBoost demo. multisport-elo-lab: Elo + Monte Carlo dashboard, reference only.
- bxntt/barnbetsinc: model-first blend with `max_market_weight`; A4's evidence says the market
  should dominate, so this is the counter-example, not a model to borrow.
- sarviinageelen/polymarket-sports-analysis: Polymarket is a compliance hold; the forecaster
  leaderboard (Gamma API + PNL subgraph) is a concept note only.
- skrt0215/gridiron-prophet: "3+ point edge over Vegas" flags; A4 measured that at 50.0%.
