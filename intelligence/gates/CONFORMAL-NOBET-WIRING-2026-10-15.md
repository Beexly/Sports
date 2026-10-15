# Conformal NO_BET wiring — 2026-10-15

Branch: `motif/conformal-nobet-wiring-2026-10-15` (not merged, not deployed).

## What landed

1. **`intelligence/gates/conformal_pass_discipline.py`** — read-path port of
   the seven location-locked conformal wrappers from
   `dfs/walk_forward/conformal_wrappers.py` (branch
   `grok/walk-forward-2026-10-14`). Streaming form: `ConformalCalibrator`
   folds settled games in chronological order and advises on the next one;
   state evolution mirrors the batch scorer (verified by an exact
   per-wrapper equivalence test). `build_advisory(rows, spread_line)` is
   the producer seam. A batch `score_rows` mirroring the research summary
   shape is included for diagnostics.
2. **`intelligence/reasoning_engine/mint_gate.py`** — `mint_after_mind`
   gains a keyword-only `conformal` advisory. The check sits after the
   INVALID / DATA-GAP checks: a NO_BET verdict (or a malformed advisory)
   withholds a would-be pass; a COVERED verdict changes nothing; conformal
   can never upgrade a withhold or mask an INVALID. With no advisory, the
   gate's behavior is byte-identical to before (existing tests pin the
   exact pass dict).
3. **`intelligence/reasoning_engine/run_game.py`** — `reason_game` accepts
   `conformal_advisory=` and passes it to the gate; when supplied, the
   advisory is recorded verbatim on the read as
   `conformal_pass_discipline` so a veto is auditable. When not supplied,
   the read is unchanged.

Tests: `intelligence/gates/test_conformal_pass_discipline.py` (interval
sanity on a deterministic fixture, frozen-record pinning, location lock,
PIT refusal, streaming≡batch) and
`intelligence/reasoning_engine/test_conformal_wiring.py` (structural:
stdlib-only imports, no file I/O in the module, fixed advisory key set,
one-directional gate matrix, run_game pass-through).

## The law, enforced structurally

"Wrappers inform NO_BET only." The advisory's key set is exactly
`{verdict, reasons, widths, alpha, nominal_coverage, calibration_n, law}`:
it carries no center (so no mean can move — `max_abs_mean_shift` is 0.0 by
construction and by test), no price, no pick, no probability. Verdict is
NO_BET unless **every** wrapper forms its interval (fail-closed union:
thin history, quantile-rank overflow with no clamping, Mondrian stratum
n ≤ 5, crossed CQR quantiles, missing scale each veto). Emission is
untouched: the 7.099 gate is carried only as a pinned constant
(`gate_cleared` is False with no code path that sets it), `walk_forward.json`
is never written (the module performs no file I/O at all), and the mint
gate still cannot mint a probability.

## The remaining seam (deliberate, not forced)

`reason_game` has no `spread_line` input and the engine host has no
settled-games calibration store, so no production caller produces
advisories yet. The seam is exactly one producer call:

```python
from gates.conformal_pass_discipline import build_advisory
advisory = build_advisory(settled_rows, spread_line)   # settled_rows: [{spread_line, margin, pit_stamp}]
read = reason_game(..., conformal_advisory=advisory)
```

Closing it needs (a) the game's close (`spread_line`) on the game request
and (b) a settled-history feed (the frozen filter's source is the nflverse
games cache on Hermes' host; the L-14 census found no in-repo settled-line
archive — `odds_line_snapshots` has never persisted a row). Until that
feed exists, wiring a caller would mean inventing data plumbing, so the
path lands here: producer, gate, and read all wired and tested; the feed
is the named gap. This mirrors the archiver-first construction order
(measurement before modeling) set 2026-10-15.

## Drift guard

The research module on the walk-forward branch remains the scoring source
of record for the frozen n=2,462. This port pins its constants
(alpha 0.10, sigma0 13.45, min_prior 25, Mondrian min 5, gate 7.099) and
the published per-wrapper results as test data; a silent retune on either
side fails these tests.
