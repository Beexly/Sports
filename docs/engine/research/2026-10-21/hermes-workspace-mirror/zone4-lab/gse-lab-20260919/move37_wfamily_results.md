# Move-37 W-family lab verdicts (2026-09-19)

OBSERVATION: one ridge per duel, causal features, target = next-game offensive EPA/play.
Filter: REG, pass/run, no kneels/spikes, decided-4Q garbage excluded. Test rows per family below. Split: train 2019-2023, test 2024-2025.

## W5 — Wasserstein play-mix distance to next opponent
- baseline: rolling-EPA(4)  R2=0.074
- family R2=-0.0088 (kill line 0.02)  n_train=2126 n_test=839
- VERDICT: **KILLED**
- LIMITATION: lab implementation of the theorist SPEC; window sizes fixed before running; single season split; features not opponent-adjusted except W5's distance term.

## W6 — DFA exponent of EPA sequence
- baseline: season-to-date mean EPA  R2=0.0979
- family R2=-0.0035 (kill line 0.01)  n_train=2299 n_test=912
- VERDICT: **KILLED**
- LIMITATION: lab implementation of the theorist SPEC; window sizes fixed before running; single season split; features not opponent-adjusted except W5's distance term.

## W7 — intrinsic dim of play-call manifold (Levina-Bickel)
- baseline: distinct play-type count  R2=-0.0076
- family R2=0.0034 (kill line 0.02)  n_train=2299 n_test=912
- VERDICT: **KILLED**
- LIMITATION: lab implementation of the theorist SPEC; window sizes fixed before running; single season split; features not opponent-adjusted except W5's distance term.

## W8 — permutation entropy of EPA sequence
- baseline: dropback rate (pass_oe proxy)  R2=-0.0035
- family R2=-0.0037 (kill line 0.02)  n_train=2299 n_test=912
- VERDICT: **KILLED**
- LIMITATION: lab implementation of the theorist SPEC; window sizes fixed before running; single season split; features not opponent-adjusted except W5's distance term.
