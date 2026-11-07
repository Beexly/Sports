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

### WAVE_2_BRANCHES_AND_COMMITS Closed (2026-11-07T05:53:19.104123+00:00)
- Wave 2 audited all 898 remote branches in BRANCH-LEDGER.csv (0 unknown), preserved 126/126 Motif inbox SHA-256 digests, and remediated Charges 1, 2, 4, and 6 across repo and skills. Passed 25/25 spot checks and dual Santa-Method review.

### WAVE_3_RESEARCH_INGESTION Closed (2026-11-07T05:58:51.722126+00:00)
- Wave 3 extracted 110,960 full-text chunks across all 48,609 CORPUS-CENSUS.csv items into data/corpus/research_records.jsonl and RESEARCH-LEDGER.jsonl (1:1 reconciled), wired live retrieval readers, and passed perturbation consumption tests and dual Santa-Method review.

### WAVE_4_ENTITY_RESOLUTION Closed (2026-11-07T06:01:14.728531+00:00)
- Wave 4 built data/identity/canonical_entities.jsonl (3,648 entities across teams, venues, coaches, officials, and players), wired Python & TS CanonicalEntityResolver enforcing standing 2026 rulings (Geno Smith = NYJ QB, Mike Evans = SF WR), and passed dual Santa-Method review.

### WAVE_5_EQUATIONS_INTO_EXECUTION Closed (2026-11-07T06:04:56.434849+00:00)
- Wave 5 reconciled 17,712 equations (12,304 catalog + 1,666 matrix + 3,742 crosswalk) in equation_execution_registry.jsonl, deduplicated master_equation_registry_12k.json to a canonical pointer manifest, wired live execution & dynamic count helpers, and passed dual Santa-Method review.

### WAVE_6_DATA_LANDING Closed (2026-11-07T06:09:28.734896+00:00)
- Wave 6 materialized all 10 normalized parquet datasets into intelligence/data/warehouse/normalized/ (79,297 core rows + 1 NWS forecast = 79,298 rows), rewrote ingestion_registry.jsonl to repo-relative paths, fixed the NWS @context dict bug, validated entities through Wave 4 CanonicalEntityResolver, and passed dual Santa-Method review.

### WAVE_7_THE_26_LAYER_STACK Closed (2026-11-07T06:16:38.788285+00:00)
- All 26 layers (L01..L26) and 5 v1 JSON schemas wired and verified; L12->L13->L21 dependency chain and L26 market-last (<=0.08) proven; dual Santa-Method PASS.

### WAVE_8_WORKFLOW_ASSEMBLY Closed (2026-11-07T06:21:59.109128+00:00)
- Wave 8 Workflow Assembly, Historical Fixture E2E (2024_10_CIN_BAL), Synthetic Sim Validator, Placeholder Content Validator, Grading-to-Corpus Feedback Pipe, and Charge 3 Brain/Cockpit remediation verified; 10/10 Charges PASS; dual Santa-Method PASS.

### WAVE_9_FINAL_AUDIT_AND_ARMING Closed (2026-11-07T09:07:18.010820+00:00)
- Wave 9 Final Audit & Arming complete: all 15 morning deliverables, 20 Downloads sovereign artifacts, 26 layer modules + manifest.json, 10/10 Charge Regression PASS, 225/225 Seeded Spot-Checks PASS, and --check-armed ARMED.
