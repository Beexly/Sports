# 05: GSI 21-Repo Sandbox Isolation & Verdict-Only OpenDots Reviewer

**What to build:** Strict physical and import separation between the 21-repo physics/biophysics/oncology sandbox (`research/gsi_sandbox/`) and the live sports prediction spine (`intelligence/`), paired with a read-only, feature-flagged OpenDots reviewer (`PASS | WARN | FAIL`).

**Blocked by:** `01: Clean-Checkout PBP Fallback & 9/9 Armed Workflow Gate`

**Status:** DONE (`ready-for-agent`)

- [x] `research/gsi_sandbox/physics_biophysics_and_oncology_21_repo_sandbox.py` enforces `RESEARCH_SANDBOX_ONLY = True`, `CLINICAL_OR_DIAGNOSTIC_USE_PERMITTED = False`, and `SPORTS_SPINE_IMPORT_PERMITTED = False`, with `0` imports from `research/gsi_sandbox` across `intelligence/`.
- [x] `scripts/guardrails/opendots_verdict_only_reviewer.py` defaults to `OPENDOTS_VERDICT_ONLY_ENABLED=false`, enforces `PROMPT_MUTATION_PERMITTED = False`, and emits `PASS | WARN | FAIL` verdict statuses when enabled.
- [x] `pytest tests/test_physics_biophysics_and_oncology_21_repo_engine.py` passes (`22/22`).
