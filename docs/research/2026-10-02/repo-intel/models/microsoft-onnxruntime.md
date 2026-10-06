# microsoft/onnxruntime

**Verified via GitHub API 2026-10-02:** 21,977 stars. Last push 2026-10-02 (today — active). Not archived. License: MIT. Added via targeted verification — this is the highest-leverage serving answer for GSE's model class.

## 1. Vision
A cross-platform, high-performance inference accelerator for ML models: train in any framework (PyTorch, sklearn, LightGBM, XGBoost — all export to ONNX), serve with one runtime on any hardware (CPU, CUDA, TensorRT, CoreML, DirectML, OpenVINO via *execution providers*). The thesis: **the model artifact should be portable and the runtime should be boring.**

## 2. The Ask
Export the trained model to ONNX format (one-time conversion step per model). Then: the ONNX Runtime package for your platform, no GPU required. Execution providers are pluggable — same ONNX file, CPU today, CUDA/TensorRT tomorrow, with no model change.

## 3. Constraints
- MIT license — fully permissive, Microsoft-maintained, 22K stars.
- Not every exotic op exports cleanly to ONNX — custom PyTorch ops and some sklearn edge cases need checking at conversion time. The conversion step must be tested (round-trip numerical parity on the validation season), not assumed.
- It's an inference runtime, not a training framework and not a feature store — it serves the model, nothing around it.

## 4. GSE lens
This is the serving-stack answer for the zero-a10g question, and it's the most actionable dossier in Group D:
- **The production path, concretely:** train anywhere (current pipeline) → export each production model to ONNX → verify numerical parity vs the training artifact on the full 2025 validation season (this becomes part of calibration-on-wire: the *served* artifact gets the calibration row, not just the trained one) → serve via ONNX Runtime on cheap CPU (a $5-20/mo VPS or existing infra). GPU spend: zero. This directly resolves "the serving stack is an open question" with a boring, 22K-star, MIT-licensed default.
- **Execution providers = the Qwen dual-path lesson made real:** the same ONNX file runs on CPU today and on a rented GPU (CUDA/TensorRT provider) on big weeks if we ever need it — no retraining, no reconversion. The Qwen dossier's "two attention strategies in one config" is this idea at model level; ONNX Runtime is it at serving level.
- **Quantization toolchain included:** ONNX Runtime ships quantization tools (dynamic/static quantization, QDQ). That's the living implementation the AutoGPTQ/AutoAWQ dossiers pointed to — the calibration-set-gated compression ladder (fp32 → quantized) with measured deltas, all inside one maintained project.
- **bge-m3 synergy:** the bge-m3 dossier's CPU-first embedding lane deploys as an ONNX model under this same runtime — one serving stack for both the predictive models and the text-embedding lane. One runtime to monitor, one artifact format to version.
- **What to watch:** conversion parity. Every model version gets a parity check (max abs delta between training-framework predictions and ONNX predictions on the validation set) recorded alongside the calibration row. A model that doesn't survive export bit-identically (within tolerance) doesn't ship.
- **Does not replace:** the feature pipeline, the calibration harness, walk-forward discipline. It replaces only the question "how do we serve the model" — with the most boring correct answer available.

## 5. Verdict
**ADOPT as the production serving runtime** (train → ONNX export → parity-checked → CPU serving; zero GPU spend). License: MIT.

## 6. The 4 tricks
- codewiki: https://codewiki.google.com/?url=https://github.com/microsoft/onnxruntime
- gitdiagram: https://gitdiagram.com/microsoft/onnxruntime
- star-history (21,977 stars): https://star-history.com/#/microsoft/onnxruntime
- github.dev: https://github.dev/microsoft/onnxruntime
