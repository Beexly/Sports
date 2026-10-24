# Wave 4 — Open-Source DFS / Odds / Optimizer Repo Dossier (2026-09-12)

**Raw data:** `waves/wave4-repos-oss-optimizers-2026-09-12.json` (verbatim staged profiles
+ notes across 6 batches, 91 KB)
**Staging origin:** `C:/Users/Garrett/w4-stage/repos-batch-{a..f}/profiles.json` + `notes.md`
**Scope:** 22 owner-supplied GitHub repos (25 profiles written; 3 batches profiled a repo twice).
**Method:** READ-ONLY. GitHub REST API (`api.github.com/repos/...`) plus page extraction per repo.
No repo was modified or forked into a product tree; clone scratch dirs lived only under `w4-stage/`.
Vendor self-description is treated as an **unverified marketing claim** until the code was read.

---

## 1. Inventory

Stars are as-read at sweep time. Licenses are the GitHub-recognized field where present,
otherwise the profiler's read of the repo tree.

| Repo | Stars | License | Batch | Verdict |
|---|---|---|---|---|
| DimaKudosh/pydfs-lineup-optimizer | 447 | MIT | c | Mature, pip-installable multi-site/sport optimizer; constraint + stacking framework |
| KengoA/fantasy-basketball | 269 | MIT | c | NBA capstone: scrape + NN/boosting projection + genetic lineup optimisation |
| uberfastman/yfpy | 264 | GPL-3.0 | c | Yahoo Fantasy public-API wrapper (OAuth2). **GPL-3.0 — viral, do not copy** |
| jaebradley/draftkings_client | 154 | MIT | d | DK API client; broadest adoption of any repo here |
| n-roth12/DFSLineupOptimizer | 12 | MIT | e | NFL contest lineup generator |
| yzRobo/draftkings_api_explorer | 10 | MIT | d | DK market explorer GUI (wins, awards, props). Read-only market data path |
| abudnick8/prop-edge ("Clubhouse IQ") | 5 | package.json says MIT, **no LICENSE file** | a | Most productized; rubric grading, not statistics. Prediction-market scope **reverted** |
| emilyk12345/linear-optimizer | ≤5 | MIT | c | Small ILP/MILP optimizer; DK salary CSV + mocked projections |
| howrealizdat/dfs-lineup-optimizer | ≤5 | NOT CONFIRMED | d | OR-Tools constraint optimiser + LLM "reasoning" layer |
| t-pegors/wnba-fantasy-mlops | ≤5 | none declared | e | WNBA XGBoost + PuLP + MLflow/DVC/S3. Real MLOps shape |
| Vijax0/dk-lineup-optimizer | ≤5 | MIT | e | NBA DK optimizer |
| atlantahouseplants/MLBDFSLineupOptimizer | ≤5 | none declared | e | MLB FanDuel ILP + BallparkPal ingestion |
| sjhouston23/oddswrap | 1 | NOT CONFIRMED | d | Unified odds SDK; "no API keys" claim **unverified** |
| rjrice1990/nfl-single-game-optimizer | ≤5 | no LICENSE file | f | NFL **Showdown** optimizer with an ESPN + nflverse projection engine |
| BenBrostoff/draftfast | — | no LICENSE file (classifier claims OSI) | b, f | Most mature Classic optimizer; rich constraint + exposure framework |
| nukesim/nuke-dfs-hub | 0 | none declared | a | Streamlit DFS suite; **the calibration loop** lives here |
| keatingryan2024-coder/TD-Board | — | none declared | b | Anytime-TD model: 4-factor score → calibrated logistic; weekly Actions automation |
| wbp318/cfb_2026 | 0 | none declared | a | FPI-vs-DK outlier finder, 42 pytest, pre-kickoff reports frozen as releases |
| adamkanouse/better-lineups-dfs | — | no LICENSE file | f | Stale fork of a generic knapsack optimizer |
| agad495/DKscraPy | — | no LICENSE file | f | DK Sportsbook odds scraper. No DFS logic |
| personal-coding/Live-Sports-Arbitrage-Bet-Finder | — | none | b | Arbitrage bot, **abandoned since 2023**; likely direct sportsbook scraping (ToS risk) |

---

## 2. Copy boundary (license table)

**8 of 22** repos carry a GitHub-recognized license; **14 of 22** do not (no LICENSE file,
unconfirmed, or a `package.json` claim with no LICENSE file behind it).

| Usable verbatim? | Repos |
|---|---|
| MIT — usable with attribution | pydfs-lineup-optimizer, fantasy-basketball, draftkings_client, DFSLineupOptimizer, draftkings_api_explorer, linear-optimizer, dk-lineup-optimizer |
| **GPL-3.0 — viral; do NOT copy into GSE** | yfpy |
| Claimed-but-absent — treat as all-rights-reserved | prop-edge, draftfast |
| No license / unconfirmed — **idea-only, never code** | nuke-dfs-hub, cfb_2026, TD-Board, showdown optimizer, better-lineups-dfs, DKscraPy, wnba-mlops, MLBDFSLineupOptimizer, howrealizdat, oddswrap, live-sports-arb |

Nothing in this dossier was copied into the product. Where a mechanic was adopted
(calibration loop, stack exposure) it was **reimplemented in GSE's own code** — see §5.

---

## 3. Consensus findings (≥2 sources agreeing)

1. **Nobody ships an exact optimizer for NFL Classic.** 7 of 22 use an off-the-shelf
   solver (OR-Tools, PuLP, ILP, knapsack) or a genetic algorithm; the rest use Monte Carlo
   plus greedy/role-constrained sampling. No profiled repo implements exact DP with k-best
   enumeration and late-swap on a DK Classic roster. GSE does. **This is real differentiation,
   not marketing.**
2. **Every repo projects; almost none grades its own projections.** Only `nuke-dfs-hub`
   fits a bias/spread correction (`nuke_calibration.py`) — and it is deliberately
   holdout-free. `cfb_2026` backtests. The other 20 simulate off ungraded projections.
   *(2 sources: nuke notes, cfb_2026 notes — and it is the negative space of all 22.)*
3. **Free-data pivots are the norm, not the exception.** `prop-edge` replaced the paid
   Odds API with a free props cache (Linemate); `cfb_2026` runs on ESPN FPI + ESPN odds with
   **no API keys at all**; the Showdown optimizer runs on ESPN + **nflverse**. Three
   independent repos converge on *nflverse + a free ESPN-sourced line* as the no-cost spine.
   **This directly informs `handoff/ODDS_API_TIER_DECISION.md`.**
4. **Honesty discipline is rare and identifiable.** Exactly one repo leads with an
   unproven result: `cfb_2026` — n=51, flat ROI **−2.1%**, 95% CI [−40%, +41%], FPI RMSE
   16.41 vs DK 16.68 ("within noise"), inconclusive labels throughout, and pre-kickoff
   reports frozen as GitHub releases so they cannot be quietly edited. The other 21 either
   claim or stay silent. **The tamper-evident release discipline is worth more than any model here.**
5. **The single-game/Showdown format is covered by competitors and absent at GSE.**
   `nfl-single-game-optimizer` (NFL Showdown, FanDuel) and `DKscraPy`'s sport coverage show
   the format is expected. GSE's optimizer is Classic-only. *(2 sources: batch-f profiles,
   plus nuke-dfs-hub's DK+FD showdown module.)*
6. **Portfolio-level exposure analytics are treated as table stakes.** `nuke-dfs-hub`
   (`nuke_combos.py`: QB-anchored pair %, stacks, bring-backs), `draftfast` (exposure
   control), `howrealizdat` (portfolio/exposure management). GSE generated portfolios and
   reported no structure. *(3 sources.)*

---

## 4. Contradictions and marketing-vs-reality corrections

| Claim | Reality found | Source |
|---|---|---|
| prop-edge: "Kalshi/Polymarket/DK scanner" | scanning **reverted 2026-03-22**; actual scope = fantasy forecasts + props | batch-a notes |
| prop-edge: license MIT | `package.json` says MIT, **no LICENSE file** → all-rights-reserved in practice | batch-a notes |
| oddswrap: "no middleman, no API keys" | unverified; profiler could not read the source (404 on extraction path) | batch-d notes |
| howrealizdat: "Claude reasoning layer explains and rates" | LLM commentary over an OR-Tools solve — the *optimiser* is the substance, the narration is not an edge | batch-d notes |
| live-sports-arb: a product | **abandoned since Nov 2023**; likely direct sportsbook scraping (ToS/legal risk) | batch-b notes |
| nuke-dfs-hub: a DFS "hub" with an optimizer | **no optimizer library present** — MC + greedy sampling | batch-a notes |

---

## 5. GSE action reads

**ADOPTED THIS CYCLE (built, tested, pushed):**

1. **Projection calibration loop** → `apps/web/lib/fantasy/proj-calibration.ts`.
   Position-level mean-bias ratio + spread multiplier from `p90(|residual|) / z90`,
   clipped [0.75, 2.50], pivot-centred. GSE improvements over the source mechanic:
   an explicit `MIN_SAMPLE` floor (nothing is corrected on a thin sample), a **train/holdout
   split with separately labelled in-sample and out-of-sample MAE**, and a note that says
   the correction *did not generalise* when the holdout fails. nuke has none of these.
2. **Portfolio stack-exposure analytics** → `apps/web/lib/fantasy/stack-exposure.ts` +
   `components/fantasy/stack-exposure-panel.tsx`, mounted in the tournament lab. QB stack
   rate, bring-back rate, max same-game concentration, per-player exposure — every rate
   carrying its denominator, and `null` (rendered as an em-dash) rather than `0%` when the
   denominator is empty.
3. **Anytime-TD board** → `apps/web/lib/fantasy/td-model.ts` + `/fantasy/touchdowns`.
   Reproduces TD-Board's published 4-factor composite and stated logistic. **Their 55%
   top-12 backtest is their result on their data and is NOT claimed anywhere in GSE.**
   Unlicensed market ⇒ no edge is printed; missing inputs are counted and renormalised,
   never backfilled.

**QUEUED (register rows, this wave):**

4. **Showdown / single-game format** — GSE Classic-only; competitors ship it.
   Disposition **BUILD** (optimizer + CPTN multiplier handling).
5. **Release-frozen pre-lock reports** (cfb_2026 discipline) — freeze the pre-lock report as
   an immutable artifact so it cannot be edited after kickoff. Disposition **BUILD**.
6. **Explicit-inconclusive disclosure** in the ledger/backtest surfaces — report the CI and
   say "inconclusive" when the interval straddles zero, as cfb_2026 does with n=51.
   Disposition **BUILD**.
7. **Free-data spine confirmation** — three independent repos run on nflverse + ESPN-sourced
   lines with no paid key. Disposition **VERIFY** against the paid odds-tier decision in
   `handoff/ODDS_API_TIER_DECISION.md`: the paid tier buys *licensed depth and latency*, not
   the ability to compute an edge at all.
8. **CfB/other-sport coverage** — `cfb_2026` shows a single-file CLI with 42 tests and an
   honest ledger is enough to be credible in CFB. Disposition **VERIFY** (scope, not now).

**REJECT:**

9. Rubric-grade→sizing math (prop-edge's `confidence = 55+(score−5)×8`) — a heuristic
   dressed as a probability. No calibration behind it. **WONT-DO.**
10. LLM-narrated optimisation as an edge claim (howrealizdat) — narration over a solve is
    not signal. **WONT-DO.**
11. Third-party DFS/odds client libraries (yfpy GPL-3.0; draftkings_client; oddswrap) —
    licensing and ToS risk for zero durable advantage. **WONT-DO.**

---

## 6. Data-quality caveats (as fractions)

- **8/22** repos have a GitHub-recognized license; **14/22** do not → copy boundary is
  restrictive, and the default assumption for every uncited repo is all-rights-reserved.
- **7/22** repos have ≥5 stars; **15/22** have fewer, **5/22** with zero. Star count is a
  weak proxy for quality here — the two most useful mechanics (nuke calibration, cfb_2026
  discipline) sit on **0-star** repos.
- **4/22** repos were observed to carry a test suite (nuke, cfb_2026, pydfs, yfpy).
  The remaining 18 were **not established to have tests** — absence of evidence here is an
  extraction limit, not a finding about the vendor.
- **1/22** repos reports a negative or inconclusive result (cfb_2026). **21/22** report
  nothing either way; treat every performance-adjacent claim from them as unverified.
- **Batch-d's `gse_has` / `gse_lacks` fields are inverted** (they list exact DP, k-best,
  late-swap, correlation sim and NFL DK-Classic as GSE *lacks*; GSE ships all five).
  **Those fields are quarantined and were not used in this dossier.** All other batch-d
  fields (purpose, stack, stars, endpoint keywords) are usable.
- **3/25** profiles are duplicate coverage (draftfast in b+f; pydfs and the batch-c set
  re-profiled after the first child failed) → 25 profiles, **22 distinct repos**.
- Market-price claims in these repos ("edge vs market", "55% hit rate") are **unreproducible
  here**: none of them published the frozen dataset or a seed. They are vendor claims.

---

## 7. Re-extraction targets

1. **nuke-dfs-hub `nuke_calibration.py`** — read the actual clip, floor (DST −6), and the
   training-sample split boundary; our reimplementation is a reconstruction of the described
   mechanic, not a port. Confirm or correct `SPREAD_CLIP` and the pivot convention.
2. **nuke `nuke_combos.py`** — the exact definition of "QB-anchored pair %" so our stack rate
   is comparable rather than merely similar.
3. **TD-Board data pipeline** — the actual red-zone / goal-line field sources and the
   backtest split (2024 fit / 2025 grade) so a GSE replication is possible on our own data.
4. **cfb_2026 release mechanism** — how the pre-kickoff report is frozen (release artifact
   vs commit) so GSE can copy the *tamper-evidence property* rather than the tooling.
5. **prop-edge free props source** — which cache/endpoint replaced the Odds API, and its
   terms, before GSE treats it as a no-cost options.
6. **nfl-single-game-optimizer** — the CPTN multiplier handling and the FanDuel Showdown
   roster rules, as the reference for the GSE showdown build.