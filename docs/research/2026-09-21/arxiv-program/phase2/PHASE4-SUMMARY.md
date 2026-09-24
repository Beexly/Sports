# Phase 4 Summary — Machine-Intelligence Expansion to 1,250 Valuable Papers

Date: 2026-09-22. Garrett's directive: expand the verified arXiv program from 1,000 to 1,250 valuable papers focused on machine intelligence, building toward "the most calibrated, accurate, intelligent sports engine ever to exist."

## Final count: 1,251 verified valuable papers (target 1,250, exceeded by 1)

One reader (signal discovery) delivered 14 genuinely valuable papers against a 13 target rather than trimming a real ADOPT; all were counted. No padding anywhere — every paper counted has a full-text ledger.

- **1,251 tracker rows, 1,251 unique normalized arXiv IDs, zero duplicates**
- **1,203 ADAPT / 48 ADOPT**
- Zero REJECTs counted; the single wave-5b REJECT was replaced with a fresh full read
- All 1,251 ledger files present; every ledger's verdict matches the tracker (1,191 in the current exact format, 60 phase-2 ledgers in older but semantically identical formats)

## Program phases in the tracker

| Phase | Rows | Notes |
|---|---|---|
| 1 | 362 | Original corpus |
| 2 | 215 | Phase-2 waves |
| 3 | 171 | Phase-3 waves |
| 4 | 252 | 750→1,000 expansion |
| 5 | 251 | Machine-intelligence expansion (this phase) |
| **Total** | **1,251** | |

## Phase 5 lane breakdown (251 papers, 234 ADAPT / 17 ADOPT)

### Wave 5a — 125 papers, 117 ADAPT / 8 ADOPT (ledgers 1810–1954)

| Lane | Papers | ADOPT highlights |
|---|---|---|
| symreg_equation_discovery | 15 | PySR (2305.01582v3), LLM-SR blueprint (2404.18400v3), DrSR (2506.04282v1) |
| auto_feature_eng | 13 | LLM-FE (2503.14434), CRAFTER (2608.05207) |
| selfsupervised_tracking | 14 | JEPA, masked-trajectory pretraining, TrajTok, SSWNP (NBA-validated) |
| continual_online_learning | 13 | Frozen-expert ensembles (62.75% vs 21.9%), drift detectors, EWC |
| metalearning_fewshot | 12 | MAML, FLAT, FtaT label-shift correction |
| rl_sequential_decisions | 13 | Conservative Q-learning, distributional RL, optimal-stopping RL |
| world_models_simulators | 13 | DreamerV2, GameNGen, TacticGen, FootBots |
| causal_discovery | 12 | — |
| nas_automl | 10 | 3 ADOPT |
| active_learning | 10 | DAVED, black-box batch active learning |

Correction preserved: the initial PySR anchor 2305.11217 was a wormhole paper; the reader caught it and the correct ID is 2305.01582v3 (the wormhole read was not counted).

### Wave 5b — 126 papers, 117 ADAPT / 9 ADOPT (ledgers 2022–2212)

| Lane | Block | Papers | Verdicts | Commit |
|---|---|---:|---|---|
| data_infra_feature_store | 2022–2036 | 15 | 15 ADAPT | 3762f65 |
| signal_discovery_alpha_mining | 2042–2055 | 14 | 12 ADAPT / 2 ADOPT | 3762f65 |
| synthetic_data | 2062–2073 | 12 | 12 ADAPT | a08b134 |
| llm_agents_ai_scientist | 2082–2094 | 13 | 13 ADAPT | 9634066 |
| multimodal_fusion | 2102–2113 | 12 | 12 ADAPT | aaffbf8 |
| timeseries_foundation | 2122–2134 | 13 | 9 ADAPT / 4 ADOPT | a08b134 |
| uncertainty_decision_theory | 2142–2154 | 13 | 13 ADAPT | 3762f65 |
| symreg_equation_discovery (r2) | 2162–2173 | 12 | 10 ADAPT / 2 ADOPT | 85c43d7 |
| auto_feature_eng (r2) | 2182–2193 | 12 | 11 ADAPT / 1 ADOPT | 367b88c |
| world_models_simulators (r2) | 2202–2212 | 10 | 10 ADAPT | 612eb4b + a08b134 |

## REJECT / replacement accounting (wave 5b)

- **1 REJECT**: ledger 2209, arXiv:2504.03353 (decentralized collective world model — no credible sports application). Replaced per standing rule with a fresh full read: ledger 2212, arXiv:2506.00613 (WorldGym, ADAPT).
- Zero blocked papers. Zero REJECTs counted toward the target.

## Final direct audit results (2026-09-22)

- 1,251 rows; 1,251 unique normalized IDs; 0 duplicates
- 0 missing ledger files; 0 ID-not-in-file failures
- All ledger verdicts agree with tracker verdicts (60 phase-2 ledgers use older formatting, semantically identical)
- 0 REJECTs counted
- Dedup snapshot (wave5-dedup-baseids.txt) extended with all phase-5 IDs: **2,101 IDs**

## Five strongest machine-intelligence transfers

1. **SHARP (2605.06822, ledger 2090)** — human-auditable condition-action betting rules evolved by an attribution agent with a walk-forward gate. Its ablation (free-form reflection: +33.2% → −12.1% return) is the empirical case for structurally constraining the MOVE-37 discovery loop.
2. **SymTorch (2602.21307, ledger 2162, ADOPT)** — drop-in PyTorch→PySR distillation (proven on GNNs, PINNs, LLMs): turns GSE's black-box neural components into ≤10-term auditable equations.
3. **SINDy with Conformal Prediction (2507.11739, ledger 2165, ADOPT)** — the only method found giving distribution-free coverage on discovered equations/coefficients; every published metric gets honest uncertainty intervals.
4. **MinervaScore (2608.23808, ledger 2048, ADOPT)** — DSR + PBO + SPA + MinTRL + regime-stability fused into one auditable robustness grade with a hard Seal gate: the multiple-testing/backtest-overfitting validation layer the whole sports-signal program should adopt verbatim.
5. **101 Formulaic Alphas (1601.00991, ledger 2042, ADOPT)** — the operator grammar and "alpha as code" blueprint for automated sports-signal mining.

## Usage-efficiency measures applied this phase

Per Garrett's "save usage where you can but keep moving forward": 6-search-round cap per paper/angle, /tmp + shared full-text cache checks before downloads, dedup snapshot reuse/extension instead of rebuilds, 8–10 readers per wave, batched pushes, no mop-up waves (the one REJECT replacement ran as a single-ledger reader).
