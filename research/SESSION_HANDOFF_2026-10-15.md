# SESSION HANDOFF — 2026-10-15

## State at handoff

- **Repo:** `C:/Users/Garrett/Sports-wt-wf-cvi`
- **Branch:** `grok/walk-forward-2026-10-14`
- **HEAD:** pushed, local == origin (see git log for the SHA at time of writing)
- **Gate file:** `dfs/walk_forward/walk_forward.json` — **NOT TOUCHED**, `passed = False`
- **Emission:** ZERO_OBJECT (0 picks / 0 parlays / 0 DFS)
- **Processes:** ALL STOPPED. Two background jobs killed at user request.

## Locks (do not re-litigate)

- μ ≡ `spread_line`, nflverse sign. Never flipped. Flipping costs 3.28 CRPS.
  Mean of every predictive distribution must match the line to <1e-12.
- Frozen filter: REG 2017 W1–2026 W5, **n = 2462**. Gaussian σ=13.45 baseline
  **7.154021**. Reproduce it before scoring anything, or stop.
- Gate: **CRPS ≤ 7.099** on n ≥ 150.
- PIT: expanding window only, fitted on strictly prior rows. <25 prior rows
  forces β=0 and flags the row.
- Full-filter ΔCRPS ≥ 0 is a **terminal refusal**. Solos separately; joint only
  after ≥2 solos improve, then **one** fit and **one** score.
- Never modify `walk_forward.json`. The 855-game manifest is a different
  universe; label it if mentioned.

## Measured results (all on the frozen filter)

| Construction | CRPS | Δ vs 7.154021 | Verdict |
|---|---|---|---|
| Fixed Gaussian σ=13.45 | 7.154021 | — | baseline |
| cell-conditional scale | 7.214407 | +0.060386 | REFUSED |
| keynumbers p3=.00 p7=.10 | 7.157894 | +0.003873 | REFUSED |
| keynumbers p3=.10 p7=.05 | 7.160837 | +0.006817 | REFUSED |
| keynumbers p3=.15 p7=.08 | 7.184855 | +0.030834 | REFUSED |
| keynumbers p3=.05 p7=.03 | 7.149491 | −0.004530 | improves, misses gate |
| rest-modulated scale | 7.151636 | −0.002384 | improves, misses gate |
| **model-free empirical oracle** | **7.164250** | +0.010229 | **worse than Gaussian** |
| hetero-Gaussian on \|S\| (solo) | — | −0.005978 ± 0.003762 | improves solo |
| hetero-Gaussian on total (solo) | — | −0.012282 ± 0.004718 | improves solo |
| symmetric-pair asym Laplace (solo) | — | −0.001540 ± 0.007004 | improves solo |
| **JOINT σ=13.45·exp(β_S·\|S\|/10 + β_T·T/44)** | **7.142622** | **−0.011398 ± 0.004757** | **t=−2.40, misses gate by 0.0436** |

Joint detail: **β_S = 0.000 on 1,456 of 2,462 rows.** Spread magnitude adds
nothing once total is in the model. All signal is β_T (negative — higher totals
narrow the residual). Fitted β_T values: −0.084 (644 rows), −0.091 (503 rows).

## The two headline negative results

**1. The model-free empirical residual distribution scores WORSE than the fixed
Gaussian** (7.164250 vs 7.154021). Conditioning on spread and total adds no
exploitable conditional structure. (`entropy_floor.py`)

**2. The paired observable scan found 0 of 8 columns help, all deltas positive.**
An earlier scan claimed 7 observables beat the Gaussian and 5 cleared the gate.
That was **selection bias** — the oracle scored only 122–1871 of 2462 games
because thin cells were skipped, then compared against a Gaussian scored on all
2,462. Retracted. (`observable_scan_fair.py`)

Corroboration from the corpus: WIRED (arXiv:2608.12998) — "WIRED-full is NOT the
overall winner; the Gaussian-copula bootstrap baseline has the best average
CRPS." Its ablation shows equal weights beat adaptive CRPS-weighted experts by
−0.00039 ± 0.00015, the same noise-scale margin seen here.

## 7.129681 — the phantom contract number

20 repo references. **Every one is either a reproduction TARGET or a record of
the reproduction FAILING** (off by 0.008249). No construction is documented
anywhere. Also absent from all 1,557 arxiv digests. Treat as never measured.

## Ledger trap — read before claiming any clear

`dfs/kill_ledger_freshness.jsonl` has 154 rows and exactly **2 with
`passed: true`**:
- `LR-20261014-WF-MODELS-MIX-T-KEYNUM`
- `LR-20261014-WF-MODELS-MIX-T-KEYNUM-SYM`

Both are labelled *"INFRASTRUCTURE PASS (diagnostic; provisional; not promoted)"*
with `label=DIAGNOSTIC`, `promotion=NONE`. Both scored on the **570-game
manifest**, not the frozen filter. Their nflverse cross-checks are
**7.1376–7.2215 — all above the gate.** The second is explicitly superseded by
`LR-20261014-WF-RELABEL-NOT-CLEARED`, whose own verdict says "REFUSED (NOT
CLEARED: technical pass on manifest only; nflverse cross-check above 7.099;
best-of-8 selection)."

**Any future claim of a gate clear must name the filter, the n, and the
cross-check.** A grep for `"passed": true` finds two things that look like
clears and are neither.

## Bugs found and fixed this session (each is now test-pinned)

1. **Dropped `E|X−X'|` from the energy form** → key numbers scored 7.43–8.02
   instead of ~7.15. Now imports the tested `hybrid_crps` module.
2. **Fed a Laplace scale into a Gaussian CRPS as σ** → corrected by
   `σ = b·√(π/2)`.
3. **Mismatched objective in the heteroscedastic fitter** — minimised a
   Laplace-scale objective while scoring Gaussian. No shared optimum, so the
   grid search had no gradient and returned β=0 on all 2,462 rows. **A refusal
   and a bug look identical in the output**; this would have been logged as a
   false refusal. Fixed by making the objective identical to the scorer and
   vectorising with a running sum (O(n²·grid) hours → O(n·grid) seconds).
4. **Student-t CDF double-counted the tail** (sign applied outside
   `0.5·(1+I_x)`) → CRPS 397 instead of ~3.87. Corrected form verified against
   250k-draw Monte Carlo (closed 3.839 vs MC 3.897, ν=5).
5. **A docstring claimed Laplace CRPS at its centre is b/2** — true value is
   **b/4**. Confirmed by 200k-draw Monte Carlo.
6. **A first-draft asymmetric-Laplace CRPS contained terms multiplied by 0.0**
   — fabricated algebra. Replaced with the closed form.
7. **My own test asserted atoms always raise CRPS.** False — they help near the
   key numbers (−0.19 at y=0) and hurt in the tail (+0.24 at y=20). Test
   corrected; the code was right.

## Corpus coverage — honest accounting

- **Measured true size:** 1,554 remote branches; 5,547 files under `docs/`;
  `docs/arxiv-program` alone is 1,707 files (1,557 markdown paper digests).
- **Actually read this session:** ~600 files. **The corpus is NOT fully swept.**
- `fulltext-cache.tar.gz` (23.9 MB) and the 3.8 MB phase2 artifact inside
  arxiv-program are **still unexpanded**.
- Examined and dismissed as not engine material: the 183 MB `.crdownload`
  (truncated personal photo archive — salvaged 183 MB inner `Turner` zip, zero
  engine terms), `TzL96JxMOqA0GchR-grok-workspace.zip` (web app),
  takeout Gemini exports (research prompts, no new math),
  `SOURCE-2026-09-12-deepseek-ground-truth-batch-*.md` (web-builder intel), and
  the claimed ~128k-file shadow corpus (all nine named dirs absent on this
  machine).

## Live market capture — WORKING, new observable class

CLV and line movement were **provably uncomputable** from disk: archived
Pinnacle snapshots hold 911 unique matchupIds and **zero** appear at two
timestamps. Now fixed via direct ESPN scoreboard captures (no browser, no auth):

- `scripts/capture_market.py` — snapshot with real timestamps
- `scripts/capture_loop.py` — repeat with a min-gap guard
- `dfs/walk_forward/line_movement.py` — open/last/move per event

**Status at kill: 14 events, 4 timestamps each, all with spread and total.**
All 14 currently show move = 0.0 across ~4 observations over ~50 minutes.
Lines were static on this board during the capture window.

**Report discipline:** single-timestamp events are reported **UNMEASURABLE**,
never as "no movement." That distinction is why the earlier CLV work was invalid.

## BLOCKERS — need the user

1. **All subagents failed with HTTP 402** ("can only afford 12,804 tokens") on
   `deepseek/deepseek-v4.1-flash`. Workaround used: mined corpora directly with
   `scripts/mine_arxiv_digests.py`. Working alternative verified: **`claude-haiku-4.5`
   on the Experimental Labs key** (`api.experientiallabs.ai`, `x-api-key` header
   for `/v1/messages`, Bearer for `/v1/models`) — 294 aliases, returns 200.
   Note `claude-haiku-5-5` is NOT granted to that key; `claude-haiku-4.5` is.
2. **The gate question is a modelling decision, not a search problem.** Every
   σ-shaping construction plateaus at 7.13–7.15. Closing 0.0436 needs either new
   observables or a revised target. Needs a human call.

## Next concrete steps (in priority order)

1. **Finish `pit_round2.py`** — the run was killed mid-candidate-3. Four
   families unscored: integer-support discretized Gaussian, hetero-Gaussian +
   key-number overlay, Student-t (ν fit on prior), empirical-quantile scale on
   total. Student-t is slow (~20 min) because it is a 2,401-point numerical
   integral per game; precompute the ν-fit on a bounded prior window or drop the
   grid to 3 points if runtime matters.
2. **Expand the market capture window.** Four observations showing zero movement
   is not evidence of no movement — capture across a longer window and around
   kickoff, when lines actually move.
3. **Sweep the arxiv fulltext cache** (23.9 MB) and the unexpanded phase2
   artifact — the largest untouched research body.
4. Consider a **spline/non-parametric scale on total only**, since β_S collapsed
   to 0 and the total is the only signal-bearing observable.

## Files added this session

```
dfs/walk_forward/gse_location_locked_harness.py   location-locked harness, 18 tests
dfs/walk_forward/test_gse_location_locked_harness.py
dfs/walk_forward/entropy_floor.py                 model-free oracle
dfs/walk_forward/observable_scan.py               SUPERSEDED (biased)
dfs/walk_forward/observable_scan_fair.py          paired, retracts the above
dfs/walk_forward/line_movement.py                 open/last/move
dfs/walk_forward/pit_candidates.py                solos
dfs/walk_forward/pit_joint.py                     the one joint
dfs/walk_forward/pit_leak_test.py                 4/4 PIT leak tests
dfs/walk_forward/pit_round2.py                    INCOMPLETE, no results
dfs/walk_forward/pit_round2_partial_log.txt
dfs/walk_forward/archive_triage_2026-10-14.json
dfs/walk_forward/calibration_wiring_audit.json
dfs/walk_forward/archive_recovery_2026-10-14.json
dfs/walk_forward/arxiv_corpus_evidence.json
scripts/capture_market.py
scripts/capture_loop.py
scripts/mine_arxiv_digests.py
research/crps-status-2026-10-15.json
packages/prediction-engine/src/signal-registry.ts       47 signals
packages/prediction-engine/src/__tests__/signal-registry.test.ts
```

## Signal registry

`packages/prediction-engine/src/signal-registry.ts` — 47 signals across 9
classes, exported from the package barrel. Every `emissionWeight` is 0 because
no signal has a measured CRPS improvement. `decideEmission()` returns the
0-object unconditionally on `walk_forward.json.passed`, so a future nonzero
weight cannot open emission by itself. Provenance, sign-convention, and
duplicate-id checks fail at construction. 29 tests pass, tsc clean.

Calibration wiring audit (measured): 81 calibration branches → 25 modules →
**only 10 wired**; 15 are test-only and never shipped; 5 wired modules
(`cvap`, `ivap`, `pav`, `aggregation`, `local-isotonic-patch`) have **no test at
all**. Those 5 were NOT wired further.

## Do not claim

- Do not claim the gate was cleared. It was not, by 0.0436.
- Do not claim `pit_round2.py` produced results. It was killed; nothing in it is
  a measurement.
- Do not claim the corpus is fully swept. ~600 of ~6,000 files read.
- Do not claim line movement is zero. It is 0.0 over 4 observations on a static
  board, which is UNMEASURABLE-at-this-resolution, not a null result.
- Do not cite either `passed: true` ledger row as a gate clear.
