# A1 — τ (fourth-down coach risk-preference) verification — slice c03

**Source ledger:** `~/workspace/vendor/Sports/docs/arxiv-program/research/2026-09-21/arxiv-deep/1575-learning-risk-preferences-fourth-down.md` (64 lines; ledger read = full text via ar5iv HTML; verdict ADAPT)
**Brief under verification:** `~/workspace/corpus-intelligence/briefs/c03/r27/docs__arxiv-program__research__2026-09-21__arxiv-deep__1575-learning-risk-preferences-fourth-down.brief.md`
**Paper:** Nathan Sandholtz, Lucas Wu, Martin Puterman, Timothy C.Y. Chan (2023), arXiv:2309.00756. Independently spot-checked on arxiv.org (submitted 1 Sep 2023, v3 15 Aug 2024): title, authors, abstract all match the ledger. The abstract independently confirms the three headline qualitative claims (low-quantile/conservative behavior, higher risk tolerance in opponent half, rising risk tolerance over time).
**Verified:** 2026-10-02 by Deep Analyst A1.

Notation: `ledger:<line>` = line in the source ledger file above.

---

## 1. Verified claims (claim → source line → verdict)

| # | Claim (as stated in brief / map) | Source | Verdict |
|---|----------------------------------|--------|---------|
| V1 | Performance regression β_1(τ̂) = 0.769*** (SE 0.138) | ledger:43 (Eq. spec ledger:27) | **VERIFIED** |
| V2 | Partial R² = 0.048 (R² = 0.059, adj. R² = 0.054, F = 12.860***) | ledger:43 | **VERIFIED** |
| V3 | N = 622 coach-season-WP-region cells | ledger:43 | **VERIFIED** |
| V4 | ~Half of coaches risk-seeking vs risk-neutral in opponent half at low WP; Matt Nagy, Jay Gruden, Mike McCarthy, Doug Pederson medians even exceed the 4th Down Bot; no coach's median τ̂_2 (own half) exceeds the risk-neutral reference in any WP range | ledger:42 | **VERIFIED** |
| V5 | τ̂_opponent-half − τ̂_own-half > 0 with 95% CIs excluding 0 until WP ≥ 0.8; gap dissipates as WP → 1 | ledger:38 | **VERIFIED** |
| V6 | League risk tolerance increased over 2014–2022 in every WP × region cell, more pronounced in the opponent's half | ledger:40 | **VERIFIED** |
| V7 | League aggregate: coaches optimize *low quantiles* of next-state value (conservative) in both regions and nearly every WP range, vs the 4th Down Bot | ledger:37 | **VERIFIED** (abstract corroborates) |
| V8 | Bot−League gaps largest in own half at low WP; only exception opponent half at WP < 0.05 (league τ̂ matches Bot) | ledger:39 | **VERIFIED** |
| V9 | Q4 vs Q1–Q3 indistinguishable except WP < 0.2, where Q4 much more risk-tolerant | ledger:41 | **VERIFIED** |
| V10 | Own-half behavior uniform across coaches; opponent-half shows wide variation | ledger:42 | **VERIFIED** |
| V11 | Data: nflfastR play-by-play, 9 seasons (2014–2022), via nflfastR R package (Carl and Baldwin 2024); WP from Carl and Baldwin 2024 tree model (score differential, time remaining, Vegas pregame spread); FiveThirtyEight Elo (archived CSV) | ledger:14, ledger:46 | **VERIFIED** |
| V12 | Forward model: one-period MDP, actions {GO, FGA, PUNT}; future play after t+1 follows fixed league-average stationary policy π̄; rewards r(TD)=6.95, r(FG)=3, r(SAF)=−2, negated for team B (Eq. 3.3) | ledger:17, ledger:20 | **VERIFIED** |
| V13 | Candidate objective: q^π̄_τ(σ,a) = Q_τ[V^π̄(σ,a)] = inf{x : τ ≤ F_{V^π̄}(x|σ,a)} (Eq. 4.6) | ledger:23 | **VERIFIED** |
| V14 | Inverse problem: min_τ (1/N)Σ 1(a_j ≠ a*_j) — average Hamming loss (Eq. 4.11); two-region joint estimation of (τ_1, τ_2) (Eq. 5.5); L=2 only, L ≥ 3 underidentified given \|A\|=3 | ledger:17, ledger:24, ledger:34 | **VERIFIED** |
| V15 | Quantiles regularized with bivariate monotonic smoothing (SCAM, Pya & Wood 2015 tensor-product penalized B-splines, k=4 knots, monotonic-decreasing in yardline and yards-to-go); GO transitions augmented with 3rd-down plays à la Romer 2006 vs Daly-Grafstein 2023 selection bias | ledger:17 | **VERIFIED** |
| V16 | Inference restricted to τ ∈ [0.2, 0.8] (τ-optimal policies plateau at extremes); point estimates = medians of optimal-τ sets; multiple τ minimize loss per bootstrap sample | ledger:17, ledger:34 | **VERIFIED** |
| V17 | Uncertainty: 200 game-level bootstrap samples (preserving within/across-drive dependence), 95% CIs on τ̂ and all contrasts | ledger:14, ledger:17, ledger:34 | **VERIFIED** |
| V18 | Coach-team plots restricted to coaches with ≥25 observed 4th-down decisions per field region per WP range | ledger:14, ledger:34 | **VERIFIED** |
| V19 | 4th Down Bot (Baldwin 2024, nfl4th) + a risk-neutral policy run through the identical inverse pipeline as reference "translations" | ledger:17, ledger:34 | **VERIFIED** |
| V20 | Reproduction code at https://github.com/nsandholtz/fourth_down_risk (R); all reproducible from public sources | ledger:14, ledger:46 | **VERIFIED** (not fetched, per instructions) |
| V21 | The exact estimand: τ per coach-team × field region × WP bin | ledger:52 | **VERIFIED** |
| V22 | Yam & Lopez 2019 ~0.4 wins/year cost of excessive risk aversion | ledger:43 | **VERIFIED as a ledger claim** — ledger cites it from the paper; the Yam & Lopez value itself was not independently re-checked |
| V23 | Verdict ADAPT; replaces ledger 1567 (2502.08430, REJECT) | ledger:1, ledger:5, ledger:8 | **VERIFIED** |

**No claim in the brief failed verification.** Every numeric and methodological claim in the brief has a direct antecedent in the source ledger.

---

## 2. Corrected claims

1. **Brief location is `c03/r27/`, not `c03/r22/`.** Both this subagent's task text and the c03 map's Top-20 finding #1 cite `r22/docs__arxiv-program__research__2026-09-21__arxiv-deep__1575-learning-risk-preferences-fourth-down.brief.md`. No such file exists in `r22/`. The only 1575 brief in the c03 tree is `~/workspace/corpus-intelligence/briefs/c03/r27/docs__arxiv-program__research__2026-09-21__arxiv-deep__1575-learning-risk-preferences-fourth-down.brief.md` (confirmed by `find`; the r27 location is also what the aggregator synthesis `/tmp/c03_agg_1.md:12` uses). **Fix: update the map's finding #1 path from `r22/` to `r27/`.**
2. **"SE 0.138" is a conventional reading, not an explicit ledger label.** Ledger:43 writes `β_1(τ̂) = 0.769*** (0.138)` without naming the parenthetical. Reading it as the standard error is the only coherent interpretation (it pairs with the *** significance marking), but a builder reproducing the table should treat the SE label as INFERENCE-by-convention rather than ledger-stated.
3. **"The estimand itself is the deliverable" is map/aggregation shorthand, not a ledger quote.** The ledger's actual gates are: (a) acceptance rationale at ledger:61 (full NFL paper, public data + code, bootstrapped τ̂, coach heterogeneity, β_1=0.769***, direct GSE application); (b) the concrete reproducible backtest at ledger:58 (team-specific τ̂ rule beats risk-neutral WP-max rule by ≥3 pp Hamming accuracy in the opponent half on 2024–2025 4th downs; second sanity gate vs the Bot). The shorthand is consistent with the ledger but a builder should implement the ledger:58 gates, not the slogan.
4. **Limitations section claim "τ explains only ~5% of 4th-down points variance"** — correctly derived from ledger:43 (partial R² 0.048) and ledger:49 ("Low R² (0.059)... τ̂ explains ~5% of 4th-down points variance"). Not a failure; included here because the ~5% figure matters for expectation-setting: τ is a real but small-variance-explained feature.

---

## 3. Replication recipe (exact, from the ledger)

**Data source** (ledger:14, ledger:46)
- nflfastR NFL play-by-play, 9 seasons (2014–2022), via the nflfastR R package (Carl and Baldwin 2024). Fields: down, yards to go, yardline, play type, time remaining, score differential, derived drive length, estimated win probability.
- Win-probability estimates: Carl and Baldwin 2024 tree-based model (inputs: score differential, time remaining, Vegas pregame spread).
- FiveThirtyEight Elo (archived CSV) as the team-strength covariate in the performance regression.

**Estimand definition** (ledger:31, ledger:52)
- τ̂ = the quantile τ ∈ [0,1] of the next-state value distribution that makes observed 4th-down decisions minimally suboptimal under the τ-quantile MDP.
- Fit per **coach-team × field region (own half / opponent half, split at the 50) × WP bin** (paper uses 20 WP bins in robustness cuts; ledger:34).
- Point estimates = medians of the optimal-τ sets per bootstrap; inference restricted to τ ∈ [0.2, 0.8] because τ-optimal policies plateau at the extremes (ledger:17, ledger:34).
- Coach-team cells require ≥25 observed 4th-down decisions per field region per WP range (ledger:14, ledger:34).
- Uncertainty: 200 game-level bootstrap samples (preserving within/across-drive dependence) → 95% CIs on τ̂ and on all contrasts (τ̂_1−τ̂_2, Bot−League) (ledger:34).

**Method pipeline** (ledger:17, ledger:20, ledger:23–27, ledger:34)
1. Forward model: one-period MDP, actions {GO, FGA, PUNT}; future play after t+1 follows fixed league-average stationary policy π̄ (a Markov reward process).
2. Rewards (Eq. 3.3): r(TD)=6.95 (6 + league-average conversion value), r(FG)=3, r(SAF)=−2; negated for team B.
3. Next-state value (Eq. 4.3): V^π̄_t(σ,a) := r(S_{t+1}(σ,a)) + E_π̄[Σ_{n=t+2}^{T} r(S_n) | S_{t+1}(σ,a)]. Value function via the infinite-horizon approximation of Chan, Fernandes and Puterman 2021.
4. Candidate objective (Eq. 4.6): q^π̄_τ(σ,a) = Q_τ[V^π̄(σ,a)] = inf{x : τ ≤ F_{V^π̄}(x|σ,a)}. Using the next-state value instead of the full return deliberately avoids assuming coaches use the same quantile in all future situations.
5. Transitions: empirical proportions p̂(s′|σ,a), p̂(s′|s,π̄) (Eq. 5.1–5.2); quantiles from the empirical next-state value distribution (Eq. 5.4).
6. Regularization: bivariate monotonic smoothing (SCAM, Pya & Wood 2015 tensor-product penalized B-splines, k=4 knots, monotonic-decreasing in yardline and yards-to-go); GO-transition augmentation with 3rd-down plays à la Romer 2006 to counter Daly-Grafstein 2023 selection bias.
7. Inverse problem: min_{τ∈[0,1]} (1/N)Σ_j 1(a_j ≠ a*_j(σ_j, q^π̄_τ)) — average Hamming loss between observed decisions and τ-optimal decisions (Eq. 4.11). Two-region version (Eq. 4.12); joint estimation of (τ_1, τ_2) (Eq. 5.5). **L ≥ 3 partitions are underidentified given |A|=3** — hard ceiling at two regions.
8. Reference "translations": 4th Down Bot (Baldwin 2024, nfl4th) and a risk-neutral policy run through the identical inverse pipeline.

**Code repo** (ledger:46; NOT fetched per instructions)
- https://github.com/nsandholtz/fourth_down_risk — R reproduction code; data via nflfastR; references nfl4th (Baldwin 2024), scam, FiveThirtyEight Elo (archived CSV). Ledger states: "All reproducible from public sources."

**Acceptance gates** (ledger:58, ledger:61; these are the ledger author's proposed gates, not paper results — INFERENCE vs paper facts)
- Gate 1 (backtest): on 2024–2025 4th downs, compare three predictors — (a) risk-neutral WP-max rule, (b) league-average τ̂ rule, (c) team-specific τ̂ rule — on Hamming accuracy of actual GO/FGA/PUNT calls, stratified by field region. **Pass: (c) beats (a) by ≥3 percentage points of accuracy in the opponent half** (where coach variation is largest).
- Gate 2 (sanity): simulate expected-points gained by "follow τ̂-optimal vs follow Bot" on the 2024 season; τ̂-optimal must not underperform the Bot by more than the bootstrap CI width.
- Acceptance: full NFL paper + public data/code + bootstrapped τ̂ + coach heterogeneity + significant performance association (β_1=0.769***) + direct GSE application. (The map's "the estimand itself is the deliverable" = shorthand for this.)

---

## 4. Open questions

1. **Regression-table provenance.** The brief's exact numbers (β_1=0.769, partial R² 0.048) trace to ledger:43, and the ledger claims a full-text ar5iv read. The paper PDF's table was not re-checked in this pass; if these numbers land in a builder prompt or public content, a 2-minute check against the paper's regression table would close the loop.
2. **Yam & Lopez 2019 ~0.4 wins/year.** Ledger-cited from the paper; the underlying number was not independently verified. Do not quote it in @GalaxySportsHQ content until confirmed.
3. **WP-stratifier circularity.** Acknowledged in the paper/ledger (ledger:49): the Carl-and-Baldwin WP tree includes the Vegas spread, and markets price in coaching tendencies, so WP stratification carries mild circularity. Direction of bias on τ̂ is not quantified — open for a sensitivity note in the builder spec.
4. **Non-stationarity.** The aggression trend (ledger:40, ledger:49) means 2014–2022 τ̂ underrates current aggression. Any build must refit on 2014–2025+ nflverse data; the ledger's implementation spec (ledger:55) already requires offseason refits.
5. **Residual selection bias.** The Bot's "translated" τ also differs by region — a fingerprint of residual Daly-Grafstein selection bias even after 3rd-down augmentation (ledger:49). Region gaps are partly inflated; report with that caveat.
6. **Scope boundary.** τ covers 4th downs only. The map's coaching-tendency gaps still stand: no early-down pass-rate-over-expectation, play-action, 2-pt, timeout/challenge, or HC-vs-OC attribution estimands anywhere in the slice (per /tmp/c03_agg_1.md:71).
