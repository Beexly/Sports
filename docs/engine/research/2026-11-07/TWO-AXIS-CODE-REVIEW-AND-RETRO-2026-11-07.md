# Two-Axis Parallel Code Review (`/code-review`), Deep-Module Architecture Review (`/improve-codebase-architecture` + `/codebase-design`), Session Retrospective (`/retro`), & Wayfinder Spec/Tickets (`/wayfinder` + `/to-spec` + `/to-tickets`)

- **Executed Date:** `2026-11-07`
- **Target Branch / Merge-Base:** `agy/total-wiring-2026-11-07` vs `3f7541049`
- **Parallel Review Subagents Executed:**
  - **Standards Axis & Deep-Module Architect:** Subagent `d037912c-733e-4348-855c-1b032f79c24b`
  - **Spec Axis, Retro & Wayfinder Analyst:** Subagent `2f68b28f-02e9-4e69-ac80-e6262b3000c4`
- **Visual HTML Report (`/improve-codebase-architecture`):** Generated at `$TEMP/architecture-review-20261107.html`
- **Portable Handoff Document (`/handoff`):** Generated at `$TEMP/handoff-universal-projections-20261107.md`

---

## Standards (`d037912c-733e-4348-855c-1b032f79c24b`)

### (a) Documented Standards (`AGENTS.md` & `CLAUDE.md`) Findings & Remediation

| File / Hunk | Documented Standard (`AGENTS.md` / `CLAUDE.md`) | Finding & Immediate Fix Applied |
|---|---|---|
| `intelligence/equations/equation_executor.py:547-553` & `intelligence/reasoning/reasoning_workflow_assembler.py:310-356` | **`AGENTS.md` — WIRE-FIRST SEQUENCING & 5-Track Reasoning Order (`OL -> scheme -> QB`)** | **Hard Violation Caught & Remediated:** `if fid not in meta_by_fam or fam.startswith("FAM_"):` previously overwrote `meta_by_fam[fid]["reasoning_track"]` to `"5_scheme_matchup"` when supplemental rows omitted `reasoning_track`. **Fixed** in `equation_executor.py:547-556` to preserve `existing_meta.get("reasoning_track")` unless the record explicitly supplies `reasoning_track`. |
| `scripts/wiring/verify_armed_workflows.py:168-194` vs `intelligence/reasoning/reasoning_workflow_assembler.py:344-365` | **`CLAUDE.md` Rule 6 & Operating Loop — Verifiable Runtime Contracts** | **Hard Violation Caught & Remediated:** Aligned `consumed_families` / `accounted_families` and `all_5_tracks_l4_l5_verified` / `all_5_tracks_verified` across both producer (`reasoning_workflow_assembler.py`) and verifier (`verify_armed_workflows.py`). |
| `scripts/wiring/run_charge_regression_suite.py:76, 117, 306` | **`AGENTS.md` — DIRECT-TO-MIND/ENGINE (Two-Host Rule: zero machine-local paths)** | **Hard Violation Caught & Remediated:** Replaced literal user-home paths with `Path.home() / ".agents" / "skills"` and `Path.home() / "Downloads"`. |
| `scripts/ops/zero_waste_model_router.py:272-322` | **`CLAUDE.md` Rule 1 & `AGENTS.md` — Trust No Unverified Claims / Santa Method** | **Hard Violation Caught & Remediated:** Added `_probe_live_repo_invariants()` and changed all fallback defaults in `run_multi_brain_santa_verification_council()` from `True` to fail-closed `False`. |
| `intelligence/equations/equation_executor.py:114-175, 369-374` | **`AGENTS.md` — Uncompressed-Intelligence Zero-Waste & Stage D Shrinkage (`\|\Delta\text{log-odds}\| \le 0.35`)** | **Pass:** Zero-`eval` compiled AST closures, `sample_size_n >= min_sample_size` gating (`1,400` sub-threshold equations held at `effective_weight = 0.0`), and `[-0.35, +0.35]` clamping verified. |
| `intelligence/reasoning/reasoning_workflow_assembler.py:140-142, 231, 474-480` | **`AGENTS.md` — Market Enters LAST (`<= 0.08`) & Paywall Protection** | **Pass:** Enforces `market_weight = 0.05 <= 0.08` at L26/Step 7 last and redacts paid pick tokens (`[REDACTED_BEHIND_PAYWALL]`). |

### (b) Evaluation Against All 12 Fowler Ch. 3 Baseline Code Smells (Judgement Calls)

1. **`Mysterious Name`**: Mixed-case dict keys (`"house_model_stealth_skeleton_Evaluation"`, `"internal_only_ngs_Protected"`) in `mega_sweep_2026_11_06_wiring_engine.py:501, 1398` and short AST closure bindings (`lf`, `rf`, `afs`) in `equation_executor.py:137-202`.
2. **`Duplicated Code`**: Per-family James-Stein shrinkage and `FamilyConsumptionReceipt` construction appear in both `execute_layer_equation_family_batch` (`:468-492`) and `execute_all_279_equation_families` (`:566-605`).
3. **`Feature Envy`**: `reasoning_workflow_assembler.py:178-233` reaches into `context_packet["layers"]["L12_..."]["signals"]` across 9 layers instead of calling a typed `ContextPacket` accessor.
4. **`Data Clumps`**: 10-parameter tuples `(equation_id, family, inputs, weight, formula_type, coefficients, parameter_bindings, formula_spec, sample_size_n, min_sample_size)` travel together across 5 functions in `equation_executor.py`.
5. **`Primitive Obsession`**: Nested `Dict[str, Any]` structures and string status literals represent `ContextPacket`, `ReasoningTrace`, and `GateStatus`.
6. **`Repeated Switches`**: Operator dispatch on `formula_type` in `equation_executor.py:262-289` mirrors registry builder switches.
7. **`Shotgun Surgery`**: Trace audit keys span `equation_executor.py`, `reasoning_workflow_assembler.py`, `reasoning_trace.schema.json`, and `verify_armed_workflows.py`.
8. **`Divergent Change`**: `intelligence/coaching/mega_sweep_2026_11_06_wiring_engine.py` (`1,517` lines) combines 8 distinct domain responsibilities in one module.
9. **`Speculative Generality`**: Backwards-compatibility alias exports at the bottom of `mega_sweep_2026_11_06_wiring_engine.py:1476-1505` and dual `write_to_disk`/`persist` flags in `reasoning_workflow_assembler.py:166`.
10. **`Message Chains`**: Chained `.get(...).get(...)` dictionary lookups in `verify_armed_workflows.py:91-93, 177-178`.
11. **`Middle Man`**: `intelligence/reasoning/mega_sweep_2026_11_06_wiring_engine.py` is a 26-line re-export shim of `intelligence/coaching/mega_sweep_2026_11_06_wiring_engine.py`.
12. **`Refused Bequest`**: No class-inheritance Refused Bequest in the diff (`SchemaContractValidationError` and `TemporalLeakageError` cleanly extend `ValueError`); at the function contract level, `run_placeholder_content_stage_validator` uses a fixed `as_of_date="2026-11-06"` default.

---

## Spec (`2f68b28f-02e9-4e69-ac80-e6262b3000c4`)

### (a) Missing or Partial Requirements (Found & Remediated)
- **Status-token triad in `opendots_verdict_only_reviewer.py` (`PASS | WARN | FAIL`):**
  - **Spec line 10:** `"restricts OpenDots strictly to a **read-only, verdict-only reviewer (`PASS | WARN | FAIL`)** behind `OPENDOTS_VERDICT_ONLY_ENABLED=false`."`
  - **Finding & Fix:** `scripts/guardrails/opendots_verdict_only_reviewer.py` initially emitted `"PASS"` or `"BLOCK"` without a `"WARN"` branch. **Remediated** in `opendots_verdict_only_reviewer.py:59-79` to evaluate `WARN` findings and emit the exact `PASS | WARN | FAIL` verdict triad while keeping `OPENDOTS_VERDICT_ONLY_ENABLED=false` default and `PROMPT_MUTATION_PERMITTED = False`.

### (b) Unrequested Behaviour (Scope Creep)
- **None (`0` findings).** All changes map directly to Workstreams 0–5 and Garrett's skill-execution mandate.

### (c) Implemented & Verified Requirements (with Spec Citations)
1. **Standing 5 Domain Tracks, `L1–L5` Hierarchy, `7-Step` Weekly Cycle & `279/279` Family Consumption (`Spec lines 6, 19`):** Verified in `intelligence/reasoning/reasoning_workflow_assembler.py` (`CANONICAL_5_DOMAIN_TRACK_MAP`, `build_track_l1_to_l5_hierarchy`, `STRICT_TRACK_DEPENDENCY_ORDER`, `accounted_families == 279`).
2. **Compiled Safe AST Equation Executor, Unit Normalizers, `copula_tail` Repair & `min_sample_size` Gate (`Spec line 8`):** Verified in `intelligence/equations/equation_executor.py` (`CANONICAL_FEATURE_UNIT_NORMALIZERS`, `compile_formula_spec_ast`, positive-definite `copula_tail`, `1,400` sub-threshold equations gated at `effective_weight = 0.0`).
3. **Two-Host Rule, Deduplicated `BK-DL` & Google Drive Provenance, ETR Attribution & 107-Repo Quarantine (`Spec line 9`):** Verified in `google-drive-and-docs-verified-manifest.json`, `bk-dl-deduplicated-provenance-index.json`, and `external-github-repos-quarantine-manifest.json` (`107` repos with `install_permitted_in_prod: false`, `Blur009/Blur-AutoClicker` & `itbrowser-net/undetectable-fingerprint-browser` rejected).
4. **Strict GSI / Sports Boundary & Verdict-Only OpenDots (`Spec line 10`):** Verified in `research/gsi_sandbox/physics_biophysics_and_oncology_21_repo_sandbox.py` (`RESEARCH_SANDBOX_ONLY = True`, `CLINICAL_OR_DIAGNOSTIC_USE_PERMITTED = False`, `SPORTS_SPINE_IMPORT_PERMITTED = False`) and `scripts/guardrails/opendots_verdict_only_reviewer.py`.

---

**Two-Axis Summary Line (`/code-review` Step 5):**
- **Standards Axis:** 4 hard contract/standard findings caught and remediated in-place + 12 baseline Fowler Ch. 3 code-smell judgement calls logged; worst issue resolved: `equation_executor.py:547` clobbering `meta_by_fam[fid]["reasoning_track"]` to `"5_scheme_matchup"`.
- **Spec Axis:** 1 minor status-token finding (`BLOCK` vs `PASS | WARN | FAIL` in `opendots_verdict_only_reviewer.py`) caught and remediated in-place; 0 scope-creep findings; 100% of Workstreams 0–5 verified against spec.

---

## Session Retrospective (`/retro` + `/writing-for-agents`)

1. **Global `AGENTS.md` (CRITICAL — Context Load & Sprawl):** `AGENTS.md` exceeds 3.07 MB and truncates on session startup; prune to a `<200-line` **context pointer** index with progressive disclosure to dated docs in `docs/<bucket>/research/<YYYY-MM-DD>/`.
2. **No-ops & Negation Steering (HIGH — Attention Dilution):** Replace repeated historical prohibitions in steering files with positive **leading words** (*fail-closed*, *situational-first*, *two-host*, *tracer-bullet*).
3. **Automated Checks (MEDIUM — Python Spine Guardrail Wiring):** Wire `verify_armed_workflows.py --check-armed`, `run_charge_regression_suite.py`, and `opendots_verdict_only_reviewer.py` into a single `guard:python-spine` check.
4. **Coding Standards (MEDIUM — Mechanical Rules in Deterministic Checks):** Enforce `SPORTS_SPINE_IMPORT_PERMITTED = False` and Two-Host path checks via AST/regex linters rather than prose rules.
5. **Navigation (MEDIUM — Cross-Language Context Pointers):** Maintain a compact 5-line pointer table mapping each canonical spine stage across TypeScript (`packages/prediction-engine`) and Python (`intelligence/`).
6. **Tool Economy (LOW — Bounded Manifest Headers + Fast Local Stat Hashing):** Keeping summary headers in the first 35 lines of large JSON manifests and checking local SSD caches before DriveFS network streams cut verification latency from minutes to `<10s`.
7. **Information Access (LOW — Clean-Checkout Offline Parity):** Committing `pbp_2026_slim_clean_checkout.csv.gz`, `google-drive-and-docs-verified-manifest.json`, and `bk-dl-deduplicated-provenance-index.json` eliminated two-host blindness on fresh checkouts.
