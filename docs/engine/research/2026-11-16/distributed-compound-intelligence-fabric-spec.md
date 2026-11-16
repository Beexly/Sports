# GSE Distributed Compound-Intelligence and Opportunistic Compute Fabric Specification

Date: 2026-11-16
Branch: `feat/pregame-engine-dfs-harmony-2026-11-15`
Status: Architecture & Integration Specification

## 1. Executive Summary

This specification documents the unified **Distributed Microtask Compute, Evolutionary Calibration, and Hot-Swap Inference Fabric** spanning Python (`src/gse_engine/fabric/`), TypeScript (`packages/prediction-engine/src/fabric/`), WebGPU WGSL shaders, and the 12,469-artifact Foundry + 877-PDF + 32-lesson permanent ledger corpus (`data/engine/foundry_compound_corpus_index_2026.json`).

Rather than building disconnected silos, the fabric unifies:
- `intelligence/sgp/sgp_copula_engine.py` and `packages/prediction-engine/src/nfl/sgp-copula.ts` (Clayton survival copula with Higham PSD repair and Frechet-Hoeffding bound safety)
- `packages/prediction-engine/src/coach-sim/sinkhorn.ts` and `intelligence/combining/afcrps.py` (Sinkhorn-Knopp optimal transport and fair CRPS ensemble scoring)
- `src/gse_engine/compute/corpus_situational_integrator.py` (3-way Reciprocal Rank Fusion `k=60`, Barber-Romano non-exchangeable CQR, and 5-pillar situational conditioning)
- `src/gse_engine/cli.py` and `scripts/ops/gse_fabric_worker_daemon.py`

## 2. Core Components

### Phase 1: Brokerless Durable Microtask Coordinator & Trust Ledger
- **Module:** `src/gse_engine/fabric/coordinator.py`
- **Dual Storage Adapter:**
  - PostgreSQL production SQL via `generate_postgres_ddl_and_claim_sql()` emitting pure lowercase `snake_case` tables (`gse_worker_nodes`, `gse_microtask_slices`, `gse_fencing_clock`) and atomic `SELECT ... FOR UPDATE SKIP LOCKED` claims.
  - Local SQLite (`WAL` + `BEGIN IMMEDIATE` / `:memory:`) compatibility adapter for zero-daemon CI and unit tests.
- **Safety & Scheduling Invariants:**
  - Strictly monotonic `BIGINT` `fencing_token`: stale/zombie commits where `submitted_token < current_fencing_token` or lease owner changed are rejected cleanly (`STALE_FENCING_TOKEN`).
  - Adaptive quantum sizing targets a **3.0s-to-8.0s** slice execution window via `throughput_units_per_sec * (8.0 - 5.0 * clamp(load_factor, 0, 1))`.
  - Three-factor result weighting combines Canary/oracle parity (`{0, 1}`), epoch staleness decay `exp(-gamma * lag)`, and Beta-Bernoulli + EWMA worker `trust_score`.

### Phase 2: Bit-Exact `Philox-4x32-10` PRNG & Invariant Gatekeepers
- **Modules:** `src/gse_engine/fabric/philox.py`, `packages/prediction-engine/src/fabric/philox.ts`, plus WGSL generator `generate_philox4x32_wgsl_shader()`.
- **Arithmetic Exactness:**
  - Uses explicit `& 0xFFFFFFFF` masking in Python and `Math.imul` + `>>> 0` + 16-bit limb `umul32Hi` splitting in TypeScript so every `(campaign_seed, task_id, path_index, step_index, substream)` tuple yields bit-identical `uint32[4]` words across backends.
  - Dyadic `(w + 0.5) * 2^-32` conversion yields IEEE-754 exact open-interval `(0, 1)` draws.
- **Hard Mathematical Gates (`invariants.py` / `invariants.ts`):**
  - Frechet-Hoeffding bounds: `max(sum(p_i) - (d - 1), 0) <= C(p_1, ..., p_d) <= min(p_i)`.
  - Markov transition rows and Sinkhorn-Knopp transport marginals conserved within `1e-6`.
  - Finite proper scores and non-crossing monotonic conformal quantiles.
  - Configurable Canary Dual-Dispatch (`3%` default, dynamically escalated for nodes below `0.70` trust) paired with spot-check oracle isolation of Byzantine outliers.

### Phase 3: Closed-Loop Compound-Intelligence Evolution (ETTC)
- **Modules:** `src/gse_engine/fabric/evolution.py`, `src/gse_engine/fabric/e_process.py`, `packages/prediction-engine/src/fabric/e-process.ts`.
- **5-Island MAP-Elites:** `copula_tail`, `markov_sinkhorn`, `biomech_fatigue`, `conformal_abstention`, and `corpus_rrf_foundry` partitioned across `6 x 6` behavioral descriptor grids with periodic ring migration.
- **Diagnostic Critic & Hybrid Mutator:** Aggregates weighted residual diagnostics (`worst_buckets`, calibration slope/intercept drift, tail miss rate) into targeted nudges, cross-island crossover, and bounded `scipy.optimize` (`L-BFGS-B`) local refinement.
- **Anytime-Valid Sequential E-Process Gate:** Tracks martingale wealth `W_t = W_{t-1} * (1 + lambda_t * phi(loss_champion - loss_challenger))` with strictly predictable `F_{t-1}` betting fraction `lambda_t in [0, 1)` and bounded odd transform `phi in [-1, 1]`. Promotes only when `W_t >= 1 / alpha` (`20.0` at `alpha = 0.05`) AND `invariant_failures == 0`.

### Phase 4: SHA-256 Registry, `<5ms` Hot-Swap & 12,469-Artifact Foundry Miner
- **Modules:** `src/gse_engine/fabric/registry_hotswap.py`, `packages/prediction-engine/src/fabric/hot-swap-registry.ts`, `src/gse_engine/fabric/foundry_compound_miner.py`, `src/gse_engine/fabric/worker_daemon.py`, `packages/prediction-engine/src/fabric/hybrid-worker.ts`.
- **Hot-Swap Inference:** Pre-verifies `SHA-256` digest and all mathematical invariants before performing an $O(1)$ atomic active pointer swap, keeping one-pointer rollback ready on health breaches.
- **Continuous Corpus Mining:** Sweeps `foundry/artifacts/primitives/*.json` (`12,469` files), `manifest_877_pdfs.json`, and `lessons_learned_permanent_ledger.jsonl` (strictly `?mode=ro` on SQLite) into `data/engine/foundry_compound_corpus_index_2026.json`, feeding 3-way RRF `k=60` in `corpus_situational_integrator.py`.
- **Opportunistic Resource-Aware Daemon:** Monitors CPU/memory load via `psutil`, throttles poll sleep and batch size under active host load, and handles `SIGINT`/`SIGTERM` cleanly.

## 3. CLI Launch Commands

- Run closed-loop ETTC campaign:
  `python -m gse_engine.cli fabric-campaign --generations 3`
- Sweep all Foundry artifacts & corpus into the runtime index:
  `python -m gse_engine.cli fabric-sweep-corpus`
- Benchmark `<5ms` hot-swap query latency:
  `python -m gse_engine.cli fabric-hotswap-bench`
- Run opportunistic worker node against a durable queue DB:
  `python scripts/ops/gse_fabric_worker_daemon.py worker --node-id rig-cpu-1 --db data/engine/fabric_queue.sqlite`
