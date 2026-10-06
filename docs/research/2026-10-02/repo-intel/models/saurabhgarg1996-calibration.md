# saurabhgarg1996/calibration

- Stars: 6 (MIT)
- Repo: https://github.com/saurabhgarg1996/calibration

## 1. Vision

Numpy-only implementations of temperature scaling, bias-corrected temperature scaling, vector scaling, and matrix scaling, plus ECE measurement — no PyTorch model wrappers required; operates directly on probability/label arrays.

## 2. The Ask

Logits or probabilities + labels. pip-installable from git; Python 3.6+.

## 3. Constraints

- License: MIT. Tiny, single-author, last pushed 2023 — no test suite visible, no maintenance cadence.
- Vector/matrix scaling add parameters per class — same overfitting caution as isotonic at small n.

## 4. GSE lens

The *interface* idea is right for GSE (probability-in/probability-out, framework-agnostic — our heads aren't PyTorch), but everything this does is done better and maintained in probkit/probmetrics. No reason to wire a 6-star unmaintained copy when the maintained version exists. If GSE ever needs a pure-numpy fallback with zero dependencies, this is the reference to crib from, not adopt.

## 5. Verdict

**IGNORE** — superseded by probkit/probmetrics on every axis. (MIT.)

## 6. The 4 tricks

- Codewiki: https://deepwiki.com/saurabhgarg1996/calibration
- Diagram: https://gitdiagram.com/saurabhgarg1996/calibration
- Star history: https://star-history.com/#saurabhgarg1996/calibration (6 stars)
- Open in browser IDE: https://github.dev/saurabhgarg1996/calibration
