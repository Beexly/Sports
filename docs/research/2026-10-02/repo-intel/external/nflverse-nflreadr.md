# nflverse/nflreadr — Dossier

**Stars:** 115 (verified 2026-10-02) · **Language:** R · **Pushed:** 2026-09-17 (alive) · **Created:** 2021-07-10

## 1. Vision
The R-side twin of the loader story: a minimal, CRAN-distributed package that downloads nflverse data with caching, progress updates, and built-in data dictionaries. The "stable" (CRAN) counterpart to nflreadpy's "experimental" label.

## 2. The Ask
R; `install.packages("nflreadr")`. Recommends v1.2.0+ for the nflverse-data release reorganization.

## 3. Constraints
- **License: NOASSERTION on the API** (unclear SPDX) — same caveat as nflfastR; data is CC-BY-4.0 via nflverse-data, code license ambiguous.
- Lifecycle: stable; CRAN-distributed; Codecov-tracked tests.

## 4. GSE lens
Less interesting than nflreadpy for a Python engine, but it reveals one sharp point: **the data-dictionary discipline**. nflreadr ships `field_descriptions` — a column-level schema document inside the package. GSE's 47-signal registry is conceptually the same artifact but with zero producers wired: a dictionary with no data behind it. nflreadr proves the value ordering is *data first, dictionary rides along*; GSE built the dictionary first. Until producers wire in, the registry is a wishlist, not an asset — and every week it sits unwired, calibration work built on top of it is calibrating a fiction.

## 5. Verdict
**IGNORE** (for code) — GSE is Python; nflreadpy covers the loader need. Note the data-dictionary pattern as already absorbed via the registry concept.

## 6. The 4 tricks
- Codewiki: https://codewiki.google/github.com/nflverse/nflreadr
- Gitdiagram: https://gitdiagram.com/nflverse/nflreadr
- Star history (115 stars): https://star-history.com/#nflverse/nflreadr
- github.dev: https://github.dev/nflverse/nflreadr
