# meta-llama/Llama-3.1-8B

**Verified ID:** `meta-llama/Llama-3.1-8B`. License: Llama 3.1 Community License (verified from Hub tags, `license:llama3.1`). **GATED (manual approval) — config.json was NOT readable** (HTTP 403 on both anonymous and authenticated paths, 2026-10-02). Model exists, not disabled. Downloads: 607,450. Likes: 2,579.

## 1. Vision
Meta's flagship open 8B: a dense transformer intended as the default open base model for the ecosystem — multilingual (8 languages per card metadata), 128K native context, instruction-tuned variants, with the ecosystem (SGLang/vLLM/TGI tags) built around it. The "herd" strategy: one architecture family from 8B to 405B so techniques transfer across scales.

## 2. The Ask
Accepting the Llama 3.1 Community License on the Hub (gated). ~16 GB VRAM in bf16; the standard deployment target is one A10G-class GPU for the 8B. Long-context use (128K) multiplies KV-cache memory, so real long-context serving needs GQA's savings (below) plus paged attention.

## 3. Constraints
- **Gated weights and a custom license** (not OSI-approved): acceptable-use restrictions, and Meta can revoke/alter terms. Not Apache/MIT.
- config.json **not publicly inspectable** without access approval — I could not field-verify the config; architecture below is from the public paper, not a live read.
- 128K context is real but KV-cache-heavy; most open serving stacks need quantization to use it practically.

## 4. GSE lens
The honesty-first section: I verified the model exists, its license tag, and the paper. Architecture details below are **from the public Llama 3 paper (arXiv:2407.21783, Table 3 — I confirmed the paper's existence and its 128K-context claim on arXiv; per-field values are the paper's documented 8B column, not a live config read).**
- **Documented architecture (paper):** dense 8B, 32 layers, hidden 4096, 32 Q heads / **8 KV heads (GQA)**, RoPE base frequency **500,000**, 128K context, RMSNorm, SwiGLU. The 500k RoPE theta (vs Mistral's 10k, Qwen2.5's 1M) is the long-context knob: Llama's lesson is that **positional-encoding scale is a first-class training decision**, set at pretraining time, and it determines the usable context ceiling more than layer count does.
- **Transferable lesson — temporal encoding is a training decision:** in our engine, how we encode "time" (game week, days since injury, recency decay) is as structural as RoPE theta. If we ever train sequence models over game history, the temporal encoding scale must be chosen and calibrated walk-forward (train 2022-24, validate 2025) — not defaulted.
- **The herd doctrine:** one architecture, many scales, techniques transfer. Rhyme: our engine should keep one feature/representation spec across model sizes (a small fast model and a large accurate model sharing the same input pipeline), so calibration work on the small model transfers to the large one.
- **Ecosystem gravity:** Llama's tags include `text-generation-inference`, `endpoints_compatible`, `deploy:sagemaker` — the model is valuable partly because every serving stack targets it first. Lesson: conforming to standard interfaces (ONNX, standard sklearn/xgboost APIs) buys us free tooling; bespoke formats cost us the ecosystem.

## 5. Verdict
**IGNORE as a runnable model** (gated, custom license, and we don't serve LLMs) / **ADOPT the doctrine** (temporal-encoding-as-training-decision; one representation spec across model scales; standard interfaces). License: Llama 3.1 Community (custom, restrictive vs Apache/MIT).

## 6. The 4 tricks
- Model page: https://huggingface.co/meta-llama/Llama-3.1-8B
- config.json: https://huggingface.co/meta-llama/Llama-3.1-8B/raw/main/config.json — **403, access restricted; not readable without license acceptance**
- Architecture source used instead: https://arxiv.org/abs/2407.21783 (The Llama 3 Herd of Models)
