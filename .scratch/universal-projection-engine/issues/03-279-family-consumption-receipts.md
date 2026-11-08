# 03: 279-Family Consumption Receipts Bound to 5-Track `L1–L5` Reasoning Trace

**What to build:** Full-spine binding of all `279` equation families into the 5 canonical Domain Tracks (`offensive_line -> coaching_scheme -> scheme_matchup -> qb_behavior -> trust_signals`), `L1–L5` synthesis hierarchy (`L4` adversarial challenge + `L5` sign-flip detection), and 7-Step Weekly Cycle with market price entered last (`weight <= 0.08`).

**Blocked by:** `02: Compiled Safe AST Equation Executor, Unit Normalization & min_sample_size Gate`

**Status:** DONE (`ready-for-agent`)

- [x] `execute_reasoning_workflow` emits `FamilyConsumptionReceipt` records across all 5 canonical tracks with `family_consumption_census.accounted_families == 279`.
- [x] Perturbing `adversary_counter_delta` beyond `|combined_l3_delta|` with opposite sign sets `L5_final_track_synthesis.sign_flipped_by_adversary = True`.
- [x] `validate_reasoning_trace_schema` passes on the persisted `data/reasoning/traces/<game_id>.trace.json` artifact and `pytest tests/unit/test_family_consumption_279_and_l4_l5.py` passes (`4/4`).
