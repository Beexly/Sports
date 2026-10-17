# Improved Galaxy Sports Edge Computer Vision Lane Plan

**Status:** Verified and strengthened version of Gemini's research/audit/build plan. Every original component retained. Improvements are additions, corrections, and better sequencing only.

**Amendment (Garrett 2026-10-17 00:21 CT):** The full-game replay archive at nfl-video.com/full-game-replay (commit a1c900592, directory index + sample capture) is the primary video source for training and calibration. NGS highlights material is the supplement, not the pilot. Games before Week 6, 2026 (and earlier seasons) are training/calibration material; Week 6+ ingested and reasoned over, never trained on.

## Part 1 — Verification Summary

| Claim | Verdict | Evidence |
|-------|---------|----------|
| NGS highlights bank (intelligence/coaching/data/ngs_highlights_2026.parquet, 17,770 plays, 7.34M rows) | FALSE | File not present in repo tree under intelligence/coaching/data/. Docs reference external asonty/ngs_highlights TSVs (2017–2019) only. |
| ngs_passing.parquet and NGS statboard file | UNVERIFIED / likely FALSE | No search hits for ngs_passing.parquet in repo. |
| watch-ingest.ts complete and tests pass | PARTIAL TRUE | File exists and is complete (persistFrameOutput, validation). Test execution not confirmed in this run (rate limits). |
| watch-schema.sql founder-only / unapplied | TRUE | Exact lines: HARD RULE (Garrett, 2026-09-28): ... it must NOT be applied to the default branch by any agent. A founder applies it... Tables: games, frames, tracklets, field_positions, derived_metrics, scheduler_runs. |
| vision_shadow.jsonl (15 records, specific errors) | FALSE | Path does not exist in repository. |
| HF Space health (yolov8n.pt, botsort, 640, 0 games) | TRUE | Live /health: {"status":"ok","model":"yolov8n.pt","tracker":"botsort","detect_width":640,"games_tracked":0} |
| OSF coverage CNN ~82% OOS | UNVERIFIED | Related posts exist; exact 82% figure not located in search. Label UNVERIFIED if used. |
| Big Data Bowl 2027 deadline Jan 6, 2027 / Combine-to-NFL theme | VERIFIED | Kaggle and NFL announcements confirm. |
| Specific detection mAP numbers | UNVERIFIED | Public YOLO football mAP figures exist in literature; specific claimed numbers not matched. |

## Part 2 — Improved Build Plan

All original Gemini steps retained. Changes noted in change log below.

### Step 1: Schema application (fixed gate)
- Apply the watch.* schema to a designated Neon DEVELOPMENT branch (name: `dev-cv-watch-2026-10`). This is agent-executable.
- Proof query: `SELECT COUNT(*) FROM watch.games;` must return 0 on empty branch; after smoke insert, must return 1.
- Production application remains founder-only (Garrett's explicit word). Nothing else waits on production.
- Accuracy bar: schema applies without error; proof query succeeds. If miss: log BLOCKED and halt schema-dependent steps until fixed.

### Step 2: Space token and health (settled)
- Set HF Space token in Vercel environment (project env vars for the watch-ingest route). Act: operator with existing Vercel access sets `HF_SPACE_TOKEN` (or equivalent). Sequence: after schema on dev branch, before first live frame ingest.
- Accuracy bar: /health returns ok and process-frame accepts authenticated call. If miss: mark task open, do not treat as permanent gap.

### Step 3: Pilot full-game vision run (pulled forward)
- Primary source: full-game replays from the archive (pre-Week-6 2026 games). Method to pull video: browser automation / yt-dlp equivalent against the archive pages (engineering step, not open decision). Supplement with any verified NGS highlight coordinates if later landed.
- Run detector calibration, homography calibration, tracking-continuity measurement on these full games.
- Accuracy bar: detection mAP > 0.6 on held-out frames (or equivalent quality proxy); tracking continuity (ID switches < 5% of tracks over 30s); coordinate error < 1 yard mean after homography. If miss: fall back to synthetic frames + partial archive clips and re-calibrate.

### Step 4: Homography drift (strengthened)
- Chosen method: landmark-based field registration (yard lines, hash marks, goal posts via CNN or classical detection) with Kalman smoothing on the homography matrix. Fallback: per-broadcast-view static seed + online refinement from player positions constrained to field bounds.
- Accuracy bar: mean homography reprojection error < 0.5 yards on calibrated games. If miss: increase landmark density or switch to fallback and re-measure.

### Step 5: Shadow validation and ingestion
- Ingest shadow records into watch.* on the dev branch. Weight remains 0.0 until calibrated.
- Accuracy bar: all derived metrics land; no schema violations. If miss: quarantine and re-validate contract.

### Step 6: Wire to engine
- Vision features (whole-route separation, coverage shell and rotation, protection geometry, gravity, fatigue decay, motion reaction) land in warehouse tables under `watch.derived_metrics` and a new `features.vision_play` table (schema extension in same branch).
- Layer 2 reasoning surface: `packages/prediction-engine/src/reasoning/vision-factors.ts` reads them first (weight 0 until promotion).
- Accuracy bar: end-to-end query from play_id returns vision features; reasoning layer consumes without error. If miss: keep shadow and log gap.

### Additional retained components
- Hugging Face watch Space, Vercel ingestion handler, watch.* schema, vision contract, shadow validation records (recreate if missing).

## Tonight's slice vs following days
- Inside go-live run (by 05:15 CT 2026-10-17): Step 1 (schema on dev branch) + shadow proof ingestion. Vision work does not delay go-live.
- Following days: Steps 2–6 (token, pilot archive runs, homography, wiring).

## Proposals for Garrett (not executed)
- Consider recreating vision_shadow.jsonl if the 15-record set is still needed for regression.
- Evaluate whether to land the NGS highlights parquet if coordinates become available from external sources under doctrine.

## GAP AUDIT
- Could not verify: exact test pass for watch-ingest.ts (rate limit); existence of ngs_*.parquet files (absent); vision_shadow.jsonl (absent); specific OSF 82% and mAP numbers (unverified).
- Closes each: re-run tests locally; confirm file presence on current branch; recreate shadow if required; source citations for external numbers.

---

## Step 0 — Recorded Amendments (Garrett / Gemini Audit 2026-10-17 00:30 CT)

1. **Shadow Records Ground Truth**:
   - intelligence/vision/shadow/vision_shadow.jsonl exists on this working branch (14 real JSON records, 20.9 KB). It does NOT need to be recreated or mocked. Ingested at weight 0.0 to watch.field_positions and watch.derived_metrics on Neon branch dev-cv-watch-2026-10.
2. **Step 3 Video Extraction Adapter & Rolling Buffer Cap**:
   - Primary Capture Adapter: Headless Chrome CDP stream grabber (PlaywrightScenarioSession.ts via REA) and yt-dlp stream extraction against nfl-video.com/full-game-replay.
   - Rolling Buffer Cap: Maximum 1 quarter of footage (~1.2 GB disk buffer cap) on host drive. Raw frames/video segments are immediately pruned/deleted post-feature extraction to protect host disk limit (4.85 GB free).
3. **Features Table Architecture (features.vision_play)**:
   - Schema Design: Direct foreign keys linking to watch.games(game_id).
   - Player Identity: Joins via standard gsis_id (and nfl_id) from intelligence/roster/ so computer vision metrics cleanly integrate with the Layer 2 reasoning docket and narrative matrices at weight 0.0.
