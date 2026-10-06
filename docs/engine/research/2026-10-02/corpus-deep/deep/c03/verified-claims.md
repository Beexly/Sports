# Verified Claims — Corpus Slice c03, Coaching Lane (Phase 2)

**Written:** 2026-10-02 · **Coordinator synthesis** of working reports A1 (τ verification), A2 (regime-shift specs), A3 (measured signals).
Working files: `~/workspace/corpus-intelligence/deep/c03/working/A1-tau-verification.md`, `A2-regime-shift-specs.md`, `A3-measured-signals.md`.
**Rule:** every claim below was checked against the source file named. Inference is labeled INFERENCE. A claim that failed verification would be listed in §6; none failed.

---

## 1. Fourth-down coach risk preference τ (1575) — 23 items verified

**Source ledger:** `~/workspace/vendor/Sports/docs/arxiv-program/research/2026-09-21/arxiv-deep/1575-learning-risk-preferences-fourth-down.md`
**Paper:** Sandholtz, Wu, Puterman, Chan (2023), arXiv:2309.00756 — title/authors/abstract independently confirmed on arxiv.org (v3 Aug 2024).

| # | Claim | Verdict |
|---|-------|---------|
| 1 | Performance regression β_1(τ̂) = 0.769***, (0.138) [ledger:43] | VERIFIED (SE label is INFERENCE-by-convention — ledger writes `(0.138)` without naming it) |
| 2 | Partial R² = 0.048 (R² 0.059, adj 0.054, F 12.860***) | VERIFIED |
| 3 | N = 622 coach-season-WP-region cells | VERIFIED |
| 4 | ~Half of coaches risk-seeking vs risk-neutral in opp half at low WP; Nagy/Gruden/McCarthy/Pederson medians exceed the 4th Down Bot; no own-half median exceeds risk-neutral | VERIFIED |
| 5 | τ̂_opp-half − τ̂_own-half > 0, 95% CIs exclude 0 until WP ≥ 0.8 | VERIFIED |
| 6 | Risk tolerance rose 2014–2022 in every WP×region cell, stronger in opp half | VERIFIED |
| 7 | League aggregate optimizes low quantiles of next-state value (conservative) vs the Bot | VERIFIED (abstract corroborates) |
| 8 | Bot−League gaps largest in own half at low WP; exception opp half at WP<0.05 | VERIFIED |
| 9 | Q4 vs Q1–Q3 indistinguishable except WP<0.2 (Q4 more risk-tolerant) | VERIFIED |
| 10 | Own-half behavior uniform across coaches; opp-half widely varying | VERIFIED |
| 11 | Data: nflfastR pbp 2014–2022; WP from Carl & Baldwin 2024 tree; FiveThirtyEight Elo | VERIFIED |
| 12 | Forward model: one-period MDP, actions {GO,FGA,PUNT}, league-average stationary policy π̄ after t+1; rewards TD 6.95 / FG 3 / SAF −2 | VERIFIED |
| 13 | Candidate objective q^π̄_τ = inf{x : τ ≤ F_{V^π̄}(x\|σ,a)} (Eq. 4.6) | VERIFIED |
| 14 | Inverse problem = average Hamming loss (Eq. 4.11); joint (τ_1,τ_2) (Eq. 5.5); L≥3 underidentified with \|A\|=3 | VERIFIED |
| 15 | SCAM bivariate monotonic smoothing (k=4), 3rd-down GO-transition augmentation (Romer 2006 vs Daly-Grafstein bias) | VERIFIED |
| 16 | τ ∈ [0.2,0.8] (policies plateau at extremes); point estimates = medians of optimal sets | VERIFIED |
| 17 | 200 game-level bootstraps → 95% CIs on τ̂ and all contrasts | VERIFIED |
| 18 | Coach plots restricted to ≥25 observed 4th-down decisions per region per WP range | VERIFIED |
| 19 | 4th Down Bot + risk-neutral policy run through the same inverse pipeline as references | VERIFIED |
| 20 | Reproduction code public (github.com/nsandholtz/fourth_down_risk), reproducible from public sources | VERIFIED (not fetched per read-only rule) |
| 21 | Estimand: τ per coach-team × field region × WP bin | VERIFIED |
| 22 | Yam & Lopez 2019 ~0.4 wins/year cost of excessive risk aversion | VERIFIED **as a ledger claim** (underlying number not independently re-checked) |
| 23 | Verdict ADAPT; replaces 1567 (REJECT) | VERIFIED |

**Corrections:** (1) brief location is `c03/r27/`, not `c03/r22/` — the map's finding #1 path is stale. (2) The concrete builder gates (≥3pp Hamming accuracy over risk-neutral WP-max in opp half on 2024–2025 4th downs; τ̂-optimal vs Bot sanity) are the **ledger author's**, not the paper's (ledger:58). (3) Map shorthand "the estimand itself is the deliverable" is consistent with ledger:61 but is shorthand, not a quote.
**Open caveats:** WP-stratifier circularity (spread is in the WP tree; bias on τ̂ unquantified); 2014–2022 data is non-stationary — refit on current seasons or τ̂ systematically underrates aggression; headline coach examples (Nagy, Gruden, McCarthy, Pederson) are all fired — 2026 active-coach distribution is compressed vs the paper's presentation.

---

## 2. Measured coaching / situational signals — 12 items verified (A3)

**Method:** each number checked against the cited source file in `~/workspace/vendor/Sports/docs/`.

| # | Signal | Measured value | Sample | Verified? |
|---|--------|----------------|--------|-----------|
| S1 | τ (see §1) | §1 above | nflfastR 2014–2022 | YES |
| S2 | Aggressive opening tactics → WP | +9.44–16.17pp (BCa at the mean); initial-scheme coeff +0.30 (p<0.001); **no out-of-sample; author-flagged endogeneity** | Serie A 157,985 events, 1,140 matches 2011/12–2013/14 | YES — **template only; the number must never enter the NFL model** |
| S3 | Bye-week advantage, 2011 CBA break | Pre-2011 PD +2.21 (CI 0.61–3.80) → post-2011 +0.31 (CI −1.01–1.64), P(decline)=96.6%; market +0.39→+0.97 (P(incr)=98.8%), overvalues by ~0.66 pts; mini-bye +0.48 n.s., MNF +0.14 n.s.; 2023 HA +1.65 vs market +1.74 | 5,679 NFL games 2002–2023; Bayesian state-space | YES |
| S4 | Complementary football: takeaway → next drive | Takeaway adds +0.6–1.0 pts/drive (parabolic, max ~2–2.5); median post-turnover start own 41 (+21 yds); turnover×start-position selected 100% of CV replicates | FBS 2014–2020 + NFL 2009–2017 | YES — **drive-level adjustment, not scheme-level** |
| S5 | 2nd-&-1 league pass rate | 2017 16.6% → 2025 20.6% → 2026 32.7% (**through Week 3**, not week 2 — map mislabels) | @RyanPaganetti X intake, nflverse-sourced | YES |
| S6 | Pass rate after successful 1st-down run | League 42.2% (113/268); CAR 87.5% (7/8); NYJ 0.0% (0/6) — **team n = 2–16 plays, descriptive only** | same intake | YES |
| S7 | Pass after stuffed run / run after incompletion | DEN 100% (11/11); league 43.4% run after incompletion; SEA 100% (3/3) | same intake | YES |
| S8 | QB first-read % + aggressiveness | Love 78.6%, Brissett 77.5%, Stroud 62.2%+21% agg; Purdy 27.0% (lowest) | single-week X-metric dumps | YES **from briefs; raw CSVs not re-verified; weekly DFS feature only** |
| S9 | Week-1 pace/scheme extremes | LAC 84.3% motion, TEN 22.4% no-huddle, WAS 14.7% RPO | 1 game per team | YES — descriptive only |
| S10 | NULL: 4th-down aggressiveness coaching prior (GSE lab) | walk-forward r = −0.014, n=255 → **measured zero** | GSE 2025 walk-forward | YES — keep at zero weight |
| S11 | NULL: officials scalarizer (GSE lab) | n=269 holdout r=+0.0274, slope +0.209 (SE 0.467) → DARK | 6,990 pre-2025 games + holdout | YES — officials stays DARK |
| S12 | Keenum rusty-QB target split | Layoff-return n=323: WR 62.2% (+2.6), RB/FB 17.6% (−2.4) — **single QB, 10 games** | single study | YES — replicate across backup-QB population first |

**Excluded from measured evidence:** `short-week-road-deficit.ts` spread adjustment (−1.75 baseline, "34% 4Q explosive plays") is LIVE in code with NO backtest and NO source — spec-rule-6 violation, not measured evidence. See `challenges.md`.

---

## 3. Regime-shift detector specs — verified against sources (A2)

**Scope honesty, verified for all four:** the NFL/coaching applications of 1905, 1888, 2129 are the **ledger readers' own implementation specs (§11) and improvement experiments (§14) — never run on any data.** Only 0598 has a real sports RUN result. The slice's "pre-registered" language is accurate; do not present the others as results.

| Method | Status | Key verified fact | Buildability rank |
|--------|--------|-------------------|-------------------|
| 0598 permutation two-sample regime gate (Rastogi et al. 2021) | **RUN** — European football 2016-17 vs 2017-18 FAIL TO REJECT, p=0.971 (EPL 0.998, Bundesliga 0.691, La Liga 0.67, Ligue 1 0.787) | Brief's T-statistic denominator was garbled in transcription; correct form per source Eq. 8: `[(k^p−1)(k^q−1)(k^p+k^q)]` | **#1 — build now** (~50–100 lines, no training) |
| 1888 AdaER interference-scored replay (Li, Tang, Li 2023) | SPEC — paper runs vision CL (Split-MNIST 89.6% +3.7%, CIFAR10 BWT +4.4); NFL port is reader's spec | Paper's "protect high-interference examples" must be **inverted** for regime change: pre-change high-conflict games encode the stale scheme → quarantine (×0.25), don't protect | #2 — needs champion/challenger GBM refit pipeline first |
| 1905 ADKL z^t drift (Tossou et al. 2019) | SPEC — never run; equations fully specified (DeepSets ψ_η Eq. 10, InfoNCE Eq. 12–13, linear base kernel beat RBF) | Drift threshold z ≥ 3.0 is an uncalibrated starting prior | #3 — ~3 weeks, no public code |
| 2129 ProbFM NIG epistemic head (2026) | SPEC — crypto demo only (Sharpe 1.33 vs 0.90); Gaussian likelihood misspecified for football | Hard gates pre-registered: REJECT for sizing if epistemic doesn't rise on held-out regime games | #4 — needs TSFM backbone first |

**Drift-magnitude answers (pre-registered, not measured):** 0598 → p<0.05 + ≥5pp sustained tendency shift (or ≥1.5 yds aDOT); 1905 → drift z ≥ 3.0 vs trailing-16-week distribution (calibrate: recall ≥0.6 on ~20 in-season firings, ≤2 false flags/team-season); 1888 → ≥50% of top-20 conflict games from one regime; 2129 → epistemic ≥2× trailing-8-week median for 2 consecutive weeks.

---

## 4. Ready-vs-directional classification

**READY (measured, nflverse-replicable, can become engine features now):**
1. **S3 rest-differential schedule features (0677)** — 5,679 games; all inputs computable from nflverse + odds. Gate: replicate post-2011 bye PD < 1.0 with market pricing ≥0.5 above it.
2. **S4 complementary-football drive features (0678)** — native nflverse fields; ~3-day refit. Gate: GS+SoS+Complem MAE beats SoS-only, non-overlapping SE, ≥4 of 10 seasons.
3. **S1 τ estimand (1575)** — public code; refit yearly (aggression trend makes stale τ̂ underrate current coaches).
4. **S5/S6/S7 Paganetti splits** — league-level rates are priors; team-level splits need rolling multi-season n before feature use.

**DIRECTIONAL (replicate before featuring):** S2 (1638 — soccer, no OOS, endogeneity: template only); S8 (single-week X intake); S9 (n=1 game/team); S12 (single QB).
**NULLs that arbitrate against features (measured evidence of absence):** S10 (4th-down aggressiveness r=−0.014 → zero weight), S11 (officials → DARK).

---

## 5. Provenance note

All four analysts worked from the phase-1 briefs and the c03 map, and re-verified numbers against `~/workspace/vendor/Sports/docs/` (read-only). Where briefs and sources disagreed in presentation (not in numbers), the source wins: 0598's Eq. 8 denominator, the 1575 brief path (r27 not r22), the Week-3 (not week-2) Paganetti window, the SE-by-convention on β_1. Open questions that need closing before numbers enter builder prompts or public content: the β_1 regression-table 2-minute PDF check, the Yam & Lopez 0.4 wins/year re-check, the 2024–2026 anti-bye replication, the 0598 half-split calibration on 2022–2025 stable eras.

## 6. Claims that failed verification

**None.** Every numeric and methodological claim in the briefs has a direct antecedent in its source ledger.
