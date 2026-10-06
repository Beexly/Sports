# AutoGPTQ/AutoGPTQ

**Verified via GitHub API 2026-10-02:** 5,066 stars. Last push 2025-04-11. **ARCHIVED.** License: MIT.

## 1. Vision
An easy-to-use Python package for GPTQ 4-bit weight quantization of LLMs: one-shot quantization using second-order (Hessian) information so a 7B model fits in ~4 GB with small accuracy loss. It made GPTQ — previously a research script — into a pip-installable tool.

## 2. The Ask
A calibration dataset (a few hundred samples) to compute the Hessian; a CUDA GPU for the quantization step; then the quantized model runs in roughly half the memory. Assumes a transformers-compatible model.

## 3. Constraints
- **Archived April 2025.** The GPTQ ecosystem moved on (into transformers' built-in GPTQ support, llmcompressor, etc.).
- MIT license is fine, but unmaintained quantization code rots fast as kernels and CUDA versions move.
- 4-bit weight-only quantization: activations stay fp16, so the speedup is memory-bandwidth-bound, not compute-bound — and perplexity degradation is real on some model/task pairs.

## 4. GSE lens
- **The technique outlives the package.** GPTQ the algorithm is alive (it's in transformers core now); AutoGPTQ the repo is dead. Lesson: **adopt algorithms, not packages** — and prefer the implementation with the living maintainer. When we need quantization (for any neural component), reach for the maintained path (transformers native, llmcompressor, ONNX Runtime quantization tools), never this repo.
- **Calibration-data discipline is the transferable core:** GPTQ needs a *calibration set* — a small, representative sample used to measure what the quantization breaks. That is exactly our calibration-on-wire instinct applied to compression: any compressed/approximated model must be measured against a held-out set (2025 season) before it touches production. The repo's contribution to our playbook is the *pattern*: compress → measure delta on calibration data → ship only if delta is within tolerance.
- **One-shot vs iterative:** GPTQ is one-shot (no retraining). Our analogue: post-training approximations (feature pruning, reduced ensembles) that don't require retraining are operationally cheaper than retraining smaller models — but they still need the calibration row.

## 5. Verdict
**IGNORE the repo (archived)** / **ADOPT the pattern** (calibration-set-gated compression; prefer living implementations). License: MIT (moot — dead).

## 6. The 4 tricks
- codewiki: https://codewiki.google.com/?url=https://github.com/AutoGPTQ/AutoGPTQ
- gitdiagram: https://gitdiagram.com/AutoGPTQ/AutoGPTQ
- star-history (5,066 stars): https://star-history.com/#/AutoGPTQ/AutoGPTQ
- github.dev: https://github.dev/AutoGPTQ/AutoGPTQ
