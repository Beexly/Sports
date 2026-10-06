# [0420] Gaining Momentum: Uncovering Hidden Scoring Dynamics in Hockey through Deep Neural Sequencing and Causal Modeling (arXiv:2511.00615v1)

**Citation:** Griffiths and Moskow (2025). *Gaining Momentum: Uncovering Hidden Scoring Dynamics in Hockey through Deep Neural Sequencing and Causal Modeling*. arXiv:2511.00615v1. URL: https://arxiv.org/abs/2511.00615v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 382 lines).
**Verdict:** REJECT — the headline causal claim (momentum's average treatment effect on scoring) is not credible due to treatment definition circularity, overlapping windows, and proprietary data; only the sequence-embedding architecture idea is salvageable, and it must be rebuilt from scratch on open data.

## 1. Research question
Can "momentum" in hockey — latent scoring dynamics hidden in sequences of game events — be quantified with deep neural sequence models, and does momentum have a causal effect on goal scoring? The paper claims to uncover hidden scoring dynamics via an LSTM over event sequences and then estimate momentum's causal effect with an X-Learner.

## 2. Dataset / schema
Proprietary Sportlogiq dataset: 541,000 NHL event records. Overlapping 30-second windows of events are used as sequence inputs. Schema implied: event types, timestamps, coordinates. The data are not public and the paper provides no access path — unreplicable. No public URL, no request process stated.

## 3. Method / model
Pipeline: (1) logistic regression to assign weights to event types; (2) XGBoost xG model (depth 6, 200 rounds, learning rate 0.05, 80% row subsampling, early stopping 25 rounds, 70/15/15 split); (3) sequence embedding: each event embedded to 32 dimensions, single 50-unit LSTM layer with 30% dropout over up to 20 events, Adam 0.001, batch 32, 30 epochs, 80/20 split; (4) PCA to first 3 principal components (>85% variance) then K-means clustering of sequences into "formations"/chains; (5) X-Learner to estimate the average treatment effect of "momentum chains" on scoring. Composite score S_i = M_i + p̂_i^xG + p̂_i^LSTM.

## 4. Equations & assumptions
Stated in the paper:
- Event-weight logistic: Pr(y_i = 1 | x_i) = σ(β_0 + Σ_e β_e x_i,e)
- Momentum: M_i = Σ_e β_e x_i,e
- Composite: C_i = M_i + p̂_i; final sequence score S_i = M_i + p̂_i^xG + p̂_i^LSTM
Assumptions (unstated but required): (a) 30-second overlapping windows are independent observations; (b) K-means clusters of PCA-projected LSTM embeddings correspond to tactically meaningful "formations"; (c) the X-Learner's unconfoundedness holds — i.e., no unmeasured confounders between being in a "momentum chain" and scoring; (d) treatment (high composite score chain) is well-defined and manipulable. All four are violated or unverifiable — see §9.

## 5. Features / target
Inputs: event types within overlapping 30-second windows, timestamps, spatial coordinates, XGBoost xG estimates. Target(s): binary goal/no-goal for the logistic and xG models; sequence-level "scoring" for the LSTM; treatment indicator (membership in a high-momentum chain) and goal outcome for the X-Learner. Prediction horizon: within-window goal.

## 6. Validation design
XGBoost: 70/15/15 random split. LSTM: 80/20 random split. No time-ordered or team-held-out validation is described — splits appear random over the pooled event records, so overlapping windows from the same game can appear in both train and test. The X-Learner ATE is estimated with cross-validation and bootstrap on the same clustered corpus. No credible causal identification strategy (no randomization, no discontinuity, no instrument).

## 7. Numerical results / baselines
Paper's reported numbers (all quoted as stated):
- XGBoost xG: 73.4% train accuracy, 71.2% test accuracy, AUC 0.85, precision 0.36, recall 0.42
- LSTM: train accuracy 83.9%, validation accuracy 82.6%; train loss 0.357, validation loss 0.379
- 1,148 chains identified; top composite sequence score 4.33; low-probability-reward (LPR) chains averaged 27% higher (composite); top-ten LSTM sequences average goal probability 0.91 ± 0.07
- X-Learner ATE (Table 2): CV ATE 0.12576; bootstrap ATE 0.10688; 95% CI 0.05002–0.17436; p-value 1.42883e-52
My interpretation: accuracy is a misleading metric at ~2% goal base rates (predicting "no goal" always scores ~98%); precision 0.36/recall 0.42 is the honest signal and it is weak. A p-value of 1.43e-52 on an observational causal estimate with overlapping windows is a red flag for dependence-ignored inference, not a sign of strength.

## 8. Code / data availability
Data: proprietary Sportlogiq — not available. Code: none stated.

## 9. Leakage & limitations
Fatal, adversarial: (a) The "treatment" (momentum chain) is defined from the same composite score that includes the outcome model's prediction — circularity between treatment definition and outcome. (b) Overlapping 30-second windows violate independence; the 1.43e-52 p-value ignores this dependence. (c) Random splits over pooled events leak same-game, same-shift sequences across train/test. (d) No unmeasured confounding control — good teams generate both more "momentum chains" and more goals; team strength is the obvious confounder and is not adjusted. (e) The causal estimand is ill-defined: "momentum" as a manipulable treatment has no clear intervention analogue. (f) Proprietary data makes all of this unverifiable. (g) K-means on 3 PCs of LSTM embeddings is presented as discovering "formations" with no validation that clusters are stable or meaningful. External validity to NFL: none for the causal claim; the sequence-embedding architecture is the only transferable piece.

## 10. GSE overlap
New capability in name, but the map's gaps counsel skepticism: the existing-research-map lists "Hawkes processes / self-exciting models — mentioned 1×; momentum/scoring-burst modeling absent" as gap 14, so drive-momentum modeling is a genuine white space. However, GSE should NOT import this paper's causal machinery. Related map content: the 2026-09-13 discovery lane REJECTED Koopman/DMD momentum (p = 0.89, AR(1) beats DMD) — the house prior is that naive momentum claims fail, and this paper does not clear that bar. Treat as: white-space topic, unusable method.

## 11. GSE implementation spec
Do NOT implement the X-Learner causal pipeline. If GSE wants drive-momentum features: (1) Data: nflverse play-by-play 2015–2025, drive-level sequences. (2) Build a self-exciting (Hawkes) or LSTM sequence model over within-drive play events (down, distance, EPA, personnel) to estimate "drive energy" — strictly a feature, never a causal claim. (3) Validate as a predictive feature in the WP/EPA model with time-ordered splits. Effort: 3–5 days. The paper's only contribution to this plan is the suggestion of sequence embeddings over event windows; everything else (X-Learner, composite score, clustering) is discarded.

## 12. Reproducible test
No reproducible test of the paper's claim is possible: the data are proprietary and the estimand is circular. The honest test is a from-scratch rebuild: nflverse drives 2015–2023, Hawkes/LSTM drive-energy feature added to a baseline EPA/drive-outcome model, evaluated on 2024–2025 with strict season holdout. Metric: log loss on drive outcome (TD/FG/punt/turnover). Baseline: same model without the momentum feature.

## 13. Acceptance / rejection gate
For the salvage concept (drive-momentum as a predictive feature): ADOPT only if the momentum feature improves drive-outcome log loss by ≥ 0.005 on the 2024–2025 holdout AND survives a team-clustered bootstrap (resampling by team-season, not by drive). REJECT the feature — and the paper's causal framing permanently — if the gain disappears under team clustering or if the effect is not stable across seasons. The paper's own ATE claim is rejected unconditionally: no gate can rescue a circular estimand on closed data.

## 14. Improvement experiment
Replace the paper's entire causal apparatus with a marked Hawkes process on drive events where the mark is play EPA and the kernel is learned (neural Hawkes), then test whether the fitted excitation kernel predicts next-play EPA better than an AR(1) baseline — the exact duel the GSE discovery lane already ran for DMD (AR(1) won). If a learned excitation kernel beats AR(1) on 2024–2025 out-of-sample with team-clustered standard errors, that is the first honest evidence of "momentum" in the program; if AR(1) wins again, the topic is closed.
