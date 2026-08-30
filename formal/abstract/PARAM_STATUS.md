# Parameterized-target status

## Target

A TLAPS deductive theorem, over an **arbitrary finite** invocation-id set:

```
ASSUME IsFiniteSet(InvIds)
THEOREM SpecC => []AtMostOne          (AtMostOneParam.tla)
```

## Current status: UNVERIFIED (deferred)

`tlapm` / TLAPS is **not available** in this environment — real probe: `which
tlapm` exits 1, `tlapm --version` → `command not found` (exit 127). No
`formal/receipts/tlaps/*.log` exists, so this target is **not** machine-checked.
`AtMostOneParam.tla` carries a loud "UNVERIFIED PROOF TARGET" header and must
not be cited as a proof. See `../TLAPS_DEFERRED.md`.

## What IS load-bearing right now

The finite TLC **cutoff matrix**: `AtMostOneFamily.tla` model-checked for
`|InvIds| = 1 .. N*` with **N\* = 8**, every member `No error has been found`.
See `CUTOFF_CLAIM.md` and `../receipts/cutoff-matrix/summary.txt`
(`N_STAR=8`, `CUTOFF_MATRIX_OK`).

## NON-CLAIM (without a real tlapm log)

This package does **not** certify the property for arbitrary cardinalities. The
cutoff matrix is finite evidence to N\* = 8; the parameterized statement remains
an unverified target until a genuine `tlapm` certificate exists. The runtime
`pendingCountClass ∈ {ZERO, ONE, GE2}` matches the quotient domain either way,
but that correspondence is descriptive, not a proof.
