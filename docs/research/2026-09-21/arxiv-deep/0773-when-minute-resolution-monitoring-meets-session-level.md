# [0773] When Minute-Resolution Monitoring Meets Session-Level Injury Labels: Landmark-Based Discrimination in Elite Women's Football (arXiv:2609.03790v2)

**Citation:** Evangelos Chatzidimitriou, Konstantinos Tserpes (2026). *When Minute-Resolution Monitoring Meets Session-Level Injury Labels: Landmark-Based Discrimination in Elite Women's Football*. National Technical University of Athens. arXiv:2609.03790v2 (10 pages, 4 figures, 2 tables). URL: https://arxiv.org/abs/2609.03790
**Ledger completed:** 2026-09-21. **Read:** full text — the program cache held only the arXiv landing page; the complete 10-page paper was fetched from https://arxiv.org/pdf/2609.03790v2 (2.7 MB PDF, converted to text, 35,569 chars) and read end-to-end (abstract, §§1–5, results, discussion, reproducibility statement).
**Verdict:** ADAPT — not for its discrimination numbers (honestly near-chance on sensor-only features), but for its **unit-aligned framework for label-resolution mismatch**: when monitoring is minute-resolution but injury labels exist only at the athlete-session level, never replicate the session label across minutes — instead build one representation per athlete-session at fixed elapsed-time landmarks, keep the target session-level, evaluate athlete-disjoint, and treat everything downstream as benchmarking, not minute-level prediction. That is exactly the discipline GSE needs when combining high-resolution workload proxies (practice participation trends, snap-load trajectories) with game-level injury labels. The paper's negative result is itself valuable: with only five injury-positive athletes, even TabPFN + synthetic augmentation can't manufacture signal — a warning against overfitting small injury cohorts.

## 1. Research question
How can minute-resolution within-session monitoring be used for injury-associated-session discrimination when injury annotation exists only at the athlete-session level (no within-session onset time) — without creating unsupported minute-level supervision by replicating the session label across every minute?

## 2. Dataset / schema
- **SoccerMon 2020** (elite Norwegian women's football), reconstructed resource: 3,743 athlete-sessions from 48 athletes; modeling cohort = 2,259 Team A athlete-sessions from 27 athletes, including all 22 positive sessions arising from just 5 athletes.
- Features: PRE (14 contextual: 7 workload, 2 sleep, 5 wellness — substantial missingness, unverified same-day sleep timing), CUM (30 expanding summaries from session start to current minute: means, variability of accelerometer/gyroscope), DYN (33 short-horizon dynamic summaries: first differences, trailing-5-observation windows). CUM+DYN (63) = primary (sensor-only); ALL = 77.
- Target: same-day injury-associated athlete-session indicator (session-level, onset time unknown).

## 3. Method / model
**Landmark framework:** fixed elapsed-time landmarks at 10, 20, 30, 40, 50, 60 min; at each landmark ℓ, representation X_{a,s,1:ℓ} uses only information observed by that session-clock point; exactly one representation per athlete-session per landmark; target stays session-level.
**Benchmarking:** logistic regression, Random Forest, XGBoost, TabPFN on CUM+DYN; training-only augmentation conditions NONE / SMOTE / CTGAN.
**Robustness:** athlete-disjoint evaluation; paired athlete-cluster bootstrap; fixed 2,104-session 60-min common cohort; 100 alternative negative-athlete fold allocations; leave-one-positive-athlete-out; equal-athlete weighting.

## 4. Equations & assumptions
(1) Landmark representation: X_{a,s,1:ℓ} = within-session monitoring observed no later than ℓ; C_{a,s} = contextual variables. (2) Feature sets: PRE(14), CUM(30), DYN(33), combos; primary CUM+DYN (63). (3) Estimand: P(injury-associated session | X_{a,s,1:ℓ}) — session-level, not minute-level. (4) Metrics: ROC-AUC, PR-AUC with athlete-cluster bootstrap CIs.
Assumptions: session-level label is the only valid supervision; landmarks must use only information available by ℓ (no look-ahead); athlete-disjoint folds required (positives cluster in 5 athletes); PRE timing unverified → contextual sensitivity only, not deployment-ready.

## 5. Features / target
Accelerometer/gyroscope summaries (expanding + trailing windows, first differences), workload/sleep/wellness context. Target: injury-associated session indicator.

## 6. Validation design
Athlete-disjoint CV; landmark-by-landmark evaluation (10–60 min); model-family benchmark on matched CUM+DYN; augmentation ablation; four robustness analyses; explicit "no minute-specific prediction" framing.

## 7. Numerical results / baselines
- **Primary CUM+DYN logistic regression ROC-AUC:** 0.499, 0.557, 0.607, 0.428, 0.402, 0.367 across 10–60 min — non-monotonic, near/at chance at later landmarks. Pattern persists on the fixed common cohort and across fold allocations.
- **TabPFN:** 0.692 at 30 min; improves later-landmark discrimination vs logistic regression but does not consistently beat Random Forest.
- **PRE-containing representations** look stronger (PRE alone ~0.70; PRE+DYN 0.784 at 20 min) but paired contrasts vs CUM+DYN include zero at every landmark, and PRE has missingness + timing ambiguity — treated as sensitivity, not evidence.
- **Synthetic augmentation:** condition-specific, not universal — RF benefits at 30-min SMOTE / 40-min CTGAN; logistic regression shows little benefit and several negative CTGAN contrasts; CTGAN shows no near-duplicate memorization but substantial distributional drift.
- Core limitation stated plainly: only 5 positive athletes — inferential precision is fundamentally limited.

## 8. Code / data availability
Public code repository linked in the reproducibility statement; raw SoccerMon data not redistributed.

## 9. Leakage & limitations
(i) Only 22 positives from 5 athletes — any "signal" could be athlete identity, not injury; leave-one-positive-athlete-out confirms fragility; (ii) landmark discrimination is non-monotonic and mostly near chance on clean sensor features; (iii) PRE's apparent gains are confounded by missingness/timing; (iv) the paper's own conclusion: contribution is the framework, not injury prediction.

## 10. GSE overlap
Directly relevant to GSE's injury-modeling methodology. GSE's injury labels are game/session-level (injury reports, DNPs, snap drops) while workload signals are higher-resolution (practice participation trajectories, snap-load trends, travel/rest sequences). The paper gives the **anti-footgun protocol**: one representation per player-game at fixed landmarks (e.g., Wednesday/Thursday/Friday practice-report checkpoints), never label-smearing across days, player-disjoint evaluation, cluster bootstrap over players. Its negative result disciplines the 0772-style readiness work: with few positive athletes, availability models will look predictive in-sample and collapse athlete-disjoint — run the paper's robustness battery before trusting any GSE availability signal. Also relevant to props: don't build "in-game injury probability tickers" from session-level labels — the paper shows that's exactly the unsupported-supervision error.

## 11. GSE implementation spec
- **Availability-model evaluation protocol** (adopt immediately for 0772's readiness work and any workload-based injury model): player-game as the unit; features frozen at weekly checkpoints (Wed/Thu/Fri reports); target = missed/next-game-DNP indicator; player-disjoint folds; cluster bootstrap CIs; leave-one-positive-player-out sensitivity; report landmark-by-landmark (checkpoint-by-checkpoint) discrimination and expect non-monotonicity.
- **Label-resolution audit**: scan existing GSE injury/projection code for any replication of game-level labels across sub-game time units; remove or reframe as session-level.
- **TabPFN note**: worth a benchmark slot on tabular availability features given the 30-min 0.692 result, but the paper says don't expect it to dominate RF.
- Effort: ~2 days to retrofit the evaluation protocol onto existing availability models.

## 12. Reproducible test
Dataset: 2020–2025 NFL injury reports + practice participation (nflverse). Unit: player-game. Landmarks: Wednesday, Thursday, Friday report checkpoints. Representations: cumulative (season-to-date load summaries) + dynamic (week-over-week participation changes). Target: DNP/out next game. Compare logistic regression / RF / XGBoost / TabPFN with player-disjoint CV and player-cluster bootstrap. Success: the protocol runs clean and produces honest checkpoint-by-checkpoint AUCs; the test passes if we can *detect* the paper's failure modes (non-monotonicity, athlete-clustering) when present rather than shipping an overfit availability score.

## 13. Acceptance / rejection gate
ADAPT the landmark/unit-alignment framework and the robustness battery as mandatory evaluation discipline for all GSE injury/availability modeling. ADOPT TabPFN as a benchmark candidate only. REJECT any GSE model that replicates session-level injury labels across sub-session time units — rebuild it under this framework.

## 14. Improvement experiment
Extend the landmark framework with a *landmark-conditional* estimand: instead of one session-level label, define the target as "injury-associated session AND the athlete completed the session past landmark ℓ" (conditioning on survival to ℓ), which removes the survivorship confound the paper notes but doesn't model. Re-run the CUM+DYN benchmark under this estimand; if discrimination becomes monotonic in ℓ, the non-monotonicity was survivorship artifact, not noise — a cleaner foundation for GSE's weekly checkpoint protocol.
