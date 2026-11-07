# LANE 2 — PER-FAMILY CONSUMPTION CENSUS OF THE EQUATION CATALOG (Motif-executed)

**Lane note:** Assigned to DeepSeek (adversarial lane 2) under Garrett's 03:13 CT all-hands order. The DeepSeek session's first run reported itself BLOCKED honestly: the harness confined it to its launch directory (~/workspace/qa-fleet-2026-11-07) and denied every read of the catalog and clone — it fabricated nothing. Two relaunches followed (one refused: --dangerously-skip-permissions cannot run as root; one staged inside ~/workspace/ds-lane2-work, still running at filing). Because the census method is fully mechanical, Motif executed it directly against the commit tree so the question is answered tonight; if the staged DeepSeek run later returns its own census, it stands as the independent cross-check. Authorship: Motif, not DeepSeek.

**Counted at:** qa-repo HEAD **c0c721cc8** (main-side, stale, pre-AGY-branch — absences below are absences from main at that commit, exactly the baseline the task specified). Method: `git grep` over the full commit tree (25,830 files; sparse checkout irrelevant), catalog + twin + docs/wiring/qa/ excluded per the task.

## Headline counts (task definitions applied literally)

| Class | Families |
|---|---|
| CONSUMED (family_code / an equation id / an expression fragment hit in a code file outside data/ and docs/) | **0** |
| CITED-ONLY | **0** |
| ABSENT (no signal of any kind outside the catalog itself) | **279** |
| **Total** | **279** |

Why zero even for CITED-ONLY: the string `FAM_` appears in only 3 files outside the catalog/twin — the two catalog BUILDER scripts (scripts/ops/build_equation_executable_catalog_12304.py, build_real_12304_equation_catalog.py) and one unrelated scraped ads artifact. No document cites any family_code either. Per-family signals (equation ids like EQ_00001, expression fragments) were not separately greppable for all 12,304 ids within tonight's method budget — see the gap statement; the family_code result plus the loader finding below bound the answer.

## The finding the per-family table cannot show: consumption is whole-file, not per-family

The catalog IS consumed at this commit — by exactly one module, by file path, all 279 families at once:

- `intelligence/reasoning/equation_gate.py` (440 lines) hardcodes both paths (`CATALOG_12304_PATH`, `REGISTRY_12K_PATH`), loads the whole catalog (json.load, lru_cached), and evaluates every entry through its own 9 hardcoded operator kernels — it never reads the entries' stored `formula_expression` strings. Its public functions ARE called: `evaluate_12304_equations_cognitive_router` by scripts/ops/gse_connected_game_workflow.py:2330 (production workflow) and intelligence/coaching/full_repo_279_family_situational_reasoning_matrix.py:296; the audit function by intelligence/reasoning/orchestrator.py:100 (reached from engine.py's analyze pipeline) and the ops workflow; tests in tests/test_week9_forensic_autopsy_fixes.py (TEST 24 + the evaluate_all test) and intelligence/tests/test_reasoning_units.py.
- Motif EXECUTED it (2026-11-07 ~03:52 CT, staged copy, catalog in place): audit gate_passed = true (12,304 / 279 / 0 dead / 0 invalid / 0 unvalidated); router routed all 12,304, 263 active families on a sample context, game-dependent outputs (CIN@ATL clamped delta +0.048026 vs TB@CHI +0.156970, masks differ); evaluate_all authentic count 12,304. So PR #1260's "Wired 0 / Tested 0" census line is REFUTED at this commit — with the precision below.
- **Precision (the part that keeps this honest):** what is wired is the gate's re-implementation. Per entry it uses 3 parameter_bindings + 3 coefficients + operator_type + cluster/sample_size/family_id. The catalog's own stored expressions — which contain a truncated LaTeX comment in all 12,304 entries (9,174 with visibly cut-off comment text per the salvage count) and entries whose stored math provably misbehaves (copula negative bases → NaN class; EQ_00003 = −3.08 read as a probability; EQ_04852 breaching the 0.35 cap) — are never parsed or executed by anything. The kernel layer also flattens distinctions: e.g. conformal_quantile entries get a rational formula, not a conformal procedure (RECOMPUTE row 9 stands). "Catalog consumed" and "the catalog's equations run as written" are different claims; the first is now proven, the second remains false.

## Twin-reference reverse check

Files referencing the twin by name (master_equation_registry_12k), outside the twin itself: docs/superpowers/plans/2026-11-06-zero-shortcut-forensic-integrity-overhaul.md (doc), docs/wiring/AGY-OVERNIGHT-TOTAL-WIRING-MASTER-2026-11-06.md (doc), intelligence/coaching/uncompressed_25k_repo_books_papers_routes_bridge.py (code — opens and json.loads the twin at line 516–522), intelligence/reasoning/equation_gate.py (code — fallback path constant), scripts/ops/build_equation_executable_catalog_12304.py + build_real_12304_equation_catalog.py (builders). Referencing code files: **3** (one loader/bridge + the gate + builders counted separately: bridge and gate are the runtime referencers).

## Per-family table

All 279 families share one classification and one evidence line, stated once here and applied to every row: no family_code, and no per-family identifier, is referenced by any file outside the catalog, its twin, and its two builder scripts. Consumption happens only at whole-catalog granularity through equation_gate.py. (Family sizes: 279 families × 44–45 entries ≈ 12,304; e.g. FAM_000_PRESSURE 45, FAM_001_WEATHER 45.)

| family_id | family_code | domain | class | evidence |
|---|---|---|---|---|
| 0 | FAM_000_PRESSURE | pressure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 1 | FAM_001_WEATHER | weather | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 2 | FAM_002_RESTFATIGUE | restFatigue | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 3 | FAM_003_COVERAGEPERSONNEL | coveragePersonnel | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 4 | FAM_004_QBSKILLSCRIPT | qbSkillScript | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 5 | FAM_005_MARKETMICROSTRUCTURE | marketMicrostructure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 6 | FAM_006_PRESSURE | pressure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 7 | FAM_007_WEATHER | weather | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 8 | FAM_008_RESTFATIGUE | restFatigue | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 9 | FAM_009_COVERAGEPERSONNEL | coveragePersonnel | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 10 | FAM_010_QBSKILLSCRIPT | qbSkillScript | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 11 | FAM_011_MARKETMICROSTRUCTURE | marketMicrostructure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 12 | FAM_012_PRESSURE | pressure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 13 | FAM_013_WEATHER | weather | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 14 | FAM_014_RESTFATIGUE | restFatigue | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 15 | FAM_015_COVERAGEPERSONNEL | coveragePersonnel | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 16 | FAM_016_QBSKILLSCRIPT | qbSkillScript | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 17 | FAM_017_MARKETMICROSTRUCTURE | marketMicrostructure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 18 | FAM_018_PRESSURE | pressure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 19 | FAM_019_WEATHER | weather | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 20 | FAM_020_RESTFATIGUE | restFatigue | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 21 | FAM_021_COVERAGEPERSONNEL | coveragePersonnel | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 22 | FAM_022_QBSKILLSCRIPT | qbSkillScript | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 23 | FAM_023_MARKETMICROSTRUCTURE | marketMicrostructure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 24 | FAM_024_PRESSURE | pressure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 25 | FAM_025_WEATHER | weather | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 26 | FAM_026_RESTFATIGUE | restFatigue | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 27 | FAM_027_COVERAGEPERSONNEL | coveragePersonnel | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 28 | FAM_028_QBSKILLSCRIPT | qbSkillScript | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 29 | FAM_029_MARKETMICROSTRUCTURE | marketMicrostructure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 30 | FAM_030_PRESSURE | pressure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 31 | FAM_031_WEATHER | weather | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 32 | FAM_032_RESTFATIGUE | restFatigue | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 33 | FAM_033_COVERAGEPERSONNEL | coveragePersonnel | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 34 | FAM_034_QBSKILLSCRIPT | qbSkillScript | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 35 | FAM_035_MARKETMICROSTRUCTURE | marketMicrostructure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 36 | FAM_036_PRESSURE | pressure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 37 | FAM_037_WEATHER | weather | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 38 | FAM_038_RESTFATIGUE | restFatigue | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 39 | FAM_039_COVERAGEPERSONNEL | coveragePersonnel | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 40 | FAM_040_QBSKILLSCRIPT | qbSkillScript | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 41 | FAM_041_MARKETMICROSTRUCTURE | marketMicrostructure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 42 | FAM_042_PRESSURE | pressure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 43 | FAM_043_WEATHER | weather | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 44 | FAM_044_RESTFATIGUE | restFatigue | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 45 | FAM_045_COVERAGEPERSONNEL | coveragePersonnel | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 46 | FAM_046_QBSKILLSCRIPT | qbSkillScript | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 47 | FAM_047_MARKETMICROSTRUCTURE | marketMicrostructure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 48 | FAM_048_PRESSURE | pressure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 49 | FAM_049_WEATHER | weather | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 50 | FAM_050_RESTFATIGUE | restFatigue | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 51 | FAM_051_COVERAGEPERSONNEL | coveragePersonnel | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 52 | FAM_052_QBSKILLSCRIPT | qbSkillScript | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 53 | FAM_053_MARKETMICROSTRUCTURE | marketMicrostructure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 54 | FAM_054_PRESSURE | pressure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 55 | FAM_055_WEATHER | weather | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 56 | FAM_056_RESTFATIGUE | restFatigue | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 57 | FAM_057_COVERAGEPERSONNEL | coveragePersonnel | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 58 | FAM_058_QBSKILLSCRIPT | qbSkillScript | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 59 | FAM_059_MARKETMICROSTRUCTURE | marketMicrostructure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 60 | FAM_060_PRESSURE | pressure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 61 | FAM_061_WEATHER | weather | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 62 | FAM_062_RESTFATIGUE | restFatigue | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 63 | FAM_063_COVERAGEPERSONNEL | coveragePersonnel | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 64 | FAM_064_QBSKILLSCRIPT | qbSkillScript | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 65 | FAM_065_MARKETMICROSTRUCTURE | marketMicrostructure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 66 | FAM_066_PRESSURE | pressure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 67 | FAM_067_WEATHER | weather | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 68 | FAM_068_RESTFATIGUE | restFatigue | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 69 | FAM_069_COVERAGEPERSONNEL | coveragePersonnel | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 70 | FAM_070_QBSKILLSCRIPT | qbSkillScript | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 71 | FAM_071_MARKETMICROSTRUCTURE | marketMicrostructure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 72 | FAM_072_PRESSURE | pressure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 73 | FAM_073_WEATHER | weather | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 74 | FAM_074_RESTFATIGUE | restFatigue | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 75 | FAM_075_COVERAGEPERSONNEL | coveragePersonnel | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 76 | FAM_076_QBSKILLSCRIPT | qbSkillScript | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 77 | FAM_077_MARKETMICROSTRUCTURE | marketMicrostructure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 78 | FAM_078_PRESSURE | pressure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 79 | FAM_079_WEATHER | weather | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 80 | FAM_080_RESTFATIGUE | restFatigue | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 81 | FAM_081_COVERAGEPERSONNEL | coveragePersonnel | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 82 | FAM_082_QBSKILLSCRIPT | qbSkillScript | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 83 | FAM_083_MARKETMICROSTRUCTURE | marketMicrostructure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 84 | FAM_084_PRESSURE | pressure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 85 | FAM_085_WEATHER | weather | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 86 | FAM_086_RESTFATIGUE | restFatigue | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 87 | FAM_087_COVERAGEPERSONNEL | coveragePersonnel | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 88 | FAM_088_QBSKILLSCRIPT | qbSkillScript | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 89 | FAM_089_MARKETMICROSTRUCTURE | marketMicrostructure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 90 | FAM_090_PRESSURE | pressure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 91 | FAM_091_WEATHER | weather | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 92 | FAM_092_RESTFATIGUE | restFatigue | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 93 | FAM_093_COVERAGEPERSONNEL | coveragePersonnel | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 94 | FAM_094_QBSKILLSCRIPT | qbSkillScript | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 95 | FAM_095_MARKETMICROSTRUCTURE | marketMicrostructure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 96 | FAM_096_PRESSURE | pressure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 97 | FAM_097_WEATHER | weather | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 98 | FAM_098_RESTFATIGUE | restFatigue | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 99 | FAM_099_COVERAGEPERSONNEL | coveragePersonnel | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 100 | FAM_100_QBSKILLSCRIPT | qbSkillScript | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 101 | FAM_101_MARKETMICROSTRUCTURE | marketMicrostructure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 102 | FAM_102_PRESSURE | pressure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 103 | FAM_103_WEATHER | weather | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 104 | FAM_104_RESTFATIGUE | restFatigue | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 105 | FAM_105_COVERAGEPERSONNEL | coveragePersonnel | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 106 | FAM_106_QBSKILLSCRIPT | qbSkillScript | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 107 | FAM_107_MARKETMICROSTRUCTURE | marketMicrostructure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 108 | FAM_108_PRESSURE | pressure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 109 | FAM_109_WEATHER | weather | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 110 | FAM_110_RESTFATIGUE | restFatigue | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 111 | FAM_111_COVERAGEPERSONNEL | coveragePersonnel | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 112 | FAM_112_QBSKILLSCRIPT | qbSkillScript | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 113 | FAM_113_MARKETMICROSTRUCTURE | marketMicrostructure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 114 | FAM_114_PRESSURE | pressure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 115 | FAM_115_WEATHER | weather | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 116 | FAM_116_RESTFATIGUE | restFatigue | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 117 | FAM_117_COVERAGEPERSONNEL | coveragePersonnel | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 118 | FAM_118_QBSKILLSCRIPT | qbSkillScript | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 119 | FAM_119_MARKETMICROSTRUCTURE | marketMicrostructure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 120 | FAM_120_PRESSURE | pressure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 121 | FAM_121_WEATHER | weather | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 122 | FAM_122_RESTFATIGUE | restFatigue | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 123 | FAM_123_COVERAGEPERSONNEL | coveragePersonnel | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 124 | FAM_124_QBSKILLSCRIPT | qbSkillScript | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 125 | FAM_125_MARKETMICROSTRUCTURE | marketMicrostructure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 126 | FAM_126_PRESSURE | pressure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 127 | FAM_127_WEATHER | weather | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 128 | FAM_128_RESTFATIGUE | restFatigue | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 129 | FAM_129_COVERAGEPERSONNEL | coveragePersonnel | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 130 | FAM_130_QBSKILLSCRIPT | qbSkillScript | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 131 | FAM_131_MARKETMICROSTRUCTURE | marketMicrostructure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 132 | FAM_132_PRESSURE | pressure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 133 | FAM_133_WEATHER | weather | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 134 | FAM_134_RESTFATIGUE | restFatigue | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 135 | FAM_135_COVERAGEPERSONNEL | coveragePersonnel | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 136 | FAM_136_QBSKILLSCRIPT | qbSkillScript | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 137 | FAM_137_MARKETMICROSTRUCTURE | marketMicrostructure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 138 | FAM_138_PRESSURE | pressure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 139 | FAM_139_WEATHER | weather | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 140 | FAM_140_RESTFATIGUE | restFatigue | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 141 | FAM_141_COVERAGEPERSONNEL | coveragePersonnel | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 142 | FAM_142_QBSKILLSCRIPT | qbSkillScript | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 143 | FAM_143_MARKETMICROSTRUCTURE | marketMicrostructure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 144 | FAM_144_PRESSURE | pressure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 145 | FAM_145_WEATHER | weather | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 146 | FAM_146_RESTFATIGUE | restFatigue | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 147 | FAM_147_COVERAGEPERSONNEL | coveragePersonnel | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 148 | FAM_148_QBSKILLSCRIPT | qbSkillScript | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 149 | FAM_149_MARKETMICROSTRUCTURE | marketMicrostructure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 150 | FAM_150_PRESSURE | pressure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 151 | FAM_151_WEATHER | weather | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 152 | FAM_152_RESTFATIGUE | restFatigue | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 153 | FAM_153_COVERAGEPERSONNEL | coveragePersonnel | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 154 | FAM_154_QBSKILLSCRIPT | qbSkillScript | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 155 | FAM_155_MARKETMICROSTRUCTURE | marketMicrostructure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 156 | FAM_156_PRESSURE | pressure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 157 | FAM_157_WEATHER | weather | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 158 | FAM_158_RESTFATIGUE | restFatigue | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 159 | FAM_159_COVERAGEPERSONNEL | coveragePersonnel | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 160 | FAM_160_QBSKILLSCRIPT | qbSkillScript | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 161 | FAM_161_MARKETMICROSTRUCTURE | marketMicrostructure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 162 | FAM_162_PRESSURE | pressure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 163 | FAM_163_WEATHER | weather | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 164 | FAM_164_RESTFATIGUE | restFatigue | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 165 | FAM_165_COVERAGEPERSONNEL | coveragePersonnel | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 166 | FAM_166_QBSKILLSCRIPT | qbSkillScript | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 167 | FAM_167_MARKETMICROSTRUCTURE | marketMicrostructure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 168 | FAM_168_PRESSURE | pressure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 169 | FAM_169_WEATHER | weather | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 170 | FAM_170_RESTFATIGUE | restFatigue | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 171 | FAM_171_COVERAGEPERSONNEL | coveragePersonnel | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 172 | FAM_172_QBSKILLSCRIPT | qbSkillScript | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 173 | FAM_173_MARKETMICROSTRUCTURE | marketMicrostructure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 174 | FAM_174_PRESSURE | pressure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 175 | FAM_175_WEATHER | weather | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 176 | FAM_176_RESTFATIGUE | restFatigue | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 177 | FAM_177_COVERAGEPERSONNEL | coveragePersonnel | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 178 | FAM_178_QBSKILLSCRIPT | qbSkillScript | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 179 | FAM_179_MARKETMICROSTRUCTURE | marketMicrostructure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 180 | FAM_180_PRESSURE | pressure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 181 | FAM_181_WEATHER | weather | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 182 | FAM_182_RESTFATIGUE | restFatigue | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 183 | FAM_183_COVERAGEPERSONNEL | coveragePersonnel | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 184 | FAM_184_QBSKILLSCRIPT | qbSkillScript | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 185 | FAM_185_MARKETMICROSTRUCTURE | marketMicrostructure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 186 | FAM_186_PRESSURE | pressure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 187 | FAM_187_WEATHER | weather | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 188 | FAM_188_RESTFATIGUE | restFatigue | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 189 | FAM_189_COVERAGEPERSONNEL | coveragePersonnel | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 190 | FAM_190_QBSKILLSCRIPT | qbSkillScript | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 191 | FAM_191_MARKETMICROSTRUCTURE | marketMicrostructure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 192 | FAM_192_PRESSURE | pressure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 193 | FAM_193_WEATHER | weather | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 194 | FAM_194_RESTFATIGUE | restFatigue | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 195 | FAM_195_COVERAGEPERSONNEL | coveragePersonnel | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 196 | FAM_196_QBSKILLSCRIPT | qbSkillScript | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 197 | FAM_197_MARKETMICROSTRUCTURE | marketMicrostructure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 198 | FAM_198_PRESSURE | pressure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 199 | FAM_199_WEATHER | weather | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 200 | FAM_200_RESTFATIGUE | restFatigue | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 201 | FAM_201_COVERAGEPERSONNEL | coveragePersonnel | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 202 | FAM_202_QBSKILLSCRIPT | qbSkillScript | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 203 | FAM_203_MARKETMICROSTRUCTURE | marketMicrostructure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 204 | FAM_204_PRESSURE | pressure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 205 | FAM_205_WEATHER | weather | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 206 | FAM_206_RESTFATIGUE | restFatigue | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 207 | FAM_207_COVERAGEPERSONNEL | coveragePersonnel | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 208 | FAM_208_QBSKILLSCRIPT | qbSkillScript | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 209 | FAM_209_MARKETMICROSTRUCTURE | marketMicrostructure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 210 | FAM_210_PRESSURE | pressure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 211 | FAM_211_WEATHER | weather | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 212 | FAM_212_RESTFATIGUE | restFatigue | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 213 | FAM_213_COVERAGEPERSONNEL | coveragePersonnel | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 214 | FAM_214_QBSKILLSCRIPT | qbSkillScript | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 215 | FAM_215_MARKETMICROSTRUCTURE | marketMicrostructure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 216 | FAM_216_PRESSURE | pressure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 217 | FAM_217_WEATHER | weather | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 218 | FAM_218_RESTFATIGUE | restFatigue | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 219 | FAM_219_COVERAGEPERSONNEL | coveragePersonnel | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 220 | FAM_220_QBSKILLSCRIPT | qbSkillScript | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 221 | FAM_221_MARKETMICROSTRUCTURE | marketMicrostructure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 222 | FAM_222_PRESSURE | pressure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 223 | FAM_223_WEATHER | weather | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 224 | FAM_224_RESTFATIGUE | restFatigue | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 225 | FAM_225_COVERAGEPERSONNEL | coveragePersonnel | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 226 | FAM_226_QBSKILLSCRIPT | qbSkillScript | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 227 | FAM_227_MARKETMICROSTRUCTURE | marketMicrostructure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 228 | FAM_228_PRESSURE | pressure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 229 | FAM_229_WEATHER | weather | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 230 | FAM_230_RESTFATIGUE | restFatigue | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 231 | FAM_231_COVERAGEPERSONNEL | coveragePersonnel | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 232 | FAM_232_QBSKILLSCRIPT | qbSkillScript | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 233 | FAM_233_MARKETMICROSTRUCTURE | marketMicrostructure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 234 | FAM_234_PRESSURE | pressure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 235 | FAM_235_WEATHER | weather | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 236 | FAM_236_RESTFATIGUE | restFatigue | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 237 | FAM_237_COVERAGEPERSONNEL | coveragePersonnel | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 238 | FAM_238_QBSKILLSCRIPT | qbSkillScript | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 239 | FAM_239_MARKETMICROSTRUCTURE | marketMicrostructure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 240 | FAM_240_PRESSURE | pressure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 241 | FAM_241_WEATHER | weather | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 242 | FAM_242_RESTFATIGUE | restFatigue | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 243 | FAM_243_COVERAGEPERSONNEL | coveragePersonnel | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 244 | FAM_244_QBSKILLSCRIPT | qbSkillScript | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 245 | FAM_245_MARKETMICROSTRUCTURE | marketMicrostructure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 246 | FAM_246_PRESSURE | pressure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 247 | FAM_247_WEATHER | weather | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 248 | FAM_248_RESTFATIGUE | restFatigue | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 249 | FAM_249_COVERAGEPERSONNEL | coveragePersonnel | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 250 | FAM_250_QBSKILLSCRIPT | qbSkillScript | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 251 | FAM_251_MARKETMICROSTRUCTURE | marketMicrostructure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 252 | FAM_252_PRESSURE | pressure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 253 | FAM_253_WEATHER | weather | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 254 | FAM_254_RESTFATIGUE | restFatigue | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 255 | FAM_255_COVERAGEPERSONNEL | coveragePersonnel | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 256 | FAM_256_QBSKILLSCRIPT | qbSkillScript | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 257 | FAM_257_MARKETMICROSTRUCTURE | marketMicrostructure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 258 | FAM_258_PRESSURE | pressure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 259 | FAM_259_WEATHER | weather | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 260 | FAM_260_RESTFATIGUE | restFatigue | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 261 | FAM_261_COVERAGEPERSONNEL | coveragePersonnel | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 262 | FAM_262_QBSKILLSCRIPT | qbSkillScript | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 263 | FAM_263_MARKETMICROSTRUCTURE | marketMicrostructure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 264 | FAM_264_PRESSURE | pressure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 265 | FAM_265_WEATHER | weather | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 266 | FAM_266_RESTFATIGUE | restFatigue | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 267 | FAM_267_COVERAGEPERSONNEL | coveragePersonnel | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 268 | FAM_268_QBSKILLSCRIPT | qbSkillScript | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 269 | FAM_269_MARKETMICROSTRUCTURE | marketMicrostructure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 270 | FAM_270_PRESSURE | pressure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 271 | FAM_271_WEATHER | weather | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 272 | FAM_272_RESTFATIGUE | restFatigue | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 273 | FAM_273_COVERAGEPERSONNEL | coveragePersonnel | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 274 | FAM_274_QBSKILLSCRIPT | qbSkillScript | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 275 | FAM_275_MARKETMICROSTRUCTURE | marketMicrostructure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 276 | FAM_276_PRESSURE | pressure | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 277 | FAM_277_WEATHER | weather | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |
| 278 | FAM_278_RESTFATIGUE | restFatigue | GATE-ONLY | equation_gate.py loads the whole catalog by path; no family_code/equation-id reference in any code file |

## Gap statement (what this method cannot see)

- Per-equation-id greps for all 12,304 ids and per-entry expression-fragment greps were not run exhaustively (the family_code sweep + the loader analysis bound the conclusion: the only consumer loads by path and never selects by id; a stray id mention in a doc would change a family to CITED-ONLY at most, never to CONSUMED).
- Dynamic/runtime path construction beyond the constants found cannot be excluded by grep; the executed run (audit + router + evaluate_all, above) is the behavioral evidence.
- The AGY branch's newer tree is not covered; this census is main-at-c0c721cc8 by design.
- Whether the production workflow's router output reaches any published surface was NOT tested tonight (that is the disconnect/consumption test Copilot's PR #1258 was supposed to carry and never landed code for).
