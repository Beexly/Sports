# Sloan 2018 #5571 — All-22 CV pipeline (methods + measured accuracies)

Paper: "Using Computer Vision and Machine Learning to Automatically Classify NFL Game Film and
Develop a Player Tracking System", Sloan Research Papers Competition 2018, ID #5571, PDF saved at
`extracted_data/sloan_2018_nfl_cv_poster.pdf`.

## Pipeline as published
1. All-22 film screenshots (NFL teams otherwise only get NGS chips; this is the off-the-shelf route).
2. **Hough Lines** to find the field's white lines, drop superfluous detections with heuristics,
   then rotate the frame so lines are perpendicular.
3. Line of scrimmage located by proximity to the offensive line; players detected by **jersey
   colour analysis** (e.g. burgundy), QB marked; x/y recorded pre-snap relative to the QB.
4. 500+ auto-labelled formation images as training data.
5. Per-feature classifiers run **independently** (QB alignment, RB/WR/TE counts and locations), the
   formation derived from the sum of the parts.

## Measured results (their tables, verbatim)
QB position accuracy: **CART 86.5%**, Naive Bayes 67.5%, SVM 56.1%, KNN 49.8%, Logistic 42.9%.
Pistol was the failure mode (precision .50 / recall .12) — sparse training data.
Formation accuracy: CART 72.3%, NB 68.8%, SVM 64.6%, KNN 64.1%, LR 55.6%. Per-formation precision
.76-.86, recall .70-.90 on the top 5 formations.

## Why it matters
This is a documented, fully-specified alternative to chip data for pre-snap structure: rectification
-> LoS -> colour segmentation -> per-part CART classification. The negative result is as useful as
the positive one — Pistol at 12% recall says sparse-class imbalance dominates, so any rebuild should
balance classes or drop rare alignments.

## Other sources this cycle
- **SkillCorner** site is a Webflow marketing page; the real asset is `github.com/SkillCorner/opendata`
  (API 200, `data/` tree present). Contents are `aggregates`, i.e. soccer by default — NFL not yet
  confirmed inside.
- **NVIDIA research NFL page** renders a paper list; the page we hit titled itself "Neural LiDAR
  Fields", so the NFL project listing sits behind it and needs a second pass.
- **researchgate / trainmatricx** — the latter is a blog (no data), the former not fetched (RG blocks).

## Addendum — SkillCorner bodypose schema (the format worth copying)
`data/bodypose/` contains `README.md`, `MANIFEST.json` and `sample_<match>_<phase>.jsonl.gz`.
Per their README: 29 key points per player, pitch coordinates, 3D, **25 FPS**, XY tracking
interpolated to the same rate, and **each key point carries a predicted error in centimetres defined
so 90% of estimates fall inside that radius**. Stated limits: detected players only, z is relative to
the player centroid rather than the pitch, and pose is generated separately from XY tracking so the
two can misalign slightly.

Soccer-only, but this is the exact output contract a pose pipeline should target for NFL work —
29 joints at 25 FPS with per-joint confidence radii, rather than COCO's 17 at unknown rate.
