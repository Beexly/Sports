# DeepSeek adversary — round 3 (all prior corrections accepted)

It accepted all three of our error corrections and the Bickel & Kim finding
without argument, then supplied the two things that were actually missing.
**This round closes the C-21 and C-23 gaps.**

---

## ADOPT — C-21 unblocked: the correct grouping-loss estimator

Its round-2 formula was wrong (within-bin *outcome* variance ≈ p(1−p) ≈ 0.25,
pure Bernoulli noise). Correct target:

```
GL = E_S[ Var( P(Y=1|X) | p̂(X) = s ) ]
```
— the spread of **true posteriors** among observations sharing a score. Not
directly observable; estimated by clustering within each score bin on features.

For bin `b` with `N_b` observations partitioned into `K_b` feature-space
clusters (cluster size `n_c`, cluster outcome rate `ȳ_c`, bin rate `ȳ_b`):

```
GL_b = (1/N_b) Σ_c n_c (ȳ_c − ȳ_b)²  −  (1/N_b) Σ_c [n_c/(n_c−1)] ȳ_c(1−ȳ_c)
GL   = Σ_b (N_b/N) · GL_b
```
The second term removes the first-order finite-sample Bernoulli contribution.
Singleton clusters make it undefined — drop them or use leave-one-out shrinkage.
The estimator is a **lower bound** (negatively biased).

**Decision threshold = permutation null, not a fixed number.** Within each score
bin permute `y` (destroying grouping structure, preserving the bin rate),
recompute GL, repeat 1,000×. Report the permutation p-value directly.
`GL < c_0.95` → no detectable structure, stop the edge search.

At n=909 with 10 bins × 5 clusters, typical cluster size ≈18 and cluster-rate
SE ≈ 0.12 — so the estimator is noisy; report the p-value, not a point estimate
alone. Use the authors' code (github.com/aperezlebel/beyond_calibration);
cluster on standardized **logit-transformed features**, not raw probabilities,
and never choose K and estimate GL on the same observations without nesting.

---

## ADOPT — C-23 gap closed: e-process for the continuous price-space null

The price-space null `H0: E[Δ_i] ≤ 0` is continuous; the binary win-rate
e-factor tests a different null. Correct construction (Waudby-Smith & Ramdas,
*Estimating means of bounded random variables by betting*):

Map `Δ_i ∈ [−1,1]` to `X_i = (Δ_i + 1)/2 ∈ [0,1]`, so the null becomes
`E[X_i] ≤ ½ = μ₀`. For predictable `λ_i ∈ [−2,2]`:

```
E_i = 1 + λ_i (X_i − μ₀),     E_n = Π E_i
E[E_i | F_{i−1}] = 1 + λ_i(E[X_i|F] − μ₀) ≤ 1   under the null
```
`λ ∈ [−2,2]` keeps every factor non-negative given `X_i ∈ [0,1]`.

Empirical-Bernstein bet sequence:
```
λ_{t+1} = clip( (2μ̂_t − 1) / (σ̂²_t + σ̂²_t/t),  −2,  +2 )
```
Mixture over unknown edge: average `E_n(θ)` over a grid θ ∈ [0.51, 0.65] — an
average of e-values is an e-value, so validity is preserved.

**Power comparison (derived):** continuous beats binary when
`σ²_Δ < p₀(1−p₀) ≈ 0.249`. Likely true in practice but must be measured on
clean data. **Run both; pre-register the continuous as primary** and the binary
as a sanity check — never pick the one that certifies after seeing the path.

---

## ADOPT — the prior update, and it is harsh

Bickel & Kim (2014) verified real by us independently (Applied Financial
Economics 24(18), 1229–1234). Its Bayes update:

```
prior P(edge) = 0.10
P(BK finds little inefficiency | edge)    = 0.30
P(BK finds little inefficiency | no edge) = 0.90
posterior = (0.10 × 0.30) / (0.10 × 0.30 + 0.90 × 0.90) = 0.036
```
With a 0.05 prior → ~0.017. **Defensible posterior for a real MLB totals edge is
now ~2–4%, not 10–15%.**

On whether our angles escape it — its honest verdict: *"You are not entirely
rationalising, but the burden is now much higher."* Weather-park interaction and
full-distribution/alternate pricing are the least likely to be priced (they need
more modelling than mean totals). **Bullpen fatigue and umpire zone are more
likely already priced by sharp books** — which downgrades two of the four
mechanisms we were counting on.

---

## ADOPT — the honest boundary on hidden variants

Under stated assumptions (collision-resistant H, reliable anchoring,
unpredictable beacon, operator cannot rewrite all mirrors):

**Cryptographically provable:** no later addition to the committed variant
registry; no retroactive ledger edit; no silent swap of pinned model
code/weights (reproducible build + hash); no post-hoc change to the inclusion
rule or holdout seed (public randomness beacon — drand/NIST — seeds the
partition so it cannot be chosen after outcomes).

**Detectable, not provable:** omission of a variant from the initial registry;
selective non-publication of eligible picks (the **open-scan guard** is the
strongest defence — because the inclusion rule is deterministic from
pre-placement data, a public scanner can flag any eligible game with no ledger
entry); deletion of published entries (third-party mirroring).

**Irreducibly trust-based:** unregistered variants run on infrastructure outside
the attested environment; a private parallel ledger; choosing the inclusion rule
by peeking before the beacon round. A TEE with remote attestation
(Nitro/SGX) converts this to *hardware* trust rather than eliminating it.

**Its own instruction, which we adopt verbatim: do NOT claim cryptographic
proof of "no hidden variants."** Claim exactly the boundary above.

---

## ADOPT — ranked failure modes (what kills a certification)

| Rank | Failure | P | Damage | Score |
|---|---|---|---|---|
| 1 | **CLV close contamination persists** — stale/model-derived/non-executable prices survive the fix | 0.30 | 0.95 | **0.285** |
| 2 | Same-slate dependence under-corrected → early false crossing | 0.25 | 0.90 | 0.225 |
| 3 | Exploratory→confirmatory leakage inflates false-positive rate | 0.20 | 0.90 | 0.180 |
| 4 | Regime shift; model decays before kill triggers | 0.20 | 0.70 | 0.140 |
| 5 | Hidden-variant/threshold hacking not fully closed | 0.10 | 0.95 | 0.095 |
| 6 | Mixture e-process over-adapts, inflates Type I | 0.10 | 0.70 | 0.070 |

**Single most likely false certification: contaminated closing prices surviving
the repair.** Already visible in our historical data, and the easiest route to a
spuriously positive CLV. Monitoring must reject any close that is not a real,
executable, timestamped price from a sharp book, and must cross-check agreement
across books. This is C-15/C-20 and it ranks first for a reason.

---

## Two-track history — adopted as written

**Track 1 (confirmatory):** frozen, immutable, prospective picks only, sole
basis for certification. **Track 2 (exploratory):** the 909 contaminated
historical picks with corrections — usable for feature engineering, model
selection, prior elicitation, variance estimation, grouping-loss estimation,
inclusion-rule design. **Never** for certification, e-process calculation, any
public edge claim, or any adjustment to Track 1.

Disclosure language adopted:
> "We maintain two historical records. The confirmatory record is frozen and
> immutable; it is the sole basis for our certification claims. The exploratory
> record has been corrected for known data-quality problems and is used only for
> model development, feature discovery, and prior elicitation. Findings from the
> exploratory record do not constitute evidence of edge. No exploratory result
> enters the certification e-process. The confirmatory model and thresholds were
> fixed before the first eligible pick of the certification window was placed."

---

## AUDIT FLAG — one confabulation

It wrote: *"You mentioned Foresight Arena (2026) and Sealed Before Event (2026).
I have not verified these."* **We never mentioned either.** No such names appear
anywhere in our prompt. It invented two prior-art references, attributed them to
us, and then hedged on them — which is a subtler failure than a plain fabricated
citation, because the hedge makes it look careful. Treat any prior-art claim
from it as unverified until independently checked; it also correctly noted it
cannot run a live literature search.
