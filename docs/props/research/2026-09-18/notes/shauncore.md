# @Shauncore (PFF QB chart) — source notes (read 2026-09-18, index)

- PFF grading system:
  - https://www.pff.com/grades — every player/play graded −2 to +2 in 0.5 increments (0 = expected); position-specific rubrics; situational adjustments; converted to 0–100 across facets (passing, rushing, receiving, blocking, pass rush, run defense, coverage).
  - https://www.pff.com/news/nfl-caleb-williams-pff-grade-explained — every play graded −2..+2; final 0–100 accounts for frequency and magnitude of positive/negative grades.
- Scatter plot (@Shauncore, PFF employee): per-QB positive-play rate vs negative-play rate.
  - Computation (inferred): positive-play rate = count(grade > 0 on QB pass plays) / eligible graded QB pass plays; negative-play rate = count(grade < 0) / same denominator; zeros retained in denominator but in neither numerator. Exact eligibility (dropbacks vs attempts, minimum-attempt cutoff) not documented — label inferred.
- Raw per-play PFF grades = paid/proprietary (PFF Data). Public box-score/PBP cannot reproduce subjective throw/decision grades.
- Public proxy (our own): positive EPA rate / negative EPA rate on QB dropbacks — not a PFF-grade replica.
