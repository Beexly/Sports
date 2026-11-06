# DOCTRINE_19 — THE 19 RULES AS CODE
**2026-10-10 · artifacts: `doctrine.py` + `doctrine_selfcheck.py` (19/19 PASS)**
Enforcement standard: every rule is a class/function that physically REFUSES violation. No rule lives in a docstring alone. Self-check battery attempts a live violation for each rule where a violation is even writable.

---

## The map

| # | Rule | Artifact | Enforcement point (code) | What it refuses |
|---|------|----------|--------------------------|-----------------|
| 1 | Point-in-time warehouse, observed_at ≤ t | `Warehouse` | `append()` (stamp mandatory, parse-verified) · `asof(t)` (the ONLY read path) | future-row leak; unstamped rows |
| 2 | Pinnacle close = permanent anchor | `Anchor` | `propose_mu(candidate, verdict)` | replacing μ without a PROMOTED verdict on the intact manifest |
| 3 | College fit on college rows | `CollegeGuard` | `validate()/require_clean()` | NFL constants by **key** (`nfl_*`) or by **value** (13.45, 13.19, 1.56, 70.9/37.7/41.7, 51/26/22 — ±2% tol) |
| 4 | PFR 7-surface diagnostic | `FeatureRegistry` role | `declare(role='diagnostic')`; `margin_head_inputs()` returns production only | PFR features reaching the margin head pre-kill-test |
| 5 | FTN fingerprints diagnostic | `FeatureRegistry` role | same | motion/RPO/drop-when-catchable z's as forecast inputs |
| 6 | Shin closed-form devig; pools by calibration | `devig()` + `CalibrationLedger.pool()` | dispatcher: Σ>1 → shin; Σ<1 → multiplicative ONLY; pool weights require recorded calibration history | volume-weighted pools; uncalibrated books getting a vote |
| 7 | Injury latency hard bound | `LatencyTracker.record(hard_bound_s=…)` | bound blown → raise; row-before-report → raise | silently ingesting stale injury rows |
| 8 | Weather/rest = context | `FeatureRegistry` role `context` | excluded from `margin_head_inputs()` by construction | wind −0.197 / HFA 1.56 becoming coefficients pre-gate |
| 9 | CLV ledger primary honesty | `CLVLedger` + `promotion_check()` | promotion requires PROMOTED verdict **and** non-negative live CLV (n ≥ min) | backtest-alone promotion |
| 10 | ADP = rankings diagnostic only | `ADPGuard` | `feed(head)` whitelist = {rankings_diagnostic}; every other head raises | MFL/FFC/Sleeper/DK/UD z's touching win_prob/rating/margin — **enforced in code, not docstring** |
| 11 | Novig = reference, never close | `Anchor.set_close()` | source lock: only `'pinnacle'` accepted | Novig/consensus/any non-Pinnacle source anchoring μ |
| 12 | Scheme splits = observed frequencies | `FeatureRegistry` role | same as 4/5 | run-gap/man-zone/blitz labels as scheme "labels" or margin inputs |
| 13 | Coaching features countable + kill-recorded | `FeatureRegistry` + `KillLedger` | `demote_to_kill()` writes the ledger entry; `why(feature)` for the next person | challenge counts/DC aggression pre-clearance; silent demotions |
| 14 | Fatigue measured, not assumed | `FeatureRegistry` role | same as 4/5 | quarter-by-quarter curve inventing a coefficient |
| 15 | Calibration reported, founder gate | `FounderGate` | `report(n, brier, ece)` → green only if n≥100 ∧ Brier≤0.22 ∧ ECE≤0.05; `can_flip_production()` needs **3 consecutive** green | flipping a production gate on 1–2 runs or soft metrics |
| 16 | Kill ledger append-only | `KillLedger` | JSONL, hash-chained (`prev_sha→chain_sha`); **no delete/clear verb exists**; `verify_chain()` detects rewrite | deleting history; editing a failed test to "passed after the fact" (tamper test proves detection) |
| 17 | Latency measured; after-t worthless | `LatencyTracker.usable()` | static check: observed_at ∈ [report, t] else False | counting a fast row that missed decision time |
| 18 | σ tested, not assumed | `Anchor.propose_sigma()` | PROMOTED verdict whose sha covers the exact σ proposal | inventing σ; proposing σ with someone else's verdict |
| 19 | Honesty gate unbypassable | `HonestyGate` | manifest frozen by sha256 at construction; `evaluate()` refuses on tamper (RuntimeError); every `Verdict` carries (gate_id, manifest_sha, candidate_sha); Anchor cross-checks all three | modified walk-forward list; forged verdicts; invented numbers |

## The refusal chain (how nothing leaks)

```
raw data ──stamp──▶ Warehouse(observed_at) ──asof(t)──▶ features
features ──declare──▶ FeatureRegistry(role: diagnostic|context|production)
diagnostic ──beat Gaussian-close CRPS on FROZEN walk-forward──▶ HonestyGate PROMOTED verdict
verdict + non-negative live CLV ──▶ FeatureRegistry.promote() ──▶ margin_head_inputs()
fail at any point ──▶ KillLedger.append(test, result, reopen_condition)  [append-only, hash-chained]
```

The only way a feature enters the margin head is `FeatureRegistry.promote()` with a gate verdict whose sha covers it, on a manifest that still hashes true, plus a live CLV record. Every other path raises. One invented number is still sabotage — and now it is also impossible.

## Verdict evidence (self-check battery, 2026-10-10)

```
[PASS] rule  1  point-in-time warehouse (future leak + missing stamp)
[PASS] rule  2  anchor: mu stays Pinnacle close until gate PROMOTED
[PASS] rule  3  college guard: no NFL constants by key or by value
[PASS] rule  4  PFR surfaces diagnostic until kill test clears
[PASS] rule  5  FTN fingerprints diagnostic
[PASS] rule  6  devig: shin primary / mult sub-1 only / calibration pools
[PASS] rule  7  injury latency hard bound
[PASS] rule  8  weather/rest = context role enforced
[PASS] rule  9  CLV ledger; backtest-alone promotion refused
[PASS] rule 10  ADP isolation: feeds rankings_diagnostic ONLY
[PASS] rule 11  Novig reference, never the close
[PASS] rule 12  scheme splits diagnostic
[PASS] rule 13  coaching features + kill-recorded demotion
[PASS] rule 14  fatigue curve diagnostic
[PASS] rule 15  founder gate: 3 green runs, metric floors
[PASS] rule 16  kill ledger append-only + tamper-evident
[PASS] rule 17  latency after t = worthless
[PASS] rule 18  sigma proposals require PROMOTED verdict coverage
[PASS] rule 19  honesty gate: manifest tamper voids; forged verdicts refuse
19/19 rules enforced in code. THE GATE HOLDS.
```

## Integration notes (wiring the stack, not restating the wish)

- `build_stack(walk_forward, kill_path)` returns the fully wired enforcement object
  (`gate, kill_ledger, registry, founder, clv, adp, latency, college, calibration_ledger`).
  The walk-forward list is frozen at build time — freeze it from the locked fold list and
  commit its sha alongside the kill ledger.
- `Warehouse.raw()` exists for physical-store access only; any model read path must go
  through `asof(decision_t)`. Reviewers: grep for `.raw(` — each hit needs justification.
- Shin devig here is the two-outcome Štrumbelj closed form
  (π*ᵢ = (√(z² + 4(1−z)πᵢ²/Σπ) − z)/(2(1−z)), bisection on z) — same method verified
  in engine_math; this is the enforcement wrapper, not a second implementation to keep in sync.
- The kill ledger file (`kill_ledger.jsonl`) is committed ON the bus with the code, so the
  chain sha is verifiable by anyone holding the repo.
- CRPS metric in the gate = closed-form Gaussian CRPS; candidate models expose
  `predict(fold) -> (mu, sigma)` and `identity() -> dict` (the identity binds the proposal).

## Doctrine held

No production scoring happened. No accounts touched. No auth bypass. These are
enforcement artifacts — they make the next violation a stack trace instead of a mistake.
