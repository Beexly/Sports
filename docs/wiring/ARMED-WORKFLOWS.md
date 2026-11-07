# ARMED WORKFLOWS — MORNING PRODUCTION RUNBOOK (`docs/wiring/ARMED-WORKFLOWS.md`)

> **GARRETT'S DIRECTIVE LOCK (`NIGHT-STATE.json: "ARMED"`):**
> Tonight was **WIRING AND TESTING ONLY**. Zero live game simulations, zero social posts, and zero live picks were executed overnight.
> Every stage below is built, schema-contracted (`schemas/v1/*.schema.json`), entity-resolved (`intelligence/identity/entity_resolver.py`), and verified by automated perturbation consumption tests (`tests/wiring/test_wave_consumption_proofs.py`).
> **Nothing below executes on the live slate until Step 0 (Garrett's explicit `OK`).**

---

## Step 0 — Dry-Run Arming Check (Verified Tonight via `--check-armed`)

Before authorizing the morning production run, verify that all 10 stages, 26 reasoning layers, 5 schema contracts, canonical entity resolver, equation execution registry, and public safety gates (`LIVE_BOARD=false`, `PUBLISH_LEDGER=false`, `PUBLIC_PICKS=false`, `PERFORMANCE_STATS=false`) are armed and green:

```bash
python3 scripts/wiring/verify_armed_workflows.py --check-armed
```

---

## The 10-Step Morning Production Loop (Executes ONLY After Garrett's `OK`)

### Step 1 — Fresh Data Pull & Freshness Certification (`layer_01_freshness_reality`)
- **Action:** Pull timestamped pre-game feeds (official injury reports, depth charts, weather vectors, referee crew assignments, nflverse play-by-play & NGS tracking, and closing/current market lines).
- **Certification Gate:** `intelligence/reasoning/layers/layer_01_freshness_reality.py` verifies feed timestamps (`as_of_utc < kickoff_utc`), checks staleness thresholds, and runs `intelligence/identity/entity_resolver.py` (`resolve_entity`) across every incoming player, coach, team, venue, and official. Any unresolved entity or out-of-window pairing raises `EntityResolutionContaminationError` and halts the affected game packet before reasoning begins.

### Step 2 — Context Packet Assembly for the Slate (`data/context_packets/<game_id>.json`)
- **Action:** `intelligence/reasoning/context_packet_builder.py` executes all **26 reasoning layers** (`layer_01_freshness_reality` through `layer_26_adversary_synthesis`) for each scheduled game and writes `data/context_packets/<game_id>.json`.
- **Completeness Contract:** Validated automatically against `schemas/v1/context_packet.schema.json`. Every layer must emit `status: "ACTIVE"` with non-empty signals or explicitly declare `status: "WAIVED_WITH_REASON"` / `"MISSING_UPSTREAM"` with a quantified `uncertainty_width_delta`.

### Step 3 — Reasoning `L1–L5` Over Context Packets (`data/reasoning/traces/<game_id>.trace.json`)
- **Action:** `intelligence/reasoning/workflow_runner.py` executes the 5 reasoning tracks (`offensive_line` → `coaching_scheme` → `qb_behavior` → `trust_signals` → `scheme_matchup`, strictly enforcing the `OL → scheme → QB` dependency order) and levels `L1` (signal extraction), `L2` (interaction synthesis), `L3` (structural valuation), `L4` (`adversary`), and `L5` (`synthesis`).
- **Trace Contract:** Validated against `schemas/v1/reasoning_trace.schema.json`. Every trace cites `packet_id`, all 26 `layer_citations`, and `ledger_sha`. Any provider fallback is explicitly logged (`fallback_fired: true`, `fallback_reason`).

### Step 4 — Missed-and-Forgotten Pass (`layer_25_missingness_contradiction` Loopback)
- **Action:** Audit `layer_25_missingness_contradiction` and `L4_adversary` outputs across all generated traces. Where late-breaking active/inactive designations or contradictory feed signals were flagged, feed those deltas back into Step 2 and rebuild the affected `data/context_packets/<game_id>.json` and `data/reasoning/traces/<game_id>.trace.json`.

### Step 5 — 10,000 Correlated Monte Carlo Simulations Per Game (`schemas/v1/simulation_distribution.schema.json`)
- **Action:** Only after Steps 1–4 are locked and Garrett gives the morning `OK`, run the 10,000-trial correlated simulation stage over each game's verified context packet and reasoning trace (incorporating Student-t / Clayton copula tail dependence, Romano CQR conformal intervals, and Sinkhorn-Knopp coupling).
- **Output Contract:** Validated against `schemas/v1/simulation_distribution.schema.json` with full joint quantiles (`p05`, `p25`, `p50`, `p75`, `p95`), correlation matrices, and `layer_sensitivity_hash`.

### Step 6 — Second Loop Reconciliation Pass (Simulation vs Reasoning Audit)
- **Action:** Compare the 10,000-trial simulation medians and tail quantiles against the `L3_structural_valuation` and `L4_adversary` priors. Any divergence exceeding the conformal threshold triggers a targeted second-pass diagnostic before downstream outputs are materialized.

### Step 7 — Live Site & Member Pack Outputs
- **Action:** Materialize game projections, positional rankings, 360° matchup cards, gated player props, DFS Showdown/Classic ownership & leverage pools, and member packs from the reconciled distributions.
- **Safety Gate:** Enforced by `EntityResolution` (zero wrong-team players) and `pulled_play_guard` (zero pulled/voided plays).

### Step 8 — Content Bundle Generation From Traces (`schemas/v1/content_bundle.schema.json`)
- **Action:** Generate structured matchup writeups, film-room breakdowns, and social/member copy directly citing `packet_id` and `trace_id`, validated through `schemas/v1/content_bundle.schema.json` and `redactLeakedPicksFromPublicCopy`.

### Step 9 — Garrett Review, Gate Release & Engagement
- **Action:** Garrett reviews the generated board and content bundles, flips the release gate when satisfied, posts to X/IG/Discord/Site, and activates live Cockpit Q&A (`apps/web/lib/cockpit/ask-jarvis.ts` + `apps/web/lib/jarvis/stealth-skeleton-brain.ts`).

### Step 10 — Post-Game Grading → Training Data → Corpus Feedback Loop (`intelligence/feedback/grading_to_corpus_pipe.py`)
- **Action:** After games go final, `intelligence/feedback/grading_to_corpus_pipe.py` grades realized outcomes against pre-game distributions (proper Brier, log-loss, CQR empirical coverage, CLV), updates layer calibration weights, and appends verified post-mortem records back into `data/corpus/research_records.jsonl`.
