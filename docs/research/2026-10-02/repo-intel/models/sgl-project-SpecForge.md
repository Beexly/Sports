# sgl-project/SpecForge

**Verified via GitHub API 2026-10-02:** 1,197 stars. Last push 2026-10-02 (today — active). Not archived. License: MIT. Found via GitHub code search for speculative-decoding repos, sorted by stars; this was the most on-point maintained result.

## 1. Vision
Train speculative-decoding draft models "effortlessly" and port them into SGLang serving. Speculative decoding: a small fast draft model proposes tokens, the large target model verifies them in parallel — same output, much faster. SpecForge is the training-side tooling for the draft models, closing the loop between *training* the speedup and *serving* it.

## 2. The Ask
A target LLM, training data for the draft model (EAGLE-style feature-distillation recipes), and SGLang as the serving endpoint. This is a 2026-era stack: draft-model training + SGLang serving, the current open-source answer to "make the big model fast."

## 3. Constraints
- MIT license — permissive.
- Small community (1.2K stars) relative to vLLM/llama.cpp — younger project, thinner battle-testing.
- Speculative decoding is LLM-specific (autoregressive token verification). The mechanism does not transfer to tabular classification/regression serving.

## 4. GSE lens
We won't use speculative decoding (no autoregressive serving), but the *pattern* is gold:
- **Draft-then-verify as an architecture.** A cheap model proposes, an expensive model verifies — keeping the expensive model's quality at a fraction of its cost. Our direct analogue: a **fast screening model** (cheap features, runs on every game/market) proposes candidate edges, and the **full engine** (all signals, calibrated) verifies only the candidates. This is a concrete serving architecture for zero-a10g: the cheap tier runs always, the expensive tier runs selectively. It also composes with our calibration rule — the verifier's calibration row is what ships, and the draft model's job is recall, not calibration.
- **Train the speedup, don't just hope for it:** SpecForge exists because draft models need their own training recipe (distilled from the target). If we build a draft-then-verify pipeline, the draft model gets trained *against the verifier's outputs* on historical seasons — the DeepSeek-distill dossier's teacher-student pattern, applied to latency instead of reasoning.
- **Close the train-serve loop:** SpecForge ports directly into SGLang. Our version: the training pipeline should emit serving-ready artifacts (ONNX + runtime version pin) with no manual conversion step. The artifact that trains is the artifact that serves.

## 5. Verdict
**REBUILD the pattern** (draft-then-verify serving architecture; train-serve loop with no manual conversion) — not the tool. License: MIT.

## 6. The 4 tricks
- codewiki: https://codewiki.google.com/?url=https://github.com/sgl-project/SpecForge
- gitdiagram: https://gitdiagram.com/sgl-project/SpecForge
- star-history (1,197 stars): https://star-history.com/#/sgl-project/SpecForge
- github.dev: https://github.dev/sgl-project/SpecForge
