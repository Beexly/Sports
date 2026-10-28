# Correction — tau_hat is wired, and the real gap is different

2026-10-28. I said twice that tau_hat had "no consumer" and called it "the single highest-value
wire in the repo." That was wrong, and it was wrong because I grepped the TypeScript tree only.

## What is actually true

`tau_hat` is produced, emitted and consumed on the Python side:

- `intelligence/coaching/behavior.py:61` produces it
- `intelligence/context/tau_wire.py` emits it as a context observation
- `intelligence/integration/api.py:29` imports the stamp and the facade receives the observation
- `intelligence/tests/test_tau_gate_wiring.py` and `intelligence/gates/test_phase_wires.py` cover it

**12 tests pass** across those two files. The wiring is real and gated.

## What is actually missing

Two things, both narrower than "no consumer":

1. **The TypeScript prediction path does not consume it.** The only TS reference is
   `packages/data-ingestion/src/forest-hte-diagnostics.ts`, which uses `tauHat` as an input to a
   calibration regression slope — a diagnostic, not a model input.

2. **The stamp says it is a point fit, not a pre-kickoff value.** `TAU_STAMP` reads
   "point fit — not pre-kickoff. 2026 unit cells pool in-season weeks." So the served number is
   fitted on the game's own data. Using it as a pre-kickoff feature without a refit is leakage.

That second point is the real constraint and it was never stated in the plan documents. The
+6.77 held-out figure is a point-fit figure; it does not transfer to a pre-kickoff setting
unchanged.

## Also: the file shape is odd

`intelligence/coaching/data/tau_hat.csv` is 1,524 rows. The `tau_hat` and `n` columns are **empty**
on the rows checked; only `tau_hat_served` carries a value, with `fallback_level` set to `league` or
`league_region`. So the fit columns exist but are unpopulated — the served table is a fallback
table, which is consistent with the stamp but worth knowing before anyone reads `tau_hat` expecting
a fit.

## What this changes

- "Wire tau_hat" is not the job. It is wired.
- The job is: refit to a pre-kickoff basis, then consume it from the TS path.
- Until the refit, any TS consumer inherits the point-fit leakage.
