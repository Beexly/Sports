# [0018] A Model-Based Restricted Shapley Value to Measure the Players' Contribution to Shot Actions in Football (arXiv:2603.11016)

**Citation:** (authors as listed on arXiv) (2026). *A Model-Based Restricted Shapley Value to Measure the Players' Contribution to Shot Actions in Football*. arXiv:2603.11016v3. URL: https://arxiv.org/abs/2603.11016
**Ledger completed:** 2026-09-21. **Read:** full text (arXiv HTML v3), all 993 lines — §1 intro, §2 restricted Shapley theory (Eqs. 2–8), §3 xGA action model (Eqs. 9–12), §4 dataset (8,421 Serie A 2022/23 shot actions, Table 2), §5 empirical analysis (Tables 3–4, Figures 1–2), §6 conclusions/limitations, acknowledgments, references.
**Verdict:** ADAPT — soccer-specific application (Serie A shot actions), but the core machinery is a general credit-assignment primitive: model-based worth function + restricted coalition support + bootstrap SEs + studentized contribution statistic. That four-part recipe ports directly to NFL play/drive credit assignment (e.g., attributing EPA across blockers, route-runners, and ball-carriers), which GSE's tracking/attribution lane doesn't currently do with uncertainty quantification.

## 1. Research question
How to fairly attribute the value of a shot-ending offensive action among the players in its passing network, when only a restricted, non-random subset of player coalitions is ever observed — and how to compare those attributions across players with heterogeneous participation and estimation uncertainty.

## 2. Dataset / schema
Ad-hoc ETL dataset: all shot-ending actions from Italian Serie A 2022/23 (20 teams × 38 matches), 8,421 shot actions. Sources: WhoScored (pass counts, player counts, avg pass distance, first-pass coordinates, player IDs/roles, timing — scraped), Understat via worldfootballR (shot X/Y, angle, situation, shot type, binary outcome, home/away, assist-man), Sofifa (offensive performance index from 29 KPIs via PLS-SEM, match-dated). Features: X (mean 85.31), Y (50.84), Shot Angle (33.77°), first_pass_x/y, passNb (6.47), playersNb (4.87), avg_pass_distance (27.28), plPerformanceIndex (84.81), situation (73% open play, 9% free kick, 1% penalty, 17% other), h_a (54% home), Outcome 10% goals. AC Milan case: 505 shot actions, 414 observed coalitions (+1,800 out-of-sample); Napoli: 519 actions, 410 observed (+1,834 out-of-sample); 15 players per team with ≥60 actions (25th percentile threshold).

## 3. Method / model
(1) xGA model: XGBoost (beat binary-regression cloglog in Cefis & Carpita 2025) predicting P(goal | shot + action features); worth of coalition υ(S) = Σ in-sample xGÂ over observed actions with those players; unobserved-but-compatible coalitions υ(S*) = single out-of-sample xGÂ prediction. (2) Restricted Shapley: φ_i^R(υ) = Σ_{C∈C_i} w_i(C)[υ(C∪{i}) − υ(C)] with weights w_i(C) = [c!(n−c−1)!/n!]/Σ_{C∈C_i}[c!(n−c−1)!/n!] normalized over the restricted support (Myerson-style; efficiency lost, symmetry/marginality preserved). (3) Bootstrap SEs (B=1,000) of φ̂_i^R. (4) PRSV_i = φ̂_i^R / SE(φ̂_i^R) — studentized, dimensionless, signal-to-noise interpretation: PRSV_i = φ_i^R/σ_i + ε_i/σ_i + o_p(1).

## 4. Equations & assumptions
Eq. (2) restricted Shapley; Eq. (3) normalized weights with probabilistic interpretation as permutation probabilities conditional on compatible predecessors; Eq. (4) bootstrap SE; Eq. (5) bootstrap mean; Eq. (6) PRSV; Eq. (7) φ̂_i^R = φ_i^R + ε_i with E(ε_i|C_i)=0, Var=σ_i²; Eq. (8) PRSV decomposition. Eq. (9): xGÂ_h = P̂(Y_h=1|X_h). Eqs. (10)–(12): worth via in-sample sums / out-of-sample single predictions. Assumptions: coalitions defined by passing-network participation only (off-ball movement ignored); goalkeepers excluded; penalties excluded (1.1%); only shot-ending actions counted; unobserved coalitions' feature vectors copy observed ones except performance index and player count; bootstrap SE consistent for σ_i under regularity conditions; PRSV comparable across players as "normalized conditional contribution."

## 5. Features / target
Inputs: shot features (X, Y, angle) + action features (first_pass_x/y, passNb, playersNb, avg_pass_distance, plPerformanceIndex, h_a, situation). Target: binary goal per shot action (10% positive); PRSV is derived from the fitted worth function, not a second target.

## 6. Validation design
xGA validated on out-of-bootstrap test sets (~36.8% of data per replication, B=1,000): sensitivity 0.79, specificity 0.62, F1 0.28, precision 0.17, MCC 0.24, AUC 0.79, Brier 0.07 (bootstrap SEs 0.003–0.033). Prevalence-adjusted classification threshold (Cefis & Carpita 2025). PRSV compared against Understat's xGChain (Spearman ρ_S=0.38 Milan, 0.42 Napoli) and cross-plotted vs G90−xG90 finishing efficiency. No predictive validation of PRSV itself (it's descriptive attribution).

## 7. Numerical results / baselines
- xGA model (Table 3): AUC 0.79 (SEB 0.012), Brier 0.07 (0.003), MCC 0.24 (0.014), sensitivity 0.79, specificity 0.62; feature importance: X (proximity) dominant, then shot angle; h_a and playersNb near zero.
- PRSV leaders (Table 4, B=1,000): Osimhen 4.84 (192 actions), Giroud 3.81 (142), Leão 3.44 (201), Tomori 2.95 (defender), De Ketelaere 2.70, Díaz 2.48, Anguissa 1.48, Kvaratskhelia 1.53; negatives: Messias −4.39, Rrahmani −3.62, Bennacer −3.19, Lobotka −2.11.
- PRSV vs xGChain: ρ_S 0.38–0.42 (moderate — different dimensions). PRSV vs finishing (G90−xG90): Leão top-right (both); De Ketelaere/Díaz/Tomori/Giroud high PRSV, negative finishing; Messias/Bennacer opposite.
- Coalition support: observed cardinalities skew small (3–7 players typical) vs theoretical distribution peaking at 9–10 (Table 1) — the empirical justification for restriction.

## 8. Code / data availability
Dataset "ad hoc," scraped from WhoScored/Understat/Sofifa; detailed description in Cefis et al. [38] (not attached). No code released; no data download offered. Reproducibility: partial in principle (public sources), not in practice.

## 9. Leakage & limitations
In-sample xGA used for observed-coalition worth (Eqs. 10–11) while out-of-sample for unobserved (Eq. 12) — asymmetric; author flags worth-quality depends on test-set performance. Only shot-ending actions (possession value without shots ignored); passing-network coalitions miss off-ball contributions; single season, two-team case study for PRSV; penalty/goalkeeper exclusions; role fixed per player across actions (Sofifa-based); xGA features exclude defensive pressure/goalkeeper positioning. No causal interpretation — PRSV is a descriptive, context-dependent contribution measure.

## 10. GSE overlap
No duplication. GSE's attribution-adjacent work (EPA, xFP, CPOE) assigns value to plays/units, not to individual players within a cooperative action with uncertainty quantification. The restricted-Shapley + bootstrap + studentization recipe is new to the corpus and fills a genuine gap in player-level credit assignment. The xGA model itself is soccer-specific and not portable, but the attribution framework is sport-agnostic.

## 11. GSE implementation spec
ADAPT: port the four-part recipe to NFL — (1) worth function = expected points of a drive/play from a fitted model (engine's existing EPA machinery); (2) coalitions = players involved in the play's execution (ball-carrier, blockers, route-runners from charting/tracking); restrict to observed participation patterns; (3) bootstrap over games/drives for SEs; (4) PRSV-style studentized contribution for cross-player comparison. Start with rushing plays (cleaner participation sets) before passing plays. Effort: 1–2 weeks for a prototype on one season of charted data, given an existing EPA model.

## 12. Reproducible test
On one NFL season of charted rushing plays: fit the drive/play EPA model, compute restricted-Shapley attributions per ball-carrier + blockers, bootstrap SEs over games, and check (a) PRSV ranking stability across bootstrap halves (rank correlation ≥0.8), and (b) correlation with existing rushing-efficiency metrics (expect moderate, ρ≈0.4–0.6, mirroring the paper's xGChain result — high correlation would suggest redundancy, near-zero would suggest noise). Adopt if (a) holds and (b) lands in the informative middle.

## 13. Acceptance / rejection gate
ADAPT conditional on §12: the framework earns a GSE prototype only if bootstrap PRSV rankings are stable on NFL data. Do not import the soccer xGA model or its feature set; import only the attribution recipe (restricted support + model-based worth + bootstrap SE + studentization).

## 14. Improvement experiment
The paper's own suggested extension, sharpened: replace the passing-network coalition definition with tracking-data-derived participation (off-ball runs, blocks sustained), and extend the worth function from shot-ending actions to all possessions via an expected-threat-style model — this removes the two biggest limitations (shot-only, on-ball-only) at once. For GSE, the equivalent experiment is §12 plus a tracking-based participation definition once Next Gen Stats participation data is available.
