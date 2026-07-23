# TLAPS receipts — NONE EXIST (toolchain unavailable)

No real `tlapm` run exists in this environment. This directory is intentionally
empty of `*.log` certificates.

Real probe result (recorded honestly, not fabricated):

```
$ which tlapm
        (exit 1 — not found)

$ tlapm --version
bash: tlapm: command not found        (exit 127)
```

## Rule

A `*.log` file may be added here **only** from a genuine `tlapm` run that exits
0 and contains a proved `theorem` line. No simulated or hand-written log may be
committed here. Until such a real certificate exists, the load-bearing artifact
is the TLC cutoff matrix under `../cutoff-matrix/` (see
`../../abstract/CUTOFF_CLAIM.md`), and `../../abstract/AtMostOneParam.tla` is an
UNVERIFIED proof target only.

See `../../TLAPS_DEFERRED.md`.
