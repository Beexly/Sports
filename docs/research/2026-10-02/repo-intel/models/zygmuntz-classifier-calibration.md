# zygmuntz/classifier-calibration

- Stars: 75 (MIT) — companion to the classic fastml.com post "Calibrating a classifier with isotonic regression"
- Repo: https://github.com/zygmuntz/classifier-calibration

## 1. Vision

The canonical minimal demo of the three classical calibration tools: reliability diagrams (accuracy-vs-confidence plots), Platt's scaling (sigmoid fit on scores), and isotonic regression (nonparametric monotonic fit) — shown on a random forest over the Adult dataset.

## 2. The Ask

Predicted scores + labels on a held-out set. Handful of short scripts, numpy-level.

## 3. Constraints

- License: MIT, but **dead since 2014** — Python-2-era scripts, no package, no tests.
- Isotonic regression assumption that matters for GSE: it is a flexible nonparametric fit, so it needs **enough held-out data** or it memorizes the calibration set (overfit map). Platt's 2-parameter sigmoid is the small-n-safe alternative.

## 4. GSE lens

Do not wire this code — but the **Platt vs isotonic decision rule it demonstrates is exactly the rule the calibration-on-wire rows need codified**: per signal, small-n held-out (2025 season only, ~hundreds of games at most for game-level signals) → Platt/temperature; large-n (player-level props, thousands of rows) → isotonic is allowed. Write that rule into the wiring spec so no one re-derives it. The reliability-diagram helper is also the right QC plot to attach to every calibration row before the 2026 W1-4 live-check: if the 2025 diagram and the W1-4 diagram disagree, the map doesn't transfer.

## 5. Verdict

**IGNORE** as code (dead 2014, superseded by probmetrics/probkit). **REBUILD** as a two-line policy: Platt for small-n signals, isotonic for large-n signals, reliability diagram attached to every row. (MIT.)

## 6. The 4 tricks

- Codewiki: https://deepwiki.com/zygmuntz/classifier-calibration
- Diagram: https://gitdiagram.com/zygmuntz/classifier-calibration
- Star history: https://star-history.com/#zygmuntz/classifier-calibration (75 stars, flat)
- Open in browser IDE: https://github.dev/zygmuntz/classifier-calibration
