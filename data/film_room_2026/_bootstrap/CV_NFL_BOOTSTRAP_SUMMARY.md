# CV/NFL-Vision Bootstrap Summary

Generated: 2026-10-30 | Status: Pipeline staged, ready for first video frame

## 1. Blocker acknowledged (in writing)

`https://nfl-video.com/2026` is **BLOCKED** — no game video source exists on that domain:
- Game pages return `bot_blocked` via web_extract
- Direct game URLs return HTTP 404 (e.g. CAR@GB Week 8)
- Game page HTML contains only spam affiliate redirect links (nhlgamestoday.com, nbaontv.com) — no `<video>`, `<iframe>`, `.m3u8`, `.mp4`, `ok.ru`, or `vk.com` sources
- yt-dlp: "Unsupported URL" for nfl-video.com
- 111 game URLs found across Weeks 01–07, all with the same dead affiliate-link structure

No CAR@GB or Weeks 1–7 game video exists on disk. The `intelligence/vision/` stack (bytetrack, kalman, cv_detector_adapter, roboflow_adapter, skeletrack) has **no frames to process**.

## 2. What we DID find — alternative video source

A user-provided YouTube URL (`https://www.youtube.com/watch?v=L6m1RUIXLB4`) contains **Carolina Panthers vs Green Bay Packers Game Highlights | 2026 NFL Season Week 8**, uploaded by NFL on 2026-10-30 (17:35).

- Successfully downloaded via yt-dlp (updated to 2026.10.26): `data/film_room_2026/_bootstrap/car_gb_week8_highlights.mp4` (71.8 MiB, 640x360, 30fps, ~1055s duration, 31,610 frames)
- Extracted 211 sample frames at 1 fps: `sample_0001.jpg` through `sample_0211.jpg`

## 3. VL model confirmed working

`nvidia/nemotron-3.5-super-vl:free` via OpenRouter (key `OPENROUTER_API_KEY2`):

- **API call succeeds** — chat completion returns 200, cost $0 (free tier)
- **Correctly identified NFL content** from sample frames:
  - Frame 1: Pre-game broadcast graphic, CAR 3-3 vs GB 4-3, Thursday Night Football branding, pyrotechnics
  - Frame 3: Pre-game/halftime stadium with pyrotechnics, NFL + Prime logos
  - Frame 4: Players standing between plays, NFL + Prime logos
  - Frame 5: Panthers QB (Bryce Young #3) upright on field, possession identified
- **Key constraint:** The model is a reasoning VLM that emits long `reasoning` tokens. Free tier `max_tokens` must be set to **2000+** to leave room for actual response content. With `max_tokens=300`, responses get cut off (finish_reason='length', content=None).
- **Rate limiting:** Free tier returns empty content on some frames; adding small delays between calls helps.

OpenRouter key `OPENROUTER_API_KEY3` also verified working.

## 4. Local CV stack status

| Component | Status |
|---|---|
| OpenCV | Installed in terminal venv (5.0.0), NOT yet in sandbox kernel (3.14.7) |
| Supervision | Installed in terminal venv (0.31.3), NOT yet in sandbox kernel |
| ffmpeg | Available at WinGet path |
| yt-dlp | Updated to stable@2026.10.26 |
| OpenRouter client | `openai` 2.26.0 available |
| `intelligence/vision/` | 33 Python modules exist (bytetrack, kalman, cv_detector_adapter, roboflow_adapter, skeletrack, etc.) — no frames to process yet |

Sandbox kernel needs `pip install opencv-python-headless supervision` to run CV code directly.

## 5. arXiv papers gathered (57 total)

Saved to:
- `data/film_room_2026/_bootstrap/arxiv_nfl_cv_papers.json`
- `data/film_room_2026/_bootstrap/arxiv_nfl_cv_papers.md`

Key NFL/sports CV papers identified:

| Paper | Relevance |
|---|---|
| [2603.17866v3] NFL step-and-turn | NFL player movement evaluation, generative framework |
| [2609.35562v1] Revisiting Risky Tackle Detection with Vision Transformers | American football tackle detection, ViViT fine-tuned on 733 clips |
| [2603.25901v1] Decoding Defensive Coverage Responsibilities in American Football | Coverage shell detection via factorized attention |
| [2604.01318v1] ViTs for Action Classification in Videos - Risky Tackle Detection | Action classification in football practice |
| [2204.13809v2] Automated player identification and indexing | Two-stage deep learning for player ID |
| [2411.08216v1] GTA: Global Tracklet Association for MOT in Sports | Multi-object tracking in sports |
| [2502.21242v1] Towards long-term player tracking with graph hierarchies | Long-term player re-identification |
| [2503.18282v2] TrackID3x3 | Multi-player tracking with ID and pose estimation |
| [2609.28049v1] Prompt, Probe, Train, or Annotate? | Single-camera sports video understanding |
| [2610.13259v1] Beyond a Single Crop | Contextualized embeddings for player re-identification |
| [2607.11844v2] Beyond the Single Camera | Agentic multi-view reasoning in sports video |
| [2505.03991v3] Deep Learning for Sports Video Event Detection | Survey of event detection tasks/datasets/methods |

## 6. Kaggle competitions identified

| Competition | Relevance |
|---|---|
| nfl-player-contact-detection (2023) | Player contact detection from video/tracking |
| nfl-health-and-safety-helmet-assignment (2021) | Helmet assignment (player ID) |
| nfl-big-data-bowl-2027 | Active NFL BDB competition |
| nfl-big-data-bowl-2026-prediction / analytics | Recent BDB competitions |
| nfl-big-data-bowl-2021 through 2025 | Historical BDB analytics competitions |

Kaggle API key configured at `~/.kaggle/access_token`. No video datasets downloaded yet (competitions are tracking/analytics-focused, not video).

## 7. Recommended pipeline (ready when video exists)

```
1. Extract keyframes via ffmpeg:
   ffmpeg -i <game.mp4> -vf "fps=1/5" -q:v 2 frames/sample_%04d.jpg

2. For each frame, call Nemotron VL via OpenRouter:
   python vl_analyze_frames.py  (max_tokens=2000, small delay between calls)

3. Run existing intelligence/vision/ detectors on same frames:
   - cv_detector_adapter.py, roboflow_adapter.py (detection)
   - bytetrack_associator.py, kalman_track.py (tracking)
   - skeletrack_v2.py (pose estimation)

4. Merge VL output + detector output into film_room schema:
   data/film_room_2026/<week>/<away>_at_<home>_film_charting.json

5. Feed charting into coaching intelligence modules:
   intelligence/coaching/compute_tendencies.py, dc_pressure.py, proe.py, etc.
```

## 8. Remaining blocker

**No full-game video source.** nfl-video.com has no embeddable video. The YouTube Week 8 highlights (17:35 min) is a condensed highlight reel, not full-game tape with all 16,500+ snaps. To run the complete multi-pass film loop (all 32 teams, Weeks 1–7, every snap), a real full-game video source is required.

## 9. What was improved anyway

- Downloaded and verified CAR@GB Week 8 highlights video (playable source)
- Confirmed Nemotron VL works on NFL frames with correct team/player identification
- Installed OpenCV + Supervision in terminal venv
- Gathered 57 arXiv papers on sports CV, player tracking, action spotting, VLMs
- Identified 6 Kaggle NFL competitions for tracking/detection datasets
- Wrote `vl_analyze_frames.py` — ready-to-run VL frame analysis script
- Wrote `test_vl_direct.py` and `debug_vl.py` — VL pipeline test scripts
- Extracted 211 sample frames at 1 fps from the highlights video
- Identified exact max_tokens=2000 requirement for Nemotron VL free tier
- Wrote this bootstrap summary documenting everything

## Files in _bootstrap/

| File | Purpose |
|---|---|
| car_gb_week8_highlights.mp4 | Downloaded Week 8 highlights video |
| sample_*.jpg (211 files) | 1 fps keyframe samples |
| vl_analyze_frames.py | Ready-to-run VL frame analysis script |
| test_vl_direct.py | Single-frame VL test with direct API key |
| debug_vl.py | Raw response debugging script |
| arxiv_nfl_cv_papers.json | 57 structured paper records |
| arxiv_nfl_cv_papers.md | Readable paper summary |
| vl_analysis_sample.json | VL analysis results for first 12 frames |

## Next command when full-game video available

```
cd data/film_room_2026/_bootstrap
ffmpeg -i <full_game.mp4> -vf "fps=1/5" -q:v 2 frames/%04d.jpg
python vl_analyze_frames.py  # analyzes frames with Nemotron VL
# then merge with intelligence/vision/ detectors
```

LOOP_COMPLETE for bootstrap phase.
