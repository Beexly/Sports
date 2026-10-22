# Tackle Probability, the last link

Video: https://www.youtube.com/watch?v=wqvAiuC7d7U
Length 1:53. Uploaded 2024-09-09 by Amazon Web Services. Title: AWS and NFL - Tackle Probability.
The transcript was pulled in full. It does not contain a formula. The two blogs that embed the same video do.

Opened:
- https://aws.amazon.com/blogs/media/beyond-the-box-score-aws-and-nfl-ai-powered-tackle-analysis/
- https://aws.amazon.com/blogs/media/a-new-take-on-tackling-nfl-next-gen-stats-and-aws-bring-data-to-the-gridiron/

## Published

Train 2018-2022, test 2023. 15 models were tried. The production model uses 20 features, 14 of them new. 11 defenders, 10 Hz. A 10-second play is 22,000 feature points. They said a ten-second play can easily generate 20,000. They aimed the missed-tackle rate at 15-20%. Sub-100 ms inference was claimed. Metric improvement over their baseline was claimed and not numbered. Those deltas were not invented.

A group tackle is three or more defenders. Efficiency is successful tackles over attempts. Downhill is a defender ahead of the ball carrier along forward progress. Upfield is behind that progress. Yards saved is expected yards minus actual yards. Yards between attempts is the next attempt minus the miss. Closing speed is the defender's velocity relative to the carrier, projected onto the gap. Encircle is how many quadrants around the carrier hold a nearby defender. Nearby is the caller's filter. The radius was not published.

## Not published, so not filled in

Open-field radius. Chase-down yard minimum. Blocker corridor width. Those functions take the missing number as an argument. Primary tackler ("initiating") and forced-out-of-bounds were named and not defined. They are listed in `TACKLE_DERIVATIVES` and have no function.

Their 2024 team results were not remeasured. The model weights were not published, so a probability itself is not in this file.

Engine file: `packages/prediction-engine/src/nfl/tackle-probability.ts`.
