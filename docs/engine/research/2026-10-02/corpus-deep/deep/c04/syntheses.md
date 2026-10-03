# c04 Coaching Module — Syntheses

Cross-file connections from Phase 2 deep research. Every synthesis names its sources; [INFERENCE] marks interpretive steps.

---

## S-1 — The two-layer decision system (0207 + 1575)

**Sources:** VC-1 (1575), VC-3 (0207).

The slice independently produced a prescriptive layer and a descriptive layer that compose into one system:

- **Prescriptive (0207):** shrunk situation-profile WP surface over state σ=(score diff, time remaining, down, distance, yardline, timeouts) → risk-neutral optimal action a*(σ) ∈ {GO, FGA, PUNT} per state, plus 2-pt and timeout decisions. Mechanics: blended profiles, James–Stein shrinkage, MC trajectory search.
- **Descriptive (1575):** per coach-team × region × WP-bin τ̂ predicting the action the coach will *actually* take — via the τ-optimal policy under quantile objective q^π̄_τ.

**Composition:** for each 4th-down state, the engine computes (a) WP-optimal action, (b) τ̂-predicted action, (c) the WP-points gap between them. This yields three products from one pipeline: the optimal recommendation, the behavior prediction (for drive-outcome/live-WP conditioning), and the coach-decision audit (gap in WP points, the "coach decision audit" content lane both briefs name). [INFERENCE] The τ̂ layer is the behavior model; the 0207 layer is the optimality model; the audit is their difference.

## S-2 — Risk preference explains the aggression trend the corpus keeps tripping over

**Sources:** VC-1 (1575 time trend), VC-2 (0247 conservatism findings), corpus checkpoint (4-4 Steelers–Browns card, Monken quick-game).

1575 documents league risk tolerance rising 2014–2022 in every WP×region cell. 0247 (2009–2015) documents coaches leaving +1.4 points/drive on the table. Together: the "coaches are too conservative" finding is not static — any hardcoded aggression constant decays. [INFERENCE] This is why the τ̂ fit must be refit each offseason on a rolling window (the brief's prescription) rather than baked as a constant — the same lesson as the HFA decline (1.73 pts, β̂₁=−0.032/yr) elsewhere in the slice. Both are time-decaying coaching/environment parameters, and both need the T^(2/3) forgetting-window treatment the corpus identified for coach-era weighting.

## S-3 — Heterogeneity lives in the opponent half (feature-selection rule)

**Sources:** VC-1.

Own-half τ̂: uniform across coaches → not a per-coach feature (pool it). Opponent-half τ̂ at low WP: wide variation, ~half risk-seeking, four coaches exceeding the Bot → genuine per-coach signal. [INFERENCE] This is a verified instance of the corpus's per-individual-fitting gate: fit opponent-half τ̂ per coach-team; use league-pooled τ̂ for own-half. Serving per-coach own-half τ̂ would be fitting noise — the paper's own uniformity finding says so.

## S-4 — The descriptive tendency tables are the τ̂ fit's input, not its replacement

**Sources:** VC-4 (Analyst C inventory), VC-1.

`~/workspace/coaching-tendencies/` computes `go4th_rate`/`two_pt_rate` — raw go rates per team-season. τ̂ is the *risk preference rationalizing* those rates under the quantile-MDP inverse problem. The tables give the pipeline its observed-decision dataset (with the verified coach→team→season tenure mapping solving the unit-of-analysis problem Analyst A flagged: coach-team, not team-season). [INFERENCE] Build order: tenure mapping (exists) → observed 4th-down decisions per coach-team-season (extend, don't rebuild) → τ̂ fit (new) → serve τ̂(team, region, WP bin) as a feature. The c03 core tendency engine owns the tendency tables; the coaching/ module owns the τ̂ layer and the situational engine — no overlap by construction.

## S-5 — The acceptance gate is already written (adopt it, don't invent one)

**Sources:** VC-3 (B2 verified as brief-author proposal).

The 0207 brief's proposed gate — ≥5% Brier improvement over raw MLE on held-out 2026 drives AND ≥80% agreement with 4th-down-bot on a 200-play audit — plus 1575's brief gate — team-specific τ̂ rule beats risk-neutral WP-max rule by ≥3 pp Hamming accuracy in the opponent half on 2024–2025 4th downs — are concrete, falsifiable, and cheap to run. [INFERENCE] Adopt both verbatim as the module's promotion gates rather than designing new ones; they compose (gate 1 tests the prescriptive layer, gate 2 tests the descriptive layer).

## S-6 — 2-pt and timeout decisions are the same engine with different action sets

**Sources:** VC-3, VC-4 (1684 spec, 0247 PAT analysis).

0207's proposed state space already includes 2-pt and timeout decisions; 0247 supplies the 2-pt rational baseline (1.02 vs 0.984 expected points); 1684 supplies the only concrete NFL timeout spec (propensity GAM/GBM + genetic matching on integrated centered WP). [INFERENCE] One `SituationalEngine` class with pluggable action sets {GO/FGA/PUNT}, {XP/2PT}, {TIMEOUT/NO-TIMEOUT} beats three separate modules — the shrinkage machinery and state definition are shared; only the outcome model and action set change. Build 4th-down first (data-richest), 2-pt second (0247 baselines exist), timeout third (thinnest spec).

## S-7 — Complementary football feeds the state definition

**Sources:** c04-map top-20 #4 (0678).

Previous-drive non-scoring turnover (+0.6–1.0 pts/drive, +21-yard field-position bump, median post-turnover start own 41) is a drive-EP feature that belongs in the situational engine's state or as a pre-state adjustment. [INFERENCE] The WP surface should condition on previous-drive turnover × starting position where sample allows, or the engine will systematically misprice post-turnover 4th-down states.
