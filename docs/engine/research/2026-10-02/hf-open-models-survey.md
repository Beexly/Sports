# HF Open Models Survey — NFL Intelligence Program ("the mind/brain" build)

**Date:** 2026-10-02 · **Surveyor:** subagent · **Method:** Hugging Face Hub API metadata survey (model search, author enumerations, trending, dataset search). **No weights downloaded — metadata only.** All URLs verified against the Hub API on 2026-10-02.

**Headline finding:** There are **no NFL/sports-prediction models on HF worth using** — the sports lane is empty (a few YOLO detectors, tweet generators, and thin bet-score CSVs). The alpha is (a) frontier open **reasoning** models for the L1–L5 reasoning stack, and (b) **foundation-model primitives** (time-series, tabular) that plug directly into the engine's weakest points: small-sample calibration, totals trends, and prop classification. Everything below is Apache-2.0/MIT unless flagged.

---

## Ranked table — top 20 candidates

| # | Model | Org | Params | License | What it does | Relevance to the program |
|---|-------|-----|--------|---------|--------------|--------------------------|
| 1 | [DeepSeek-V4.1-Flash](https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash) | deepseek-ai | 763B MoE | MIT | Latest DeepSeek flagship, multimodal, Sept 2026 | **Garrett-named.** Primary "mind" candidate for L4–L5 reasoning via Inference Providers |
| 2 | [TabPFN-v2-clf](https://huggingface.co/Prior-Labs/TabPFN-v2-clf) / [TabPFN-v2-reg](https://huggingface.co/Prior-Labs/TabPFN-v2-reg) | Prior-Labs | foundation (small) | custom (Prior Labs) | Tabular foundation model: SOTA classification/regression on small tabular data, zero training | **Prop hit-rate / INT-situational classification on small-n** — exactly the early-season regime where GSE is weakest |
| 3 | [chronos-2](https://huggingface.co/amazon/chronos-2) | amazon | ~100M | Apache-2.0 | Probabilistic time-series foundation model (T5-based) | Team scoring/pacing trends, totals trajectories; probabilistic outputs feed calibration |
| 4 | [DeepSeek-R1-Distill-Qwen-7B](https://huggingface.co/deepseek-ai/DeepSeek-R1-Distill-Qwen-7B) | deepseek-ai | 7B | Apache-2.0* | R1 reasoning distilled into 7B — runs anywhere | Always-on cheap reasoning layer (L1–L3 checklist); ZeroGPU-friendly |
| 5 | [Kimi-K2-Thinking](https://huggingface.co/moonshotai/Kimi-K2-Thinking) | moonshotai | ~1T MoE | custom | Deep-thinking variant of Kimi K2 | Adversarial L4 reviewer (steelman/pre-mortem); long-horizon coherence |
| 6 | [GLM-4.7-Flash](https://huggingface.co/zai-org/GLM-4.7-Flash) | zai-org | 31B | MIT | **Garrett-named** ("glm 3.6 prime" → closest current: 4.7-Flash tier) | Fast bilingual reasoning; candidate for the L2–L3 correlation layer |
| 7 | [QwQ-32B](https://huggingface.co/Qwen/QwQ-32B) | Qwen | 32.8B | Apache-2.0 | Dedicated reasoning model (Qwen's reasoning line) | Mid-size open reasoning baseline; ablate against R1-distill |
| 8 | [DeepSeek-R1-0528](https://huggingface.co/deepseek-ai/DeepSeek-R1-0528) | deepseek-ai | 685B | MIT | R1 post-trained (May 2028→2025-05-28) | Gold-standard open reasoning; benchmark the stack against it |
| 9 | [timesfm-3.0-pytorch](https://huggingface.co/google/timesfm-3.0-pytorch) | google | ~300M | custom (Google) | Time-series foundation v3 | Alternative/complement to Chronos for totals; compare head-to-head |
| 10 | [Qwen3.8-27B](https://huggingface.co/Qwen/Qwen3.8-27B) | Qwen | 27B | custom (Qwen) | Newest Qwen dense model, 16.7k likes | General-intelligence backbone candidate; strong community validation |
| 11 | [DeepSeek-V4-Flash-0731](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash-0731) | deepseek-ai | MoE | MIT | Prior-gen Flash (4.5M downloads — most-used DeepSeek on Hub) | Proven at scale; fallback if V4.1-Flash has provider issues |
| 12 | [moirai-2.0-R-small](https://huggingface.co/Salesforce/moirai-2.0-R-small) | Salesforce | small | **CC-BY-NC-4.0 ⚠️** | Any-variate time-series foundation | Research-only (non-commercial license) — internal experiments OK, never in product |
| 13 | [Lag-Llama](https://huggingface.co/time-series-foundation-models/Lag-Llama) | time-series-foundation-models | small | Apache-2.0 | Probabilistic univariate TS foundation (LLaMA-based) | Win-probability / in-game trajectory modeling |
| 14 | [Nemotron-Research-Reasoning-Qwen-1.5B](https://huggingface.co/nvidia/Nemotron-Research-Reasoning-Qwen-1.5B) | nvidia | 1.8B | **CC-BY-NC-4.0 ⚠️** | NVIDIA's open reasoning research model | Tiny reasoning research bed; research-only license |
| 15 | [Qwen3.5-27B-Claude-4.6-Opus-Reasoning-Distilled](https://huggingface.co/Jackrong/Qwen3.5-27B-Claude-4.6-Opus-Reasoning-Distilled) | Jackrong (community) | 27B | unknown ⚠️ | Community reasoning distill, 2.9k likes | Interesting but unverified provenance — evaluate, don't trust |
| 16 | [Kimi-K2.6](https://huggingface.co/moonshotai/Kimi-K2.6) | moonshotai | MoE | custom | K2 successor | Track; thinking variant likely to follow |
| 17 | [chronos-bolt-base](https://huggingface.co/amazon/chronos-bolt-base) | amazon | small | Apache-2.0 | Fast Chronos variant (1M+ downloads) | Low-latency live in-game forecasting |
| 18 | [tabpfn_3](https://huggingface.co/Prior-Labs/tabpfn_3) | Prior-Labs | foundation | custom | TabPFN v3 (May 2026) | Newest tabular foundation — test vs v2 on prop tasks |
| 19 | [timesfm-2.5-200m-pytorch](https://huggingface.co/google/timesfm-2.5-200m-pytorch) | google | 200M | custom (Google) | Lightweight TimesFM (1.5M downloads) | Cheap baseline for TS ablations |
| 20 | [DeepSeek-R1](https://huggingface.co/deepseek-ai/DeepSeek-R1) | deepseek-ai | 685B | MIT | Original R1 (14.3k likes) | Reference point; 0528 supersedes it in practice |

\* R1 distills inherit the base model's license lineage; verify per-artifact before commercial use.

**Naming note (Garrett's list → Hub reality) — resolved 2026-10-02:** "Mimo2.6" = **Xiaomi MiMo-V2.6**, real on HF under `XiaomiMiMo/` (see Correction section below); the earlier "no public org models" claim was wrong. "GLM 3.6 prime" → closest shipping tier is **GLM-4.7-Flash**. "Muse Spark 1.3/1.4" and "Gemini 3.8" are **not on HF** (proprietary).

---

## Per-model briefs

### Reasoning models (the "mind" layer)

**1. DeepSeek-V4.1-Flash** — https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash
763B MoE, MIT, released 2026-09-10, ~750k downloads. Garrett explicitly named it. Multimodal (image-text-to-text), conversational. **Integration:** primary engine for L4 (adversarial) and L5 (synthesis) in the reasoning-depth spec, called via HF Inference Providers — no local GPU needed. First test: the spec's T1 assertion (must kill the Steelers-Browns pressure-funnel stack given pre-kickoff data).

**2. DeepSeek-R1-0528** — https://huggingface.co/deepseek-ai/DeepSeek-R1-0528
685B, MIT. The strongest open reasoning weights with a permissive license. **Integration:** benchmark ceiling — every reasoning-layer change must not regress vs R1-0528 on a fixed set of historical game autopsies.

**3. Kimi-K2-Thinking** — https://huggingface.co/moonshotai/Kimi-K2-Thinking
~1T MoE, custom license (Moonshot — read before commercial use). Purpose-built "thinking" variant: long-horizon agentic reasoning. **Integration:** the L4 adversary (pre-mortem/steelman) where depth matters more than speed; pairs with V4.1-Flash as a two-model debate council (mirrors the Grok-4-Heavy pattern in the reasoning spec).

**4. GLM-4.7-Flash** — https://huggingface.co/zai-org/GLM-4.7-Flash
31B MoE-lite, MIT, 1.8M downloads. Fast, cheap, permissive. **Integration:** L2–L3 workhorse (cross-stat correlation, causal-chain drafting) — high-volume, low-cost.

**5. QwQ-32B** — https://huggingface.co/Qwen/QwQ-32B
32.8B, Apache-2.0. Qwen's dedicated reasoning model. **Integration:** open-license reasoning baseline for ablations (QwQ vs R1-distill vs GLM-Flash on identical prompts).

**6. DeepSeek-R1-Distill-Qwen-7B** — https://huggingface.co/deepseek-ai/DeepSeek-R1-Distill-Qwen-7B
7B, 266k downloads. Runs on ZeroGPU / small instances. **Integration:** the always-on layer — no-blind-spots checklist (L1–L3) on every game, every week, cheaply.

### Time-series primitives (trends, totals, trajectories)

**7. Chronos-2** — https://huggingface.co/amazon/chronos-2
Apache-2.0, 22.7M downloads (most-downloaded TS model on Hub). Probabilistic forecasts with uncertainty bands. **Integration:** team points/pace trajectories for totals modeling; its prediction intervals feed the calibration layer directly (intervals → ECE bins).

**8. TimesFM 3.0** — https://huggingface.co/google/timesfm-3.0-pytorch
Google's TS foundation v3. **Integration:** head-to-head vs Chronos-2 on 2024–2025 weekly team totals; winner becomes the totals-trend primitive.

**9. Lag-Llama** — https://huggingface.co/time-series-foundation-models/Lag-Llama
Apache-2.0, probabilistic univariate. **Integration:** live win-probability trajectory features (complementary-football drive features as covariates).

**10. Moirai-2.0-R-small** — https://huggingface.co/Salesforce/moirai-2.0-R-small
⚠️ **CC-BY-NC-4.0 — research only, never in the commercial product.** **Integration:** internal benchmark only; if it beats Chronos, that tells us any-variate modeling matters and we re-implement the idea.

### Tabular primitives (props, small-n classification)

**11. TabPFN-v2** — https://huggingface.co/Prior-Labs/TabPFN-v2-clf · https://huggingface.co/Prior-Labs/TabPFN-v2-reg
Custom license (Prior Labs — verify commercial terms). Zero-training SOTA on small tabular data. **Integration:** THE prop-modeling primitive — INT-by-situation, prop hit/miss, 4th-down go outcomes. Test vs logistic regression on 2024–2025 labeled sets; gate on log-loss delta ≥ 0.01.

### Sports lane (the gap)

**12. (none)** — The Hub has no usable NFL prediction models. Closest artifacts: `tuxmx/nfl_bets_scores` (thin bet/score CSV), `willvernon/nfl-boxscores`, `SebastianAndreu/24679_NFL_WR_Dataset_2025` (WR dataset). **Conclusion for the handoff:** sports intelligence must be *built* (fine-tunes on the corpus + nflverse), not downloaded. These datasets are at best auxiliary features.

---

## Top 5 recommendations — concrete next steps

### R1. DeepSeek-V4.1-Flash as the L4/L5 mind (via Inference Providers)
- **What:** Route all L4-adversarial and L5-synthesis calls to `deepseek-ai/DeepSeek-V4.1-Flash` through `router.huggingface.co` (skill: `bin/hf-api POST /models --host router.huggingface.co`).
- **First task:** Run the reasoning-depth spec's **T1 assertion** — feed Week 4 pre-kickoff data (Monken quick-game 0.639, Watson pressure splits, OL injuries) and require the trace to REJECT the pressure-funnel stack.
- **Gate:** T1 passes AND the no-blind-spots checklist returns zero `UNCHECKED` at L3+.
- **Cost note:** serverless inference, no GPU spend; watch per-token cost at 763B scale — use GLM-4.7-Flash for L2/L3 volume.

### R2. TabPFN-v2 for small-n prop classification
- **What:** `Prior-Labs/TabPFN-v2-clf` on prop hit/miss and INT-by-situation labels from 2024–2025.
- **First task:** Watson-style INT-situational classifier (pressure × quarter × score × field position) vs L2-regularized logistic baseline.
- **Gate:** log-loss improvement ≥ 0.01 on held-out 2025; then try `tabpfn_3`.
- **License check first:** confirm Prior Labs commercial terms before wiring into anything product-adjacent.

### R3. Chronos-2 vs TimesFM-3.0 for totals trends
- **What:** Both models on weekly team points/pace, 2024–2025.
- **First task:** Predict next-week team points; benchmark vs the corpus's recorded naive-persistence bar (~4.87 MAE — "the engine doesn't beat naive persistence," c04 finding).
- **Gate:** winner must beat naive persistence by ≥ 0.15 MAE before earning a weight in the totals stack. Loser is documented and dropped.

### R4. R1-Distill-Qwen-7B as the always-on checklist layer
- **What:** Deploy 7B distill on ZeroGPU (Garrett already runs ZeroGPU Spaces) for the L1–L3 no-blind-spots checklist on every game.
- **First task:** Generate the five-track checklist (QB behavior, coaching/scheme, OL, trust signals, matchup) for one Week 5 game; human-grade the verdicts.
- **Gate:** ≥ 80% agreement with the 8-QB profile + 6-coach profile ground truth already computed in Tracks 1–2.

### R5. Kimi-K2-Thinking as the L4 adversary (second opinion)
- **What:** Two-model debate council — V4.1-Flash synthesizes, K2-Thinking attacks (pre-mortem, steelman, breaking-condition check).
- **First task:** Re-run the Steelers-Browns autopsy as a debate; the adversary must independently surface the Monken adjustment.
- **Gate:** adversary catches ≥ 1 thesis-killing fact the synthesizer missed, on 3 consecutive historical autopsies.
- **License check first:** Moonshot custom license — read before any commercial-adjacent use.

---

## Risks / flags for the coding agent
- **Licenses:** Moirai and Nemotron-Research are CC-BY-NC — research-only. Kimi, TimesFM, TabPFN are custom — verify before product use. MIT/Apache-2.0 (DeepSeek, Qwen-QwQ, Chronos, Lag-Llama, GLM-Flash) are safe.
- **Scale:** The best reasoning models are 600B–1T params — Inference Providers only, never local. Budget per-token cost; keep L1–L3 on small models.
- **No sports models exist** — do not go hunting for an "NFL predictor" download; the build is fine-tune/reasoning-over-data, not model discovery.
- **Community distills** (Jackrong etc.) have unverified provenance — evaluate outputs, never trust weights blindly.
- **Naming:** "Mimo2.6" resolved 2026-10-02 = Xiaomi MiMo-V2.6 (see Correction); "Muse Spark 1.3/1.4" + "Gemini 3.8" are not on HF.

## Raw API responses
Saved under `~/workspace/corpus-intelligence/handoff/hf-survey-raw/` (per-search JSON: reasoning-*.json, author-*.json, sports-*.json, prim-*.json, ts/tabular, trending, datasets-*.json) for audit/re-runs.

## Correction 2026-10-02 (Garrett's IG post)
"Mimo 2.6" resolved: **Xiaomi MiMo-V2.6 family is real and on HF** under `XiaomiMiMo/` — the earlier "no public org models" note was wrong. Family: `MiMo-V2.6-Distill-Qwen-9B` (9B, image-text-to-text, 12.7K downloads), `MiMo-V2.6-Pro-RL` (82.7K downloads), `MiMo-V2.6-Flash-RL` (44.7K downloads), plus MOPD variants and GGUF quants (bartowski). Post claims MIT license; HF API license field null — verify in model card before product use. Coding/tool-use/visual — candidate local model for the coding-agent lane.
