# Surgery vs feedback edge set

## Claim
Minimal restriction-map surgery (fewest angle edits to restore CRC-flatness) is **not** in general equal to a minimum feedback edge set (FES) of the undirected graph.

## Why
- FES is a combinatorial property of the **graph** (break all cycles).
- Surgery is a linear-algebra property of the **connection** on cycles (solve Cθ ≡ 0 mod 2π).
- A graph can require many FES edges while a single well-chosen θ-edit kills all cycle residuals (or vice versa on non-abelian / constrained edits).

## CRC implication
Propose `relax_restriction` using residual / localization scores on the cycle-edge incidence system — not undirected min-FES heuristics alone.

## Status
Documented; abelian surgery path implemented in `core/surgery.py`.
