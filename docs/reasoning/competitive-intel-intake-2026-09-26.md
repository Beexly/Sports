# Competitive intel intake — 2026-09-26

Source: [Beexly/gse-competitive-intel](https://github.com/Beexly/gse-competitive-intel) (310 dossiers, launch kit, clean-room nflverse engines).
That repo's own rule is "intel only; never wire to production." This note is the exception the founder asked for: learn the method, recompute on our data, do not paste their number.

`publishes_pick` stays false. No new family. LAC at BUF stays the eight locked parts.

## Opponent-adjusted efficiency — already live

Elo adjusts for opponent through the score. It does not adjust efficiency. `scripts/opponent-adjusted.py` does.

For each 2025 team-week, pass EPA per attempt minus that opponent's 2025 defensive pass EPA per attempt, weighted by attempts. Same for rush EPA per carry. 2026 weeks 1–2 are the observation, judged against the 2025 defense so the current season is not in the baseline. Shrinkage: 80 pass attempts and 40 carries of prior.

The signed home-minus-away blend, clipped to [-1, 1]:

- 55% opponent-adjusted pass EPA
- 15% opponent-adjusted rush EPA
- 15% CPOE
- 10% explosive pass rate (20+ air yards)
- 5% interception luck, sign flipped so fewer interceptions than the league rate is positive

That blend is `on_field_efficiency`. A second CPOE, a second EPA, or a pasted "efficiency rank" from a dossier is the same direction and loses on duplication.

## Parlay angles — not a model

`docs/research/2026-09-21/whalelay-lab/` is a set of player case scripts (Corum receptions, Adams with and without Puka, Stafford after a 0-TD game, Rams first-quarter scores). They read a local parquet that is not in this repo. They do not emit a correlation, a holdout, or a week-3 row.

The engine's parlay math is `packages/prediction-engine/src/parlay/correlationAdjuster.ts`. Karlis & Ntzoufras bivariate Poisson. Same-match same-game parlay only. `PARLAY_MRI_PRICED = false` until a walk-forward beats the independent product on real book quotes. Cross-game parlays are not claimed. Case-study legs are not wired.

## What the clean-room FantasyGuru engine is, and what we already have

`gse-competitive-intel/fantasyguru/nfl_engine.py` rebuilds three indexes from public 2025 stats. Methods are fine to copy in spirit. Their 2025 SMASH tables are not a 2026 week-3 input.

| Their construction | Our grain | State |
|---|---|---|
| QB type from rush attempts and rush yards per game | Not a separate family. Mobility is inside rushing EPA, which is already 15% of the blend. | Not a new part |
| OL index: pressure allowed, sack rate, pocket time, yards before contact | Trench is qb_hit per dropback (2025 r = 0.241). Tackle-out drag already moves availability and the lineup. | Duplicate of trench |
| Scheme: shotgun, no-huddle, neutral pass rate, red-zone pass rate | Scheme is motion, play-action, RPO, shotgun, plus drive-start capped at 0.15. | Live |
| Team defense smash from pressures, sacks, knockdowns | Same trench direction. | Duplicate |

## What stays out of the sum

- 310 competitor dossiers. Product maps. Not rows.
- PFF grades, SIS charting, StatRankings ARBY ranks, Fantasy Points personnel charts. Learned the recipe. Did not ingest the table.
- Nutrition. No per-player series. A position-average calorie prior from a GSSI guide would be a constant on every lineman. It does not separate two teams. `bio_nutrition` stays dark.
- Cognition. Wonderlic compilations are leaked pre-draft scores, not a week-3 row. S2 and AIQ scores are not public. A correlation from a 42-QB paper is not a lookup table.
- Raw RFID. NGS summaries already inform efficiency by at most 0.15. Big Data Bowl tracking is non-commercial. StatsBomb's 2021–2022 frames are not this slate.
- SiriusXM audio. Copyright. Not transcribed. Airwave is not dark: it is the questionable and doubtful skill wire. The injury report is the signal. The radio show is not a second one.
- 179 gate scores in one pass. A gate is scored when the harness runs on `holdout.jsonl` and the row is the metric. Appending 179 labels without that run is a fake count.

Nothing in the intel repo cleared a new direction. The edge does not move.
