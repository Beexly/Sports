# BLOCKED: NFL Video Film Room — No Game Video Source Available

## Root cause
`https://nfl-video.com/2026` is reachable via curl/web_extract, but it only lists **Week 07 games** (Oct 25–26, 2026) across 14+ paginated pages. The target game — **Carolina Panthers @ Green Bay Packers, Event 401873023, Thu Oct 29 2026 (Week 8 TNF)** — is **not on the site**:

- Direct URL guess `/carolina-panthers-vs-green-bay-packers-full-game-replay-nfl-week-08-october-29-2026` → **HTTP 404** (curl + yt-dlp)
- Paginated pages `/2026?page2` through `?page14` → no CAR@GB or Week 8 game URLs found
- Game-specific pages (`/2026/carolina-panthers-green-bay-packers`, `/2026/week-8`) → **bot_blocked** via web_extract

## What IS available (but doesn't unblock video)
- `yt-dlp` + `ffmpeg` installed (WinGet) — no stream URL to feed them
- `openai` 2.26.0 + `requests` — OpenRouter client ready
- `OPENROUTER_API_KEY2` and `OPENROUTER_API_KEY3` both **verified working** with `nvidia/nemotron-3.5-super-vl:free` (tested: chat completion returns 200, cost $0)
- `opencv`/`supervision` NOT installed in sandbox python (ffmpeg available for frame extraction if a source existed)
- Local vision stack at `intelligence/vision/` (bytetrack, kalman, cv_detector_adapter, roboflow_adapter, etc.) — needs video frames as input; none available
- ESPN PBP for all 197 snaps already archived and graded (from prior cycle)

## Doctrine applied
Per `sealed-path-blocker-resolution`:
1. Stopped attempting the edit after 3+ distinct access methods (web_extract, curl, yt-dlp, paginated crawl)
2. Root cause identified: the video source does not exist on the mandated site; not a code/patch issue
3. This document serves as the proposal/blocker record
4. No `.env`, schema, migration, or guardrail was touched; no workaround invented
5. Moving on: nothing further to do in this queue item without a video source

## What would unblock
- A direct stream/video URL for CAR@GB Event 401873023 on nfl-video.com or an alternative host
- Or confirmation from the user that the game will be added to the site
- Or an alternative video source approved by the user

## Already-committed work (not affected by this blocker)
- `c460bbfc1` on `engine/public-baseline-2026-10-24`: TNF reconciliation, W1–7 PBP tendencies, structural code-diff proposals
- `6aa32c026`: TNF CAR@GB ledger settled (15-6, +8.11u; cumulative 31-11) + film autopsy
- Grading JSON: `data/engine/car_gb_postgame_graded_360_audit_2026_10_29.json`

## Next step when video becomes available
1. Use yt-dlp + ffmpeg to extract keyframes at each snap timestamp (pre-snap −1s, snap 0s, top of drop +1.5s, throw/contact +2.8s, whistle)
2. Send frames + synced PBP context to `nvidia/nemotron-3.5-super-vl:free` via OpenRouter (KEY2/3 verified)
3. Run existing `intelligence/coaching/` modules (compute_tendencies, dc_pressure, proe, redzone, script_elasticity, tempo) on the same frames
4. Write charting to `data/film_room_2026/week8/car_at_gb_film_charting.json` and update the ledger

LOOP_COMPLETE — no further action possible without a video source.
