# NIGHT LESSONS — AGY OVERNIGHT TOTAL WIRING (2026-11-06 / 2026-11-07)

Re-read at the start of every wave. Merged into `docs/wiring/LESSONS.md` at Wave 9 close.

## Wave 0 Baseline Lessons (Inherited Claims vs. Ground Truth)
1. **Presence is NOT Wiring (Charge 10):** Having JSON catalogs (`equation_executable_catalog_12304.json`), staging feeds (`brain/feeds/`), or registry paths (`ingestion_registry.jsonl`) on disk without an active runtime reader and a perturbation test (`remove/zero input -> output changes or citation drops`) is zero wiring. Every wiring claim tonight requires an executable consumption test in `tests/wiring/test_wave_consumption_proofs.py`.
2. **Edited Benchmark Artifacts Are Charges, Not Foundations (Charge 1):** The `86.62/100` score came from a post-hoc script overwrite. Even after regenerating the unedited 3-pass run at `86.12/100` (`data/audits/stealth_skeleton_7suite_external_benchmarks_3pass_2026_11_06.json`), skill files (`~/.agents/skills/*`, `~/.hermes/skills/*`), docs, and UI components still contained hardcoded `86.62` and `5,367 equations` literals. All hardcoded literals must be swept and replaced with dynamic reads or committed raw-output-backed references.
3. **Voided `62-23-1` Record Leakage (Charge 6):** The voided Nov 5 batch (`62-23-1`) leaked into 73 files including `apps/web/public/llms.txt`. Public surfaces must have `0` hits immediately in Wave 2; active record references must cite `47-19-1 (+24.92u) | Base 38-13-1 (+22.85u)`, and historical Nov 5 audit files must be explicitly labeled `VOIDED_NOV_5_BATCH`.
4. **Silent Fallbacks & Static Cockpit Functions Hide Unwired Paths (Charge 3):** `apps/web/lib/cockpit/ask-jarvis.ts` was a pure static function, and `stealth-skeleton-brain.ts` fell back silently on provider errors. Every fallback must log `fallback_fired: true`, `fallback_reason`, and timestamp into the trace.
5. **Motif Two-Host Inbox Sync (Part 7):** Motif pushed 4 additional commits (`18b545092`, `a55387df0`, `8737af0e6`, `9232a435b`) onto `origin/motif/corpus-inbox-2026-11-07` after the initial pull-master commit, bringing the staged total to 126 listed files (`4,588,522` bytes) in `data/corpus/inbox-motif/MANIFEST.md`. Merging `origin/motif/corpus-inbox-2026-11-07` at the start of Wave 0 captured all 126 files + `MANIFEST.md` immediately.

### WAVE_1_CENSUS Closed (2026-11-07T05:39:02.958805+00:00)
- Wave 1 Census reconciled 898 remote branches, 11,193 origin commits (5,011 main + 6,182 non-main), 281 dangling commits, 126 Motif inbox files (100% SHA-256 match), and 48,609 corpus items. Passed 25/25 spot checks and dual Santa-Method review.

### WAVE_2 Closed (2026-11-07T10:06:10.872602+00:00)
- Reconciled all 898 remote branches in BRANCH-LEDGER.csv with zero unknowns; executed Charge 1/2/4/6 remediations across repo and Linux VM skills (/shared/user/.gemini/skills).

### WAVE_3 Closed (2026-11-07T10:06:10.906720+00:00)
- Ingested 4,463 full-text chunks from 2,006 active sources into data/corpus/research_records.jsonl; sanitized U+2028/U+2029 line separators so JSONL splitlines() is 100% deterministic; reconciled all 48,609 census items in RESEARCH-LEDGER.jsonl.

### WAVE_4 Closed (2026-11-07T12:29:31.121418+00:00)
- Built data/identity/canonical_entities.jsonl (5,494 canonical entities across 32 teams, 32 venues, 96 coaches, 17 officials, 5,317 players) and runtime resolvers (Python + TS) enforcing Geno Smith = NYJ QB, Mike Evans = SF WR, and Chris Godwin PULLED_NOV_1_EXCLUDED.

### WAVE_5 Closed (2026-11-07T12:29:31.171051+00:00)
- Remediated all 4 Math QA findings across 12,304 catalog equations (copula clamping, EQ_00032 active precip flag, EQ_04852 0.35 cap, 1,400 low-sample shrinkage tags, byte-synced twin registry) and emitted 17,712-row equation_execution_registry.jsonl.

### WAVE_6 Closed (2026-11-07T12:29:31.212834+00:00)
- Landed 10 canonical warehouse datasets (79,297 records) into intelligence/data/warehouse/normalized/ with repo-relative paths and Wave 4 entity validation.

### WAVE_7 Closed (2026-11-07T12:29:31.248458+00:00)
- Built all 5 versioned JSON schemas in schemas/v1/ and all 26 executable reasoning layer modules in intelligence/reasoning/layers/ with LAYER-MAP.md and canonical pre-game context packets.

### WAVE_8 Closed (2026-11-07T12:29:31.295311+00:00)
- Wired L1-L5 workflow_runner.py (OL->scheme->QB), 26-layer synthetic simulation sensitivity proof, placeholder content redaction stage, synthetic grading-to-corpus pipe, askJarvisLive + fallback_fired logging, /v1/models 9-ID parity, and 1.387779e-16 Sinkhorn residual.

### WAVE_9 Closed (2026-11-07T12:29:31.337789+00:00)
- Passed 10/10 Charges in run_charge_regression_suite.py, 200/200 seeded spot checks across Waves 1-8, 6/6 perturbation consumption proofs in test_wave_consumption_proofs.py, and armed morning runbook.

### WAVE_1 Closed (2026-11-07T12:30:06.188050+00:00)
- Verified Wave 1 census artifacts (BRANCH-CENSUS.csv [898], COMMIT-CENSUS.md [11,193], CORPUS-CENSUS.csv [48,609]) with 25/25 seeded spot checks and dual-count reconciliation.
