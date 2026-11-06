# ADVERSARIAL RE-AUDIT (interim) — hostile second review
**Date:** 2026-11-06 · **Reviewer:** adversarial re-audit subagent (second reviewer, did not build any target)
**Scope:** three finished artifacts in `out/`, checked against raw sources in `raw/`. No target file was modified.
**Method note:** every count below was recomputed by the reviewer with independent code, not copied from the artifacts or their builder reports.

---

# TARGET 1 — `muse_openai_math_373_families_operator_map_2026_11_06.json`

## DEFECTS

### T1-D1 (HIGH) — Lean join is materially incomplete: 70 of 192 yaml comparator configs appear nowhere in the structured family data; 67 appear nowhere in the file at all
- **Field:** `families[].comparator_configs` (structured join against `formalization.yaml` `status.main_results`).
- **Expected:** all 192 distinct `comparator_config` values from the 208 `main_results` entries are listed under at least one family (the builder's handoff claimed per-family "matched comparator configs with declarations/files").
- **Actual:** only **122 of 192** distinct configs appear in structured `comparator_configs` (63.5%). **70 are missing** from the structured join. Three of the 70 are rescued only as free-text strings inside `anchor_mappings[].lean_evidence` (`CriticalSK.json` via A2, `HodgeConjectureCMAbelianVarieties/main.json`, `SubexponentialSAT.json` via A5). The remaining **67 appear nowhere in the file in any form**. At declaration level the hole is bigger: **73 of 208** (config, declaration) pairs from `main_results` have no structured counterpart in the map.
- **Evidence — the 70 configs missing from structured `comparator_configs`:**
  AbhyankarSathaye, ArtinCAT0, BiholderTransport, BinPackingGap, BinarySweep, Brennan, C0Absorption, CHObstruction, CartierChartCompactnessSupport, ClassicalON, CommutingDerivations, CompactBanach, Conductivity, Cotype, CriticalSK, CriticalZ3, DegreeRigidity, DirichletSevenEighths, DixmierAllDiscrete, FactorGeneration, FinitisticAsymmetry, ForestSpace, FourierLLogL, GaussianMoat, GaussianReplacement, GotsmanLinial, GrahamSpherical, HarmonicGrowth, HeckeSevenEighths, HenonEmden, HodgeConjectureCMAbelianVarieties/main, HyperbolicCones, HyperbolicObstruction, Jacobsthal, KahlerSplitting, Laughlin, LipschitzEquivalence, LogspaceEquality, MatrixFields, MatrixRemoval, Nagata, OddKaplansky, OneWayLiveness, OptimalMaxCut, PinchedKahler, PlanarFalconer, PlanarL1, PlaneColoring, QACParity, QuinticLienard, RieszQuantitative, RyserOddExtensions, Saxl, SingletonLoopMatching, SmoothYau, SteinitzBergstrom, StructuralCrouzeix, SubexponentialSAT, SubpolynomialLp, SubsphereCurrent, Superstring, SurfaceConeCandidateSupport, SymmetricDomains, Tachikawa, ThompsonNonamenability, TwoWayComplementation, TwoWayDeterminization, UniformFourier, UniversalFInfinity, YauCounterexample (all prefixed `ComparatorChallenges/`, suffix `.json`).
- **Evidence — the 67 that appear NOWHERE in the file (basename search over the whole JSON):** the list above minus CriticalSK, HodgeConjectureCMAbelianVarieties/main, SubexponentialSAT.
- **Notable:** `PlanarL1.json` (declaration `OAI.PlanarL1.planar_graph_metrics_embed_L1`) is plainly family 089's second manuscript ("Planar Graph Metrics Embed into L1…") — the anchor family A3 — yet it is absent while `BoundedTreewidthL1.json` is present. The join was partial even inside the five anchor families.

### T1-D2 (HIGH) — 141 comparator configs in the map have NO basis in formalization.yaml, and are presented indistinguishably from verified joins
- **Field:** `families[].comparator_configs`.
- **Expected:** comparator assignments traceable to `formalization.yaml` (a declaration + Lean file), or explicitly marked as unverified guesses.
- **Actual:** the structured field holds **339 entries / 263 distinct configs**. Of those, **141 distinct configs are not in `main_results` at all**, and **173 of 339 entries carry `declaration: null, file: null`** — no yaml evidence whatsoever. These 141 are real files on disk (reviewer verified: all 141 basenames exist in `raw/cc_dir.json`'s 418 top-level `.json` files), so they are filename-keyword guesses against the 419-file challenge directory, mixed into the same field as true yaml joins with no provenance flag.
- **Evidence of cross-contamination (guesses landing on the wrong family):**
  - Family 003 "The quasi-Riemann hypothesis" carries `FreeUniformSpanningForest.json` and `TorsionFreeZeroDivisors.json` (group-ring algebra) alongside its two genuine joins.
  - Family 037 "The ordinary-double-point volume gap" (algebraic geometry) carries `OrdinaryTwoPointCorrelations.json` — family 007's topic.
  - Family 217 (Sherrington–Kirkpatrick fluctuation law, anchor family A2) carries `HoneycombFreeEnergy.json` + `PerceptronFreeEnergy.json`, while the actual SK comparators (`CriticalSK`, `CriticalSKMixing`) are not in its structured configs.
- **Consequence:** any consumer counting "formalized comparators per family" from this field gets inflated, partly wrong numbers.

### T1-D3 (MEDIUM) — Family 378 `comparator_configs` is empty — the flagged suspect is confirmed at the structured level
- **Field:** `families[family_number=378].comparator_configs` = `[]`.
- **Expected:** `[{comparator_config: "ComparatorChallenges/SubexponentialSAT.json", declaration: "OAI.Algorithms.SubexponentialSAT.SqrtLogSpace.exact_count_and_sat", file: "OAI/Algorithms/SubexponentialSAT/SqrtLogSpace/Final.lean"}]` — that exact entry exists in `formalization.yaml` `main_results`; the family is `lean_status: "formalized"`, has a matched yaml source (`yaml_sources_matched` names its own PDF), and is anchor family A5.
- **Actual:** empty list. The config survives only as a free-text string inside anchor A5's `lean_evidence`. Structured consumers see an anchor family with zero comparators — internally contradictory record.

### T1-D4 (MEDIUM) — Family 022's manuscript title is corrupted with result-summary text and raw HTML table debris
- **Field:** `families[family_number=22].manuscripts[0].title`.
- **Expected:** `"The Weak Inhomogeneous Duffin–Schaeffer Conjecture"` (the link text in CONTENTS.md).
- **Actual:** a ~500-character blob beginning `"0,\\infty)`$, divergence of $`\\sum_q\\phi(q)\\psi(q)/q`$ implies …"` and ending `"…</td>\n</tr></tbody>\n<tbody><tr>\n<td>\n\n&emsp;[The Weak Inhomogeneous Duffin–Schaeffer Conjecture"` — the tail of the family's own result summary plus unescaped HTML scaffolding.
- **Scope:** reviewer diffed **all 373** manuscript lists against CONTENTS (title + PDF path, normalized): this is the **only** corrupted manuscript entry in the file. `pdf_path` and `manuscript_count` for family 022 are correct; the title field alone is garbage.

### T1-D5 (MEDIUM) — `lean_status` provenance is unreliable in both directions
- **Field:** `families[].lean_status` — distribution recomputed: `formalized` 227, `not_in_yaml` 146 (sums to 373 ✓).
- **Defect (a):** **6 families are marked `formalized` with no evidence of any kind** — no yaml declaration-bearing config, no `yaml_sources_matched` entry, and no `[Lean]` doc link in their CONTENTS block: **037, 217, 224, 232, 332, 364**. Their status rests solely on the null-declaration guessed configs of T1-D2. Family 217 is anchor family A2.
- **Defect (b):** a further **66 families** are marked `formalized` with no yaml join at all; the only evidence is the `[Lean](lean/docs/NNN.md)` link inside CONTENTS — which the map **never records as a field**, so the status is unverifiable from the artifact itself.
- **Defect (c):** **28 families** whose CONTENTS blocks DO contain a Lean doc link are labeled `not_in_yaml`. The label is literally about the yaml file, but in a field named `lean_status` it will be read as "not formalized" — misleading against the repo's own ~42%-formalized claim and the CONTENTS evidence (245 of 373 families carry a Lean doc link; the map's binary split explains none of this).

### T1-D6 (MEDIUM) — Classification: 2 of 10 randomly sampled families are in indefensible buckets (plus 1 more observed)
- **Method:** `random.seed(20261106)`, sample of 10 family numbers from the 373: **[338, 25, 47, 72, 125, 4, 322, 172, 213, 147]**. Each judged against its CONTENTS result summary as stored in the map.
- **Reclassify:**
  - **047 → Algebraic Geometry & Hodge Theory** (map says Metric & Graph Geometry). Summary: affine fourfold `X ≇ A⁴` with `X × A¹ ≅ A⁵`, Zariski cancellation over ℂ, Dolgachev–Weisfeiler fibration conjecture. Pure algebraic geometry; the map's own scores show a 1–1 tie with Algebraic Geometry lost to "fixed priority order."
  - **322 → Other/Unclassified** (map says Harmonic Analysis & Wave PDEs). Summary: Tingley's sphere-isometry problem for real Banach spaces. Functional analysis / Banach-space geometry — no harmonic analysis, no wave equation, no PDE. (The builder's own bucket description in its report puts Banach-space families in Other.) Assigned on a single keyword hit (score 1).
- **Observed outside the sample (same failure mode):** family **007** (Chowla / corrected Elliott conjecture, Liouville correlation sums — analytic number theory) is classified **Theoretical Computer Science & Combinatorics** on score 1, while its sibling number-theory families sit in Number Theory.
- **Defensible (8/10):** 338 (Kähler uniformization → Alg. Geometry, tie-break acceptable), 025 (Egyptian fractions → Number Theory), 072 (Brennan / conformal integral-means → Harmonic Analysis, borderline but defensible), 125 (metric k-median → TCS), 004 (Hilbert's tenth over ℚ → TCS, decidability framing defensible), 172 (Euclidean Ramsey → Metric & Graph Geometry), 213 (percolation → Stat. Mech. & Probability), 147 (Birkhoff billiards → PDE & Fluid/Dynamical Systems, dynamical-systems half of the bucket).
- **Pattern:** every failure is a score-1 keyword hit or a 1–1 tie broken by bucket priority order — i.e., the classifier's weakest assignments are exactly where it is most confident-looking (no confidence flag is stored beyond the raw scores).

### T1-D7 (LOW) — All 245 formalized-family `result_summary` fields carry raw trailer debris
- **Field:** `families[].result_summary`. 245 summaries end with the unprocessed CONTENTS trailer `" [Lean](lean/docs/NNN.md))"` (including the doubled closing parenthesis). Cosmetic, but it means the summaries were not cleaned, and it is also the only place the Lean evidence for T1-D5(b) exists — stripping it without adding a proper field would destroy evidence.

## CONFIRMED-CLEAN checks (Target 1)
- **Independent recount by a different method** (split CONTENTS.md on `<tbody>` blocks; family header block + following manuscript blocks): **373 families, 721 PDFs** — identical to the map's headline counts.
- **Per-family `manuscript_count`: 373/373 match** the tbody-block PDF counts. Zero mismatches.
- **Family titles: 373/373 exact** (normalized for whitespace/curly quotes/HTML tags) against CONTENTS headers.
- **Manuscript (title, pdf_path) pairs: 372/373 families exact** — sole exception is family 022's title (T1-D4); its PDF path is correct.
- **Sampled deep-diff (12 families: 001, 042, 050, 079, 089, 150, 200, 228, 276, 300, 350, 378):** titles and full manuscript lists match the raw text in all 12 (includes all required anchors 001/079/089/228/276/378).
- **`domain_summary` sums to 373** and matches a recount of `primary_domain` values.
- **Required narrative fields:** `gse_gsi_mapping`, `engine_training_value`, `transfer_beyond_sports` — non-empty for **373/373** families. Zero empties.
- **Meta verified-counts block** (721 / 373 / absent numbers 045, 061, 070, 123, 163 / yaml 176+31 / 208 entries / 192 unique / 419 = 418+1): every figure recomputed by the reviewer and confirmed, including the 419 reconciliation against `cc_dir.json` (418 top-level `.json`).

## VERDICT — Target 1: **HOLDS-WITH-FIXES**
The skeleton is exact — families, titles, manuscripts, counts, domain totals all survive a hostile recount. The Lean layer does not: the structured comparator join is ~64% complete (T1-D1), polluted with 141 unprovenanced guesses (T1-D2), empty on an anchor family (T1-D3), and `lean_status` overclaims for at least 6 families (T1-D5). Fix the join from `formalization.yaml` as the single source of truth, mark or drop disk-guessed configs, repair family 022's title and family 378's configs, and re-run this audit's join check (expected after fix: 192/192 configs, 208/208 pairs).

---

# TARGET 2 — `textbook_index_2026_11_06.json` + `textbook_index_summary.md`

## DEFECTS

### T2-D1 (MEDIUM) — The meta reconciliation contains a false sentence: it claims the indexed total "exceeds 1,116" when it is 884
- **Field:** `meta.honest_gap_vs_1116`: *"…Note: indexed total exceeds 1,116 in raw count because it unions three different collections…"*
- **Expected vs actual:** indexed total is **884**, which does not exceed 1,116 under any count in the file (items = 884; component sum = 884). The sentence is arithmetically false and contradicts the same field's own first sentence ("Located and indexed 884 verifiable items").
- **Related framing risk:** because the 884 is (honestly, elsewhere in the artifact) a union of three *different* collections — not a located subset of the original 1,116 — the arithmetic "884 + 232 = 1,116" is a coincidence of totals, not an item-level reconciliation. The summary states this correctly ("it is not a claim that the original 1,116 were found"); the false "exceeds" sentence undermines that honesty and must be deleted/corrected.

### T2-D2 (MEDIUM) — Duplicate items inflate the "884 verified" count: 881 unique locators, not 884
- **Field:** `items[].locator` — 884 items, **881 unique locators**, 3 duplicated locators:
  1. `https://www.cis.upenn.edu/~jean/math-basics.pdf` — **exact duplicate item**: "Basics of Algebra, Topology, and Differential Calculus" appears twice, identical title + locator + domain.
  2. `https://tutorial.math.lamar.edu` — **exact duplicate item**: "Paul's Online Notes: Algebra, Calculus I-III and Differential Equations" appears twice, identical in every field.
  3. `https://ianparberry.com/books/free/license.html` — **two different books, same wrong locator**: "Lectures Notes on Algorithm Analysis and Computational Complexity (Fourth Edition)" and "Problems on Algorithms (Second Edition)" both point at the author's *license page*, which is not either book. At least one (in fact both, as stored) locator does not identify the titled work — a locator-integrity defect inherited from parsing the source list's note link as the book link.
- **Consequence:** the headline "884 verified items" overstates the deduplicated index by 3, in an artifact whose own summary advertises dedupe ("dedupe that list against this index", "206 unique after dedupe").

### T2-D3 (MEDIUM) — Probable cross-lane double-count of the same book defeats the filename dedupe
- **Items:** `GelmanEtAl-2013-BayesianDataAnalysis-3ed` (`mega-sweep-2026-11-06/books-d-models/…-3ed.pdf`) and `GelmanEtAl-2013-BayesianDataAnalysis3` (`mega-sweep-2026-11-06/books-must-have/…3.pdf`) — same authors, same year, same book (*Bayesian Data Analysis*, 3rd ed.), both classified Probabilistic Programming, counted as 2 items.
- **Evidence:** the searched-sources log states cross-lane dedupe was by **unique filename** (197 after dedupe); differing filenames for the same work pass straight through that dedupe. The Hamilton case was caught because its filename was identical across lanes; this one was not. Reviewer did not hash file contents — flagged as *probable* duplicate for Motif to confirm by file hash/size.

### T2-D4 (MEDIUM) — 100 items (11.3%) sit in domains outside the task's domain set; the Graph Representation Learning bucket is mostly not GRL
- **Domain set per the task:** Algorithms, Probabilistic Programming, Graph Representation Learning, Compilers, QuantEcon (the build brief additionally sanctioned Mathematics/Statistics/ML-Theory). **Actual extra domains:** `Sports/Medical (corpus)` **67 items** and `Systems/Other` **33 items** — 100 items in buckets the task never named. (Reviewer note: these corpus items may be legitimately useful, but they are scope the index added silently; the summary presents the 8-bucket split without flagging that 2 buckets are out-of-task.)
- **GRL bucket pollution:** of the **8** items in `Graph Representation Learning`, only **1** (Hamilton, *Graph Representation Learning*) is actually GRL. The rest are network science (Barabási *Network Science*, Albert–Barabási 2002, Milo network motifs ×2, Alon network motifs), a Go-as-complex-network paper, "Learning to Simulate Complex Physics with Graph Networks" (a physics simulator paper), and Guo-2017 *On Calibration of Modern Neural Networks* — a calibration paper with no graph content at all. Filename-keyword classification ("Network"/"Graph") produced the bucket; it does not survive reading the titles.

## CONFIRMED-CLEAN checks (Target 2)
- **JSON loads**; `items` = **884** = `meta.indexed_total_verified` = summary headline. ✓
- **Component arithmetic is exact:** 197 (mega-sweep) + 206 (research-library) + 50 (arXiv metadata) + 277 (FPB subjects) + 154 (QuantEcon = 153 tree + 1 homepage) = **884**. FPB section counts sum to 277 (46+4+16+59+138+14). Mega-sweep lane counts in items sum to 197 (56+39+35+34+33). ✓
- **Summary ↔ JSON consistency:** every figure in `textbook_index_summary.md` was diffed against the JSON — source table (197/206/50/277/154/884), domain split (522/154/67/67/33/17/16/8), and both named-item checks all match. Petersen & Zech present ✓; Hamilton present exactly once (the claimed two-copy dedupe is real) ✓; Sullivan & Mackey recorded as NOT FOUND, not smoothed ✓.
- **Local paths: ALL 403 exist on disk** (reviewer stat-checked every local locator, not just a sample; the required ≥15 sample is therefore exceeded — a seeded sample of 20/20 also exists). Zero missing files.
- **URLs: 481 URL locators, 0 malformed** (scheme + netloc + no-space check on every one; per task instructions, well-formedness only — no live fetching).
- **No empty fields:** `title`, `locator`, `target_kernel` non-empty for **884/884** items.
- **QuantEcon locators** are concrete GitHub blob URLs per lecture (not a single series placeholder), consistent with the stated GitHub-tree substitution.

## VERDICT — Target 2: **HOLDS-WITH-FIXES**
The arithmetic, the summary, and the on-disk evidence are unusually solid — 403/403 files real, counts reconcile to the unit. The fixes are small but real: delete the false "exceeds 1,116" sentence (T2-D1), drop the 2 exact duplicates and repair the Parberry locators (T2-D2; corrected total 881–882 depending on the Parberry fix), hash-check the Gelman pair (T2-D3), and either re-scope the 100 out-of-set items or re-bucket them explicitly as corpus extras, with the GRL bucket hand-cleaned (T2-D4).

---

# TARGET 3 — `openai_10repo_architect_review_2026_11_06.md`

## DEFECTS
**None found.** The reviewer recomputed every checkable number in the receipt from `raw/openai-repos/*.json` and `*_contents.json` and found zero mismatched cells. (The receipt's own stated caveats — `math` issues-disabled, `gym` archived-with-recent-push, NOASSERTION licenses unread, gym successor not API-verified — were themselves verified as accurate characterizations of the raw payloads, not used as hiding places: each caveat's underlying fields check out.)

## CONFIRMED-CLEAN checks (Target 3)
- **Summary table, cell-by-cell (all 10 rows × stars / forks / open_issues / archived / pushed date / language / license): 40/40 numeric cells + 10/10 archived flags + 10/10 pushed dates + 10/10 language/license pairs match the raw JSON exactly:**
  math 17,384/1,966/0, F, 2026-10-30, Lean/Apache-2.0 · evals 19,711/3,126/350, F, 2026-04-14, Python/NOASSERTION · openai-cookbook 76,984/13,044/353, F, 2026-11-06, Jupyter/MIT · gym 37,232/8,665/128, **T**, 2026-03-26, Python/NOASSERTION · CLIP 34,575/4,063/273, F, 2026-03-25, Jupyter/MIT · gpt-2 25,014/5,957/197, **T**, 2024-08-14, Python/NOASSERTION · swarm 22,111/2,350/38, F, 2026-04-15, Python/MIT · gpt-oss 20,512/2,195/171, F, 2026-10-29, Python/Apache-2.0 · chatgpt-retrieval-plugin 21,280/3,573/277, **T**, 2024-07-04, Python/MIT · tiktoken 19,614/1,669/154, F, 2026-08-17, Python/MIT.
- **Totals: recomputed 294,417 stars / 46,608 forks / 1,941 open issues — exactly the claimed totals.** Combined size claim 1,980,543 KB also recomputes exactly. Archived count 3/10 ✓.
- **Synthesis arithmetic:** archived repos' combined stars claimed 83,526 — recomputed 37,232 + 25,014 + 21,280 = **83,526** ✓. Claim that they hold the 2nd-, 4th- and 6th-highest star counts: verified against the sorted order (cookbook 1st, gym 2nd, CLIP 3rd, gpt-2 4th, swarm 5th, retrieval-plugin 6th) ✓.
- **Per-repo section metadata lines (§2.1–§2.10):** every description string (verbatim, incl. swarm's full "…Managed by OpenAI Solution team." and retrieval-plugin's topics `chatgpt, chatgpt-plugins`), created/pushed timestamps, default branches (gym/gpt-2 `master`, rest `main`), sizes, and homepages (gym, gpt-2, gpt-oss, cookbook) match the raw payloads.
- **Superlatives all check out:** cookbook highest stars/forks/issues and largest size (999,714 KB); tiktoken lowest forks (1,669) and smallest size (139 KB); swarm second-smallest (537 KB) and lowest issues among issues-enabled repos (38); gpt-2 stalest push; gym oldest creation; math newest creation and second-largest size; gpt-oss second-freshest push.
- **Contents listings:** stated counts and entries match `*_contents.json` for every repo where the receipt states them (math 10, evals 16, gym 15, CLIP 14, gpt-2 13, swarm 12, gpt-oss 17, retrieval-plugin 21, tiktoken 15); cookbook's `registry.yaml` + `authors.yaml` — load-bearing for its ADAPT lesson — both exist in its 12-entry listing ✓.
- **License tally** in the receipt's closing section (MIT ×5, Apache-2.0 ×2, NOASSERTION ×3) matches the raw SPDX fields ✓.
- **The two flagged metadata oddities are real, not invented:** `math.json` does carry `has_issues=false` with `open_issues_count=0`; `gym.json` does carry `archived=true` alongside `pushed_at=2026-03-26T23:13:27Z`.

## VERDICT — Target 3: **HOLDS**
Every number the receipt prints was reproduced from the raw API payloads with zero discrepancies — table, totals, sections, superlatives, contents, licenses. The architectural judgments (ADOPT/ADAPT/LEARN-ONLY) are opinion and were not re-litigated; the factual substrate they rest on is exact. No fixes required. (Standing caveat, already in the receipt and confirmed accurate: the three NOASSERTION license texts remain unread, so code reuse from evals/gym/gpt-2 stays pattern-only until read.)

---

# OVERALL
| Target | Verdict | Defects |
|---|---|---|
| 1 — 373-family operator map | **HOLDS-WITH-FIXES** | 7 (2 HIGH, 4 MEDIUM, 1 LOW) — Lean join incomplete + polluted; family 022 title corrupted; family 378 structured configs empty; lean_status overclaims; 2–3 misclassifications |
| 2 — Textbook index (884) | **HOLDS-WITH-FIXES** | 4 (all MEDIUM) — false "exceeds 1,116" sentence; 3 duplicate locators (881 unique); probable Gelman double-count; 100 out-of-scope-domain items + polluted GRL bucket |
| 3 — 10-repo architect review | **HOLDS** | 0 — every recomputed cell matches raw |

**Fix order for Motif:** (1) rebuild Target 1's comparator join from `formalization.yaml` alone (192/192 configs, 208/208 declaration pairs; disk-file guesses either dropped or moved to a clearly-labeled unverified field), repair families 022 + 378, and re-derive `lean_status` with its evidence recorded per family; (2) Target 2 text + dedupe fixes (one sentence, 2–3 items, one hash check, GRL bucket hand-clean); (3) Target 3 ships as-is.
