# HF layer audit

Measured 2026-10-02 against the live Hugging Face account `Beexly` (PRO, `canPay: true`) and the bucket listing. Hardware and stage come from the Hub API, not from a README. File contents were downloaded and read. Nothing here was inferred from a Space name.

## Spaces

Eleven public Spaces. `GalaxySportsEdge` has zero Spaces, zero models, zero datasets. `Beexly` has zero models and zero datasets. One private bucket.

| Space | SDK | stage | hardware requested | hardware current | What it actually does |
|---|---|---|---|---|---|
| Beexly/mimo-brain-engine | gradio | RUNNING | zero-a10g | zero-a10g | Serves `XiaomiMiMo/MiMo-V2.6-Distill-Qwen-9B` in 4-bit behind `@spaces.GPU`. `/chat` takes a prompt and returns text. MIT. It does not read the repo, a bucket, or a database. |
| Beexly/studio-chat | gradio | RUNNING | zero-a10g | zero-a10g | Serves `Qwen/Qwen2.5-72B-Instruct` in 4-bit. General chat. Not a GSE signal producer. |
| Beexly/gse-watch-pipeline | docker | RUNNING | cpu-basic | cpu-basic | YOLO + BoT-SORT on a posted JPEG. Returns JSON. Writes nothing itself. The watcher is supposed to relay that JSON to Vercel `/api/ops/watch-ingest`. Bearer token, fail-closed. |
| Beexly/timesfm3-benchmark | docker | PAUSED | cpu-basic | none | Runs one frozen TimesFM-3 benchmark at startup and serves aggregates. No on-demand forecast endpoint. TimesFM Non-Commercial License v1.0. |
| Beexly/gse-proof-mcp | gradio | PAUSED | cpu-basic | none | Read-only client of `https://www.galaxysportsedge.com` public JSON. Does not read the repo or a bucket. |
| Beexly/studio-hub | static | RUNNING | none | none | Static index linking the other Spaces. |
| Beexly/studio-media | gradio | PAUSED | zero-a10g | none | Image/audio demo. Not a signal producer. |
| Beexly/studio-video | gradio | PAUSED | cpu-basic | none | Video demo. Not a signal producer. |
| Beexly/podcast-pipeline | gradio | PAUSED | cpu-basic | none | Podcast assembly. Not a signal producer. |
| Beexly/jppy-logo-demo | gradio | PAUSED | zero-a10g | none | Logo demo. Not a signal producer. |
| Beexly/qwen38-27b-mlx-lab | gradio | PAUSED | cpu-basic | none | MLX lab against an external API. Not a signal producer. |

`gse-watch-pipeline` is on `cpu-basic`, not a T4 and not ZeroGPU. The README recommends ZeroGPU. The running hardware is what bills or does not; the README is not.

## Bucket

`Beexly/timesfm-3.0-pytorch-bucket`, private, 1,322,910,322 bytes, 5 objects, created 2026-09-24. Contents, listed over the S3-compatible API and confirmed with `hf buckets ls`:

- `.gitattributes` 1,519 bytes
- `LICENSE` 7,270 bytes — TimesFM Non-Commercial License v1.0
- `README.md` 1,436 bytes
- `config.json` 1,273 bytes
- `model.safetensors` 1,322,898,824 bytes

No forecast output. No play-by-play. No tau table. No consumer in `packages/prediction-engine` or `intelligence/` reads this bucket. `google/timesfm-3.0-pytorch` itself is 330,710,976 bytes of weights under the same non-commercial license; the bucket copy is a private mirror of those weights, not a producer of facts.

## What does not follow

- `mimo-brain-engine` is not called by `packages/prediction-engine/src/scoring.ts`. The intelligence harness in `intelligence/engines/` can call it. The engine test file uses a mock backend. A green engine suite is not evidence that a live Space produced a published pick.
- Neither the watch pipeline nor the TimesFM bucket is the missing coaching producer. The coaching producer is `TauFitter` over nflverse play-by-play. See `intelligence/coaching/data/tau_hat.manifest.json`.
- TimesFM output is not in any commercial path because there is no path. Keeping it that way is the constraint, not a suggestion.

## Billing, from the account object and the Hub docs fetched 2026-10-02

Account `isPro: true`, `canPay: true`. ZeroGPU daily quota for PRO is higher than free; overage draws pre-paid credits. `canPay: true` means a card can be charged if credits and auto-recharge are configured. This audit did not read the billing page, so it does not claim the credit balance or that auto-recharge is off.
