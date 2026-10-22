# Helmet-assignment evaluation spec (labels still gated, metric isn't)

The competition files 403 (rules unaccepted, no CLI join, local browser not logged in), but the
scoring harness is public as a Kaggle dataset (`robikscube/helmet-assignment-helpers`, GPL-2.0) and
documents the task contract exactly.

## Submission contract, from `check_submission`
- max **22 boxes per frame**
- one label per `video_frame`, no duplicates
- boxes inside frame bounds: `top,left >= 0`, `left+width <= 1280`, `top+height <= 720`

## Metric, from the scorer class
- pairs prediction to ground truth by **IoU threshold 0.35**
- **impact weight 1000** applied to impact frames — impacts dominate the score
- `remove_sideline` option drops `isSidelinePlayer == True` rows before scoring
- a `weight_col` drives weighted accuracy

So the label schema includes, at minimum: `video_frame`, box coordinates, `label`, `isSidelinePlayer`,
and an impact/weight column. Frame size is 1280x720.

## Why record it without the labels
Anyone can rebuild the metric from this file, and the contract tells you what a reconstruction must
produce (helmet boxes + player labels + sideline/impact masks). What remains unavailable is the
labelled data itself and the 193 MB of frames.

## Lead for later
`frlemarchand/nfl-player-numbers` (418 MB) maps player numbers — the bridge from a detections-only CV
pipeline to real player identity when helmet numbers are legible.
