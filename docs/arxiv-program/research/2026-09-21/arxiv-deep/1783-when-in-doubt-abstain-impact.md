# [1783] When In Doubt, Abstain: The Impact of Abstention on Strategic Classification (arXiv:2510.13327)

**Citation:** (authors as listed on arXiv) *When In Doubt, Abstain: The Impact of Abstention on Strategic Classification*. arXiv:2510.13327. URL: https://arxiv.org/abs/2510.13327
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML — abstract, Stackelberg principal–agent model, Theorem 3.1 (abstention never increases principal loss), Theorem 3.3 (principals abstain more under strategic agents), simulation: 100,000 samples per threshold, x ~ Uniform[−2,2], thresholds 0.01–2.0 in 0.01 steps, γ = 0.4444, c = 0.3, σ = 0.5, turning point at c = 0.5, ΔH harm-reduction metric, conclusion).
**Verdict:** ADAPT — the "abstain more when the other side is strategic" theorem is the right stress-test lens for GSE's public picks (books and the market react to posted edges), and the c = 0.5 turning-point structure gives a concrete way to think about when abstention stops paying; needs a sports-market translation since the paper's agents are loan-applicant-style manipulators, not bookmakers.

## 1. Research question
In a Stackelberg setting where agents *strategically manipulate* their features in response to the principal's published classifier, does giving the principal an abstention option help, and how does the optimal abstention threshold change when agents are strategic vs truthful?

## 2. Dataset / schema
Simulation-only: 100,000 samples per threshold value; x ~ Uniform[−2,2]; thresholds swept 0.01–2.0 in 0.01 increments; default parameters γ = 0.4444 (agent manipulation cost/benefit), c = 0.3 (abstention cost), σ = 0.5 (label noise). Metric ΔH: reduction in the principal's harm (loss) from adding the abstention option.

## 3. Method / model
Stackelberg game: the principal publishes a threshold classifier with an abstention band; agents best-respond by manipulating features at cost γ; the principal anticipates this (constrained/strategic case) or doesn't (unconstrained/truthful case). Two optimal thresholds: T* (unconstrained, agents assumed truthful) and T̄* (constrained, agents strategic). The principal's loss includes misclassification and the abstention cost c.

## 4. Equations & assumptions
- Theorem 3.1: adding the abstention option *cannot increase* the principal's loss, even with strategic agents — abstention is a free hedge in the Stackelberg sense.
- Theorem 3.3: the optimal threshold under strategic agents is *higher* (abstain more) than under truthful agents: T̄* > T*.
- Simulation finding: a turning point around abstention cost c = 0.5 — beyond it, abstention costs more than a random guess; the constrained threshold sits remarkably higher past the turning point (the hedging effect against manipulation).
- Noise comparative statics (Fig. 3c): unconstrained T* rises monotonically with σ; constrained T̄* first *dips* (moderate noise weakens manipulation's reliability, so the principal can lower the bar) then rises at high σ.
- Assumptions: one-dimensional features, uniform distribution, known manipulation-cost structure, Stackelberg timing (principal commits first).

## 5. Features / target
Simulated scalar feature x and binary label with Gaussian noise σ. The GSE analog: game features → pick outcome, with the "agent" being the betting market / bookmaker that moves lines against published GSE edges.

## 6. Validation design
Grid sweep over thresholds (0.01–2.0, step 0.01) × 100k samples per point; compare T* vs T̄* trajectories as c, σ, γ vary; ΔH measured as the harm reduction from the abstention option.

## 7. Numerical results / baselines
- T̄* (strategic) is consistently higher than T* (truthful) across the sweep — principals facing strategic agents abstain more (Theorem 3.3 confirmed numerically).
- Turning point at c = 0.5: past this abstention cost, abstaining is worse than random guessing; the constrained threshold's elevation past the turning point is the manipulation hedge.
- Fig. 3c: at σ = 0.5 default, T̄* dips at moderate noise then rises; T* rises monotonically.
- ΔH > 0 throughout: abstention never hurts the principal (Theorem 3.1), with the gain largest where manipulation incentives are strongest.

## 8. Code / data availability
None stated in the extracted text.

## 9. Leakage & limitations
- Simulation-only with toy distributions (Uniform[−2,2], 1-D); no real data of any kind.
- The "strategic agent" manipulates *its own features* to get accepted — bookmakers don't manipulate game features; they move *prices*. The mapping is analogy, not identity.
- Stackelberg commitment (principal moves first, publicly) fits GSE posting picks on X, but the paper's manipulation-cost γ has no clean sports observable.
- c = 0.5 turning point is in the paper's normalized units; converting "abstention cost" to "foregone edge in units" needs a separate derivation.

## 10. GSE overlap
New lens, no duplicate: nothing in the corpus treats the market as a *strategic responder* to GSE's published card. Ledger 0016 (betting-against-integrity / in-play market dynamics) touches market response but not the abstention-as-hedge mechanism. The existing-research map's market-microstructure lane is the neighbor — this paper adds the "when they react, abstain more" rule.

## 11. GSE implementation spec
Build a **market-response stress test**, not a production gate: (a) define the "strategic" scenario — after GSE posts a pick publicly, the line moves against it by k points (sweep k = 0, 0.5, 1.0, 1.5); (b) recompute each posted pick's edge at the moved line; (c) apply the paper's lesson — raise the gate threshold (abstain more) as k grows, and find GSE's empirical turning point: the k at which posting the pick is worse than passing; (d) operationalize: for high-profile posted picks (primetime, big X engagement), pre-apply the elevated threshold. Effort: ~1 week (line-movement data + threshold sweep).

## 12. Reproducible test
Dataset: GSE posted picks with opening vs post-publication line movement (or simulated movement sweep). Baseline: static gate. Candidate: movement-adjusted gate (threshold rises with observed/expected line move). Metric: units at the *bettable* line (post-move), not the posted line; find the turning-point k where edge goes negative.

## 13. Acceptance / rejection gate
ADAPT accepted if the stress test finds a stable turning point k* where posted-pick edge at the moved line turns negative AND the elevated gate recovers positive units in the high-movement regime; if line movement against GSE's posts is negligible in the data (no strategic response exists), the paper's mechanism doesn't apply — REJECT as a build, keep Theorem 3.1 as background.

## 14. Improvement experiment
Endogenize the posting decision: the paper's principal *must* publish the classifier; GSE can choose *what* to post. Test a two-tier card — post the full card privately (or delayed) and post only the movement-resilient subset publicly — measuring whether selective publicity preserves edge better than the paper's uniform-abstention rule. The paper never lets the principal hide the classifier; GSE can.

**Verdict:** ADAPT — the strategic-abstention theorems give GSE the right vocabulary and a concrete stress-test protocol for line-movement response, but the paper's manipulators aren't bookmakers, so the turning point must be re-estimated on real line data before it touches the card.
