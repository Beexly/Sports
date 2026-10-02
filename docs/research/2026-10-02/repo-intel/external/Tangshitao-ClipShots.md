# Tangshitao / ClipShots

- **Stars:** 128 | **License:** MIT | **Pushed:** 2021-11-09 (dataset-complete, stable) | **Lang:** Python (dataset + eval tools)

## Vision
The first large-scale **shot boundary detection** dataset built from YouTube/Weibo short videos (not static documentaries): 1–20 min clips across 20+ categories including sports, with annotated cuts and gradual transitions (dissolve, fade, slide), plus baseline results (deepSBD) and an eval script. From an arXiv paper (1808.04234).

## The Ask
- Download the dataset (Baidu Pan or Google Drive link in README); rename to `data.tar.gz`. Train/eval a shot-boundary model with the provided tools.

## Constraints
- MIT for the code; dataset redistribution rights are the paper authors' — using the *method* is safe, re-hosting the videos is not.
- Sports is one of 20+ categories, not the focus; no sports-specific labels (no play/event annotations).

## GSE lens
Indirectly relevant but genuinely useful for GSE's video lane: GSE's standing rule is **real game footage, seconds-long transformative clips, telestrated, commentary-led**. The expensive part of that pipeline is *finding the 3 seconds that matter* inside a 3-hour broadcast. Shot-boundary detection is the first automated step: segment the broadcast into shots, then classify/rank the segments. Nobody in GSE's video workflow has an automated segmentation step — it's manual. The honest scope: this doesn't solve highlight detection (it finds cuts, not touchdowns), but it's the proven preprocessing layer for any "machine watches the game and proposes clips" pipeline. Rebuild the method (frame-diff + CNN boundary detection) on NFL footage as GSE's own clip-proposal front end.

## Verdict
**REBUILD** — re-implement shot-boundary segmentation as the front end of GSE's clip pipeline; do not re-host the dataset.

## The 4 tricks
- CodeWiki: https://codewiki.google/github.com/Tangshitao/ClipShots
- GitDiagram: https://gitdiagram.com/Tangshitao/ClipShots
- Star history: https://star-history.com/#Tangshitao/ClipShots (128 stars)
- github.dev: https://github.dev/Tangshitao/ClipShots
