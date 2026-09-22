# 750-paper arXiv program → GSE improvement playbook

**Corpus:** `docs/research/2026-09-21/arxiv-deep/` (973 ledgers) + `arxiv-program/` trackers at `b83e12f1`  
**Program claim:** 750/750 valuable (741 ADAPT + 26 ADOPT in tracker; 25 ADOPT with full transfer notes extracted)  
**Model freeze still holds:** `MODEL_VERSION = v5.2.7` · no gate flips · no invented numbers  
**Companion board:** [`../../ops/CALIBRATION_STATUS.md`](../../ops/CALIBRATION_STATUS.md)

This is the **synthesis layer** over the paper ledgers: what the corpus is, how it improves GSE, and how to polish each transfer beyond the paper. Every technique below cites a ledger/arXiv id and a numeric acceptance gate where the ledger supplied one. Nothing here is a MODEL_VERSION bump — those still need L11 frozen-holdout scorecards.

---

## 0. What you actually have (inventory)

| Bucket | Count | Notes |
|---|---:|---|
| Ledger files in `arxiv-deep/` | 973 | 14-section template: method, math, results, GSE overlap, impl spec, gates |
| Tracker rows (`ledger-tracker-750`) | 767 | All ADAPT/ADOPT after replace-on-REJECT |
| Valuable target | 750 | Phase 1 364 + wave2 215 + wave3 171 + phase4 17 |
| **ADOPT (implement almost as-is)** | **25** | Highest transfer density |
| ADAPT (rework into GSE) | ~740 | Still valuable; many are “protocol + gate” not a drop-in |

### Lane map (normalized)

| Lane | n | Primary GSE surface |
|---|---:|---|
| tracking_ngs | 119 | NGS replacement, props features, film/telestration |
| team_ratings | 92 | rankingP / win prob / market-anchored display p |
| calibration_uncertainty | 65 | ECE/Brier gates, display p, intervals |
| experimental | 63 | mixed frontier (trajectory, BART, TDA) |
| win_spread_total | 62 | totals/margin models (Skellam/Dixon-Coles upgrades) |
| odds_market | 55 | marketFairProb, CLV, de-vig, steam |
| props_fantasy_dfs | 52 | **THE product** (LAST_PLAN D11/D3) |
| kelly_sizing | 37 | `edge-lab/kelly.ts`, slate allocator |
| ensembles | 36 | multi-model pool / shrinkage weights |
| abstention | 35 | withhold / no-bet / conviction gate |
| causal_injury | 33 | QB/OL impact, estimand protocol |
| nlp_llm | 26 | reporter wire, scouting text, LLM forecast scoring |
| data_api_infra | 19 | rate limits, text-to-SQL ops |
| weather | 12 | A5/A25 join, CRPS post-processing |
| bayesian_statespace | 11 | dynamic ratings, hierarchical props |

Full auto-extract: session `papers_by_lane.md` / `papers_index.json` (not committed).

---

## 1. How this improves the product (three levers)

GSE’s vision is **the most accurate and calibrated fantasy + prediction sports company**. The corpus maps onto exactly three product levers:

```text
                    ┌─────────────────────────────────────┐
                    │  750 ledgers (methods + gates)       │
                    └─────────────────────────────────────┘
                                      │
          ┌───────────────────────────┼───────────────────────────┐
          ▼                           ▼                           ▼
   A. CALIBRATE                 B. PRICE EDGE                C. BUILD PRIVATE
   honest p, intervals,         CLV/EV vs close,             DATA & PROPS
   ECE floors, display          Kelly, market de-vig,        tracking, injuries,
   probability                  steam / bias identity        weather, fantasy tools
          │                           │                           │
          ▼                           ▼                           ▼
   Live eligibility            Record / Method /            Players · DFS · Props
   + /cockpit/calibration      /performance lanes           + reporter wire
```

**A** is what “calibrated” means (gates cannot lie).  
**B** is what “accurate/predictable” is judged on (CLV/EV, not raw W%).  
**C** is what only GSE can own (D18 make-the-data-nobody-has + fantasy live-or-nothing).

---

## 2. ADOPT set — implement almost as-is (25)

These are the crown jewels. Each already has GSE impl + gate in its ledger.

| id | Theme | GSE win (1 line) | Polish beyond paper |
|---|---|---|---|
| **2609.06739** | Profit-bias identity | Exact hold + shading×lean + outcome-cov decomposition of book profit | Measure handle% vs bet% gap (paper bounds ≤5.2 pp, never measures); 1X2 extension |
| **2010.12508** | Beat market with “bad” model | Train to **decorrelate from market**, not maximize accuracy | End-to-end profit objective over correlation surrogate |
| **2107.08827** | Optimal betting practice | Fractional Kelly + drawdown constraints (fills named gap #1) | Adaptive ω from rolling KL-advantage; wire to CLV deflator |
| **2303.06021** | ML betting / model selection | Select on **classwise ECE** not accuracy (accuracy+Kelly collapsed −35% ROI in paper) | Two-stage: ECE-within-1pp then max accuracy |
| **2306.01740** | Odds-feed correction study | 4-SD stale-quote filter + random-bet p_bs on every published ROI | Prospective filter before any backtest write |
| **2010.00781** | Real-time probabilistic eval | Calibration **surfaces** + pointwise Brier skill on live WP curves | Nested-model Clark–McCracken for vN vs vN+1 |
| **2406.16171** | WP estimation difficulty | Game-clustered bootstrap; quantifies ESS collapse (56%/31%/84%) | Drive-nested two-level bootstrap |
| **2304.09918** | Hybrid simulation | Per-predictor lookback ablation + late-season incentive modifiers | Fit rest/tank discount as parameter on meaningless games |
| **1906.01760** | Continuous-time within-play | Between-play EP/WP extension for tracking valuation | Dropback decision heads + joint catch/YAC |
| **2608.02081** | Isotonic Bradley–Terry | **Learn the link** rating→p instead of fixed logistic | Home-field-conditional isotonic link |
| **2604.09143** | Score-driven ratings (GAS) | Dynamic K / information-weighted Elo updates | Fisher-scaled K; Skellam-Elo for totals |
| **1301.2954** | Ranking lasso | Shrink teams into **tiers** (edge-sheet graphics + within-tier bets) | Walk-forward λ vs BIC |
| **2608.15688** | Training-free long-term MOT | Broadcast/All-22 tracks without NGS license | Jersey-number OCR prior on re-ID |
| **2607.18009** | Conway–Maxwell Poisson scores | Overdispersed score model for totals (beats Poisson-Maher class) | Dixon-Coles-style team dependence |
| **2601.03099** | Time-aware synthetic control | QB injury counterfactuals (gap #9) | Regime-switching post-shock trend |
| **2602.23233** | Counterfactual combine / TMLE | Direct-standardized kicker & unit rates | Continuous EPA/attempt extension + positivity diagnostics |
| **2505.11841** | Estimand-first causal protocol | ATT/ATE chosen *before* estimate (QB-out EPA) | Interference-aware estimands inside games |
| **2411.15075** | DID / shift-ban blueprint | Rule-change evaluation (kickoff 2024) with placebos | Staggered DID (Callaway–Sant’Anna class) |
| **1906.03339** | next-gen-scraPy | Open CPAE / tracking-from-images | Context-conditioned CPAE GAM |
| **2102.07081** | Max-min forecast aggregation | Principled log-pool vs linear-pool + OGD weights | Contextual ensemble weights |
| **2211.04459** | flexBART | Bayesian trees with UQ vs XGBoost baseline | Posterior co-clustering as similarity features |
| **2405.17680** | UniTraj | Joint multi-agent trajectory generation | Variable agent count / Perceiver bottleneck |
| **2510.04516** | Adaptive API rate limiting | Fewer 429s on The Odds API / PredExon | Quota-aware buckets (20K credits/month prior) |
| **2508.17157** | SportsQL | NL→SQL over picks/nflverse for founder ops | Two-stage validated subquery compose |
| **2408.11847** | Prompto | Multi-model research harness (this program’s tooling) | Cost/token tracking per experiment |

---

## 3. Calibration & uncertainty → display p + gates

**Already live/in-repo:** isotonic/PAV, Platt, temperature, Venn-Abers, CQR/conformal, grouping loss, Mondrian, Clopper–Pearson, bias-corrected ECE gate, market-anchored shrink **w=0.10**, Murphy REL/RES/UNC.

**Corpus upgrades (ranked impact × risk):**

| Rank | Ledger | Method | Touch | Acceptance | Polish |
|---:|---|---|---|---|---|
| 1 | 1074 ENIR | Near-isotonic ensemble (BIC→OOF weights) | `calibration-apply.ts` | ≥15% ECE vs IsoRegC/temp; zero AUC loss | Trailing windows only |
| 2 | 0738 SplineCalib | Cubic-spline logistic + compact-logit | `calibration-apply.ts` | ≥1% log-loss vs Platt/iso on spread AND total | Mondrian by fav/dog, total band |
| 3 | 0762 Per-cell extremizing | θ(sport×horizon×size) slope | eligibility / display p | ≥0.003 LL and ≥10% ECE vs global Platt | Book-disagreement covariate |
| 4 | 1480 Local TS | Context-conditional T(c) | `calibration-apply.ts` | ECE/SCE/ACE ↓ FDR 0.05 | Fallback if T(c)≈const |
| 5 | 0724 Calibration trees | Regional Platt | `calibration-apply.ts` | Win ≥1 regime, no global harm | Temp-at-leaves |
| 6 | 0743 CRC | Edge-threshold with **loss-rate ≤ α** | conviction / withhold | Loss-rate ≤ α−0.01 at ≥60% volume | Mondrian CRC |
| 7 | 1084 IDR | Calibrated margin/total CDFs | prediction-engine post | ≥5% CRPS vs raw | GPD tails |
| 8 | 0469 CORP / R* | MCB/DSC/UNC split | `skill-metrics.ts` | MCB ≥ 0.15×UNC → recalibratable | Week block-resample |

**Honest gaps the corpus exposes**
1. All live calibrators are **global** — cannot say “overconfident on MLB run lines, honest on NCAAF ML.”
2. No sharpness-conditional-on-coverage objective (intervals wider than needed).
3. No finite-sample **loss-rate** contract on the posted slate (CRC).
4. Binary-only recalibration (no margin/total distributions).
5. Diagnostics still mix calibration with discrimination (need CORP split).
6. No online recalibration under drift.

**Do next (pre-registered, frozen holdout):**
- **E1** Per-cell extremizing on live eligibility (0762).
- **E2** CRC edge-threshold α=0.45 on posted picks (0743).
- **E3** ENIR vs IsoRegC on book-path confidence (1074) — if ENIR cannot fix the inverted confidence curve, the score is non-monotone and no post-hoc map can save it.

---

## 4. Market / CLV / Kelly → the proven-edge claim

**Already live:** `clvLock*`/`clvClose*`/`clvValue`/`clvVerdict`, Shin de-vig → `marketFairProb`, shrinkage, fractional Kelly κ≈0.25, CLV deflator, Kalshi via PredExon, multi-book snapshots.

**Live measurement (2026-09-21 SQL + research):** BEAT_CLOSE **23.2%** (Wilson ~0.212–0.253) vs bar **52.4%**; MATCHED-excluded framing **40.8%**. CLV shortfall is **model skill**, not just archive holes.

| Rank | Ledger | Method | Touch | Acceptance | Polish |
|---:|---|---|---|---|---|
| 1 | 2604.17194 | OO-EPC de-vig + FL-GLM favorite-longshot bias | `shin-devig.ts` | OO-EPC ≤ Shin LL on ≥3/5 books; β CI ≠ 1 | Per-book β; `β_draw` |
| 2 | 2107.08827 + 2109.10814 + 1603.06183 | Tuned fractional Kelly, variance-budget α, RCK drawdown | `edge-lab/kelly.ts` | Ruin≤1%; median Wf ≥ flat & ≥ ω=0.5 | Per-slate α_t; show α on card |
| 3 | 2306.01740 | Odds-row QA + p_bs | `line-archive.ts` | Flagged ΔROI <±0.5 pp, p_bs<0.01 | Filter **before** backtest |
| 4 | 2509.14645 + 2209.08778 | Late-move path + informed-flow β | clv-capture features | Late-move coeff p<0.01 adds to CLV | Fade public steam |
| 5 | 2609.06739 | Profit-bias identity | book-bias audit | ≥90% games decomposable | handle% experiment |
| 6 | 2303.06021 | Select on classwise ECE | bake-offs | ECE ≥3 pp better AND ROI win | Hybrid selection |
| 7 | 2607.14430 | TTE-conditional market p | Kalshi ingest | γ̂>1.15 near expiry | Liquidity filter |
| 8 | 0803.1364 | Multi-pick Kelly + effective breadth | slate allocator | Beats per-pick Kelly on growth/DD | **Correlation haircut** (paper assumes indep.) |

**Honest gaps**
- `clvPositive`/`clvPoints`/`clvCents`/`clvComputedAt` empty on decided rows (grader bug — fix, don’t backfill by hand).
- 21-day archive hole 2026-08-23–09-12; freshness alarm **unwired**.
- MATCHED_CLOSE policy open (include → 23.2%, exclude → 40.8%).
- No sharp-weighted consensus (soft books equal-weight).
- κ=0.25 is folklore — not variance-budgeted.

**Do next**
1. **CLV integrity pack:** wire archive freshness; census CLV columns; publish both MATCHED framings + Wilson CIs; owner picks the bar.
2. **De-vig + steam A/B** (OO-EPC vs Shin vs FL-GLM + late-path features).
3. **Sizing lockbox:** κ=0.25 vs α_t vs RCK on 1000 bootstrap slates; ship only if ruin≤1% and median ≥ flat.

---

## 5. Ratings, props, fantasy, tracking → THE product

### 5.1 Team ratings / win-spread-total
| Ledger | Method | Use |
|---|---|---|
| 2608.02081 | Isotonic BT link | Replace fixed logistic rating→p |
| 2604.09143 | Score-driven / Skellam-Elo | Dynamic K for totals |
| 1301.2954 | Ranking lasso | Tier graphics + within-tier selection |
| 2607.18009 | CMP score model | Overdispersed totals vs Skellam |
| 2304.09918 | Incentive modifiers | Weeks 17–18 meaningless games |
| 2406.16171 | Clustered uncertainty | Honest CIs on WP (ESS collapse) |

Maps to: `rankingP`, `market + 0.10·(model−market)` display p, Skellam SPREAD path, Dixon-Coles soccer (still withhold ML).

### 5.2 Props & fantasy (D11 / D3)
Corpus size: **52** props/DFS/fantasy ledgers. Priority transfers:
- Player projection → posted-line scoring (P1 power certificate already specced).
- Usage features already CANDIDATE in-repo: A14 FTN, A22 RZ→TD, A23 snap slope, A25 weather yards — **blocked on props join key** (C-358/C-381/C-383).
- DFS: MILP lineups (0010 class), ownership leverage, stacking priors — only after live salaries/ownership path exists (D3: live data or it does not exist).
- Injury causal: TASC (2601.03099) + estimand protocol (2505.11841) for QB-out ATT on EPA — feeds A19 WR1-out redistribution (currently underpowered n=78).

### 5.3 Tracking / NGS replacement
| Ledger | Method | Use |
|---|---|---|
| 1906.03339 | next-gen-scraPy | Open tracking/CPAE |
| 2608.15688 | Training-free MOT | Broadcast tracks without license |
| 2607.18009 / 1906.01760 | Continuous-time value | Within-play EP extension |
| STRAIN (prior) | Pressure | Already inventoried |

Aligns with `docs/research/2026-09-18-ngs-replacement-spec.md` + C-395 nflverse loaders (`ftn_charting`, `nextgen_stats`, `pfr_advstats`).

### 5.4 Abstention / pick selection (35 ledgers)
CRC (0743) + Deep Gamblers portfolio abstention (1907.00208) replace ad-hoc PASS vetoes with a **loss-rate / utility** contract. Withhold-only stays exempt from MODEL_VERSION bump (L11).

### 5.5 Weather (12)
A5 (dead) / A25 (CANDIDATE) already measure wind effects. Corpus adds **CRPS-trained ensemble post-processing** (AIFS-CRPS 2412.15832, NN post-process 1805.09091) — polish: join kickoff-hour wind to props feature builder (C-414) and recalibrate under weather strata.

### 5.6 NLP / reporter wire (26)
Feeds C-415/416/417 (roster → stored wire → beat-report corroboration). LLM forecast scoring with proper rules (2608.28482) is the honesty check if any LLM ensemble enters the stack.

---

## 6. Site / product polish (how this shows up for users)

| Surface | What changes | Guard |
|---|---|---|
| Display p on pick cards | Market-anchored shrink (already proposed v5.2.8) + **per-cell extremizing** | L11 scorecard; show raw model p beside shrunk (D5 dual-report) |
| `/performance` / Record | CLV both framings + n + exclusions (L10); Wilson vs 52.4% (D22) | Never claim PROVEN until bar holds |
| `/cockpit/calibration` | CORP MCB/DSC/UNC + reliability by regime | Estimator corrections only under owner amendment |
| Method / Factors | Publish DEAD/CANDIDATE table (`docs/factors/INDEX.md`) + CRC loss-rate contract | Kill lines stay public |
| Props board | Real HB output + A14/A22/A23/A25 when join ships | Honest empty state |
| Fantasy tools | Live path or deleted (D3) | No sample data |
| Sizing (PRO) | Report fractional α and drawdown constraint on card | Never full Kelly |

---

## 7. Polish path — how to go beyond the papers

The ledgers already include “Improvement experiment” sections. Aggregated polish themes:

1. **Contextual everything.** Papers fit global maps; GSE should condition on sport × market × horizon × book-disagreement × weather (0762, 1480, 0724, 2607.14430).
2. **Correlation-aware sizing.** Kelly papers assume independence — add effective breadth + slate correlation haircut (0803.1364 polish).
3. **Handle-weighted truth.** Bet% ≠ handle%; measure the gap (2609.06739 polish) before any “public money” claim.
4. **Online drift loops.** Batch recalibration → Robbins–Monro / meta-LMS coverage feedback (0749, 0451).
5. **Nested model comparison.** Live WP version A/B needs Clark–McCracken (2010.00781 polish) — stop comparing nested engines with naive tests.
6. **Two-objective selection.** ECE-within-band then accuracy (2303.06021 polish) — matches GSE dual-objective selective already in engine.
7. **Distributional outputs.** Binary p is not enough for props/totals — IDR/GPD (1084, 1082) for calibrated CDFs users can read.
8. **License-clean private data.** Tracking from images (1906.03339) + free nflverse + PredExon free plane — never paid ticks (D15).

---

## 8. Execution order (no regression)

```text
P0  Trust & measurement (1–2 days, no model change)
    ├─ Fix clvPositive grader from clvValue (test)
    ├─ Wire line-archive freshness alarm (C-393 class)
    ├─ Export real verifier/picks-h1.json
    └─ Publish CLV both framings + L10 denominators

P1  Calibration lock (this is "calibrated")
    ├─ E1 per-cell extremizing on eligibility
    ├─ E3 ENIR vs IsoRegC (decides if book-confidence is salvageable)
    ├─ Dual-report raw vs shrunk vs market Brier/ECE
    └─ L11 scorecard → only then v5.2.8 display-p PR

P2  Market edge (this is "accurate/predictable")
    ├─ OO-EPC / FL-GLM de-vig A/B
    ├─ Late-move path features
    ├─ Sizing lockbox (κ vs α_t vs RCK)
    └─ Odds-row QA + p_bs on any published ROI

P3  Props + private data (this is the product)
    ├─ C-358 prop reader + settlement rules
    ├─ C-381 power certificate then P1 scorecard
    ├─ C-383 real props board
    ├─ TASC/estimand QB-out → feed A19
    └─ C-414 weather join + A25 in prop features

P4  Ratings & ensembles polish
    ├─ Isotonic BT link + score-driven Elo
    ├─ CMP totals vs Skellam
    ├─ Max-min aggregation + OGD weights
    └─ Ranking-lasso tiers for content

P5  Site honesty polish
    ├─ CORP diagnostics in /cockpit/calibration
    ├─ CRC loss-rate contract on Method page
    ├─ Factor table public (C-385)
    └─ Fantasy tools: live or delete (C-412/C-391)
```

**Hard rules unchanged:** no gate flips · no floor lowering · no MODEL_VERSION without L11 · no fabricated product data · withhold-only stays free of bump · never claim PROVEN until book-priced CLV/Wilson clears 52.4% with n and exclusions.

---

## 9. How to use the remaining ~740 ADAPT ledgers

Do **not** boil the ocean. Workflow:

1. Pick a **lane row** in §3–§5 that matches the active ledger task (C-380, Phase 3 props, etc.).
2. Open that lane’s top ledgers (ADOPT first, then ADAPT with numeric gates).
3. Write a `docs/factors/P*.yaml` or `A*.yaml` pre-registration with **kill_line before run**.
4. Run on frozen holdout / PICKS-H1 only. Status CANDIDATE or DEAD — never leave UNTESTED.
5. If it survives, open a `model-version` / `frozen-path` PR per D16/D20. Founder merges.

Search tips: `arxiv-deep/*.md` is greppable by `## 13. Acceptance` / `GSE implementation`. Tracker lanes in `arxiv-program/state/ledger-tracker-750.jsonl`.

---

## 10. Source index

| Path | Role |
|---|---|
| `arxiv-program/PROGRAM-STATUS.md` | Program SoT, 750/750 claim, how to continue |
| `arxiv-program/phase2/PHASE2-SUMMARY.md` | Wave accounting, lane table |
| `arxiv-program/state/ledger-tracker-750.jsonl` | 767 valuable rows |
| `arxiv-program/state/existing-research-map.md` | Dedup vs prior GSE research |
| `arxiv-deep/NNNN-*.md` | Full 14-section ledgers |
| `arxiv-program/fulltext-cache.tar.gz` | 1,112 full texts for re-verification |
| `docs/ops/CALIBRATION_STATUS.md` | Live calibration board |
| `docs/factors/INDEX.md` | Pre-registered factor scoreboard |
| `docs/ops/LAST_PLAN_2026-09-15.md` | Current execution plan |

---

*Generated 2026-09-21 from tracker + 17 calibration ledgers + 30 market ledgers + 25 ADOPT transfer notes + lane census. Spot-check any number against its ledger before shipping.*
