# Challenges — c10 HALF A (r01–r30)

Every challenged claim in this half: what is weak, inflated, vacuous, or rejected — why — and what would rehabilitate it. REJECT-verdict methods stay rejected; that is stated explicitly in each case. Numbers below were verified against the cited source files (see `verified-claims-partA.md`).

---

## A. Inflated or misleading numbers (the honest delta is smaller)

### 1. r26/1516 — SEL features: 60.11% → 81.32% accuracy is a leakage signature, not a breakthrough
Claim: Random Forest accuracy jumps 21.2pp (60.11% → 81.32%, Brier 0.4837 → 0.3145) from two "strength of early lineup" features.
Why challenged: the source file itself flags it (INFERENCE by the deep-read author): the paper does not state strengths were re-estimated strictly as-of each match date (expanding window). A 21-point jump from two features on a 250-game test set is the classic leakage shape. Also: single small test window (250 games, one sport/gender, three months), no opponent adjustment in strength estimation (unbalanced schedules), no CIs.
Status: ADAPT with the numbers treated as **upper bounds achievable only with future information**.
Rehabilitate: re-run expanding-window with as-of-date strength estimates; report the with/without-SEL delta on that run. The SEL *pattern* (early-lineup strength) is portable; the *numbers* are not.
Source: `arxiv-program/research/2026-09-21/arxiv-deep/1516-prediction-of-handball-matches-with-statistically.md`

### 2. r04/0178 — serve prediction 83.18% vs betting odds 69.04%: probable target leakage
Claim: RF 83.18% accuracy beats betting odds' 69.04%.
Why challenged: the decisive serve features (FirstWonFirstIn, SecondWonSecondIn) have no stated pre-match aggregation window and appear sourced from per-match charting — i.e., the features likely contain the outcome being predicted. Odds still achieved the highest total confidence score (2059.66) despite lower accuracy, which is consistent with odds being calibrated and the RF being sharp-but-leaky.
Status: **REJECT stays rejected.**
Rehabilitate: pre-match-only feature windows, walk-forward evaluation, calibration comparison (not just accuracy).

### 3. r03/0049 — the +21.3% headline is a straw-man comparison; honest delta is +5.2%
Claim: relativized features beat absolute features by +21.3% AUC.
Why challenged: +21.3% is relative-vs-*single*-absolute; vs the *two-feature* absolute the delta is **+5.2%**, and in head-to-head trials relative beats two-feature in only 51% of accuracy / 61% of AUC trials — a statistical tie, exactly as the paper's theory predicts. The brief already makes this correction; the challenge is to anyone quoting the headline.
Status: ADAPT, but the gate (≥0.01 AUC vs the **relativized twin**) exists precisely because of this.
Rehabilitate: pre-register the two-feature-absolute baseline in every future relativization test.

### 4. r25/1448 — the +2.8pp accuracy gain is largely from dropping draw modeling, not better skill
Claim: G-Elo accuracy 0.6656 vs Elo-Davidson 0.6375 (+2.8pp), LS 0.6224 vs 0.6304, RPS 0.2166 vs 0.2200.
Why challenged: the source notes the accuracy gain comes "largely from dropping draw modeling" — a modeling-scope choice, not evidence of superior skill estimation. On EPL the same method gives small consistent LS/RPS gains with accuracy flat (0.5389 vs 0.5442). NFL-only +2.8pp on one dataset is a single-source risk.
Status: ADAPT, with the gate (ΔLS ≥ 0.005 AND accuracy ≥ baseline+1pp on 2019–2023) and a re-score under the ignorance rule (r21/1083 says ignorance > Brier > RPS at low imperfection).
Rehabilitate: show the LS/RPS gain persists after re-scoring under ignorance, and decompose accuracy gain into draw-modeling vs skill-estimation components.

### 5. r29/1608 — quote the capped number, not the uncapped one
Claim: uncapped theoretical profit $4,418.44 (single-market arb).
Why challenged: the executable number is **$210.19 capped** ($100/episode); the uncapped figure assumes infinite liquidity at top-of-book in markets where 76.9% of combinatorial episodes are liquidity-constrained (average executable size 14.79 shares). Median ex-outlier yield is 11.0% / $11.01 per episode.
Status: ADAPT as measurement methodology; the capped series is the only one that may inform sizing.
Rehabilitate: depth-walked executable profit (the r29/1618 Eqs. 2–4 framework) replaces both.

### 6. r22/1143 — corr ≈ 1 means the value is uncertainty, not new rankings
Claim: rGAX residualized metric — corr(GAX,rGAX) = 0.998, robustness slopes 0.936 vs 0.757, NFL corr(CPAE,rCPAE) = 0.997.
Why challenged: correlation ≈ 1 with the raw metric *everywhere* — rGAX does not re-rank anyone. The marginal product is the CI/p-value machinery, and the paper's figures are **not multiplicity-corrected**.
Status: ADOPT, but ship CIs with Bonferroni-Holm/BH/BY correction for decision use — never a "new leaderboard."
Rehabilitate: demonstrate a decision that changes under multiplicity-corrected rGAX CIs vs raw GAX ranks.

### 7. r10/0424 — the contamination bias is real but second-order vs noise
Claim: Messi GAX 127.6 → 120.8 under contamination; corrected 127.57 → 149.99.
Why challenged: the same source shows a +25% finisher at 150 shots/season has **SD 3.73 around a mean GAX of 3.70** — single-season GAX is mostly noise, and the contamination bias is second-order relative to that noise. Decontamination effort should not outrank sample-size effort.
Status: ADAPT as an audit discipline, not as a precision upgrade.
Rehabilitate: show a decision-useful CI tightening from decontamination at fixed sample size.

## B. REJECT verdicts that stay rejected (with grounds)

| Brief | Claim | Why it stays rejected | What would rehabilitate |
|---|---|---|---|
| r29/1631 | Drawdown-minimizing portfolios "dominate the index on >99% of out-of-sample days" | No edge/probability input — minimizes trailing realized drawdown, concentrating stake on low-volatility legs regardless of +EV. >99% claim with zero transaction costs + overlapping 30-day in-sample windows is an overfit signature. No stake-sizing rule (weights, not bankroll fractions). | Edge filter before the optimizer + transaction costs + fresh-regime out-of-sample |
| r23/1173 | Dirichlet-process infinite forecast combinations | Combining infinitely many forecasts adds nothing without a real diversity/edge input. r27/1550's angular combining (+2.7% MQS) already covers the combination lane with a falsifiable method. | Beat angular combining on MQS with a documented diversity input |
| r21/1103 | Neuro-symbolic historical probabilities (Cannae 57.3%, Zama 57.8%) | N=7/N=2 samples; circular calibration (model confirms hand-fed structure); arbitrary ground truth; no held-out validation; degenerate "100.0% [100.0%, 100.0%]" interval signals broken machinery. | Held-out validation on non-hand-fed structure; non-degenerate intervals |
| r23/1193 | Self-affirmation feedback model of football goal distributions | Era-pooled fits (1963–2005 as one distribution); feedback parameter is a league-level constant, not a team trait — cannot rate teams. **Zero predictive content**: never forecasts a match, goal count, or price; no proper scoring rule. | Any out-of-sample forecast scored by a proper rule |
| r27/1539 | "Dynamic analysis and prediction" 0.913–0.932 accuracy | 4-class labels derived from the same Bayes computation as the classifier — circular. No out-of-sample numbers, no Brier/log-loss, no baselines beaten. | Independent labels; proper scoring; baselines |
| r22/1123 | Automated tackle injury-risk assessment | 15% risk region: 62.50% on 64 clips, 36.70% over 109; F1 = 0.50, Cohen's κ = 0.28 (fair). Below any usable operating point. | κ ≥ 0.6 with pre-registered operating threshold on fresh film |
| r26/1464 | ACL landing simulation thesis | No validated predictive numbers transferable to NFL injury modeling. | Validated prospective numbers |
| r04/0178 | Serve prediction 83.18% | See A.2 — probable target leakage. | Pre-match windows + walk-forward |
| r02/0028 | Asia Cup T20 structured dataset | EDA results are figure-referenced only — **no numeric values in the text**. Nothing to verify or build on. | Numeric tables |
| r12/0504 | Velocity-disambiguation VFI (LPIPS 0.105→0.086, NIQE 6.663→6.220) | No test on sports broadcast footage; 448×256 evaluation far below broadcast 1080p; no prediction-modeling application. | Broadcast-footage test at 1080p |
| r08/0343, r08/0353, r09/0383 | Badminton vision / action-frame prediction / 3D HMR | Vision methods with no NFL-transferable numbers in this half's scope. | NFL tracking-data application with gates |
| r09/0393 | "The most exciting game" | Qualitative; no numbers. | — |
| r11/0484 | Structure regularization theory | Theory with no sports application or numbers. | Sports prediction application |
| r12/0524 | RLHF distortion revisited | Alignment theory; not engine-relevant. | — |
| r13/0534 | LLM benchmarking "before the action" | Benchmark results not transferable to the prediction engine. | — |
| r14/0595 | Limits of PageRank-based ranking | Negative result on PageRank limits; no buildable replacement in the brief. | — |
| r17/0814 | Parimutuel permutations mechanism | Mechanism design; no NFL market application. | — |
| r05/0253 | In-season batting averages | Baseball-specific empirical-Bayes; the partial-pooling *pattern* is noted but the numbers don't transfer. | — |
| r06/0263 | Systematic review of CI in sports | Review; no primary numbers. | — |
| r06/0273 | Cardiorespiratory causal paths | Not sports. | — |
| r04/0129 | Communication protocol choice | No data; the only salvageable item is a *proposed* benchmark study (REST vs SSE vs WebSocket; adopt winner only if ≥2× lower p99 at equal CPU). | Run the proposed study |

## C. Negative results that are valuable (challenged the heuristic, not the paper)

### 8. r16/0716 — difficulty/consensus abstention heuristics are invalidated
The paper's own variance decomposition: difficulty alone explains 0.4–1.5% of the deferral signal; +ability → 0.8–1.8%; +IRT ambiguity → 1.1–3.7%; **residual unexplained 76.8–90.2%**. Any GSE abstention rule built on "hard questions" or "model disagreement" proxies is building on <4% of the signal. What survives: MC-Dropout variance itself (+1.9–2.4pp AUC, bootstrap CI ±0.13pp never crossing zero). The abstention stack (Pipeline 1) must key on calibrated uncertainty, never on difficulty proxies.

### 9. r13/0575 — no exploitable hot hand
Posterior means: β_CH = −0.49 (−0.58,−0.39); β_HC = 0.38 (0.27,0.49). Whatever the sign pattern, the brief's upshot for GSE is that raw-streak "momentum" features are not evidence-backed; regime structure belongs in a tested HMM (r30/1654, gated on holdout predictive log-likelihood ≥ 0.02 nats/obs), not in streak counters.

### 10. r28/1595 — F1 41.4 is modest; the method forces ≥1 event per sentence
The paper's own limitations: absolute F1 41.4 (vs 27.6 SOTA — a real gain, but modest); only pairs with a matching player name get PairModels (tactical/stat sentences invisible); forces ≥1 event per sentence (wrong for stats/weather/strategy talk); quadratic pairwise scaling; no code. The NFL port's "no-event/strategy-talk" head and the F1 ≥ 0.55 gate exist because of these weaknesses.

## D. Single-source risks (one paper, one dataset, one regime)

1. **r05/0213's ≥0.003 log-loss gate is ledger-authored, not a paper result.** The survey ran no experiments; the gate is a build contract written by the deep-read author. It is reasonable, but it has not itself been validated — the first PlusDC-BT run *is* the validation.
2. **r30/1654: one team, one season, in-sample only.** ΔAIC = 48 / ΔBIC = 35 for the copula over independence, and K=3 by BIC (20,979 vs 21,020/21,030/21,098), are all in-sample on 3,214 minute-level observations of Borussia Dortmund 2017/18, fit by 50-restart numerical ML. Treat as a template with a hard holdout gate, not as evidence that momentum regimes exist.
3. **r29/1641: B=25 bootstrap × weekly refits is compute-heavy**, and the sliding window discards all old residuals even in stable regimes; window length T′ is an untuned knob. The weeks-1–4 win (0.893 vs 0.646) is on solar/wind/sensor data, not NFL margins — the NFL replication is the actual test.
4. **r30/1677: Prop. 2's "only if" direction is proof-under-review.** The d-regular characterization is one-sided as published; the star-is-worst result (Cor. 1) is the solid leg. Lean on Cor. 1, not Prop. 2's converse.
5. **r29/1618's $1.118M** excludes a judged-coordinated $381,748 anomaly cluster (3 addresses, Dec 12 2025) — the headline is already cleaned, but the cleaning itself is a judgment call worth knowing about.
6. **r28/1582: model-cycle changes (Cy43r1/Cy45r1) forbid pooling reforecasts across eras** — any GSE weather replication must respect the same era boundaries in GEFS reforecasts.
7. **r22/1163 PARTIAL:** the candies "best guess 630" figure is not present in the cited source file (truth G=636, ⟨g⟩=531, error 16.5%, 70%, skewness 0.73 all verified). Do not quote 630 without the primary paper.

## E. Vacuous or untestable-as-written (kept honest by their own briefs)

- **r02/0028**: figures with no numeric values (see B).
- **r04/0119 LAPIS**: 82.7–92.1% token reduction is real, but "LLM reasoning quality on LAPIS vs OpenAPI is explicitly untested" — the paper admits no comprehension experiment, and lossy conversions (oneOf → most common variant) are exactly where an agent picks the wrong variant. Token savings ≠ safe adoption.
- **r21/1093 contest recommendation**: the online A/B win is reported via plots only — exact numeric lifts not stated in text (chart-read only). Cannot be cited as a number.
- **r20/1033, r10/0444, r10/0454, r09/0373, r07/0333** (vision/NLP): ADAPT verdicts with no NFL-transferable numeric gates in this half — portable patterns only, each needs its own gate before wiring.
