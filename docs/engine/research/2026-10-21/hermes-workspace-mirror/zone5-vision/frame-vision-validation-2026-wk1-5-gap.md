# Frame-Level Vision Validation — pre-Week-6 2026 Pass Plays
**Date:** 2026-10-17 · **Scope:** 2026 season, Weeks 1–5 · **Verdict:** BLOCKED — zero play-keyed frames and zero tracklets exist on disk.

---

## 1. Bottom line

No artifact was found that couples a 2026 play (`gameId`/`playId`) to either (a) video frames or
(b) per-frame player coordinates. Therefore **none** of the six requested checks — tracklet identity
consistency, DLT/Hartley homography to field coordinates, pocket depth, pass-rush separation, coverage
shell label, Separation Over Expected — can be evaluated for any 2026 play.

Per-play output table: **0 rows.** No values were estimated, interpolated, or inferred from aggregates.

| Check | Artifacts required | Found | Result |
|---|---|---|---|
| Tracklet identity consistency | frame sequence + per-frame player IDs | none | NOT RUNNABLE |
| DLT Hartley homography → field x/y | frames + field landmarks + H | none | NOT RUNNABLE |
| Pocket depth | QB/OL/DL coordinates per frame | none | NOT RUNNABLE |
| Pass-rush separation | rusher/passer coordinates per frame | none | NOT RUNNABLE |
| Coverage shell label | secondary alignment per frame (+ charting) | none | NOT RUNNABLE |
| SOE | receiver/defender separation per frame + expectation model | none | NOT RUNNABLE |

---

## 2. Paths searched (exhaustive for the three assigned roots)

| Root | What was checked | Outcome |
|---|---|---|
| `C:/Users/Garrett` (home root) | `*.jpg/png/mp4/mov/webm` to depth 5; `*.parquet` to depth 4; dirs matching sport/gse/nfl/ngs/bdb/track/vision/cv/frame | No football film. All video is brand/design (`apps/web/public/immersive/*`, `chick-immersive/.hermes/film/*`, skill assets). |
| `C:/Users/Garrett/.cagent/Sports` | recursive filenames for tracklet/enrichment/ngs/highlight/hartley/homography/pocket/separation/soe; `data/`, `data/nflverse/data` | No tracking or CV dirs. `data/nflverse/data` contains only `quotes/`. |
| `C:/Users/Garrett/.sports-scrub-20261003` | same filename sweep; content grep for `tracklet_outcome_enrichment_2026`, `ngs_highlight_tracking_2026`, `outcome_enrichment`, `highlight_tracking`, `nflId`, `Hartley`, `DLT`, `homography`; `git log --diff-filter=D`; `git status --ignored` | No image frames. No data file. Producer code exists (see §4). |

Negative confirmations:
- **No CSV in either repo** has a header containing both `playId` and `nflId`.
- **No `.parquet`** in either repo carries `x`/`y` player coordinates.
- **`~/data/cv` does not exist** — the pull target named in `docs/dataset-pull-commands.md` (`~/data/cv/roboflow-helmet`, `~/data/cv/wr-finder`) was never created, so the Roboflow helmet / wr-finder image sets were never downloaded.
- **No `.mp4`** anywhere in the three roots is football footage.
- `git status --ignored` in the scrub repo reports **no** ignored data files present on disk.

---

## 3. What 2026 artifacts DO exist — and why each is insufficient

### 3.1 `Downloads/nfl-big-data-bowl-2027.zip` — real tracking, wrong season
512,718,566 bytes, 9 members, 2,306,804,135 bytes uncompressed. Seasons in `games.csv`: **2023, 2024, 2025 only.**

```
game_tracking_2023.csv   335 MB
game_tracking_2024.csv   718 MB
game_tracking_2025.csv  1022 MB
player_play.csv          147 MB
combine_tracking.csv      84 MB
```
Schema: `game_id, play_id, nfl_id, time, x, y, s, a, dis, o, dir, event` — field coordinates in yards
(x 0–120, y 0–53.3), 10 Hz. **This is already-projected tracking, not video.** It cannot support
homography validation (no pixels) and it contains no 2026 plays. It is also the only dataset on disk
from which a future 2026 release could be validated methodologically.

### 3.2 `intelligence/coaching/data/play_by_play_2026.parquet` — real 2026, no space
8,497 rows × 372 columns, **weeks 1–4** (pass plays: W1 1,069 · W2 1,091 · W3 1,169 · W4 81).
nflverse pbp schema. It has `air_yards`, `pass_length`, `pass_location` — and **no** `x`/`y`,
no `coverage`, no `pressure`/`time_to_throw`, no `separation`, no `pocket` columns. Play-level context
only; nothing spatial.

### 3.3 `docs/air-yards-week1-2026.png` (1320×797) and `docs/coverage-defenders-week1-2026.png` (1320×2868)
Both are **aggregate leaderboard tables**, not play frames. See §5.

### 3.4 `docs/research/2026-10-01/cv-detector-eval-2026-10-01.md` — the only real frame-level CV run
Ran 2026-10-01 on Week-3 broadcast reels: 5 clips, 251 frames, 640×360, 5 fps, YOLOv8n.
Manual audit of 8 annotated frames (57 visible people): **precision 1.00 (42/42), recall 0.74 (42/57)**.
Tracklet association via real `buildTracklets` (IoU 0.3, maxGap 5) produced **52–65 tracklets for ~6
concurrent players**, median tracklet life 0.6–0.8 s.
DLT homography **failed** on the real frame: *"singular normal equations (degenerate correspondences?)"* —
all usable points lay on two image lines (frame edges).
The doc states the eval clips were **internal-only and deleted after evaluation**, and no tracklet
file was persisted (only the aggregate counts above). So this is evidence the capability ran, not
data that can be re-validated.

---

## 4. Producer code exists without output (precise gap, not a defect claim)

`packages/prediction-engine/src/tracking/` holds the full CV lane: `cv-homography.ts` (normalized DLT),
`cv-homography-source.ts`, `cv-tracklet-association.ts`, `cv-pipeline.ts`, `cv-dataset-ingest.ts`,
`cv-eval-stratification.ts`, `yolo-detect.py`, `stabilize.py`. Its only "end-to-end" coverage is
**synthetic**: `cv-pipeline.test.ts` builds 64×40 procedurally-generated pixel arrays and a
`FixtureDetector` script (`playerDetection(10 + 2k, …)`), with a hand-written 10 px = 1 m homography.
That test validates the math, not football.

`apps/web/lib/reconstruction/*` expects an "NGS Highlights coordinate sample" as calibration truth
(`covariate-model.ts`, `ngs-sep-measurement.ts`, `calibration-eval.ts`). **That sample is not on disk.**
`separation-reconstruct.ts` therefore runs in its documented UNCALIBRATED branch — it emits the
receiver's EB-shrunk *tendency*, explicitly refusing to invent a per-play coordinate. That is the
correct behavior given the missing truth set, and it means no per-play SOE number exists to validate.

---

## 5. The only vision checks that were possible (2026 artifacts, frame vs documented claim)

### 5.1 `coverage-defenders-week1-2026.png` — attribution defect (CONFIRMED)
- Frame content: X post by **Brian Nemhauser, handle `@hawkblogger`** (blue check), "HB ANALYTICS /
  TOP 20 DEFENDERS", subtitle *"Yards per route grade - Blended — 2026 through Week 1, with 2025
  counted at 83% and fading out by Week 6. Played in 2026. Filters: CB, S - 150+ reps."*
- Claim in `AGENTS.md:1966`: "X post by Brian Nemhauser **@hawkbledger** (verified)".
- **Defect:** handle misspelled. `AGENTS.md` itself uses `@hawkblogger` correctly at lines 2816, 2931,
  3492. The frame is authoritative and shows `hawkblogger`.
- **Claim the image does not support:** `AGENTS.md:1967` dates the screenshot 2026-09-17 ~17:05 CDT.
  The frame contains **no date stamp** — only a device clock reading `5:05`. Date is unverifiable from
  the image (plausible, but sourced from outside the frame).
- **Content check:** the image supports *season-to-date, opponent-adjusted, position-group* coverage
  grading. It does **not** support any claim about coverage shell, pocket depth, or per-play separation.
  Columns are GRADE / TREND / REPS / RECEIVING YARDS / OVER EXP. — all player-season aggregates.
- Internal arithmetic (computed, not asserted): yards-per-route = REC YDS / REPS gives Woolen 0.752,
  Surtain 0.701, Stokes 0.755, Mitchell 0.953, Ya-Sin 0.887; OVER EXP./REPS gives −0.705, −0.823,
  −0.647, −0.570, −0.690. GRADE differs from OVER EXP./REPS by 0.065–0.273, consistent with GRADE
  being opponent-adjusted and OVER EXP. not (or vice versa). **The frame defines neither adjustment**,
  so neither column can be independently validated from the image.

### 5.2 `air-yards-week1-2026.png` — documented row verified (PASS)
Frame is a "PLAYER DETAILS" table, Week 1, ranked by AY TOTALS, with columns TGT / AY TOTALS /
AY RESULT INCOMPLETE / AY CATCHABLE / AY NOT CATCHABLE / AY RESULT DROPPED, plus a League Avg row.
No account attribution is visible — consistent with `AGENTS.md:1925` ("Originating account UNVERIFIED
… do not attribute").

Spot-check of the documented Jameson Williams row (`AGENTS.md:1938`) against pixels — **all six values match**:
`9 TGT · 128 AY · 85 incomplete-result · 112 catchable · 16 not catchable · 47 dropped` ✓
Also verified: Olave 237 AY (rank 1), Metcalf 194 (2), DJ Moore 149 (3), M. Washington 128 (4),
Coker 127 (6). Catchable + not-catchable reconciles to AY TOTALS on every row checked.

### 5.3 What neither PNG can do
Neither image contains player positions, routes, or a down/distance frame. Any separation, pocket-depth,
or coverage-shell statement derived from them would be fabricated.

---

## 6. To unblock (minimum viable inputs)

1. **2026 tracking with coordinates.** Either the 2026 Big Data Bowl release (the 2027 zip proves the
   pipeline and schema), a licensed feed (SkillCorner ~10 fps All-22, keyed to GSIS), or NGS Highlights
   coordinates for 2026 weeks 1–5.
2. **Frames paired to `gameId`/`playId`** for the homography lane. BDB data is already in field
   coordinates — it validates tracklet identity, pocket depth, separation and SOE, but *not* DLT.
3. **2D field landmarks, not just yard lines.** The 2026-10-01 eval's DLT failure was a conditioning
   failure (collinear correspondences), so landmark supply is the blocker, not the solver.
4. **A coverage-shell label source.** Not derivable from coordinates alone at broadcast angle; requires
   All-22 + charting (FTN) or manual tagging.

Until (1) or (2) lands, `separation-reconstruct.ts` correctly stays in its UNCALIBRATED branch and no
per-play SOE should be published.
