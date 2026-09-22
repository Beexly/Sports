# Google Deep Research — unrestricted brief for GSE

**How to use:** paste everything below the line into Google Deep Research as one prompt (or split “Mission / Mandate / Evidence / Repo map / Questions / Freedom” if the UI truncates). Do not water it down. Let it run long. Prefer depth over politeness.

---

You are running an **unrestricted deep-research engagement** for **Galaxy Sports Edge (GSE)** — a founder-led sports prediction and fantasy company whose entire product premise is that **it does not lie about its own performance**. Public website: https://www.galaxysportsedge.com · Code: https://github.com/Beexly/Sports (branch context: `hermes/last-plan-2026-09-15`, research corpus at commit `b83e12f110ec3b8441b0a4fd9c8de597566ca26d`).

Your job is **not** to summarize sports betting blogs. Your job is to find **what we are missing, forgetting, under-leveraging, and doing wrong** — and to propose **new equations, new machine-learning methods, new databases/data sources, and new theories** that are **tested and accurate**, including ideas from **outside sports** (econometrics, physics, biostatistics, reliability engineering, market microstructure, psychometrics, climate science, epidemiology, RL, information geometry, e-processes, etc.).

## 0. Mandate (do not self-limit)

- **20,000-foot then 20-inch:** first map the blind spots of the whole company/system; then drop into equations and tests.
- **Outside the box is the default.** If an idea is only “try XGBoost features,” delete it. Prefer: new likelihoods, new dependence structures, new evaluation metrics, new decision policies, new data we do not collect, new causal designs, new calibration objects, new stopping/portfolio theory.
- **Cite every claim** (paper, DOI, arXiv, official docs, or a path/line in the repo). **Trust no claim without a testable gate** (sample size, metric, threshold, holdout design).
- **Tests, tests, tests, tests.** Every proposal needs: data requirement, leakage risks, baseline, metric, statistical test (or decision rule), kill criterion, and what result would **falsify** the idea.
- **Do not invent numbers.** If you do not know GSE’s live metric, say `UNKNOWN — measure` and specify the SQL/command.
- **Do not** propose lowering honesty gates, fabricating product data, scraping forbidden sources, or claiming “proven edge” without CLV/Wilson evidence.
- **Volume is fine.** We want a research program, not a tweet. Organize with clear headers. Prefer 50 well-gated ideas over 5 vague ones.
- **Go look at the repo** (public GitHub). Read `docs/research/2026-09-21/arxiv-deep/` ledgers, `docs/research/2026-09-21/RESEARCH_TO_PRODUCT_PLAYBOOK.md`, `docs/research/2026-09-21/EXHAUSTIVE_IMPROVEMENT_CATALOG.md`, `docs/ops/CALIBRATION_STATUS.md`, `docs/ops/LAST_PLAN_2026-09-15.md`, `docs/factors/INDEX.md`, `packages/prediction-engine/`, `apps/web/lib/calibration/`, `packages/verifier/`. Cite paths.
- **Challenge our priors** listed in §5. If you think a frozen decision is wrong, say so with a test — do not flatter.

## 1. Who we are and what “win” means

- Products: free honest picks/record, fantasy tools (DFS, props, GSE Score), subscription proof/tools, affiliate-additive revenue.
- Accuracy target is **proven edge (CLV/EV vs closing market)**, not raw win rate. Historical settled record is mixed (~50% class); book-priced CLV beat-close has been **~23%** with wide framing ambiguity (include/exclude MATCHED_CLOSE → 23.2% vs 40.8% vs bar **52.4%**). NFL game sides/totals are **efficient** on public data (~190 factor specs, almost all dead). **NFL player props** are the only model family with published out-of-sample skill in-repo (Brier skill ~4.2% class on 12k+ predictions — verify in ledgers before citing).
- Model freeze: `MODEL_VERSION = v5.2.7` (Skellam ATS ranking). Display-probability proposal: market-anchored shrinkage `p = market + 0.10·(model − market)` (live sample matches market Brier/ECE; frozen-holdout keep-rule **not** passed on a real export yet). L11 law: **no model bump without a frozen-holdout scorecard** that beats the market-anchored baseline.
- Honesty laws (non-negotiable): no unearned public rates (every rate ships n + population + exclusions); no gate/floor flips; no invented product data; withhold-only changes exempt from model bump; kill-lines written **before** factor runs.

## 2. System snapshot (measured where possible; else UNKNOWN)

### 2.1 Stack
- Next.js monorepo `Beexly/Sports`: `apps/web`, `packages/prediction-engine`, `packages/ingestion-pipeline`, `packages/data-ingestion`, `packages/verifier`, `packages/db` (Prisma/Neon), workers, heavy guardrails (`scripts/guardrails/**`).
- Calibration stack **exists**: isotonic/PAV, CIR, Platt, temperature scaling, Venn-Abers, CQR/conformal (Mondrian), grouping-loss notes, bias-corrected ECE gate (C-290), Murphy REL/RES/UNC, marketFairProb (Shin de-vig class), fractional Kelly κ≈0.25, CLV deflator, online-beta / OCO research, calibration-map bakeoffs, tournament selector, robust-kelly, kelly-bridge — **much of it tests-only or flag-dead** (see catalog §4).
- Markets: multi-book odds archive (`odds_line_snapshots`), The Odds API plan, ESPN public as book, Kalshi **only via PredExon free plane** (never paid ticks; never scrape PrizePicks/Underdog/DK Network — ToS `forbidden`).
- Data: nflverse pbp/stats/rosters; FTN charting parquet on disk (A14 measured small positive); NGS taxonomy documented; `pfr_adv_stats` loader **clearance-denied** → 0 rows; news RSS/wire designed, **no Signal writers yet**.

### 2.2 Live numbers (2026-09-21 read-only SQL on settled WIN/LOSS)
| Slice | n | Win rate |
|---|---:|---:|
| All settled W/L | 3152 | 54.6% |
| v5.2.7 | 1834 | 56.9% |
| MLB / NCAAF / NFL | 2022 / 661 / 150 | 52.4% / 65.1% / 48.0% |
| ML / SPREAD / TOTAL | 1125 / 1051 / 976 | 67.0% / 47.1% / 48.5% |

Probability quality on rows with `marketFairProb` + `rankingP` (n=1270): market Brier **0.234** ECE **0.017**; raw `rankingP` Brier **0.267** ECE **0.094**; shrink w=0.10 **matches market**. Confidence bins are **not** a probability (80s band ~51% win). `clvPositive` flag dead (0 true vs 608 `clvValue>0`). CLV verdicts on 2114 rows: BEAT 578 / MATCHED 752 / LOST 784.

### 2.3 Research already ingested (do not re-summarize; critique and extend)
- **750 valuable arXiv ledgers** (741 ADAPT + 26 ADOPT class) under `docs/research/2026-09-21/arxiv-deep/` with methods, equations, numbers, GSE impl specs, acceptance gates.
- First-pass synthesis: `RESEARCH_TO_PRODUCT_PLAYBOOK.md` (calibration ENIR/Spline/per-cell/CRC/CORP; market OO-EPC/FL-GLM, Kelly/RCK, profit-bias, late-move path; props/ratings/tracking ADOPTs).
- Second-pass blind spots: `EXHAUSTIVE_IMPROVEMENT_CATALOG.md` (copulas, survival/Hawkes, bandits/abstention, LOB microstructure, LOPO leakage, ensemble failure modes, e-process Kelly ceilings, atomic equilibrium priors, D/S/I meta-metrics, AF/CRPS training, fixed-vs-mixed HFA bias).
- Factor scoreboard: `docs/factors/INDEX.md` — A1–A28 mostly DEAD; CANDIDATE A6,A7,A14,A19,A22,A23,A25 **none join to priced picks yet**.
- Prior internal theories of note: CEPT / “Baxley Causal E-Process Theory” (founder lane — treat as hypothesis, demand tests), MOVE-37 momentum kill, market-anchored shrinkage, no-bet adversary, proof graph / receipts.

## 3. What we might be missing (seed hypotheses — attack or extend)

Use these as **starting probes**, not a ceiling. Expand wildly.

1. **Dependence is under-modeled.** Same-game parlays, divisional slates, win×over joint outcomes, garbage-time score coupling. Copulas, Ising/ParlayMarket joints, nested conditional counts, Sarmanov COM-Poisson, Dixon-Coles vs new primitives.
2. **Calibration objects are too coarse.** Global maps hide regime failure (MLB run lines vs NCAAF ML). Minority-coverage collapse under marginal ECE green. Need: per-cell extremizing, local temperature, Mondrian/CRC loss-rate contracts, CORP MCB/DSC/UNC, distributional (CRPS/IDR/GPD) outputs for totals/props, joint reliability diagrams.
3. **Time-to-event is unused.** Injury/load → availability, drive outcomes as competing hazards, fumble hazards, time-to-line-move, time-to-steam. DeepHit / Cox / landmark models; survivorship bias in workload studies.
4. **Self-excitation / regime switching.** “Hot” scoring, turnover bursts (excite/inhibit matrix), safe-lead diffusion `Q(L,τ)=erf(L/√(4Dτ))`, change-point ensemble weights (Kairosis/BOCPD). Stress-test against memorylessness and anti-persistence results.
5. **Decision theory is thin.** Kelly κ=0.25 folklore; need variance-budget, drawdown (RCK), effective breadth under correlation, **model-class haircut** (inf-KL vs KLinf / bipolar e-processes), optimal stopping for act-vs-wait, selective classification with exact coverage (ConSat), learning-to-abstain with coverage-risk curves, contextual bandits for pick selection (named gap #4).
6. **Market microstructure half-empty.** Order flow / LOB on Kalshi-PredExon tape, steam prediction, informed vs public flow (price-sensitivity β), profit-bias decomposition (hold + shading×lean + outcome cov), effective vs posted prices (fees/boosts), TTE-conditional favorite-longshot bias. CLV is execution quality — we need **why** books profit and **when** public models beat liquid closes.
7. **Validation leakage.** Player-level models with shared players in train/test (LOPO). Game-clustered (and drive-nested) bootstrap for WP CIs (ESS collapse). Nested engine comparisons need Clark–McCracken class tests. Mixed-effects HFA biased under nonrandom schedule — fixed effects default.
8. **Ensembles fail in boring ways.** Equal weights, weighted means, performance-only trim, diversity-only trim. Need ICI/CU under unknown correlation, weighted median, hierarchical reconciliation (game↔season, props↔team), max-min as floor not solution, rank-space fusion, online experts with proper scores (not accuracy).
9. **Fantasy/props product gaps.** Aging curves/archetypes, residual-as-ability, coaching-alpha via IRL (winners-as-experts), atomic equilibrium priors on play-type mixtures, assortment/substitution nests for contest choice, multi-objective lineup MILP with quantile heads, usage redistribution (WR1 OUT) with power certificates.
10. **Private data we do not collect.** Reporter wire (RSS/Bluesky beat feeds — legal), team club feeds, weather joins at T-6h/T-1h, free nflverse gaps (`ftn_charting`, `officials`, `contracts`, `nextgen_stats`), open tracking from images (next-gen-scraPy), broadcast MOT without NGS license, handle% splits vs bet%, PredExon free plane only.
11. **Metrics as a science.** D/S/I/R meta-metrics on our 15 metric families; Scoreline partial-credit for model comparison; reliability of metrics themselves before they gate product claims.
12. **Content & compliance integrity.** Manipulative/deceptive ad taxonomy for affiliate surfaces; responsible-gambling copy classifiers — product-trust, not hit-rate.

## 4. What we need from you (deliverables)

Structure the final report like this (add sections freely):

### A. Blind-spot map (20k ft)
What entire **categories** of math, data, or product are missing from a company that claims “most accurate and calibrated fantasy + prediction sports”? Think like: a statistician who only trusts proper scoring rules; a market microstructure quant; a biostatistician who only thinks in hazards; a reliability engineer; a psychometrician; a climate forecaster (ensembles + CRPS); an RL theorist; a skeptical Bayesian; a skeptical frequentist; a lawyer reading ToS.

### B. New theory & equations (the “moon” list)
Propose **new or transplanted formal objects** with:
- Name + 1–3 sentence idea
- Math sketch (likelihood / update / decision rule)
- Why it beats what we have
- Minimal experiment + kill line
- Where it lands in the monorepo (suggest path)
Examples of the *level* we want (go beyond these): random-memory Hawkes; atomic equilibrium mixture caps; bipolar/e-process Kelly ceilings; nested garbage-time count processes; copula-Kelly; risk-neutral compensated-Poisson live pricing; safe-lead erf diffusion; coaching-alpha IRL; Mondrian CRC loss-rate contracts; per-cell extremizing slopes θ(d,τ,s); energy/copula energy scores; survival heads on props; optimal stopping on belief martingales.

### C. New machine learning (honest, testable)
Not “use a bigger model.” Specify: objective (log-loss / Brier / CRPS / afCRPS / selective risk / CLV), architecture class, **leakage plan** (LOPO, game-cluster, time-ordered), baselines (market close, Elo, current v5.2.7, shrinkage w=0.10), statistical test, compute budget class (laptop → single GPU), and **when not to use it**. Include tabular, hierarchical Bayes, state-space, survival, RL/bandits, conformal/distributional, causal forests/TMLE/DID/SCM, and any cross-domain trick (weather post-processing, epidemiology, quantitative finance, NLP evaluation).

### D. New databases & data sources (legal)
Name source, license/ToS verdict class (`open` / `permission_required` / `forbidden` / `paid`), schema fields we lack, refresh cadence, join keys to `picks`/`games`/`players`, and **which hypothesis it unlocks**. Respect: no scraping PrizePicks/Underdog/DK Network; no PFR direct; no Kalshi except PredExon free plane; no paid tick history; prefer free/nflverse/open tracking/public RSS. If something is high-value but legally hot, say so and give a **clean substitute**.

### E. Calibration & decision policy (lock-in program)
A concrete program to make displayed probabilities and posted picks **calibrated and predictable** under L11/L10 honesty laws. Include: estimator family, eligibility floors (do not lower), publication contract (n, exclusions, MATCHED_CLOSE policy), CRC/selective policy, CLV claim integrity (both MATCHED framings + Wilson), sizing lockbox (κ vs variance-budget vs RCK vs e-process haircut), and the **tests** that decide ship/no-ship.

### F. What we are forgetting (founder-level)
Process/product blind spots: multi-agent research debt, 750-ledger under-utilization, built-but-unwired engines (props-hb, gse-score, online-beta, mondrian, no-bet-adversary, factgraph, …), empty tables (`Signal`, `product_events`, `clvPositive`), clearance-gated `pfr_adv_stats`, docs sprawl, worktree chaos. How should a company that runs many research agents **not** lose leverage?

### G. Ranked 30-experiment backlog
Each row: id · hypothesis · method · data · baseline · metric · test · kill line · GSE path · impact (1–5) · risk (1–5) · effort (S/M/L) · “moon score”. Mix: 10 near-term (wire/test existing), 10 mid (new methods on existing data), 10 long-shot (new data/theory).

### H. Falsification & red team
List the **top 10 claims GSE currently believes** (shrinkage helps; props skill is real; ECE 0.05 is the right floor; κ=0.25; market is the right anchor; CLV is the right product metric; …) and for each a **test that could kill it**.

## 5. Priors we believe (challenge with tests)

1. Market-anchored shrinkage toward close/fair market improves calibration (not edge).
2. NFL sides/totals on public data have no durable predictive edge; props might.
3. CLV vs close is the right sharpness/profit proxy; raw ROI is noisy.
4. Proper scoring rules (Brier/log-loss/CRPS) beat accuracy for model selection.
5. Time-ordered / frozen holdout is mandatory; in-sample wins are lies.
6. Fractional Kelly with hard caps; full Kelly forbidden.
7. Withhold-only changes can ship without model bump; distribution-changing changes cannot.
8. Free data plane + legal clearance is the only durable data strategy at our budget.
9. Public record must include denominators and exclusion counts (in-play, unpriced, pushes).
10. Many small pre-registered factors (kill lines first) beat one opaque “AI model.”

If a prior is **wrong**, propose the test that overturns it and the replacement prior.

## 6. Repo handoff (read these first)

| Path | Why |
|---|---|
| `https://github.com/Beexly/Sports` | Monorepo root |
| `docs/ops/CANONICAL.md` | Ops single source of truth |
| `docs/ops/LAST_PLAN_2026-09-15.md` | Decisions D1–D22, data inventory, factor queue, founder-only items |
| `docs/ops/CALIBRATION_STATUS.md` | Live calibration board + levers |
| `docs/factors/INDEX.md` + `docs/factors/*.yaml` | Pre-registered factors A1–A28 + kill lines |
| `docs/calibration-proposals/` | v5.2.8 / v5.3.0 PROPOSED scorecards |
| `docs/research/2026-09-21/arxiv-program/PROGRAM-STATUS.md` | 750-program SoT |
| `docs/research/2026-09-21/arxiv-deep/*.md` | Full paper ledgers (14 sections) |
| `docs/research/2026-09-21/RESEARCH_TO_PRODUCT_PLAYBOOK.md` | First-pass transfer ranking |
| `docs/research/2026-09-21/EXHAUSTIVE_IMPROVEMENT_CATALOG.md` | Second-pass blind spots + wire list |
| `packages/prediction-engine/src/**` | Engine, calibration, kelly, conformal, edge-lab |
| `apps/web/lib/calibration/**` | Display calibration maps + explorers |
| `packages/verifier/**` | Frozen holdout, duel, factgraph |
| `scripts/guardrails/**` | Honesty gates (do not propose weakening) |
| `docs/data/NGS_GROUND_TRUTH_MAP.md` | NGS replacement |
| `docs/ops/stats-lane/` | FTN / stratified CLV audits |
| `packages/db/prisma/schema.prisma` | Tables: picks, odds_line_snapshots, … |

External product surface for truth checks: `https://www.galaxysportsedge.com/api/ops/public-surface-truth` (gates, calibration eligibility) and `/cockpit`.

## 7. Evidence standard (enforced)

For every factual claim in your report:
1. **Cite** source (arXiv/DOI/URL/repo path:line).
2. **State sample size and design** if it is empirical.
3. **Give a GSE-adapted acceptance gate** (metric + threshold + holdout).
4. If evidence is weak, label `ANECTDOTAL` or `INDUSTRY LORE` — never launder it into a fact.
5. Prefer ideas that can be **killed cheaply** (pre-registered kill line).

## 8. Freedom clause

You are **not limited** to the seed list, to sports papers, to 2020s ML, or to “practical only.” We want:
- equations nobody has tried on NFL props,
- databases we have not thought to join,
- theories from other fields that make our priors look naive,
- product surfaces (fantasy, proof, cockpit) that only work if the math is honest,
- and a clear-eyed list of **what we should stop doing**.

Run to the moon. Organize the chaos. Cite everything. Test everything. Leave us with a program we can pre-register tomorrow.

— end of brief —
