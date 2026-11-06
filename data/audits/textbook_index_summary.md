# Textbook Index — Summary (2026-11-06, Motif VM / this host only)
**v2 — challenge-pass corrected per adversarial re-audit (T2-D1..D4).**

**Deliverable:** `textbook_index_2026_11_06.json` — **881 verified items** (880 unique locators), JSON validated. No URLs or counts invented: every item is a real file on this host or a link parsed from a live-fetched source file.

## Honest reconciliation vs the 1,116 target
- **No canonical 1,116-item list exists on this host.** Targeted `rg` in `vendor/Sports/docs` + `vendor/Sports/data` for `1116 / 1,116 / textbook / quantecon / probabilistic programming / graph representation learning` found only incidental data values (play IDs, EPA figures) — zero textbook-list hits. `pdf-hunt-2026-11-02/` is empty here.
- Indexed 881 = 450 corpus items + 277 live free-books entries + 154 QuantEcon items (v1 counted 884; the challenge pass removed 2 exact duplicates and merged 1 identical-MD5 double-count). This total is a union of three different collections — **it is not a claim that the original 1,116 were found**, and the numerical remainder (235) is a totals difference, not an item-level reconciliation.
- **To close the remainder:** the Windows-side / originating list behind the 1,116 count (name + path from that host), deduped against this index; plus a direct QuantEcon lecture-site fetch (timed out / empty-reply here — GitHub tree substituted).

## What was indexed
| Source | Count |
|---|---|
| Mega-sweep book PDFs (`research-library/mega-sweep-2026-11-06`, 5 lanes, deduped; MANIFEST claims 197 — matches) | 197 |
| `research-library/pdfs` (207 PDFs on disk, 206 unique after dedupe) | 206 |
| `research-pdfs-2026-10-30/metadata.json` arXiv items | 50 |
| Live: EbookFoundation free-programming-books **subjects** file (Algorithms 46+4, Compilers 16, ML 59, Mathematics 138, TCS 14) | 277 |
| Live: QuantEcon lectures via `QuantEcon/lecture-python.myst` GitHub tree (153 lectures) + 1 series link from quantecon.org homepage | 154 |
| v2 dedupe (2 exact duplicates removed, 1 MD5-identical Gelman merged) | −3 |
| **Total** | **881** |

By domain: Mathematics/Statistics/ML-Theory 527 · QuantEcon 154 · Algorithms 67 · Sports/Medical (corpus) 67 · Systems/Other 33 · Probabilistic Programming 16 · Compilers 16 · Graph Representation Learning 1.
The 5 named task domains subtotal **254**. Sports/Medical + Systems/Other (100 items) are corpus-supplement domains outside the named set, retained per the nothing-gets-killed rule.

## Kernel mapping
QuantEcon → Stage 5 bankroll/Kelly DP kernel · Probabilistic Programming → NUTS/Bayesian calibration kernel · Graph Representation Learning → 288-bit factor-graph encoder · Compilers → Lean/DSL verification toolchain · Algorithms → SGP leg-pruning combinatorics · Math/Stats/ML-Theory → reasoning-engine math core · Systems → Warehouse.asof / live-data plane · Sports/Medical → situational / injury-availability kernel.

## Named-item check
Petersen & Zech, *Mathematical Theory of Deep Learning* — **present** (`books-d-models/PetersenZech-2024-…pdf`). Hamilton, *Graph Representation Learning* — **present**, and after the v2 hand-clean it is the **only** true GRL textbook on this host (v1's other 7 "GRL" items were network science, a calibration paper, and a graph-networks physics paper — reclassified, not deleted). Gelman, *Bayesian Data Analysis* 3ed — present once (two corpus copies are byte-identical, MD5-verified). CMU Sullivan & Mackey mathematics textbook — **NOT FOUND on this host** (0 hits in filename + index search); recorded as a gap.

## Gap audit
Not read: full text of the 450 corpus PDFs (indexed at file level, not content level). Not returned: QuantEcon lecture HTML (host timeouts). Not indexed: free-programming-books *langs* file (fetched for scoping, excluded under the one-list rule) and all FPB sections outside the target domains. Not evaluated: per-item quality/license beyond source-list inclusion. Known locator caveat: the two Parberry algorithm books share the author's license-page URL exactly as the source list gives it (annotated per item in the JSON).
