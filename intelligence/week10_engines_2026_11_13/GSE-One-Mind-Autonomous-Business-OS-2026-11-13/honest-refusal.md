# Doctrine 02: Honest Refusal & Zero Silent Fallback (`honest-refusal`)

**Status:** Controlling Fleet & Engine Doctrine (`CODEOWNERS` Enforced)  
**Repositories:** [Beexly/Sports](https://github.com/Beexly/Sports) · [Beexly/agent-bus](https://github.com/Beexly/agent-bus)  
**Governing Blueprints:** [Comprehensive Architecture Audit: Multi-Agent Fleet Orchestration, Verification Doctrine, and Quantitative Reasoning Systems](https://docs.google.com/document/d/1g5Jml0FyTS-zaJrLuVHWBQ-KvgAJod5YXqTi04w0lS8/edit?usp=drivesdk&ouid=117370885799080207136) · [GSE Continuous Learning Architecture Plan](https://docs.google.com/document/d/1cO6VC1DguIJsF0z9aKZWEEy2STSv974TdcNsZQhi4s8/edit?usp=drivesdk&ouid=117370885799080207136) · [SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md](https://docs.google.com/document/d/1LOLbE4mksn5cKV4g1xBaQvmmQkOvDRVjrAPpoPVkhI8/edit?usp=drivesdk&ouid=117370885799080207136)

## 1. Core Mandate

The Galaxy Sports Edge ([galaxysportsedge.com](https://www.galaxysportsedge.com)) and Galaxy Science Institute engines **never guess, never fabricate missing covariates, and never emit `0.5` (`50%`), `0.0` (`target_hhi = 0.0`), or `"CLEAR"` on missing evidence**. Whenever required canonical inputs, sample sizes, tracking tensors, market quotes, or calibration knots are absent, stale beyond TTL, non-finite (`NaN`/`Inf`), or ungrounded, the system **must fail closed by raising a typed `DataGapError` (or emitting an explicit `NAMED_GAP_RECEIPT` / `ABSTAIN` verdict)**.

Under `formal/INDUCTION_DOCTRINE.md` (`I(s_0) & Gate(s, a) => I(delta(s, a))`), silent fallback destroys epistemic calibration by masquerading ignorance as a calibrated coin-flip prior, corrupting downstream Brier scores, copula joint probabilities, and Kelly capital allocations.

## 2. Prohibited Anti-Patterns vs. Required Fail-Closed Behavior

| Anti-Pattern (Strictly Forbidden) | Historical Failure Mode Identified in Audit | Required `honest-refusal` Countermeasure |
| :--- | :--- | :--- |
| **Defaulting win/cover probability to `0.5`** | Unwired feature scalars fell back to `p = 0.50` when bridge weights or sample counts were absent ([Comprehensive Architecture Audit](https://docs.google.com/document/d/1g5Jml0FyTS-zaJrLuVHWBQ-KvgAJod5YXqTi04w0lS8/edit?usp=drivesdk&ouid=117370885799080207136)). | Raise `DataGapError(field, game_id, reason)` immediately; if calibrated model probability ever equals `0.5` due to missing directional bridge output or `n < min_sample_size`, halt ticket minting. |
| **Swallowed `try / catch` exception blocks** | Catch blocks returned empty arrays or `0.0` defaults (such as `target_hhi = 0.0` or `CLEAR` trust status on missing evidence). | Re-throw `DataGapError` unsuppressed; log structured `516325` wide-event refusal telemetry with `status = "ABSTAIN_DATA_GAP"`. |
| **Construction-time `ticket: null` silent drops** | 15 pre-calibration `ticket: null` literals bypassed isotonic calibration diagnostics ([GSE Continuous Learning Plan](https://docs.google.com/document/d/1cO6VC1DguIJsF0z9aKZWEEy2STSv974TdcNsZQhi4s8/edit?usp=drivesdk&ouid=117370885799080207136)). | Route all candidate pricing through `calibration-map.ts` isotonic PAVA + `contradictionGate`, emitting explicit refusal reason codes when withheld. |
| **Ungated `ENABLED = false` stubs or paper header spoofing** | Heuristic z-scores labeled with arXiv IDs or `ENABLED = false` modules lacking statistical kill criteria ([GSE Continuous Learning Plan](https://docs.google.com/document/d/1cO6VC1DguIJsF0z9aKZWEEy2STSv974TdcNsZQhi4s8/edit?usp=drivesdk&ouid=117370885799080207136)). | Enforce machine-readable `ACCEPTANCE_GATE` metadata blocks (e.g., Brier `<= 0.22`, ECE `<= 0.05` over `n >= 100` fixtures; Ville e-process `1/alpha = 20.0` per [arXiv:2109.11761](https://arxiv.org/abs/2109.11761)). |
| **Treating Tier 5/6 rumors as injury facts** | Uncorroborated social/audio chatter (`confidence <= 0.40`) or Reddit posts altering Sinkhorn role shares ([SPORTS_OS Master Plan](https://docs.google.com/document/d/1LOLbE4mksn5cKV4g1xBaQvmmQkOvDRVjrAPpoPVkhI8/edit?usp=drivesdk&ouid=117370885799080207136)). | Refuse overlay promotion (`OverlayRefusalError`) for any claim with `source_tier >= 5` or `confidence < 0.75`; restrict Sinkhorn overlays to verified Tier 1–3 availability deltas. |
| **Non-convergent numerical solvers** | Clamped Sinkhorn-Knopp couplings or non-convergent Shin de-vig Brent roots passed silently downstream. | Assert Sinkhorn $\ell_1$ marginal error `< 1e-9` ([arXiv:1610.06519](https://arxiv.org/abs/1610.06519)) and Shin $z \in [0, 0.999)$ convergence; raise `DataGapError` / `SolverDivergenceError` on violation. |

## 3. Verification Contract

Every unit and integration suite (`test_gse_one_mind_os.py` and Node AST checks on `one_mind_agent_bus_daemon.ts`) must include adversarial negative tests confirming that:
1. Missing Stage 0 roster/injury hashes, `None`/`NaN` EPA or wind inputs, empty sample counts, or corrupted odds feeds deterministically raise `DataGapError`.
2. Attempting to pass a fallback `0.5` probability without verified directional bridge support (`home_sign != 0`, `sample_size >= 30`) is caught and rejected by the `honest-refusal` gate.
3. Murphy Brier calibration degradation ($\text{Reliability} > \text{Resolution}$) triggers an immediate fail-closed execution halt rather than silent stake scaling.
