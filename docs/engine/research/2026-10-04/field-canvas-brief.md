# Field Canvas — Research Brief
**Date:** 2026-10-04 | **Status:** research only, no code | **Lane:** GSE vision ("field canvas")

> Goal: map NFL broadcast frames to canonical field coordinates via per-stadium camera geometry — the OneCanvas pattern (known geometry + camera pose → one canonical canvas), adapted to football where the "known geometry" is the field plane and the mapping is a homography.

## 0. TL;DR

- **Field registration for American football is solvable on wide views, unsolved-with-numbers on tight views.** Classical keypoint + DLT/RANSAC homography works on All-22; tight broadcast zooms suffer line-identity ambiguity (every 5-yard line looks identical) and ill-conditioned solves. No published American-football method is quantitatively benchmarked on tight views.
- **Per-stadium broadcast camera positions are NOT public.** No league template, no network-published plots. Any geometry table must be *learned* (self-calibrated from field landmarks per broadcast), not looked up.
- **No public American-football calibration dataset exists.** Soccer owns this lane (SoccerNet calibration: 21,132 annotated frames). The only public NFL-coordinate ground truth is Big Data Bowl tracking data (x: 0–120 yd, y: 0–53.3 yd).
- **Field geometry is fully verified** against the NFL rulebook (hashes 70'9" from sidelines → 18'6" apart; goalposts 18'6" wide; crossbar 10 ft). Two values remain UNVERIFIED (numeral size, gooseneck offset).
- **Recommended first milestone:** field-template JSON + homography module in `Beexly/Sports` + a per-stadium *learned-prior* calibration DB schema, proven on one stadium's All-22/wide footage with withheld-marking reprojection error as the metric.

---

## 1. Prior Art: field registration / homography for American football broadcast

### 1a. American-football-specific papers

- **"Homography Based Player Identification in Live Sports"** — Pandya et al., CVPRW 2023 (NFL domain). Keyframe field registration with homography propagation between keyframes; synchronizes live NFL video with external RFID/Next Gen Stats identity tracks + helmet video to map players into field coordinates.
  https://openaccess.thecvf.com/content/CVPR2023W/CVSports/papers/Pandya_Homography_Based_Player_Identification_in_Live_Sports_CVPRW_2023_paper.pdf
- **"3D Reconstruction of American Football Game Situations from Handheld Monocular Video"** — Sawafuji et al., CVPRW 2026. *Topology-constrained homography estimation*: abandons absolute landmarks, exploits the field's relative grid structure so calibration stays stable on feature-sparse footage; physics-aware trajectory smoothing. Explicitly states "standard homography estimation fails to resolve the spatial ambiguity of repetitive grid lines." The only American-football paper treating sparse/tight views as its primary design case.
  https://openaccess.thecvf.com/content/CVPR2026W/CVsports/papers/Sawafuji_3D_Reconstruction_of_American_Football_Game_Situations_from_Handheld_Monocular_CVPRW_2026_paper.pdf
- **"Automated Pre-Play Analysis of American Football"** — Wilhelm & Getzke, Univ. of Cologne, 2025. Modular pipeline: player detection + homography field registration from detected yard lines and hash marks + formation classification → standardized bird's-eye views. (Cited via repo README; no arXiv PDF located.)
  https://github.com/channaholic/football-pre-play-analysis

### 1b. Method families

1. **Keypoint-based marking detection + DLT/RANSAC homography** — the classical default. Yard lines/hash marks detected (Hough/Sobel; Stanford CS231A project documented Sobel + Hough on yard lines, hash marks via CIELAB: http://web.stanford.edu/class/cs231a/prev_projects_2015/LeeTimothy.pdf), line-line intersections as correspondences to a known NFL template. Manual-landmark workflow (≥6–8 well-distributed non-collinear landmarks/keyframe, withheld-landmark residual checks) is still the production fallback: https://github.com/bgyss/football-tracking/blob/HEAD/docs/system-design.md
2. **Semantic segmentation of lines → homography solve** — deep-structured line approach transposed onto the NFL template.
3. **Hybrid identity-then-geometry** — a 2026 NFL All-22 evaluation found a pretrained Roboflow keypoint model (`football-field-key-points-mvmjf/2`) *named* the correct yard line on 16/20 frames (never swapped lines, RANSAC residuals 1–3 px) but placed keypoints ±3–30 px off the paint. Conclusion: "model names the lines, classical measures them" — deep keypoints for identity, classical Hough/DLT for precision: https://github.com/sumedhk0/nflgsplat/blob/HEAD/docs/superpowers/specs/2026-07-04-pretrained-hybrid-field-registration-design.md
4. **Learned deep keypoint heatmaps + DLT + nonlinear refinement** — PnLCalib-style (HRNetv2 heatmaps + DLT + nonlinear refinement), described as an upgrade path for NFL-template calibration: https://github.com/aahmadf123/football-iq/issues/127
5. **Topology/grid-structure-constrained homography** — Sawafuji 2026 (above).

### 1c. Public code repos

- `channaholic/football-pre-play-analysis` — broadcast pipeline w/ homography from yard lines & hash marks: https://github.com/channaholic/football-pre-play-analysis
- `bgyss/football-tracking` — calibration module (homography from landmark JSON, pixel-space RANSAC, withheld-landmark residuals, canonical NFL template): https://github.com/bgyss/football-tracking/blob/HEAD/CLAUDE.md
- `wannahappyaroundme/american-football-field-tracker` — manual 4-point homography to BEV canvas: https://github.com/wannahappyaroundme/american-football-field-tracker/blob/HEAD/CLAUDE.md
- `mmeendez8` NFL field-mapping tutorial (NFL-dim template + manual correspondence): https://github.com/mmeendez8/mmeendez8.github.io/blob/HEAD/_posts/2024-02-07-nfl-field-mapping.md
- `aahmadf123/football-iq` issue #127 — regime-aware calibration design (Hough + normalized DLT + RANSAC, 9-DoF Kalman smoothing, confidence score): https://github.com/aahmadf123/football-iq/issues/127
- `roboflow/sports` — open sports CV toolkit: https://github.com/roboflow/sports
- Soccer transfer: `alexk1704/sn-calibration` (SoccerNet benchmark): https://github.com/alexk1704/sn-calibration ; TVCalib (pose+focal+distortion fit): https://openaccess.thecvf.com/content/WACV2023/papers/Theiner_TVCalib_Camera_Calibration_for_Sports_Field_Registration_in_Soccer_WACV_2023_paper.pdf ; BroadTrack temporal camera tracking (WACV 2025): https://openaccess.thecvf.com/content/WACV2025/papers/Magera_BroadTrack_Broadcast_Camera_Tracking_for_Soccer_WACV_2025_paper.pdf

### 1d. Tight broadcast views vs wide All-22

**Why tight views break:** pipelines rely on line markings and intersections as correspondences. Tight zooms show sparse, unevenly distributed markings — and football markings are maximally hostile: every 5-yard line is visually identical, so 1–2 visible lines yield **line-identity ambiguity** (which yard line is it?), and the few correspondences are nearly collinear → ill-conditioned DLT. Stated explicitly in Magera et al. 2025 (https://arxiv.org/abs/2504.20052) and Sawafuji 2026.

**What holds up on tight views:**
- *Hybrid identity-then-geometry* (recognized yard number/named line resolves identity; classical geometry gives precision) — empirically validated on NFL All-22, qualitatively.
- *Sawafuji topology-constrained estimation* — designed for the sparse regime; qualitatively demonstrated.
- *Temporal propagation* (BroadTrack-style pan/tilt/zoom modeling) — per-frame weakness mitigated across time; camera priors must be refit to NFL broadcast geometry.

**Verdict:** nothing in American-football literature is *proven* on tight broadcast views with a benchmark number. Wide All-22 registers fine with any classical method. Tight views need identity anchors (yard numbers, hash rows) + temporal smoothing, and remain the research frontier.

### 1e. Honest gaps
- No public American-football calibration benchmark (no CARWC/SoccerNet-Calibration equivalent).
- No published deep-homography paper evaluated on American football — all numbers live on soccer.
- No arXiv PDF located for Wilhelm & Getzke 2025 or the Roboflow football keypoint model.

---

## 2. Camera Data: publicly known NFL broadcast camera positions

### HEADLINE: per-stadium positions are NOT public.

There is no public database, no published network camera plot, and no league-mandated template. Per a 2024 report citing a Buccaneers official who works with the NFL's broadcast partners: *"NFL rightsholders are not required to have X-amount of cameras at specific locations at games. And there is no 'template' where the NFL requires cameras situated at specific areas."* Camera count itself is network-discretionary (more for 4pm/primetime).
https://www.joebucsfan.com/2024/10/background-info-on-how-networks-select-cameras-for-nfl-broadcasts/

**Implication:** per-stadium geometry must be *reconstructed* (calibrated from imagery per broadcast), not looked up. Any geometry table is a learned snapshot, not a static truth.

### What IS publicly known (positional, mostly non-numeric)

- **Main play-by-play ("up") cameras:** fixed positions in the press box, in line with the 50 and both 20-yard lines; 2–4 in the press box today; minimum ~15 cameras per telecast. No published per-stadium heights.
  http://openscholar.uga.edu/nanna/record/27779/files/Black_uga_0077N_16995.pdf?registerDownload=1&version=1&withMetadata=0&withWatermark=0
- **High end zone:** two, one each end, at the edge of the second grandstand level, between the goalpost uprights. **Low end zone:** one each end, on a riser on the playing surface or front row of the lowest level. (Same UGA source.)
- **Sideline carts:** run along the field at the line of scrimmage; one NFL Films 3D production cited a cart platform ~15 ft off the ground: https://www.sportsvideo.org/2008/11/26/inside-look-at-nfl-3d-hd-production-2d-systems-workflows-play-key-role/
- **Skycam:** best-documented heights, but game-variable — standard ~22 ft above ground behind the offense/defense (SNF); "high sky" ~50 ft; Fox Super Bowl era: high 55–90 ft, low 12–35 ft; rigging anchors are game-day decisions, proprietary to the operator.
  https://www.sportsbusinessjournal.com/Daily/Weekend-Rap/2019/08/25/NBC-Preseason-Camera/ and https://www.tvtechnology.com/news/the-stewards-of-the-big-game-ready-to-take-on-super-bowl-lix
- **Pylon cameras:** goal-line pylons, both sides, both goal lines (4 total); 18-inch pylons housing micro cameras; NEP 2024 upgrade (4K, 240fps). Position is exactly known in field coordinates (pylon spots are rule-fixed) but deployment is network/game-dependent.
  https://www.espn.ph/blog/nflnation/post/_/id/179135/how-pylon-cams-will-save-nfl-officials-sometimes and https://www.sportsvideo.org/2024/10/03/nep-speciality-cameras-improve-pylon-camera-offers-4k-pan-and-scan-and-super-slo-mo/
- **All-22 / coaches film:** cut from two cameras — one on the 50-yard line, one in the end zone, both "high in the rafters." Team-run, stadium-provided; no published heights/deck numbers.
  https://Deadspin.com/what-you-miss-because-you-cant-see-the-nfls-all-22-foot-5868097/
- **Key production fact:** the yellow first-down line requires a field survey days before each game plus calibration of the three main cameras (pan/tilt encoders, zoom sensors, inclinometer for height, gyroscope) against a digital field map — that data stays inside the networks' production trucks, never published.
  https://illumin.usc.edu/how-the-presidential-election-gave-us-the-technology-to-plot-the-first-down-line-in-football/

### Proxies for per-stadium geometry (ranked)
1. Stadium architectural cross-sections / construction docs (press-box elevation + seating rake bound main-camera height).
2. Press/broadcast photos of camera platforms in situ (deck level + approximate yard line).
3. Published angle-design rules: concourse-level shots 19–25° from playing surface; press box / high end zone ≤35° (https://www.tvtechnology.com/opinions/three-mistakes-to-avoid-in-venue-broadcast-design).
4. Sports Video Group "Live From…" features (per-game inventories, notable rigging points).
5. Stadium TV-operations PDFs (college venues publish these; check NFL media-ops pages per stadium before assuming none exists).

---

## 3. Datasets

### 3a. Field-marking annotations — American football: NONE public.
No public dataset of annotated American-football field markings exists. Adjacent leads only: Madden-NFL-20 player dataset (600 images, player detection only: https://library.imaging.org/admin/apis/public/api/ist/website/downloadArticle/ei/33/6/art00004); Roboflow Universe American-football *player* datasets (players, not lines); a 2026 CVPRW paper on 3D reconstruction of American football whose evaluation set is explicitly proprietary: https://openaccess.thecvf.com/content/CVPR2026W/CVsports/papers/Sawafuji_3D_Reconstruction_of_American_Football_Game_Situations_from_Handheld_Monocular_CVPRW_2026_paper.pdf

### 3b. Broadcast frames with calibration ground truth — American football: NONE public.
Soccer owns this lane:
- **SoccerNet calibration-2023 (SN-Calib):** 21,132 broadcast frames / 500 matches, 167,589 field-marking elements + 53,577 goal-post elements across 26 classes; ground truth derived by fitting camera models (pinhole + 1 radial-distortion coefficient). De-facto standard benchmark. Public via HF `SN-Calibration-2023`; access table: https://pypi.org/project/SoccerNet/0.2.0/ ; methods: https://github.com/SoccerNet/sn-calibration
- **WC14** (Homayounfar et al. 2017): 395 World Cup images each with a homography (annotations have known errors; CARWC is the corrected re-annotation): https://arxiv.org/pdf/1604.02715
- **SoccerNet GSR 2024/2025:** 30-s broadcast clips with player positions in field coordinates (implicitly validates per-clip homography): HF `SN-GSR-2024` / `SN-GSR-2025`.

### 3c. NFL player tracking in field coordinates — YES, public.
**NFL Big Data Bowl** (NFL + AWS, Kaggle; free account + accept data-use rules; "competition, non-commercial and academic usage" per https://arxiv.org/pdf/2206.13222). Editions cover 2017–2024 seasons across themes (2020: 2017–18 runs; 2023: 2021 pass rush; 2024: 2022 tackling; 2025: pre-snap motion; 2026: 2023–24 movement prediction, 349 games / 18,009 pass plays).
https://www.sportsbusinessjournal.com/Articles/2025/09/25/nfl-selects-predictive-player-movement-as-focus-for-2026-aws-backed-big-data-bowl/

**Coordinate system (verified from data dictionary):** `x` = position along the long axis, 0–120 yd; `y` = position along the short axis, 0–53.3 yd; field-fixed (not offense-normalized); `playDirection` records offense direction; orientation (`o`) and direction (`dir`) are separate degree fields. 10 frames/sec (NGS).
https://github.com/thompsonjamesbliss/nfl-big-data-bowl-regional-event-data/blob/HEAD/README.md

**Internal-use note:** per GSE's standing NGS doctrine, BDB-derived learning is reasoning fuel only — no raw redistribution into public products.

### Implication
To learn NFL field geometry from broadcast video, GSE must either (a) bootstrap from soccer calibration methods/data and re-fit to NFL geometry, or (b) build its own annotated NFL calibration set. The Big Data Bowl tracking data is the downstream validator: project tracked players into the frame and check alignment.

---

## 4. Field Geometry — verified constants (NFL rulebook)

Primary authority: 2022 Official Playing Rules of the NFL (operations.nfl.com). Geometry is stable (unchanged since 1920, per the Pro Football Hall of Fame), so the 2022 edition is valid for template building. Rulebook: https://smart.socialdev.workers.dev/page-https-web.archive.org/web/20221007123209/https://operations.nfl.com/media/5kvgzyss/2022-nfl-rulebook-final.pdf

| Constant | Value | Unit | Source |
|---|---|---|---|
| Overall length (incl. end zones) | 360 | ft (120 yd) | Rule 1-1-1: "360 feet in length and 160 feet in width"; HOF confirms 100 yd goal-to-goal + 10-yd end zones: https://www.profootballhof.com/news/changing-the-rules-archived |
| Overall width | 160 | ft (53⅓ yd) | same |
| End zone depth | 10 | yd | Rule 1-1-1: goal lines "10 yards from and parallel to each end line" |
| Hash (inbound line) distance from sideline | 70 ft 9 in | ft/in | Rule 1-1-1 ("70 feet 9 inches inbounds, from each sideline") + Rule 1-2-1 |
| **Distance between hashes** | **18 ft 6 in** | ft/in | Arithmetic: 160 − 2(70.75) = 18.5 ft; equals goalpost width — hashes line up with the posts |
| Yard line spacing | every 5 | yd | Rule 1-2-1 |
| Yard line width | 4 | in | Field-markings spec item 2 (goal line & yellow lines 8 in) |
| Goal line width | 8 | in | Rule 1-2-3 (entire width lies in its end zone) |
| 1-yd hash marks | every 1 yd between 5-yd lines; 2 ft long | yd/ft | Rule 1-2-2 (NFL: 4 in wide × 2 ft long, spec item 10) |
| Numbers placement | bottoms begin 12 yd in from each sideline; 2 yd in length | yd | Rule 1-2-2 |
| Numbers size (h × w) | **UNVERIFIED** | — | Rulebook gives placement only; commonly cited 6 ft × 4 ft is non-official — do not use without verification |
| Sidelines / end lines | solid white border, min 6 ft wide | ft | Rule 1-1-2 |
| Goalposts: crossbar width | 18 ft 6 in | ft/in | Rule 1-3-1 |
| Goalposts: crossbar height | 10 | ft | Rule 1-3-1 ("top face … 10 feet above the ground") |
| Goalposts: upright height above crossbar | 35 | ft | Rule 1-3-2 |
| Goalposts: upright diameter | 3–4 | in | Rule 1-3-2 |
| Goalposts: gooseneck offset | **UNVERIFIED** | — | Rulebook requires only "offset from the end line"; no numeric offset (manufacturer spec) |
| Goalposts: ribbon | 4 in × 42 in, orange | in | Rule 1-3-2 |
| Pylons | 4 inside corners (goal line/sideline) + 2 per end line | — | Rule 1-2-2 |
| Broken yellow restriction line | 9 ft outside border (sideline, non-bench); 6 ft in end zones / behind bench | ft | League spec item 1 (FLAG: Rule 1-1-2 text says 6 ft; same document's league spec says 9 ft — use 9 ft as working figure) |
| Coaching box | solid yellow line 6 ft behind border (bench area) | ft | Rule 1-1-2 |
| Bench placement | min 30 ft back from sidelines; between the 30-yd lines | ft/yd | Rule 1-1-2; spec item 8 |
| Boundary measurement datum | all measurements from inside edges of boundary lines | — | Rule 1-2-3 |

**NCAA differences (template-relevant):** hashes 60 ft from sideline → 40 ft apart (vs NFL 18'6"); goalpost width same 18'6"; crossbar 10 ft same; uprights ≥30 ft above ground (vs NFL 45 ft total). Source: NFL field-markings item 10 ("70'9" for professional football, 60'0" for college"); NCAA via https://www.uiltexas.org/files/athletics/forms/football-uil-ncaa-exceptions.pdf (second-hand quoting of NCAA book — flagged).

---

## 5. Build Recommendation

### 5a. Architecture (OneCanvas pattern, football-adapted)

OneCanvas lifts patches to 3D via depth + pose and reprojects to one canvas. Football's equivalent: the field is a known **plane**, so the mapping frame → canvas is a **homography** (no depth needed). The "known geometry" is the verified field template (§4); the "camera pose" is *estimated per broadcast* from detected landmarks (§2: nothing is published, so self-calibration is the only path).

Pipeline: `frame → marking detection (yard lines, hash marks, numbers, goalposts) → line-identity resolution → DLT/RANSAC homography → canonical field canvas (360×160 ft template) → downstream (player projection, formation geometry)`.

### 5b. First milestone (smallest thing that proves the pipeline on one stadium)

**M1 — "One stadium, wide views, withheld-marking error."**
1. **Field template** (`Beexly/Sports`, e.g. `intelligence/vision/field_template.json`): the §4 constants as machine-readable geometry — every yard line, hash mark row, number position, goalpost, pylon as named 2D landmarks in field coordinates (feet, origin at one corner). Include the two UNVERIFIED values as `null` with flags, never as guesses.
2. **Homography module**: line/keypoint detection → identity resolution → normalized DLT + RANSAC → homography H (frame→field). Start classical (Hough/Sobel per the Stanford recipe); adopt the hybrid identity-then-geometry pattern (deep model names the lines, classical measures them) as the tight-view upgrade.
3. **One-stadium proof**: pick one stadium's All-22 or wide broadcast footage (N ≥ 50 frames, varied plays). For each frame: detect markings, solve H on a subset, report **reprojection error on withheld markings** (median px error + inlier rate). Success bar: median withheld-marking error < 5 px on wide views with a documented failure-mode log on tight views.
4. **Downstream validation**: project Big Data Bowl tracking points (§3c) for the same game (if available) into the frame via H⁻¹ and check player-alignment qualitatively.

**Explicitly out of M1:** tight-view solving (log failures, don't fix), learned deep homography, multi-camera fusion, real-time.

### 5c. Per-stadium calibration DB schema

Since positions aren't published (§2), the DB stores **learned priors**, not constants. Proposed schema (one row per stadium × camera slot × broadcast):

```
stadium_calibration (
  stadium_id        TEXT,     -- e.g. "nrg-stadium"
  venue_name        TEXT,
  broadcast_date    DATE,
  network           TEXT,     -- CBS/FOX/NBC/ESPN/Amazon; camera complements are network-discretionary
  camera_slot       TEXT,     -- pressbox-50 | pressbox-20 | hi-ez | lo-ez | skycam | pylon | all22-side | all22-ez
  focal_px_est      REAL,     -- estimated focal length (px), NULL until observed
  height_ft_est     REAL,     -- estimated camera height, NULL until observed
  yardline_est      REAL,     -- estimated lateral position (field coords)
  homography        BLOB,     -- 3x3, representative frame→field, NULL until observed
  reproj_err_px     REAL,     -- median withheld-marking error backing this row
  frames_used       INT,
  source            TEXT,     -- estimated | architectural | manual  (never "published")
  confidence        REAL,     -- 0..1 composite (inlier ratio, line count, coverage, temporal stability)
  created_at        TIMESTAMP
)
```

Populate initially from architectural proxies (§2.6); refine per broadcast via self-calibration; the `confidence` composite gates whether a row is trusted (mirror the football-iq 5-component confidence design: inlier ratio, line count, parallel-line score, temporal stability, field coverage).

### 5d. Sequencing (fits research → wire → weight → calibrate → test → polish)

1. M1 as above (template + homography + one-stadium proof). **2.** Tight-view upgrade: yard-number OCR / named-line identity + temporal propagation (BroadTrack-style pan/tilt/zoom model refit to NFL). **3.** Multi-view fusion: broadcast + All-22 → single canvas (closest to true OneCanvas). **4.** Downstream: formation geometry features into the engine's as-of-fenced feature frame (point-in-time rules apply — canvas features are computed from pre-game footage only for live use).

### 5e. What NOT to do
- Don't build a per-stadium camera table from guessed numbers — every unverified constant corrupts every downstream projection.
- Don't train on soccer calibration data and expect NFL geometry to transfer — transfer the *methods and metrics*, rebuild the template and detectors for NFL.
- Don't touch NGS/BDB raw data in public products (internal reasoning fuel only, per standing doctrine).

---

## 6. Gaps & risks (honest)

1. **No football calibration benchmark** → we grade ourselves; withheld-marking error + BDB projection checks are the honest metrics until we annotate our own set.
2. **Tight views unproven** → M1 deliberately scopes to wide views; tight-view is a phase-2 research problem (Sawafuji + hybrid identity are the leads).
3. **Camera geometry is per-broadcast, not per-stadium** → the DB is priors, and every new broadcast re-estimates. Skycam/pylon deployments vary game to game.
4. **Two template values UNVERIFIED** (numeral size, gooseneck offset) → flagged null, not guessed.
5. **Legal:** broadcast footage is rights-holder property — ingest for internal reasoning only, same posture as NGS data; never republish frames.
