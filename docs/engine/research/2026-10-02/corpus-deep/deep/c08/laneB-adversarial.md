# c08 Lane B — Adversarial Verification: Selective Prediction, Abstention, Distrust

**Lane:** B (adversarial verification — the devil's-advocate read on abstention/selective-prediction claims).
**Date:** 2026-10-02. **Status:** Phase 2 critical thinking, not summarization.
**Write mode:** append-only (this file is new; no prior content existed).

Core question the adversary answers: *which of these abstention/selective-prediction claims survive hostile scrutiny, and what exactly breaks when they meet a published card, real money, and a human reviewer?*

---

## VERIFIED CLAIMS

Format: claim → source file:line → verdict → adversarial note.

### VC-1. 1492 selective-prediction messaging numbers — CONFIRMED
- `docs/arxiv-program/research/2026-09-21/arxiv-deep/1492-human-ai-selective-prediction.md:28`: DO 61.9% vs NM 58.4% (p<0.001); deferral-status shown (DO+BM) 60.4% vs not-shown (PO+NM) 57.4% (p<0.001); prediction shown 57.8% vs not shown 60.2% (p=0.003); on model-wrong images PO human accuracy 41.9% (below chance) vs 50.6% other conditions (p<0.001); model-correct images showing predictions gains only 5.1%.
- Design confirmed `:16`: 2×2×2 within-subject, 198 Prolific participants, 80 deferred images each, factors = deferral-status shown/not × prediction shown/not × model correct/incorrect.
- Adversarial note: every number carries its subset. The 41.9%-below-chance figure is conditioned on *model-wrong images only* — quoting it as general human accuracy under prediction-showing is misrepresentation (see INFLATION WATCH). The +5.1% on model-correct images is the asymmetry the DO-only policy deliberately sacrifices.

### VC-2. 1492 lab-artifact risk — CONFIRMED, risk rated HIGH for magnitude / MODERATE for direction
- Source `:34` (authors' own caveats): results "not likely to be robust across datasets, different human-AI use scenarios, or participant expertise levels"; only two deferral-status levels tested; no timing data explaining why DO helped; participants didn't know all images were deferred; domain-expert interactions differed; conformity measured only NM→PO (not BM).
- Binary camera-trap task (animal present or not, `:13`), lay Prolific labelers, NOT sports analysts reviewing NFL picks. Transfer distance is large.
- What survives adversarial scrutiny: the *direction* of the anchoring effect (showing wrong predictions drags humans below chance) is mechanistically plausible for any review workflow; the *magnitude* (8.7pp drag, 3.5pp DO gain) does not transfer. The file's own disposition agrees — `:49` marks ADAPT for the deferral-budget policy but "Not ADOPT" for anchoring magnitudes, requiring the internal replication (`:46`: DO vs BM on 40 abstained matchups, pass = DO-style ≥ BM-style) before standing policy. The adversary's position: until that internal experiment runs, the messaging rule is a *hypothesis with a protocol*, not a policy.

### VC-3. 1776 per-class abstention formulation — CONFIRMED
- `docs/arxiv-program/research/2026-09-21/arxiv-deep/1776-classification-abstention-class-conditional-error-constraints.md:14`: selective classifier minimizing ambiguity subject to separate class-conditional error constraints (R0 ≤ 0.05, R1 ≤ 0.05); product ambiguity (multiplicative) vs additive ambiguity (sum).
- `:19-20`: strict deterministic feasibility can force excess ambiguity risk of 1 (abstain on everything); randomized prediction restores feasibility. Constraints R0 ≤ α0, R1 ≤ α1, experiments at 0.05/0.05.
- `:36`: product ambiguity usually abstains less but can violate the per-class cap (Phoneme R0 = 0.0551 over cap; synthetic 0.0512/0.0479); additive is the safer, usually-feasible choice.
- Per-market-type port confirmed `:51`: classes = spread/total/moneyline; one gate per class with separate error caps *set from bankroll tolerance, not 0.05*; minimize additive ambiguity; randomized tie-breaking at the gate boundary so strict feasibility doesn't force degenerate all-abstain weeks; log realized per-class error weekly; re-fit caps quarterly.
- Acceptance gate in-file `:57`: ≥15% lower abstention than the global gate on walk-forward seasons, all market types under caps; hard fail if any market's realized error exceeds its cap in >1 of 4 test seasons.
- Adversarial note: the paper's 0.05 caps are count-loss binary-classification caps; sports caps (e.g. ≤45% loss-rate per market) must be re-derived from bankroll tolerance — copying 0.05 into production would abstain the card into oblivion. And the paper's objective is count-loss, not unit-loss; see Challenge E.

### VC-4. Reader-55 eligibility-gate state (RES 0.002 / Brier 0.275 / ECE 0.11 → RED) — CONFIRMED
- `docs/ops/ENGINE_RANKING_RES_NEAR_ZERO.md:4`: "Overall Murphy resolution ~0.002, Brier ~0.275, ECE ~0.11 → eligibility RED is correct."
- `:8`: "Maps (Platt/Temp/PAVA) fix reliability, not ranking." "Enabling adjustments to mask Res~0 is forbidden."
- Cross-check with 1776: today's eligibility surface is a *single global gate* (`apps/web/lib/ops/calibration-eligibility.ts` floors Brier 0.22 / ECE 0.05 / Murphy-reliability, 3-streak — per `docs/ops/edge/2026-08-19-calibration-gate-split-map.md:13-18`). 1776's proposal would replace one global eligibility gate with per-market-type gates carrying separate caps. The adversary notes this multiplies the gates that must independently stay GREEN — a strictly harder feasibility problem, which is exactly why 1776's randomized-feasibility result matters here: per-class strict feasibility risks degenerate all-abstain weeks.
- Minor correction on the map's phrasing: the source file says ECE **~0.11**, not 0.112. The "independents raise RES" phrasing attributed to reader 55 is INFERENCE consistent with the file's repair path (per-group artifacts, edge filter, market-relative features — `:10-14`) but not a direct quote; the file's own theorem is only "maps don't invent RES."

### VC-5. 0211 LOPO collapse (R² 0.91 → 0.38) — CONFIRMED, with the inflation caveat the file itself carries
- `docs/arxiv-program/research/2026-09-21/arxiv-deep/0211-crossindividual-generalizability-of-machine-learning-models.md:32-35`: Table 2 exact — Transformer (4,64,128): 0.38 selected baseline; GNN-GRU configs 0.14–0.28; Transformer 0.17–0.38; headline "cross-individual R² = 0.38 vs. within-individual R² = 0.91."
- The file's own adversarial finding `:43`: early stopping on *training* R² > 0.90 is methodologically odd — the within-individual 0.91 may itself be inflated, so the 0.53 gap is an *upper bound* on the true generalizability gap, not a clean measure. The adversary's rule: never quote 0.91 without the caveat (see INFLATION WATCH); the honest pooled number for the adversary's purposes is "0.38, with the comparison arm possibly inflated."
- Player-specific-parameter connection (verified in file `:54`): LOPO protocol for GSE prop/DFS models — report LOPO R²/MAE alongside pooled CV; adopt as mandatory gate if degradation ≥10% relative. Adversarial hardening of that gate: see Challenge C and BUILDABLE-3.

### VC-6. 1472 ForecastBench-sim correlation ρ = +0.43 — CONFIRMED
- `docs/arxiv-program/research/2026-09-21/arxiv-deep/1472-forecastbench-sim-simulated-world-forecasting.md:27`: "Spearman ρ = +0.43, p = 0.018, N = 30 — modest but significant."
- `:36`: stylized Freeciv world; fixed rules and rule-based agents; ρ = 0.43 leaves most variance unexplained.
- "Simulated resolution is only as good as the simulator" — confirmed as the file's stated limitation. For the adversary: a sim that reports calibration *gains* is guilty until proven innocent. The file's in-brief acceptance gate (±0.05 slope match between sim-resolved and real-outcome calibration on 2024) is the minimum bar, but the adversary demands the sim be *frozen/locked before* the comparison — otherwise the simulator is tuned to pass its own test (see Challenge D and BUILDABLE-4).
- INFLATION note: ρ² ≈ 0.185 — sim explains ~18% of the variance in real-world model skill. "Validated on ForecastBench-Sim" means a signal, not a certificate.

### VC-7. Isotonic plateaus vs Kelly sizing (RES ≈ 0) — CONFIRMED
- `docs/ops/ISOTONIC_EXPLORATION.md` (entire file): "Isotonic plateaus can destroy ranking if used for Kelly conviction while Res≈0." Standing posture: isotonic OFF until resolution improves and holdout floors are met.
- Pairs with `ENGINE_RANKING_RES_NEAR_ZERO.md:8` (maps fix reliability, not ranking).
- Mechanism, stated plainly: PAVA pools distinct raw scores into flat output plateaus; when RES≈0 the sizing layer needs *ranking* to differentiate conviction, and the calibrated map has destroyed exactly that. INFERENCE: calibration and staking are a joint decision, not two independent steps. A calibration method can be correct for display (ECE↓) and harmful for sizing (rank-collapse) simultaneously — the two objectives need separate score pipelines or a rank-preserving constraint. See BUILDABLE-5.

### VC-8. 1151 two-threshold conformal abstention — CONFIRMED
- `docs/arxiv-program/research/2026-09-21/arxiv-deep/1151-learning-conformal-abstention-policies.md:20-23`: q̂_predict and q̂_abstain as (1−α)/(1−β) quantiles of nonconformity s(x)=1−p_y(x); three regimes single-prediction / prediction-set / abstain.
- `:59`: three-way structure (post / lean-with-interval / abstain) is new capability vs paper 1150's two-way; maps onto post-a-pick vs lean vs no-play.
- `:63`: grid-search (α,β) on chronological validation (drop the RL tuning — `:6`, no ablation vs grid search, unreported λs).
- `:75`: make β **market-conditional** (spread/total/moneyline) — a single β likely over-abstains where edge is thinnest; hypothesis: moneyline-specific β recovers 5–10% more posted picks at equal accuracy.
- Adversarial note: the 1151 market-conditional-β idea and the 1776 per-class-gate idea are the *same architectural move* discovered twice (per-market-type gating). INFERENCE: they compose into one system — 1151's conformal two-threshold structure for the publish decision, 1776's per-class caps + additive ambiguity + randomized tie-breaking for the gate feasibility. The adversary's demand: one implementation, one acceptance test, not two parallel gate systems.

---

## CHALLENGES

Adversarial arguments against the proposed builds. Each is a real failure mode, not a strawman.

**Challenge A — Per-class gates on correlated classes.** 1776 assumes classes with separately meaningful error constraints. In sports, spread and moneyline errors are correlated (same underlying game outcome; line moves together). Per-class caps on correlated classes can be *simultaneously* violated by the same bad week — the feasibility proof assumes the constraint structure, not the correlation structure. The build must measure inter-class error correlation before trusting per-class feasibility; if ρ(error_spread, error_ml) is high, the "separate caps" are one cap wearing a disguise, and the additive-ambiguity minimization is optimizing against a constraint set that binds jointly. Randomized tie-breaking at the boundary then becomes *coin-flip behavior on real-money decisions* — every draw must be logged with its seed, and the weekly share of draw-influenced decisions must be reported (BUILDABLE-6).

**Challenge B — The DO-messaging rule may reverse under experts.** 1492's subjects were lay image-labelers. An expert NFL analyst may *benefit* from seeing the engine lean (as a second opinion) more than they suffer from anchoring — expertise could flip the sign of the effect. The file anticipates this (`:52`: three-arm replication adding a confidence-armed arm). The adversary's stronger version: even the direction could differ by *reviewer*, making a standing policy wrong for some analysts. The internal replication must be run per-analyst, not pooled, or the policy is imposed on evidence about other people.

**Challenge C — LOPO's unit of generalization is unstable in sports.** 0211's pitchers are stable individuals; NFL "players" are not — they change teams, schemes, roles, and injury states across the 2023–2024 window the file proposes (`:54`). A LOPO test that holds out a player who changed teams mid-window confounds player-generalization with regime-generalization. The adversary demands the LOPO protocol stratify by regime-stability: report LOPO-within-stable-regime and LOPO-across-regime separately. A pooled-vs-LOPO gap driven by team changes is not evidence of player-memorization; it is evidence the features aren't regime-robust, which is a different defect with a different repair.

**Challenge D — The simulator can be tuned to pass its own gate.** If the sim-resolved calibration must match real-outcome calibration within ±0.05 slope, an unfrozen simulator can be iteratively adjusted until it matches — the gate then measures the simulator-builder's patience, not the simulator's fidelity. INFERENCE: the sim must be version-locked (hash recorded) *before* the comparison run, and the comparison must be on a season the sim was never tuned against. Any "sim-resolved" claim without a lock hash is inadmissible.

**Challenge E — Count-loss abstention misprices the actual decision.** 1776 minimizes abstention *count* subject to error-rate caps. In sports, a wrong posted pick costs units and a missed opportunity costs expected units — the decision is in *unit loss*, not counts. Minimizing abstention subject to a 45%-loss-rate cap can still pick the highest-unit-loss configuration that satisfies the cap. The file's acceptance gate (`:57`) mentions units, but the gate model itself is count-loss. The adversary requires the ambiguity objective to be re-derived in expected-unit terms, or the gate is optimizing the wrong ledger.

**Challenge F — The deferral-budget r is auditable but gameable.** 1492's r (deferral rate ≤ budget) is an explicit parameter, but a gate that must abstain *at most* r can be satisfied by abstaining on the r easiest-to-justify games rather than the r lowest-confidence ones. The budget needs a *which* rule, not just a *how many* rule — tie the deferral set to the lowest nonconformity-ranked scores, and log the rank cutoff.

---

## BUILDABLE SYSTEMS

Concrete enough to become code contracts. Each names inputs, outputs, invariants, and the test that kills it.

### BS-1. `perMarketAbstentionGate` — the 1776×1151 combined gate
- **Inputs:** calibrated win prob p, market-implied prob q, market type m ∈ {spread, total, moneyline}, per-market caps {α_spread, α_total, α_ml} (set from bankroll tolerance, re-fit quarterly), nonconformity score s = 1 − max(p, 1−p), market-conditional thresholds (q̂_predict_m, q̂_abstain_m) from 1151's grid-searched (α_m, β_m).
- **Outputs:** {FIRE | LEAN | ABSTAIN, reason_code, tiebreak_draw (seed + value or null), per_class_realized_errors}.
- **Objective:** minimize additive ambiguity (abstention rate) subject to per-class loss-rate ≤ cap; expected-unit-loss variant per Challenge E as the v2 objective, count-loss as v1 with the discrepancy logged.
- **Invariants:**
  1. Additive formulation only; product ambiguity is *banned* after the Phoneme precedent (R0 = 0.0551 > cap — prettier objective, infeasible).
  2. Randomized tie-breaking at the gate boundary with a logged seed; deterministic strict feasibility must never produce an all-abstain week (regression test: synthetic binding-caps fixture must yield <100% abstention).
  3. No market type's realized error may exceed its cap in >1 of 4 walk-forward seasons (hard fail → additive-only re-test before any ship decision, per 1776:57).
- **Kill test:** candidate must hold every class under cap with ≥15% lower abstention than the single global gate on walk-forward seasons; else REJECT.

### BS-2. `deferralMessaging` — the 1492 review-UI rule
- **Rule:** abstained matchups render in the review interface as "ENGINE ABSTAINS — low confidence" with NO engine lean, NO probability, NO interval. The analyst re-handicaps blind.
- **Override contract:** any analyst override of an abstained game requires a written justification (free text, minimum 140 characters, stored with the pick record, reviewer-id stamped). Rationale: 1492:28 — reviewer and engine are weakest in exactly the same cases (agreement 44.9% where the model is wrong); unjustified overrides on abstained games are where correlated error compounds.
- **Activation gate (from 1492:46):** before standing policy, run the internal replication — 40 abstained matchups, DO-style vs BM-style across two weeks, blinded. Pass criterion: DO-style review accuracy ≥ BM-style. Extension arm (`:52`): confidence-armed review; if it matches blind review within ±2%, surface uncertainty without the lean. Per Challenge B, run per-analyst; do not pool.
- **Kill test:** if the internal replication fails to replicate the direction, the messaging rule stays a hypothesis and the UI ships with the lean visible.

### BS-3. `pooledParameterChallenge` — the 0211 adversary for player-level models
- **Heuristic set, applied to every player-level model claim:**
  1. Ship pooled-CV and LOPO metrics side by side, always. A generalization claim with only pooled numbers is auto-flagged UNVERIFIED.
  2. Degradation ≥10% relative (pooled → LOPO) triggers the mandatory-gate path (per 0211:54): per-player mean signed residuals as weekly efficiency prior *only if* week-to-week stable (Spearman ≥ 0.5 across consecutive 4-week windows); else the model is pooled-only and labeled as such.
  3. Feature-group ablation: classify each feature group as generalizing vs memorizing (the pivot-leg/trunk vs leading-arm diagnostic port). Any feature group whose removal *improves* LOPO while hurting pooled-CV is a memorization group — quarantine it behind a player-history-length floor.
  4. Regime stratification (Challenge C): report LOPO-stable-regime and LOPO-cross-regime separately; never let a team-change-driven gap masquerade as player-memorization.
- **Output artifact:** `lopo-challenge.json` per model version — {pooled_r2, lopo_r2, lopo_stable, lopo_cross_regime, degradation_pct, verdict: VERIFIED | POOLED_ONLY | REJECT}.

### BS-4. `simulationDistrust` — scoring sim claims before they enter evidence
- **Rubric (0–5, sim claim admissible only at ≥4):**
  - +2: simulator version-locked (hash recorded) *before* the calibration comparison; comparison season never used in sim tuning.
  - +1: sim-resolved calibration matches real-outcome calibration within ±0.05 slope on 2024 (the 1472 brief's gate).
  - +1: simulator training data independent of the engine's training data (no correlated-errors laundering).
  - +1: correlation claim backed by N ≥ 30 independent models with reported p (the 1472:27 standard: ρ = +0.43, p = 0.018, N = 30 — modest but significant).
- **Labeling rule:** all sim-resolved metrics carry the prefix SIM-RESOLVED and the rubric score, forever. A SIM-RESOLVED number quoted without its score is a reporting defect.
- **Kill test:** any sim claim scoring <4 is inadmissible as pick evidence; it may enter the research ledger only.

### BS-5. `calibrationSizingJointCheck` — the isotonic×Kelly guard
- **Rule:** the sizing pipeline may not consume a calibration map's output for conviction ranking unless the map is certified rank-preserving on the sizing sample: Kendall τ(pre-map score, post-map score) ≥ 0.95.
- **When RES ≈ 0** (per ENGINE_RANKING_RES_NEAR_ZERO.md:4): sizing consumes the *pre-calibration* score or a rank-preserving alternative (Platt/Temp over PAVA); isotonic stays OFF for any sizing input, matching its OFF posture for display until resolution improves (ISOTONIC_EXPLORATION.md).
- **Hard error, not warning:** if a plateaued (τ < 0.95) calibrated score reaches the Kelly layer, the staking job fails closed. Rationale: plateaus collapse distinct conviction levels to one output — Kelly stakes flatten and the sizing layer silently becomes a flat-bettor.
- **Kill test:** backtest Kelly growth with isotonic-calibrated vs pre-calibration scores on the same sample; if calibrated-input growth < pre-calibration growth, the joint check stays mandatory.

### BS-6. `tiebreakAudit` — the randomized-gate transparency log
- **Rule:** every randomized tie-break draw logs {decision_id, seed, draw_value, boundary_distance}. Weekly report: share of gate decisions influenced by the draw.
- **Escalation:** if draw-influenced share exceeds 10% of weekly decisions, open a cap-feasibility review — the caps are binding to the point of coin-flipping, and per Challenge A the "separate caps" may be one correlated constraint (measure inter-class error correlation in the same report).
- **Rationale:** 1776's randomized-feasibility fix is mathematically sound and operationally a coin flip on real money; the audit log is what makes it defensible.

---

## INFLATION WATCH

Patterns in this slice where a number or claim is liable to be overstated in future use. The adversary's standing objections.

1. **The 0.91 in 0211.** Early stopping on *training* R² > 0.90 (0211:43) likely inflates the within-individual arm. The honest statement is "cross-individual R² = 0.38; the pooled comparison arm (0.91) used a non-standard stopping rule and may be inflated, so the gap is an upper bound." Never quote 0.91 alone.
2. **The 41.9% in 1492.** Conditioned on model-wrong images. The general claim is "showing the uncertain prediction reduced human accuracy 57.8% vs 60.2% (p=0.003)"; the 41.9% is the mechanism illustration on the hard subset, not the headline.
3. **ρ = +0.43 in 1472.** ρ² ≈ 0.185. "Modest but significant" is the paper's own phrase (1472:27). Any paraphrase stronger than that ("validated," "strong correlation," "sim predicts real skill") is inflation.
4. **The 0.05 caps in 1776.** Binary-classification count-loss caps from the paper's experiments. Sports caps must be re-derived from bankroll tolerance (1776:51 explicitly says so). Copying 0.05 into a gate config is a category error, not a parameter choice.
5. **"Additive ambiguity is better."** The paper's finding is narrower: additive is the *safer, usually-feasible* choice (1776:36) — product usually abstains less but violates caps. "Better" without "feasible under caps" inverts the result.
6. **The DO-messaging 3.5pp gain.** From 198 lay labelers on binary images (1492:34). It is a prior for the internal replication, not a predicted effect size for NFL analysts. Any ROI projection built on 3.5pp is fiction until the replication runs.
7. **"Maps don't invent RES" vs "ranking raises RES."** ENGINE_RANKING_RES_NEAR_ZERO.md:8 supports only the first half. The second half (features, edge filters, per-group focus raising resolution) is the file's repair path (:10-14), INFERENCE-consistent but not a quoted theorem. Keep the two claims' provenance separate.
8. **ECE 0.112 vs 0.11.** The map rounds to 0.112; the source file (ENGINE_RANKING_RES_NEAR_ZERO.md:4) says ~0.11. Trivial, but the adversary notes it: quote the source's precision, not the map's.
9. **CAP's "peak AUROC gain 22.19%."** (1151 brief.) A peak over the weakest baseline configuration, not a typical gain; accuracy gains were 1–3 points. Quote the typical, parenthesize the peak.
10. **Brier 0.275 (ranking doc) vs Brier 0.2556 (holdout, slice cross-file).** Different samples, different pipelines — INFERENCE: do not compare them as a trend or a discrepancy without checking the sample definitions first.

---

## Adversary's bottom line

- The abstention architecture that survives: **per-market-type gates (1776) + conformal two-threshold publish policy with market-conditional β (1151), additive ambiguity, logged randomized tie-breaking, and per-class caps re-derived in unit-loss terms.** One system, one acceptance test (≥15% less abstention than the global gate, all classes under cap, walk-forward).
- The messaging rule that survives: **DO-style "ENGINE ABSTAINS" with no lean, but only after the internal replication passes** — until then it is a hypothesis with a protocol, and the file itself agrees (1492:49, Not ADOPT on magnitudes).
- The validation discipline that survives: **LOPO beside pooled, always; regime-stratified; memorization-group quarantine** — and the 0.91 comparison arm is retired from all future citations except as a cautionary example.
- The simulation posture that survives: **locked sim, ±0.05 slope gate, SIM-RESOLVED labeling with rubric score, <4 inadmissible.** ρ = 0.43 is a signal, not a certificate.
- The sizing rule that survives: **no plateaued calibrated score reaches Kelly; rank-preservation τ ≥ 0.95 or fail closed.** Calibration and sizing are one joint decision.
