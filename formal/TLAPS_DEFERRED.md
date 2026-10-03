# TLAPS — DEFERRED (toolchain not available here)

## Status

**TLAPS: no.** `tlapm` / TLAPS is not present in this CI/dev image and no
Isabelle/TLAPS certificates exist. Real probe (recorded, not fabricated):

```
$ which tlapm            → (exit 1, not found)
$ tlapm --version        → bash: tlapm: command not found   (exit 127)
```

No `formal/receipts/tlaps/*.log` exists. See
`formal/receipts/tlaps/README.md`.

## Rule (hard)

- **Never commit simulated or hand-written `tlapm` logs.**
- A STATUS line anywhere in this package may read **"TLAPS: yes" ONLY if**
  `formal/receipts/tlaps/*.log` exists from a **real** `tlapm` run that exits 0
  and contains a proved `theorem` line. Absent that, STATUS is "TLAPS: no /
  deferred".

## What would be proved when the toolchain is available

The parameterized safety theorem in `formal/abstract/AtMostOneParam.tla`:

```
ASSUME IsFiniteSet(InvIds)
THEOREM SpecC => []AtMostOne
```

via the inductive invariant `Inv == TypeOK /\ AtMostOne`, whose inductive step
is trivial for the controlled system: `StartControlled` only ever writes `ONE`
and `End` only ever writes `ONE`/`ZERO`, so `GE2` is never introduced — at any
finite `|InvIds|`. That module is an **UNVERIFIED PROOF TARGET** today (loud
header in the file); do not cite it as a proof.

## Toolchain scaffold

`formal/docker/Dockerfile.tlaps` is a **stub only** (no build, no run). The
owner pins `tlapm` / `zenon` / `Isabelle` versions there before any real run.
Its existence is not evidence of a proof.

## NON-CLAIM

The absence of TLAPS does **not** invalidate the finite TLC cutoff receipts.
The TLC cutoff matrix (`formal/abstract/CUTOFF_CLAIM.md`,
`formal/receipts/cutoff-matrix/`) is real, exhaustive per cardinality, and
load-bearing for `|InvIds| ≤ N*` (N\* = 8). The TLAPS ∀-finite-InvIds result is
a deferred deductive target, not a claim made here.
