# ZK / ML Dump — Full Extraction Ledger (2026-07-02)

Every section of the pasted dump, worked. Nothing dismissed as "fake." Each item
gets a Reality-Ladder tag and the **specific** leverage for GSE — even 0.1%.
The dump is, technically, an **accurate** survey of real cryptography and ML;
the only thing that is *not* accurate is the framing that wraps every section in
"GSE Halo2-accumulator impact" for an accumulator GSE does not have. This ledger
separates the accurate math (kept, tagged) from the aspirational framing (named
as roadmap, not shipped as fact).

**Reality-Ladder tags:** `[VERIFIED]` already true in our code · `[BUILT]` built
this pass · `[BUILDABLE]` real + landable, consumer exists · `[BUILDABLE-future]`
real + landable once a consumer exists · `[ROADMAP]` real, but optimizes a machine
we have not built · `[REFERENCE]` correct math, analysis-tooling only, no product use.

**The headline finding (the thing I nearly walked past):** the high-leverage
content in this dump is **not** the ZK aggregation. It is the **probability
calibration** cluster in the back half (ECE, reliability diagrams, isotonic/PAVA,
Platt, Beta, temperature scaling) and the **similarity-search** cluster (LSH/
SimHash). GSE is a probability-prediction engine whose entire moat is "our stated
probabilities are honest." **Calibration measurement is that moat, quantified.**
Dismissing this dump as "ZK rabbit hole" undervalued the one cluster that lands
today and strengthens the core claim. That was the miss; this ledger corrects it.

---

## CLUSTER A — Probability calibration (THE gold; lands NOW)

> Sections: "Implement Expected Calibration Error", "Isotonic Regression For
> Calibration", "Beta Calibration methods", "Dirichlet Calibration Methods",
> "Implement temperature scaling", "Temperature Scaling Optimization", "Calibrate
> Dropout Uncertainty", "Dirichlet Process priors", "Hierarchical Dirichlet
> Processes". Stripped of the bit-flip framing, these are the standard toolkit for
> answering: *are the probabilities we publish actually honest?*

> **Mapping correction (verified against the repo before building):** two Explore
> agents swept the codebase first, and GSE **already ships** the measurement half
> of this cluster — `probability-calibration.ts` has ECE, reliability curves,
> Brier + Murphy decomposition and a correct (bug-fix-documented) PAVA isotonic
> calibrator, all tested; log-loss lives in `eval/edge-lab/metrics.mjs`; a public
> reliability surface is wired at `/api/calibration`. So those are `[VERIFIED-existing]`,
> NOT built here — building them again would have been duplication, the exact
> failure the improve-not-remove doctrine exists to stop. The **genuine gaps** the
> dump surfaced were: no parametric calibrators (Platt/Beta), no *out-of-sample*
> selection between calibrator families (isotonic was chosen by fiat and validated
> in-sample only), and no tamper-evident commitment to the calibration map itself.
> Those three are what got built.

| Technique | Tag | GSE leverage | Landing |
|---|---|---|---|
| **Expected Calibration Error (ECE)** — binned \|acc − conf\|, weighted by bin mass | `[VERIFIED-existing]` | The single number for "are our win-probabilities honest?" Already shipped + tested. | `probability-calibration.ts` (pre-existing) |
| **Reliability diagram** (per-bin predicted vs realized) | `[VERIFIED-existing]` | Already shipped (`reliabilityCurve`) and publicly wired via `/api/calibration`. | `probability-calibration.ts` + `apps/web/lib/calibration/*` |
| **Brier score + Murphy decomposition** (reliability / resolution / uncertainty) | `[VERIFIED-existing]` | Already shipped + tested (`brierDecomposition`). | `probability-calibration.ts` |
| **Log-loss** | `[VERIFIED-existing]` | Already shipped in the eval harness. | `eval/edge-lab/metrics.mjs` |
| **Isotonic regression / PAVA** monotone calibration map | `[VERIFIED-existing]` | Correct two-phase PAVA already shipped (Codex-P2 regression-tested), applied via self-suppressing `buildCalibrator`. | `probability-calibration.ts` + `calibration-apply.ts` |
| **Platt scaling** (logistic map on logit(p), Platt-1999 target smoothing) | `[BUILT]` | The smooth, low-variance alternative isotonic lacked — **measured**: on seeded overconfident data (true shrink 0.5, n=800) it recovered a=0.507368 and beat isotonic out-of-sample (OOF ECE 0.021021 vs 0.065139) — the regime where parametric maps are expected to help most (a small-n advantage is expected but was not separately demonstrated at small n here). | `calibration-map.ts` (this pass) |
| **Beta calibration** (Kull-2017: sigmoid(a·ln p − b·ln(1−p) + c); single-violation refit per Kull, plus OUR conservative intercept-only fallback for double/refit violations) | `[BUILT]` | More flexible than Platt near both endpoints; the third family in the selector. Hostile-review hardened: a non-monotone truth now collapses to the base-rate map (was a decreasing "calibration"), and (near-)separated data is refused instead of returning saturated step coefficients. | `calibration-map.ts` |
| **Cross-validated calibrator selection** (k-fold, held-out equal-mass ECE, identity fallback, measured noise bar) | `[BUILT]` | The honest fix for "isotonic by fiat": the family must beat raw on unseen data by MORE than the noise bar — the 90th-pct "gain" that 16 parametric-bootstrap replicas (y~Bern(p), raw true) show from pure selection noise. Hostile-measured: without the bar, a map "won" on perfectly calibrated data 70–88% of the time; with it, 2.5–17.5% across n=40..200 (≈ the 10% design rate). Deterministic. | `calibration-map.ts` `selectCalibrator` |
| **Temperature scaling** (single-param logit scale) | `[BUILDABLE-future]` | Designed for multi-class neural logits. GSE's win/loss is **binary**, where temperature scaling ≈ a constrained Platt — so it collapses to the Platt case. Documented; not a separate build. | note only |
| **Dirichlet calibration** (multi-class simplex map) | `[ROADMAP]` | Only bites when GSE outputs a **multi-class** distribution (e.g. exact-score buckets, multi-way markets). Binary markets do not need it. Revisit if/when a categorical market ships. | note only |
| **MC-Dropout uncertainty + temperature/ECE calibration of it** | `[ROADMAP]` | Only relevant if GSE fields a **neural** model and wants epistemic uncertainty bands. Current engine is not neural. Documented as the calibration path for that future. | note only |
| **Dirichlet Process / Hierarchical DP priors** | `[REFERENCE]` | Bayesian-nonparametric clustering. The dump itself concedes "minimal direct impact." Honest verdict: a future modeling tool (cluster similar teams/regimes with an unbounded cluster count), **not** a calibration primitive. No product use now. | reference |

**Confound honesty carried into the build:** ECE/reliability are only meaningful
on **settled, out-of-sample** picks with a genuine predicted probability and a
realized 0/1. The build refuses (returns null) on unsettled or degenerate input
rather than publishing a flattering-but-empty curve — same discipline as the rest
of the engine.

---

## CLUSTER B — Similarity search (LSH / SimHash; lands once a consumer exists)

> Sections: "Sieving Algorithms", "LSH sieve complexity", "Locality Sensitive
> Hashing", "SimHash methods", "MinHash LSH variants", "Multi-probe LSH/SimHash",
> "SimHash bit-flipping strategies", "Priority score / inverse-magnitude / learned
> scoring", "RL for bit flips", "Thompson Sampling variants". In the dump these
> are sub-tools of a lattice sieve; **outside** that framing they are exactly the
> standard toolkit for fast approximate nearest-neighbor search.

| Technique | Tag | GSE leverage |
|---|---|---|
| **SimHash** (random-hyperplane angular LSH) + **multi-probe** (inverse-magnitude bit priority) | `[BUILT]` | Fast approximate "closest historical comp / games like this one" over a feature vector — built as `simhash.ts` (dark, engine-only, seeded hyperplanes, bigint signatures capped at 64 bits). **Measured**: bit-disagreement matched the θ/π collision law within 0.0009 at θ=π/4 (400 pairs); multi-probe querying at 8 probes strictly beat exact-bucket recall on a seeded corpus. The inverse-projection-magnitude probe priority is the dump's (correct) training-free heuristic. |
| **MinHash** (Jaccard-set LSH) | `[REFERENCE]` | For set-similarity (e.g. overlapping-signal sets between picks). Niche; noted, not built. |
| **Thompson Sampling / contextual bandits (LINEAR)** | `[BUILT]` | The principled explore/exploit primitive, built as `linear-thompson.ts` (dark; Bayesian linear posterior + Cholesky sampling, seeded; MUST NOT gate real-money actions without its own founder-approved policy — stated in the module header). **Measured**: on a seeded 5-arm linear bandit over 2000 steps it earned 1213.9 vs 511.4 for uniform-random (oracle ceiling 1240 → cumulative regret 26.1) and converged to the best arm 96.8% of the last 500 pulls. Linear over neural is the dump's own (correct) recommendation. |

**Verdict:** genuine, transferable, non-ZK leverage — built dark this pass with
named future consumers (comp-finder, "games like this", allocation decisions).
Wiring any of it to a product surface is its own future step.

---

## CLUSTER C — ZK proof aggregation (the real roadmap, honestly labeled)

> Sections: the two code blocks (`zkCalibrationReceipt`, mock ZK verifier),
> "Groth16 aggregation", "SnarkPack core impl", "Halo2 aggregation methods",
> "IPA Polynomial Commitment", "Halo2 accumulation layer", "accumulator circuit
> design/optimizations". All **accurate** descriptions of real systems.

**What is true:** GSE's Merkle slate commitments (`proof-of-record.ts`,
`slate-commitment.ts`) are **tamper-evident** — they prove a pick was in the
committed set, unaltered. They are **not zero-knowledge** — verifying reveals the
committed fingerprints. The dump's ZK material describes the machine that would
add the missing property: *prove a published number (a ROI band, a calibration
bound) was computed from the sealed ledger **without revealing the ledger.***

**The two code blocks — worked, not dismissed:**

1. **`zkCalibrationReceipt`** — `[SALVAGED → BUILT as calibration-commitment.ts]`.
   The `valid:true` hardcode and the "adversarial test passes" comment are not a
   proof, and `bound = 1.96·√(sum/n)` is a normal-approximation half-width, **not**
   the "Ville O(1/√n)" the comment claims (there is no shrinking `/√n` term — it
   converges to `1.96·√μ`, a constant). Doing the work: the *formula* is wrong for
   its stated purpose, but the **receipt structure is the real, valuable idea** —
   bind `(modelHash, method, computed bound, ledgerHash)` into one deterministic,
   tamper-evident record. Salvage: build that receipt, but feed it our **proven**
   bounds (empirical-Bernstein / Ville from `anytime-ledger.ts`, already
   Monte-Carlo-verified) instead of the normal approximation. **Leverage captured:
   a committed, verifiable calibration/ROI bound bound to a model hash.**

2. **Mock ZK verifier (`generateZKReceipt`/`verifyZKReceipt`, `ZKReceipt`)** —
   `[SALVAGED: interface kept, "ZK" label refused]`. The code self-labels `MOCKZK`
   and only checks that a SHA-256 string is well-formed + the proof string has the
   right prefix — i.e. a **tamper-evident commitment we already have via real
   Merkle roots**, not a zero-knowledge proof. Shipping it *labeled* "ZK" is the
   exact overclaim the moat forbids (a fabrication gets us dismissed). **But the
   `ZKReceipt` API boundary — `{ commitment, bound, proof, publicInputsHash }` — is
   a clean, correct drop-in point for a future real proof.** Salvage: the
   interface ships as `CommitmentEnvelope` (deliberately NOT "Zk"-named, per the
   hostile claims audit — a shipping symbol must not connote a capability that
   does not exist) with `proof` hard-typed `null`; the JSDoc names Halo2/IPA as
   what would fill it. Nothing that ships claims to be zero-knowledge; "ZK"
   appears in code only inside comments describing what the FUTURE seam is for.

**Aggregation techniques (real; roadmap):**

| Technique | Tag | Honest leverage |
|---|---|---|
| **SnarkPack** (Groth16 aggregation via GIPA/MIPP; O(log k) proofs; the dump relays ~8s prove / ~33ms verify at 8192 proofs — figures from the SnarkPack literature (Gailly–Maller–Nitulescu 2021), **not verified here**) | `[ROADMAP]` | *If* GSE ever generates one ZK proof per pick, SnarkPack folds a whole slate into one succinct proof. The reported numbers *suggest* the path is fast enough to be practical — useful for de-risking the "should we ever build ZK?" decision, pending verification the day it matters. |
| **Halo2 + IPA accumulation** (transparent, no trusted setup, recursive) | `[ROADMAP-preferred]` | The **better** fit than SnarkPack for GSE: no trusted-setup ceremony (a trust-brand liability we must never take on lightly), and native **incremental** accumulation matches a ledger that grows one settled pick at a time. If ZK is ever built, this is the recommended architecture. |
| **IPA polynomial commitment** (Pedersen vector commit, log-d folding) | `[ROADMAP]` | The commitment scheme under Halo2. Correct as described. |
| **Halo2 accumulation layer / accumulator circuit** (λ-linear MultiOpenProof folding) | `[ROADMAP]` | The recursion mechanism. Correct. Only meaningful once base per-pick circuits exist. |

**The honest bottom line for Cluster C:** we do **not** build a ZK prover now — we
have no "reveal the ledger" problem yet (the ledger's *contents* are already public
by design once settled). We **do** keep the receipt interface as the seam, and we
document Halo2/IPA as the named path for the day we want *sealed-ledger* proofs
(e.g. proving a live, still-secret slate's aggregate property before reveal).

---

## CLUSTER D — MSM / curve / lattice prover internals (roadmap depth only)

> Sections: "halo2-ecc MSM", "Pippenger MSM / variants / recursive / window
> tuning", "Strassen-based MSM", "GLV endomorphism / decomposition / Babai
> rounding", "GLS curve construction / selection / 4-GLV", "BLS12-381 / BN254 /
> BN462 / BN448 parameters + pairing optimizations (cyclotomic squaring, torus
> compression, Frobenius automorphisms, **Tate pairing and its variants — ate,
> optimal ate, eta, Weil** — optimal ate being the practical one), "**embedding
> degree constraints** (MOV/FR resistance: k must be large enough that DLP in
> F_{q^k} matches the target security; k=12 for the BLS/BN families)", "LLL /
> BKZ / pruning / progressive / adaptive / Chen-Nguyen / Gaussian heuristic /
> Minkowski", "sieving / LSH-sieve".

**All of this is accurate cryptographic engineering.** It is also, uniformly, the
*inside* of the Cluster-C prover — how to make MSMs and scalar multiplications fast
inside a Halo2/Groth16 circuit. **Direct GSE leverage today: zero**, because there
is no prover to optimize. The honest 0.1% extraction from the entire cluster is a
single **feasibility verdict**, not code:

> The ZK-aggregation path is **known-feasible and known-fast at production scale.**
> Pippenger + GLV/GLS + optimized pairings are mature, library-supported (arkworks,
> halo2-ecc), and the performance envelope (log-k proofs, ms-scale verify) is
> established. So *if* GSE ever needs sealed-ledger proofs, the cost is an
> integration, not a research program. That single fact is the leverage; the
> per-window `w=4..6` tuning and 4-GLV Babai constants are **not** things GSE will
> ever hand-implement — they come from the library the day we adopt one.

`[ROADMAP]` for the lot. Nothing to build; nothing to dismiss; the value is the
de-risking verdict above.

---

## The number-theory tail — `[REFERENCE]`

> Sections: "Gaussian Heuristic derivation", "Stirling approximation / series",
> "Euler-Maclaurin applications", "Poisson summation formula", "Modular forms
> applications", "Minkowski's First Theorem".

Correct classical mathematics underpinning the Gaussian heuristic used to tune
lattice reduction. Zero GSE product use, even inside Cluster C (it is analysis
tooling for choosing curve constants, which the library already does). Kept as
`[REFERENCE]` — accurate, filed, not actionable. This is the honest floor of the
dump: real math, no leverage, named as such rather than pretended into relevance.

---

## What shipped from this dump (see the code, not this prose)

- `packages/prediction-engine/src/calibration-map.ts` (+ 18-test suite) — Platt
  scaling, Beta calibration, order-invariant tie-pooled equal-mass ECE, and
  `selectCalibrator` (k-fold out-of-sample selection across isotonic/Platt/Beta
  with an identity fallback and a MEASURED parametric-bootstrap noise bar).
  Deterministic (seeded folds, IRLS fits, no RNG in the maps). **Measured, values
  recorded in test comments with the load-bearing ones asserted:** Platt
  recovered a known 0.5 overconfidence shrink as a=0.507368; on that data OOF ECE
  was raw 0.100 → isotonic 0.065139 / Platt 0.021021 / Beta 0.029394, noise bar
  0.015326 → Platt selected. **[Cluster A]**
- `packages/prediction-engine/src/calibration-commitment.ts` (+ 10-test suite) —
  the honest salvage of BOTH dump code blocks: `buildCalibrationCommitment` binds
  (modelVersion, method, paramsHash, claimedEce, sampleSize, committedAt, optional
  anytime lower bound + ledger root) through the existing `hashLeaf`/
  `canonicalPickPayload`; `verifyCalibrationCommitment` catches any tamper
  including a swapped calibration map; `CommitmentEnvelope` preserves the draft's
  `{commitment, bound, proof, publicInputsHash}` seam with `proof` hard-typed
  `null`. No shipped claim or exported symbol presents this as zero-knowledge;
  "ZK" appears only in comments describing the future seam. **[Cluster C salvage]**
- `packages/prediction-engine/src/calibration-sequence.ts` (+ 9-test suite) —
  anytime-valid calibration monitoring: a Ville e-process on the stated-probability
  residuals (two-sided mixture + per-region bin layer). **Proven by
  adversarial-peeking Monte-Carlo:** FP 0.0225 vs the 0.05 budget (2000 ledgers ×
  300 picks); detects an 8pp overconfidence drift 71.75% of the time (direction
  right on 100% of trips, median detection at pick 239/500); localizes a regional
  drift to the correct probability bin 98.3% of the time; matches a hand-computed
  3-observation recursion to 8 decimals. **[Cluster A × K11 fusion]**
- `packages/prediction-engine/src/simhash.ts` (+ 19-test suite) and
  `packages/prediction-engine/src/linear-thompson.ts` (+ 10-test suite) — the
  Cluster-B extractions (see that table for the measured numbers). **[Cluster B]**
- The pre-existing measurement toolkit (`probability-calibration.ts`,
  `calibration-apply.ts`, `/api/calibration`) was **verified against the dump's
  specs** rather than rebuilt. **[Cluster A, VERIFIED-existing]**

**Hostile verification round (3 lenses, executed constructions):** a hostile
quant, a hostile cryptographer, and a claims auditor attacked the first-wave
modules. Real findings, all fixed and regression-tested: a commitment
delimiter-injection forgery (HIGH — crafted `method` string forged a second
field set with the same hash; committed strings now reject `|`/`=`); a
non-monotone Beta refit escape (HIGH — now collapses to the base-rate map); tie
order-leakage in equal-mass ECE (HIGH — now pre-pooled and order-invariant);
silent IRLS divergence on separation (now refuses via convergence + saturation
guards); a zero-margin selector recommending maps on calibrated data 70–88% of
the time (now 2.5–17.5% via the measured noise bar); folds validation; plus the
doc/claims corrections reflected throughout this ledger.

Everything dark/additive; no live flag flipped; no public claim shipped without
its own gate. Post-fix state, all counted from actual runs: engine suite **69
files / 714 tests green**, engine + apps/web typechecks clean. Every number in
this document traces to an executed run, the repo, or is explicitly attributed
to unverified external literature.
