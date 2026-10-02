# swfunc / Fantasy-Regression

- **Stars:** 2 | **License:** NONE | **Pushed:** 2016-11-17 (abandoned) | **Lang:** Python (scikit-learn)

## Vision
Ask whether the predictions of the most accurate fantasy experts (top-10 by FantasyPros accuracy) can be combined via regression to out-predict any single expert — and which regression model does it best. Trains on 2015 expert predictions → actuals, tests on 2016.

## The Ask
- Scraped expert predictions + actuals; scikit-learn. A weekend experiment, not a service.

## Constraints
- No license, dead since 2016, tiny sample (one train season, one test season). Statistically thin but directionally interesting.

## GSE lens
This is the methodological ancestor of Garrett's **research standard**: consensus across multiple outlets beats any single source. The repo's actual finding (per its README framing) is that expert-consensus regression is the thing to test — which is exactly what GSE's engine should be doing at scale with 2022–2025 data instead of one season. The weak point it exposes: **GSE has no documented "consensus baseline" model.** Before the full 47-signal machine is wired, the cheapest credible projection GSE could publish is a weighted expert-consensus regression — and nobody has built it. It's the obvious interim baseline, and it's missing.

## Verdict
**REBUILD** — the consensus-regression method is the right interim baseline for GSE; re-implement on 2022–2025 data, not 2015.

## The 4 tricks
- CodeWiki: https://codewiki.google/github.com/swfunc/Fantasy-Regression
- GitDiagram: https://gitdiagram.com/swfunc/Fantasy-Regression
- Star history: https://star-history.com/#swfunc/Fantasy-Regression (2 stars)
- github.dev: https://github.dev/swfunc/Fantasy-Regression
