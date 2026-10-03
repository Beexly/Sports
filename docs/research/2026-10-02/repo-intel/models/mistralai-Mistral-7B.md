# mistralai/Mistral-7B

**Verified ID:** `mistralai/Mistral-7B-v0.1` (the bare `Mistral-7B` slug redirects to this). License: Apache 2.0 (verified from Hub metadata, `license:apache-2.0`). Not gated. Downloads: 410,879. Likes: 4,186.

## 1. Vision
A 7B dense transformer that beats larger 13B models on benchmarks while staying cheap enough to run on a single GPU. Mistral's design thesis: architectural efficiency (sliding-window attention + grouped-query attention) can substitute for raw parameter count. It was the first major open-weight model to make GQA standard at 7B and to ship sliding-window attention as a first-class config field.

## 2. The Ask
bfloat16 weights (~14 GB), a GPU with ~16 GB VRAM for fp16 inference, standard transformers stack. The config (`transformers_version: 4.34.0.dev0`) assumes a modern HF transformers install. Vocab is small (32,000 tokens) which keeps the embedding/output matrices light.

## 3. Constraints
- Apache 2.0: fully commercial-friendly, no access gate.
- Fixed 32k config with a 4,096-token sliding window: local attention only; long-range coherence relies on layer stacking, so retrieval over very long inputs is structurally weaker than full-attention models.
- RoPE theta 10,000 (the classic small value) — no positional-encoding scaling play here; context extension was done architecturally (SWA), not via RoPE scaling.
- v0.1 is superseded by later Mistral releases (v0.2/v0.3, Mistral Small/Large, and the 2026-era lineup) — the config is a 2023 artifact, stable but dated.

## 4. GSE lens
This is the cleanest public example of **"buy context with architecture, not compute."** The transferable lessons for our predictive engine:
- **Feature-window thinking:** SWA says a 32k effective window can be served with a 4k attention window because local structure dominates. Our analogue: most NFL predictive signal is local in time (recent games, recent injuries, recent line movement). The config discipline is the lesson — they wrote `sliding_window: 4096` as an explicit, inspectable hyperparameter rather than hand-tuning attention code. Every windowed feature in our engine (rolling means, EWMA spans, lookback lengths) deserves the same treatment: named, logged, calibrated as a config knob, not buried in code.
- **GQA as a compression doctrine:** 32 Q heads / 8 KV heads = 4x KV-cache savings with near-zero quality loss. Rhyme: our ensemble/feature-store memory is the "KV cache" of the pipeline. Grouped/averaged representations of correlated signals (e.g. grouping correlated offensive-line metrics before they hit the model) is the same tradeoff — keep the expressiveness (Q heads), compress the storage (KV heads).
- **RoPE theta as a calibration lever:** they shipped theta=10k and later the community showed scaling theta extends usable context. Lesson: positional/temporal encodings in our time-series features (game-week embeddings, recency weighting) should be parameterized and calibrated walk-forward, not hardcoded.
- **Small vocab, small footprint:** 32k vocab keeps the output head cheap. Analogue: keep our label/output space small and well-defined (win prob, spread, totals) rather than predicting everything; the output head is where overfitting lives.

## 5. Verdict
**IGNORE as a model to run** (we train tabular predictive models, not 7B LLMs) / **REBUILD the pattern** (windowed attention discipline + GQA-style compression as config knobs). License: Apache 2.0.

## 6. The 4 tricks
- Model page: https://huggingface.co/mistralai/Mistral-7B-v0.1
- config.json (read directly for this dossier): https://huggingface.co/mistralai/Mistral-7B-v0.1/raw/main/config.json
- Key config fields observed: `num_attention_heads: 32`, `num_key_value_heads: 8`, `rope_theta: 10000.0`, `sliding_window: 4096`, `max_position_embeddings: 32768`, `hidden_size: 4096`, `intermediate_size: 14336`, `vocab_size: 32000`, `torch_dtype: bfloat16`, RMSNorm (`rms_norm_eps: 1e-05`), SwiGLU (`hidden_act: silu`).
