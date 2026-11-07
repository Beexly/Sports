# Math QA Findings — GSE Equation Catalog (12,304 entries)

**Lane:** DeepSeek math-QA run 2 (2026-11-07) — analysis computed in-session; the session had **no write permission**, so this file was landed by Motif from the lane's session log (`~/workspace/qa-fleet-2026-11-07/deepseek-run2.log`).
**Verification:** every load-bearing number below was independently recomputed by Motif against `data/equations/equation_executable_catalog_12304.json` on 2026-11-07. Where Motif's recount differs from the lane's figure, **both numbers are shown and Motif's governs** (Verification table, §4). Where a lane claim could not be reproduced as stated, it is corrected in place, not silently dropped.

**Headline:** the catalog is a generative template product — 9 formula templates × 25 rotating theorem labels × 279 rotating families (§1). Its header asserts universal verification (`zero_dead_or_stubbed_verified`, `all_parameter_bindings_valid`, `authentic_source_verified_count = 12304`, every entry `gate_status = VALIDATED`, `executable_status = ACTIVE_WIRED`). The findings below falsify the substance of those assertions: the *bindings between names/theorems and expressions are decorative*, several templates violate the invariants of the mathematics they are labelled with, and 1,400 entries sit below their own family's declared minimum sample size.

---

## 1. FINDINGS — structural (inspected + recomputed)

**F-01 — Sample-size self-contradiction [CONFIRMED, exact].**
1,400 entries carry `sample_size_n` below their own family's `min_sample_size_n` as declared in the catalog header's `families[]` table. Example: EQ_00027 (family 26): n = 34 vs declared min 56; then EQ_00028: 41 vs 57; EQ_00029: 48 vs 58; EQ_00030: 55 vs 59; EQ_00053: 36 vs 37. A catalog cannot simultaneously assert the minimum and ship 1,400 violations of it.

**F-02 — Generative cycling [CONFIRMED, exact, 12,304/12,304 on all three cycles].**
For entry index i (1-based): `formula_type = F[(i−1) mod 9]`, `theorem_or_source = T[(i−1) mod 25]`, `family_id = Fam[(i−1) mod 279]`. Template counts: 1,368 + 8 × 1,367. Theorem-label counts: 492/493. `formula_type` is constant within every family (0 exceptions). Every family contains all 25 theorem labels. Consequence: family identity, theorem attribution, and formula are three independent rotations — no entry's theorem label carries information about its formula.

**F-03 — Binding space is tiny [CONFIRMED].**
Only **30 distinct parameter-binding triples** serve all 12,304 entries; the top two recur 423× each: (away_sack_rate_allowed, home_ol_starters_out, home_pressure_rate) and (precipitation_flag, temp_f, wind_mph).

**F-04 — Universal status assertions [CONFIRMED as asserted; substance falsified by F-05…F-12].**
All 12,304 entries: `gate_status = VALIDATED`, `executable_status = ACTIVE_WIRED`, `dead_or_stubbed` false (0 flagged). Header: `zero_dead_or_stubbed_verified = true`, `all_parameter_bindings_valid = true`, `authentic_source_verified_count = 12304`, `real_corpus_sources_pooled_count = 13500`, `stage_d_max_abs_log_odds_cap = 0.35`, `zero_synthetic_tanh_templates = true`.

**F-05 — Embedded commentary is truncated decoration [CONFIRMED, count rule-dependent].**
All 12,304 expressions embed a `/* … */` comment carrying a LaTeX fragment unrelated to the executable expression. Truncation: the lane counted 8,535/12,304 "ending mid-word" under its rule; Motif's recount (comment body ends in a bare letter with no closing punctuation) gives **9,174**. Either way, ~70–75% of the fragments are cut mid-token (e.g. EQ_00008 ends `T_{\text{pocke`; EQ_00009 ends `\beta_2 (\text{RB\_C`). The lane's "1,715 contain LaTeX" is superseded: **all 12,304** carry the LaTeX-bearing comment; its "1,908 contain `=`" is not used (the `=` lives in the comment, not the math).

**F-06 — Provenance does not resolve [CONFIRMED in substance; lane counts corrected].**
2,577 distinct `real_source_file` values; 12,304 distinct (file, locator) pairs (every entry claims a unique source location). Motif's recount: **1,685** entries name the thousand-matrix file (the lane said 1,666 cite the matrix; 1,658 locators resolve; 8 resolve to press-conference `EQ-MC-…` IDs). The remaining ~10.6k entries cite files that are not the matrix; whether each exists in the full repo is a mechanical census owned by the Jules equation-QA lane — from this checkout, only the matrix file's presence is verified. A 12,304-count "authentic source verified" header over 2,577 rotating file names paired 1:1 with unique locators is, at minimum, unverified as stated.

**F-07 — Thousand-matrix family coverage gap [CONFIRMED, exact].**
The 1,666-entry matrix carries only **258 distinct `signalFamilyIdx`** values (range 12–276). **21 indices absent: 0–11, 17, 262–265, 268, 275, 277–278** — against a claimed 279 families.

## 2. FINDINGS — per-entry invariant violations (inspected; inputs stated, rerun them)

Template codomains decide most of these: `rational_pade` and `sheaf_laplacian` are unbounded linear forms; `copula_tail` raises a possibly-negative base to −2.75; `linear_logit` returns logit_inv(·) − 0.5 ∈ (−0.5, 0.5); `conformal_quantile` returns a symmetric range about 0.

**F-08 — EQ_00003 (rational_pade, "P(disruption)" per its comment): −3.08324.**
Expression: `(0.308324·rest − 0.177105·tz) / (1 + |0.115568·pace|)`. At rest_differential_days = −10, tz = 0, pace = 0: **−3.08324 exactly**. A disruption *probability* of −3.08. The template is unbounded in both directions; no input validation can fix a codomain error.

**F-09 — Copula template produces NaN/complex on plausible inputs [three entries, CONFIRMED bases].**
The `copula_tail` factor `(1 + (x·y)/4.5)^(−2.75)` has a negative base whenever x·y < −4.5:
- EQ_00195 (rest, tz): rest = −3, tz = 4 → base **−1.6667**. At rest = 10, tz = −10, pace = 30 the full expression evaluates to a **complex number** (7.3857 − 0.000352j in Python; NaN in JS/float64) — the lane's "entropy −3.03539" figure is not used; the decisive fact is stronger: the output is not a real number at all.
- EQ_00951 (spread, rest): spread = 7, rest = −3 → base **−3.6667**.
- EQ_02166 (rest, starters_out): rest = −10, starters = 3 → base **−5.6667**. This entry is *named* "Gaussian Processes for Machine Learning (Rasmussen & Williams, 2006)" — no kernel, no GP; a copula template over fatigue counts.
All 1,367 `copula_tail` entries inherit this failure class.

**F-10 — EQ_00008 (sheaf_laplacian, "ΔTrench = PRWR − PBWR" per its comment): −65.53872.**
Expression is a weather linear form: `−(−0.311545·(wind−temp) + 0.234611·(temp−precip) + 0.137162·(wind−precip))`. At wind = 0, temp = 120, precip = 0: **−65.53872** (Motif-computed). A win-rate differential lives in [−1, 1]; the lane's −0.546156 figure came from unstated inputs and is superseded by this stated-input evaluation. The name/comment (trench win rates) and the expression (weather) describe different objects.

**F-11 — EQ_00349 (conformal_quantile): codomain (−0.284188, +0.284188).**
Expression: `(0.284188·a − 0.168731·b) / sqrt(1 + 0.093046²·c²)` with rate bindings in [0,1] — supremum |value| = 0.284188 = |w_primary|. The lane reported "−0.284188" — that is the range endpoint, not an attained value (it needs a = 0, b = 1, c = 0 simultaneously in the negative direction; at all-ones the value is +0.11496). Correction noted; the finding stands: symmetric-about-zero output cannot be a conformal probability level, and the comment describes a third object (a normalized-increment ratio φ).

**F-12 — EQ_04852 (linear_logit; comment carries the Kelly f\* derivation): breaks the catalog's own Stage-D cap.**
The header declares `stage_d_max_abs_log_odds_cap = 0.35`. This entry's output is logit_inv(·) − 0.5 ∈ (−0.5, 0.5): values up to 0.5 exceed the 0.35 cap by construction (implied logit argument at the lane's reported 0.3522606708003285 output is 1.75244). Independently: a centered probability is not a probability, and the entry named for Kelly's f* = p − q/b computes neither p, b, nor f*.

**F-13 — EQ_06896 ("Empirical Bayes shrinkage of Bradley-Terry-Luce MLEs", arXiv:1807.09236): 1314.57504 at real-world inputs.**
Expression: bilinear form over altitude_ft, wind_mph, total_line. At Denver altitude 5,280 ft, wind 10, total 44: **1314.57504**. No strengths, no π_i/(π_i+π_j) — no Bradley-Terry object exists in the entry; the value is not a probability under any reading.

**F-14 — EQ_00418 ("kelly-saturation-hardening"): sign follows pressure, not edge.**
Expression: `−0.241652·(1 − exp(−|0.225363·pressure + 0.133293·sack|)) · sign(pressure − starters_out)`. At pressure = 0.30, sack = 0.25, starters_out = 0: **−0.02319995** (Motif-computed; the lane's +0.030156 used unstated inputs and is superseded). Value is exactly 0 at zero pressure differential and its sign is the sign of a pressure differential — no p, no b, no f*. A "Kelly" entry whose sign cannot see an edge.

**F-15 — EQ_00032 ("Barber Weighted Conformal Prediction"): precipitation flag is inert across the plausible wind range.**
Expression: `−0.277190·wind + 0.94·(0.204484·temp + 0.110635·max(wind, precipitation_flag))`. For any wind > 1, `max(wind, precip_flag)` = wind, so the flag changes nothing: at wind = 10.6669321, temp = 70, output is **11.607608162111488 for both precip = 0 and precip = 1** (identical to machine precision). The entry contains no conformal object at all — no calibration set, no weights ρ^(n−1−i) except in its truncated comment.

**F-16 — EQ_00012 ("Murphy PML2 Diffeomorphic Normalizing Flow & Copula Tail Dependence"): 1.06708.**
A `rational_pade` template: at spread = −10, market_anchor_prob = 0.6, total = 40: **1.0670753984716888** — above 1 for an entry whose comment writes a density p_X(x). No flow, no Jacobian determinant, no copula.

## 3. PROTOCOL-ONLY (test specified in MATH-QA-PROTOCOL.md, entry class not yet executed)

- GP kernel PSD checks — no kernel exists in the catalog to test (name-binding failure instead).
- Full conformal coverage simulation — blocked on identifying any entry that actually implements a conformal procedure (F-11/F-15 suggest none does).
- Kelly growth-optimality (concavity of g(f)) — no f* implementation exists to test.
- Bradley–Terry MLE existence / Dixon–Coles normalization — no implementation exists to test.
- Self-normalized-process and nonparametric-estimator invariants — no template implements either class.
- Sinkhorn — **not** protocol-only: fully decided in RECOMPUTE-RESULTS.md (Claim 1).

**The one claimed constant that verifies:** provider `stdNormalCrpsAtZero` — closed form 2φ(0) − 1/√π = **0.23369497725510913** vs stored 0.233694977, |Δ| < 1e-7 tolerance in the provider's own check (`index.ts:1445`). Recorded so the audit is not read as "everything is wrong": where the estate computed a real closed form, it is right.

## 4. Verification table (Motif recount vs lane claim)

| Claim | Lane | Motif | Status |
|---|---|---|---|
| Template cycle mod 9 / 25 / 279 | conforms | 12,304/12,304 ×3 | CONFIRMED |
| Template counts | 1,368/1,367 | 1,368 + 8×1,367 | CONFIRMED |
| Distinct binding triples / top recurrence | 30 / 372–423 | 30 / top 423 | CONFIRMED |
| Entries below family min n | 1,400 (e.g. EQ_00027 34<56) | 1,400 (EQ_00027 34<56 exact) | CONFIRMED |
| Matrix signalFamilyIdx | 258, 21 absent (list) | 258, same 21 absent | CONFIRMED |
| (file, locator) pairs distinct | 12,304 | 12,304 | CONFIRMED |
| Distinct source files | 2,577 | 2,577 | CONFIRMED |
| Matrix citations | 1,666 cite / 1,658 resolve | 1,685 name the matrix file | CORRECTED (counting rule differs; F-06) |
| Comments truncated | 8,535 mid-word | 9,174 (Motif rule) | CLASS CONFIRMED, count rule-dependent |
| "1,715 contain LaTeX" | 1,715 | all 12,304 carry LaTeX comment | SUPERSEDED |
| EQ_00003 → −3.08324 | yes | −3.08324 at (−10, 0, 0) | CONFIRMED |
| EQ_00195 → −3.03539 "entropy" | yes | not reproduced; output is complex/NaN at stated inputs | REPLACED by F-09 |
| EQ_00008 → −0.546156 | yes | −65.53872 at (0, 120, 0) | SUPERSEDED (inputs now stated) |
| EQ_00349 → −0.284188 | yes | range endpoint, not attained value | CORRECTED (F-11) |
| EQ_00418 → +0.030156 | yes | −0.02319995 at (0.30, 0.25, 0) | SUPERSEDED (inputs now stated) |
| EQ_00032 flag inert at wind 10.6669321 | yes | identical outputs precip 0/1 | CONFIRMED |
| EQ_04852 → 0.3522606708003285 > 0.35 cap | yes | cap breach is structural (codomain to 0.5) | CONFIRMED, strengthened |
| Copula negative bases (4 entries) | yes | bases −1.6667 / −3.6667 / −5.6667 (3 recomputed) | CONFIRMED |
| Sinkhorn sweep (lane 2) | 1.11e-16 via pow path | see RECOMPUTE-RESULTS.md (lane 3, libm) | DECIDED there |
| CRPS closed form | 0.23369497725510913 | identical | CONFIRMED |

## 5. Gap audit

- **Not semantically verified:** the remaining ~12,290 entries individually — by design (§3 of the protocol: the generative units are the 9 templates and 30 triples, both now covered; per-entry review audits decoration).
- **Not resolved from this checkout:** whether the ~10.6k non-matrix `real_source_file` citations exist in the full repo (Jules equation-QA lane owns that census).
- **Not run:** the numpy re-run of RECOMPUTE-RESULTS Appendix A (jq/libm used there; decisive comparisons are engine-robust).
- **Not traced:** where the `2.66e-7` literal lives in the wider estate (absent from this repo's provider source; lane 3 §1.2).
- **Deliverable history:** the originating lane (DeepSeek run 2) completed this analysis but could not write files (session permission mode); this file and MATH-QA-PROTOCOL.md were landed by Motif from its log, with every number re-verified or corrected above. RECOMPUTE-QUEUE.jsonl carries the executable follow-ups.
