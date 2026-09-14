# PROJECT MOVE-37 — NAVIER-STOKES METHOD TRANSLATION (SECOND PASS)

Galaxy Sports Edge | Theorist Deliverable

Date: 2026-09-14 | Run ID: MOVE-37-NS-TRANSLATION-02

---

§0. WHAT THE SECOND PASS FOUND THAT THE FIRST MISSED

The first pass reconstructed the method from three precedents and designed a Four-Gate Verifier. The second pass, grounded in deeper primary-source research, found five things the first pass under-weighted or missed entirely:

1. The division of labor was three-tier, not two-tier. The Chinese technical analysis of the OpenAI run makes this explicit: "人类数学家负责搭骨架与物理直觉" (human mathematicians build the skeleton and provide physical intuition), OpenAI's 10,000 agents "负责填血肉与高维约束搜索" (fill in the flesh and search high-dimensional constraints), and "Lean与Comparator负责防幻觉的终极锁死" (Lean and Comparator provide the ultimate anti-hallucination lock) . The first pass collapsed the human skeleton-building into "Tier 1 planning" and did not recognize that the human contribution was specifically the identification of the mathematical structure (anisotropic self-similar scaling with an exponential bias), not just the problem statement. This changes how the swarm should be designed.
2. The verification layer was redundant, not singular. OpenAI's repository provides "an independent checking route using Comparator" . Comparator is described as a "standalone comparator copied from google-deepmind" . The verification was not just "Lean type-checks the proof" — it was Lean plus an independent comparator. Redundant verification is a design principle, not an implementation detail. The first pass's Four-Gate Verifier was a single pipeline; it should be two independent pipelines whose agreement is the criterion.
3. The "stress cone" is the deepest structural insight in the proof, and it maps directly to our discovery problem. The Chinese analysis explains: the high-frequency oscillatory pulses can only produce momentum flux in a limited "应力锥" (stress cone). If the target residual falls outside the cone, "增加振幅没有意义，因为缺失的不是强度，而是方向" (increasing amplitude is meaningless, because what is missing is not intensity but direction) . This is the exact failure mode of our discovery program: we keep increasing compute (amplitude) when the problem is that our target lies outside the representable cone (direction). The first pass's "predictability gate" was a crude approximation of this insight.
4. EULER's six stress tests are a pre-budget screening mechanism we should port directly. EULER "runs direct, adjacent-domain, and distant-domain routes in competition" and "six ordered stress tests reject invalid bridges before expensive search begins" . The stress tests are "designed to expose an error in direction, assumptions, boundary cases, round trips, tool gain, or return" . The first pass had kill criteria but no ordered stress test battery that runs before budget is spent.
5. The "return obligation" is a formal correctness condition for cross-domain transfers. EULER requires "target evidence to return to the fixed source statement along a checked implication" . This is the "return safety" property. The first pass had pre-registration but no formal return obligation — a mapping from the discovered structure back to the original estimand that can be mechanically checked.

The second pass repairs all five.

---

§1. REVISED METHOD RECONSTRUCTION

1.1 The three-tier division of labor (corrected from first pass)

Tier | OpenAI NS | Sports analogue | What this tier contributes
Skeleton | Human mathematicians identified the anisotropic self-similar scaling with exponential bias — the structure of the singularity construction | The theorist identifies the structure of the estimand: what mathematical object is being estimated, what family it belongs to, what the null looks like | Structure. Not search. Not verification. The answer to "what should the machine search for?"
Search | ~10,000 agents searched the high-dimensional constraint space to find parameters satisfying the structure | Tier 2 swarm searches the parameter/function space of the candidate structures | Filling. Given the structure, find the parameters, constants, and functional forms that satisfy it
Verification | Lean + Comparator mechanically checked the proof against the encoded definitions | Tier 3 Four-Gate Verifier (to be expanded to Six-Gate) | Correctness. Mechanical, non-gameable, redundant

The implication for our program. The first pass's swarm had a "Tier 1 planner" that ranked targets. That is not the skeleton role. The skeleton role is: identify the mathematical structure of the estimand before search begins. For the Euler problem (next-play play-type), the skeleton is not "predict pass/run." It is: "the estimand is P(pass | state), and the structure is a logistic function of down, distance, and score differential. The search is over the form of the logistic argument." The theorist must specify the structure. The swarm fills it in.

1.2 The "stress cone" as the central design constraint

The Chinese analysis identifies the deepest technical insight of the OpenAI proof: the residual momentum must fall inside a representable stress cone for the oscillatory pulses to synthesize it. If outside, more amplitude is useless — the problem is direction, not magnitude.

The sports translation. Every discovery method has a representable cone: the set of structures it can express. Our gplearn symbolic regression has a cone defined by its function set ({+,−,×,÷,sqrt,log,exp,abs,inv,tanh}). If the true structure of the estimand lies outside this cone, no amount of generations or population size will find it. The first pass's "predictability gate" (GBM ceiling > 0.05) was a crude proxy for "is there signal?" It should be replaced by a representability check: can the method's function set express the structure that the GBM is using?

The representability check (new). Train a GBM on the target. Extract the GBM's feature importances and interaction structure. Fit a gplearn model with the GBM's top-3 features. If the gplearn model's R² is within 0.02 of the GBM's ceiling, the structure is inside the cone. If not, the structure is outside — switch methods, not parameters. This is the sports analogue of "the target stress is outside the stress cone; increasing amplitude will not help."

1.3 The complete method reconstruction (revised)

Layer | What it does | Evidence | Sports analogue
Skeleton | Identifies the mathematical structure: anisotropic self-similar scaling, exponential bias | (technical analysis) | Theorist specifies the estimand's structure before search
Search | 10,000 agents in different configurations explore the constraint space | (reporting) | Tier 2 swarm: generator, adversary, refiner
Stress test | Six ordered tests reject invalid bridges before expensive search | EULER | Pre-budget screening battery (new in second pass)
Verification | Lean formalization + Comparator independent check | OpenAI GitHub | Redundant verification: two independent pipelines
Return | Target evidence must return to source statement along checked implication | EULER | Formal return obligation (new in second pass)

---

§2. REVISED VERIFICATION LAYER — THE SIX-GATE VERIFIER

2.1 The six gates

GATE 1 — PRE-REGISTRATION HASH (unchanged from first pass): SHA-256 of (estimand, features, splits, model class, hyperparameter grid, kill thresholds, baseline definitions). Stored before results. Mismatch → FAIL.

GATE 2 — BLIND HOLDOUT LOCKBOX (unchanged from first pass): Test set hashed at submission. Author cannot access. Lab script outputs only (point estimate, CI, verdict).

GATE 3 — POWER CERTIFICATE (unchanged from first pass): Synthetic positive control of size δ must be recovered at pre-registered power. Power < 0.80 → FAIL.

GATE 4 — DUMB-BASELINE SUPREMACY (unchanged from first pass): Model must beat named dumb baseline by pre-registered margin on the blind holdout. Margin < threshold → FAIL.

GATE 5 — STRESS TEST BATTERY (NEW — ported from EULER): Six ordered tests, run in sequence, before budget is spent:
  5a. DIRECTION: Does the claimed effect have the pre-registered sign?
  5b. ASSUMPTIONS: Are the identifying assumptions testable on held-out data?
  5c. BOUNDARY: Does the effect survive at the edges of the feature space?
  5d. ROUND-TRIP: Does the discovered structure return to the original estimand?
  5e. TOOL GAIN: Does the method add expressiveness beyond the baseline?
  5f. RETURN: Can the discovered structure be mapped back to the original estimand via a pre-registered implication?
  Any test fails → FAIL. Tests run in order; early failure saves budget.

GATE 6 — REDUNDANT VERIFICATION (NEW — ported from OpenAI's Comparator): Two independent implementations of the same protocol (Pipeline A: primary model class e.g. gplearn; Pipeline B: independent model class e.g. PySR or from-scratch GP). Discovery must hold in BOTH. Disagreement → FAIL.

2.2 Why Gate 5 is the most important addition: EULER's ablation results — "bridge-specific stress tests cut incorrect conclusions from 9 to 3" — a 67% reduction in false positives. In a swarm of candidates, that is the difference between usable signal and noise. Tests are ordered cheapest-first; most candidates die at 5a/5b before expensive search.

2.3 Why Gate 6 is the second most important addition: a single verifier can be gamed; two independent verifiers agreeing cannot.

2.4 Executable specification (see original for full Python: gate5_stress_tests + gate6_redundant_verification).

---

§3. REVISED EULER PROBLEM

3.1 The skeleton: estimand P(pass | down, ydstogo, yardline_100, score_differential, game_seconds_remaining, shotgun, no_huddle). Structure: logistic link; down/ydstogo dominant; score differential × time interaction; shotgun/no_huddle indicators. The search is over the form of the log-odds.

3.2 The representability check (new): fit GBM → ceiling AUC; fit gplearn on GBM top-3 features → AUC; if gplearn < GBM − 0.02, structure is outside the cone (expand function set or switch methods); else proceed to swarm.

3.3 Success criterion (unchanged): SR formula achieves holdout AUC ≥ XPASS AUC + 0.02, OR SR within 0.01 AUC of XPASS with ≤ 6 nodes.

---

§4. REVISED SWARM LOOP

Four layers (ported from EULER control/execution/verification/state + Danus fact-graph + unsorry repo-as-queue):
- LAYER 1 — CONTROL (theorist): candidate registry, decomposition, assignment.
- LAYER 2 — EXECUTION: 2a GENERATOR proposes; 2b ADVERSARY falsifies; 2c REFINER simplifies.
- LAYER 3 — VERIFICATION: Gate 5 first (cheap), then Gates 1–4, then Gate 6.
- LAYER 4 — STATE: fact graph DAG of (candidate, test result, verdict) triples; the only source of truth.

Compute budget per round: ~95 min on 2 CPUs (L1 ~10, L2 ~60, L3 ~20, L4 ~5).

Kill criteria per layer: L1 target fails representability → drop; L2a no closed form → drop; L2b loses to dumb baseline → drop; L2c simplification wins → replace; L3 Gate 5 any fail → drop; Gates 1/2/3/4/6 fail → FAIL.

---

§5. REVISED FAILURE MODES

1. (revised) Target outside the representability cone — test: representability check before budget.
2. (revised) Swarm amplifies noise — test: full swarm on synthetic null data; false-discovery rate > 5% → stress tests underpowered.
3. (revised) The skeleton is wrong — test: skeleton audit (GBM interaction structure vs assumed structure).
4. (new) Credit dispute contaminates the method — test: prior-art check before any discovery claim.

---

§6. CLAIM TABLE (18 claims; UNSOURCED count: 1 of 18 — C-12, agent architecture not publicly documented)

Notable: C-05 "Result is for forced NS, not unforced" (Forkast — CONFIRMED); C-11 "Verification was Lean + Comparator (redundant)" (OpenAI GitHub — CONFIRMED); C-14 "EULER's stress tests cut incorrect conclusions from 9 to 3" (EULER paper — CONFIRMED); C-08/09/10/13 INFERRED from Leiphone technical analysis (single source).

---

§7. HANDOFF PACKAGE (priority order)

1. Run the representability check (§3.2) on the Euler problem before any swarm run.
2. Implement the Six-Gate Verifier; run it RETROSPECTIVELY on killed families (W1, W2, W4) — if any killed family passes all six gates, the verifier is gameable.
3. Implement the fact graph (Layer 4) as a JSON DAG.
4. Run the swarm on the Euler problem if step 1 passes.
5. Run the skeleton audit (§5.3).

Standing constraints: 2 CPUs, 3GB RAM, numpy/pandas/scipy/scikit-learn, nflverse data.
