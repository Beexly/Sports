# T7 (persistent homology) — import feasibility check (E.8, 2026-09-15)

**Question:** T7 proposes a persistent-homology / Rips-complex pipeline on the
play-call manifold. The corpus's stated allowed imports for lab execution are
`nflreadpy, scikit-learn, numpy, pandas` — do any of those natively compute a
Vietoris-Rips filtration or a persistence diagram?

**Check performed (not asserted from memory):** attempted import of the three
standard TDA libraries, plus a module-name search across every submodule of
`scipy` and `sklearn` for anything matching `rips`, `persist`, or `simplic`.

```
ripser         -> NOT importable (No module named 'ripser')
gudhi          -> NOT importable (No module named 'gudhi')
gtda           -> NOT importable (No module named 'gtda')          # giotto-tda
sklearn.manifold -> importable (unrelated: Isomap/LLE/t-SNE, not TDA)
scipy.spatial    -> importable (Delaunay/ConvexHull/distance_matrix — building
                     blocks, not a filtration or persistence algorithm)

scipy full-package module-name search for rips/persist/simplic: []  (zero hits)
sklearn full-package module-name search for rips/persist/simplic:  []  (zero hits)
```

**Verdict:** confirmed, not assumed. Neither `scipy` nor `scikit-learn` ships
any module with a Rips-filtration or persistence-diagram API under any name.
`scipy.spatial` provides raw building blocks (pairwise distances, Delaunay
triangulation) that a from-scratch implementation could use, but computing
actual **persistence** (birth/death intervals across a filtration via
boundary-matrix reduction) is a real algorithm, not a function call — nothing
in the allowed-imports list provides it off the shelf.

**Consequence for T7's declared "run last, most expensive, 400-null-run
budget":** before any compute is spent, this needs one of three explicit
decisions from whoever owns T7 next:

1. Hand-roll a minimal Rips/persistence implementation using only
   numpy/scipy primitives (real, nontrivial engineering — likely bigger than
   the rest of T7's stated budget combined), or
2. Request an allowed-imports exception for `ripser` (the smallest, most
   focused of the three TDA libraries — a thin C++-backed wheel, not a large
   dependency) — a scope decision, not an agent-actionable one under this
   lane's constraints, or
3. Kill T7 now on infeasibility grounds rather than after its most expensive
   run, consistent with `AGENTS.md`'s own existing "likely null... do not
   rescue" note on this family.

This check does not itself recommend which of the three — that's an
architect/owner call — it only closes the open question of whether the
computation is possible under the stated constraints as written: **it is
not, without either new code or a new dependency.**
