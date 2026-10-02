# huggingface/text-generation-inference

**Verified via GitHub API 2026-10-02:** 10,884 stars. Last push 2026-03-21. **ARCHIVED — read-only, no longer maintained.** License: Apache 2.0.

## 1. Vision
HuggingFace's own Rust+Python LLM serving engine: token streaming, continuous batching, quantization support (bitsandbytes/GPTQ/AWQ), built to power HF Inference Endpoints. It was the "official" serving stack for the HF ecosystem.

## 2. The Ask
GPU serving via Docker containers published by HF; integrated with the Hub (pull any model, serve it). Assumed you lived inside the HF ecosystem (Spaces, Inference Endpoints).

## 3. Constraints
- **Archived March 2026.** No security fixes, no new model support, no maintenance. This is the single most important fact in this dossier.
- Apache 2.0 license is fine, but dead code is dead code.
- LLM-only serving, GPU-first — same irrelevance to our tabular path as vLLM.

## 4. GSE lens
- **The graveyard lesson is the lesson.** TGI was the *official* HF serving stack with 10.8K stars, and it still got archived when the ecosystem consolidated around vLLM/SGLang. For our serving decision this is a warning with a name: **don't build on a serving stack that is losing the ecosystem war**, even if it's convenient today. Concretely: our production path should be the thing with the largest living community for *our model class* — ONNX Runtime for tabular/ONNX models — not whatever is easiest to click-deploy this week.
- **Vendor-stack risk:** TGI's death strands anyone who built deployment automation around HF Inference Endpoints' TGI containers. Our analogue: don't hard-couple our pipeline to any single vendor's serving abstraction (including HF Spaces' ZeroGPU specifics). Keep the model artifact portable (ONNX file + pinned runtime version) so the serving host is swappable.
- **What survives a project death:** TGI's good ideas (continuous batching, streaming) lived on because they were *documented designs*, not just code. When we build internal tooling, document the design so the idea survives the implementation.

## 5. Verdict
**IGNORE — archived, do not build on it.** The dossier's value is the cautionary tale. License: Apache 2.0 (irrelevant; it's dead).

## 6. The 4 tricks
- codewiki: https://codewiki.google.com/?url=https://github.com/huggingface/text-generation-inference
- gitdiagram: https://gitdiagram.com/huggingface/text-generation-inference
- star-history (10,884 stars): https://star-history.com/#/huggingface/text-generation-inference
- github.dev: https://github.dev/huggingface/text-generation-inference
