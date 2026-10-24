# Is 2.9867 actually the league average? Observed is 0.23–0.26 higher

Squared the baseline against data. Observed mean separation on targeted receivers (>=3 targets):

| season | n | observed | claimed | diffBrains | t-test p |
|---|---|---|---|---|---|
| 2025 | 173 | 3.212 | 2.9867 | **+0.226** | **0.029** |
| 2024 | 84 | 3.250 | 2.9867 | **+0.263** | 0.071 |

Both samples sit above the constant, 2025 significantly. So the constant is *not* the mean of this subset.

## The defensible reading: our filter is the reason
We only see receivers with >=3 targets, i.e. players who earned the ball. Targeted receivers are the ones
winning, so a selection-justified upward shift is expected — roughly a quarter yard. The constant may well be
correct for the full population including never-targeted routes, which this endpoint does not expose for us.

So the finding is not "the vendor's number is wrong". It is **"the constant and this sample are not on the same
base"**, and that has a concrete consequence.

## Consequence for residual work
Residual level is denominator-dependent. Recentring on the observed means instead of the constant:

- TE: 2025 +1.00 -> **+0.78**, 2024 +0.98 -> **+0.72**
- WR: −0.09 -> **−0.32**, −0.01 -> **−0.27**

Ordering and both signs are fully preserved across two seasons, so conclusions do not move; but every magnitude
shifts by about 0.2 and TE/WR gap compresses from ~1.09 to ~1.10 (same) while individual levels compress
toward zero. Anyone quoting "TE separation is a yard over league average" should say *which* league average.

## Caveats
- Recentring on a selected sample and calling that average is itself biased by the same filter.
- 2024 t-test does not clear p=0.05, so the gap is firm only in 2025.
- Neither reading is decisive without the untargeted routes; the honest position is that the denominator needs a
  population-matched recomputation before residual levels are quoted as absolutes.
