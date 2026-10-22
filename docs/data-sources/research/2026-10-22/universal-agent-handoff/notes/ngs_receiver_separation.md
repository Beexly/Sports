াভ# BREAKTHROUGH 2: gamecenter overview serves per-receiver separation, cushion, air yards

`/api/gamecenter/overview?gameId=` returns `receivers.{home,visitor}[]` where each receiver carries
`receptionInfo.{avgSeparation, avgCushion, avgAirYards}` — real tracking-derived contextual values — plus a
**league baseline** `receivers.leagueAverageReceiverSeparation.avg = 2.9867`.

That baseline is the thing the scalar Ghosts work was missing: an explicit denominator for separation
residuals, supplied by the vendor rather than refitted.

Harvested 236 rows across 24 game ids (8 ids in each slate are non-existent, returning 400) to
`extracted_data/ngs_receiver_separation_2025.csv`.

## Findings on 173 receivers with >=3 targets
- separation mean **3.212**, sd 1.347 (league baseline 2.9867)
- cushion mean 6.04 yd, depth of target mean 9.71 yd
- **TE separation +1.003 over league, WR −0.091** (TE n=50, WR n=123)
- corr(separation, cushion) = **0.113** — near-independent

## Two things worth stating plainly
1. **Tight ends run far wider open than receivers**, a full yard beyond league average against receivers
   slightly below it. That is coherent scheme reality: TEs draw linebackers and safeties, not corners, so
   the coverage is slower and looser. It is also why TE target share is sticky.
2. **Cushion barely relates to separation** (0.113). Pre-snap cushion does not predict how open a receiver
   ends up — the classic assumption that off-coverage equals separation is mostly false at this level. Depth
   of target (9.71 mean) and post-snap movement dominate.

## Why the baseline matters
Residualising against a served league average (2.9867) rather than a fitted model removes the objection that
the model *is* the result. Separation over league average is now a first-class, vendor-anchored metric, and
the TE/WR split is its first real output.

## Caveats
- Per-receiver game aggregates only; `targets>=3` filter applied, so the extremes are thin (widest cells are
  3-target samples).
- Aggregation hides variance: avgSeparation says nothing about the distribution of windows.
- Cushion is pre-snap and separation post-throw, so their near-independence is expected physically — the
  finding is that pre-snap leverage carries almost no information about eventual separation.
- 24 games, one season; 400s on the 8 phantom ids are a game-existence limit, not auth.
