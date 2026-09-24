# [0027] Can Semantic Methods Enhance Team Sports Tactics? A Methodology for Football with Broader Applications (arXiv:2601.00421v2)

**Citation:** Alessio Di Rubbo, Mattia Neri, Remo Pareschi, Marco Pedroni, Roberto Valtancoli, Paolino Zica (2026). *Can Semantic Methods Enhance Team Sports Tactics? A Methodology for Football with Broader Applications*. Published in *Sci* 2026, Vol. 8, Issue 3, Article 63. DOI: 10.3390/sci8030063. arXiv:2601.00421v2. URL: https://arxiv.org/abs/2601.00421v2
**Ledger completed:** 2026-09-21. **Read:** full text (arXiv PDF).
**Verdict:** REJECT — soccer coaching decision-support with no predictive model or real dataset; semantic template-matching methodology is too distant from GSE's betting-model engine to justify adaptation.

## 1. Research question
Can semantic-space reasoning (from computational linguistics) be extended to tactical decision-making in team sports: represent team states and tactical strategies as vectors in a shared 14-dimensional attribute space, select tactics by minimizing adapted semantic distance, and provide attribute-level diagnostics? Validated on synthetic scenarios and one German youth-football pilot match. (Paper: Abstract, §1, §3.)

## 2. Dataset / schema
- **Synthetic player attributes:** role-specific Gaussian distributions (Table 21) for 5 roles (GK, CB, FB, CM, FW) × 12 attributes (reflexes, aerial duels, passing, speed, stamina, resilience, dribbling, tackling, interceptions, xG, xA, aggression) with stated (μ, σ) per role-attribute cell.
- **Pilot match (real data):** one C-Junioren (U14/U15) German Saarlandliga match 2023–24, SSV Pachten vs. JSG Stausee-Losheim, 4:3 final. Six German categorical attributes (Offensivkraft, Kompakte Defensive, Direkte vertikale Angriffe, Gegenangriff, Gegenpressing, Restenergie) rated Hoch/Mittel/Niedrig per half, mapped to 5 DSS dimensions (A1, A2, A4, A5, A8).
- No proprietary/public dataset URL; code repo only.

## 3. Method / model
- **Context tree:** 3-level hierarchy (leaf player metrics → role-aggregated intermediate nodes → 14 macro-attributes A1–A14 at root), min-max normalized to [0,1] against league/historical benchmarks, with reliability tiers (c1=1.0 event data, c2=0.85 tracking/physiological, c3=0.70 qualitative), missing-data imputation hierarchy, and temporal alignment to match phases.
- **20 strategy templates:** encoded as 14-dim ideal-profile vectors via 4-stage expert elicitation (3 independent raters, 20×14 rating matrix, 5-point qualitative scale → numeric mapping with 0.2 non-zero floor; Krippendorff's α = 0.71 ordinal; 42/280 disputed pairs reconciled by video conference; face-validity review by 2 independent practitioners; calibration against 100 Bundesliga matches, mean r = 0.68).
- **Selection rule:** S* = argmin_S d_adapt(V_team, V_strategy(S); w) with dynamic weight vector w from energy/gap/time-pressure multipliers (eqs. 5–13, clamped to [0.3, 2.5], normalized to sum 14); optional opponent-aware objective d_comb(S) = d_adapt(V_team, V_S) − α·d_adapt(V_opp, V_S), default α = 0.2.
- Algorithm 1 (selection, O(m·n) = O(20·14), <5 ms per evaluation); diagnostics Δ_j = (V_strategy* − V_team)_j per attribute.

## 4. Equations & assumptions
- Min-max normalization: x̃ = (x − x_min)/(x_max − x_min) (eq. 1); benchmark bounds x_min = μ − 2σ, x_max = μ + 2σ in the prototype (paper text; PDF extraction garbled subscripts — flagged uncertain).
- Euclidean baseline: d_eucl(x,y) = √(Σ_j (x_j − y_j)²).
- Context-adapted distance: d_adapt(x,y;w) = √(Σ_j w_j (x_j − y_j)²).
- Opponent-aware: d_comb(S) = d_adapt(V_team, V_S) − α·d_adapt(V_opp, V_S), α ∈ [0,1].
- Aggregation: A_j = Σ_i w_ij a_ij, Σ_i w_ij = 1 (eq. 3); e.g. A1 = 0.50·ForwardOutput + 0.30·MidfieldCreativity + 0.20·WideContribution.
- Dynamic multipliers: m_5 = 1 − γ_e·δ_e; m_10 = 1 + γ_e·δ_e; m_13 = 1 − 0.5·γ_e·δ_e (eqs. 5–7), with δ_e = max(0, τ_e − e), τ_e = 0.5, γ_e = 1.5; gap-based m_2 = 1 + γ_g·max(0,−Δ_tech), m_11 = 1 + γ_g·max(0,−Δ_phys) (eqs. 8–9, γ_g = 1.0); time pressure δ_t = max(0, τ_t − t)·1[s ≤ 0], τ_t = 0.25, m_4 = 1 + γ_t·δ_t, m_1 = m_1 + γ_t·δ_t (eqs. 12–13, γ_t = 2.0).
- Mahalanobis alternative noted: d_M(x,y) = √((x−y)ᵀ Σ⁻¹ (x−y)) — not implemented.
- Robustness index: R = (1/K) Σ_k 1{Ŝ*_k = S*}, R ∈ [0,1]; satisfactory if R > 0.9 (paper's equations 2 and R garbled in extraction; structure as stated).
- **Assumptions:** (i) strategy attribute-requirements elicited from 3 soccer experts generalize; (ii) linear additive attribute contributions; (iii) Euclidean capability-gap semantics valid; (iv) α-default 0.2 chosen by reasoning not data; (v) synthetic attribute distributions approximate real teams; (vi) opponent data static where used (α=0 in pilot).

## 5. Features / target
- **Inputs:** team vector V_team ∈ [0,1]^14 (A1–A14: Offensive Strength, Defensive Strength, Midfield Control, Transition Speed, High Press Capability, Width Utilization, Psychological Resilience, Residual Energy, Team Morale, Time Management, Tactical Cohesion, Technical Base, Physical Base, Relational Cohesion) + opponent vector + 6 match-state inputs (A8, A12, A13, opponent A12/A13, time fraction t, score state s).
- **Target:** ranked list of 20 tactic templates + per-attribute diagnostic deltas. This is a recommendation/ranking task, not a prediction of outcomes. No train/test split; no learned model weights.

## 6. Validation design
- **Synthetic scenario evaluation (§5):** 4 scenarios (Energetic & Balanced; Fatigued & Inferior; High Temporal Pressure; Technical & Physical Superiority). Checks: contextual coherence, ranking monotonicity, Monte Carlo noise robustness (ε ∼ U(−0.05,+0.05), N=100/scenario), correlated perturbations, missing-data patterns M1–M3, distribution shifts, ablation of attribute-wise vs uniform vs global-scaling weighting, Euclidean vs cosine comparison, floor sensitivity (f ∈ {0.05..0.35}), α sensitivity.
- **Pilot study (§6):** single-match retrospective feasibility demonstration with pre-specified endpoints (processing feasibility; blind expert agreement of 2 reviewers; descriptive tactical alignment); compared vs. random, default-strategy, and energy-only-heuristic baselines. Explicitly NOT causal (no counterfactual; team diverged from DSS advice and won 4:3).
- No held-out match-outcome prediction anywhere.

## 7. Numerical results / baselines
- **Scenario coherence (§5.2):** DSS recommended High Pressing/Gegenpressing (d_adapt < 0.15) in Energetic & Balanced; Positional Defense when fatigued; Fast Counterattack under time pressure; Buildup Play under superiority — matching expert intuition in all 4 scenarios (attributewise weighting; uniform weighting failed in 2/4).
- **Robustness:** top-1 consistency 89.3% under ±5% independent noise (range 82%–96%), top-3 set stability 94.1%; correlated perturbations drop to 81.2% (all clusters); missing tracking data (M1) 78.5%, psychological (M2) 85.2%, sparse (M3) 67.3% but 84% qualitative (same-category) agreement; distribution shift expert agreement 82% (youth), 88% (lower division), 78% (style shift).
- **Ablation:** attributewise weighting correct in 4/4 scenarios vs 2/4 (uniform) and 3/4 (global scaling); gegenpressing ranked 18/20 in Fatigued & Inferior under attributewise vs 4/20 uniform.
- **Multicollinearity:** A7–A9 r = 0.98 (VIF 35.1/37.0), A3–A6 r = 0.90 (VIF 21.6/18.4); consolidated-12-dim rankings τ = 0.91 vs 14-dim, top-1 agreement 94%.
- **Strategy vector internal consistency:** High Press vs Gegenpressing cosine 0.97; expert ratings 58.2% exact agreement, 89.6% within one level; Krippendorff α = 0.71; Bundesliga calibration r = 0.68 (n=100 matches); floor sensitivity τ = 0.94; strategy-vector perturbation stability >85%.
- **Pilot (§6):** Endpoint 1 PASSED (pipeline <50 ms, no degenerate output, 5-dim reduced space). Endpoint 2 PASSED: Expert 1 "Appropriate", Expert 2 "Partially Appropriate" (preferred Cautious Horizontal Play, ranked 3rd); both endorsed ≥1 top-3 strategy. Endpoint 3: observed tactics diverged from recommendation on 3/5 dimensions (A2: rec 0.50 vs obs 0.20; A4: 0.50 vs 0.85; A8: 0.60 vs 0.20); team won 4:3 anyway. Baselines: random → "Offside Trap" (inappropriate, 0/2); default Buildup Play matched DSS (2/2); energy-only heuristic → Positional Defense (partial, 1/2).
- All results from the paper's synthetic experiments and one youth match; authors explicitly disclaim operational validity ("the system behaves as designed; whether DSS recommendations would improve actual coaching decisions or match outcomes remains an open empirical question").

## 8. Code / data availability
- Code: https://github.com/Aribertus/footballdsssemanticdistance (football_strategy_generation_1_3_1.py, make_figures.py, compute_pilot_distances.py; SEED=41; accessed 2026-02-25 per paper). No code downloaded/verified by this review.
- Data: all relevant data in the article; synthetic distributions in Appendix Table 21; pilot observations in Tables 14–15.

## 9. Leakage & limitations
- **No predictive validation:** everything is scenario-coherence + one retrospective match; the DSS's ranking is fully determined by hand-elicited expert vectors and fixed hyperparameters — it cannot be "wrong" except against expert intuition, which is circular validation.
- Pilot: single convenience match, one team's observations only (α=0, no opponent modeling), 6/14 attributes observed, youth football context, retrospective application (no coaching influence measured).
- Severe multicollinearity (VIF up to 37) acknowledged but retained for "interpretability".
- Static strategy templates; no operational constraints (player availability); linear distance assumptions acknowledged as inadequate for football's nonlinear synergies.
- **External validity to NFL betting: none demonstrated.** The transferable skeleton (profile-vector + context-adapted distance + opponent-gap penalty) is generic decision-support, not sports prediction; the authors mention American football only as a candidate sport (§8.2.7), no NFL application.

## 10. GSE overlap
- **None.** No corpus item covers semantic-space tactical DSS. Closest conceptual neighbors: formation/tactics analysis papers (none predictive for NFL betting), matchup-profiling content. The existing-research map's relevant gaps (live NFL modeling, matchup analysis) are about prediction and probabilities, not coaching tactic recommendation — no duplication risk.

## 11. GSE implementation spec
- None warranted (REJECT). If ever revisited, the only transferable component is the opponent-aware distance idea: d_comb = fit(own team, scheme) − α·fit(opponent, scheme) as a structured heuristic for NFL game-plan fit (e.g., blitz-heavy scheme vs. opponent's quick-release profile), requiring a full re-elicitation of NFL-relevant attributes and schemes plus outcome calibration — effectively a new project, not an adaptation of this paper.

## 12. Reproducible test
- Not applicable (REJECT). A minimal sanity check would be: run the public repo's scripts with SEED=41 and confirm the reported scenario recommendations reproduce (the authors claim all figures regenerate). No GSE data test is meaningful since the paper makes no predictive claim.

## 13. Acceptance / rejection gate
- **REJECT gate (pre-registered standard):** the paper contributes no predictive model, no learned parameters, no validation against outcomes, and no dataset applicable to NFL. It is a soccer coaching DSS validated on synthetic scenarios and one youth match — correctly rejected from GSE's betting-model program.

## 14. Improvement experiment
- If a GSE-adjacent DSS were ever built (out of scope): replace Euclidean-with-expert-vectors by a **learned metric**: collect NFL team-season attribute profiles (EPA components, pressure rates, injury/fatigue proxies, market spreads) and fit a supervised ranking model (e.g., ListNet/gradient boosting) that predicts which play-style profile maximizes cover probability against a given opponent profile, using historical ATS outcomes as the target — turning this paper's hand-elicited template matching into an outcome-calibrated system. This abandons essentially the entire paper except the "team vector + strategy vector + distance" skeleton.

---
*Flags: (a) Equation subscripts/superscripts and some Greek letters garbled in PDF extraction; structural forms verified against paper prose — re-check against the published Sci article (DOI: 10.3390/sci8030063) before citing any formula. (b) Repo code not downloaded/verified. (c) Out of scope — candidate only as a conceptual seed for a future NFL decision-support tool, not a research lead.*
