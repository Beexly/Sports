# vllm-project/vllm

**Verified via GitHub API 2026-10-02:** 93,069 stars. Last push 2026-10-02 (today — actively maintained). Not archived. License: Apache 2.0.

## 1. Vision
A high-throughput, memory-efficient LLM serving engine. Its two core inventions: **PagedAttention** (KV-cache memory managed in OS-style pages, eliminating fragmentation waste) and **continuous batching** (requests join/leave the batch mid-generation instead of waiting for the slowest). The thesis: serving throughput is a memory-management problem, not a FLOPs problem.

## 2. The Ask
GPU serving (CUDA; ROCm/CPU variants exist). OpenAI-compatible API server out of the box. The engine assumes you have a HuggingFace-format model and want to serve many concurrent requests — it's optimized for the multi-tenant server case, not single-prompt latency.

## 3. Constraints
- Apache 2.0 — commercial-friendly.
- It's an LLM serving engine: the PagedAttention machinery is specific to autoregressive KV caches. It does not serve sklearn/XGBoost/tabular models — that machinery is irrelevant to our predictive engine's serving path.
- GPU-first: the whole design assumes a GPU with a large memory pool to page. On a zero-a10g budget, vLLM is the wrong tool.

## 4. GSE lens
We will almost certainly never run vLLM in production (we don't serve LLMs), but the *design doctrines* transfer:
- **Throughput is a memory-management problem.** Our batch scoring (weekly slate scoring, backtest sweeps over 2022-2025) is throughput-bound the same way. PagedAttention's lesson: profile memory fragmentation and scheduling before buying bigger hardware. Our analogue is vectorized batch inference (score the whole slate in one pass) instead of per-game Python loops.
- **Continuous batching as an ops pattern:** don't let the slowest request gate the batch. In our backtest harness, don't let one slow game-week computation block the sweep — stream results as they complete.
- **The ecosystem signal:** 93K stars and daily commits make vLLM the default LLM serving answer. The meta-lesson: pick the boring default with the biggest community for serving (for us that's ONNX Runtime, not a bespoke server), because the community finds the bugs first.
- **What it IS for us:** if we ever serve an LLM component (e.g., a reasoning/analyst model generating write-ups from engine outputs), vLLM on a rented GPU is the default — but that's a future content lane, not the prediction path.

## 5. Verdict
**IGNORE for the prediction serving path** (LLM-only, GPU-first; we have zero-a10g spend and tabular models) / **ADOPT the doctrines** (memory-first throughput thinking; boring-default serving). License: Apache 2.0.

## 6. The 4 tricks
- codewiki: https://codewiki.google.com/?url=https://github.com/vllm-project/vllm
- gitdiagram: https://gitdiagram.com/vllm-project/vllm
- star-history (93,069 stars): https://star-history.com/#/vllm-project/vllm
- github.dev: https://github.dev/vllm-project/vllm
