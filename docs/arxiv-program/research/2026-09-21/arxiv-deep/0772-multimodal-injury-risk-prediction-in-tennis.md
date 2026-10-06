# [0772] Multimodal Injury Risk Prediction in Tennis (arXiv:2608.25126v1)

**Citation:** Francisco Erramuspe Alvarez, Shobharani Polasa, Weihao Qu, Jay Wang, Ling Zheng (2025). *Multimodal Injury Risk Prediction in Tennis*. Monmouth University. arXiv:2608.25126v1. Published: 2025 IEEE 5th International Conference on Human-Machine Systems (ICHMS), pp. 28–34. DOI: 10.1109/ICHMS61085.2025.11154160.
**Ledger completed:** 2026-09-21. **Read:** full text (local full-text cache `/tmp/arxiv750-cache/fulltext/2608.25126.txt`; complete published conference paper incl. abstract, §§I–VII, Tables I–III/V, Figure 1, references, verified end-to-end).
**Verdict:** ADAPT — the PART (Predictive Athlete Readiness for Tennis) multimodal framework is a portable template for fusing wearable, self-report, workload, and video signals into a single Athlete Readiness Score (ARS) plus body-region injury probabilities: decompose readiness into four specialized sub-models (wellness, injury risk, physical capability, playing style), learn their integration weights supervised against expert labels, and let XGBoost carry the tabular/wearable modalities. Small-n study (9 athletes) with weak absolute injury classification (F1 0.10), but the architecture and the honest evaluation discipline transfer cleanly to GSE's athlete-availability modeling.

## 1. Research question
Can a multimodal ML framework integrating wearable physiology, training/match workload, sleep, self-reported questionnaires, vertical-jump assessments, and match-video motion analysis predict tennis athletes' overall readiness and body-region-specific injury risk better than models relying on official stats and expert observation alone?

## 2. Dataset / schema
- **PART dataset:** 9 collegiate tennis players (male/female), Monmouth University. Modalities: (a) WHOOP wearable — sleep, HRV, resting HR, workout details; (b) daily self-report questionnaires (ASRM-style); (c) vertical-jump assessments by professional physicians; (d) match-play videos; (e) training/match load data.
- Expert-labeled ARS ground truth (0–100) per athlete per time point, consensus-averaged across multiple coaches/sports scientists.
- Injury labels: binary injury occurrence + body region (upper/lower body; quadrant: upper-left/upper-right/lower-left/lower-right).

## 3. Method / model
**PART architecture** (modular, Figure 1):
1. *Physical Capability Prediction:* MLP and LSTM on temporal sequences of physiological/activity data → physical readiness percentage.
2. *Injury Risk Classification:* XGBoost classifier on physiological + self-report features → injury probability; plus upper-body and lower-body XGBoost classifiers.
3. *Overall Wellness Prediction:* XGBoost regressor → Recovery Score (%).
4. *Playing Style Analysis:* computer-vision/motion analysis on match videos → style classification (aggressiveness score ASP).
**Integration:** ARS_initial = w₁·Wellness + w₂·(1−InjuryRisk) + w₃·PhysicalCapability, weights learned by multiple linear regression against expert ARS labels (interpretable coefficients); final ARS = ARS_initial / w_style, where w_style ∈ {1.0, 1.2, 1.4, 1.6} by ASP quartile — defensive grinders get readiness discounted for their higher cumulative load exposure.

## 4. Equations & assumptions
(1) ARS_initial = w₁·OverallWellness + w₂·(1−InjuryRiskProb) + w₃·PhysicalCapability, ŵ learned by MLR on expert labels. (2) Style adjustment: w_style = 1.0 if ASP≤5; 1.2 if 5<ASP≤8; 1.4 if 8<ASP≤12; 1.6 if ASP>12; ARS_final = ARS_initial/w_style. (3) XGBoost objectives (log-loss / squared error) standard. (4) Wellness regression evaluated on MAE/RMSE/R²; injury classification on AUC-ROC/accuracy/F1.
Assumptions: expert consensus ARS is valid ground truth; WHOOP/self-report/jump data are sufficiently complete; video-derived style is stable per athlete; sub-model outputs are calibrated enough to combine linearly.

## 5. Features / target
Sleep, HRV, resting HR, workout load, self-reported wellness/soreness, vertical-jump metrics, video motion features. Targets: Recovery Score (%), injury occurrence + body region, physical capability %, ARS (0–100).

## 6. Validation design
- Wellness: Linear Regression vs Linear Regression (feature transform) vs MLP vs XGBoost Regressor; 80/20 split; MAE/RMSE/R².
- Injury risk: Logistic Regression vs XGBoost vs Decision Tree vs Random Forest; AUC-ROC/accuracy/F1 on imbalanced data; separate upper/lower-body XGBoost models.
- Physical capability: MLP vs LSTM, training vs validation loss.
- ARS integration: supervised weight learning against expert labels.

## 7. Numerical results / baselines
- **Overall wellness (Table I):** XGBoost Regressor best — MAE 3.82, R² 0.838 (83.8% variance explained); baseline linear regression MAE 14.05, R² 0.009. Strong.
- **Injury risk (Table II):** XGBoost best — AUC-ROC 0.695, accuracy 0.852, **F1 0.100**; logistic regression F1 0.000 (total failure on the imbalanced classes); decision tree 0.075, RF 0.092. Honest but weak — injury events are rare and hard.
- **Body-region (Table III):** upper body AUC 0.712 / F1 0.132; lower body AUC 0.703 / F1 0.118.
- **Physical capability (Table V):** LSTM beats MLP (validation loss 0.6059 vs 0.6391).

## 8. Code / data availability
Authors state the complete code repository plus environment setup instructions are included with the paper materials; 9-athlete collegiate dataset presumably not public.

## 9. Leakage & limitations
(i) n=9 athletes — tiny; all results are within-subject and generalization claims are aspirational; (ii) injury classification is genuinely weak (F1 0.10) — the paper's honest about it, and so are we: readiness regression is the reliable part; (iii) ARS labels are expert consensus — subjective ground truth; (iv) no player-wise holdout reported — temporal leakage possible if time-adjacent samples split randomly; (v) code link referenced in text but the URL string wasn't legible in the fetched copy — verify before citing.

## 10. GSE overlap
Fills a gap in the causal/injury lane: **player availability / readiness scoring for fantasy and props**. GSE's props and fantasy edges degrade when a player is questionable; a PART-style multimodal readiness score — wearables replaced by public proxies (practice participation, snap counts, travel, rest days, age, injury history) — gives a principled availability discount for projections. The four-sub-model decomposition is the transferable idea: don't build one monolithic injury model; build wellness (recovery/load), injury-risk, physical-capability, and style/exposure sub-models, then learn the integration weights supervised against an expert-ish label (e.g., beat-vs-projection residuals). The w_style penalty (discount readiness for high-exposure playing styles) ports directly: discount rushing QBs / high-volume RBs for cumulative-hit exposure.

## 11. GSE implementation spec
- **Availability discount module:** four XGBoost/MLP sub-models on public proxies — (a) wellness: practice participation trend, days since injury, rest days; (b) injury risk: age, position, prior injuries, snap load; (c) physical capability: recent snap share / speed proxies; (d) style/exposure: position + play-type mix (designed runs, deep targets). Integrate via MLR against a proxy label (e.g., next-4-week games-missed or projection shortfall).
- **Style/exposure penalty:** replicate w_style — multiply availability score by a style-exposure factor (e.g., 1.0 pocket passer … 1.6 dual-threat QB / bellcow RB), calibrated on historical missed-time data.
- **Fantasy/prop use:** readiness score gates lineup exposure and shades player props toward the under on rushing/receiving volume when ARS < 60.
- Effort: ~1 week for the tabular prototype; no wearables or video needed for v1.

## 12. Reproducible test
Dataset: 2020–2025 NFL (nflverse) — injury reports, practice participation, snap counts, age/position/injury history. Train four sub-models per the spec; learn integration weights on 2020–2023, test 2024–2025. Primary metric: correlation of ARS with next-4-week missed games; secondary: P&L of a props strategy that fades volume props for players with ARS < 60. Success: ARS–missed-games correlation ≥ 0.25 out-of-sample; fade strategy positive EV over ≥200 props.

## 13. Acceptance / rejection gate
ADAPT the four-sub-model + learned-integration architecture now. ADOPT for live availability discounting only if the out-of-sample ARS–missed-games correlation ≥ 0.25 and the style-exposure penalty improves it over the unpenalized score; otherwise REJECT the live use and keep it as a research prototype.

## 14. Improvement experiment
Replace the expert-consensus ARS labels with a revealed-preference label: train the integration weights against actual next-30-day injury occurrence (or projection shortfall) rather than coach ratings. Compare the two ARS variants on out-of-sample injury discrimination (AUC) and on the props-fade P&L test. If the revealed-preference ARS wins, the framework no longer needs expert labeling — the blocker for scaling beyond 9 athletes.
