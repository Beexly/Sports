# Extraction — learning-theory group (wave-5 re-read at full text) · 2026-08-26

**Mandate:** the wave-5 triage (ORBIT_NEXT_50.md rows 62–64, 67, 69, 73) classified
several of these papers from abstracts as "NFL keyword collisions." This pass read
the FULL TEXT of each and either found the founder's reason — the strongest honest
GSE application — or established from the full text that none exists.

**Fetch provenance (all six fetched — none invented):**

| arXiv | How fetched | Depth |
|---|---|---|
| 2503.04638 | ar5iv full HTML | full text, method-level extraction |
| 2403.04146 | arXiv PDF (16 pp), local text extraction | full text read verbatim |
| 2603.03613 | ar5iv full HTML | full text, method-level extraction |
| 2405.07226 | ar5iv full HTML | full text, theorem-level extraction |
| 2306.03481 | ar5iv full HTML | full text, theorem-level extraction |
| 1905.03710 | arXiv PDF (2 pp, Electronics Letters), local text extraction | full text read verbatim |

GSE anchors mapped against: `docs/ops/2026-08-26-EDGE-PATH.md` (E1/E2/E3),
`docs/ops/2026-08-26-CALIBRATION-FIT-REPORT.md` (PAVA vs CIR, re-fit cadence),
`docs/ops/CALIBRATION_MAP_APPLY_MATRIX.md` (apply always default OFF),
`packages/prediction-engine/src/edge-lab/` (walk-forward, placebo, trials-registry),
`packages/prediction-engine/src/calibration-monitor.ts` (consecutive-day Brier
streak), `apps/web/lib/ops/calibration-regression-snapshot.ts`, and the agent
harness `npm run agent:eval` (`scripts/agent-eval/run.mjs`).

---

## 1. arXiv:2503.04638 — "No Forgetting Learning" (buffer-free continual learning)

### (a) What the full text contains

"NFL" here = **No Forgetting Learning** — a buffer-free class-incremental /
task-incremental continual-learning method for vision models (ResNet-18).

- **Mechanism:** knowledge distillation with soft targets and **no replay
  buffer**. After task T_t, logits H_t are computed on new-task data (Eq. 3) and
  serve as soft targets thereafter. KD loss (Eq. 8) is cross-entropy between
  temperature-scaled (p > 1, Eqs. 9–10) previous-model probabilities and current
  predictions, blended with new-task CE via weights λ, ω, α, β (Eqs. 7, 12, 15).
- **Algorithm 1 (NFL), 5 steps:** (1) compute soft-target logits; (2) freeze
  shared params θ_s, train new-task head (Eq. 5); (3) KD-on-old + CE-on-new with
  new head frozen (Eq. 7); (4) fine-tune shared params, old head frozen
  (Eq. 12); (5) recompute logits H̃_t (Eq. 13), dual KD + CE (Eq. 15).
  **Algorithm 2 (NFL+)** adds an under-complete autoencoder on previous-task
  representations (Eq. 17) and a learnable bias-correction transform Γ
  (Eqs. 18–19, combined loss Eq. 22).
- **Proposed metric:** **Plasticity–Stability ratio PS (Eq. 29)** — new-task
  learning gain divided by absolute forgetting on old tasks; higher is better
  (NFL+ reaches PS 0.4573–0.8811, Tables 4–7).
- **Results:** CIFAR-100/TinyImageNet/ImageNet-1000, 10-task splits, Class-IL and
  Task-IL. NFL+ ACC 70.22 on CIFAR-100 Class-IL vs DER++ 68.41 (Table 3), with
  ~14.75× less memory than SOTA; loses to MEMO on ImageNet-1000.
- **Stated limitations:** gap to joint training persists; degrades as
  classes-per-task grows; memory-based methods still win at scale.

### (b) THE APPLICATION

**Portable: the PS metric and the distill-toward-previous-model anchor — as a
regression guard on the weekly re-fit cadence. Not portable: the CL machinery.**
GSE keeps every settled pick (no privacy/buffer constraint), so the buffer-free
problem the paper solves does not arise here. But the failure mode it names —
an update that buys recent-slice performance by forgetting early-season regimes
— is exactly the risk of the E1 cadence ("re-fit at each ~250 new settled",
CALIBRATION-FIT-REPORT §Decisions #3), especially once any recency weighting or
windowing enters the fit.

Concrete implementation:

- **Target module:** a `stabilityPlasticityCheck()` sibling to
  `checkCalibrationHealth` in `packages/prediction-engine/src/calibration-monitor.ts`,
  consumed by the re-fit runbook around
  `scripts/calibration-offline/fit-real-sample.ts`.
- **Data:** the existing settled-pick export (the SELECT in
  CALIBRATION-FIT-REPORT), sliced into time cohorts (e.g. first-third vs
  last-third of the season-to-date; later, NFL-season week buckets).
- **Statistic (their Eq. 29 adapted):** plasticity = held-out improvement of the
  candidate map/model over the incumbent on the NEWEST cohort; forgetting =
  degradation on the OLDEST cohort; require forgetting ≤ bound (e.g. ΔECE ≤
  +0.01 on the early cohort) before a candidate is eligible for C6.
- **Gate:** an additional required row in the bake-off metrics table of
  `docs/ops/CALIBRATION_MAP_APPLY_MATRIX.md`; each evaluation recorded as a
  `calibration_candidate` trial in
  `packages/prediction-engine/src/edge-lab/trials-registry.ts` so the count stays
  honest. Optional (only if recency weighting is ever adopted): add a
  distillation-style penalty toward the previous map's outputs on old-cohort
  inputs — the paper's KD anchor, one hyperparameter, no buffer needed.

### (c) Corrected lens vs wave-5 triage (row 69: **ignore — none**)

**CORRECTED → skill-doc (medium).** "No sports fit" was abstract-level right
about the vision CL machinery but missed the founder's angle: the
plasticity/stability *evaluation discipline* for a season-long model that must
update weekly without forgetting early-season regimes. Not `pattern`: no GSE
model trains under restricted access to old data, so the method itself stays
unported.

---

## 2. arXiv:2403.04146 — FL-GUARD: run-time detection + recovery of Negative Federated Learning

### (a) What the full text contains (read verbatim, 16 pp, DSE 2024)

"NFL" here = **Negative Federated Learning**: the state where federation makes
most clients worse than their own private baselines.

- **Definition (§3.2):** per-client performance gain **β_i ← V_i − P_i (Eq. 1)**
  — model-from-FL performance minus private-baseline performance on the same
  test data; system-wide **β ← Σ α_i β_i (Eq. 2)** (weights: equal, data-size,
  or quality). NFL ≜ there is no round R after which β ≥ 0 holds; |β|
  quantifies the harm.
- **Detection statistic (§4.1) — the precise mechanism:**
  1. Cheap surrogate: each client estimates its gain on its **first training
     batch** during the ordinary forward pass — **β̂_i ← EV(w^{r−1}, b_i^r) −
     P_i (Eq. 3)**; P_i computed once, before FL starts. Cost ≈ zero (one float
     uploaded per round).
  2. Robust aggregation: **β̂^r ← Median({β̂_i | i ∈ C_r}) (Eq. 4)** — median
     across clients so a fabricated/outlier report cannot move the statistic.
  3. Smoothing: **β̂ ← (1/c) Σ_{last c rounds} β̂^r (Eq. 5)**, c = 50.
  4. **Trigger:** β̂ < 0 in more than **NR** rounds ⇒ report NFL. Tuning
     (Table 3): NR = 50 (CIFAR) / 70 (SHAKE) detects true NFL at round 50–70
     with zero false positives under ideal FL; NR < 50 false-positives.
  5. **Cancellation:** β̂ ≥ 0 for **c consecutive rounds** ⇒ cancel the NFL
     report; detection continues. False positives are benign (auto-canceled)
     but double the compute while active (§4.1, §5.1).
- **Recovery (§4.2):** per-client adapted model v_i trained in parallel with the
  global model. Objective **L_a ← ℓ(v_i, D_i) + λ‖v_i − w_i^r‖² (Eq. 9)** with a
  **run-time-tuned anchor weight λ ← σ(loss_div) × σ(grad_div) (Eqs. 6–8)**,
  where loss_div = ℓ(v_i) − ℓ(w_i^r) and grad_div is the normalized dot product
  of (v_i − w_i^r) with ∇ℓ(v_i): the anchor to the global model is automatically
  shrunk when the global model is worse or pulls against the local gradient.
- **Key empirical finding (§5.2, Table 4):** under NFL conditions,
  detect-and-recover ≈ all-time recovery (ACC 84.85 vs 85.53 on CIFAR; both beat
  12 baselines incl. Ditto, APFL, PerFedAvg). Under **healthy** FL, all-time
  recovery (and most prior remedies) *harms* performance, while
  detect-and-recover is bit-identical to vanilla FedAvg because recovery never
  activates. Robust to clients that refuse recovery (§5.4).

### (b) THE APPLICATION — the founder's reason, found

**A Negative-Update Guard for the C6 calibration apply/rollback.** GSE's
standing risk is precisely FL-GUARD's dilemma: apply the remedy (calibration
map) always and pay when it is unneeded or wrong, or never apply and waste the
fix. FL-GUARD's answer — a *relative-gain* statistic, robust-aggregated,
windowed, with an explicit consecutive-window trigger AND a symmetric
cancellation rule — ports one-for-one:

- **Target modules:** extend
  `packages/prediction-engine/src/calibration-monitor.ts` (its consecutive-day
  streak logic already exists but tests ABSOLUTE Brier vs the 0.22 floor; the
  FL-GUARD upgrade is the **relative** candidate-vs-incumbent gain) +
  `apps/web/lib/ops/calibration-regression-snapshot.ts` (already builds the
  daily series); decision wire = the C6 flip
  (`CALIBRATION_ADJUSTMENTS_ENABLED`, per ADJUSTMENTS_ENABLE_RUNBOOK — the
  guard emits an alert/recommendation; the flip itself stays founder-gated).
- **Statistic (Eqs. 1–5 adapted):** per-cohort gain β̂_g = loss(incumbent) −
  loss(candidate/applied map) computed **only on the newest settled window**
  (the paper's first-batch surrogate — no full re-backtest per check), cohorts
  g = pickType × sport (later week buckets); aggregate = **median across
  cohorts** (one pathological cohort cannot flip the verdict); rolling mean over
  the last c settlement windows.
- **Trigger + cancellation:** while C6 is ON, β̂ < 0 for NR consecutive weekly
  checks ⇒ raise ROLLBACK alert (auto-revert only if the founder pre-authorizes
  it in the runbook); alert clears after c consecutive non-negative windows.
  Start NR = 3 weekly windows / c = 2 (their NR/c are in rounds; ours are
  settlement windows — tune on replay).
- **Data:** the settled-pick export already scripted in
  CALIBRATION-FIT-REPORT; every guard evaluation recorded as a
  `calibration_candidate` trial in the trials-registry.
- **Second target — agent-fleet evals:** `scripts/agent-eval/run.mjs`: treat
  every skill/prompt/agent update as a "round"; β̂ = median per-task-family
  score gain vs the pre-update baseline; same NR-consecutive-negative rule
  recommends reverting the skill doc. Cheap, runs inside the harness that
  already exists.
- **Tertiary (R&D note only):** the λ-anchor (Eqs. 6–9) is a principled recipe
  for `edge-lab/calibration-blend.ts` / `logit-pool.ts`: weight the pull toward
  the market anchor q by agreement (loss gap + gradient agreement) instead of a
  fixed blend constant. Offline-only until it clears walk-forward.

Also directly on-brand: their Table 4 lesson — *unconditional remedies harm the
healthy state* — is written evidence for GSE's "always default OFF, gate every
apply" posture in CALIBRATION_MAP_APPLY_MATRIX.

### (c) Corrected lens vs wave-5 triage (row 63: **ignore — none — "no GSE fit"**)

**CORRECTED → pattern (high).** The triage keyed on "federated" and missed that
the paper's core is federation-agnostic: a cheap run-time detector for "this
model update made things worse than the incumbent," with named thresholds,
robust aggregation, and a recovery trigger — the exact shape of GSE's C6
apply/rollback decision and calibration regression guards. This is the
strongest honest find of the group.

---

## 3. arXiv:2603.03613 — Empirical NFL violations via benchmark reformulation

### (a) What the full text contains

"NFL" here = **No-Free-Lunch**. Setting (deliberately tiny): binary objectives
f: 𝒳 → {0,1} with |𝒳| = 4 ⇒ all 16 functions, closed under permutation;
**24 "algorithms" that are just fixed evaluation orders** (Table 2, §4.1) —
no adaptation, so NFL applies exactly on the baseline set. Efficiency measure
**E(a_i, f_j) = (|𝒳| − s_ij)/(|𝒳| − 1) (Eq. 1)** (steps-to-optimum). The
**reformulation**: rebuild the benchmark as pointwise **sums** (Data2) and
**differences** (Data3) of the base functions (§6). Findings: one-way ANOVA
F = 110.68, p ≈ 3.6×10⁻⁴⁴ (Table 5); Tukey contrasts — Data1 vs Data2 mean
diff 0.326 and Data1 vs Data3 0.335, both p < 0.0001; Data2 vs Data3 n.s.
(Table 6); block-structured re-rankings in delta heatmaps (Fig. 8); composite
objectives show **non-additive** search effort. Recommendation: algorithm
choice must be aware of the *objective representation*, not just the problem
class; the caution "applies … to statistical procedures based on relabeling,
resampling, and permutation tests" (Abstract). Limitations §1: n = 4 only
(n = 5 blows up by ~2⁹⁶), binary codomain, sampling without replacement.

### (b) THE APPLICATION

**A one-rule discipline, not a method: formulation-robustness before trusting a
model-selection winner.** The empirical base is a toy (n = 4, non-adaptive
samplers), so nothing is portable as code — but the demonstrated artifact
(rankings flip under objective reformulation) is a real hazard for GSE's
bake-offs and backtests.

- **Target:** `packages/prediction-engine/src/edge-lab/trials-registry.ts` +
  the bake-off order in `docs/ops/CALIBRATION_MAP_APPLY_MATRIX.md`.
- **Rule:** a `model_admission` / `calibration_candidate` winner is only
  admissible if it wins (or at minimum does not lose) under ≥2 distinct
  objective formulations already in the required-metrics table — e.g. ECE AND
  Brier AND log loss for maps; accuracy AND EV-vs-close for engine candidates —
  and **each formulation is registered as its own trial in the same FDR
  family**, so the multiple-testing correction sees the true count of looks.
- Note: the 2026-08-26 fit already practiced this implicitly (PAVA beat CIR on
  both held-out ECE and Brier); this row makes it a stated requirement rather
  than a habit.

### (c) Corrected lens vs wave-5 triage (row 67: **skill-doc (low)**)

**CONFIRMED — skill-doc (low), unchanged.** Full read validates the triage's
lens and adds one sharpening: the paper's evidence base is far weaker than the
abstract suggests (n = 4, fixed-order samplers), so it earns citation as a
cautionary reference only; the actionable residue is the trials-registry
formulation-robustness rule above.

---

## 4. arXiv:2405.07226 — Separable power of classical vs quantum learning protocols (NFL lens)

### (a) What the full text contains

Task: learn an n-qubit unitary U under fixed observable O, predicting
f_U(ψ) = Tr(O U|ψ⟩⟨ψ|U†); lower bounds on Haar-averaged risk under perfect
training. Three protocols: classical CLC-LPs (measurement outputs only),
restricted-quantum ReQu-LPs (coherent access + quantum memory), full Qu-LPs
(adds U† queries). **Theorem 1:** CLC error Ω((d² − N)(d·Tr O² − (Tr O)²)/d⁵),
d = 2ⁿ. **Theorem 2:** ReQu with non-orthogonal phase-aligned states
Ω((d² − N²)/d⁵ · (…)); degrades to Thm 1 for orthogonal states. **Theorem 3:**
Qu-LPs with diagonal O: Ω((d − N)/d⁴ · (…)). Headline: quadratic sample-
complexity separation (4ⁿ → 2ⁿ) driven by **inter-state relative phase** —
information that measurement destroys — plus U† access; advantage vanishes for
orthogonal training states or fully non-diagonal observables. Limitations:
noiseless, perfect-training, average-case only, n ≤ 5 numerics.

### (b) THE APPLICATION

**NONE AFTER FULL READ.** Disqualifying reason: every quantitative result is a
bound in Hilbert-space dimension d = 2ⁿ whose separations are produced by
resources with no classical carrier — coherent access to the target unitary,
quantum memory, U† queries, and global-phase information that classical
measurement provably cannot see. The paper's only classical-facing content
(task-averaged risk lower bounds, perfect-training assumption, orthogonality of
training inputs) is textbook learning theory that changes no GSE gate, model,
or eval; there is no statistic, algorithm, or design rule here that GSE's
pipeline could execute.

### (c) vs wave-5 triage (row 62: **ignore — keyword collision on 'NFL'**)

**CONFIRMED at full-text level, unchanged** — with the reason upgraded from
"keyword collision" (abstract-level inference) to the specific full-text
disqualifier above.

---

## 5. arXiv:2306.03481 — Transition role of entangled data in quantum ML

### (a) What the full text contains

Incoherent learning of quantum dynamics: predict f_U(ψ) = Tr(O U|ψ⟩⟨ψ|U†) from
N bipartite training states of Schmidt rank r, each measured m times.
**Theorem 1** (projective measurements): 𝔼 R ≥ Ω((ε̃²/4ⁿ)(1 − N·min{m/(2ⁿ r c₁),
r n}/(2ⁿ c₂))) — entanglement (r) enters BOTH ways. **Theorem 2** extends to
ℓ-outcome POVMs. **The transition:** with large m (r < √(m/(c₁2ⁿn))), higher r
cuts required N exponentially (N = 2ⁿc₂/n at r = 1 vs N = 1 at r = 2ⁿ); with
small m, higher r *increases* error — ≥ r²c₁2ⁿn measurements are needed to
exploit rank-r data. 4-qubit numerics confirm the non-monotone crossover at
m = 10/100 vs monotone gain at m > 1000. Proofs are Fano-method
(packing + mutual-information) arguments.

### (b) THE APPLICATION

**NONE AFTER FULL READ.** Disqualifying reason: the theorems are stated in
Schmidt rank and qubit count for learning quantum dynamics, and the phenomenon
of interest — a provable threshold m ≥ r²c₁2ⁿn separating help from harm — has
no measurable classical counterpart in GSE's pipeline. Its classical shadow
("richer data needs a bigger extraction budget; with a small budget, simpler
data wins") is generic bias–variance discipline that GSE already enforces
structurally: walk-forward admission, the market-conditional-MI permutation
gate, and priced:false-until-admitted. Nothing here adds a statistic or gate
beyond what `edge-lab/` runs today. (Nearest echo, requiring no code: with only
~1.5k settled picks, high-capacity covariates are budget-starved — which the
admission machinery already expresses as rejections.)

### (c) vs wave-5 triage (row 64: **ignore — no portable method**)

**CONFIRMED at full-text level, unchanged.**

---

## 6. arXiv:1905.03710 — Bilinear discriminant feature line analysis (BDFLA)

### (a) What the full text contains (read verbatim — 2-page Electronics Letters, 2015)

"NFL" here = **Nearest Feature Line** (Li & Lu 1999 image classifier).
Contribution: a matrix-based (2D) variant of NFL-based subspace learning for
**image feature extraction**. Defines feature lines between prototype matrices
(Eq. 7), projection point via μ₀ (Eq. 8), 2D-NFL within/between-class feature-
line scatters S_wFL, S_bFL (Eqs. 9–10), trace reformulations (Eqs. 12–18),
criterion max J(L,R) = S_bFL − S_wFL (Eqs. 11, 19), solved by **Algorithm 1**:
alternating eigendecompositions for left/right projections L ∈ R^{D₁×d₁},
R ∈ R^{D₂×d₂} (Eqs. 20–21) until convergence; feature = LᵀIR. Experiments:
COIL20 (48×48 crops, 10 train/class) and finger-knuckle-print FKP (40×60,
5 train/class); BDFLA AMRR 93.48% / 95.62% vs PCA/LDA/2D-LDA/NFLS/UDNFLA/NFLE
(Table 1). No claim of generality beyond image matrices anywhere in the text.

### (b) THE APPLICATION

**NONE AFTER FULL READ.** Disqualifying reason: the entire contribution is a
bilinear (left/right-projection) discriminant for **matrix-structured image
data** — GSE has no matrix-structured small-sample classification problem, and
the letter proposes no tabular bridge, no virtual-sample generation, and no
discussion of use beyond images. The feature-line interpolation is a classifier
distance metric over image prototypes, not a portable augmentation or
calibration idea. The corpus hit is a pure "NFL" keyword collision (Nearest
Feature Line), now confirmed from the full text rather than the abstract.

### (c) vs wave-5 triage (row 73: **ignore — no fit**)

**CONFIRMED at full-text level, unchanged.**

---

## Summary

| arXiv | "NFL" resolves to | Verdict after full read | Strongest GSE use | Triage row → corrected |
|---|---|---|---|---|
| 2403.04146 | Negative Federated Learning | **Founder's reason found** | Negative-Update Guard for C6 apply/rollback: β̂ = median-of-cohorts incumbent-vs-candidate gain on newest settled window, NR-consecutive-negative trigger + c-window cancellation (Eqs. 1–5); same rule for `agent:eval` skill updates | row 63 ignore → **pattern (high)** |
| 2503.04638 | No Forgetting Learning | Metric + anchor portable; CL machinery not | PS-ratio (Eq. 29) stability/plasticity regression guard on the ~250-settled re-fit cadence; optional distill-to-previous-map anchor if recency weighting arrives | row 69 ignore → **skill-doc (medium)** |
| 2603.03613 | No Free Lunch | Discipline only; toy evidence base | Formulation-robustness rule for trials-registry admissions (winner must hold across ≥2 registered objective formulations, same FDR family) | row 67 **skill-doc (low) confirmed** |
| 2405.07226 | No Free Lunch (quantum) | NONE AFTER FULL READ | — (separations require quantum-only resources: coherent access, U†, phase) | row 62 **ignore confirmed** |
| 2306.03481 | — (quantum entangled data) | NONE AFTER FULL READ | — (transition threshold has no classical carrier; residue = generic bias-variance GSE already enforces) | row 64 **ignore confirmed** |
| 1905.03710 | Nearest Feature Line | NONE AFTER FULL READ | — (image-matrix discriminant; no tabular bridge in text) | row 73 **ignore confirmed** |

*Nothing in this document was committed or applied; all proposed gates default
OFF and route through trials-registry + founder-gated flips per the runbooks.*
