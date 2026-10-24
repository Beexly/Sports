# TASK-017 — REPO-INTEL FOLLOW-THROUGH — 2026-10-02 ~13:15 CT

The 360-unit repo intelligence is built and on the bus. Intelligence without a consumer is the tau_hat failure again — built, no consumer, rots. This mission wires it in. Queues after TASK-016 v3's 14 phases, with two exceptions noted below.

## PHASE A — adopt the adoptables

**License gate first (effective immediately, standing):** every new dependency gets a license check before install. `yfpy` is GPL-3.0 — it would copyleft GSE's commercial code. Never link it. This gate applies to everything below.

Adoption tickets (all MIT/Apache-2.0/BSD-verified in their dossiers):
1. **verified_calibration** → the per-signal-row metric standard. ECE *with bootstrap CIs*. CI straddles zero on the 2025 eval slice → signal is *unmeasured*, not calibrated — no adjustment ships. Refusal thresholds set on the **lower bound** of the CI.
2. **probmetrics** → the calibration-methods library. Use its Lp estimators instead of naive binned ECE; its benchmark picks the method per signal by sample size.
3. **crepes** → conformal classification + refusal machinery. Steal Mondrian (conditional) conformal and exchangeability martingales for the t10 track.
4. **ngboost** → probabilistic head for tabular signals. Every point projection becomes a distribution. Always paired with a calibration row.
5. **uncertainty-toolbox** → regression metric suite (`get_all_metrics()`: calibration error + sharpness + NLL + CRPS) for every regression signal's 2025 row.
6. **onnxruntime** → the serving answer. Train → export ONNX → numerical-parity check on the 2025 validation season → serve on cheap CPU. GPU spend: zero. The *served* artifact gets the calibration row, not just the trained one.
7. **optuna** → HPO standard. All config search under Optuna with ASHA/MedianPruner + NSGA-II over (walk-forward log-loss, calibration error, season-to-season variance). Pre-registered kill rules: any experiment below the incumbent at a checkpoint dies there.
8. **External ADOPTs** → pull the 8 ADOPT verdicts from `inbox/from-motif/repo-intel/external/` and ticket each (nflverse-data, nflreadpy, pydfs-lineup-optimizer, sleeper-api-wrapper, cerebro-code-memory, gitingest among them). License-gate each.

## PHASE B — build the weak points (ranked)

1. **Leakage machinery** (weak #1) — **URGENT: build before trusting v3 Phase 3's numbers.** `LeakageGate` keyword scan + `as_of` datetime fencing + `test_asof_no_leakage.py`. If v3's walk-forward completes first, its numbers are PROVISIONAL pending this gate. Extends Wire 5.
2. **Evaluation harness** (weak #2) — pre-committed bar for "the engine works": frozen test season, per-artifact JSON receipts with input hashes, data contracts, drift detection, publish/hold/promote policy.
3. **Agent-usable surface** (weak #5) — MCP server + `gse` CLI. Deterministic compute tools with agent access on top. Build before wiring more signals.
4. **Consensus baseline** (weak #4) — weighted multi-source blend with replacement-level baselines. Buildable in days. Interim between zero producers and full wiring.
5. **DFS slate feed** (weak #3) — per-contest player-pool CSV puller + parser (DK/FD publish these; no API partnership needed). Then GPP machinery: lineup sims vs fitted score distributions, stacking primitives, exposure caps, site-ready uploaders.
6. **Feed watchdog** (weak #6) — scheduled watchdog that fails loudly on upstream endpoint changes. Lands before the nflverse/Sleeper/ESPN producers.
7. **Props decision layer** (weak #7) — **shadow-only** per standing rules. Model-vs-market edge detector + Kelly-with-guardrails staking. No honest model probability → no plays surfaced, ever.
8. **Repo memory** (weak #8) — cerebro-style three-layer code memory (structural map + cached summaries + hash staleness) so the fleet stops cold-reading the repo every session.
9. **Video clip pipeline** (weak #10) — game → timestamp list → candidate 3-second clips via shot-boundary detection + the nflverse PBP already ingested. Automates the front end the standing video rule doesn't cover.

## PHASE C — branch atlas follow-through

- Archive (don't delete): the ~12 stale August calibration bake-off branches; duplicate pairs (`watch-space-auth`/`watcher-space-auth`, the `grok/calibration-ci` pair, `hermes/night-shift-1`/`hermes/p0-launch-fixes`).
- Inspect first: the 8 bare main-sync tip commits hiding real content — read before archiving anything near them.

## PHASE D — playbook REBUILDs (highest value)

1. **Contamination gate** (playbook #2) — NeMo Curator/decontam pattern reimplemented with temporal identity keys (game_id, feature_window). No fit runs unless the gate passes and logs its leak report.
2. **R1 staged reasoning recipe** (playbook #6) — SFT on format (explanations cite only wired signals) → DPO on mined preference pairs (traces attached to in-band vs out-of-band predictions = free labels) → RLVR with verifiable reward (landed in the calibrated band on unseen weeks). KL-control against the honest-refusal reference policy so RL can't train away the INVALID honesty.
3. **Draft-then-verify serving** (playbook #11) — cheap screening model proposes candidate edges (optimized for recall); full calibrated engine verifies only candidates.
4. **Teacher-student distillation** (playbook #10) — expensive full-signal ensemble teaches a cheap deployable student on outputs + intermediate trajectories. The student gets its own calibration row — never inherits the teacher's.
5. **Horizon dials** (playbook #12) — recency half-lives, lookback windows, EWMA spans become named config knobs with walk-forward calibration rows. Never hardcoded.

## CONSTRAINTS

All of TASK-016 v3's constraints carry forward, plus: license-gate every new dependency (standing, effective now); the 51 REBUILD verdicts are method-transfer only (MIT-with-attribution per the re-implementation rule — never copied code); archived repos (TGI, AutoGPTQ, AutoAWQ) are never built on — scrub references; fix the org moves (`ggml-org/llama.cpp`, `deepspeedai/DeepSpeed`).

## REPORT FORMAT

Same as v3 (Step 0, per-phase VERIFIED/CONTRADICTED/BLOCKED, SHA-anchored test counts, commits, calibration rows, refusals, epistemic summary, next priority). One commit per logical unit. BEGIN with the license gate + Phase B1.
