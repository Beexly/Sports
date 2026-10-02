# uncbiag/LTS (Local Temperature Scaling)

- Stars: 21 (Apache-2.0) — official code for Ding et al., "Local Temperature Scaling for Probability Calibration" (ICCV 2021)
- Repo: https://github.com/uncbiag/LTS

## 1. Vision

Temperature scaling, but spatially localized: instead of one global T, learn a temperature *map* (per image patch) for semantic segmentation, so different regions of the input get different calibration. Shows global TS calibrates the whole image fine but fails on local patches.

## 2. The Ask

A segmentation model's per-pixel logits + a small CNN to predict the temperature map + labeled pixels. GPU training.

## 3. Constraints

- License: Apache-2.0. Paper-code, pushed 2021, image-segmentation-specific.
- Core assumption: miscalibration varies across the input space in a way a learned map can capture — powerful, but needs a second model and enough calibration data to fit it.

## 4. GSE lens

Wrong domain (pixel grids, not NFL rows) — but the *concept* is the sharpest articulation of GSE's calibration problem: **global miscalibration maps hide conditional miscalibration**. If the engine is well-calibrated overall but systematically overconfident on divisional underdogs or in bad weather, a single global T (or Platt) will certify a lie. The GSE translation: per-signal calibration rows should be *Mondrian-style* — fit separate maps per matchup class when n allows (crepes does this natively; see that dossier). Do not adopt the image machinery; adopt the conditional-calibration instinct and implement it via crepes' Mondrian conformal classifiers instead.

## 5. Verdict

**IGNORE** as code (image segmentation, paper-code). **REBUILD** the idea as conditional/Mondrian calibration per matchup class. (Apache-2.0.)

## 6. The 4 tricks

- Codewiki: https://deepwiki.com/uncbiag/LTS
- Diagram: https://gitdiagram.com/uncbiag/LTS
- Star history: https://star-history.com/#uncbiag/LTS (21 stars)
- Open in browser IDE: https://github.dev/uncbiag/LTS
