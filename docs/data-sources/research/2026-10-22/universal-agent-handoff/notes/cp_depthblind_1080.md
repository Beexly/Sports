# Settled at 1,080 rows and 3 seasons: completionProbability is depth-blind everywhere

Tried to break the leaderboard cap with filters/paging first — no dice. `limit`, `perPage`, `page`, `offset`,
`position`, `positionGroup`, `team`, `sort` all return the identical 20 rows (`limit` actually 400s). The only
dial is season × week.

So used it: 2023–2025 × weeks 1–18 × completion = **1,080 rows, zero failures** →
`extracted_data/ngs_completion_3seasons.csv`.

## Result
- air yards span 1.9 to 56.8, cp mean 0.259, sd 0.054
- spearman(air, cp) = **−0.023, p = 0.45**
- **per season**: 2023 rho −0.034 (p .53) · 2024 −0.021 (p .69) · 2025 −0.037 (p .49) — all null
- bins: 5–15 yd 0.258 · 15–25 yd 0.265 · 25–35 yd 0.255 · 35–60 yd 0.254

A 56-yard throw is scored the same as a 2-yard throw, and it holds inside every season separately, not just when pooled. At 33× the original sample the finding is no longer provisional: **`completionProbability` carries essentially no unconditional depth signal.**

## Interpretation, now firm
The expectation is dominated by tracking conditioning (separation, closing speed, window) and the highlight
selection compounds it. Depth and openness trade off almost exactly, so the depth term cancels. Consequences:
use it as a play-class-conditional probability only, and keep the BDB context-conditioned xComp as the forecast
default.

## Why this shape of evidence matters
The first version of this finding was 10 rows and looked like noise; 33 rows and 140 rows could still be argued
away. The three-season grid removes the argument by holding within each season and across 1,080 plays — and the
absence of pagination was the thing that had to be worked around to get there.

## Caveats
- Still leaderboard-ranked, so still highlight-enriched; the cap is 20/week regardless of week size.
- Weeks 1–18 only, regular season; no postseason sampled.
- `cp` sd is 0.054, so small genuine effects under ~0.01 remain invisible at this n.
