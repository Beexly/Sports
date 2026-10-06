# Bridge fit

Logistic regression on leak-free prior features. Fit on 6,955 games from seasons before 2025. 36 earlier games were skipped because a prior feature was missing. All 285 sealed 2025 games emitted a probability. None were clamped. The sample count on every row is 6,955.

2025 Brier of this probability against home wins: 0.2237.

The spread-bucket table scored on the same 285 games had Brier 0.2120. This bridge does not beat that table. It is the first directional probability the trace can read. It is not a claim about a book.

`homeSign` is the sign of each fitted coefficient. Dome and neutral came out negative. The scoring and rest features came out positive. Those signs were not assigned by hand.
