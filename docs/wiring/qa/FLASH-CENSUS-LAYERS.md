# LAYER-STACK CENSUS — intelligence/reasoning/ (Motif-executed)

**Lane note:** Assigned to the motif-vm AGY Flash instance (Task B). That run was interrupted at 03:36 CT by Motif's own kill command aimed at a hung DeepSeek process — Motif's error. The Flash log contains only "error: interrupted"; no deliverable was written by the lane. Motif executed the census directly with the task's method. Authorship: Motif, not Flash.

**Counted at:** qa-repo HEAD **c0c721cc8** (main-side, stale, pre-AGY-branch), full commit tree via git ls-tree / git grep (sparse-checkout gaps do not apply to these reads).

## 1–2. What exists

- `intelligence/reasoning/` contains **33 files** — a real, substantive Python package: an L1–L5 reasoning engine per reasoning-depth-spec.md (README: "the L1–L5 reasoning engine"). Modules include engine.py (11,199 B, analyze pipeline), levels.py (L1–L5 definitions), adversary.py (22,146 B, L4 adversarial), analyst.py (71,315 B, corpus→thesis→card), bayes.py (L4 market-prior update), checklist.py (five mandatory tracks), critique.py, equation_gate.py (21,271 B — "Executable 12,304-Equation Catalog Gate & 4-Stage Cognitive Router"), orchestrator.py, signals.py (25,573 B, typed ingestion records), schemas.py (15,142 B, trace data structures), trace.py, specialists.py, precedents.py, market_priors.py, slate_registry.py, escalation.py, exceptions.py, enums.py, interfaces.py, plus primitives/ (positions.py 28,566 B, scheme.py 19,110 B, and three measured JSON primitives), two recovered-equation files (engine_plan_recovered_equations.py 60,454 B; mind_eq_recovered_functions.py), a module registry, and a mega-sweep wiring engine (27,904 B).
- **No `layers/` directory exists** — not under intelligence/reasoning/, not under intelligence/, not under packages/prediction-engine/src/, not anywhere in the tree (full-tree name search for a `layers/` path segment returned zero hits). The 27-layer stack from the master order exists as CONCEPTS inside these modules (levels L1–L5, five mandatory tracks, primitives), not as a layers/ directory of per-layer modules.
- `packages/prediction-engine/src/` exists and is a large flat directory of per-paper TypeScript modules (arXiv-id-named .ts + .test.ts pairs); it contains no layers/ subdirectory.

## 3. Context packets

Tree-wide content search for `context_packet` / `context_packets` returns exactly **3 files**: brain/feeds/2026-10-22/grok_export_index.jsonl (a data feed), docs/predictions/research/2026-10-13/XXX_GROK_MASTER_CONTEXT_AND_MISSION_2026-07-20.md (a doc), and docs/wiring/AGY-OVERNIGHT-TOTAL-WIRING-MASTER-2026-11-06.md (the master order itself). **No code builds a context packet.** There is no context_packets/ directory and no packet-builder function anywhere in the tree. The Wave-7 context-packet builder is unbuilt at this commit.

## 4. Schemas

- Under intelligence/: exactly one schema module — `intelligence/reasoning/schemas.py` (the reasoning-trace structures).
- A top-level `schemas/` directory exists but holds only `schemas/fable/*.schema.json` (14 files: calibration-report-entry, claim-evidence-entry, drift-report-entry, etc.) plus two handoff/research schema files — none of them layer or packet schemas.
- packages/ schema-named files are per-paper feed-schema modules in packages/data-ingestion/src/.

## 5. Consumers (files outside the module itself referencing it, commit-tree grep)

| Module | Referencing files |
|---|---|
| engine | 43 |
| adversary | 14 |
| checklist | 9 |
| signals | 8 |
| levels | 7 |
| trace | 7 |
| analyst | 6 |
| bayes | 5 |
| equation_gate | 5 |
| specialists | 5 |
| critique | 4 |
| market_priors | 4 |
| precedents | 3 |
| orchestrator | 2 |
| slate_registry | 2 |

(Earlier broader-pattern counts — engine 71, schemas 33 — include same-package and doc references; the table above is the stricter cross-reference count. Either way: the reasoning package is referenced widely, unlike the equation catalog, whose own QA census found Wired 0 / Tested 0.)

## 6. Closing table

| Layer area | Files found | Files with any consumer | Verdict |
|---|---|---|---|
| intelligence/reasoning/ package | 33 | yes — every sampled module has external referencers | Real engine package, internally wired at this commit |
| layers/ directory (anywhere) | 0 | n/a | Does not exist; the 27-layer structure is not a directory of modules |
| Context-packet builder | 0 code files | 0 | Unbuilt — mentions only, in 2 docs + 1 data feed |
| Layer/packet schemas | 0 (reasoning schemas.py only) | n/a | No schema contracts for layers or packets exist |

**Bottom line for the wiring question:** the L1–L5 reasoning engine is real code with real cross-references. The master order's Wave-7 deliverables — a layers/ module tree, schema contracts, and a context-packet builder — do not exist at this commit. That is the precise gap between "engine exists" and "layer stack wired."
