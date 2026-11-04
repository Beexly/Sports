# WORK ORDER — Build the transparent emission gate (Jev hybrid verdict)

From: Motif · To: the fleet — Hermes as builder lane · Date: 2026-10-16 · Project: gse

## Why

Garrett put the Jev question to Super Heavy Grok (research run 2026-10-16, verified against GitHub / Hugging Face / TypeSafe docs / arXiv-adjacent literature). Verdict, adopted by Garrett: **HYBRID.** Public "Jev" / OpenJev / Laya are System One typed-decision models — they solve typed decisions over text/JSON and carry **zero published evidence on sports-signal arbitration, EV, or CLV**. No System One model gets adopted as our arbiter. What gets built is ours: the transparent sieve + simulation emission gate, plus a selective/calibration layer, with Laya tested later as ONE scoring component inside a pre-registered harness — the harness we already armed on 2026-10-14 (eval set: 3,081 settled picks, thresholds frozen).

The judge seat is currently vacant and the mathematical sieve / `jev ask` arbitration are not runnable end-to-end in the main stack (gate inventory, 2026-10-11). This order closes that.

## Doctrine (governs the build)

- **Ingestion is universal and ungated.** This gate rules **EMISSION only**. It may never filter, rank-down, or hide what the engine is allowed to know; a refused emission keeps its refusal as a status inside the engine.
- **Arbitration is measured evidence only:** calibration, CLV, walk-forward. No vendor numbers anywhere.
- **Deterministic and auditable.** Every emission decision must be reproducible from logged inputs: which signals fired, what the calibrated weights said, what the market/CLV disagreement was, which threshold ruled. No opaque judge.
- This is engine-internal work. It moves on the engine's evidence process; it is not waiting on any founder decision. Gates keep their one jurisdiction — emission/promotion — and this build IS that jurisdiction being built properly.

## The frozen protocol (acceptance test lives here)

`~/workspace/goals/gse-engine-v5-3-0-calibration-rebuild/files/jev-emission-gate-eval-protocol-2026-10-16.md` (Motif's record; key points inlined below so this order stands alone).

- **Dataset:** `~/workspace/second-pass/laya-eval/eval-set.csv` — 3,081 rows (Tier A: 570 sealed-holdout 2025 bridge candidates with real lines/units, clustered 2-per-game over 285 games; Tier B: 2,511 production settled picks, thin state — market + model prob + version only). Provenance: `~/workspace/second-pass/laya-eval/README.md`. Design origin: `~/workspace/second-pass/stream-e1-laya-eval-design.md`.
- **Split:** Tier A time-ordered — Weeks 1–12 calibration/tuning, Week 13 → Super Bowl pure test, opened exactly once per candidate. Tier B undated → corroboration only, never tuned on.
- **Arms:** (a) internal gate (this build), (b) simple weighted ensemble + market prior, (c) market-only, (d) PHASE 2 — Laya (`NandhaKishorM/laya`, Convai, Apache-2.0) fine-tuned on pre-2025 settled seasons only, as one scoring component inside arm (a). Reference: pass-all (measured: Tier A −0.086 u/pick pooled; Tier B 54.8% win rate).
- **Metrics (all reported, units never dollars):** CLV + expected CLV (on-disk set has NO true CLV — `clv_available=false` × 3,081; proxy = beat-close rate on spread rows + passed-set mean units, retired when true CLV lands), Brier, log-loss, ECE with the reliability read printed, selective risk vs coverage at matched coverage, walk-forward ROI / profit factor / max drawdown in units, realized vs predicted p90/p99, duplication rate, plus discipline metrics (coverage, false-pass/false-reject, abstention behavior).
- **Bars (pre-registered):** emitted-set mean ≥ +0.02 u/pick (95% CI LB > −0.02, cluster-bootstrapped by game), beat-close ≥ 52.4%, Brier ≤ 0.24 and ≥ 0.005 better than market-only, ECE ≤ 0.07, AUC ≥ 0.58, false-pass ≤ 0.40, emit rate 15–85%, no catastrophic walk-forward block, tail exceedance inside bands, zero canary/integrity failures. **Kill criteria** include: failing the baseline margins, coverage theft, inverted confidence (AUC < 0.50), miscalibrated tails, any look-ahead or test-set tuning, and any knowledge filtering (doctrine kill regardless of numbers). INCONCLUSIVE is a legitimate verdict at n = 285 games.

## Phased scope

**Phase 1 — the gate + harness (this order's build):**
1. **Scoring harness** over the eval set: state builder (whitelist fields only — label columns joined after ruling, per the design doc's leakage rules), candidate runners, cluster-bootstrap scoring, the full §4 metric suite, scorecard output.
2. **The emission gate**, deterministic: calibrated stacking/weights over base signals → market-prior combination (devigged close as strongest prior) → market/CLV disagreement term → selective risk threshold (emit / withhold / abstain) → the existing duplication check and the 10,000-run correlated-simulation layer's p90/p99 + ceiling-EV outputs feeding the threshold. Every decision logged with its full input trail.
3. **Baselines (b) and (c)** as harness arms — the gate must beat them by the frozen margins or the verdict says so.
4. Run the protocol on the on-disk set; publish the scorecard internally **labeled PROXY-CLV** (see the blocker note), whatever it says — honest negatives included.

**Phase 2 — Laya component (after Phase 1 scores):** fine-tune Laya on pre-2025 settled seasons only; wire it as one scoring input to the Phase 1 gate; same harness, same bars. Truncation discipline from the design doc applies (tokenizer-counted states, ≤ 700 target / 800 hard cap, canaries in every batch — a silent truncation voids the run). Laya earns or loses its seat on the frozen numbers alone.

## The one named blocker (fact, not a decision request)

The eval's **CLV-bearing run** needs true CLV, which exists only in the production DB. The completing pull is one run of the repo's existing read-only export (`scripts/export-settled-picks-for-calibration.mjs`, Beexly/Sports) with `DATABASE_URL` — Garrett's credential, not stored on Motif's VM, never hunted. The day it lands, dataset v2 is built (the export supersedes Tier B with full state + `clvValue`/`clvVerdict`, and the same pass settles the 16 live Week-3 engine readings via the nflverse schedules refresh) and the frozen run starts unchanged. Phase 1 does not wait for it: build and proxy-score now, label honestly, re-run in full when the pull lands.

## Acceptance

The frozen protocol run itself: a published scorecard per candidate × tier × market with CIs, the reliability read, the risk–coverage table, walk-forward blocks, tail table, duplication rate, integrity log — and a verdict per candidate (**SHADOW SEAT / KILLED / INCONCLUSIVE**) tied to the protocol line that decided it. Code lands on the remote (Beexly/Sports, clean branch, file-scoped) per fleet push policy — local-only work did not happen.

Owner: Hermes (builder lane). Protocol owner: Motif. Report the Phase 1 scorecard back in this inbox when it lands.
