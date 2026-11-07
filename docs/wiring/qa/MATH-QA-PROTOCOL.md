# Math QA Protocol — GSE Equation Estate

**Origin:** DeepSeek math-QA lane (run 2, 2026-11-07) designed the audit; its session had no write permission, so the protocol text below was reconstructed by Motif from the lane brief (`TASK-DEEPSEEK-MATH-QA.md`) plus the measurements the lane actually computed in-session. Items marked **[measured]** were computed by the lane and spot-verified by Motif against the catalog on 2026-11-07 (see MATH-QA-FINDINGS.md, Verification section). Items marked **[protocol]** are specified tests not yet executed.

**Material:** `data/equations/equation_executable_catalog_12304.json` — 12,304 entries, 279 families, fields include `equation_id, family_id, family_code, domain, cluster, theorem_or_source, formula_type, formula_expression, parameter_bindings, coefficients, sample_size_n, gate_status, dead_or_stubbed, real_source_file, real_source_locator, latex_or_code_formula, operator_type, assumptions, failure_modes`. Byte-identical twin: `data/engine/master_equation_registry_12k.json` (md5 a1ddb61f5b657a74970c7766421a33f5, blob-verified). Thousand-matrix: `data/engine/thousand_equation_matrix_2026.json` — 1,666 entries.

---

## 0. The structural fact the whole audit hangs on [measured]

The catalog is **generatively templated**, not 12,304 independently authored equations:

- `formula_type = F[(i−1) mod 9]` — 9 templates, counts 1,368 + 8×1,367. Conformance 12,304/12,304.
- `theorem_or_source = T[(i−1) mod 25]` — 25 labels, counts 492/493. Conformance 12,304/12,304.
- `family_id = Fam[(i−1) mod 279]` — conformance 12,304/12,304; `formula_type` is constant within each family (0 exceptions).
- Every family therefore contains all 25 theorem labels, and a family's *name/domain* rotates independently of its *formula*. Entry names, theorem attributions, and stated mathematics routinely disagree with the executable expression (e.g. EQ_00001 cites a Sinkhorn theorem and a state-space model; its expression is a linear logit over pressure features).
- Only **30 distinct parameter-binding triples** exist across all 12,304 entries (top two recur 423× each).
- **All 12,304 expressions embed a `/* … */` comment** carrying a LaTeX fragment that is *not* the expression's mathematics; **9,174 of those comments end mid-token** (Motif recount under a stated rule; the lane's 8,535 used a different truncation rule — the class is real, the exact count is rule-dependent).

**Consequence for the audit:** per-entry semantic review of 12,304 entries is the wrong unit. The auditable units are (a) the **9 templates**, (b) the **30 binding triples**, (c) the **name/theorem ↔ expression binding**, which is decorative, and (d) the catalog's **self-asserted header claims**, several of which fail (see Findings F-01…F-04). Any consumer that reads `theorem_or_source`, `name`, or the embedded LaTeX as the equation's meaning is consuming decoration.

## 1. Correctness invariants by family class

For each class: the invariants an implementation MUST satisfy, and the cheapest decisive test. Classes are keyed to the estate's real risk surface (published probabilities first).

### 1.1 Optimal transport / Sinkhorn
Invariants: row sums of P equal r and column sums equal c to tolerance; P ≥ 0 entrywise; residual is a *computed* value at stated (iterations, ε, matrix), never a stored literal; convergence flag consistent with the residual it reports.
Decisive tests: recompute at the shipped parameters in float64 with libm `exp` (done — RECOMPUTE-RESULTS.md Claim 1: true residual 1.3877787807814457e-16); sweep iterations 1–40 and ε to locate any circulating constant's provenance (2.66e-7 ⇔ ε ≈ 0.07923, not the shipped 0.15); grep the estate for the literal.

### 1.2 Copulas
Invariants: the base inside any `(1 + (x·y)/4.5)^(−2.75)`-type factor must stay positive on the declared input domain — a negative base raised to a non-integer power is NaN; joint CDF ∈ [0,1]; margins uniform.
Decisive test: domain-corner evaluation. **[measured]** The `copula_tail` template's base goes negative for plausible inputs (rest = −3, tz = 4 ⇒ base −0.333…): NaN by construction. Enumerate all `copula_tail` entries (1,367) and test the four sign corners of each binding pair.

### 1.3 Gaussian processes
Invariants: kernel PSD on any finite point set; predictive variance ≥ 0; the catalog's GP-named entries must actually contain a kernel — **[measured]** EQ_02166 ("Gaussian Processes for Machine Learning", Rasmussen & Williams) is a `copula_tail` template over rest/starters counts: no kernel exists. Class verdict: name-binding failure; PSD tests are protocol-only until a real kernel implementation is located.

### 1.4 Information-theoretic divergences
Invariants: entropy ≥ 0 (discrete) and ≤ log|support|; KL ≥ 0 with equality iff p = q; any expression labelled entropy that can go negative on its domain is not an entropy.
Decisive test: sign scan over the binding domain. **[measured]** EQ_00195's expression is an unbounded linear form (negative values reachable) while its comment names information-theoretic quantities (perm_entropy etc.).

### 1.5 Self-normalized processes
Invariants: self-normalized statistics are scale-invariant in the numerator/denominator pair; tail bounds require the stated variance proxy; expressions must actually contain a ratio of a sum to its own scale estimate. Template scan decides: none of the 9 templates is a self-normalized ratio — class is protocol-only / absent-by-construction.

### 1.6 Nonparametric estimators
Invariants: kernel weights sum to 1; bandwidth > 0; estimator reduces to the sample mean as h → ∞. No template implements a kernel average — protocol-only / absent-by-construction.

### 1.7 Conformal prediction
Invariants: a conformal quantile lies in [0,1] as a probability level, or is a quantile *of the calibration scores* (data-scale, sign-free) when it is a prediction bound — the two must not be conflated; coverage claims require exchangeability or stated weights (Barber et al.).
Decisive test: identify which object each `conformal_quantile` entry claims to be. **[measured]** EQ_00349's value range is (−0.284188, +0.284188) — symmetric about 0 — which no probability level and no nonneg score quantile can be; its comment describes a normalized-increment ratio φ, a third object. EQ_00032 is *named* "Barber Weighted Conformal" but its expression is a weather linear form in which `precipitation_flag` enters only via `max(wind_mph, precipitation_flag)`.

### 1.8 Probability calibration / proper scoring
Invariants: CRPS closed form for N(μ,σ) at x: σ·[z(2Φ(z)−1) + 2φ(z) − 1/√π], z=(x−μ)/σ; at z=0 the σ-free constant is 2φ(0) − 1/√π = 0.23369497725510913. Brier ∈ [0,1] (binary, per-outcome convention stated). Any "probability" output must lie in [0,1] on the whole declared domain.
Decisive tests: **[measured]** provider constant `stdNormalCrpsAtZero` recomputed exactly: 0.23369497725510913 vs stored 0.233694977 — MATCH (the one claimed constant in the estate that verifies). **[measured]** range scans: `rational_pade` template is unbounded (EQ_00003 reaches −3.08324 at rest = −10); `linear_logit` template outputs logit_inv(·) − 0.5 ∈ (−0.5, 0.5), i.e. a *centered* probability, not a probability (EQ_04852).

### 1.9 Rating models (Bradley–Terry / Dixon–Coles class)
Invariants: BT probability = π_i/(π_i+π_j) ∈ (0,1), symmetric π_i ↔ π_j; DC score matrix rows sum to 1; τ correction only on the four low-score cells.
Decisive test: name-binding scan. **[measured]** EQ_06896 is *named* "Empirical Bayes shrinkage of Bradley-Terry-Luce MLEs (arXiv:1807.09236)" and its expression is a bilinear form over altitude_ft/wind_mph/total_line — no strengths, no ratio, no BT object exists. Class verdict: no BT/DC implementation is present in the catalog to verify; the labels are decorative.

### 1.10 Kelly / bankroll growth
Invariants: f* = p − (1−p)/b for binary payoff b; f* sign must match the sign of the edge p(1+b) − 1; f* ≤ 1; growth rate g(f) concave with max at f*.
Decisive tests: **[measured]** EQ_00418 ("kelly-saturation-hardening") is an exponential-survival form whose value at zero pressure differential is exactly 0 and whose sign is driven by `sign(pressure − starters_out)` — the sign of a pressure differential, not the sign of any edge; no p or b appears. EQ_04852's own comment carries the correct f* derivation while its expression computes an unrelated centered logit.

## 2. Triage rule — ranking 279 families by blast radius

Use only fields the catalog actually carries:

1. **Emission reach** (highest weight): does any entry's `real_source_file` resolve to code on a published path (provider worker, web app)? Entries citing the thousand-matrix or provider outrank internal-only citations. **[measured]** Only 1,666 entries cite the matrix file at all; 1,098 of them carry `EQ-MC-…` locators rather than equation IDs, and only 1 of the 2,577 distinct cited source files exists in the catalog's own checkout.
2. **Output type**: templates whose codomain claims probability/entropy/quantile (per §1) outrank pure scores — a wrong probability publishes; a wrong score merely ranks.
3. **Gate status**: entries with `gate_status` asserting verified/passed outrank unasserted ones — an asserted-but-wrong entry is worse than an unasserted one because downstream consumers trust it. The header's `zero_dead_or_stubbed_verified` / `all_parameter_bindings_valid` / `authentic_source_verified_count = 12304` claims are themselves audit targets (Findings).
4. **Template class**: order by §1 class risk — calibration/probability > conformal > copula (NaN risk) > transport > rating/Kelly (absent-by-construction: the risk is the *label*, not the math) > the rest.

## 3. Sampling design for deep verification

- The population is **not** 12,304 independent items; it is 9 templates × 279 family bindings. Deep-verify **all 9 templates** (exhaustive — they are the generative units) and **all 30 binding triples** at domain corners.
- For name/theorem-binding integrity: stratified sample per template, n = 30 entries per template (270 total), drawn by stride (every ⌊12304/270⌋-th entry) so all 25 theorem labels and all family rotations are hit proportionally. A binding-mismatch rate p̂ from n=270 carries a worst-case 95% margin of ±6.0pp (normal approx., p=0.5); if the observed rate is near 1.0 (as the inspected cases suggest), the margin collapses and the correct statement is a lower bound: ≥ 98.9% at 95% confidence if 270/270 mismatch.
- For header-claim falsification, sampling is unnecessary: each claim is universal, so **one** counterexample decides it (Findings F-01 uses EQ_00027-class evidence only if its premise verifies — see the correction recorded there).
- Claimed constants are a census, not a sample: every numeric literal asserted anywhere in the estate (health surfaces, adapter, pages) goes into RECOMPUTE-QUEUE.jsonl at top priority.

## 4. Rules of the lane

Mathematics only; no wiring, no game simulations, no content. A missing schema field is a finding, not a dead end. Depth over coverage: ten findings proven in the open beat a hundred suspicions. Every numeric claim in the findings carries its inputs so the lab can rerun it exactly.
