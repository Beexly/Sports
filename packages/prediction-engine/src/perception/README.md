# Perception & Memory — Layers 2 and 3 of the CV pipeline

Layer 1 (tracking) gives us **senses**: dots on a field. This package builds
**perception** (what is happening) and **memory** (what we learn across games).
Football intelligence lives at the play level, not the frame level.

## Layer 2 — Perception (tracklets → plays)

| Module | What it does |
|---|---|
| `cv-play-segmentation.ts` | Snap-to-whistle detection from tracklet motion energy: pre-snap SET → snap BURST → LIVE → DEAD. Handles hurry-up (no set) at lower confidence. |
| `cv-scorebug-ocr.ts` | Score-bug OCR: quarter, clock, down, distance, score, yard line. Configurable crop presets per network (CBS/FOX/NBC/ESPN/PRIME/NFLN). Swappable OCR engine (Tesseract in prod, fixture in tests). |
| `cv-formation-classify.ts` | Pre-snap formation from offense geometry: backfield (under-center/pistol/shotgun/empty), personnel ("11"/"12"/…), distribution (trips/bunch/2x2/3x1). Rule-based v1; `FormationClassifier` interface leaves the ML path open. |
| `cv-route-extract.ts` | Per-receiver polylines → 14-route tree via DTW against canonical templates (both lateral mirrors, so dig≠out and post≠corner survive). Break points from max curvature. |
| `cv-separation-metrics.ts` | The fieldcoachai shapes from our own tracklets: break angle, separation-at-break, separation-at-catch, nearest defender. |
| `cv-audio-align.ts` | Broadcast commentary → play windows + roster-name mentions. Free labeled data ("deep shot to Jefferson"). ASR is a documented faster-whisper invocation; full wiring is v2. |

## Layer 3 — Memory (plays → tendencies)

| Module | What it does |
|---|---|
| `db/schema/watch-plays.sql` | Play database: one row per perceived play. Branch-only testing rule documented in the header — never migrate the default branch from an agent session. |
| `cv-tendencies.ts` | Pure-function aggregates: run/pass by team × down × distance, route-combination frequencies, target share by formation, full down-distance matrix. SQL views mirror the same groupings. |
| `cv-play.ts` | The `Play` aggregate + `playToRecord()` flattening into the DB shape. |

## Field coordinates

Tracking emits field meters (`xM`: 0–109.7 along the length, `yM`: 0–48.8
across). Perception reasons in the **offense frame** (`cv-field-model.ts`):
downfield yards from the LOS, lateral yards from the ball — the unit coaches
think in. `SnapContext` (LOS + attack direction) comes from the score-bug
yard line + possession, or from the ball tracklet at the snap.

## Status

All modules are internal, shadow-only, weight zero until validated against
real broadcast clips. No raw frames are stored anywhere in this pipeline —
intelligence only.
