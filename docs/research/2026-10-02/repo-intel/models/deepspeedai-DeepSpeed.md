# deepspeedai/DeepSpeed

**Verified via GitHub API 2026-10-02:** 43,171 stars. Last push 2026-10-02 (today — active). Not archived. License: Apache 2.0. **Org moved: formerly `microsoft/DeepSpeed`, now `deepspeedai/DeepSpeed`** — update dependency URLs.

## 1. Vision
A deep-learning optimization library that makes large-model training *and* inference accessible: ZeRO (partition optimizer states/gradients/parameters across GPUs so you can train models bigger than one GPU), ZeRO-Offload/Infinity (spill to CPU/NVMe), and DeepSpeed-MII / ZeRO-Inference for serving. The thesis: **memory hierarchy is the whole game** — use every tier (GPU, CPU, NVMe) instead of buying more GPUs.

## 2. The Ask
PyTorch + (for training) multiple GPUs or one GPU with generous CPU RAM/NVMe for offload. Deep CPU/NVMe integration; the library is powerful but famously config-heavy (the `ds_config.json` is a project in itself).

## 3. Constraints
- Apache 2.0 — commercial-friendly.
- Complexity tax: ZeRO configs are intricate and version-sensitive; misconfiguration silently wastes the hardware you're trying to save.
- Built for the PyTorch distributed world. If our training is single-node sklearn/LightGBM/torch, most of DeepSpeed is inapplicable — but ZeRO-Inference concepts still apply to any large neural serving.

## 4. GSE lens
- **The memory-hierarchy doctrine is the takeaway.** ZeRO's lesson — spill intelligently across GPU → CPU → NVMe instead of buying bigger iron — maps directly onto our zero-a10g reality: we don't have big GPUs, so our "hierarchy" is training-time compute (rented/burst) → cheap CPU serving → cached precomputation. Design the pipeline so the expensive tiers are used sparingly and the cheap tiers do the steady-state work.
- **ZeRO-Inference for our future neural components:** if we train any large neural model (sequence models over game history, the text-embedding lane), DeepSpeed's inference path is the maintained way to serve it on limited GPU. But note the ordering: ONNX Runtime first (simpler, CPU-first), DeepSpeed only if we outgrow it.
- **Offload as scheduled precompute:** ZeRO-Offload spills optimizer states to CPU during training. Our analogue: precompute expensive features on a schedule (nightly/weekly batch) and serve lookups, instead of computing everything at request time. The engine's feature store should be an explicit offload tier.
- **Config-heaviness as a warning:** DeepSpeed's `ds_config.json` sprawl is what happens when every knob is exposed with no opinionated defaults. Our configs should be opinionated with few knobs (the Qwen/Mistral configs are ~20 fields; a good engine config is similar). Every knob we add must earn its calibration row.

## 5. Verdict
**ADOPT the doctrine, defer the dependency** (memory-hierarchy design; offload tiers; opinionated configs). Reach for the library only if/when we train multi-GPU neural models. License: Apache 2.0.

## 6. The 4 tricks
- codewiki: https://codewiki.google.com/?url=https://github.com/deepspeedai/DeepSpeed
- gitdiagram: https://gitdiagram.com/deepspeedai/DeepSpeed
- star-history (43,171 stars): https://star-history.com/#/deepspeedai/DeepSpeed
- github.dev: https://github.dev/deepspeedai/DeepSpeed
