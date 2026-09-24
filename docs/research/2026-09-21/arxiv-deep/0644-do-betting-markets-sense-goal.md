# [0644] Do Betting Markets Sense a Goal Coming? Evidence from the German Bundesliga (arXiv:2505.21275)

**Citation:** David Winkelmann, Christian Deutscher (2025). *Do Betting Markets Sense a Goal Coming? Evidence from the German Bundesliga*. arXiv:2505.21275v1. URL: https://arxiv.org/abs/2505.21275
**Ledger completed:** 2026-09-21. **Read:** full text (local full-text cache, `/tmp/arxiv750-cache/fulltext/2505.21275.txt`).
**Verdict:** REJECT — clean null result (neither bookmakers nor bettors anticipate goals); no model, parameter, or edge survives the read that GSE could use. Fails the numeric gate: zero predictive content.

## 1. Research question
Do betting-market participants (bookmakers via odds, bettors via stakes) anticipate major news — specifically the first goal in a Bundesliga match — by adjusting behavior in the minutes before the goal occurs? Framed as a test of market anticipation vs insider trading in a setting where news arrives unambiguously and simultaneously to all.

## 2. Dataset / schema
- 306 matches of the 2018/19 German Bundesliga from a large European bookmaker at 1 Hz: pre-match and in-play odds (home/draw/away) plus per-second stakes. Aggregated to 1-minute intervals. Proprietary — not public.
- Analysis restricted to 289 matches with ≥1 goal (17 scoreless excluded); anticipation analysis uses 256 matches where the first goal came in minute ≥6 (9,425 scoreless minutes; 9,185 after dropping 60 market-closed observations for the stake model). ~75% of first goals in first half.
- Derived: improb_{itj} = (1/O_{itj})/(1/O_{ith}+1/O_{itd}+1/O_{ita}) (vig-adjusted implied probabilities); improbpre (pre-match); xgdiff_{it} (cumulative expected-goal difference for the eventual scorer); mintogoal_{it} = T_i − t (known only ex post); redcardteam/redcardopp; stakerel (relative stakes on eventual scorer, mean 0.581, median 0.651, sd 0.288); home; volumediff (season-average absolute stake difference).
- Descriptives: team scoring first won 204/289 (70.6%), drew 56 (19.4%), lost 29 (10.0%). xgdiff just before the goal: mean +0.077 (sd 0.42, range −2.28 to 2.05; last-minute-before-goal average +0.13) → scorers had slightly better chances.

## 3. Method / model
Two-sided test of anticipation via the covariate mintogoal⁻¹ (rises to 1 in the minute before the goal):
- Bookmaker side (Models 1–4): linear regressions of in-match implied win probability on pre-match probability, t, t², pre×t interaction, red cards, xgdiff/t, and finally mintogoal⁻¹ (Model 4). Standard errors clustered at match level. Model selection by AIC.
- Bettor side: zero-one-inflated beta SSM for relative stakes y_t ~ BEINF(μ_t, σ, π, λ) with logit link μ_it = logit⁻¹(η_it), η_t = ν_t + s_t, s_t = φ s_{t−1} + σ_s ε_t (continuous AR(1) latent market-activity level, stationary initial distribution). Likelihood approximated by Kitagawa (1987) state discretization (m = 95 intervals, bounds ±3) → m-state HMM, forward algorithm O(Tm²), optimized by BFGS in Python. Basic SSM vs final SSM (adds home, volumediff; drops t² and interaction).

## 4. Equations & assumptions
- Implied probability: improb_{itj} = (1/O_{itj}) / Σ_k (1/O_{itk}), j ∈ {h,d,a}.
- Bookmaker Models 1–4 predictors as above; Model 4: ν_it = β_0 + β_1·improbpre_i + β_2·t + β_3·t² + β_4·improbpre_i·t + β_5·redcardteam + β_6·redcardopp + β_7·xgdiff/t + β_8·mintogoal⁻¹_it. (Eq. 4)
- BEINF: f(y) = π (y=0); (1−π−λ)h(y) (0<y<1); λ (y=1). Parametrised by mean μ and precision γ = μ(1−μ)/σ² − 1.
- State: s_t = φ s_{t−1} + σ_s ε_t, ε_t ~ N(0,1); initial δ ~ N(0, √(σ_s²/(1−φ²))).
- Bettor final predictor (Eq. 5): ν_it = β_0 + β_1·improbpre_i + β_2·t + β_3·redcardteam + β_4·redcardopp + β_5·home + β_6·volumediff + β_7·xgdiff/t + β_8·mintogoal⁻¹_it; η_t = ν_t + s_t.
- Assumptions: mintogoal⁻¹ captures anticipation; match independence; no match-fixing in sample; odds/stakes observed without measurement error; excluded market-closed minutes are missing at random; xg observable to both sides.

## 5. Features / target
- Bookmaker target: in-match implied win probability for the eventual first-goal scorer. Inputs: improbpre, t, t², pre×t, redcardteam, redcardopp, xgdiff/t, mintogoal⁻¹.
- Bettor target: relative stakes on the eventual scorer per minute. Inputs: same plus home, volumediff.

## 6. Validation design
Inferential, no holdout. AIC model comparison (Bookmaker: Model 1 −28,320 → Model 2 −35,000 → Model 3 −42,160 → Model 4 −42,180; Bettor basic SSM −14,581.68 vs final −14,715.64; SSM beats no-state beta regression by ΔAIC = 9,355). 95% CIs on all coefficients; robustness: anticipation result unchanged with/without xg covariate; full model in Appendix E.

## 7. Numerical results / baselines
- Bookmaker Model 3: improbpre coefficient 1.003 [0.990, 1.016]; minute 0.001 [0.001, 0.002]; minute² −0.000013; pre×minute −0.004 [−0.005, −0.003]; red card own team −0.120 [−0.124, −0.116]; red card opponent +0.173 [0.136, 0.210]; xgdiff/minute 0.163 [0.075, 0.250]. Bookmakers DO price xg and red cards, and odds decay with scoreless time (draws become likelier).
- Anticipation (Model 4): mintogoal⁻¹ coefficient −0.005 [−0.012, 0.002] — statistically insignificant. "Bookmakers do not anticipate goals."
- Bettor SSM: φ̂ = 0.984 [0.981, 0.987] (basic) / 0.974 [0.972, 0.977] (final) — strong serial correlation in latent market activity; σ̂_s = 0.176/0.183; π̂ = 0.00096; λ̂ = 0.00053; γ̂ = 16.065. Covariates: xgdiff/minute 3.497 [3.118, 3.875] (basic) / 3.627 [3.552, 3.702] (final); redcardopp 0.661 [0.389, 0.932]; volumediff 0.047 [0.042, 0.051]; home insignificant (−0.005 [−0.185, 0.175]); time terms insignificant in SSM (market-activity state absorbs them).
- Anticipation (bettor): mintogoal⁻¹ = 0.089 [−0.159, 0.336] (basic) / 0.096 [−0.031, 0.222] (final) — insignificant. "Relative stakes placed on the team eventually scoring the goal do not increase prior to its occurrence."
- Conclusion: neither side anticipates the first goal. Positive-but-insignificant point estimate on bettor side is noted as fragile, not actionable.

## 8. Code / data availability
None stated in paper. Stakes/odds data proprietary (bookmaker-supplied). No code link.

## 9. Leakage & limitations
- Null result by design: the one coefficient of interest (mintogoal⁻¹) is insignificant on both sides — there is nothing to transfer.
- Proprietary 1 Hz data; replication impossible for GSE.
- Soccer-specific (low-scoring, continuous clock, draws) — first-goal anticipation has no direct NFL analogue (a "next touchdown" anticipation test would need play-level in-play handle GSE doesn't have).
- The authors' own caveat: Bundesliga is a high-information, high-competition market (smaller margins; Elaad et al. 2020) — the null may not hold in lower-information markets, so even the qualitative conclusion doesn't transfer.
- No predictive experiment; the "arbitrage" discussion is hypothetical.
- 17 scoreless matches and 33 early-goal matches excluded — selection on the outcome is inherent to the design.

## 10. GSE overlap
Per ~/workspace/arxiv-sweep/existing-research-map.md: Garrett's corpus has market-efficiency coverage; this paper adds only a null confirmation that markets react rather than anticipate — consistent with, and weaker than, existing efficient-market evidence already in the corpus. No new metric, no model, no edge.

## 11. GSE implementation spec
No implementation (verdict REJECT). The one methodological component of interest — the zero-one-inflated beta SSM with latent AR(1) market activity — is already covered more usefully by ledger 0643 (2202.10085), which includes time-varying coefficients, momentum covariates, and a concrete fraud/outlier-detection application on the same bookmaker data family. Nothing in this paper's method is an improvement over 0643's.

## 12. Reproducible test
Not operable: requires proprietary per-minute in-play stake data plus exact goal times; the result to "replicate" is an insignificant coefficient. Numeric gate (below) fails by construction.

## 13. Acceptance / rejection gate
ACCEPT would have required a significant, replicable anticipation effect (e.g., mintogoal⁻¹ with 95% CI excluding zero and a magnitude implying ≥2% edge on an in-sample strategy, replicated on a second league). Observed: bookmaker −0.005 [−0.012, 0.002], bettor 0.096 [−0.031, 0.222] — both insignificant. Numeric gate: FAIL → REJECT. Per program rules this REJECT is replaced with the exclusive reserve paper 1612.07543v1 (ledger 0654).

## 14. Improvement experiment
N/A under rejection. If the question mattered for NFL: run the same mintogoal-analogue design on NFL play-level data — test whether in-play handle or bookmaker live odds move toward the eventual next-scoring team in the minutes before a touchdown beyond what EPA/xg-style in-game models explain. That would be a new test (and a possible fraud/steam detector), but it needs per-minute handle data GSE does not currently possess.
