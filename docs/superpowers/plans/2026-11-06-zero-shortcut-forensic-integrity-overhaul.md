# Zero-Shortcut 13-Month Forensic Integrity Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (single-threaded main-thread execution per founder constraint: zero subagent sprawl) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every synthetic template, `os.walk` file-count shortcut, `< 400` extraction cap, and hardcoded 64-file git recovery list with exhaustive, spot-check-proof restoration and live reasoning-engine execution across all `11,559` git commits (`1,119` non-PR refs + `913` PR refs, including all `308` branch-only code modules), all `2,712` PDFs + `148` DOCXs across all 6 directories/drives (`SRP_Cache` [`877`], `Downloads` [`206` PDFs + `48` DOCXs + `8` ZIPs], `GDrive_Vault` [`1,185` PDFs], `GDrive_GSN` [`345` PDFs + `15` DOCXs], `Repo` [`99` PDFs + `80` DOCXs], `OneDrive` [`1,014` files]), and all `12,304` real corpus equations + `415` `intelligence/*.py` + `1,234` `packages/prediction-engine/src/*.ts` modules.

**Architecture:** Five self-contained, deterministic build-and-wire tasks executed sequentially in the main thread. First, an exhaustive Git Tree & Commit Diff Restorer compares `git ls-tree -r` across all `2,032` refs against `HEAD`, restores all `308` branch-only `.py`/`.ts` modules (63 in `intelligence/*`, 212 in `packages/prediction-engine/src/*`, 33 in `scripts/ops/*`), and wires them into the Python and TypeScript execution registries. Second, an uncapped Page-by-Page PyMuPDF & python-docx Extractor parses every page of all `2,712` PDFs and `148` DOCXs across all 6 directories/drives without any `len < 400` cap or `os.walk` count-only shortcut. Third, a Real Corpus Equation Compiler replaces the synthetic `tanh` templates in `data/equations/equation_executable_catalog_12304.json` with real equations, LaTeX expressions, and executable AST evaluators extracted from `thousand_equation_matrix_2026.json` (`1,666`), `Deep Research Equation Extraction (2)/(3).docx` (`5,575` paragraphs), `hf-ultrascale-50-equations.json` (`252`), `engine_plan_recovered_equations.py` (`199` functions), `gse_213_equation_engine.py` (`213`), `docs/arxiv-program/` (`1,579` dossiers), and `brain/feeds/*.jsonl`. Fourth, a Full-Repo Call-Graph Bridge & Spot-Check Auditor wires all `415+` `intelligence/*.py` and `1,234+` `packages/prediction-engine/src/*.ts` modules into `gse_connected_game_workflow.py` and `apps/web/lib/intelligence-core/engine.ts` and verifies via independent random/adversarial spot-check tests that any queried commit, PDF page, book, or equation ID traces directly to its real source and mutates the live Stage 2–4 reasoning engine.

**Tech Stack:** Python 3.13 (`pymupdf`/`fitz`, `python-docx`, `ast`, `pytest`, `numpy`, `scipy`), TypeScript 5.x (`vitest`, `tsx`), Git CLI (`git ls-tree`, `git log`, `git show`).

**Spec:** `docs/engine/research/2026-11-06/GSE-GSI-FULL-DRIVE-AND-MONOREPO-MANIFEST-2026-11-05.md` and `AGENTS.md` (Standing Doctrines: Wire-First Sequencing, Mind-First, Ingest-and-Learn, Full-Game Snap-by-Snap JEV + 5-Stage Engine Gate, 360-Degree Full-Board Market Review, Official `47-19-1` Record Lock).

## Global Constraints

- **No Subagent Sprawl (`HARD`):** Execute all code implementation, extraction, wiring, and test verification deterministically in the single main thread.
- **Zero Synthetic Equation Templates (`HARD`):** `data/equations/equation_executable_catalog_12304.json` must never populate `formula_expression` with procedurally generated `tanh(w_primary * p0 + ...)` hash templates when a real equation exists in `thousand_equation_matrix_2026.json`, `Deep Research Equation Extraction (2)/(3).docx`, `hf-ultrascale-50-equations.json`, `engine_plan_recovered_equations.py`, `gse_213_equation_engine.py`, `docs/arxiv-program/`, or the parsed PDF/DOCX corpus. Every equation entry must carry `real_source_file`, `real_source_locator` (exact commit/line/page/JSON id), `latex_or_code_formula`, and an executable evaluator.
- **Zero `os.walk` Count-Only Shortcuts & Zero `< 400` Extraction Caps (`HARD`):** `scripts/ops/audit_and_extract_all_pdfs_and_books_zero_skip.py` must remove all `if len(extracted_theorems) < 400: break` and `< 700` caps, and must open and extract page-level text, equations, and theorems from `G:\My Drive\GSE-Ultra-30TB-Vault` (`1,185` PDFs), `G:\My Drive\GSN` (`345` PDFs + `15` DOCXs), `C:\c\wt-week8-forensic` (`99` repo PDFs + `80` repo DOCXs), `C:\Users\Garrett\Downloads` (`206` PDFs + `48` DOCXs + `8` ZIPs), `C:\Users\Garrett\.cache\sports-research-papers` (`877` PDFs), and `C:\Users\Garrett\OneDrive\Documents\Galaxy Sports Edge` (`1,014` files).
- **Zero `"etc."`, Zero Stubs, Zero Gaussian Shortcuts (`rng.normal`), Zero LLM-Memory Tables (`HARD`):** All reports and tables must be generated programmatically from verified JSON on disk.
- **Single-Writer Mind Rule (`HARD`):** Never write directly to `brain/mind.jsonl`. Stage all trainer-ready JSONL records to `data/mind_staging/` and consolidate into `brain/feeds/unified_mind_staging_waves1_to_12_2026_11_06.jsonl`.
- **Official Record Lock (`HARD`):** Only cite and track the Official New Engine Verified Record **`47-19-1` (`72.9%` · `+26.50u`)** in `data/engine/new_engine_official_ledger_2026.json`.
- **Strict PII & Legal Boundary (`HARD`):** Never ingest the 5 local personal PII files (`ssn passport.pdf`, `statement 10_26_26 (449k, pdf).pdf`, `gbaxleyid.jpeg`, `gbpassport.jpeg`, `galaxysportsedge-f506d7991177.json`) or internal medical/HSA/legal folders inside `EYI Package_*.zip`, and never access third-party competitor customer lists.

## Review Focus

1. **Random Spot-Check on `EQ_00001..EQ_12304` Reveals Synthetic `tanh(...)` String Instead of Real Corpus Formula:** If a reviewer inspects `EQ_00501` or `EQ_01666` in `data/equations/equation_executable_catalog_12304.json`, every entry must trace to a real source file (`thousand_equation_matrix_2026.json`, `Deep Research Equation Extraction (2)/(3).docx`, `hf-ultrascale-50-equations.json`, `engine_plan_recovered_equations.py`, `docs/arxiv-program/*`, or extracted PDF/DOCX theorem) with its authentic `latex_or_code_formula` and `real_source_file`, never a generic `tanh(w1*x1 + w2*x2)` filler. Pinned by `test_spot_check_arbitrary_equations_trace_to_real_sources` in Task 3.
2. **Spot-Check on Side-Branch Code Modules (`origin/motif/*`, `hermes/*`, `claude/*`, `grok/*`, `docs/surf-21-round`) Finds Missing Files on `HEAD`:** Earlier git archeology hardcoded 64 items and missed `308` branch-only `.py`/`.ts` files across `1,119` non-PR refs (e.g., `intelligence/adjustment-layer/apply_seam.py`, `intelligence/situational-graph/graph.py`, `intelligence/optimizer/gpp_game_stack_optimizer.py`, `packages/prediction-engine/src/edge-lab/kernel/slots/dirichlet-multinomial.ts`). Pinned by `test_all_308_branch_code_modules_restored_and_indexed` in Task 1.
3. **Spot-Check on `G:\My Drive\GSE-Ultra-30TB-Vault` (`1,185` PDFs), `G:\My Drive\GSN` (`345` PDFs), or `Downloads` (`204` Non-PII PDFs) Finds Page Count Only (`os.walk`) Without Extracted Text/Theorems:** Earlier `audit_and_extract_all_pdfs_and_books_zero_skip.py` only counted filenames in `G:\My Drive` and `OneDrive` and stopped theorem extraction at `400`. Pinned by `test_every_pdf_and_docx_across_all_6_roots_extracted_uncapped` in Task 2.
4. **Spot-Check on `intelligence/*.py` (`415+` Files) or `packages/prediction-engine/src/*.ts` (`1,234+` Files) Finds Unreferenced Orphan Files on Disk:** Modules sitting on disk that are neither imported nor registered in the execution spine fail a spot-check of "is everything in the reasoning engine?". Pinned by `test_zero_unregistered_python_or_typescript_engine_modules` in Task 4.
5. **Silent Exception Swallowing (`except Exception: pass`) During PDF/ZIP/Equation Evaluation:** A broken equation evaluator or unreadable page returning `0.0` silently under `except Exception: pass` hides corruption. Every evaluator must record explicit status and raise on corrupt bindings during tests. Pinned by `test_corrupt_equation_binding_raises_explicit_error` in Task 3.

---

## File Structure

- **Modify:** `scripts/ops/audit_all_git_commits_and_branches.py` — Replace the hardcoded 64-entry list with an automated `git ls-tree -r` diff across all `2,032` refs (`1,119` branch refs + `913` PR refs) against `HEAD`, restoring all `308` missing `.py`/`.ts` code modules in `intelligence/*`, `packages/prediction-engine/src/*`, `engine/*`, and `scripts/ops/*` (safely namespacing any legacy schema conflicts under `intelligence/recovered_branches/` or their exact branch path when non-conflicting) and writing the complete commit-to-file ledger to `data/engine/git_commit_archeology_reconciliation_2026_11_06.json`.
- **Create:** `intelligence/reasoning/full_branch_and_repo_module_registry.py` — Deterministic Python registry and execution dispatcher that imports/invokes the restored `intelligence/*` modules (`adjustment-layer`, `situational-graph`, `optimizer`, `props`, `research`, `vision`, `gates`, `calibration`, `engine_plan_recovered_equations.py` [`199` functions], `gse_213_equation_engine.py`, `nfl_re/equations.py`) and audits all `415+` `intelligence/*.py` files so zero modules on disk are unindexed or dead.
- **Modify:** `packages/prediction-engine/src/nfl/zero-orphan-expected-metrics-bridge.ts` — Register and wire the restored `packages/prediction-engine/src/*` branch modules (`edge-lab/kernel/slots/*`, `calibration/*`, `conformal/*`, `closing-line-forecaster.ts`, `clv-same-book.ts`, `continuity-deltas.ts`, `edge-lab/incentive-calendar.ts`, `evaluation/2609-19354-rank-first-gate.ts`) into `runAllRestoredWorkstream1Signals(ctx)`.
- **Modify:** `scripts/ops/audit_and_extract_all_pdfs_and_books_zero_skip.py` — Remove the `< 400` and `< 700` theorem caps and replace the `os.walk` count-only check on `G:\My Drive`, `OneDrive`, `Repo`, and `Downloads` with full PyMuPDF (`fitz`) and `python-docx` extraction across all `2,712` PDFs and `148` DOCXs, writing per-bucket parsed indexes to `data/corpus_parsed_full/` and uncapped theorem/equation JSONL records to `data/corpus_parsed_full/extracted_theorems_lemmas_algorithms_2026_11_06.jsonl`.
- **Create:** `scripts/ops/build_real_12304_equation_catalog.py` — Deterministic compiler that builds `data/equations/equation_executable_catalog_12304.json` and `data/engine/master_equation_registry_12k.json` exclusively from real, verifiable sources on disk (`data/engine/thousand_equation_matrix_2026.json` [`1,666` equations], `docs/predictions/research/2026-10-13/Deep Research Equation Extraction (2).docx` & `(3).docx`, `docs/engine/research/2026-10-28/hf-ultrascale-50-equations.json` [`252`], `intelligence/reasoning/engine_plan_recovered_equations.py` [`199` functions], `intelligence/models/gse_213_equation_engine.py` [`213`], `docs/arxiv-program/` [`1,579` paper dossiers], `brain/feeds/*.jsonl`, and `data/corpus_parsed_full/extracted_theorems_lemmas_algorithms_2026_11_06.jsonl`), recording `real_source_file`, `real_source_locator`, `latex_or_code_formula`, and distinct operator types (`linear_logit`, `bilinear_interaction`, `rational_pade`, `exponential_survival`, `bellman_advantage`, `copula_tail`, `conformal_quantile`, `sheaf_laplacian`, `ejec_python_fn`) instead of synthetic `tanh` strings.
- **Modify:** `intelligence/reasoning/equation_gate.py` — Update `audit_12304_equation_catalog_integrity()` and `evaluate_12304_equations_cognitive_router(game_ctx)` to verify `real_source_file` exists on disk for every equation, dispatch across all real operator types and the `199` `engine_plan_recovered_equations.py` + `213` `gse_213_equation_engine.py` functions, and raise `ValueError` on corrupt/missing parameter bindings.
- **Modify:** `tests/test_week9_forensic_autopsy_fixes.py` — Add `test_27_exhaustive_308_branch_modules_and_415_intelligence_modules_audit`, `test_28_uncapped_2712_pdfs_148_docxs_across_all_6_roots_spot_check`, and `test_29_adversarial_spot_check_12304_real_equations_zero_synthetic_tanh`.

---

### Task 1: Exhaustive Git Tree & Branch Diff Restoration Across All 2,032 Refs (All 308 Missing Code Modules)

**Files:**
- Modify: `scripts/ops/audit_all_git_commits_and_branches.py`
- Create: `intelligence/reasoning/full_branch_and_repo_module_registry.py`
- Modify: `tests/test_week9_forensic_autopsy_fixes.py`

**Interfaces:**
- Produces in `scripts/ops/audit_all_git_commits_and_branches.py`:
  - `discover_all_missing_branch_code_files() -> list[dict[str, str]]` scanning all `1,119` non-PR refs and `913` PR refs via `git ls-tree -r --name-only <ref>` vs `HEAD` for `.py` and `.ts` files in `intelligence/`, `packages/prediction-engine/src/`, `engine/`, and `scripts/ops/`.
  - `run_git_archeology_and_reconciliation() -> dict[str, Any]` restoring all `308+` branch-only code files onto disk and writing `data/engine/git_commit_archeology_reconciliation_2026_11_06.json` with `restored_branch_code_files_count >= 308`.
- Produces in `intelligence/reasoning/full_branch_and_repo_module_registry.py`:
  - `audit_all_intelligence_and_recovered_modules() -> dict[str, Any]` returning `{"total_intelligence_py_files": int, "total_engine_py_files": int, "unindexed_or_orphan_files": list[str], "named_equations_executed": int, "composite_branch_signal_delta": float}`.
  - `evaluate_recovered_branch_and_repo_python_modules(game_ctx: dict[str, Any]) -> dict[str, Any]` executing the `199` functions in `intelligence/reasoning/engine_plan_recovered_equations.py`, the `213` equations in `intelligence/models/gse_213_equation_engine.py`, and the restored `intelligence/adjustment-layer`, `intelligence/situational-graph`, `intelligence/optimizer`, and `intelligence/research` modules.

- [ ] **Step 1: Write the failing test in `tests/test_week9_forensic_autopsy_fixes.py`**

```python
def test_27_exhaustive_308_branch_modules_and_415_intelligence_modules_audit() -> None:
    """
    Pins Review Focus #2 and #4: Verifies all 308+ branch-only code files across
    all git refs are restored to disk, all 199 functions in engine_plan_recovered_equations.py
    are executed live, and 0 Python files in intelligence/ are unindexed orphans.
    """
    from intelligence.reasoning.full_branch_and_repo_module_registry import (
        audit_all_intelligence_and_recovered_modules,
        evaluate_recovered_branch_and_repo_python_modules,
    )

    recon_path = REPO_ROOT / "data" / "engine" / "git_commit_archeology_reconciliation_2026_11_06.json"
    recon = json.loads(recon_path.read_text(encoding="utf-8"))
    assert recon["total_repo_commits_scanned"] >= 11559
    assert recon["reconciled_commits_and_modules_count"] >= 340
    assert (REPO_ROOT / "intelligence" / "adjustment-layer" / "apply_seam.py").is_file()
    assert (REPO_ROOT / "intelligence" / "situational-graph" / "graph.py").is_file()
    assert (REPO_ROOT / "intelligence" / "optimizer" / "gpp_game_stack_optimizer.py").is_file()
    assert (REPO_ROOT / "packages" / "prediction-engine" / "src" / "edge-lab" / "kernel" / "slots" / "dirichlet-multinomial.ts").is_file()

    audit = audit_all_intelligence_and_recovered_modules()
    assert audit["total_intelligence_py_files"] >= 450
    assert audit["unindexed_or_orphan_files"] == []
    assert audit["named_equations_executed"] >= 199

    ev_a = evaluate_recovered_branch_and_repo_python_modules(
        {"away": "CIN", "home": "ATL", "off_epa": 0.12, "def_epa": -0.05, "spread_home": 3.0, "total_line": 48.5}
    )
    ev_b = evaluate_recovered_branch_and_repo_python_modules(
        {"away": "TB", "home": "CHI", "off_epa": -0.09, "def_epa": 0.07, "spread_home": -6.0, "total_line": 41.0}
    )
    assert ev_a["engine_plan_199_functions_evaluated"] >= 199
    assert ev_a["composite_branch_signal_delta"] != 0.0
    assert ev_a["composite_branch_signal_delta"] != ev_b["composite_branch_signal_delta"]
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_week9_forensic_autopsy_fixes.py::test_27_exhaustive_308_branch_modules_and_415_intelligence_modules_audit -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'intelligence.reasoning.full_branch_and_repo_module_registry'`

- [ ] **Step 3: Implement `discover_all_missing_branch_code_files` in `scripts/ops/audit_all_git_commits_and_branches.py` and create `intelligence/reasoning/full_branch_and_repo_module_registry.py`**

In `scripts/ops/audit_all_git_commits_and_branches.py`, scan all refs via `git ls-tree -r --name-only <ref>` and materialize every `.py` and `.ts` file under `intelligence/`, `packages/prediction-engine/src/`, `engine/`, and `scripts/ops/` that is not present in `HEAD` (sanitizing any literal `etc.` and recording exact `recovered_commit_sha`, `source_branch`, `restored_repo_path`, and `file_sha256`). In `intelligence/reasoning/full_branch_and_repo_module_registry.py`, dynamically inspect all `199` functions in `intelligence/reasoning/engine_plan_recovered_equations.py`, all functions in `intelligence/reasoning/mind_eq_recovered_functions.py`, `intelligence/models/gse_213_equation_engine.py`, `intelligence/nfl_re/equations.py`, and index all `.py` files under `intelligence/` and `engine/`, wiring `evaluate_recovered_branch_and_repo_python_modules(game_ctx)` into `compile_stage1_to_stage2_simulation_priors` in `scripts/ops/gse_connected_game_workflow.py`.

- [ ] **Step 4: Run `audit_all_git_commits_and_branches.py` and run test to verify it passes**

Run: `python scripts/ops/audit_all_git_commits_and_branches.py && python -m pytest tests/test_week9_forensic_autopsy_fixes.py::test_27_exhaustive_308_branch_modules_and_415_intelligence_modules_audit -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/ops/audit_all_git_commits_and_branches.py intelligence/ packages/prediction-engine/src/ scripts/ops/gse_connected_game_workflow.py data/engine/git_commit_archeology_reconciliation_2026_11_06.json tests/test_week9_forensic_autopsy_fixes.py
git commit -m "feat(ws1): restore all 308 missing branch modules across 2032 refs and wire 199 engine-plan functions live"
```

---

### Task 2: Uncapped Page-by-Page Extraction Across All 2,712 PDFs & 148 DOCXs (All 6 Roots)

**Files:**
- Modify: `scripts/ops/audit_and_extract_all_pdfs_and_books_zero_skip.py`
- Modify: `tests/test_week9_forensic_autopsy_fixes.py`

**Interfaces:**
- Produces in `scripts/ops/audit_and_extract_all_pdfs_and_books_zero_skip.py`:
  - `extract_all_pdfs_and_docxs_in_root(root_dir: Path, bucket_name: str) -> dict[str, Any]` using `pymupdf` (`fitz`) and `python-docx` to open every non-PII `.pdf` and `.docx` across:
    1. `SRP_Cache` (`C:\Users\Garrett\.cache\sports-research-papers`: `877` PDFs, `5` DOCXs)
    2. `Downloads` (`C:\Users\Garrett\Downloads`: `204` non-PII PDFs + `1,098` Murphy ZIP PDF pages + `16` EYI ZIP PDFs, `48` DOCXs + `26` EYI ZIP DOCXs)
    3. `GDrive_Vault` (`G:\My Drive\GSE-Ultra-30TB-Vault`: `1,185` PDFs including the `17` textbooks in `downloads-archive-2026-11-03`, `1,117` in `research-corpus-2026-11-03\pdfs`, and `52` in `deep-corpus-2026-11-04\pdfs`)
    4. `GDrive_GSN` (`G:\My Drive\GSN`: `345` PDFs, `15` DOCXs, `702` Markdown specs)
    5. `Repo` (`C:\c\wt-week8-forensic`: `99` PDFs, `80` DOCXs including `Deep Research Equation Extraction (2).docx` and `(3).docx`, `1,791` `docs/arxiv-program/` files)
    6. `OneDrive` (`C:\Users\Garrett\OneDrive\Documents\Galaxy Sports Edge`: `1,014` files)
  - Removes all `if len(extracted_theorems) < 400: break` and `< 700` caps so 100% of matched theorems, lemmas, propositions, corollaries, algorithms, and equations across all `2,712` PDFs and `148` DOCXs are written to `data/corpus_parsed_full/extracted_theorems_lemmas_algorithms_2026_11_06.jsonl`.

- [ ] **Step 1: Write the failing test in `tests/test_week9_forensic_autopsy_fixes.py`**

```python
def test_28_uncapped_2712_pdfs_148_docxs_across_all_6_roots_spot_check() -> None:
    """
    Pins Review Focus #3: Verifies that audit_and_extract_all_pdfs_and_books_zero_skip.py
    actually opens and extracts pages/text/theorems across all 6 roots (SRP_Cache, Downloads,
    GDrive_Vault, GDrive_GSN, Repo, OneDrive) with zero `< 400` or `< 700` truncation caps.
    """
    audit_path = REPO_ROOT / "data" / "corpus_parsed_full" / "page_by_page_zero_skip_audit_2026_11_06.json"
    audit = json.loads(audit_path.read_text(encoding="utf-8"))
    assert audit["zero_pages_skipped_verified"] is True
    assert audit["total_skipped_pages"] == 0
    assert audit["truncation_cap_active"] is False

    roots = audit["six_roots_page_by_page_verification"]
    assert roots["SRP_Cache"]["pdfs_verified"] == 877
    assert roots["SRP_Cache"]["pages_verified"] == 17040
    assert roots["Downloads"]["pdfs_verified"] == 204
    assert roots["Downloads"]["total_pages_with_zip_textbooks"] >= 25962
    assert roots["GDrive_Vault"]["pdfs_verified"] >= 1185
    assert roots["GDrive_Vault"]["pages_verified"] >= 15000
    assert roots["GDrive_GSN"]["pdfs_verified"] >= 345
    assert roots["Repo"]["pdfs_verified"] >= 99
    assert roots["Repo"]["docxs_verified"] >= 80
    assert audit["total_pdfs_verified_all_roots"] >= 2710
    assert audit["total_pdf_pages_verified_all_roots"] >= 60000
    assert audit["extracted_theorems_lemmas_algorithms_count"] >= 5000
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_week9_forensic_autopsy_fixes.py::test_28_uncapped_2712_pdfs_148_docxs_across_all_6_roots_spot_check -v`
Expected: FAIL with `KeyError: 'truncation_cap_active'` (and `extracted_theorems_lemmas_algorithms_count` currently `766 < 5000`).

- [ ] **Step 3: Implement uncapped 6-root extraction in `scripts/ops/audit_and_extract_all_pdfs_and_books_zero_skip.py`**

Remove every `len(extracted_theorems) < 400` and `< 700` cap in `scripts/ops/audit_and_extract_all_pdfs_and_books_zero_skip.py`. Add `audit_gdrive_vault_gsn_and_repo_pdfs_and_docxs()` using `fitz` and `python-docx` (caching per-file page/char/theorem metadata by `(path, mtime, size)` in `data/corpus_parsed_full/six_roots_pdf_docx_index_2026_11_06.json` so every single PDF and DOCX across `GDrive_Vault` [`1,185` PDFs], `GDrive_GSN` [`345` PDFs, `15` DOCXs], `Repo` [`99` PDFs, `80` DOCXs], `SRP_Cache` [`877` PDFs], and `Downloads` [`204` PDFs + `48` DOCXs + `8` ZIPs] is opened, page-counted, text-extracted, and scanned for theorems/equations with `truncation_cap_active: False`).

- [ ] **Step 4: Run extractor script and run test to verify it passes**

Run: `python scripts/ops/audit_and_extract_all_pdfs_and_books_zero_skip.py && python -m pytest tests/test_week9_forensic_autopsy_fixes.py::test_28_uncapped_2712_pdfs_148_docxs_across_all_6_roots_spot_check -v`
Expected: PASS (`total_pdfs_verified_all_roots >= 2710`, `extracted_theorems_lemmas_algorithms_count >= 5000`).

- [ ] **Step 5: Commit**

```bash
git add scripts/ops/audit_and_extract_all_pdfs_and_books_zero_skip.py data/corpus_parsed_full/ data/mind_staging/ tests/test_week9_forensic_autopsy_fixes.py
git commit -m "feat(ws2): uncapped page-by-page extraction across all 2710+ PDFs and 148 DOCXs in all 6 roots"
```

---

### Task 3: Replace Synthetic `tanh` Templates in `equation_executable_catalog_12304.json` with Real Corpus Equations & Evaluators

**Files:**
- Create: `scripts/ops/build_real_12304_equation_catalog.py`
- Modify: `intelligence/reasoning/equation_gate.py`
- Modify: `tests/test_week9_forensic_autopsy_fixes.py`

**Interfaces:**
- Produces in `scripts/ops/build_real_12304_equation_catalog.py`:
  - `build_real_12304_equation_catalog() -> dict[str, Any]` populating `data/equations/equation_executable_catalog_12304.json` and `data/engine/master_equation_registry_12k.json` with `12,304` real equations harvested in deterministic priority order from:
    1. `data/engine/thousand_equation_matrix_2026.json` (`1,666` verified equations with real `equationLatex`, `title`, `category`, `signalFamilyIdx`, `noyes_z_eff`, `priorWeight`, `rawLogOddsDelta`, `jacobianSensitivity`, `source`)
    2. `docs/predictions/research/2026-10-13/Deep Research Equation Extraction (2).docx` & `(3).docx` (`5,575` paragraphs of extracted physics, finance, biometric, and sports equations)
    3. `docs/engine/research/2026-10-28/hf-ultrascale-50-equations.json` (`252` equations)
    4. `intelligence/reasoning/engine_plan_recovered_equations.py` (`199` functions) + `intelligence/reasoning/mind_eq_recovered_functions.py` + `intelligence/models/gse_213_equation_engine.py` (`213` equations) + `intelligence/nfl_re/equations.py`
    5. `docs/arxiv-program/` (`1,579` paper dossiers + `50` JSON corpora)
    6. `data/corpus_parsed_full/extracted_theorems_lemmas_algorithms_2026_11_06.jsonl` + `brain/feeds/*.jsonl`
  - Every single entry in `equations` (`EQ_00001..EQ_12304`) must include:
    - `equation_id`: `"EQ_00001"` .. `"EQ_12304"`
    - `real_source_file`: exact relative repo path or corpus path
    - `real_source_locator`: exact source ID / function name / theorem number
    - `title`: authentic equation title from source
    - `latex_or_code_formula`: authentic LaTeX or Python formula from the source document (never a synthetic `tanh(w1*x0 + w2*x1 + w3*(x0*x2))` filler string)
    - `operator_type`: one of `"linear_logit"`, `"bilinear_interaction"`, `"rational_pade"`, `"exponential_survival"`, `"bellman_advantage"`, `"copula_tail"`, `"conformal_quantile"`, `"sheaf_laplacian"`, `"python_callable"`
- Modifies `intelligence/reasoning/equation_gate.py`:
  - `evaluate_single_catalog_equation(eq: dict[str, Any], bindings: dict[str, float]) -> float` dispatching by `eq["operator_type"]` and raising `ValueError("INVALID_EQUATION_BINDING")` if any parameter in `eq["parameter_bindings"]` is missing from `bindings` or `NaN`/`Inf`.

- [ ] **Step 1: Write the failing test in `tests/test_week9_forensic_autopsy_fixes.py`**

```python
def test_29_adversarial_spot_check_12304_real_equations_zero_synthetic_tanh() -> None:
    """
    Pins Review Focus #1 and #5: Spot-checks equations across the entire 1..12,304 range
    to verify zero synthetic 'tanh(0.219064 * ...)' strings exist, every equation has
    a real_source_file, real_source_locator, authentic latex_or_code_formula, and
    corrupt bindings raise ValueError instead of failing silently.
    """
    import pytest
    from intelligence.reasoning.equation_gate import (
        audit_12304_equation_catalog_integrity,
        evaluate_12304_equations_cognitive_router,
        evaluate_single_catalog_equation,
        load_equation_executable_catalog_12304,
    )

    catalog = load_equation_executable_catalog_12304()
    eqs = catalog["equations"]
    assert len(eqs) == 12304

    # Verify zero synthetic procedurally generated tanh(...) filler expressions
    synthetic_tanh_count = sum(
        1 for eq in eqs if str(eq.get("formula_type")) == "nonlinear_interaction_tanh_ridge"
    )
    assert synthetic_tanh_count == 0, f"Found {synthetic_tanh_count} synthetic tanh template equations"

    # Spot-check across indices 0, 100, 500, 1665, 2500, 5000, 8500, 12303
    for idx in (0, 100, 500, 1665, 2500, 5000, 8500, 12303):
        eq = eqs[idx]
        assert eq.get("real_source_file"), f"Missing real_source_file at index {idx}"
        assert eq.get("real_source_locator"), f"Missing real_source_locator at index {idx}"
        assert len(str(eq.get("latex_or_code_formula", ""))) >= 8
        assert eq.get("operator_type") in {
            "linear_logit",
            "bilinear_interaction",
            "rational_pade",
            "exponential_survival",
            "bellman_advantage",
            "copula_tail",
            "conformal_quantile",
            "sheaf_laplacian",
            "python_callable",
        }

    # Verify Review Focus #5: corrupt/missing parameter binding raises ValueError
    with pytest.raises(ValueError, match="INVALID_EQUATION_BINDING"):
        evaluate_single_catalog_equation(eqs[0], {"home_pressure_rate": float("nan")})

    audit = audit_12304_equation_catalog_integrity()
    assert audit["gate_passed"] is True
    assert audit["authentic_source_verified_count"] == 12304
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest tests/test_week9_forensic_autopsy_fixes.py::test_29_adversarial_spot_check_12304_real_equations_zero_synthetic_tanh -v`
Expected: FAIL with `ImportError: cannot import name 'evaluate_single_catalog_equation'` and `synthetic_tanh_count == 12304`.

- [ ] **Step 3: Implement `scripts/ops/build_real_12304_equation_catalog.py` and update `intelligence/reasoning/equation_gate.py`**

Create `scripts/ops/build_real_12304_equation_catalog.py` to harvest all real equations from `thousand_equation_matrix_2026.json` (`1,666`), `Deep Research Equation Extraction (2).docx` & `(3).docx`, `hf-ultrascale-50-equations.json` (`252`), `engine_plan_recovered_equations.py` (`199`), `gse_213_equation_engine.py` (`213`), `docs/arxiv-program/*.md` (`1,579` dossiers), `data/corpus_parsed_full/extracted_theorems_lemmas_algorithms_2026_11_06.jsonl`, and `brain/feeds/*.jsonl`. Map each equation to its real `latex_or_code_formula`, `real_source_file`, `real_source_locator`, `operator_type`, `family_id` (`0..278`), and `parameter_bindings`. Update `intelligence/reasoning/equation_gate.py` to implement `evaluate_single_catalog_equation(eq, bindings)` across all 9 operator types and enforce `authentic_source_verified_count == 12304` in `audit_12304_equation_catalog_integrity()`.

- [ ] **Step 4: Run builder script and run test to verify it passes**

Run: `python scripts/ops/build_real_12304_equation_catalog.py && python -m pytest tests/test_week9_forensic_autopsy_fixes.py::test_29_adversarial_spot_check_12304_real_equations_zero_synthetic_tanh tests/test_week9_forensic_autopsy_fixes.py::test_24_workstream3_12304_equations_catalog_and_dynamic_router_non_constant -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/ops/build_real_12304_equation_catalog.py intelligence/reasoning/equation_gate.py data/equations/equation_executable_catalog_12304.json data/engine/master_equation_registry_12k.json tests/test_week9_forensic_autopsy_fixes.py
git commit -m "feat(ws3): replace synthetic tanh templates with 12304 real source-traced equations and 9 operator evaluators"
```

---

### Task 4: Wire Restored TypeScript Modules into `zero-orphan-expected-metrics-bridge.ts` & Full Week 9 Regeneration + Verification

**Files:**
- Modify: `packages/prediction-engine/src/nfl/zero-orphan-expected-metrics-bridge.ts`
- Modify: `packages/prediction-engine/src/__tests__/zero-orphan-engine-audit.test.ts`
- Modify: `scripts/ops/generate_programmatic_walkthrough_2026_11_06.py`

**Interfaces:**
- Modifies `runAllRestoredWorkstream1Signals(ctx: RestoredWs1Context)` in `packages/prediction-engine/src/nfl/zero-orphan-expected-metrics-bridge.ts` to also execute the restored branch kernels (`dirichletMultinomialPosterior`, `brierMurphyDecomposition`, `jackknifePlusInterval`, `sameBookClvEdge`, `incentiveCalendarDelta`, `rankFirstGateDecision`) and return `restoredBranchModulesCount: 308`.

- [ ] **Step 1: Write the failing test in `packages/prediction-engine/src/__tests__/zero-orphan-engine-audit.test.ts`**

```typescript
it('executes restored branch slot kernels (Dirichlet-Multinomial, Brier-Murphy, Jackknife+, Same-Book CLV, Incentive Calendar)', () => {
  const resA = runAllRestoredWorkstream1Signals({
    homeOffEpa: 0.14,
    awayOffEpa: -0.04,
    homeDefEpa: -0.08,
    awayDefEpa: 0.06,
    spreadHome: -6.5,
    totalLine: 48.5,
    windMph: 4,
    isIndoor: true,
  });
  expect(resA.restoredBranchModulesCount).toBeGreaterThanOrEqual(308);
  expect(resA.brierMurphyReliability).toBeGreaterThanOrEqual(0);
  expect(resA.jackknifePlusWidth).toBeGreaterThan(0);
  expect(resA.dirichletPosteriorMaxShare).toBeGreaterThan(0.15);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/prediction-engine/src/__tests__/zero-orphan-engine-audit.test.ts`
Expected: FAIL with `expected undefined to be greater than or equal to 308`.

- [ ] **Step 3: Implement the restored branch slot kernels in `packages/prediction-engine/src/nfl/zero-orphan-expected-metrics-bridge.ts`**

Add `dirichletPosteriorMaxShare`, `brierMurphyReliability`, `jackknifePlusWidth`, `sameBookClvEdge`, `incentiveCalendarDelta`, and `restoredBranchModulesCount` to `RestoredWs1Summary` and `runAllRestoredWorkstream1Signals(ctx)` in `packages/prediction-engine/src/nfl/zero-orphan-expected-metrics-bridge.ts`, folding their log-odds delta into `compositeLogOddsDelta`.

- [ ] **Step 4: Regenerate all 19 Week 9 dossiers, consolidate mind staging, and run full verification**

Run:
```bash
python scripts/ops/consolidate_mind_staging_and_corpus.py
python scripts/ops/run_week9_full_slate_connected_workflow.py
python scripts/ops/generate_programmatic_walkthrough_2026_11_06.py
python -m pytest tests/test_week9_forensic_autopsy_fixes.py -v
npx vitest run packages/prediction-engine/src/__tests__/zero-orphan-engine-audit.test.ts apps/web/lib/intelligence-core/engine.test.ts apps/web/lib/intelligence-core/shadow.test.ts apps/web/lib/intelligence-core/selection-blindness.test.ts apps/web/lib/intelligence-core/situational-trace.wire.test.ts
node scripts/guardrails/trust-gate.mjs
node apps/mobile/scripts/lint-rules.js
python scripts/guardrails/connected-workflow-dossier-guard.py
```
Expected: `34 passed` in pytest, `46 passed` in Vitest, `0` violations across all 3 guardrails.

- [ ] **Step 5: Commit and push to `origin/main` and `origin/hermes/overnight-2026-11-03-corpus`**

```bash
git add -A
git commit -m "feat(forensic-integrity): complete Tasks 1-4 zero-shortcut 308-module git restoration, 6-root 2712-PDF extraction & 12304 real equation catalog"
git push origin HEAD:main
git push origin HEAD:hermes/overnight-2026-11-03-corpus
```
