# ggml-org/llama.cpp

**Verified via GitHub API 2026-10-02:** 130,148 stars (most-starred repo in this dossier). Last push 2026-10-02 (today — very active). Not archived. License: MIT. **Org moved: formerly `ggerganov/llama.cpp`, now `ggml-org/llama.cpp`** — update any bookmarks/dependency URLs.

## 1. Vision
LLM inference in plain C/C++ with no heavy dependencies: run large models on consumer hardware — laptops, phones, Raspberry Pis — via the GGUF format and k-quant quantization. The thesis: **inference should be a portable binary, not a Python environment.** 130K stars make it the most successful edge-inference project in open source.

## 2. The Ask
A C++ compiler. That's nearly it. Models must be in GGUF format (converted/quantized from HF checkpoints). CPU-first with optional GPU offload (CUDA, Metal, Vulkan, ROCm) — layer-by-layer offload lets a 70B model run on a laptop with partial GPU.

## 3. Constraints
- MIT license — fully permissive.
- LLM-only (transformer architectures with GGUF support). No tabular/sklearn path.
- k-quants trade accuracy for size/speed; the quantization choice (Q4_K_M vs Q8_0 etc.) is a per-deployment calibration decision, and aggressive quants measurably degrade reasoning benchmarks.

## 4. GSE lens
- **"Inference is a portable binary" is the doctrine we should steal.** Our production scoring path should aspire to the same property: a pinned, dependency-light artifact that runs anywhere. For us that artifact is an ONNX file + ONNX Runtime (see that dossier), not a Python environment with twelve pinned packages. llama.cpp proves the operational value: when inference is a binary, deployment, rollback, and reproducibility become trivial.
- **Quantization as explicit calibration:** the k-quant menu (Q2 through Q8) is a public, named ladder of accuracy-vs-speed tradeoffs, each with measured benchmark deltas. We should have the same ladder for our models: full-precision training artifact → fp32 production → quantized/fast approximation, each rung with a measured calibration delta on the 2025 validation season. No rung ships without its calibration row.
- **Layer-wise offload as a resource doctrine:** run what fits where it fits. Our analogue: heavy feature computation (the expensive signals) can run on a schedule (nightly batch), while the lightweight scoring path runs on demand — split the pipeline by resource profile instead of forcing everything through one box.
- **130K stars = the community finds the bugs:** same boring-default argument as vLLM. For edge/CPU inference of neural models, llama.cpp *is* the default.

## 5. Verdict
**IGNORE as a direct dependency** (LLM-only) / **REBUILD the doctrine** (portable-binary inference; named quantization ladder with measured deltas; split pipeline by resource profile). License: MIT.

## 6. The 4 tricks
- codewiki: https://codewiki.google.com/?url=https://github.com/ggml-org/llama.cpp
- gitdiagram: https://gitdiagram.com/ggml-org/llama.cpp
- star-history (130,148 stars): https://star-history.com/#/ggml-org/llama.cpp
- github.dev: https://github.dev/ggml-org/llama.cpp
