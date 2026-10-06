# [1461] Beyond Winning: Margin of Victory Relative to Expectation Unlocks Accurate Skill Ratings (arXiv:2506.00348)

**Citation:** Shivam Shorewala, Zihao Yang (2025). *Beyond Winning: Margin of Victory Relative to Expectation Unlocks Accurate Skill Ratings*. arXiv:2506.00348v1 [stat.AP]. URL: https://arxiv.org/abs/2506.00348
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, converted via pdftotext; 5,431 words).
**Verdict:** ADAPT — the margin-surprise update (rating step scaled by actual-minus-expected margin) is worth an independent, strictly chronological reimplementation for GSE's NFL team-strength layer; do not trust the paper's reported numbers or references without reproducing them.

## 1. Research question
Does conditioning an Elo-style rating update on *how much a team beat or missed its expected margin of victory* — not just whether it won — produce faster-converging, better-calibrated skill ratings than standard Elo, Glicko-2, TrueSkill, or a linear margin-of-victory Elo variant?

## 2. Dataset / schema
**13,619 NBA regular-season games, 2013–2023**, from the Kaggle "Wyatt Owalsh Basketball" dataset (name as given in paper). Schema per game: home/away team IDs, actual margin of victory (TMOV), home-court indicator. Initial ratings all 1500. Split stated as: first 70% chronological "training" (hyperparameter tuning of α, β, γ, δ, K, λ), next 20% "testing" (comparison table), final 10% hold-out. Note the paper's own inconsistency: the main results table is labeled as the test set while an ablation table reports slightly different numbers for the same method (see §7).

## 3. Method / model
MOVDA (Margin of Victory Differential Analysis), an Elo-style sequential update:
1. Expected outcome E_A from the logistic of the rating gap (standard Elo expectation).
2. **Expected margin:** E_MOV = α·tanh(β·ΔR) + γ + δ·I_HA, where ΔR is the rating difference and I_HA is the home-advantage indicator; parameters (α, β, γ, δ) fit on the training split.
3. **Surprise margin:** ΔMOV = TMOV − E_MOV.
4. **Rating update:** R'_A = R_A + K·(S_A − E_A) + λ·ΔMOV; R'_B = R_B − K·(S_A − E_A) − λ·ΔMOV (zero-sum; note the paper prints the B update inconsistently — own inference: the update must be symmetric to conserve rating mass, so this is the only consistent reading).
5. Baselines: standard Elo, linear MOV Elo (update scaled by raw margin), Glicko-2, TrueSkill.

## 4. Equations & assumptions
- E_MOV = α tanh(β ΔR) + γ + δ I_HA (expected margin as bounded nonlinear function of rating gap plus home term).
- ΔMOV = TMOV − E_MOV.
- R'_A = R_A + K(S_A − E_A) + λΔMOV (S_A ∈ {0,1} actual outcome; E_A the Elo expectation).
Assumptions: outcomes of different games are treated as independent; margins are i.i.d. given ratings; the tanh parameterization is chosen ad hoc (no derivation from a generative model); hyperparameter selection on the first 70% is assumed not to leak into the 20% test split (stated, not demonstrated — tuning criterion unstated).

## 5. Features / target
Inputs: rating difference ΔR, actual margin TMOV, home-court indicator. Targets evaluated: out-of-sample win/loss accuracy (Brier score also reported). Convergence speed: number of games for a new team's rating to stabilize (paper's "convergence" metric, exact stabilization criterion not fully specified).

## 6. Validation design
Chronological split: 70% (2013–~2020) for parameter tuning, 20% (~2020–2022) for the comparison table, 10% (~2022–2023) hold-out. Metrics: accuracy, Brier score, and convergence games. Baselines compared: Standard Elo, Linear MOV Elo, Glicko-2, TrueSkill. Time-ordering respected in the split design — but the ablation table's mismatched numbers (below) undermine confidence that the reported split was the one actually used.

## 7. Numerical results / baselines
Quoted exactly from the main comparison table (paper's labels; 20% test split):
- Standard Elo: accuracy **62.77**, Brier **0.2274**, convergence **193** games.
- Linear MOV Elo: 63.18, 0.2282, 199.
- Glicko-2: 63.18, **0.2264**, 189.
- TrueSkill: 62.66, 0.2294, 192.
- MOVDA: accuracy **63.32**, Brier **0.2258**, convergence **166**.
The paper's ablation table reports MOVDA as **63.24 / 0.2259 / 166** — inconsistent with the main table (63.32 / 0.2258). The abstract/conclusion claims "1.54% lower Brier, 0.58 percentage-point higher accuracy, and 13.5% quicker convergence versus TrueSkill" — own arithmetic check: (0.2294−0.2258)/0.2294 = 1.57% (not 1.54%), 63.32−62.66 = 0.66 pp (not 0.58), (192−166)/192 = 13.5% (matches). The first two claims do not reproduce from the paper's own table.

## 8. Code / data availability
Code: "available upon request." Data: Kaggle Wyatt Owalsh Basketball dataset (public). Neither allows independent verification from the paper alone.

## 9. Leakage & limitations
- **Internal inconsistency:** main table vs ablation table disagree on MOVDA's own numbers (63.32 vs 63.24; 0.2258 vs 0.2259). A paper that cannot reproduce its own headline numbers in its own tables cannot be trusted on smaller claims.
- **Claim arithmetic fails:** two of three abstract percentage claims do not match the tables (1.54% vs 1.57%; 0.58 pp vs 0.66 pp). Minor, but it shows the numbers were not checked.
- **Suspicious detail:** "34 teams present throughout test" — the NBA has 30 teams over 2013–2023; the extra 4 are unexplained (relocations? G-League bleed? own inference: likely a data-cleaning artifact, unaddressed).
- **References:** several citations appear malformed or topically unrelated on inspection — treat the literature review as unreliable.
- Tuning criterion for (α, β, γ, δ, K, λ) unstated; risk of test-set peeking is real given the above.
- Convergence metric ("games to stabilize") is not defined with a threshold; the 166 vs 193 comparison is uninterpretable without it.
- External validity to NFL: NBA margins are high-variance and pace-inflated; NFL margins are compressed and spread-market-anchored. The tanh expected-margin shape may not transfer; home advantage (δ) is structurally different in football.
- Be adversarial: this is a *method worth stealing and a paper worth distrusting* — every number above should be treated as a hypothesis until GSE reproduces it on NFL data.

## 10. GSE overlap
Per the existing-research map: GSE's 26-metric catalog already carries Elo, Glicko (mentioned), TrueSkill (mentioned), Bradley-Terry, and Massey/Sagarin/Colley ratings; benbbaldwin objective ratings v2 and nfelo are inventoried in the repo; margin-aware variants are NOT in the corpus (the map lists plain Elo/Glicko/TrueSkill only). What's NEW here: the specific expected-margin residual update — rating step = K·(outcome surprise) + λ·(margin surprise against a rating-implied expected margin), with the expected margin itself a learned tanh function of the rating gap. This is a genuine extension over the catalog's linear MOV handling (the paper's Linear MOV Elo baseline, which MOVDA beats 63.32 vs 63.18). No duplication; but per the integrity rule, implement from the equations (§4), not from the reported results.

## 11. GSE implementation spec
- Implement MOVDA from scratch on nflverse game scores, 2006–2025: fit (α, β, γ, δ) for expected margin on 2006–2019, tune (K, λ) on 2020–2021, test on 2022–2025 — strictly chronological, with the tuning criterion (minimize Brier) declared in advance.
- Define convergence operationally (e.g., games until |ΔR| rolling-8-game mean < 2 points) before running, so the comparison is well-defined.
- Compare against GSE's existing strength ratings (benbbaldwin v2 objective ratings, plain Elo) on the same windows with accuracy + Brier + the pre-registered convergence metric.
- Effort: 2–3 days in Python (pandas + scipy.optimize for the tanh fit); serving: recompute weekly as a batch feature feeding the spread/total model.

## 12. Reproducible test
Dataset: nflverse schedules/scores 2006–2025. Baselines: plain Elo (K tuned), linear-MOV Elo, and the repo's benbbaldwin v2 objective ratings. Metrics: out-of-sample moneyline accuracy, Brier score, and pre-registered convergence games (definition in §11). Window: train ≤2019, tune 2020–2021, test 2022–2025. MOVDA passes if it beats plain Elo by ≥0.3 pp accuracy AND ≥0.002 Brier on the test window — thresholds scaled to NFL margin compression (smaller than the paper's claimed NBA gaps, since NFL margins carry less signal).

## 13. Acceptance / rejection gate
ADOPT the margin-surprise update into the team-strength layer if it clears the §12 gate on 2022–2025 NFL hold-out with no tuning after the gate is set. REJECT (do not merge) if it fails either metric, if the tanh fit is unstable across refits (parameter CV > 25%), or if it underperforms linear-MOV Elo — the paper's own weakest baseline. Under no circumstances cite the paper's 63.32 / 0.2258 / 166 numbers in any GSE publication until the NFL reproduction exists.

## 14. Improvement experiment
Replace the ad-hoc tanh expected-margin with a market-informed one: E_MOV = spread-implied expected margin (from the closing line) rather than a rating-fitted curve. Then the update's margin-surprise term ΔMOV becomes "how much the result surprised the *market*", not "how much it surprised our own ratings" — which (a) removes the circularity of ratings predicting margins that update ratings, (b) connects directly to GSE's CLV lane, and (c) tests whether the paper's gains came from the margin-residual idea or merely from fitting NBA margin shapes. If market-anchored MOVDA beats rating-anchored MOVDA on NFL hold-out, ship that variant instead.
