# completionProbability confirmed depth-flat at 32 games / 33 rows

Harvested 32 games (weeks 6–7, 2025) through the BOLA path to test the anomaly from the previous note.
Volume stayed tiny: **33 completion rows across 32 games**, ~1 per game, because the surface only populates
for highlight plays.

Result — the flatness is real, not an artefact of ten rows:

- airYards spans 4.4 to 47.5
- completionProbability mean **0.278**, sd only **0.043**
- spearman(airYards, cp) = **0.155, p = 0.39** — no monotone relationship
- binned means: 5–15 yd **0.275** · 15–25 yd **0.285** · 25–50 yd **0.280**

A 47-yard throw and an 8-yard throw are scored the same. In any normal xComp model depth is one of the
strongest terms, so something in this field offsets it almost exactly.

## Two candidate explanations
1. **Tracking conditioning.** `completionProbability` is computed on the tracking frame — separation,
   closing speed, window size. Deep throws in the NFL are thrown to *open* receivers (that is why they are
   thrown), so wide-open deep shots and tight short throws converge. This is consistent with the earlier
   finding that separation dominates our own xComp by an order of magnitude.
2. **Selection.** These are highlight plays. A 40-yard completion is a highlight precisely because it was
   completed; the incomplete deep shots that would drag the deep bin down are under-sampled.

Both point the same way: this is not a usable unconditional xComp, and the flatness is partly a
selection property of the surface rather than a pure model property.

## What it means for use
`completionProbability` is only interpretable **relative to the same play class** — comparing a deep shot to
a screen is not apples to apples in this data. Against BDB's full-population xComp (which rose properly with
depth) the two are measuring different things, and the BDB version is the better forecast model despite
lacking separation.

## Caveats
- 33 rows is still small; p=0.39 rules out a strong monotone effect, not a weak one.
- Highlight selection is unquantified — the base rate of highlight plays per pass is unknown here.
- `ryoe_this_game` returned 0 rows on all 32 games, so the RYOE surface may require a different path.
