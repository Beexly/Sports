---
title: GSE Brain Engine (MiMo-V2.6, ZeroGPU)
emoji: 🧠
colorFrom: blue
colorTo: purple
sdk: gradio
sdk_version: 5.9.1
app_file: app.py
pinned: false
license: mit
---

# GSE Brain Engine — MiMo-V2.6 on ZeroGPU

The GSE NFL intelligence engine's LLM specialist layer: Xiaomi **MiMo-V2.6-Distill-Qwen-9B**
(MIT license) in 4-bit, served on Hugging Face **ZeroGPU — the free tier**.

## Billing policy (from HF official docs, verified 2026-10-02)

- **This Space runs on ZeroGPU hardware only** (`spaces.GPU`, default `large` size).
  ZeroGPU Spaces are free to host and use — free accounts host up to 2, PRO up to 10.
- **Daily GPU quotas:** unauthenticated 2 min · free 5 min · PRO 40 min (highest
  queue priority). Resets 24h after first GPU use.
- **Overage draws from the pre-paid credit balance only.** No card is charged
  unless credits were explicitly purchased or auto-recharge is enabled. With no
  credits, over-quota requests fail/queue — they do not bill.
- **Paid Space hardware (t4-small, a10g, …) is what bills usage-based.**
  This Space is pinned to ZeroGPU; a drift monitor alerts loudly if the
  hardware ever changes. Never upgrade this Space's hardware without
  Garrett's explicit approval.

Sources: https://huggingface.co/docs/hub/spaces-zerogpu ·
https://huggingface.co/docs/hub/billing

## The /chat contract

Send VERIFIED DATA plus a grounding prompt. The model reasons (L3 causal
chains, L4 adversarial review, L5 synthesis) under hard rules: cite provided
numbers, label inference as INFERENCE with a breaking condition, output the
requested JSON schema. The deterministic GSE contract (adversary_review,
correlated_theses, checklist) still disposes — the model proposes.
