# RECOMPUTE-QUEUE — status of all 14 rows (Motif, 2026-11-07 ~03:35 CT)

Companion to RECOMPUTE-QUEUE.jsonl. "Closed" means the row's decisive test
was executed and its verdict is on record in the cited file. Audited against
RECOMPUTE-RESULTS.md, MATH-QA-FINDINGS.md (incl. its §5 gap audit), and the
two closure notes; where the findings doc's own gap audit listed an item as
open that has since closed, the closure is cited explicitly.

| # | Row | Status | Where decided |
|---|-----|--------|---------------|
| 1 | ESTATE-SINKHORN-2.66e-7 (locate literal) | **CLOSED** | RECOMPUTE-QUEUE-CLOSE-2026-11-07.md (c3650da): 4 files; live display copy in cockpit component ×6 + /benchmarks page + test; adapter code literal already removed from main |
| 2 | ESTATE-SINKHORN-HEALTH (live residual vs recompute) | **CLOSED** | RECOMPUTE-RESULTS Claim 1 + numpy addendum (382b2771): live 1.387779e-16 matches the shipped-parameter recompute on the libm path; 2⁻⁵³-scale engine artefact; 2.66e-7 not reproducible at (40, 0.15) |
| 3 | ESTATE-CRPS-CONSTANT | **CLOSED** | MATH-QA-FINDINGS §4: 2φ(0) − 1/√π = 0.23369497725510913 vs stored 0.233694977 — the one claimed constant that verifies |
| 4 | ESTATE-BENCHMARKS-COMPOSITE (86.62 / 86.12) | **CLOSED** | RECOMPUTE-RESULTS Claim 3: seven components mean 81.205714; 86.62 needs AIME 97.90, 86.12 needs AIME 94.40 (shipped AIME 60.00); no weighting scheme reproduces either |
| 5 | ESTATE-HEALTH-SLA (field classification) | **CLOSED** | RECOMPUTE-RESULTS Claim 2: only uptime_target 0.999 is an unmeasured literal; ttft/throughput/exacto are computed proxies (n=5 fixtures for exacto) |
| 6 | TEMPLATE-copula_tail (base > 0 on domain) | **CLOSED** | MATH-QA-FINDINGS §2: bases −1.6667 (EQ_00195), −3.6667 (EQ_00951), −5.6667 (EQ_02166); complex/NaN at stated inputs; all 1,367 entries inherit the class |
| 7 | TEMPLATE-rational_pade (codomain in [0,1]) | **CLOSED** | MATH-QA-FINDINGS §2: EQ_00003 = −3.08324, EQ_00008 = −65.53872, EQ_06896 = 1314.57504 at stated inputs |
| 8 | TEMPLATE-linear_logit (centered-probability codomain) | **CLOSED** | MATH-QA-FINDINGS §2: EQ_00349 codomain (−0.284188, +0.284188); EQ_04852 breaches the header's own 0.35 Stage-D cap structurally (codomain (−0.5, 0.5)) |
| 9 | TEMPLATE-conformal_quantile (claimed object) | **CLOSED (by absence)** | FINDINGS §3 protocol-only: no catalog entry actually implements a conformal procedure (F-11/F-15); EQ_00032's precipitation flag is provably inert (identical output 11.607608162111488 for precip 0/1) |
| 10 | CATALOG-HEADER-CLAIMS | **CLOSED** | FINDINGS §1/§4: header asserts zero dead/stubbed + all bindings valid while 1,400 entries sit below their family's min_sample_size_n and every entry self-marks VALIDATED/ACTIVE_WIRED — the assertions are self-asserted, contradicted at entry level |
| 11 | CATALOG-GENERATIVE-STRUCTURE | **CLOSED** | FINDINGS §1, Motif-recounted: cycles conform 12,304/12,304 on all three axes; 30 distinct binding triples |
| 12 | MATRIX-FAMILY-COVERAGE | **CLOSED** | FINDINGS §1: 258 distinct signalFamilyIdx present (range 12–276); 21 absent (0–11, 17, 262–265, 268, 275, 277–278) |
| 13 | NAMED-CLASS-ABSENCE | **CLOSED** | FINDINGS §2/§3: BT-named entry contains no BT object (EQ_06896); Kelly-named entry has no p/b/f* (EQ_00418); GP/DC/conformal classes have no implementation to test |
| 14 | ESTATE-EQUATIONS-COUNT (1666+3742−41) | **CLOSED** | RECOMPUTE-QUEUE-CLOSE-EQCOUNT-2026-11-07.md (8a8e52f): 1,666 real (matrix); 3,742 = research-paper crosswalk records, not equations; 41 = uncomputed constant, sets share 0 IDs |

## What remains genuinely open (not queue rows)
- **Per-entry semantic review of the remaining ~12,290 entries** — by design
  (FINDINGS §5): the generative units (9 templates, 30 triples) are covered;
  per-entry review audits decoration. Not a queue row; listed so nobody
  mistakes "14/14 closed" for "every entry individually verified."
- **Cited-path census:** whether the 2,576 cited source files absent from
  the ds-repo extract exist in the full repo — Jules equation-QA lane owns
  that census (its EQUATION-CENSUS.csv in PR #1260 is the vehicle).
- **Removal, not recompute:** the display strings publishing the refuted
  values (2.66e-7 ×6, 5,367 badge, /benchmarks table) — morning audit
  item #1, AGY's fix on Garrett's morning OK.
