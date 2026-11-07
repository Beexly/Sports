# LANE 3 — ADVERSARIAL SPOT-AUDIT OF LANDED QA CLAIMS (Motif-executed)

**Lane note:** Assigned to DeepSeek (adversarial lane 3) under Garrett's 03:13 CT all-hands order. The original DeepSeek session sat confined in its launch directory (the same harness permission failure as Lane 2); a staged relaunch inside ~/workspace/ds-lane3-work was still running at filing. Motif recomputed all five claims independently so the audit exists tonight; the DeepSeek run, if it returns, stands as the second independent check. Authorship: Motif, not DeepSeek. All computations below are Motif's own, run 2026-11-07 ~03:55–04:00 CT against the catalog copy in ds-lane3-work (byte-identical to the repo file — see Claim 5).

## Claim 1 — generative cycles (formula_type %9, theorem %25, family %279, all 12,304)

Method: parsed all 12,304 entries; formula_type mapped by its 9-value cycle order; theorem taken as the entry's position in the 25-value theorem_or_source cycle; family compared to family_id directly.

- formula_type: cycle (linear_logit, bilinear_interaction, rational_pade, exponential_survival, bellman_advantage, copula_tail, conformal_quantile, sheaf_laplacian, python_callable) matches (i−1)%9 for **12,304 / 12,304 — 0 exceptions.**
- family: family_id = (i−1)%279 for **12,304 / 12,304 — 0 exceptions** (and family_code cycles in lockstep).
- theorem: the claim holds **only under the correct reading**: theorem_or_source cycles through **25 distinct values** in fixed order (12 Theorem_NN + 2 Wave13 + 11 Book/GSE sources), and position-in-cycle = (i−1)%25 for all 12,304. Read naively as "the theorem NUMBER cycles %25," it fails: the 5,904 non-Theorem_ entries carry no theorem number (first at entry 14), and the 12 Theorem_NN values themselves satisfy (n−1) ≡ i (mod 25) trivially because n ≤ 12 < 25. Counts: Theorem_01–04 ×493 each, Theorem_05–12 ×492 each; Wave13 ×984 total.
- **Verdict: CONFIRMED with the precision above** — the 25-cycle is a cycle of 25 source labels, not of theorem numbers 1–25.

## Claim 2 — exactly 30 distinct binding triples; top two recur 423× each

Method: Counter over tuple(parameter_bindings) for all 12,304 entries.

Result: **30 distinct triples.** Top two: (home_pressure_rate, away_sack_rate_allowed, home_ol_starters_out) ×423 and (wind_mph, temp_f, precipitation_flag) ×423. **Verdict: CONFIRMED.**

## Claim 3 — EQ_00003 = −3.08324 at (rest −10, tz 0, pace 0)

Method: evaluated the entry's stored formula_expression (pre-comment part) with its own coefficients at the stated inputs: (0.308324·(−10) + −0.177105·0) / (1 + |0.115568·0|) = −3.08324 / 1.

Result: **−3.08324 exactly (5 dp). Verdict: CONFIRMED** — and the standing caveat travels with it: the entry is presented as a probability ("P(disruption) = σ(…)" in its own comment) while its stored expression has no sigmoid and returns −3.08; the gate's rational_pade kernel reproduces the same value family. The number is real; what it is claimed to mean is the problem (MATH-QA-FINDINGS stands).

## Claim 4 — seven-component mean 81.205714; 86.62 would need AIME 97.90

Method: direct arithmetic. Sum = 85+95+85+60+65+90.24+88.20 = 568.44; mean = 568.44/7 = **81.205714**. For a 86.62 mean the sum must be 606.34; holding the other six (508.44) fixed, the 60.00 component must be 606.34 − 508.44 = **97.90**.

**Verdict: CONFIRMED** — as a statement about the seven-component plain mean. (The separate 86.12 artifact reaches its composite through published suite weights, a different computation — see the morning report §2. Neither rescues 86.62.)

## Claim 5 — catalog and twin byte-identical, md5 a1ddb61f5b657a74970c7766421a33f5

Method: md5sum over both files in the staged tree (and independently over the qa-repo working copies earlier tonight).

Result: data/equations/equation_executable_catalog_12304.json = **a1ddb61f5b657a74970c7766421a33f5**; data/engine/master_equation_registry_12k.json = **a1ddb61f5b657a74970c7766421a33f5**. **Verdict: CONFIRMED.**

## Closing line

No claim was CANNOT-CHECK: all materials were present in the staged tree (catalog, twin; the provider source was not needed for any of the five claims as stated). Net: 5 of 5 claims CONFIRMED, one (Claim 1) with a precision correction that matters — the %25 cycle runs over 25 source labels, 13 of which are not theorems at all.
