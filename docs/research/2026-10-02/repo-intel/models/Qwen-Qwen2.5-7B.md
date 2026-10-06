# Qwen/Qwen2.5-7B

**Verified ID:** `Qwen/Qwen2.5-7B`. License: Apache 2.0 (verified from Hub metadata). Not gated. Downloads: 799,037. Likes: 323.

## 1. Vision
Alibaba's Qwen team's 7B workhorse: a dense model that pushes context length (128K native) and multilingual/tokenizer quality (152K vocab) as far as a 7B can go. The design thesis is visible in the config: **spend the parameter budget on context infrastructure** — massive RoPE scaling, YARN-style chunked attention fields, and an aggressive 7:1 GQA ratio to afford the KV cache at 128K.

## 2. The Ask
bf16 (~14 GB), same single-GPU class as Mistral/Llama 7-8B. The 128K context is the catch: at full length the KV cache dominates memory, so practical long-context serving needs vLLM-style paging or quantization. Tokenizer is large (152,064) — better multilingual coverage at the cost of a heavier embedding/output head.

## 3. Constraints
- Apache 2.0, no gate — cleanest legal posture of the big-lab 7Bs.
- Config fields `sliding_window: 131072` and `use_sliding_window: false` show the long-context machinery is present but the model defaults to full attention over 128K — i.e., **you pay full quadratic attention cost** unless your serving stack pages it.
- `num_key_value_heads: 4` (7:1 GQA) is the most aggressive KV compression of any model in this dossier — a deliberate bet that KV heads are nearly redundant at this scale.

## 4. GSE lens
- **RoPE theta = 1,000,000** (vs Mistral's 10k, Llama's 500k) is the single most instructive number in this dossier. Qwen's team treated positional-encoding frequency as a *dial* and cranked it 100x to buy context. The transferable principle: **find the one scalar that controls your effective horizon and calibrate it explicitly.** For our engine, the analogue is the recency-decay half-life in time-weighted features, or the lookback length in rolling stats. Today those are likely hardcoded or vibe-chosen; Qwen's config discipline says they should be named hyperparameters with walk-forward calibration rows (train 2022-24, validate 2025 — exactly our calibration-on-wire rule).
- **7:1 GQA as a redundancy thesis:** 28 Q heads, 4 KV heads says attention keys/values are ~7x redundant. Rhyme for us: our feature set is surely redundant too (correlated team stats, overlapping efficiency metrics). The disciplined version of "drop correlated features" is what GQA does structurally — compress the redundant side, keep the expressive side. Worth a real experiment: measure feature redundancy (mutual information / VIF) the way Qwen measured KV-head redundancy, then compress structurally rather than by hand-pruning.
- **`max_window_layers: 28` (dual chunk/YARN attention):** they shipped *two* attention strategies in one config (full + chunked) and let the stack choose. Lesson: our engine should support multiple inference paths for the same trained model (full-precision batch scoring vs. quantized/fast path) behind one interface — which is exactly what ONNX Runtime's execution providers do (see the ONNX dossier).
- **Big vocab as coverage-vs-cost:** 152K tokens for multilingual coverage at the price of a fat output head. Analogue: our categorical encodings (team IDs, player IDs, coach IDs) are our "vocab" — embedding dimension choices there have the same coverage-vs-cost shape. Size them deliberately.

## 5. Verdict
**REBUILD the pattern** (horizon-dial calibration; structural redundancy compression; dual inference paths) — not the model. License: Apache 2.0, the cleanest of the 7B lab models.

## 6. The 4 tricks
- Model page: https://huggingface.co/Qwen/Qwen2.5-7B
- config.json (read directly for this dossier): https://huggingface.co/Qwen/Qwen2.5-7B/raw/main/config.json
- Key config fields observed: `num_attention_heads: 28`, `num_key_value_heads: 4`, `num_hidden_layers: 28`, `hidden_size: 3584`, `intermediate_size: 18944`, `rope_theta: 1000000.0`, `max_position_embeddings: 131072`, `sliding_window: 131072`, `use_sliding_window: false`, `max_window_layers: 28`, `vocab_size: 152064`, `rms_norm_eps: 1e-06`, `torch_dtype: bfloat16`.
