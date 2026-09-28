# IG-DdlklFRTo2d — "Football Projects": DIY VAR, formation mapping, auto-clipped highlights

- Source: https://www.instagram.com/reel/DdlklFRTo2d/ (@prathamunpluggedd, posted 2026-09-22; 3,569 likes, 842 comments at read time)
- Fetched: 2026-09-27 via instagram-cli; media-understanding summary in `ig-post-DdlklFRTo2d-mu.json` (caption was bare: "FOLLOW and COMMENT for the code/tutorial").

## What it is

A tutorial-style reel, "Football Projects to add to your resume" (soccer/Premier League): three weekend-buildable computer-vision projects —
1. **DIY VAR**: track players and detect offsides.
2. **Formation + passing-lane mapping** from real match footage (formation heatmaps, player-tracking boxes, 3D VAR offside simulation shown in the video).
3. **Auto-clip goals, saves, and tackles** → convert match highlights into instant Instagram Reels.
Stack named in the video: Python, OpenCV, YOLO.

## How it works (method summary)

Detector (YOLO-class) → multi-object tracking boxes → geometry reasoning over the boxes: offside-line projection (project attacker positions against the second-to-last defender), formation inference from box centroids over time (heatmaps, lane maps), event detection (goal/save/tackle) → automatic highlight segmentation. The video shows overlays on real match footage as the demonstration.

## Exact GSE fit (verified repo paths)

- **Movement/trajectory lane — direct method overlap.** `gse-ml-service/app/models/movement.py` (branch `origin/hermes/wip-e1-movement-2026-09-26`) needs exactly this upstream: detector → tracked player boxes → trajectory inputs. The video's DIY-VAR geometry step (line projection vs defender positions) is the direct analog of GSE's play-canonicalization layer (established conventions: play-direction `x' = 120 − x`, across-field mirror `y' = 53.3 − y` — movement handoff v3). The NGS-schema loaders stay NGS-first, but this method informs the *video* side when real tracking data isn't available.
- **Formation mapping → conviction layer.** `apps/web/lib/fantasy/dfs-correlation.ts` and the wider conviction/signals tree (`apps/web/lib/conviction/signals/`) consume structural context; formation-shape features derived from video are a plausible future signal class (stacked behind the backtest gate).
- **Auto-clip → video lane for @GalaxySportsHQ.** The standing video rule demands real game footage in 2–4-second transformative clips with commentary/telestration dominant. An event-detection → auto-clip pipeline (goal/save/tackle analogs for NFL: TDs, turnovers, big plays) is the automation shape for the GSE content operation — transform-only, commentary-dominant.
- **Does NOT fit:** the DFS optimizer internals and the pick'em intake APIs — no direct line.

## Concrete application sketch for GSE

Video-side, license-clean: YOLO detector → player tracking boxes → canonicalize (play direction, field coordinates) → formation-shape feature extraction → register in `packages/feature-store`; VAR-line geometry pattern re-used for LOS/first-down-line detection. Event detection (TD/turnover/big-play) feeds the sports-video clip pipeline. Everything gated by the calibration/backtest rules before it touches predictions or consensus.

## Gaps / limits

- Soccer ≠ NFL: offside ≠ line of scrimmage; the geometry transfers but the rules layer must be re-derived for American football.
- YOLO tracking identity switches are the known failure mode — dual-tracker verification (as in the pull-up video, IG-Dc6MCajKQLs) is the mitigation.
- **Licensing hard boundary:** E3 commercial training requires authorized/license-clean footage; Premier League broadcast footage in the video is the *demonstration*, not a training source.
- This is beginner-tutorial-grade content ("add to your resume"); it validates the approach shape, not the quality bar — GSE's quality floor is 9.2.
