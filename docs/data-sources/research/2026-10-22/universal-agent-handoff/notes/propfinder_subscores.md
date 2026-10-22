# propfinder — sub-score transforms, solved partially

Follow-up to the exact weight recovery. `pfRating` needs its sub-scores; three are done, one is
partly done, two are approximations.

## gameTotal — SOLVED (shape + bounds)
    value = clamp(100 * (total - lo) / (hi - lo), 0, 100)
It is a clamped linear function of the game total. Bounds vary per market and were fitted two ways
from the 62,217-row snapshot:
  * per (category, line) cell: 24 cells deterministic enough to fit (r >= 0.85, n >= 40),
    median reconstruction MAE 3.69 -> `schemas/pf_gametotal_bounds.json`
  * per category fallback: 31 categories, median MAE 21.8 -> `schemas/pf_gametotal_by_category.json`
    (best are TD markets, MAE ~2; yardage markets are noisy because the player's own line moves
    the natural bounds)
`pf_rerate.py` reconstructs 198 of 200 sampled rows; 2 rows uncovered.

## Hit rates — SOLVED (exact)
    l5HitRate  = hits / 5 * 100        seasonHitRate = hits / sample * 100
Verified earlier on the payload (`0/5 -> 0`, `1/5 -> 20`, `3/5 -> 60`; `1/6 -> 16.67`, `4/6 -> 66.67`).

## matchups — OPEN
`detail` is `Rank n/32`, but the pooled correlation is only -0.05..-0.40 and it is non-monotone in
rank (4 -> 12.5, 10 -> 69, 20 -> 37.5, 27 -> 84.5). Direction flips by category/position, so it
needs a per-position sign and per-category scale fit; not solved.

## l5Avg / seasonAvg — OPEN
Values are mostly 0 or 100 against the player's line, i.e. a saturating function of
`avg - line` normalised per market. The intermediate band is thin, so the transition width is not
identifiable from one snapshot; two snapshots on different days would fix it.

## Bottom line
`pf_rerate.pf_rating()` recomputes a row's rating from its sub-scores exactly; `game_total_value()`
fills the gameTotal sub-score for 31 categories. Full independent regeneration still needs
matchup + avg transforms.
