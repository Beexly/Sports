---
language:
  - en
license: apache-2.0
library_name: openai-compatible
pipeline_tag: text-generation
tags:
  - mathematical-reasoning
  - probabilistic-forecasting
  - optimal-transport
  - conformal-prediction
  - tool-calling
  - exacto
  - livebench
  - openrouter
base_model_relation: finetune
inference: false
extra_gated_prompt: "Stealth-Skeleton API is served via OpenRouter and https://gse-stealth-skeleton-provider.baxley-garrett.workers.dev/v1"
---

# Stealth-Skeleton (`stealth-skeleton/skeleton-alpha` & `stealth-skeleton/skeleton-v1`)

**Stealth-Skeleton** is a mathematical, scientific, coding, and probabilistic forecasting reasoning engine featuring:
- **Execution-Verified Operator Kernel:** Sinkhorn-Knopp optimal transport marginal conservation ($\ell_1 < 10^{-6}$), Gneiting & Raftery (2007) closed-form CRPS, Hou-Li 36th-order spectral Navier-Stokes filter, Frisch-Waugh-Lovell (FWL) residualization, and Romano-Patterson-Candès (2019) Conformal Quantile Regression (CQR).
- **Calibrated Epistemic Self-Knowledge (`P(IK)`):** Implements Satopää-Tetlock (2014) log-odds pooling, Barber et al. (2023) non-exchangeable conformal weights, Schoenegger et al. (2024) median pooling, and Kadavath et al. (2022) $P(\text{IK})$ pass/abstain discipline.
- **PageIndex Vectorless Document-Tree RAG:** Hierarchical section-tree reasoning with Reciprocal Rank Fusion (RRF) and verifiable page-range citations.
- **Auto Exacto (`>95%` Tool-Calling Accuracy):** Deterministic JSON grammar healing (`healToolCallGrammar`) for multi-turn agentic workflows in `sst/opencode`, `Cline`, `Roo Code`, `Aider`, and `Cursor`.

## Endpoints & Model IDs

- **OpenAI-Compatible Base URL:** `https://gse-stealth-skeleton-provider.baxley-garrett.workers.dev/v1`
- **Model Catalog (`ModelDocumentV2`, `schema_version: "2.4"`):** `https://gse-stealth-skeleton-provider.baxley-garrett.workers.dev/v1/models`
- **Models:**
  - `stealth-skeleton/skeleton-alpha` (`gse/stealth-skeleton-alpha`) — Free evaluation tier (`$0/1M` input, `$0/1M` output, `131,072` context)
  - `stealth-skeleton/skeleton-v1` (`gse/skeleton-v1`) — Production zero-data-retention (ZDR) tier (`$1.50/1M` input, `$6.00/1M` output, `$0.30/1M` cached input, `131,072` context)
  - `stealth-skeleton/skeleton-v1-fast` (`gse/skeleton-v1-fast`) — Priority low-latency tier
  - `stealth-skeleton/skeleton-math-pro` (`gse/skeleton-math-pro`) — Graduate operator & spectral PDE specialist
  - `stealth-skeleton/skeleton-forecast` (`gse/skeleton-forecast`) — Calibrated probabilistic forecaster
  - `stealth-skeleton/skeleton-council` (`gse/skeleton-council`) — 4-voice adversarial council (`Skeptic`, `Critic`, `Pragmatist`, `Arbiter`)
  - `stealth-skeleton/skeleton-flash` (`gse/skeleton-flash`) — Low-latency PageIndex RAG & Auto Exacto specialist

## Quickstart (OpenAI Python SDK)

```python
from openai import OpenAI

client = OpenAI(
    base_url="https://gse-stealth-skeleton-provider.baxley-garrett.workers.dev/v1",
    api_key="sk-stealth-skeleton-free",
)

resp = client.chat.completions.create(
    model="stealth-skeleton/skeleton-alpha",
    messages=[
        {"role": "user", "content": "Evaluate CRPS(N(0,1), 0) = 2*phi(0) - 1/sqrt(pi) to 6 decimal places."}
    ],
    temperature=0.0,
)
print(resp.choices[0].message.content)
```
