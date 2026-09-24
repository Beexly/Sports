# [1188] An Autoencoder Based Approach to Simulate Sports Games (arXiv:2007.10257v1)

**Citation:** Vaswani, A. (2020). *An Autoencoder Based Approach to Simulate Sports Games*. arXiv:2007.10257v1. URL: https://arxiv.org/abs/2007.10257v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, 11 pages / 459 extracted lines, all read).
**Verdict:** REJECT

## 1. Research question
Can a denoising autoencoder trained on team and player performance statistics "simulate" remaining knockout matches of the 2019–20 UEFA Champions League (UCL) and narrate plausible what-if outcomes? The paper frames the question as game simulation via learned embeddings rather than as predictive forecasting with held-out evaluation.

## 2. Dataset / schema
- **Scope:** UCL knockout-stage matches only, 2014–2020, **157 matches** (per paper text; exact count quoted as 157 in the summary of the paper's data section).
- **Team data:** scraped from the official UEFA website.
- **Player data:** scraped from FBref and Global Sports Archive.
- **Team attributes (exact list as given):** goals, attempts, shots on target, shots off target, blocked shots, woodwork, corners, offsides, possession, passes, passing accuracy, pass completions, distance covered, recoveries, tackles, clearances, blocks, cards, fouls.
- **Player attributes (exact list as given):** goals, shots, shots on target, assists, interceptions, crosses, fouls, offsides, minutes played.
- **Handcrafted priors:** home/away flag; form = points from the previous five games (3/1/0 per match); experience = number of historical UCL matches.
- **Preprocessing:** MinMax scaling of all features to [0, 1].
- No public data download or schema file stated beyond the source-site names.

## 3. Method / model
A denoising autoencoder architecture: inputs are corrupted with **Gaussian noise**, the model learns embeddings for teams and players, and reconstruction is scored with **MSE loss**. Optimizer: **Adam, learning rate 0.01**; **batch size 10**. Training/validation split is used only to report embedding reconstruction error — there is no separate held-out match forecasting evaluation. After training, the remaining 2019–20 knockout matches are "simulated" by comparing learned embeddings, and fixtures tied on aggregate are decided by **shots on target** (a heuristic tiebreaker, not a model output). Qualitative narrative examples are presented (e.g., the claim that Bayern wins the final).

## 4. Equations & assumptions
No numbered equations are stated in the paper (per the full text). Stated assumptions/procedures:
- Gaussian noise corrupts inputs for the denoising objective; MSE measures reconstruction error.
- MinMax scaling bounds all inputs to [0, 1].
- Form over exactly the previous five games (3/1/0 scoring) is assumed sufficient to encode recent momentum.
- Historical UCL match count is assumed a sufficient proxy for team experience.
- Tied aggregate fixtures are resolved by shots on target, assumed a fair tiebreaker for simulation purposes.

## 5. Features / target
- **Inputs:** team and player attribute vectors (lists in §2) plus home/away, 5-match form, UCL experience.
- **Target:** none in the supervised-forecasting sense. The autoencoder target is reconstruction of its own inputs. The "simulation" produces narrative match outcomes for remaining 2019–20 knockout fixtures — not a calibrated probability, score line, or spread.
- **Prediction horizon:** rest of the 2019–20 UCL knockout stage.

## 6. Validation design
- Train/validation split reported only for **embedding reconstruction RMSE** — team embeddings 0.1380 (train) / 0.1379 (validation); player embeddings 0.1127 (train) / 0.1126 (validation). These measure how well the autoencoder reconstructs its inputs, NOT how well it predicts unseen matches.
- **No time-ordered backtest, no baseline comparisons, no scoring rule (accuracy, log-loss, Brier, ROI) on held-out matches.** The 2019–20 "simulation" is presented qualitatively with no hit-rate or calibration numbers.
- Validation is therefore methodologically incapable of supporting any forecasting claim.

## 7. Numerical results / baselines
Every number quoted exactly as in the paper:
- 157 UCL knockout matches, 2014–2020.
- Team embedding RMSE: train **0.1380**, validation **0.1379**.
- Player embedding RMSE: train **0.1127**, validation **0.1126**.
- Adam learning rate 0.01; batch size 10.
- Outcome claim: qualitative only (Bayern wins the final; example what-if narratives).
- **No baseline model, no accuracy, no calibration, no betting-return figure appears in the paper.**

## 8. Code / data availability
Code: https://github.com/ashwinvaswani/whatif (stated in paper). Raw data availability: not stated (source sites named only; no download link or data file).

## 9. Leakage & limitations
- **Fundamental validation flaw:** reconstruction RMSE is not a forecasting metric. There is no evidence the learned embeddings predict anything about future matches.
- **Tiny, narrow sample:** 157 knockout matches across 6 seasons; knockout fixtures are a biased subset (home-and-away legs, extra time, away-goals era) and results on them do not generalize to league play.
- **Ad-hoc tiebreaker:** deciding tied aggregates by shots on target injects a hand-picked heuristic where the model should decide.
- **Overfitting risk:** batch size 10, Adam lr 0.01, and a small sample — with near-identical train/val reconstruction errors, the model reconstructs well but this says nothing about prediction.
- **No baselines, no calibration, no market test:** impossible to know whether this beats a coin flip or a naive favorite-wins rule.
- **External validity to NFL:** none demonstrated; no transferable numeric result exists to carry over.

## 10. GSE overlap
Per the existing-research map, GSE's corpus has real representation-learning work (e.g., TabTransformer event representation 2606.09327, representation learning on play-by-play in the ML brief, diffusion trajectory modeling 2503.18589). This paper's embedding-learning approach is a strictly weaker, unevaluated version of ideas GSE already has in stronger forms. It is neither duplicate (no direct counterpart) nor an extension — it contributes nothing new of value.

## 11. GSE implementation spec
None — there is no evaluated method to implement. If Garrett wanted the what-if embedding idea done right, the path would be: train a proper supervised forecaster on nflverse play-by-play, evaluate hit-rate/calibration on time-ordered holdouts, and only then use embedding perturbations for counterfactuals.

## 12. Reproducible test
Not applicable — the paper gives no forecast to reproduce. A sanity test would be: implement the denoising autoencoder on any sports stat matrix, verify reconstruction RMSE ≈ the paper's values, then confirm the embeddings have zero demonstrated predictive skill — reproducing the reason for rejection.

## 13. Acceptance / rejection gate
**REJECT.** Rejection stands because the paper reports no held-out forecasting metric, no baselines, and no calibration — it cannot clear any numeric gate.

## 14. Improvement experiment
A meaningful version of this paper: keep the embedding architecture, but train with a supervised outcome head and evaluate time-ordered out-of-sample accuracy/log-loss versus Elo and logistic baselines on the same 157 matches. If embeddings add skill over baselines, the what-if simulations become interpretable; without that test, the idea stays a narrative toy.
