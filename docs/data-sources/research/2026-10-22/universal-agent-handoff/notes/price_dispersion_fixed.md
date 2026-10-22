# Dispersion, corrected — the price scale bug is fixed

Earlier cycle flagged propfinder `best_price` cents→American as unverified. It was wrong: `best_price`
is **already American** (-110, 120, -102, 6225 in the raw rows). Dividing by 100 compressed every
price toward zero and manufactured the huge spread and the +0.29 median.

Correction applied: use American directly, and drop |odds| > 2000 (a handful of -100000 / 50000
placeholder extremes). Same join, same sides, same exact-line matching.

## Corrected numbers (3,756 markets)
mean +0.0278 · **median +0.0117** · **std 0.1872** · median |dispersion| **0.0555** ·
IQR −0.0362 to +0.0821 · range −0.6103 to +0.5895.

Before the fix, for contrast: std 0.5412, median +0.2948. So std fell by 65% and the median bias
nearly vanished — the signature of a scale error rather than a real market signal.

## Reading it now
3.8–8.2 points of implied-probability disagreement across the IQR is the right order for two
different products pricing the same contract (and propfinder's row is itself a *best* price across
books, so it should sit short of consensus). A ~5.5-point median absolute gap is usable as a
"who is out of line" screen.

## Standing lesson
`best_price` is American on propfinder. Never divide it. Any future price field gets checked against
the raw distribution before conversion.
