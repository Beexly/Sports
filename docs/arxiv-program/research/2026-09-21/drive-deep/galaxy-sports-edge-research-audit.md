# Deep Dive: Galaxy Sports Edge Research Audit

**Source:** /tmp/drive-deep/gse-research-audit.md (converted from Drive docx "Galaxy Sports Edge Research Audit")
**Length:** 1,126 lines / ~80,984 chars; 6 embedded tables; 2 citation sources ([1] gse_research_analysis_2.xlsx, [2] "Auditing Conformal Prediction, Small-Sample Calibration, and Sports Market Probabilities for GSE")
**Deep-read date:** 2026-09-21
**Status:** Full text read in 10 chunks, no skips. The docx contains no embedded images (verified via `unzip -l`; see Section 8).

This document is actually TWO documents fused: (A) an **audit of the triaged arXiv corpus** (~1,300 rows, 58 dossiers) for methodology quality, inflation, and false positives; and (B) a **system audit of GSE itself** (production Tree A vs. research-mill Tree B) with a dated 110%-launch architecture, numeric gates, kill lines, and a founder unblocks list. The substantive research content is in (A) + the paper register in (B); the hard numbers about GSE's own engine state are in (B).

---

## 1. Research question and thesis

**Question (A, corpus side):** Of the 1,300+ triaged arXiv rows and 58 "high" dossiers scored by automated triaging agents, which literature actually constitutes usable methodology for live sports probability estimation, numeric line generation, calibration, and betting-market efficiency — and how much of the high relevance scores is inflation, fringe studies, or domain false positives?

**Question (B, system side):** What is GSE's true operational readiness for a customer-facing NFL launch, measured against explicit empirical standards rather than the previous internal score of 38?

**Thesis (A):** The corpus segregates into seven methodological clusters; the structural backbone is Bayesian state-space/hierarchical generative models with per-sport noise scales; conformal wrappers guarantee coverage but cannot repair point-estimate bias; and a large fraction of the corpus is keyword-inflated false positives (Olympic medal GCNs, a frozen 2014 PyMC3 rugby tutorial, TDA, soccer vector fields, plus ten completely dead-domain papers: biomechanics, telecom anomaly detection, astrophysics, fluid dynamics, materials science, MRI, nuclear physics, heliophysics, UI studies, e-commerce recsys).

**Thesis (B):** GSE's true launch-readiness composite score is **29.00/100** (not 38), with customer-facing calibration at 12/100 (an inverted, anti-predictive confidence metric, z = -10.7) and production ops at 20/100 (serverless OOM crash, 6-day calibration-cron outage, 21-day archive gap). The binary verdict: DO NOT OPEN the customer board on Thursday, September 24, 2026 until a named checklist clears.

---

## 2. Methods/models with equations (preserve exact formulas, definitions, metric names)

### 2a. Launch Readiness Index (document's own rubric)

Composite score formula (Section A of system audit):

$$\text{Composite Score} = \sum_{i=1}^{8} w_i \cdot S_i$$

Each dimension $S_i \in [0, 100]$; 0 = fatal blocker, 50 = honest parity with efficient closing market, 100 = fully automated, mathematically verified, externally auditable production. Dimension definitions, exact:

- **Customer-Facing Calibration** ($w_1 = 0.20$): displayed numbers must be strictly monotonic, well-calibrated probabilities. Inverted/anti-predictive confidence metrics invalidate credibility.
- **CLV and Market Honesty** ($w_2 = 0.15$): mathematical consistency of CLV accounting, transparency of matched vs. unmatched closes in the denominator, no fabricated track records.
- **NFL Physical Model** ($w_3 = 0.15$): core margin/total estimation vs. efficient closing prices across seasonal phases (early-season prior reliance vs. mid-season regression), QB transitions, environmental dynamics.
- **NCAAF Pipeline** ($w_4 = 0.10$): pipeline coverage, schema integrity, predictive validity for college slates; heavily penalizes unmonitored failures and missed slates.
- **MLB Pipeline and Copy Honesty** ($w_5 = 0.10$): market pricing validity across run lines and moneylines, market depth scoring accuracy, elimination of tautological/misleading copy.
- **Fantasy and Player Props** ($w_6 = 0.10$): physical modeling of count distributions, variance overdispersion treatment, environmental factor decoupling, live quote ingestion integrity.
- **Ops and System Reliability** ($w_7 = 0.10$): ingestion uptime, serverless execution limits, database indexing, memory stability, truth surface availability.
- **Statistical Hygiene and Governance** ($w_8 = 0.10$): out-of-sample testing, rejection of noise-mining features, feature-kill governance, non-AI positioning rules.

### 2b. State-space model (paper 1701.05976 — the audit's architectural anchor)

Quote, exact: *"Bayesian state-space model on betting-market point spreads / totals-implied margins, not raw scores, so the observation model is comparable across NFL/NBA/NHL/MLB. Team strength $\theta_{i,s,w}$ evolves: between seasons: AR(1) with variance $\sigma^2_{\text{between}}$; within season: random walk with variance $\sigma^2_{\text{within}}$."*

Per-sport game noise $\sigma_{\text{game}}$ estimated independently — the document's central mathematical insistence: a single global calibration layer is "mathematically unsound" because signal-to-noise ratios differ by sport.

### 2c. Rules-aware hierarchical likelihoods

- **1911.01815 (volleyball):** Level 1 = logistic for set winner (team abilities + home advantage). Level 2, conditional on set winner = truncated negative binomial for loser's points; plus Poisson inflation for extra points when the set goes beyond 25/15.
- **1607.00379 (rugby, Baio–Blangiardo style):** home/away scores ~ Poisson with log-linear attack, defense, home-advantage terms; partial pooling of team strengths.
- **2501.17711 (Olympic medals):** Zero-Inflated Compound Poisson medal counts with STGCN-LSTM graph core (core flagged as bloat; the **Zero-Inflated Compound Poisson head** flagged as the portable piece for shutout props / exact goal counts / low-frequency player props).

### 2d. Conformal prediction — exact formulas quoted

- **CQR conformity score** (Romano, Patterson & Candes 2019, arXiv:1905.03222): $$E_i = \max(q_{\alpha_{\text{lo}}}(X_i) - Y_i,\; Y_i - q_{\alpha_{\text{hi}}}(X_i))$$ Validity: under exchangeability, $P(Y_{n+1} \in C(X_{n+1})) \ge 1 - \alpha$ in finite samples.
- **q_hat construction** (Angelopoulos & Bates 2021, arXiv:2107.07511; Dietterich & Hostetler 2206.04860): $q_{\text{hat}}$ = $\lceil (n+1)(1-\alpha) \rceil / n$ empirical quantile of calibration scores; $\delta \ge 1/(n+1)$ required to ensure $\lceil (1-\delta)(n+1) \rceil \le n$. If $n$ too small, coverage cannot be guaranteed without infinite intervals or abstention.
- **Operational fail-closed rule:** if $n < \lceil 1/\alpha \rceil - 1$, issue "No-Bet"/abstain — do NOT clamp/truncate quantiles to empirical maxima (that yields "fake tightness").
- **Linear QR under-coverage bias** (Lin, Trivedi & Sun 2021, arXiv:2106.05515), exact: for $\alpha > 0.5$ and small $d/n$, the learned $\alpha$-quantile achieves coverage $\approx \alpha - (\alpha - 0.5) \cdot d/n$ regardless of noise distribution. Treat raw NN/boosted-tree quantiles as uncalibrated proposal distributions.
- **Binary limits theorem** (Barber, Candès, Ramdas & Tibshirani 2020): any algorithm giving distribution-free coverage of $\pi(X) = P(Y=1|X)$ must also cover the binary label $Y$ — bounded-length intervals for $\pi(X)$ are impossible without structural assumptions.
- **Generalized Venn-Abers** (van der Laan & Alaa 2025, arXiv:2502.05676): multiprobability bounds $[p_0, p_1]$ containing the true conditional probability in finite samples under exchangeability; interval width $(p_1 - p_0)$ = epistemic uncertainty for EV calc and selective gating.

### 2e. CLV accounting formulas (document's mandated reporting contract)

$$\text{CLV}_{\text{Decided}} = \frac{\sum \mathbf{1}_{\text{Matched Beats Close}}}{\text{Total Decided Bets with Verified Close}} = 40.8\%$$

$$\text{CLV}_{\text{System}} = \frac{\sum \mathbf{1}_{\text{Matched Beats Close}}}{\text{Total Published Recommendations}} = 23.2\%$$

Both must be published side by side. The audit's 23.2% 95% CI is [0.212, 0.253] (686/1,587 with MATCHED_CLOSE retained); decided-only 40.8% 95% CI [0.377, 0.441] against a 52.4% break-even floor.

### 2f. Public cryptographic audit standard (the "100" spec)

- **Receipt chain:** $$\text{Receipt}_t = \text{SHA256}(\text{PickID}_t \parallel \text{Timestamp}_t \parallel \text{GameID}_t \parallel \text{OddsSnapshot}_t \parallel \text{ModelProb}_t \parallel \text{Receipt}_{t-1})$$ — append-only, SHA-256 hash chaining, RFC-3161 external timestamping proving publication before event start.
- **Recomputation identities (exact):**
  $$\text{ECE} = \sum_{m=1}^{M} \frac{|B_m|}{N} |\text{acc}(B_m) - \text{conf}(B_m)|$$
  $$\text{Brier Score} = \frac{1}{N} \sum_{t=1}^{N} (P_t - Y_t)^2$$
  $$\text{Conformal Empirical Coverage} = \frac{1}{N} \sum_{t=1}^{N} \mathbf{1}_{Y_t \in [L(X_t), U(X_t)]}$$
  $$\text{CLV}_{\text{Decided}} = \frac{\sum_{t=1}^{N_{\text{decided}}} \mathbf{1}_{\text{Beats Close}}}{N_{\text{decided}}}$$
  $$\text{CLV}_{\text{System}} = \frac{\sum_{t=1}^{N_{\text{total}}} \mathbf{1}_{\text{Beats Close}}}{N_{\text{total}}}$$
- **Institutional pass/fail thresholds (exact):** ECE $\le 0.025$; Brier $< 0.204$ over $n \ge 1{,}000$; marginal 90% interval coverage $0.90 \pm 0.015$; rolling 500-pick coverage inside [0.885, 0.915] at $\alpha=0.10$; CLV beat-rate $> 52.4\%$; public verification replicates published metrics to $10^{-6}$ precision or release fails.

### 2g. Paper register categories and arXiv IDs cited (with operational tags)

**Keep (calibration/UQ):** Jackknife+ (1905.02928); cross-conformal efficiency Gasparin & Ramdas (2503.01495); conformal under covariate shift (1904.06019); beyond exchangeability (2202.13415); split conformal on non-exchangeable data (2203.15885); SPCI (2212.03463); ACI (2106.00170); Conformal Risk Control (2208.02814); missing values (2306.02732); CQR (1905.03222, tag "measure"); Venn-Abers predictors (1211.0025, plus 2605.06646); conformal tutorial (0706.3188); transfer TCC (2609.10737, measure); physics-informed conformal (2609.11935, measure); label-shift split conformal (2609.12386, measure).

**Keep (market microstructure):** Kaunitz et al. (1710.02824) — devigging consensus fair values (Power and Shin de-biasing); Szalkowski & Nelson (1211.4000) — NFL line performance baseline; correction of online sportsbooks (2306.01740) — selection-bias correction; COVID market efficiency (2109.07581, measure only). **Kill:** 2609.13453 (geospatial data-cube API, irrelevant).

**Keep/measure (props/tails):** Fast additive quantile regression qgam (1707.03307); prices/probabilities/parlays (2607.14430) — SGP leg-product overpricing; soccer Poisson scoring (1002.0797, measure — supports Negative Binomial modeling); Skellam regression (1807.07536, measure — soccer params barred from NFL).

**Keep/measure (trenches, engine):** Pipping-Gamón opponent-adjusted line play (2604.01491); structural vs. closing price (2608.11505); Elo convergence stationarity (2410.09180); illusion of persistence (1810.03383); generalized Kelly under temporal correlation (2003.02743, measure).

**NcAAF modeling:** Sides & Harvill additive quantile modeling (2212.08116) for college spreads.

---

## 3. Key numerical results, tables, benchmarks — exact values

### 3a. Launch Readiness composite (29.00/100)

$$\text{Composite} = 2.40 + 4.20 + 6.30 + 0.00 + 2.50 + 3.40 + 2.00 + 8.20 = 29.00$$

| # | Dimension | w | S | w·S | Verdict anchor (exact) |
|---|-----------|---|---|-----|------------------------|
| (i) | Customer-Facing Calibration | 0.20 | 12 | 2.40 | Confidence anti-predictive: n=2,385, z=-10.7, Brier 0.3617 |
| (ii) | CLV / Market Honesty | 0.15 | 28 | 4.20 | CLV 23.2% [0.212, 0.253]; decided-only 40.8% [0.377, 0.441] vs 52.4% floor; 21-day archive gap |
| (iii) | NFL Physical Model | 0.15 | 42 | 6.30 | Close CRPS 7.109 beats DAVE k=8 (7.500); scale 36.61 pooled vs 45.42 Hermes; ~70 live settled |
| (iv) | NCAAF Pipeline | 0.10 | 0 | 0.00 | 2026-09-19 slate completely missed; zero historical corpus wired |
| (v) | MLB Pipeline & Copy | 0.10 | 25 | 2.50 | Moneyline ECE healthy (0.0501); SPREAD 10+ anti-predictive; run-line consensusPct=1.0 tautology; MLB SPEAK 40% inverted (n=90) |
| (vi) | Fantasy & Player Props | 0.10 | 34 | 3.40 | Red-zone TD VMR 1.82–1.92 confirms NB overdispersion, rejects Poisson; wind adjustments not isolated from totals |
| (vii) | Ops & Reliability | 0.10 | 20 | 2.00 | Watchdog RED since 2026-09-13 16:53 UTC; OOM on 1.64M rows; truth surface dark |
| (viii) | Statistical Hygiene | 0.10 | 82 | 8.20 | 12/12 Move-37 lab kills upheld; W5–W8 rejected; non-AI copy discipline enforced |

### 3b. Tree B (research mill) — 14,251 decided NFL fixtures, 1999–2025

- **Closing line CRPS = 7.109** (best of all; n=1,871 reported for the benchmark row in Table 4)
- DAVE (k=8): CRPS 7.500; pooled EPA: 7.573; core Elo: 7.576
- 2025 season (n=272): DAVE CRPS 7.629 vs close 6.927 vs Elo 7.563; DAVE Brier 0.251 vs market 0.204
- DAVE beats Elo only in **Weeks 1–4 (+0.326)**; underperforms Weeks 5–18 (−0.187), with starting QB changes (−0.171), and in blowouts (−0.442)
- Pooled OLS scale = **36.61** vs Hermes 2025 fold = **45.42** (unweighted average 41.01 flagged as a miscalibration anti-pattern)
- QB-change residual variance ratio τ² = 1.379 (78/114) vs pre-registered kill threshold 1.50 → killed
- Hawkes branching ratio **n̂ = 0** (Poisson behavior) with kickoff inhibition parameter **0.448** → momentum rejected
- Wind: **−3.007 yds/mph** on passing yardage; rain: 30.1% incomplete vs 27.6% baseline; red-zone TD VMR **1.82–1.92** (Negative Binomial confirmed, Poisson rejected)
- Spread×Total correlation: Spearman ρ = 0.016 → killed (independence); ATS×Over lift = 1.011 (n=6,682) → independence kept; post-cover live total drag: Over rate 0.538 after 14-pt cover → flagged as exploitable, keep
- Features W5–W8 (Wasserstein, DFA, Intrinsic Dimension, Permutation Entropy): failed 12/12 fixtures → permanently killed
- Fay-Herriot year shrinkage: k̂=7.486 (Δ0.011 vs k=8) → keep; Mondrian-k calibration ΔCRPS=0.0092 < 0.01 threshold → killed

### 3c. Tree A (production) observations

- Odds watchdog RED since 2026-09-13 16:53 UTC; odds_line_snapshots = 7.7M rows; uncapped IN query materialized 1.64M rows → serverless OOM
- Calibration cron offline 6 days; gate_decisions last write 2026-06-11; fixture triplication; PENDING records dating to January
- Ordering duel (n=689): marketFairProb Brier **0.2189** < internal rankingP **0.2462** < internal confidence **0.2741**
- Displayed confidence: Brier **0.3617**, z = −10.7 (anti-predictive)
- Archive gap 2026-08-23 → 2026-09-12; PRs #866/#867/#868 unmerged; CI run #2948 must be green before merge

### 3d. Triaged-paper audit calls (Table 1, exact verdicts)

- 1701.05976 → Accurate; primary structural anchor
- 2408.08331 → Accurate; cheap ML-vs-Poisson diagnostic baseline
- 1704.00197 → Accurate; iWinRNFL NFL diagnostic
- 2501.17711 → Heavily Inflated (Olympic STGCN-LSTM; keep only Zero-Inflated Compound Poisson head for props)
- 1607.00379 → Heavily Inflated (2014 frozen PyMC3 tutorial; downgrade High→Low; onboarding only; repo needs PyMC3→PyMC v5 migration)
- 2607.27838 → Inflated/Feature Bloat (soccer vector fields); 2607.23509 → Inflated/Feature Bloat (TDA tennis)
- 1911.01815 → Thin on Metrics (rules-aware likelihood structure good; zero Brier/ECE on betting lines)

### 3e. Dead-domain exclusions (Table 2) — ten papers to exclude

2012.10006 (brain strain biomechanics), 2405.19125 (mobile network anomaly detection), 2306.14462 (item-attribute recsys), 2207.13770 (UI reliability viz), 2608.06604 (stellar rotation), 2607.17297 (automotive CFD), 2601.17437 (soft-material tensors), 2601.13236 (parallel MRI), 2604.21039 (neutron star EOS), 2603.06712 (solar flare UQ). Non-portable; matched generic keywords only.

### 3f. External literature spot results quoted

- NCAA deep learning (2508.02725): Transformer + BCE → AUC 0.847, but **LSTM + Brier loss → Brier 0.159** (better calibration) — direct evidence for Brier-loss training
- Pitwall F1 (2607.06495): Brier 0.0745 on F1 forecasts; 2,000 per-lap Monte Carlo continuations; typed-claim NL verification
- VERSA (2601.21981): **18.81%** of K-League event logs had state-transition inconsistencies; correction improved downstream VAEP models
- L-RAPM (2601.15000): stabilizes lineup ratings at 25–30 possessions/lineup via player-metric priors
- TDA tennis (2607.23509): 66.2% ATP accuracy from abstract metadata only (UNREAD)

### 3g. Environmental/physical constants GSE locked as production values

- EPA auto-activation (scheduled 2026-10-08): must use **scale = 45.42** and **HFA = 2.10** points; repo defaults (0.12, 0.025) flagged as a 3.8x parameter error — hard-fail the pipeline if scale < 30.0
- NFL_EPA_MIN_GAMES = 4 (data floor; do not bypass)
- MLB: moneyline ECE 0.0501 (healthy); purge consensusPct=1.0 on run lines
- Production gating: n ≥ 100 settled games before NFL PASS recommendations; n ≥ 1,000 to claim calibration; rolling coverage [0.885, 0.915] at α=0.10; Jackknife+ target coverage ≥ 0.90 (n ≥ 150), kill if < 0.85 or width > Gaussian+15%; cross-conformal must narrow widths ≥ 8% at ≤ 250ms/slate; NCAAF stays dark below 48.0% closing-line beat rate; trench features need +0.005 CRPS to keep; Venn-Abers must beat 0.2189 by ≥ 0.005 to replace marketFairProb sort; TD props need ≥ 0.015 tail Brier improvement vs Poisson; kill adaptive conformal if early-season widths expand > 50%.

---

## 4. Code/data references

**Repos/code (from the document):**
- 1701.05976: https://github.com/bigfour/competitiveness (JAGS code + historical market lines)
- 1607.00379: https://github.com/springcoil/TutorialPyMCRugby (frozen PyMC3 — needs migration to PyMC v5)
- Internal: Beexly/Sports PRs #866 (archive freshness monitoring), #867 (EPA path config + docs/ops/FOUNDER_DECISIONS.md), #868 (serverless batching: take=5000, max=50000 on odds_line_snapshots; memory → 1024MB); CI run #2948 must be green first
- config: packages/prediction-engine/src/config.ts (SCALE_CONSTANT=45.42, HFA_POINTS=2.10 sign-off); NFL_EPA_MIN_GAMES=4

**Data vendors (Table 6):**
- CollegeFootballData (CFBD): commercial tier (~$50/mo) / open API — NCAAF play-by-play, drive metrics, historical lines 2014–2025
- cfbfastR pipeline: MIT open source — live NCAAF box scores/roster/drive metrics
- Sportradar / The Odds API: commercial SaaS — real-time multi-book prop quotes (receptions, passing yards, TDs)
- Pinnacle / Circa direct feeds: API access agreement / B2B — ground-truth closing benchmarks for CLV
- ESPN Analytics via nflverse: CC-BY 4.0 — PBWR/PRWR trench data

**Document sources:** gse_research_analysis_2.xlsx; companion doc "Auditing Conformal Prediction, Small-Sample Calibration, and Sports Market Probabilities for GSE". Corpus inputs: nflverse 2020–2025, the 14,251-fixture NFL corpus (1999–2025), the Hermes 2025 fold (n=272), KL3 ordering duel (n=689), KL-series UX confidence sample (n=2,385).

---

## 5. What transfers to GSE's engine (calibration, ratings, props, tracking) and what doesn't

**TRANSFERS — direct GSE value:**

1. **Per-sport state-space with independent σ_game (1701.05976).** This is the single strongest architectural takeaway: never share a calibration layer across sports; estimate per-sport noise scales. It also answers "why NFL props fail under Poisson" structurally.
2. **Decouple performance engine from market pricing engine.** Train team-strength on play-by-play/box scores/efficiency ONLY; track odds movement/liquidity in a separate model. Putting closing lines in training features leaks market efficiency and destroys CLV measurement. This is the document's most actionable methodological discipline and maps directly onto GSE's CLV underperformance.
3. **Train under Brier loss, not BCE** (2508.02725: LSTM+Brier → 0.159 vs Transformer+BCE highest AUC 0.847 but worse calibration). Cheap to implement in the engine's pick-probability heads; directly attacks point-estimate bias before any conformal wrap.
4. **CQR wraps on numeric lines + fail-closed abstention.** CQR (1905.03222) on props/totals with the hard rule: n < ⌈1/α⌉ − 1 ⇒ "No-Bet," no quantile clamping. This converts GSE's props uncertainty story into guaranteed finite-sample coverage claims.
5. **Venn-Abers [p₀, p₁] for binary sides** (1211.0025 / 2502.05676) with width-as-epistemic-uncertainty gating — a principled replacement for the currently inverted single-point confidence display. Kill condition is pre-specified (must beat 0.2189 by ≥0.005).
6. **Zero-Inflated Compound Poisson heads for rare props** (from 2501.17711's head, minus its STGCN-LSTM core) and **Negative Binomial for TD props** given measured VMR 1.82–1.92. Plus qgam fast additive quantile regression (1707.03307) for prop tail estimation.
7. **Shin/Power devigging** (1710.02824, 1211.4000) as the consensus fair-line layer — the document mandates marketFairProb (Brier 0.2189) as the sort key until the model demonstrably beats the close.
8. **Selection-bias correction** (2306.01740) on reported returns; **conformal risk control** (2208.02814) bounding CLV drawdown.
9. **State-transition pre-ingestion gates** (VERSA: 18.81% of K-League logs were corrupt) — cheap data-quality win before any model change.
10. **Claim-level text verification** (Pitwall blueprint) for automated content — decomposing generated copy into typed claims verified against engine state; directly relevant to GSE's content pipeline.

**DOESN'T TRANSFER (document's explicit kills — respected as-is):**

- STGCN-LSTM graph core, soccer vector fields (2607.27838), TDA persistent homology (2607.23509) — feature bloat until baseline MAE/calibration is competitive
- Hawkes momentum (n̂=0, rejected), W5–W8 features (12/12 failed), Mondrian-k calibration, QB-change variance scaling (τ²=1.379 < 1.50)
- Dixon-Coles bivariate Poisson / soccer Skellam params applied to NFL scoring (explicitly barred — American football scoring boundary conditions break Poisson)
- The 2014 PyMC3 rugby tutorial as production code (onboarding reference only)
- All ten dead-domain papers (Table 2)
- Global cross-sport calibrators; averaging historical+modern scale constants (41.01 anti-pattern); retuning k=4 on the single 2024 fold
- In-play/live betting, SGPs, NBA/WNBA/NHL, association football, FCS/lower divisions, anytime-TD and novelty props — all explicitly out of scope for institutional certification
- Marketing copy claiming "AI edge" (banned by GSE's own hygiene governance — consistent with standing memory rule on non-AI positioning)

---

## 6. Gaps, limitations, conflicts with other GSE research

1. **Read-status fragility:** Four papers (2608.12291 win-martingales, 2608.01882 cricket gaps, 2607.27838 soccer fields, 2607.23509 TDA tennis) are evaluated from **abstract metadata only** — the doc is explicit that these are UNREAD. Any transfer from them is premise-level, not evidence-level. The 2609-series papers (10737, 11935, 12386) are 2026 papers evaluated presumably from metadata too; the register gives no dossier status for them.
2. **MLBBSPREAD/MLB findings thin:** "SPREAD 10+ is anti-predictive," "MLB SPEAK 40% inverted (n=90)," moneyline ECE 0.0501 — the underlying regressions aren't shown; these are stated verdicts, not derivations.
3. **NCAAF gap admitted:** "arXiv contains no actionable NCAAF calibration papers" — the roadmap buys/acquires CFBD + cfbfastR instead. No research substitute for data acquisition.
4. **Conflict/consistency with GSE standing rules:** The doc's anti-plan (no AI marketing copy, no W5–W8, Hawkes rejected, no Dixon-Coles transfer to NFL) is fully consistent with standing GSE rules in memory. The DAVE-vs-close results (close CRPS 7.109 ≪ DAVE 7.500) reinforce the standing "market-first" posture. One tension: the doc leans on Brier loss as the calibration fix while Garrett's engine program is pursuing CQR-family methods; the doc itself resolves this — base-point calibration (Brier) BEFORE conformal wrapping, not either/or.
5. **Temporal risk:** The document is dated 2026-09-19/21 with hard deadlines (board gate 2026-09-24, EPA activation 2026-10-08, Phase 4 through 2027-01-15). Scores, PR numbers, CI run IDs, and "live" states are snapshots — re-verify any operational claim (PR merges, watchdog state, cron status) against the live repo before acting. Nothing in the doc should be treated as current state on a later date.
6. **Unresolved mechanisms:** The 23.2% vs 40.8% CLV gap is attributed to MATCHED_CLOSE denominator contamination — but the doc itself notes even decided-only 40.8% is far below the 52.4% floor, i.e., the denominator fix doesn't rescue market underperformance. The inverted-confidence mechanism (z=−10.7) is hypothesized ("overweights factors bookmakers exploit") but not decomposed.
7. **Provenance gaps:** Sections F (Founder Unblocks) sub-items 2–4 contain section headers with **empty bodies** ("Execute the following API calls...", "Execute the following read queries...", "Deploy the following feature flag overrides...") — the actual commands/queries/flags were not present in the converted text. Section E's "Complete Item Inventory" likewise has two empty subsections ("Production Measurements and Architectural Items" and "Jev arXiv Research Mill Ingestion") whose content appears to have been absorbed into the tables. See Inaccessibility Log.

---

## 7. Concrete implementation note: what GSE would have to build to apply it

Mapped to GSE's repo (Beexly/Sports) as concrete work items, in dependency order:

1. **Ops stabilization (precondition for everything):** merge PR #868 (cursor pagination take=5000/max=50000, memory →1024MB), #867, #866 after green CI; restore truth-surface calibration cron; cursor-bound the 7.7M-row odds_line_snapshots ingest. Estimated by doc: 24h memory profile <450MB, kill at 750MB.
2. **Display honesty (no model work):** purge inverted confidence from pick cards; sort by marketFairProb (Shin/Power devigged consensus); purge MLB run-line consensusPct=1.0; render uncalibrated metrics as integer indices only. This alone converts the 12/100 customer-calibration dimension from actively-harmful to neutral.
3. **Devigging layer:** implement Power + Shin de-biasing (Kaunitz 1710.02824) over multi-book feeds (Pinnacle/Circa) → marketFairProb with kill line Brier ≤0.204 on historical closes; fallback Pinnacle closing line.
4. **Loss-function swap:** retrain binary probability heads under Brier loss instead of BCE (2508.02725 result: LSTM+Brier 0.159). This is a training-config change, not new architecture.
5. **Conformal service:** split-conformal baseline first (static Gaussian close intervals ±1.645σ as fallback), then Jackknife+ (1905.02928) on n≥150 windows with the 0.85-coverage/15%-width kill lines; non-exchangeable weighted quantiles (2202.13415) for week-to-week drift; cross-conformal (2503.01495) for efficiency if latency ≤250ms/slate; CQR (1905.03222) on props; Venn-Abers (1211.0025) on moneyline/spread binaries with the 0.2189+0.005 gate; **fail-closed No-Bet** when n < ⌈1/α⌉−1.
6. **Props tails:** Negative Binomial parameterization for TD props (target VMR 1.82–1.92; kill if φ collapses to Poisson), qgam (1707.03307) for quantile tails, Zero-Inflated Compound Poisson heads for rare-count props; wind −3.007 yds/mph applied to passing-yard quantiles only (never totals).
7. **Data gates:** VERSA-style state-transition validators on event ingestion; VMR/weather constants signed into config.ts (SCALE=45.42, HFA=2.10, NFL_EPA_MIN_GAMES=4) before the 2026-10-08 activation, hard-failing scale<30.0.
8. **Audit surface:** SHA-256 hash-chained receipt ledger + RFC-3161 timestamps at /performance/audit; public dual-CLV dashboard (23.2% / 40.8%); self-contained Python recomputation script; ECE ≤0.025 / Brier <0.204 / coverage 0.90±0.015 / CLV >52.4% pass-fail badges with 10⁻⁶ replication precision.
9. **Staking/governance:** conformal risk control (2208.02814) on drawdown; selection-bias correction (2306.01740) on reported returns; purge "AI" marketing copy (already standing rule).

Per the doc's own phasing, items 1–3 move 29→45, conformal + market baselines reach 70, EPA parameterization + UQ reach 80, multi-sport/props reach 85, and the institutional audit surface reaches 100 by 2027-01-15.

---

## 8. Inaccessibility log

- **No embedded images, charts, or figures** in the source: `unzip -l` on gse-research-audit.docx lists no media files; the .md contains no image markers. The ASCII diagrams (taxonomy tree, tactical roadmap) are text art and were fully captured. The "6 tables" claim is consistent with the six markdown tables (Tables 1–6) present.
- **Empty/missing content in the conversion:** Section F subsections "2. Administrative API Executions," "3. Database Diagnostic Queries (Read-Replica)," and "4. UI Display Overrides" contain only their lead-in sentences with no commands, queries, or flags beneath them. Section E's "Complete Item Inventory" has two empty subsection headers. Section H's "4. Audit Execution Script" ends with a lead-in sentence and no code. Whether these were empty in the original docx or lost in conversion could not be verified (convert.py/extract.py exist in /tmp/drive-deep but were not run — re-running them is possible if the parent wants a re-extraction check).
- **Citation opacity:** Sources [1] and [2] are internal working documents (gse_research_analysis_2.xlsx; the companion conformal-audit doc), not retrievable literature — every factual claim in the doc traces to one of these two, and I could not independently verify the spreadsheet or the companion doc from this file alone.
- **UNREAD papers:** 2608.12291, 2608.01882, 2607.27838, 2607.23509 evaluated on abstract metadata only; the 2609.x papers and 2501.02505/2406.19563/2405.10247 rank-BTL cluster have method claims but no dossier status in this doc.
- **Stated-but-underived numbers:** MLB SPREAD 10+ anti-predictive finding, MLB SPEAK 40% inversion (n=90), the 18.81% VERSA corruption rate (external paper, quoted), and the −10.7 z-score mechanism (hypothesized, not decomposed) — exact values preserved as reported, not independently reproducible from this text.
- **Temporal staleness:** All operational states (PR numbers, CI run #2948, watchdog RED since 2026-09-13 16:53 UTC, the 2026-09-24 board gate, the 2026-10-08 EPA activation) are snapshots as of 2026-09-19/21 and must be re-verified against the live repo before use.
