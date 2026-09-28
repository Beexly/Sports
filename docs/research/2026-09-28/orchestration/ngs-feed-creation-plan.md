# NGS Feed Creation Plan — Research Lane 3

**Date:** 2026-09-28 · **Lane:** NGS feed creation (research only; no code written)
**For:** Garrett Baxley's coding agent · **Coordinator lands at:** `docs/research/2026-09-28/orchestration/ngs-feed-creation-plan.md`

## 0. What this plan is grounded on

Read live on 2026-09-28 via the GitHub API (read-only; vendor checkout untouched):

1. **Movement module spec** — `docs/engine/research/2026-09-26/2026-09-26-movement-module-spec.md` on `Beexly/Sports@main`. Predicts deltas + speed + uncertainty with relational 22-player modeling and physics-informed losses. The feed built here must satisfy this spec's §2 input schema and §10 loader tests (`test_loader_schema`, `test_causality`, `test_canonicalization`, `test_flip_involution`). **Hard constraint carried forward: train on GSE's own NGS data — BDB 2026 data is never a training input.** (See §7 for the BDB license discrepancy that must be resolved before even benchmark use.)
2. **Tracking 10Hz playbook** — `handoff/claude/overnight-2026-07-01/TRACKING-10HZ-PLAYBOOK.md` on `main`. Ranked the market: SkillCorner (realistic buy, ~10fps, keyed to PFF+GSIS IDs), SIS DataHub Pro ($99.99/mo charting adjunct), PFF b2b, Genius Sports (official raw NGS, exclusive through 2029 season — moonshot), BDB (blocked), DIY CV on broadcast (blocked without counsel), and the already-chosen synthetic/physics-informed engine calibrated to legal aggregates. Storage discipline carried forward: **raw frames as per-play Parquet in a lake; Postgres gets derived per-play features only.**
3. **`packages/prediction-engine/src/tracking/cv-movement-primitive.ts`** — math + data contracts for broadcast-video-derived tracking: `FramePoint`/`Tracklet`/`MovementMetric` contracts, camera motion estimation via dominant-displacement compensation, homography fit from yardlines (pixels → field meters; field 120×53.3 yd = 109.7×48.8 m), perspective transform, per-player speed/distance derivation, ball interpolation across dropped frames. **Learn-only; no detector weights, no code ported.**
4. **`sportsdataverse/nfl-ngs-raw`** acquisition pattern, studied from its CLAUDE.md and `python/ngs_raw/fetch.py` — method only, no code copied. The four doctrines are adopted verbatim as standing rules (§6):
   - **raw-first** — scrape-only contract; raw JSON committed; reshaping owned by a separate stage (one-way boundary, never the reverse).
   - **validity-by-content** — presence ≠ validity; a file is trusted only if it parses AND has rows; an empty payload is never written.
   - **pace-between-attempts** — sleep after EVERY attempt (success or not) in a `finally`; pacing env-tuned (`NGS_RAW_SLEEP` default 0.25s, `NGS_RAW_TIMEOUT` default 30s, `NGS_RAW_RETRIES` default 4); retry set {408, 429, 500, 502, 503, 504}; non-404 persistent failures raise, get counted, and turn the stage red — never swallowed.
   - **empty-envelope sentinel** — HTTP 200 with an empty body, or `stats: []`, means "nothing here," not data; future weeks are never requested (schedule filters on first kickoff ≤ now) because banking an empty envelope would make a presence-based resume skip the real data forever. 404 → `None` (absent, normal for pre-floor seasons).
   - Bonus doctrines carried over: **finality comes from the schedule** (refetch until every game is FINAL, not from a marker); **failed ≠ absent** (a play that 403s or has no player rows is `failed`, never silently absent); atomic writes (tmp + rename); schedule upserted by `game_id`.
5. **`asonty/ngs_highlights`** — open NGS tracking TSVs (2017–2019 seasons, `play_data/` per-playKey TSVs). Full NGS column set: `gameId, playId, playType, season, seasonType, week, preSnapHomeScore, preSnapVisitorScore, playDirection, quarter, gameClock, down, yardsToGo, yardline, yardlineSide, yardlineNumber, absoluteYardlineNumber, possessionFlag, homeTeamFlag, teamAbbr, frame, displayName, esbId, gsisId, jerseyNumber, nflId, position, positionGroup, time, x, y, s, o, dir, event, playDescription`. Key finding: **the TSVs contain the entire runtime of the play, including dead time before line set and post-TD celebration** — the loader must trim to the play window. `dir` = 0 faces the far sideline, clockwise (standard NGS convention).
6. **`sumedhk0/PanopticPigskin`** — AGPL-3.0 broadcast camera calibration: **study only, never port code.** Its ruler doctrines (yard-line-detected homography, per-frame camera solve) inform the CV lane; reimplement from the cv-movement-primitive math.

### Verified-but-negative findings (do not let the coding agent chase ghosts)

- **nflverse publishes NO per-frame tracking data.** Its NGS product (`ngs-data`) is player-week aggregates (`ngs_{passing,receiving,rushing}`, CC-BY-4.0). Useful only as calibration targets for the synthetic engine (playbook path 7), never as movement-spec training frames.
- **The public `nextgenstats.nfl.com/api` surface may be dead.** SportsDataverse's 2026-09-04 commit notes NGS "moved behind an NFL+ Premium paywall at `pro.nfl.com/api/secured/*` after `nextgenstats.nfl.com` stopped serving data." Lane 2's first step is a live probe, not a build.
- **`nfl-ngs-raw` itself only gets tracking for highlight plays** (per-game lookups denied from every egress they tested) — the scrape lane can bootstrap validation, not a full training corpus.

---

## 1. Source options, ranked

### 1A. Bootstrap corpus — asonty/ngs_highlights TSVs (real frames) + nflverse NGS aggregates (calibration targets) + synthetic engine (fill)
- **What:** Download `play_data/*.tsv` from `asonty/ngs_highlights` (2017–2019, highlight plays only). Use the nflverse NGS player-week aggregates as **calibration targets** for the already-chosen physics-plausible synthetic trajectory generator (playbook path 7), which produces full-coverage training frames.
- **Why first:** It is the only legal, in-hand source of real per-frame NGS data. Enough to (a) validate the loader and feature pipeline end-to-end against real kinematics, (b) build the Phase 0 physics baseline the movement spec demands before any learning, (c) serve as the calibration/eval set the synthetic engine is tuned against.
- **Limits:** highlight plays only (selection bias — big plays, athletic extremes); 2017–2019 (scheme drift); TSV layout must be normalized into the §3 target schema (trim dead time, canonicalize `playDirection`, map `absoluteYardlineNumber` → `yardline_100`). Verify the repo's license before commercial training use.
- **Coding-agent note:** fetch via `raw.githubusercontent.com/asonty/ngs_highlights/master/play_data/`; do not clone the repo into the Sports tree.

### 1B. (companion, not standalone) nflverse NGS aggregates — calibration anchors
- `nflverse/ngs-data` releases (`ngs_{passing,receiving,rushing}`), CC-BY-4.0 with attribution. Player-week grain, not frames. Role: sanity-check the synthetic generator's marginal distributions (speed, cushion, separation) and serve as a secondary join surface via gsis IDs.

### 2. Scrape-derived public NGS JSON via the nfl-ngs-raw method — PROBE FIRST, build only if live
- **Step 0 (acceptance gate before any build):** probe `nextgenstats.nfl.com/api` from the project's egress with the nfl-ngs-raw contract (browser UA + nextgenstats Referer, no auth). If the probe returns live data → proceed. If dead/redirected to the NFL Pro paywall → **stop and report**; the fallback is the `pro.nfl.com/api/secured/*` family, which needs a **user-bound** token obtained via an id.nfl.com login (client-credentials tokens 401 on every secured route). That token comes from **Garrett's NFL+ Premium account** — it is a Garrett-blocked input, not a coding task.
- **If live:** build the intake as a strict clone of the four doctrines (§0 item 4): raw-first tree (`raw/season=YYYY/week=WW/game=...json`), validity-by-content gate, pace-between-attempts, empty-envelope sentinel, finality-from-schedule, failed≠absent, atomic writes. **Do not copy code** — reimplement the doctrines in GSE's stack (TypeScript/Python per repo conventions).
- **Coverage reality:** per the nfl-ngs-raw access findings, per-game tracking lookups are egress-blocked and tracking is served for highlight plays only. Treat this lane as **validation-volume + incremental bootstrap**, not the corpus.
- **Legal exposure:** automated access against the NGS web API at tolerance. This lane mirrors a public pattern, but NFL ToS questions apply — flag in the Garrett-blockers list, do not self-clear.

### 3. Broadcast-video-derived tracking via the cv-movement-primitive lane (PanopticPigskin doctrines, study-only)
- **What:** Reimplement the `cv-movement-primitive.ts` math (optical-flow camera compensation → yardline homography → world-coordinate tracklets → speed/distance metrics) plus the PanopticPigskin ruler doctrines (per-frame camera solve from detected yard lines), all reimplementation, zero ported code.
- **Validation doctrine:** the CV output is checked against the 1A corpus — on plays where both exist, per-player reprojection must agree within a yard-level tolerance (see M5 acceptance), because Zebra-chip data is ground truth and CV is the approximation.
- **Legal posture (hard):** the playbook's ruling stands — **DIY extraction on NFL+/broadcast streams is blocked without counsel** (NFL terms prohibit automated extraction; facts aren't copyrightable per Feist but the ToS surface is the litigated corner). The coding agent may build and validate the pipeline against **legally clean inputs only** (e.g., GSE-owned footage, licensed All-22). Production use of broadcast-derived tracking stays gated on counsel clearance or a licensed input.
- **Detector note:** `cv-movement-primitive.ts` ships no detector weights — the detector (YOLO-class) is a separate procurement/training decision the agent must spec, not improvise.

### 4. Licensed full NGS feed — costs money; Garrett's word required
- **SkillCorner** (playbook's #1): ~10fps all-22-players tracking derived from All-22 video, keyed to PFF + GSIS IDs (the playbook's join analysis says this makes mapping into the stack nearly free via nflverse's GSIS crosswalk). Cost expectation **low-to-mid five figures/yr** (estimate, unquoted — playbook's number, verify with a demo). Diligence: confirm their license covers GSE's downstream commercial use and get indemnity in the contract. This is the realistic buy.
- **Genius Sports**: the official Zebra-chip raw feed, exclusive through the **2029 season** (prior deal $120M/6yr). Six-to-seven-figure conversation — the endgame license when revenue justifies it.
- **SIS DataHub Pro** ($99.99/mo or $749.99/yr self-serve): charting, not 10Hz tracking — adjunct signal layer while tracking negotiates, not a feed-creation input.
- **Coding-agent role:** build the vendor-intake pipeline shape from the playbook once (vendor API → rate-limited, source-registry-gated intake workers → Parquet lake → feature jobs → Postgres feature tables → prediction-engine consumes features, never raw frames), with the intake worker **stubbed/disabled** until a contract exists. Never build against a vendor API without a signed license.

---

## 2. Target schema (the contract the movement spec's loader tests enforce)

**Grain:** one row per entity per frame. Entities = 22 players + `BALL` = 23 rows/frame. Grouping keys: `game_id` → `play_id` → `frame_id` (10 Hz, monotonic within play).

**Frame table (raw columns from NGS ingest — movement spec §2):**

| Column | Type | Notes |
|---|---|---|
| `game_id` | str | grouping key for splits |
| `play_id` | str | grouping key |
| `frame_id` | int | 10 Hz, monotonic within play |
| `time` | float | seconds since snap (snap = 0); history is `time <= t` |
| `entity_id` | str | player nflId or `"BALL"` |
| `x`, `y` | float | yards; x ∈ [0,120], y ∈ [0,53.3] |
| `s`, `a` | float | speed (yd/s), acceleration (yd/s²) |
| `dis` | float | distance traveled, cumulative |
| `o`, `dir` | float | orientation, direction of motion (degrees) |
| `event` | str | `ball_snap`, `pass_forward`, `pass_arrived`, …; may be null |
| `team` | str | `"off"` / `"def"` / `"ball"` |
| `position` | str | QB/RB/WR/TE/OL/DL/LB/CB/S or null for ball |
| `is_targeted_receiver` | bool | from play metadata |
| `ball_landing_x`, `ball_landing_y` | float | known landing spot (conditioning anchor) |
| `frames_to_landing` | int | landing frame − t (landing head input) |

**Play context (constant within play):** `quarter`, `down`, `yards_to_go`, `yardline_100` (yards from own goal, 1–99), `seconds_remaining`, `score_diff`, `play_direction` (`"left"`/`"right"` — normalize to canonical `"right"` at load per spec §6/§7).

**Feed metadata (every row or every play — intake-owned):** `source` (`asonty` | `nfl_ngs_raw` | `broadcast_cv` | `licensed` | `synthetic`), `acquired_at`, `feed_version`, `valid` (bool from validity-by-content), `identity_keys` (`nflId`, `gsisId`, `esbId` where available — the join surface into nflverse rosters / the playbook's GSIS crosswalk).

**Storage contract (from the playbook):** raw frames land as **per-play Parquet** in the lake (`lake/tracking/season=YYYY/week=WW/game_id/play_id.parquet`); **Postgres gets derived per-play features only** — never raw frames. The raw tree and the reshape/feature stage obey the one-way boundary: intake writes raw; reshape reads raw; reshape never writes back into the raw tree.

**Normalization rules at load (before any feature computation):**
- Trim dead time: drop frames outside the play window (`line_set` → terminal event). (asonty finding.)
- Canonicalize `playDirection` to `"right"` (horizontal flip once where needed).
- History window `T = 10` frames (1.0 s) ending at `t`; causality enforced — features may only use `frame_id ≤ t` (`test_causality`).
- Augmentation flips (spec §7) recompute derived kinematics from flipped raw coords; flip is involutive (`test_flip_involution`).

---

## 3. Validation protocol against the movement module spec

Run in this order. A later stage does not start until the earlier gate is green.

**A. Loader/data gates (spec §10)**
- `test_loader_schema`: every column in §2 present with correct dtypes and ranges (x ∈ [0,120], y ∈ [0,53.3], no null `entity_id`, 23 entities/frame).
- `test_causality`: zeroing frames with `frame_id > t` leaves outputs unchanged (< 1e-6) — proves no future leakage.
- `test_canonicalization`: a left-direction play and its canonicalized version produce mirrored-identical predictions.
- `test_flip_involution`: augmentation flip applied twice == original inputs exactly.
- Data-QC rule hooks (§4) each have a failing-then-passing test.

**B. Baseline acceptance**
- `test_baseline_beats_naive` on the real 1A corpus: Phase 0 physics baseline (constant-velocity + ball-landing drift prior) beats last-position-carried-forward. This validates the pipeline end-to-end on real kinematics.
- **Phase 1 gate:** the single relational model beats the Phase 0 baseline RMSE by **≥ 10%** on the game-level held-out block (expanding-window splits, train on games 1..N−2k, validate N−2k+1..N−k, test the most recent k ≥ 10%, min 20 games).

**C. Physics sanity checks (spec §10, run on every model)**
- `test_no_teleport`: `hypot(dx,dy) ≤ 12.0·Δt + 0.5` for every player/horizon.
- `test_speed_cap`: predicted `speed ≤ 12.0` yd/s.
- `test_finite`, `test_positive_uncertainty`, `test_conf_range` — no NaN/Inf, σ > 0, conf ∈ [0,1].
- `test_permutation_invariance`: permuting the 22 player input rows permutes outputs identically (< 1e-5) — no entity positional encoding.
- `test_determinism`: identical seeds → max abs diff < 1e-6.

**D. RMSE bands**
- Reference yardstick: **0.518–0.540** (BDB 2026 leaderboard band, `sqrt(0.5·(MSE_x + MSE_y))` in yards). Directional only — different data — but it is the only public yardstick.
- **Target: beat 0.540 on GSE's own held-out games** with the Phase 3 ensemble + test-time augmentation; document the gap to 0.518 as the improvement backlog.
- **Phase 3 gate:** ensemble (5 seeds) + TTA (original + horizontal flip, σ²_mix = mean(σ²) + var(means)) improves test RMSE over the Phase 1 single model; expected gain ~0.005–0.010 — the documented last mile.

**E. Uncertainty calibration gates (mandatory before downstream use — spec §8)**
- On the validation block: `ECE_regression = Σ_b (n_b/N)·|RMSE_b − σ̄_b|` over 10 equal-count bins of `σ̄ = sqrt(0.5·(σx²+σy²))`. **Gate: ECE < 0.15 yd.**
- Coverage at Mahalanobis ≤ 1 (expect 0.393) and ≤ 2 (expect 0.865) for 2D Gaussian. **Gate: within ± 5 pp of nominal.**
- `test_calibration_synthetic`: on synthetic data with known σ = 0.5 yd noise → ECE < 0.10, coverage within ± 3 pp.
- If gates fail: isotonic recalibration `σ_cal = f(σ̄)` or temperature-scale `logvar' = logvar + log T` fit to minimize validation NLL; re-check; if still failing, the module ships point predictions only and the failure is **logged, not silently consumed** by the engine's calibration rebuild.
- File-verifiable: report the 10-bin reliability rows (n, mean σ̄, RMSE) in the training log.

---

## 4. Milestones with acceptance criteria

**M0 — Intake contract + fixture (the skeleton every later milestone hangs on)**
- Deliver: lake layout (`lake/tracking/...` per §2), raw-first intake contract (fetch → validate → atomic-write → commit/schedule), env-tuned pacing module, synthetic 2-game fixture with known kinematics (spec §10).
- Acceptance: fixture passes `test_loader_schema`; a dry-run intake ingests the fixture into the lake with valid/invalid classification; no secrets, no hardcoded pacing.

**M1 — Bootstrap corpus landed (source 1A)**
- Deliver: asonty TSVs fetched via `raw.githubusercontent.com`, normalized to §2 schema (dead-time trim, `playDirection` canonicalization, `absoluteYardlineNumber` → `yardline_100`, identity keys preserved), stored as per-play Parquet with feed metadata (`source=asonty`).
- Acceptance: `test_loader_schema` green on real data; frame counts reconcile against the highlights list; every play carries 23 entities/frame after trim; a provenance manifest (playKey → game_id/play_id → sha256 of raw TSV) is committed.

**M2 — Physics baseline live on real data**
- Deliver: Phase 0 baseline (constant-velocity extrapolation + ball-landing drift prior) running over the M1 corpus.
- Acceptance: `test_baseline_beats_naive` green on the 1A corpus; Phase 0 RMSE on held-out games recorded as the floor in the training log; the number is file-verifiable, not asserted.

**M3 — Scrape-lane verdict (source 2)**
- Deliver: the Step-0 live probe of `nextgenstats.nfl.com/api` (browser UA + Referer contract) with logged status codes; if live, the raw intake built on the four doctrines (raw-first tree, validity-by-content, pace-between-attempts, empty-envelope sentinel) plus finality-from-schedule and failed≠absent bookkeeping.
- Acceptance: probe result recorded (live/dead + evidence); if live, one full week ingested with zero empty envelopes banked and `failed` plays listed, not dropped; if dead, the NFL Pro secured fallback is **spec'd only** — no credential handling, no login automation — and returned to Garrett as a blocker (§5).

**M4 — Movement-spec integration (loader → features)**
- Deliver: all §4 features computable from the frame tables (kinematic window aggregates, relational group incl. `dist_to_ball_landing` anchor, role/context embeddings inputs, landing conditioning columns).
- Acceptance: `test_causality`, `test_canonicalization`, `test_flip_involution` green on real data; Phase 1 training starts from this loader; the causality test is re-run in CI on every loader change.

**M5 — CV lane proof-of-concept (source 3)**
- Deliver: reimplemented camera-compensation + yardline-homography pipeline (from the `cv-movement-primitive.ts` math, PanopticPigskin doctrines studied, zero ported code), validated against the 1A corpus where both exist; detector decision spec'd (procure vs. train) but not improvised.
- Acceptance: on ≥ 50 plays with overlapping coverage, per-player CV-derived positions agree with Zebra-chip frames within **mean error < 1.0 yd, 95th percentile < 2.0 yd**; ball interpolation handles dropped frames without teleporting (passes the no-teleport inequality); **production wiring stays gated on counsel clearance or a licensed input** — the gate is a repo flag, not a comment.

**M6 — Licensed-feed readiness (source 4)**
- Deliver: the playbook's pipeline shape implemented with the vendor intake **stubbed and disabled** (vendor API → rate-limited source-registry-gated workers → Parquet lake → feature jobs → Postgres feature tables → engine consumes features only), plus the SkillCorner demo-request materials (analytics-product license scope, historical + in-season delivery, trial slice, indemnity clause ask).
- Acceptance: pipeline passes dry-run on the 1A corpus through the same code path the vendor would take; the intake worker cannot be enabled without an explicit config flag + signed-license record; **no vendor API is touched without Garrett's approval.**

---

## 5. Data-QC rules — standing repo rules (the coding agent adds these to the repo's rule docs, not just this plan)

1. **Raw-first, one-way boundary.** The intake stage commits raw payloads only — no reshaping, no modeling deps. Reshape/feature stages read the raw tree; they never write into it. (Doctrine: nfl-ngs-raw SDV `-raw` contract.)
2. **Validity-by-content.** Presence is not validity: a payload is trusted only if it parses AND has rows. Empty payloads are never written; an empty result is classified absent, not stored.
3. **Empty-envelope sentinel.** HTTP 200 with an empty body, or an envelope like `stats: []`, means "nothing here." Never bank it; never let a presence-based resume treat it as done.
4. **Pace-between-attempts.** Sleep after EVERY attempt (success or failure) in a `finally`. All pacing env-tuned (sleep / timeout / retries), never hardcoded. Retry transient statuses {408, 429, 500, 502, 503, 504}; persistent non-404 failures raise, are counted, and fail the stage — never swallowed.
5. **Finality from the schedule.** A week/season is refetched until every game is FINAL. Future weeks are never requested. Failed plays are recorded as `failed`, never silently absent.
6. **Atomic writes + upsert identity.** Writes are tmp + rename. Schedule/metadata records are upserted by `game_id`; re-ingestion of the same bytes is idempotent and safe.
7. **No raw frames in Postgres.** Per-play Parquet in the lake; Postgres holds derived per-play features only (playbook storage discipline). A season is ~50M+ player-frames — the DB never sees them.
8. **Canonicalize at load.** All plays normalized to `play_direction = "right"`; augmentation flips applied to raw coords before feature computation, involutive.
9. **Game-level splits, no leakage.** Chronological expanding window; standardization statistics from train games only; causality enforced in the loader and tested.
10. **License posture.** No BDB CC BY-NC data in training (see §7 — verify even benchmark terms). No code ported from AGPL sources (PanopticPigskin) or any external repo — methods only, reimplementation from specs. nflverse aggregates used under CC-BY-4.0 with attribution.
11. **Uncertainty gates before downstream.** The §3-E calibration gates are hard: no calibrated uncertainty leaves the module for the engine's calibration rebuild unless ECE < 0.15 yd and coverage is within ± 5 pp. Failures ship point-only + a logged failure.
12. **Every number file-verifiable.** RMSE, ECE, coverage, bin rows, and baseline comparisons are written to the training log. Counts and metrics are never asserted without the file behind them.

---

## 6. What blocks on Garrett (surface these; do not work around him)

1. **Licensed feed money.** SkillCorner (low-to-mid five figures/yr estimate — verify via demo), Genius Sports (six-to-seven-figure official feed). Even the $99.99/mo SIS DataHub Pro adjunct needs his word. He spends nothing without his approval — the plan stops at M6's stubbed pipeline.
2. **NFL+ Premium / user-bound token** if the public NGS API probe (M3) comes back dead: the `pro.nfl.com/api/secured/*` fallback requires a token from an id.nfl.com login on his NFL+ Premium account. That is his credential and his subscription — never to be handled by the coding agent without his explicit direction.
3. **NFL ToS exposure on the scrape lane.** Automated access to the NGS web API is at tolerance; the DIY-CV-on-broadcast lane is blocked without counsel (playbook ruling). Neither lane self-clears — his call on risk tolerance, possibly with counsel.
4. **BDB license verification** (see §7) before any BDB data — even benchmark use.
5. **Movement-spec open questions (§12):** (a) which NGS seasons are licensed/available for the expanding-window depth; (b) is the ball-landing spot available at inference in production, or does the landing head need an upstream landing-spot predictor (with logged degradation); (c) GPU budget for the 5-seed ensemble cadence (nightly vs weekly).
6. **Detector decision (M5):** procure vs. train the player detector for the CV lane — a build/buy call with cost attached.

---

## 7. License and provenance notes the coding agent must not get wrong

- **Big Data Bowl 2026 data:** the movement spec (2026-09-26) records it as CC BY-NC 4.0 with benchmark-only use permitted; the older tracking playbook (2026-07-02) records the 2026 terms as no-license/confidential with a post-contest data-destruction requirement. **These conflict.** Resolve by reading the actual current license text before ANY BDB data touches the build — default posture until then is no BDB data at all, not even for benchmarking.
- **asonty/ngs_highlights:** verify the repo's license before commercial training use; currently used as bootstrap + validation corpus.
- **nfl-ngs-raw (sportsdataverse):** no license file found on the repo — **method only**, no code copied, regardless.
- **PanopticPigskin (sumedhk0):** AGPL-3.0 — study only, never port code; reimplementation must be clean-room from the movement spec and `cv-movement-primitive.ts` math.
- **nflverse data:** CC-BY-4.0, attribution required ("Data from nflverse (https://github.com/nflverse)").
- **SkillCorner/Genius:** licensed feeds — contract terms (including indemnity for downstream commercial use) govern; no integration code runs against a vendor API without a signed license on file.
- **General:** methods-only posture throughout — learn from other builders' methods, rebuild as GSE's own output; no copied code.

---

## 8. Build order summary (for the coordinator)

`M0 skeleton → M1 bootstrap corpus (asonty) → M2 physics baseline on real data → M3 scrape probe/verdict → M4 spec loader+feature integration → M5 CV lane PoC (gated) → M6 licensed-feed pipeline (stubbed, awaiting Garrett)`.

The movement module's Phase 0 → Phase 3 training progression (spec §9) begins at M2/M4: the physics baseline must exist on real data before any learned model trains, and the single relational model must beat the baseline by ≥ 10% before ensembling. Uncertainty calibration gates (§3-E) are the last door before the engine's calibration rebuild consumes anything.

*Methods-only plan. No code reproduced from any external source. No credentials in this document. No live-browser actions taken.*
