# 01: Clean-Checkout PBP Fallback & 9/9 Armed Workflow Gate

**What to build:** End-to-end clean-checkout readiness so a fresh clone without local machine caches resolves the canonical `2024_10_CIN_BAL` context packet/trace, falls back to committed `pbp_2026_slim_clean_checkout.csv.gz`, and passes all 9 armed workflow stages.

**Blocked by:** None (can start immediately)

**Status:** DONE (`ready-for-agent`)

- [x] Deduplicated `mega_sweep_2026_11_06_wiring_engine.py` loads cleanly without duplicate symbol definitions.
- [x] Clean-checkout PBP loader resolves `pbp_2026_slim_clean_checkout.csv.gz` when local nflverse parquet caches are absent.
- [x] `python scripts/wiring/verify_armed_workflows.py --check-armed` exits `0` with `all_stages_armed: true` (`9/9 ARMED`).
