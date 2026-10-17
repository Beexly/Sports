# The eight assumptions — final scorecard (2026-10-14, all verified against the tree)

Every assumption in the founder's list was tested, not argued. This is the closing state, with the
evidence artifact for each.

| # | assumption | verdict | evidence | remaining |
|---|---|---|---|---|
| 1 | Identity is the bottleneck | **HALF-CLOSED** | `pbp_participation_2025.parquet` landed: play_id + gsis_id + jersey numbers per play, 45,184 plays. Closed-loop proof ran (`prove_closed_loop.py`): Lamb #88 → gsis → EPA +0.3443 → shadow rows 0→0.35 on explicit flag, rogue refused. | 2026 participation not yet released upstream (404 verified); jersey OCR engine not instantiated; footage rights = founder decision |
| 2 | Gate too strict — nothing crosses | **MEASURED + PATH BUILT** | 1/12 ledger rows crossed (the proof play). Falsifier dry-run protocol documented with exact inputs; calibration half dry-runnable today | Final `validation_spec_met` needs real footage tracklets |
| 3 | Tracking is geometry, not intent | **UPGRADED** | `intent_beliefs.py`: P(route\|down,dist), P(coverage\|down,dist), P(pressure\|rushers), P(route\|coverage) from 45k real plays; 13 cells | Called play + QB check tree remain unpublished keylessly — documented ceiling |
| 4 | Displayed prices, not order book | **CONFIRMED STRUCTURAL** | null-coverage audit: depth/limits 100% null on Kalshi AND Action Network; dispersion across 6 books is the live signal | Paid feeds or exchange membership; not solvable keylessly |
| 5 | Physio/fatigue absent | **MEASURED** | injuries weeks 1–5 w/ labeled fallback; `time_to_throw` 57% null, `was_pressure` 0% null (participation) | Real-time tissue state doesn't exist keylessly; next best = DNP/Limited timestamps at higher frequency |
| 6 | Counterfactuals not in training loop | **CONFIRMED, PREREQ BUILT** | intent_beliefs = empirical transition tables (the thing a causal layer intervenes on) | Intervention engine not built; the belief priors are its input layer |
| 7 | Calibration claimed, not shown | **SHOWN** | `reliability_baseline.py` on 5,226 closing-moneyline sides: log-score −0.6162 (2015-23) vs −0.5867 (2024-25), Brier 0.2139 vs 0.1999, 10 buckets, miscalibration ≤4.3pp. JSON landed. | Film-signal before/after on identical games awaits the dry-run crossing |
| 8 | Latency unmeasured | **HALF-MEASURED** | `latency_audit.py`: acquisition lag across 7 artifacts, median 0.0 min, max 0.3 min. Schema for event/update/price stamping defined. | event→update and update→market-move legs need emitter self-stamping + higher-frequency line captures — both code, not data |

## The founder's summary line, updated

Was: *"sensors installed, decision layer unchanged."*

Now: **sensors installed, identity loop closed for 2025, decision layer reasoning at L5 with named
gaps, calibration baseline shown, acquisition latency instrumented.** The remaining distance to
"sensors change published numbers" is exactly three things, in order:

1. **Run the falsifier dry-run** (protocol documented; scoring function + real 2025 labels + market
   spreads all on disk). Output: whether the scoring function calibrates at all.
2. **Self-stamp the emitter** (event→update lag leg; small code change).
3. **Footage rights** (founder decision; unlocks the geometric half of the falsifier and jersey OCR
   in production).

Everything else on the list is either closed, measured-and-structural (order books), or blocked on a
decision rather than a discovery.
