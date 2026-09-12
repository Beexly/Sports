# DFS / data / ML tooling vetting (2026-09-12)

Vets the pasted list of DFS optimizers, venue clients, sports-data libraries and
ML/data-platform repos: what actually fits GSE, what does not, and what was
adopted. Every star count, licence and date below was read from the GitHub API on
2026-09-12, not from memory. The paste contained ~90 links; after de-duplication
that is **58 distinct repos**, all 58 classified here.

## 1. The runtime boundary (decides the shape of the answer)

GSE runs TypeScript: Next 14.2 / React 18.3, `apps/web` + `packages/*`, Neon
Postgres, Vercel cron, and a browser bundle already measured at ~2x a
world-class marketing page. The 58 repos break down as 46 Python, 4 C++, 2 Rust,
1 R, 1 Jupyter, 1 TypeScript, 1 JavaScript, 1 HTML — and not one of them is a
TypeScript library this app could import.

**None of them can ship into a route.** So "fits" never means "add as a
dependency" here. It means one of three things:

- a **dev-time oracle** — an independent implementation that can falsify numbers
  we publish (this is the one that was adopted);
- an **offline lane** — Python run by a human or CI that produces *data* for the
  product (`scripts/statking_*.py` is the existing precedent in this repo);
- a **pattern to copy** — architecture that is better expressed as TS guardrails.

## 2. The data-rights boundary (decides the venue group by policy, not taste)

`apps/web/lib/integrations/dfs.ts` — committed before this list arrived — says the
DFS slate must come from "a contracted provider — never scraped, and never the
forbidden DraftKings hidden endpoint".

That sentence, not taste, is what rejects the venue-access group below. Any repo
whose value is scraping or shadowing DraftKings/FanDuel is excluded by GSE's own
stated posture regardless of licence or stars. Licensed *odds APIs* (The Odds
API and SDKs wrapping it) are a different case and are not excluded — that is the
provider path the ingest code is written to accept.

## 3. The licence and liveness screen

Across all 58:

- **21 have no licence at all** (GitHub reports `NONE`) — that is "all rights
  reserved", so no code can be copied into a paid product. Star count does not
  fix it: `BenBrostoff/draftfast` (298 stars) is one of the 21.
- **19 have zero stars** — personal projects, several pushed the very day the
  list was pasted. "Updated 2026-09-12" is a timestamp, not a health signal.
- **8 were last pushed in 2024 or earlier** — including the widely-cited
  optimizers.

## 4. Verdicts

### 4.1 Adopted

| Repo | ★ | Licence | Last push | Verdict | Why |
|---|---|---|---|---|---|
| `google/or-tools` | 14033 | Apache-2.0 | 2026-09-12 | **ADOPTED** (dev-time oracle) | Apache-2.0, CP-SAT is the independent optimum the DFS engine is now measured against; never shipped to the browser (`scripts/dfs/oracle.py`). |

### 4.2 DFS lineup optimisation and slate logic (20)

Every one of these is *reference or pattern*, never a dependency: they are Python,
and the equivalent model already ships in TS. The two verdicts worth acting on are
the portfolio-optimisation idea (correlated lineups) and the projections →
optimizer contract.

| Repo | ★ | Licence | Last push | Verdict | Why |
|---|---|---|---|---|---|
| `DimaKudosh/pydfs-lineup-optimizer` | 447 | MIT | 2024-03-01 | reference only | The canonical Python DFS optimizer (PuLP ILP). Its idea is what we now verify against; its stack (PuLP) buys nothing over CP-SAT. |
| `BenBrostoff/draftfast` | 298 | none | 2026-02-05 | reference only — **no licence** | 298★ and well-built, but 'all rights reserved': no code may be copied. Read the roster/DK-export parsing ideas, write our own. |
| `howrealizdat/dfs-lineup-optimizer` | 0 | none | 2026-06-20 | pattern match | OR-Tools ILP with a DK roster model — independently arrived at the same approach as our oracle. |
| `adam-jake-wiggins/nfl-dfs-pipeline` | 0 | none | 2026-08-19 | pattern worth copying | Constrained *portfolio* optimisation: correlated lineups under a salary cap. That is the honest framing for GSE's N-unique generator, which today only fades exposure. |
| `t-pegors/wnba-fantasy-mlops` | 0 | none | 2026-03-06 | pattern worth copying | XGBoost projections → PuLP optimizer, with the MLOps wrapper. The projections→optimizer contract is the shape our live-slate path should take. |
| `emilyk12345/linear-optimizer` | 0 | MIT | 2026-09-07 | skip | Generic ILP engine, 0★/2026 — nothing that CP-SAT does not do better. |
| `n-roth12/DFSLineupOptimizer` | 12 | MIT | 2024-09-13 | skip | Dormant since 2024, 12★. |
| `atlantahouseplants/MLBDFSLineupOptimizer` | 0 | none | 2026-09-07 | skip | 0★, no licence, MLB/FanDuel only, BallparkPal ingestion (another scrape risk). |
| `rjrice1990/nfl-single-game-optimizer` | 0 | none | 2026-02-06 | skip | 0★, no licence; Showdown format not on our roadmap. |
| `CrummyPicks/nascar-dfs-hub` | 0 | none | 2026-09-12 | skip | 0★, no licence, pushed the day the list was pasted — unverifiable. |
| `nukesim/nuke-dfs-hub` | 0 | none | 2026-09-12 | skip | Same cluster. |
| `925Sports/mlb-prop-optimizer` | 0 | none | 2026-09-12 | skip | Same cluster, HTML, no licence. |
| `Bryancruzcb/gridiron-lab` | 0 | none | 2026-09-12 | skip | Same cluster; TypeScript, but no licence and no history. |
| `Davidebri1/fantasy-grinder-dfs` | 0 | none | 2026-09-12 | skip | Same cluster (UFC/NBA/PGA). |
| `eharig09/mlb_dfs_scouting_reports` | 0 | none | 2026-09-11 | skip | Same cluster. |
| `noahhtylerr/PGA-Forecasting-Model` | 0 | MIT | 2026-09-04 | skip | Monte Carlo / strokes-gained is a fine idea, but 0★ and no track record; golf is not a GSE sport today. |
| `silverreyes/GB-Golf-Optimizer` | 0 | none | 2026-09-05 | skip | Same cluster, CSV-upload optimizer. |
| `wbp318/cfb_2026` | 0 | none | 2026-09-12 | skip | Same cluster; ESPN-FPI-vs-market line outlier finder is conceptually the same as our market-vs-model surface. |
| `Vijax0/dk-lineup-optimizer` | 0 | MIT | 2026-03-10 | skip | 0★, unlicensed, thin. |
| `adamkanouse/better-lineups-dfs` | 1 | none | 2019-01-31 | skip | 0★, last pushed 2019. |

### 4.3 Venue / odds access (8)

Policy, not preference. See section 2.

| Repo | ★ | Licence | Last push | Verdict | Why |
|---|---|---|---|---|---|
| `jaebradley/draftkings_client` | 154 | MIT | 2024-12-27 | **rejected by policy** | MIT, 154★, clean client — but its whole purpose is direct DraftKings access, which `lib/integrations/dfs.ts` forbids. |
| `yzRobo/draftkings_api_explorer` | 10 | MIT | 2026-08-09 | **rejected by policy** | DK API explorer; same reason. |
| `agad495/DKscraPy` | 47 | none | 2023-11-28 | **rejected by policy** | Explicit scraper, unlicensed, 2023. |
| `kyle1/draftkings-api` | 2 | none | 2023-04-23 | **rejected by policy** | Unlicensed, 2023. |
| `vinnietran/dklive-scraper` | 0 | none | 2025-01-14 | **rejected by policy** | Name says it; scraping live DK is the banned path. |
| `banant20/bet-odds-aggregator` | 0 | none | 2024-06-19 | **rejected by policy** | Aggregator of scraped sportsbook odds. |
| `sjhouston23/oddswrap` | 1 | none | 2026-06-03 | not needed | Wraps *licensed* odds APIs (the permissible kind) — but 1★, unlicensed, and GSE already has an odds-ingestion path; revisit only if the provider list changes. |
| `ANickFlower/nba-props-app` | 0 | none | 2026-04-27 | not needed | Uses The Odds API (permissible), but it is a 0★ CLI; the licensed-provider path is ours to build. |

### 4.4 Data foundations (4)

| Repo | ★ | Licence | Last push | Verdict | Why |
|---|---|---|---|---|---|
| `nflverse/nflverse-data` | 391 | CC-BY-4.0 | 2026-09-01 | **already in use** | CC-BY-4.0 play-by-play/schedules/rosters; the repo already has `guard:nflverse-currency` (`scripts/check-nflverse-currency.ts`). Keep. |
| `sportsdataverse/sportsdataverse-py` | 117 | MIT | 2026-09-12 | hold — MLB/CFB expansion | MIT, active; unified access across sports datasets. Only pays off if a Python lane or a new sport starts. |
| `jldbc/pybaseball` | 1723 | MIT | 2026-01-04 | hold — MLB expansion | MIT, 1.7k★, mature baseball ingestion. Nothing to do with NFL today. |
| `basketballrelativity/py_ball` | 123 | MIT | 2024-11-29 | hold — NBA expansion | MIT but last pushed 2024-11; NBA access utilities. |

### 4.5 ML / numeric stack (15)

This is a **Python modelling lane**, not a product dependency list. Nothing here
ships in the Next runtime, and the honest position today is that no model lane
exists yet — the prediction surfaces run frozen models with a freeze guard.
Ordered shortlist for when one does. Note that `google/or-tools` from the same
block *was* adopted, because it answers a verification question rather than a
modelling one.

| Repo | ★ | Licence | Last push | Verdict | Why |
|---|---|---|---|---|---|
| `scikit-learn/scikit-learn` | 67234 | BSD-3-Clause | 2026-09-12 | lane shortlist | Baseline modelling; the first thing a Python modelling lane should reach for. |
| `pandas-dev/pandas` | 49722 | BSD-3-Clause | 2026-09-12 | lane shortlist | Tabular workhorse; already the implicit assumption of every notebook-style pipeline. |
| `pola-rs/polars` | 39713 | MIT | 2026-09-12 | lane shortlist | Rust-backed frames — the pick over pandas when the historical backtests grow. |
| `scipy/scipy` | 15007 | BSD-3-Clause | 2026-09-12 | lane shortlist | Optimisation/stats primitives. |
| `statsmodels/statsmodels` | 11623 | BSD-3-Clause | 2026-09-09 | lane shortlist | Classical inference/regression baselines; useful for publishing model methodology honestly. |
| `microsoft/LightGBM` | 18761 | MIT | 2026-09-12 | lane shortlist | Gradient boosting that is the sports-projection default. |
| `dmlc/xgboost` | 28755 | Apache-2.0 | 2026-09-11 | lane shortlist | Same class as LightGBM; pick one, do not carry both. |
| `catboost/catboost` | 9099 | Apache-2.0 | 2026-09-12 | lane shortlist | Third GBM; only if categorical-heavy features dominate. |
| `optuna/optuna` | 14784 | MIT | 2026-09-11 | lane shortlist | Hyper-parameter search with proper trial recording — matches the model-freeze discipline. |
| `facebook/prophet` | 20398 | MIT | 2026-08-27 | defer | Seasonality decompositions; our features are schedule/market-driven, so low expected value. |
| `Pyomo/pyomo` | 2523 | NOASSERTION | 2026-09-02 | defer | Algebraic modelling layer; CP-SAT (OR-Tools) already won this job for us. |
| `huggingface/transformers` | 165195 | Apache-2.0 | 2026-09-12 | defer | Sequence models; no NLP/sequence use case in the product today. |
| `pytorch/pytorch` | 102955 | NOASSERTION | 2026-09-12 | defer | DL runtime; would need a GPU lane and a model-freeze story first. |
| `ray-project/ray` | 43785 | Apache-2.0 | 2026-09-12 | defer | Distributed compute — an order of magnitude above current data volume. |
| `dask/dask` | 13915 | BSD-3-Clause | 2026-08-24 | defer | Distributed pandas; same verdict. |

### 4.6 Data and ML platform discipline (10)

These are the highest-leverage group in the whole paste, because GSE's public
claim is honesty and these are how honesty is enforced mechanically. None of them
is adopted as software this cycle; each is a concept to land in TS guardrails, in
priority order.

| Repo | ★ | Licence | Last push | Verdict | Why |
|---|---|---|---|---|---|
| `unionai-oss/pandera` | 4452 | MIT | 2026-09-09 | **concept adopt** | MIT dataframe schema/type checks — the data-contract idea belongs at our ingest boundary (TS side today, pandera if a Python lane opens). |
| `great-expectations/great_expectations` | 11785 | Apache-2.0 | 2026-09-11 | concept adopt | Apache-2.0; the 'expectations as tests' framing is what our guard scripts should formalise. |
| `NannyML/nannyml` | 2152 | Apache-2.0 | 2025-07-12 | **concept adopt** | Post-deploy performance estimation when labels settle late — exactly the shape of pick settlement lag. Its confidence-based estimation is the honest alternative to pretending we know accuracy before results are in. |
| `mlflow/mlflow` | 27923 | Apache-2.0 | 2026-09-12 | concept adopt | Experiment tracking + model registry; the discipline behind 'model frozen' is a registry with a version, not a promise. |
| `iterative/dvc` | 15868 | Apache-2.0 | 2026-09-07 | concept adopt | Dataset/code lineage for reproducible backtests; the minimum version is hashing the datasets a claim was computed from. |
| `dagster-io/dagster` | 16141 | Apache-2.0 | 2026-09-11 | concept borrow | Asset-based orchestration (lineage, retries, observability) described in a way that maps onto Vercel cron routes even if we never run Dagster. |
| `PrefectHQ/prefect` | 23826 | Apache-2.0 | 2026-09-12 | concept borrow | State/retry/observability patterns for our cron hardening. |
| `dbt-labs/dbt-core` | 13808 | Apache-2.0 | 2026-09-12 | concept borrow | Deterministic transform + test patterns for derived feature tables. |
| `kedro-org/kedro` | 10994 | NOASSERTION | 2026-09-11 | concept borrow | Pipeline modularity that mirrors our `packages/*` boundaries. |
| `evidentlyai/evidently` | 7911 | Apache-2.0 | 2026-09-11 | concept borrow | Drift/quality reports — the reporting layer on top of the same idea as NannyML. |

## 5. What "fits" actually bought: an oracle for the DFS optimizer

The one repo from the list that answers a question GSE was already answering
without proof. `apps/web/lib/fantasy/dfs-optimizer.ts` presents a "best" lineup
(cash = projection, GPP = ceiling, leverage = contrarian ceiling vs ownership,
with QB stacking, locks and excludes) built by randomised multi-start plus
hill-climb. Nothing checked whether "best" was true.

New, in this repo:

- `scripts/dfs/oracle.py` — CP-SAT (OR-Tools) model of the same problem,
  reproducing `objVal()` exactly and enforcing DK Classic slots, the 50k cap,
  distinctness, locks, excludes and the stack rule. Scale 1e6 on the objective.
- `apps/web/scripts/dfs-heuristic-probe.ts` — drives the *shipped* engine and
  reports what it returned, with an independent structural check (slot
  legality, cap, distinctness, stack) that does not trust the engine's metrics.
- `python scripts/dfs/oracle.py` → shipped slate, 6 cases;
  `python scripts/dfs/oracle.py --synthetic 12` → 12 generated slates, 78 cases.
  Exit code is non-zero when the engine is beaten or a structural rule is
  violated, so this is a falsifier, not a dashboard.

### Measured before the fix

| Suite | Cases | At optimum | Beaten by the oracle | Structural violations |
|---|---|---|---|---|
| Shipped slate | 6 | 2 | 4 (cash 120.0 vs 120.5; GPP 216 vs 218) | 0 |
| Synthetic (12 slates) | 78 | 55 | 23 (max gap 5.86%, leverage) | **12** — `stack: true` requested, engine returned an unstacked lineup |

The 12 structural violations were the serious find: `enforceStack()` gave up
quietly when the salary cap could not afford a stackable QB, and the result was
shipped with the toggle still on. The objective gaps were real but small
(0.4–1.8% on cash/GPP); the constraint violation was a truthfulness bug.

### The fix

`optimizeExact()` — branch-and-bound over the same model, seeded by the existing
heuristic and pruned with a fractional-knapsack relaxation of the remaining slots
(respecting distinctness and the cap). With `stack: true`, an unstacked seed is
not accepted as an incumbent at all, so the constraint is a constraint. The
heuristic is kept as the seed and as the fallback for slates too large to search.
`generateLineups()` (the N-unique / exposure path) calls the same routine with a
20k node budget per lineup, because its job is diversity, not single-lineup
proof.

### Measured after the fix

| Suite | Cases | At optimum | Beaten | Structural violations |
|---|---|---|---|---|
| Shipped slate | 6 | **6** | 0 | 0 |
| Synthetic (12 slates) | 78 | **78** | 0 | 0 |

Evidence is committed: `scripts/dfs/oracle-report.json` and
`scripts/dfs/oracle-report-synthetic.json`. The shipped-slate optima are pinned as
a test (`apps/web/lib/fantasy/dfs-optimizer-optimality.test.ts`), so a regression
in the search fails CI rather than quietly shipping.

### Honest limits of that claim

- The oracle's objective is scaled to integers (1e6), so its own optima carry a
  ~1e-6 lattice; the test allows 1e-3 on the two leverage cases for that reason.
- On the shipped slate the cash search reaches the optimum but exhausts its 400k
  node budget before *proving* it (GPP completes in ~73k–94k nodes, ~150–260 ms
  in Node). "Matches the independent optimum" and "proven optimal" are different
  sentences and only the first is currently true for cash.
- Only `optimizeOne` (the single best lineup) is oracle-checked. The N-unique
  exposure generator is bounded-budget and near-optimal; its multi-lineup
  *portfolio* objective is not what the oracle models.

## 6. Ranked shortlist (what to reach for next, if anything)

1. **pandera** and/or **great_expectations** — data contracts at the ingest
   boundary. GSE's failure mode is stale or malformed inputs reaching a factor,
   and there is no schema enforcement today.
2. **NannyML** — post-settlement performance estimation. The picks-settle-later
   problem is exactly its use case, and it is the only honest way to report
   accuracy between settlement windows.
3. **mlflow** — a registry entry per frozen model, so "model frozen" cites a
   version and an artefact hash instead of a promise.
4. **dvc** (or a hand-rolled hash manifest) — lineage for backtest datasets, so a
   published number can be recomputed from a named input.
5. **pybaseball / sportsdataverse-py** — only when MLB or CFB ingestion actually
   starts.
6. **scikit-learn / LightGBM (or XGBoost) / optuna / pandas-or-polars / scipy** —
   the modelling lane, if and when a model lane opens. Not before.

Ignore: everything scraped, everything 0-star and unlicensed, and the deep
learning / distributed stack (transformers, pytorch, ray, dask), which is an
order of magnitude above current data volume.

## 7. Open items

1. **Cash-mode proof** — either raise the node budget for offline runs or accept
   and document "matches optimum, unproven" (currently the latter).
2. **N-unique portfolio check** — extend the oracle to the multi-lineup objective
   (correlation/duplication constraints), which is where the
   `adam-jake-wiggins/nfl-dfs-pipeline` portfolio idea becomes testable.
3. **Live-slate path** — the oracle runs against the illustrative slate; the
   probe accepts any slate, so the first licensed live slate should be run
   through the oracle before its lineups are shown.
4. **Python lane hygiene** — if a Python lane is ever created, pin it: one venv,
   `scripts/dfs/requirements.txt`, and no imports of optimizers inside `apps/`
   route code.
