# ARMED-WORKFLOWS — Morning Execution Runbook (`agy/total-wiring-2026-11-07`)

**Generated:** 2026-11-07  
**Branch:** `agy/total-wiring-2026-11-07`  
**Status:** `ARMED` (Verified via `python scripts/wiring/verify_armed_workflows.py --check-armed`)  
**Tonight's Execution Boundary:** **0 Live Simulations Run · 0 Historical Game Simulations Run · 0 Live Picks Generated · 0 Content Items Produced/Posted**

---

## 1. Pre-Flight Verification (`--check-armed`)

Before running any morning production workflow, verify that all 8 pipeline stages and all 15 wiring deliverables report `ARMED`:

```bash
python scripts/wiring/verify_armed_workflows.py --check-armed
```

Expected output:
- `"status": "ARMED"`
- `"all_stages_armed": true`
- `"live_simulations_run_tonight": 0`
- `"live_content_posts_run_tonight": 0`

---

## 2. Exact Morning Production Loop Commands (Execute ONLY on Garrett's Explicit `OK`)

When Garrett wakes up and gives the explicit `OK`, execute the production loop in strict sequential order:

### Step 1 — Fresh Data & Warehouse Normalization (Stage 1 / Wave 6)
Ingest fresh nflverse, NGS, FTN, Sleeper, Odds API, and NWS stadium weather feeds into `intelligence/data/warehouse/normalized/*.parquet` and validate every entity through `CanonicalEntityResolver`:

```bash
python scripts/wiring/run_wave6_data_landing.py
```

### Step 2 — 26-Layer Context Packet Assembly (Stage 2 / Wave 7)
Assemble the complete 26-layer context packet (`L01_schedule_and_kickoff` through `L26_market_price_check_last`) for each slate game, enforcing `as_of < kickoff_utc`, `CanonicalEntityResolver`, Core NFL Schemes & Systems (`intelligence/coaching/core_nfl_schemes_and_systems.py`), and Wave 5 equation execution (`intelligence/equations/equation_executor.py`):

```bash
python scripts/wiring/run_wave7_26_layers.py
```

### Step 3 — 5-Track Reasoning Workflow & Trace Signing (Stage 2 / Wave 8)
Run the Reasoning Workflow (`intelligence/reasoning/reasoning_workflow_assembler.py`) enforcing strict track dependency order (`offensive_line -> coaching_scheme -> scheme_matchup -> qb_behavior -> trust_signals`), 5 synthesis levels (`L1..L5`), research corpus citations (`intelligence/corpus/research_corpus_reader.py`), and market-last weighting (`<= 0.08`):

```bash
python scripts/wiring/run_wave8_workflow_assembly.py
```

### Step 4 — Full-Game Snap-by-Snap JEV + 10,000-World Trajectory Simulation (Stage 3 — Morning Only)
Run the situationally conditioned 10,000-world × 175-snap trajectory simulator (`scripts/ops/gse_coach_mind_simulator.py`) consuming the signed `data/context_packets/<game_id>.json` and `data/reasoning/traces/<game_id>.trace.json`:

```bash
python scripts/ops/gse_coach_mind_simulator.py --from-context-packet data/context_packets/2026_09_JAX_BAL.json --from-reasoning-trace data/reasoning/traces/2026_09_JAX_BAL.trace.json
```

### Step 5 — Conformal Calibration, De-Vig & 5-Stage Conjunction Gate (Stages 4–5 — Morning Only)
Verify the call-sheet tickets, connected workflow dossiers, trust gate, and mobile lint rules before publishing to live packs:

```bash
node scripts/trust-gate.mjs
node apps/mobile/scripts/lint-rules.js
python scripts/guardrails/connected-workflow-dossier-guard.py
```

### Step 6 — Post-Game Grading-to-Corpus Feedback Pipe (Continuous Learning Loop)
Once games settle, grade outcomes against the pre-game reasoning trace and append structured calibration lessons to `data/corpus/grading_feedback_records.jsonl`:

```bash
python -c "from intelligence.feedback.grading_to_corpus_pipe import record_graded_outcome_to_corpus; print('Feedback pipe armed')"
```

---

## 3. Proof That Every Stage Was Tested Tonight on Fixtures Only

| Pipeline Stage | Entrypoint Module | Fixture / Validation Target | Tonight's Test Command | Live Runs / Posts Tonight |
|---|---|---|---|---|
| **Stage 0: Corpus & Mind Feeds** | `intelligence/corpus/research_corpus_reader.py` | `48,609` ledger items + `126` Motif inbox payloads + `brain/feeds/` waves 1–12 | `pytest tests/wiring/test_wave_consumption_proofs.py -k test_wave3` | `0` |
| **Stage 1: Entity Resolution Firewall** | `intelligence/identity/entity_resolver.py` | `6,558` canonical entities (`Geno Smith = NYJ QB`, `Mike Evans = SF WR`, Nov 1 pull list) | `pytest tests/wiring/test_wave_consumption_proofs.py -k test_wave4` | `0` |
| **Stage 2: Equation Execution Engine** | `intelligence/equations/equation_executor.py` | `21,419` equations (`12,304` catalog + `1,666` matrix + `3,742` crosswalk + `33` monographs + `516` PDF book formulas + `177` football books/repos + `2,949` PDF theorems + `32` Sovereign Downloads) | `pytest tests/wiring/test_wave_consumption_proofs.py -k test_wave5` | `0` |
| **Stage 3: Warehouse Data Landing** | `intelligence/data/warehouse/warehouse_loader.py` | `10` normalized `.parquet` datasets (`79,298` rows, `0` `C:\` paths) | `pytest tests/wiring/test_wave_consumption_proofs.py -k test_wave6` | `0` |
| **Stage 4: 26-Layer Context Stack** | `intelligence/reasoning/layers/layer_registry.py` | `L01..L26` (`L12 -> L13 -> L21` perturbation + `as_of < kickoff_utc` guard) | `pytest tests/wiring/test_wave_consumption_proofs.py -k test_wave7` | `0` |
| **Stage 5: Reasoning + Synthetic Sim + Placeholder Content + Feedback Pipe** | `intelligence/reasoning/reasoning_workflow_assembler.py` | Settled historical fixture `2024_10_CIN_BAL` + synthetic simulation validator + placeholder content redaction | `pytest tests/wiring/test_wave_consumption_proofs.py -k test_wave8` | `0` |
| **Stage 6: 10-Charge Regression Suite** | `scripts/wiring/run_charge_regression_suite.py` | All 10 Motif Charges (`10/10 PASS`) | `python scripts/wiring/run_charge_regression_suite.py --wave WAVE_9` | `0` |
