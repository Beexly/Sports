# datascopeanalytics / fantasy-football-projections

- **Stars:** 36 | **License:** NONE | **Pushed:** 2022-07-06 (stale; content is from 2014) | **Lang:** Python

## Vision
Answer one question honestly: **how accurate are fantasy football projections?** Compared ESPN's (and other sites') projections against actuals, and which site had the best projections. A methodology demo from a data consultancy, not a product.

## The Ask
- Historical projection + actuals data (2014 season in the writeup). Read the analysis; nothing to install.

## Constraints
- No license; 2014-era data; the code is illustrative, not maintained. Value is the *question and method*, not the artifact.

## GSE lens
This is the question GSE is institutionally avoiding: **is the engine actually better than free projections?** Garrett's wire-first sequencing says calibration judgment comes after wiring, which is fine — but there is no standing artifact that says "when wiring is done, we will grade ourselves against ESPN/CBS/Sleeper projections on 2022–2025 walk-forward, and here is the exact metric." The nfl_mcp repo (same sweep) ships a built-in backtest that grades its own accuracy; GSE's TRAIN-NOW directive covers training data but not the *comparison benchmark* against public projections. Weak point: **GSE has a training plan but no stated "beat the free baseline" acceptance test.** Steal the question, not the code: define the public-projection baseline test now, run it when wiring completes.

## Verdict
**REBUILD** (the evaluation method, not the code) — GSE needs a standing "beat ESPN/CBS/Sleeper" backtest as its calibration acceptance gate.

## The 4 tricks
- CodeWiki: https://codewiki.google/github.com/datascopeanalytics/fantasy-football-projections
- GitDiagram: https://gitdiagram.com/datascopeanalytics/fantasy-football-projections
- Star history: https://star-history.com/#datascopeanalytics/fantasy-football-projections (36 stars)
- github.dev: https://github.dev/datascopeanalytics/fantasy-football-projections
