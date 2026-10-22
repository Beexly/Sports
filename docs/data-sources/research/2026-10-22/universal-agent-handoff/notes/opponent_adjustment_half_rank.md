# Opponent quality does reorder — by half a rank

Previous note said a real adjuster must be something the team does not control and that varies by
opponent, naming defensive quality. Built it: leave-one-game-out defensive strength (mean EPA allowed by
that defence, excluding the game in question, so no leakage), added to the basis.

Result: pearson falls 1.000 -> **0.998**, spearman 0.999 -> **0.995**. The needle moves — barely.

Measured in rank positions across 33 codes:
- mean |shift| **0.48**
- max |shift| **4** (PHI, which improves most)
- **top five identical either way: LAR, BUF, BAL, GB, SF**

## The mechanism, again
Defences also face a near-random mix of offences. Schedule balancing matches the adjustment out at both
ends, so however correct the covariate, it cancels. Rank movement has to come from *unbalanced* exposure:
a team that happens to have played an unusual slate, or a partial-season cut, or scheme-matched
specifics.

## Ledger for primitive #1 (closing this thread)
| basis | pearson vs raw | verdict |
|---|---|---|
| down, dist, score, time | 1.000 | nothing |
| + field position | 1.000 | nothing |
| + interactions, remaining time | 1.000 | nothing |
| + opponent defensive quality (LOO) | 0.998 | ~0.5 rank |

Context-adjusted EPA is a real but near-cosmetic transform on a full season. It becomes informative
only when exposure is unbalanced: mid-season windows, injury-affected stretches, or matchup-specific
splits. Quoting it as a standalone talent metric is indefensible.

## Caveats
- LOO defensive strength is computed from the same season and is itself EPA-based, so it is a relative
  measure, not absolute defence quality.
- 33 codes includes a blank bucket; PHI's 4-place shift sits on n>=200 only.
- EPA sign ambiguity persists across the whole thread.
