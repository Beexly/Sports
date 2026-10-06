# 0175 Using Experts' Opinions in Machine Learning Tasks (arXiv:2008.04216)

**Citation:** Habibi, J., Fazelinia, A., & Annamoradnejad, I. (2020/2021). *Using Experts' Opinions in Machine Learning Tasks*. arXiv:2008.04216 (v1: 2020-08-10; v2: 2021-07-06; **v3: 2021-12-03 — withdrawn**). URL: https://arxiv.org/abs/2008.04216v3
**Ledger completed:** 2026-09-21. **Read:** full v2 text (arXiv PDF, 978 extracted lines, read 0–978) plus the v3 withdrawal notice via ar5iv.
**Verdict:** REJECT — the paper was withdrawn by its own author, who stated the results and model structures are flawed; none of its numerical claims can be treated as evidence. The generic three-step "rank sources, select top-N, merge" ensembling concept is trivially known and adds nothing to GSE's existing model-averaging practice.

## 1. Research question
Can unproven expert insights (opinions, polls, betting odds), systematically ranked by past predictive accuracy and merged, improve machine-learning prediction — here applied to NCAA Men's Basketball (March Madness) win-probability forecasting? A secondary claim: past Kaggle winners' success is "a result of chance" rather than stable models. (Abstract, Sections 1, 4.)

**⚠ WITHDRAWAL STATUS:** v3 (2021-12-03) withdraws the paper. Author Issa Annamoradnejad's comment: *"These initial results and concrete model structures are flawed and do not represent the work."* All numerical claims below are the **withdrawn v2** claims and are documented here for the ledger only — **do not cite or act on them as valid results.**

## 2. Dataset / schema
- **Kaggle NCAA March Madness data** (Section 4.A): six data sections, 20+ tables; models used **only section 4** — weekly team rankings from dozens of rating systems (KenPom/Pomeroy, Sagarin, RPI, ESPN, AP, …) since 2002–03. Section-4 table columns: Season/year, team ID, system name, ranking day number (0–133 relative to season start), overall rank of team.
- **Target event:** March Madness final rounds, 68 teams → 2,278 unique possible games; win probability for every possible game.
- **Evaluation:** backtested 2017, 2018, 2019 Kaggle competitions (2020 canceled due to COVID-19) using Kaggle's post-deadline re-submission feature; competitors per year: 866 / 934 / 441.
- No code or data URL stated (Kaggle competition pages referenced by name only).

## 3. Method / model
- **General three-step framework (Section 3.A):** (1) rank experts ER_1…ER_n by accuracy of previous predictions (Formula 1 — exact rendering **UNCERTAIN**, extraction garbled); (2) find the optimal number N by evaluating accuracy of top-k experts for all k on previous results (Formula 2 — **UNCERTAIN**; one variant merges with exponentially decreasing weights); (3) meld the top-N experts' predictions for target games (output of MERGE function). Step-3 output is the final prediction.
- **Four concrete models (Section 3.B):**
  - **E1:** rank rating systems by accuracy in the previous year's final rounds; merge top-N by simple equal-weight average; N chosen to maximize mean accuracy on the previous year.
  - **E2:** same ranking as E1; merge with weighted average, exponentially decreasing weights.
  - **E3:** rank systems by accuracy on the current year's regular season (rankings around day ~100 used to predict remaining regular-season games); merge top-N by simple average.
  - **E4:** like E3, but merge with exponentially decreasing weighted average.
- **Blends (Group 3):** B1 (2019 1st-place model) ensembled with E2 and with E4.
- **Baselines (Group 1):** B1 = 2019 competition 1st rank; B2 = 2nd; B3 = 3rd; B1+B2+B3 ensemble. Winners' code rerun on 2017/2018 via post-deadline submission.

## 4. Equations & assumptions
- Log loss (binomial deviance), Eq. 3 [rendering **UNCERTAIN** — extraction garbled; standard form is LL = −(1/N) Σ (y log p + (1−y) log(1−p)), but the paper's typeset equation could not be read cleanly]: variables described as N = number of games, p = winning probability of team 1 vs team 2, y = 1 if team 1 wins else 0; "A smaller value of LL indicates better performance."
- Formula 1 (expert ranking/merging selection) and Formula 2 (final merge) are both **UNCERTAIN** — PDF extraction garbled both equations beyond reconstruction; the ledger does not reproduce them.
- **Assumptions (withdrawn):** rating systems = "experts"; past accuracy predicts future accuracy; merging via (weighted) means is sufficient; stability across 3 seasons implies a good model; Kaggle leaderboard ranks are a meaningful generalization metric.

## 5. Features / target
**Features:** ranking positions from expert rating systems only (KenPom, Sagarin, RPI, ESPN, AP, etc.); seven-column section-4 table. **Target:** binary win/loss per possible tournament game, evaluated on probabilistic log loss. **Horizon:** single-tournament (March Madness) prediction.

## 6. Validation design
Backtest on the three most recent consecutive competitions (2017–2019) to avoid overfit/chance winners. Baselines = actual top-3 2019 models rerun on 2017/2018. Metrics: log loss per year + 3-year mean + Kaggle leaderboard rank. No statistical tests; no cross-validation; 3 tournament seasons total.

## 7. Numerical results / baselines (ALL WITHDRAWN — for the record only)
Exact v2 Table 1 values (per-year log loss; second line = leaderboard rank):

- B1 (2019 1st): 0.41477 / 0.60213 / 0.49082, mean **0.503** — ranks 1st/866, 349th/934, 88th/441.
- B2: 0.42012 / 0.85021 / 1.40911, mean **0.886** — 2nd/866, 808th/934, 435th/441.
- B3: 0.42698 / 0.60685 / 0.50452, mean **0.511** — 3rd/866, 395th/934, 150th/441.
- B1+B2+B3: 0.48548 / 0.58755 / 0.59708, mean **0.556**.
- E1: 0.49388 / 0.58088 / 0.49734, mean **0.523** — 329th, 83rd, 121st.
- E2: 0.47376 / 0.58750 / 0.48506, mean **0.515** — 191st, 155th, 61st.
- E3: 0.45355 / 0.58894 / 0.46441, mean **0.502** — 56th, 172nd, 6th/441.
- **E4: 0.45334 / 0.57293 / 0.44496, mean 0.491** — 55th/866, 32nd/934, 2nd/441.
- B1+E2: 0.43231 / 0.58858 / 0.47956, mean **0.500** — 7th/866, 171st/934, 46th/441.
- **B1+E4: 0.41622 / 0.58546 / 0.46505, mean 0.489** — 2nd/866, 130th/934, 7th/441.
- Paper's (withdrawn) headline claims: past winners' good scores "are most likely a result of chance"; proposed models "can achieve more steady results with lower log loss average (best at 0.489) compared to the top solutions of the 2019 competition (>0.503), and reach the top 1%, 10% and 1% in the 2017, 2018 and 2019 leaderboards, respectively."

## 8. Code / data availability
None stated. Kaggle competition datasets referenced by name ("Google Cloud & NCAA® ML Competition 2018-Men's," etc.); no URLs in the extracted text beyond named sites.

## 9. Leakage & limitations
- **The paper is withdrawn as flawed by its author** — every result above is invalid for decision-making. The v1→v2→v3 arc suggests the author re-examined the work and rejected it; no successor version exists.
- Methodologically, even ignoring withdrawal: E3/E4 rank experts on same-year regular-season results (day ~100) then predict the tournament — a mild look-ahead design choice; only 3 tournament seasons evaluated; no significance testing; leaderboard ranks conflated with generalization.
- Basketball-tournament, rating-system-only features: no direct NFL port.
- The "chance" critique of Kaggle winners is asserted from variance across 3 seasons, not from a statistical test (noted for completeness; the claim is withdrawn).

## 10. GSE overlap
Per existing-research-map: ensembling/averaging of multiple model opinions is already a standing GSE concept (the engine blends multiple signals). The paper's only transferable residue is the trivial procedure "rank information sources by historical log-loss, merge the top-N" — generic ensembling hygiene, not novel. The NCAA-rating-system apparatus does not overlap GSE's NFL pipeline. Nothing to extend or port; the withdrawal removes any evidence weight.

## 11. GSE implementation spec
None — REJECT. Do not implement. The only salvageable residue is already standard practice: when blending GSE's model components (engine signals, market consensus, expert systems), weight by out-of-sample log-loss history rather than equal weighting. This is already the intended GSE calibration posture and needs no new build.

## 12. Reproducible test
Not applicable — no withdrawn result can serve as a test target. If the *concept* (top-N-by-historical-accuracy blending of rating-like sources) were ever re-examined, the honest test would be: on NFL 2020–2024, compare equal-weight vs historical-log-loss-weighted blends of GSE's probability sources on chronological holdouts. But this is GSE-internal validation of existing practice, not a paper-driven test.

## 13. Acceptance / rejection gate
**REJECT.** Gate: adopt nothing from this paper unless a non-withdrawn successor version is published and passes the standard acceptance gate (beats GSE's current ensembling on chronological NFL holdouts by ≥ 1 pp log-loss-weighted ROI with statistical significance). Until then, all v2 numbers in Section 7 are historical curiosities only.

## 14. Improvement experiment
None warranted. If a successor version appears: the interesting axis the authors never explored is *why* expert ranking transfers — test whether the top-N selection is stable year-to-year (rank correlation of expert accuracy ranks across seasons) on a larger sample of tournaments, and whether the exponentially-decaying weighted merge beats performance-weighted logistic stacking. But no GSE time is allocated to a withdrawn paper.
