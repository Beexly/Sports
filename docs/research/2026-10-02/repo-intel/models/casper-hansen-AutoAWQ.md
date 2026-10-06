# casper-hansen/AutoAWQ

**Verified via GitHub API 2026-10-02:** 2,347 stars. Last push 2025-05-11. **ARCHIVED.** License: MIT. (Owner verified via direct repo lookup — `casper-hansen/AutoAWQ` resolves; no search needed.)

## 1. Vision
The user-friendly package for the AWQ (Activation-aware Weight Quantization) algorithm: 4-bit quantization that protects the ~1% of "salient" weights identified by looking at *activation* magnitudes, not just weight magnitudes. Claimed ~2x inference speedup with smaller accuracy loss than GPTQ on the same bit-width.

## 2. The Ask
Same shape as GPTQ: a calibration set, a CUDA GPU for the quantization pass, then a ~4x smaller model. The AWQ-specific assumption: a small pile of representative text to observe activations and find salient channels.

## 3. Constraints
- **Archived May 2025.** Same rot risk as AutoGPTQ; the AWQ algorithm lives on in maintained implementations (llmcompressor, TensorRT-LLM, SGLang kernels).
- MIT license, fine but moot.
- The "2x speedup" claim is hardware- and kernel-dependent; AWQ needs fused kernels to realize it, which is exactly the kind of thing that breaks when a repo dies.

## 4. GSE lens
- **Protect the salient, compress the rest.** AWQ's core insight — not all parameters matter equally; find the important ones *by observing behavior* (activations), not by staring at weights — is directly portable to our feature-engineering: don't prune features by coefficient size; prune by *measured contribution* on walk-forward validation. The salient-weight idea rhymes with SHAP/permutation importance done honestly on the 2025 validation season.
- **Calibration set as a first-class input:** both quantization repos in this dossier take a calibration dataset as a required argument. Our standing rule (calibration-on-wire: train years | eval years | metric | n | live-check) is the same shape. The industry converged on this pattern independently — that's converging evidence our rule is right.
- **Don't build on archived repos**, even when the algorithm is good. If we ever quantize a neural component, use llmcompressor or the ONNX Runtime quantization toolchain.

## 5. Verdict
**IGNORE the repo (archived)** / **ADOPT the insight** (behavior-measured importance for compression/pruning; calibration-set-gated everything). License: MIT (moot — dead).

## 6. The 4 tricks
- codewiki: https://codewiki.google.com/?url=https://github.com/casper-hansen/AutoAWQ
- gitdiagram: https://gitdiagram.com/casper-hansen/AutoAWQ
- star-history (2,347 stars): https://star-history.com/#/casper-hansen/AutoAWQ
- github.dev: https://github.dev/casper-hansen/AutoAWQ
