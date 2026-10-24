# Cross-source price dispersion (propfinder vs Underdog)

Built the first consensus artifact: 4,031 same-side, same-line, same-player markets where two
sources price the identical contract.

Method: id join via crosswalk, same-side mapping (`over`->`higher`, `under`->`lower`), exact line
match, both prices converted to implied probability (`100/(o+100)` for positive, `|o|/(|o|+100)` for
negative), dispersion = p_underdog − p_propfinder.

## Result
mean +0.0252, std 0.5412, median +0.2948, IQR −0.5113 to +0.5210, extremes −0.8545 / +0.8274.
`extracted_data/CONSENSUS_DISPERSION.csv`.

## What the shape says
The spread is enormous — a 0.54 standard deviation in implied probability on the *same contract* is
far wider than book-to-book disagreement should be, and the +0.29 median says it is systematic, not
noise. The worst cells are low lines on yardage markets (`rec_yds 0.5` at p_pf 0.988 vs p_ud 0.134),
which reads as propfinder's `best_price` encoding a different contract than assumed for alternates.

## Caveats, stated plainly
- propfinder `best_price` is in cents and was divided by 100 to American; that conversion is
  **unverified**, and the systematic offset is the evidence it is at least partly wrong. Verify
  against a known-price row before trusting absolute dispersion.
- PrizePicks carries no price (fixed payout), so it contributes presence only, not dispersion.
- Lines were matched exactly, so alternate-line drift is excluded by construction.

Verdict: the join machinery works at 4,031 markets; the price scale needs one calibration pass before
the dispersion numbers mean anything absolute.
