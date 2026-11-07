# PERMANENT LESSONS — AGY OVERNIGHT TOTAL WIRING (`WAVE 0` – `WAVE 9`)

**Date:** 2026-11-07  
**Branch:** `agy/total-wiring-2026-11-07`  
**Sources Merged:** `docs/wiring/NIGHT-LESSONS.md`, `docs/wiring/CORRECTION-LOG.md` (`[CL-W0-001]`..`[CL-W2-001]`), and Wave 0–9 Execution & Santa-Method Verification Ledgers.

---

## 1. Why Dual Counting + Seeded Spot-Checks Catch Silent Drift

Single-pass scripts that both produce and count an artifact inherently share the same blind spots (glob filters, encoding skips, pagination truncation, or git ref omissions). Tonight's total wiring protocol enforced **Independent Dual Counting (Method A vs. Method B)** alongside **25-Item Deterministic Seeded Spot-Checks (`scripts/wiring/run_wave_spot_checks.py`)** at every wave boundary:

- **Method A vs. Method B Independence:** Every census and ledger had to reconcile `0` delta across two orthogonal enumeration paths before advancing:
  - *Branches & Commits (`WAVE 1` / `WAVE 2`):* `git for-each-ref refs/remotes/origin` vs. `git branch -r` (`898` remote branches; `11,193` origin commits = `5,011` main + `6,182` non-main; `281` dangling commits).
  - *Motif Two-Host Inbox (`WAVE 0` / `WAVE 1`):* Merging `origin/motif/corpus-inbox-2026-11-07` (`[CL-W0-001]`) caught 4 post-pull-master commits (`18b545092`, `a55387df0`, `8737af0e6`, `9232a435b`), reconciling all `126` listed files (`4,588,522` bytes) in `data/corpus/inbox-motif/MANIFEST.md` with `100%` SHA-256 digest parity.
  - *Corpus & Research Chunks (`WAVE 3`):* `48,609` `CORPUS-CENSUS.csv` items reconciled `1:1` against `data/corpus/research_records.jsonl` and `docs/wiring/RESEARCH-LEDGER.jsonl` (`110,960` extracted full-text chunks, `0` silent skips).
  - *Equations (`WAVE 5`):* `17,712` total records (`12,304` executable catalog + `1,666` matrix + `3,742` crosswalk) reconciled `1:1` in `data/equations/equation_execution_registry.jsonl`, eliminating duplicate bloat in `master_equation_registry_12k.json`.
  - *Normalized Warehouse (`WAVE 6`):* `10` normalized Parquet tables in `intelligence/data/warehouse/normalized/` (`79,297` core rows + `1` NWS forecast = `79,298` rows) verified both by Parquet footer metadata and direct DuckDB/PyArrow row scans, with repo-relative paths in `ingestion_registry.jsonl`.
- **25-Item Seeded Spot-Checks:** Summary totals alone cannot detect schema hollowing or null-filled payloads. By sampling 25 deterministic, reproducible items per wave and asserting non-empty full text, valid SHA-256 digests, canonical entity IDs, and executable callables, silent partial ingestion becomes impossible.

---

## 2. Word-Boundary & Immutable-Path Guards in Automated Remediation (`[CL-W2-001]`)

Automated repository-wide sweeps to purge stale literals (`86.62 -> 86.12`, `5367 -> 12304`, voided `62-23-1` batch references) are high-risk if implemented with naive string replacement:

- **What Happened (`[CL-W2-001]`):** During the initial pass of `scripts/wiring/run_wave2_charges_remediation.py`, an unanchored substring replacement (`txt.replace("5367", "12304")`) ran without path exclusions. It mutated 21 files inside `data/corpus/inbox-motif/` where the digit sequence `5367` appeared inside immutable X/Twitter status IDs and media snowflakes, breaking `MANIFEST.md` SHA-256 checksums. Santa Reviewer A caught the digest mismatch immediately.
- **Permanent Engineering Rule:**
  1. **Regex Word Boundaries Only:** Numeric and token replacements must always use strict regex boundaries (e.g., `\b5367\b`, `\b5,367\b`, `\b86\.62\b`) or AST/JSON-key targeting—never raw `.replace()` on short digit strings.
  2. **Immutable Archive Prefix Allow/Deny Lists:** Remediation scripts must enforce `IMMUTABLE_PREFIXES = ("data/corpus/inbox-motif/", "artifacts/", ".opencode-runs/", ".git/")` and verify `git status --short data/corpus/inbox-motif/` is empty (`0` modified files) plus `126/126` SHA-256 manifest matches after every run.
  3. **Include External Agent Skill Directories (`[CL-W0-002]`):** Hardcoded benchmark (`86.62/100`) and equation-count (`5,367`) literals also lived outside the repo in installed skill definitions (`~/.agents/skills/*`, `~/.hermes/skills/*`). Charge regression suites (`scripts/wiring/run_charge_regression_suite.py`) must scan both repository surfaces and active skill directories, and code must read counts dynamically via `get_dynamic_equation_counts()` and committed raw 3-pass benchmark JSON (`86.12/100`).
  4. **Zero Public Leakage of Voided Batches (`[CL-W0-003]`, Charge 6):** Public surfaces (`apps/web/public/llms.txt`, UI components) must maintain `0` hits for the voided Nov 5 `62-23-1` batch; active references cite `47-19-1 (+24.92u) | Base 38-13-1 (+22.85u)`, and historical Nov 5 audit artifacts carry explicit `VOIDED_NOV_5_BATCH` markers.

---

## 3. Consumption + Perturbation Proofs Over Existence Checks

**Presence on disk is not wiring (Charge 10).** Having `equation_executable_catalog_12304.json`, `research_records.jsonl`, or Parquet files sitting in a directory while runtime entrypoints return static strings or unconditioned defaults is a false claim.

- **Executable Consumption + Perturbation Standard (`tests/wiring/test_wave_consumption_proofs.py`):**
  Every wave from `WAVE 3` through `WAVE 8` is gated by automated tests that:
  1. **Invoke the Live Entrypoint:** Call the actual production module (`ResearchCorpusRetriever`, `CanonicalEntityResolver`, `EquationExecutionEngine`, `WarehouseLoader`, `Stack26Orchestrator`, `askJarvis` / `StealthSkeletonBrain`).
  2. **Perturb an Upstream Input:** Deterministically alter an upstream feature or context input—for example, perturbing `L12_trench_matchup_ol_vs_dl` (offensive line vs. defensive line pressure disruption rate) or removing/zeroing a corpus/equation input.
  3. **Prove Downstream Output Sensitivity:** Assert that the downstream causal chain (`L12_trench_matchup_ol_vs_dl -> L13_protection_and_blitz_answers -> L21_qb_processing_and_pressure`), the emitted reasoning trace citations, and the synthetic trajectory probability distribution (`L25_monte_carlo_pbp_synthesis`) deterministically change in the expected direction.
- **Explicit Fallback Telemetry (Charge 3):** Silent fallbacks and static stubs (`ask-jarvis.ts`, `stealth-skeleton-brain.ts`) are banned. Whenever a provider or model fallback triggers, the runtime trace must explicitly record `fallback_fired: true`, `fallback_reason`, and an ISO-8601 timestamp so degraded execution is never mistaken for primary reasoning.

---

## 4. Runtime Identity Contamination Firewalls (`CanonicalEntityResolver`)

Stale roster training data in LLM weights or unvalidated historical feeds will silently corrupt game projections unless blocked at runtime by a single source of truth:

- **Single Canonical Identity Registry (`WAVE 4`):** `data/identity/canonical_entities.jsonl` reconciles `3,648` canonical entities across teams (`32`), venues (`39`), coaches (`96`), officials (`135`), and players (`3,346`).
- **Dual-Runtime Enforcement (Python & TypeScript):** Both `intelligence/identity/resolver.py` and `packages/prediction-engine/src/identity/canonical-entity-resolver.ts` enforce the standing 2026 roster rulings and the Nov 1 contamination pull-list (`data/audit/nov1_contamination_pull_list.json`) at runtime:
  - **`Geno Smith = NYJ QB`** (never SEA/LV).
  - **`Mike Evans = SF WR`** (never TB).
  - **Retired / Out-of-League / Wrong-Team Blocks:** `Aaron Donald` (retired), `Davante Adams` on NYJ/LV, `Stefon Diggs` on BUF/HOU, `Saquon Barkley` on NYG, `Derrick Henry` on TEN, `Keenan Allen` on LAC.
- **Defense-in-Depth Across Every Boundary:**
  1. *Warehouse Ingestion (`WAVE 6`):* Normalized dataset loaders validate player/team bindings through `CanonicalEntityResolver` before writing Parquet tables.
  2. *26-Layer Stack (`WAVE 7`):* `L01_canonical_identity_and_roster` gates all downstream layers (`L02..L26`); any contaminated player-team pairing raises a hard contamination assertion or triggers deterministic scrubbing.
  3. *Cockpit & Dossier Output Gate (`WAVE 8`):* Outbound narratives and reasoning traces pass through `assert_no_identity_contamination()` before rendering or publishing.

---

## 5. Market Enters Last and Smallest (`L26 <= 0.08`)

The mission of the engine is football comprehension and situational reasoning—never curve-fitting to the closing line or echoing Vegas consensus back as a "model projection":

- **Football First (`L01..L25`):** Layers `L01` through `L25` compute the complete football synthesis purely from canonical rosters (`L01`), coaching tendencies (`L02`–`L05`), situational context & 80-rule firewall (`L06`–`L11`), trench/coverage/red-zone matchups (`L12`–`L20`), QB processing under pressure (`L21`), game script/tempo (`L22`–`L24`), and 10,000-world snap-by-snap PBP trajectory simulation (`L25`) **with zero knowledge of the market spread or total**.
- **Terminal Anchor Cap (`L26_market_late_anchor_and_pass_gate`):**
  - The market spread/total enters strictly at `L26`—the final step of the 26-layer stack.
  - Its blend weight is hard-capped in code and schema (`schemas/v1/layer_trace.schema.json`) at **`market_weight <= 0.08` (`8%` maximum)**, leaving `>= 92%` of the prior weight on `L01..L25` football reasoning.
  - Any attempt to pass `market_weight > 0.08` raises a hard `ValueError` in `Stack26Orchestrator` (verified by perturbation tests in `tests/wiring/test_wave_consumption_proofs.py`).
  - Rather than dragging the football projection toward the book number, `L26` uses the de-vigged market price as a **Conjunction & `PASS` Discipline Gate**: when the football-first distribution (`L01..L25`) and the market disagree without sufficient situational/equation backing, the engine outputs **`PASS` (`publishAllowed: false`)**.

---

## Summary Table — Wave 0 to Wave 9 Permanent Safeguards

| Wave | Scope | Permanent Artifact / Safeguard | Verification Gate |
|---|---|---|---|
| `WAVE 0` | Baseline & Motif Sync | Merged `origin/motif/corpus-inbox-2026-11-07` (`126` files); baseline audit of 10 Charges | `MANIFEST.md` SHA-256 (`126/126`) |
| `WAVE 1` | Total Census | `BRANCH-CENSUS.csv` (`898`), `COMMIT-CENSUS.csv` (`11,193`), `CORPUS-CENSUS.csv` (`48,609`) | Method A = Method B (`0` delta) + 25 spot checks |
| `WAVE 2` | Branches & Charges | `BRANCH-LEDGER.csv` (`0` unknown); word-bounded `\b5367\b` & `IMMUTABLE_PREFIXES` (`[CL-W2-001]`) | `run_charge_regression_suite.py` + Santa A/B PASS |
| `WAVE 3` | Research Ingestion | `110,960` chunks across `48,609` items in `research_records.jsonl` + live `ResearchCorpusRetriever` | 1:1 census reconciliation + perturbation proof |
| `WAVE 4` | Entity Resolution | `3,648` entities in `canonical_entities.jsonl`; Python & TS `CanonicalEntityResolver` | Runtime block of Geno=SEA/LV, Evans=TB, Nov 1 list |
| `WAVE 5` | Equations Execution | `17,712` equations in `equation_execution_registry.jsonl` (`12,304` + `1,666` + `3,742`) | Dynamic count reader + callable perturbation proof |
| `WAVE 6` | Data Landing | `10` normalized Parquet tables (`79,298` rows); repo-relative `ingestion_registry.jsonl` | DuckDB/Parquet dual count + NWS `@context` fix |
| `WAVE 7` | 26-Layer Stack | `L01..L26` wired + 5 v1 JSON schemas (`schemas/v1/*.schema.json`) | `L12 -> L13 -> L21` perturbation + `L26 <= 0.08` cap |
| `WAVE 8` | Cockpit & Brain | Live trace wiring in Cockpit/Brain surfaces + explicit `fallback_fired` / `fallback_reason` logging | 10/10 Charge regression suite PASS |
| `WAVE 9` | Total Audit & Lock | `docs/wiring/LESSONS.md`, `CORRECTION-LOG.md`, full consumption & spot-check suites | All 9 Waves Dual Count + 25 Spot Checks + Santa PASS |
