# gpleiss/temperature_scaling

- Stars: 1,178 (MIT) — the original, famous demo
- Repo: https://github.com/gpleiss/temperature_scaling
- **Status: the README carries a "WARNING: REPO UNMAINTAINED" banner.** Author explicitly says it was a PyTorch 0.3-era demo, not a package, and points users to probmetrics.

## 1. Vision

Prove that a neural net's overconfident softmax outputs can be fixed post-hoc by dividing logits by a single learned scalar T (chosen to minimize NLL on a validation set) — from "On Calibration of Modern Neural Networks" (arXiv 1706.04599).

## 2. The Ask

A trained model's logits + the same validation set used in training. One parameter, one LBFGS fit.

## 3. Constraints

- License: MIT, but the code is effectively abandonware (last meaningful push years ago; 25 open issues).
- Method assumption: miscalibration is a global over/under-confidence shift — one T for all classes, all inputs. Fails if miscalibration varies by matchup type.

## 4. GSE lens

Historical reference only. The *idea* (one-parameter recalibration as the minimum-viable calibration row) is the right default for signals with tiny held-out samples — a 1-parameter map cannot overfit the way isotonic can — but do not wire this repo's code. Wire probkit/probmetrics instead, which has the tested implementation.

## 5. Verdict

**IGNORE** as code — unmaintained; author redirects to probmetrics. **REBUILD** only in the sense that the one-parameter temperature idea is already the intended default in the playbook. (MIT.)

## 6. The 4 tricks

- Codewiki: https://deepwiki.com/gpleiss/temperature_scaling
- Diagram: https://gitdiagram.com/gpleiss/temperature_scaling
- Star history: https://star-history.com/#gpleiss/temperature_scaling (1,178 stars)
- Open in browser IDE: https://github.dev/gpleiss/temperature_scaling
