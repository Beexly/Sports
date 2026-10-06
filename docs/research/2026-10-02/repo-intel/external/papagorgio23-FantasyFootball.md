# papagorgio23 / FantasyFootball

- **Stars:** 15 | **License:** MIT | **Pushed:** 2024-05-06 (sporadic) | **Lang:** Jupyter Notebook (R + Python versions)

## Vision
A teaching-oriented daily fantasy lineup optimizer: formulate the salary-cap problem as a linear program (`max f'x s.t. Ax ≤ b`), solve with Rglpk (R) or a Python port, from a chapter of the author's "Applied Sports Analytics" book. Exists to teach the math, not to win contests.

## The Ask
- R + Rglpk, or the Python notebook port. User supplies weekly prices + projections CSVs (Yahoo daily data in the example).

## Constraints
- MIT — adoptable. But it's a textbook example: single lineup, no stacking rules, no ownership, no multi-entry, no contest-type awareness.

## GSE lens
No gap revealed — this is the "hello world" that GSE's existing optimizer already surpasses. Its value to GSE is as a **readability benchmark**: the entire optimizer is one notebook a beginner can follow. GSE's optimizer should be documented at least this clearly for the next agent that touches it (the two-host rule means the coding agent's Windows box may not even have the current optimizer — a one-notebook reference implementation would survive that). Also a reminder that GSE's optimizer has no live slate feed while even this toy expects the user to bring weekly prices — **GSE's optimizer is currently less usable than a textbook example** because it falls back to a sample slate.

## Verdict
**IGNORE** as a tool (GSE's optimizer is ahead); **note the documentation standard** — a one-notebook readable reference is worth building.

## The 4 tricks
- CodeWiki: https://codewiki.google/github.com/papagorgio23/FantasyFootball
- GitDiagram: https://gitdiagram.com/papagorgio23/FantasyFootball
- Star history: https://star-history.com/#papagorgio23/FantasyFootball (15 stars)
- github.dev: https://github.dev/papagorgio23/FantasyFootball
