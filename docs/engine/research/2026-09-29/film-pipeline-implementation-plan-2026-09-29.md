# Film-Pipeline Implementation Plan — GSE (2026-09-29)
**Status: RESEARCH — UNTESTED — QUEUED FOR EVALUATION. Nothing below is approved for build until the Phase 0 gate is defined and footage sourcing is resolved.**
Companion docs: `patent-mining-are-gse-2026-09-29.md` (idea report) · `patent-forensics-2026-09-29.md` (why they stopped) · `second-pass-leverage-review-2026-09-29.md` (cross-report synthesis).

---

## 1. What we are building (scope)

An automated broadcast-film pipeline for GSE, assembled from expired-patent architectures re-implemented with modern tools:

**ingest broadcast → play segmentation → replay discrimination → camera calibration → field-anchored telestration → semantic moment search**

Two outputs, both internal:
- **(a) Content:** 2–4 second field-anchored telestrated clips from real footage, feeding the X video operation per the standing video rule (real footage, short, telestrated, commentary-led).
- **(b) Data:** automated charting labels (formations, routes, personnel, play boundaries) → proprietary training data for the variance model, the player-signals table, and the rankings program. The labeled dataset builds itself as a byproduct of the content pipeline.

**What we are NOT building:** no hardware, no stadium installs, no sensor arrays, no product for sale. Internal capability only — the public site shows projections and rankings, per the 9/28 public/private doctrine.

---

## 2. Why they stopped (forensics verdict — the question Garrett asked)

Full evidence in `patent-forensics-2026-09-29.md`. Consolidated:

| Family | Mechanism | Why they stopped |
|---|---|---|
| **Sportvision telestration** (US7075556B1, US5953077A, US6133946A, US6292130B1, US6229550B1, US6466275B1) | Normal 20-year term expiry (2017–2019) | **They won.** Emmy-winning yellow first-down line, still on NFL broadcasts via SMT, which acquired Sportvision Oct 2016. Filing tapered heading into the sale. True dead ends only for the glowing puck (audience rejection) and the six-radar bat-speed rig; PITCHf/x superseded by Statcast. |
| **Sharp Labs summarization** (US7499077B2, US7312812B2, US7639275B2, US7474331B2, US8018491B2, US7474698B2, US7653131B2) | Fee lapse — deliberately unpaid | **Orphaned + crisis + superseded.** Sharp Japan wouldn't productize it; the HiMpact Sports/ESPN licensing spin-out fizzled; Sharp's 2012–2016 collapse and Foxconn takeover gutted the US lab; handcrafted heuristics were being superseded by learned methods. Their own engineers had already concluded deterministic rules "couldn't cover every situation." |
| **Object Prediction Tech** (US7609855B2, vanishing-point) | Fee lapse | Small-company tracker lapsed before term. Same brittle-geometry limits. |

**Neither family stopped because the core problem was unsolvable.** Sportvision's product still airs. Sharp's summarizer demonstrably worked (45-minute game summaries, ESPN interest) — it died of corporate neglect and a methods-generation change. The field has since validated both architectures with modern tools (nflgsplat: classical geometric front end → deep refinement on a consumer RTX 4080; soccer charting real-time on an RTX 4060). **We are re-implementing a validated architecture in the exact gaps the expired claims leave open** — automatic generation (their telestrator claims are operator-triggered), segmentation-based compositing (theirs is colorimetry), learned boundaries (theirs are handcrafted heuristics), zero stadium hardware (theirs requires instrumented cameras).

---

## 3. Cause → action chain

For every cause of their stopping or limitation, the corresponding design action:

| Their cause / limitation | Our action |
|---|---|
| Instrumented cameras (pan/tilt/zoom encoders, gyros) + continuous re-registration | Image-based match-moving from broadcast frames; zero stadium hardware; self-recalibrating |
| Colorimetry blending breaks under weather, lighting shifts, uniform/field color collisions | Neural segmentation masks (players vs field) instead of chroma-keying |
| Single-cue brittleness: green field, converging lines, logo-bumper replays, zoom cessation | Multimodal learned boundaries — scoreboard/clock OCR + audio events (whistle/crowd) + visual models + league data feeds; explicit uncertainty; no single cue as ground truth |
| Handcrafted heuristics (frame differences, histogram thresholds, 70% voting windows) | Classical geometry as cheap prefilter → learned models (YOLO/pose/trackers) for refinement |
| Ball "difficult, if not impossible" to track (their words) | Don't track the ball as primary signal; track players + field + clock, infer ball events from context |
| Corporate orphaning killed Sharp's commercialization | Internal capability, not a product sale — sidesteps the trap that killed HiMpact Sports |
| No labeled data for football-specific classifiers | Content pipeline generates weak labels as byproduct; hand-label a small validation set for ground truth; labels compound |

---

## 4. Expected results (by phase)

- **Phase 0 — play prefilter (1–2 weeks):** full broadcast game in → timestamped candidate play segments out, commercials/replays/dead time discarded. Success: boundary precision/recall ≥ 0.85 on a hand-labeled validation set (3 games).
- **Phase 1 — calibration + telestration (3–6 weeks):** play segments in → field-homography per frame → arrows/routes/zones anchored to field coordinates through camera moves → rendered 2–4s clips. Success: clips meet the standing video rule; homography reprojection error < 2% of field width on validation frames.
- **Phase 2 — replay discriminator + moment search (1–2 weeks):** zero replays indexed as new plays; semantic search ("3rd-and-long blitz, Cover 2") returns the right clip. Success: replay-as-play error rate < 1%; top-5 retrieval accuracy on a labeled query set.
- **Phase 3 — charting labels → engine (ongoing):** formation/personnel/route weak labels per play → agreement-checked against hand-charted sample → features into the variance model and signals table. Success: label agreement ≥ 0.8 on validation sample before any model consumes them.

---

## 5. Forecasted discrepancies (risk register)

1. **Broadcast grammar variance.** Sharp's core failure mode: non-standard cameras, graphics rebrands, bumper-less broadcasts, snow/worn lines. Forecast: Phase 0 recall drops 10–20 points on bad-weather or non-standard broadcasts. Mitigation: multimodal cues + uncertainty flags; quarantine low-confidence segments for human review instead of silently mislabeling.
2. **Calibration drift on fast motion.** Rapid pans/zooms break frame-to-frame homography. Forecast: telestration jitter on SkyCam whip-pans and end-zone cross-field throws. Mitigation: keyframe re-anchoring on detected yard lines; drop clips below a sharpness/registration threshold.
3. **Occlusion.** Line-of-scrimmage pileups are the densest occlusion scenario in mainstream sport; helmets defeat face-based re-ID. Forecast: pose/tracking degrades inside the box. Mitigation: field-anchored team regions over individual tracking in piles; don't promise per-player routes through contact.
4. **Weak-label contamination.** Classical prefilter labels are noisy; training on them unfiltered poisons the engine. Forecast: 10–30% weak-label error without QC. Mitigation: agreement gates (Phase 3 success criterion); human spot-check protocol; never let weak labels touch the model below the agreement bar.
5. **Compute cost.** Full-game processing at 27–32 FPS-equivalent on consumer GPUs is proven (soccer repos), but a 3-hour broadcast × 17 weeks × NCAA is real GPU-hours. Forecast: local RTX 4080-class handles prototyping; season-scale needs scheduled batch (overnight) or the GCP trial. Mitigation: prefilter first (cheap) → expensive detectors only on play segments; measure GPU-minutes per game in Phase 0 and cost it before Phase 1.
6. **Footage sourcing (OPEN QUESTION — must resolve before Phase 0).** Where does the broadcast video legally come from? Recorded broadcasts, league pass, All-22? Transformative short-clip use is the doctrine, but the *input* footage must be legitimately obtained. No prototype runs until this is answered.
7. **Their commercialization trap.** Sharp had working tech + ESPN interest and still failed to productize. Forecast: irrelevant to us — we are not selling a product. Internal capability only. The risk to watch is *scope creep into productization*; hold the fence.

---

## 6. Data and analytics needed

**Inputs:**
- Broadcast game footage (source TBD — §5, risk #6).
- Hand-labeled validation set: 3+ full games with play boundaries, down/distance, formation tags (built once, reused at every gate).
- League data feeds (schedules, rosters, official play-by-play) as weak supervision and cross-checks — enrichment, not required for v1.
- Scoreboard/clock OCR models, audio event detectors (whistle, crowd) — off-the-shelf components, not research.

**Analytics (measured at every gate):**
- Per-stage: boundary precision/recall, homography reprojection error, replay-as-play error rate, retrieval accuracy, label agreement vs hand-charted sample.
- Cost: GPU-minutes per game, storage per game (video + clips + labels).
- Yield: usable clips per game, labeled plays per game.

---

## 7. Backend and API needs

**Backend:**
- **Compute:** local RTX 4080-class GPU for prototyping (nflgsplat proves the tier); season-scale batch via overnight scheduling or the $300/90-day GCP trial. No 24/7 inference needed — batch film processing.
- **Storage:** object storage for video + clips; **Neon (existing gse-postgres)** for metadata, play index, labels, and pgvector embeddings for the semantic moment search. Postgres is the whole stack — no new database.
- **Orchestration:** batch job runner (pg_cron-scale thinking: DB-side scheduling where it fits; GPU work stays on the compute box).

**APIs:**
- **None required for the core pipeline** — that is the point. Broadcast video in, clips and labels out. No rights-holder data deals, no stadium integrations, no sensor vendors.
- **Optional enrichment (later):** league schedule/roster feeds, odds feeds for content context. Never on the critical path.

**Explicitly not needed:** stadium hardware, camera encoders, radar, RFID/Zebra access, NGS data (internal-only doctrine anyway), any paid CV API.

---

## 8. Build order and gates

| Phase | Work | Effort | Gate (advance or kill) |
|---|---|---|---|
| 0 | G2 classical prefilter on real broadcast footage | 1–2 wks | Boundary P/R ≥ 0.85 on hand-labeled set; GPU-min/game costed |
| 1 | G4 calibration + G1 field-anchored telestration | 3–6 wks | Reprojection error < 2% field width; clips pass the standing video rule |
| 2 | G3 replay discriminator + #25 semantic moment search | 1–2 wks | Replay-as-play < 1%; top-5 retrieval on labeled queries |
| 3 | Charting weak labels → engine features | ongoing | Label agreement ≥ 0.8 vs hand-charted sample before model ingestion |

**Preconditions (both must clear before Phase 0):** (a) footage sourcing resolved (§5, risk #6); (b) 3-game hand-labeled validation set built. **Kill rule:** any phase that misses its gate twice gets redesigned or killed — no sunk-cost drift.

---

## 9. Patent numbers (Garrett's lookup set)

- Telestration: US7075556B1 · US5953077A · US6133946A · US6292130B1 · US6229550B1 · US6466275B1
- Summarization: US7499077B2 · US7312812B2 · US7639275B2 · US7474331B2 · US8018491B2
- Replay: US7474698B2 · US7653131B2
- Vanishing-point: US7609855B2 (granted; filed as US20060132487A1)
- All at `https://patents.google.com/patent/<NUMBER>/en`. Displayed statuses observed 2026-09-29 — assumptions, not legal conclusions. Family/continuation review still owed before any build.
