# BAAI/bge-m3

**Verified ID:** `BAAI/bge-m3`. License: MIT (verified from Hub metadata). Not gated. Downloads: 35,073,646 — the highest-download model in this dossier by ~40x. Likes: 3,787.

## 1. Vision
One embedding model that does three retrieval jobs at once: dense embeddings (single vector), sparse lexical weights (SPLADE-style term weights), and multi-vector ColBERT-style token embeddings — plus 100+ language support and 8K context. The thesis: **one model, three retrieval modes, self-distilled** so you don't need three separate indexes. It's the de-facto standard open embedding model (35M downloads).

## 2. The Ask
XLM-RoBERTa backbone (24 layers, 16 full attention heads, hidden 1024, ~567M params), float32 default dtype in config (most deployments cast to fp16/ONNX). 8K context via absolute position embeddings (`max_position_embeddings: 8194`). Runs on CPU comfortably — this is not a GPU model by necessity.

## 3. Constraints
- MIT license — fully permissive.
- **Full MHA (16 heads, no GQA)** with absolute positional embeddings: an older architectural generation than the GQA/RoPE 7Bs above. 8K context is the ceiling; the config shows no RoPE-scaling machinery.
- Multi-vector mode multiplies index size (one vector per token); the "three modes in one" pitch has a real storage cost if you use all three.
- `torch_dtype: float32` in config — heavier than needed; production use wants fp16/quantized or ONNX.

## 4. GSE lens
- **Self-knowledge distillation as a compression doctrine:** bge-m3's public recipe distills the three retrieval modes into one model so a single forward pass serves all three. Direct rhyme with our problem: we currently (per the total-signal doctrine) ingest *every* signal. The bge-m3 lesson is that you can keep the *interface* wide (many signals in) while distilling the *representation* narrow (one compact model out) — but the distillation has to be deliberate and measured, not assumed. This is the same teacher-student pattern as the DeepSeek distill, applied to representations instead of reasoning.
- **One model, multiple output heads:** dense + sparse + multi-vector from one backbone. Our analogue: one trained model emitting win probability, spread, and totals from shared representations — multi-task heads sharing a backbone, calibrated separately per head (each head gets its own calibration row under calibration-on-wire).
- **CPU-first serving is a choice, not a fallback:** bge-m3's 35M downloads are largely CPU/ONNX deployments. This is the strongest evidence in the dossier for our serving question: a well-chosen model served via ONNX Runtime on cheap CPU can be the production path, with the GPU reserved for training. (See the onnxruntime dossier.)
- **Absolute positions at 8K, no RoPE games:** sometimes the boring, well-understood encoding wins on robustness. Lesson: don't reach for exotic temporal encodings in our features until the simple ones (game index, days-since) are calibrated and shown insufficient. Complexity must earn its place walk-forward.
- **What it could do for us directly:** bge-m3 is the obvious candidate for embedding unstructured NFL text (injury reports, beat-writer news, press conferences) into our feature store — MIT licensed, CPU-servable, 100+ languages (useful for international player news). Any text-ingestion lane should evaluate it first.

## 5. Verdict
**ADOPT** (as the text-embedding backbone for any unstructured-signal lane; as the template for CPU-first ONNX serving). License: MIT.

## 6. The 4 tricks
- Model page: https://huggingface.co/BAAI/bge-m3
- config.json (read directly for this dossier): https://huggingface.co/BAAI/bge-m3/raw/main/config.json
- Key config fields observed: `architectures: [XLMRobertaModel]`, `num_hidden_layers: 24`, `num_attention_heads: 16`, `hidden_size: 1024`, `max_position_embeddings: 8194`, `position_embedding_type: absolute`, `hidden_act: gelu` (not SwiGLU), LayerNorm (`layer_norm_eps: 1e-05`, not RMSNorm), `torch_dtype: float32`, `vocab_size: 250002`.
