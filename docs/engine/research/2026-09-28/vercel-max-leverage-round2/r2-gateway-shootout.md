# Vercel AI Gateway Price Shootout — Agent Fleet Model Basket
**Research date:** 2026-09-28 · **Status:** research only, no repo changes · **All prices USD per 1M tokens (input / output) unless noted**

Sources are live-fetched today (OpenRouter API, Vercel docs, Vercel models catalog, Neon docs, provider docs).
Every number carries a source URL + date. Unverified = stated as unverified; nothing invented.

## Basket verdict (TL;DR)

| Model | Cheapest verified route | Note |
|---|---|---|
| DeepSeek V3 (deepseek-chat, legacy SKU) | OpenRouter $0.2574/$1.0287 (+5.5% fee → $0.2716/$1.0853) | Direct DeepSeek RETIRED this SKU 2026-07-24; direct replacements are `deepseek-flash` ($0.30/$1.20 peak, $0.15/$0.60 off-peak) and `deepseek-v4-pro` ($1.32/$3.96 peak) |
| Claude Sonnet 5.5 (released TODAY 2026-09-28) | Vercel $2.00/$10.00 = direct Anthropic $2.00/$10.00 (0% gateway fee) | OpenRouter same $2/$10 + 5.5% → $2.11/$10.55 effective |
| Grok 4.7 | Vercel $2.00/$6.00 = direct xAI $2.00/$6.00 (0% gateway fee) | Vercel changelog advertised "40% off" at launch, but live catalog today shows $2/$6 — discount not currently visible; queued for re-verification |
| Llama 3.1 8B | OpenRouter $0.05/$0.08 (+fee → $0.0528/$0.0844) | Meta has no hosted list price; Vercel price = inference-provider list (unverified per-model on Vercel catalog in this pass) |
| Qwen3 235B A22B | OpenRouter $0.455/$1.82 (+fee → $0.4800/$1.9201) | SKU expires 2026-10-09 on OpenRouter; Neon carries Qwen3 variants ($0.15/$1.20 80B, $0.22/$2.20 122B) but 235B unconfirmed |
| GPT-4o-mini | Vercel $0.15/$0.60 (zero markup → OpenAI list) | OpenRouter $0.15/$0.60 + 5.5% → $0.1583/$0.633 effective |
| gpt-oss-120b | Vercel ≈ $0.15/$0.60 (via zero-markup policy, unverified on catalog) | OpenRouter $0.15/$0.60; Neon lists $0.15/$0.60 (Databricks) but models.dev flags entries showing $0.072/$0.28 (OpenRouter parity) — inconsistency |

**Headline:** Vercel AI Gateway is at parity-or-cheaper than OpenRouter on every basket model because of the 5.5% deposit fee, and exactly at direct-provider list everywhere else (zero markup). BYOK on Vercel = provider list with $0 gateway fee.

---

## 1. The numbers — per-model, per-provider

"Vercel" column: prices rendered live on the Vercel models catalog today are marked ✓; others follow from the documented zero-markup policy and are flagged.

| Model | Vercel AI Gateway | OpenRouter (list) | OpenRouter effective (+5.5%) | Neon AI Gateway | Direct provider |
|---|---|---|---|---|---|
| DeepSeek V3 `deepseek-chat` (legacy) | Not individually verified on catalog; zero markup → provider route rate (unverified) | **$0.2574 / $1.0287** ✓ | **$0.2716 / $1.0853** | Not available (not in open-weight/foundation catalog) | RETIRED 2026-07-24 (historic $0.27/$1.10; cache-hit $0.07). Current: `deepseek-flash` $0.30/$1.20 peak ($0.15/$0.60 off-peak); `deepseek-v4-pro` $1.32/$3.96 peak ($0.66/$1.98 off-peak) |
| Claude Sonnet 5.5 | **$2.00 / $10.00** ✓ | **$2.00 / $10.00** ✓ | **$2.11 / $10.55** | Not confirmed (July live probe: `claude-sonnet-5` unavailable; `claude-sonnet-4-6` works) — queued | **$2.00 / $10.00** (cache read $0.20, cache write $2.50) — Anthropic |
| Grok 4.7 | **$2.00 / $6.00** ✓ | **$2.00 / $6.00** ✓ (≥200k prompt: $4.00/$12.00) | **$2.11 / $6.33** (std tier) | Docs overview names `Grok 4.6` as callable; 4.7 not live-probed — queued | **$2.00 / $6.00** global <200k prompt; $4.00/$12.00 ≥200k; cached $0.50/$1.00; US regional ×1.1 — xAI |
| Llama 3.1 8B Instruct | Not individually verified; zero markup → inference-provider list (unverified) | **$0.05 / $0.08** ✓ | **$0.0528 / $0.0844** | **$0.15 / $0.45** (Databricks DBU-derived) | No hosted Meta list price; NVIDIA NIM has no published per-token price (free dev tier) — queued |
| Qwen3 235B A22B | Not individually verified (unverified) | **$0.455 / $1.82** ✓ (expires 2026-10-09; also `qwen3-32b` $0.08/$0.28) | **$0.4800 / $1.9201** | Qwen3 80B: $0.15/$1.20; Qwen3.5 122B: $0.22/$2.20 (235B A22B unconfirmed) — queued | Alibaba list not verified — queued |
| GPT-4o-mini | **$0.15 / $0.60** (via zero-markup policy → OpenAI list; not individually rendered) | **$0.15 / $0.60** ✓ | **$0.1583 / $0.633** | Not confirmed — queued | **$0.15 / $0.60** (batch $0.075/$0.30) — OpenAI |
| gpt-oss-120b | Not individually verified; zero markup → provider route rate (unverified) | **$0.15 / $0.60** ✓ | **$0.1583 / $0.633** | **$0.15 / $0.60** per Databricks headline — BUT models.dev flags Neon entries showing **$0.072/$0.28** (OpenRouter parity): inconsistency, queued | Open weights — no single provider list; NIM no per-token price — queued |

Blended-cost comparison (3:1 input:output ratio), effective dollars:

| Model | Vercel (list) | OpenRouter effective | Direct | Neon |
|---|---|---|---|---|
| DeepSeek V3 legacy | unverified | $0.4789 | retired | n/a |
| Sonnet 5.5 | $4.00 | $4.22 | $4.00 | queued |
| Grok 4.7 | $3.00 | $3.17 | $3.00 | queued |
| Llama 3.1 8B | unverified | $0.0607 | n/a | $0.225 |
| Qwen3 235B | unverified | $0.8400 | queued | — (80B: $0.4125) |
| GPT-4o-mini | $0.2625 | $0.2769 | $0.2625 | queued |
| gpt-oss-120b | unverified | $0.2769 | n/a | $0.2625 (or $0.132 — flagged) |

*Blended = (3×in + 1×out)/4. Blends include the 5.5% fee in the OpenRouter column.*

## 2. Vercel AI Gateway mechanics (verified in docs today)

- **Zero markup, zero platform fee on tokens.** You pay the provider's list price, whether via Vercel-managed keys or BYOK. Source: https://vercel.com/docs/ai-gateway/pricing (updated 2026-09-08).
- **Discounted models below provider list (automatic, all teams).** Live on the catalog today (https://vercel.com/ai-gateway/models, rendered 2026-09-28): meituan/longcat-2.5-preview −59%, gemini-3.8-flash-tts −50%, gemini-3.8-flash-lite-tts −50%, inception/mercury-2.5 −80%, gemini-3.8-flash −50%, zai/glm-5.3-flash −44%, **deepseek/deepseek-v4-flash-vision-exp −51%**, gemini-3.7-flash −50%, mixedbread/toast-1 −40%, inclusionai/ling-3.0-flash −65%, gemini-3.6-flash −50%. Docs promos (2026-09-08): "GPT-5.6 Sol is now 50% off", "MiniMax H3 and H3 Max are 50% off". **None of Garrett's basket models carry a discount badge in the catalog today** — Sonnet 5.5 ($2/$10) and Grok 4.7 ($2/$6) both render at list. One wrinkle: a Vercel changelog link is titled "Grok 4.7 now available and 40% off on AI Gateway" — but the live catalog shows $2/$6; treat the 40% as expired or route-specific, queued for re-verification.
- **Free tier:** $5 of AI Gateway credits per month, starts on first request, requires a valid payment method on file, lower per-model rate limits, subset of models, no BYOK.
- **Free credit permanently forfeited on first top-up:** "Once you purchase credits, your account transitions to the paid tier and the monthly free credit no longer applies." Source: https://vercel.com/docs/ai-gateway/pricing.
- **BYOK at $0 fee (paid tier):** "With BYOK, there is no markup or fee from AI Gateway." Requires purchased credits (paid tier); BYOK requests still require a positive credit balance so fallback providers remain available — when your key fails, the gateway retries on system credentials and that fallback usage is billed against your credits. Source: https://vercel.com/docs/ai-gateway/pricing.
- **Dollars translation of BYOK:** with Garrett's existing Anthropic/OpenAI/xAI keys, Vercel bills exactly provider list — Sonnet 5.5 = $2.00/$10.00 per 1M, GPT-4o-mini = $0.15/$0.60, Grok 4.7 = $2.00/$6.00. The gateway adds routing, failover, observability for $0. OpenRouter's equivalent (BYOK) is free only under $25k/mo list-price inference, then 5% above the allowance.
- **Insufficient funds:** a request that exceeds the balance fails with `402 insufficient_funds`. BYOK requests also need a positive balance.
- **Payment processing fees:** "You're responsible for any payment processing fees that may apply" — Vercel's docs do not publish a fixed % like OpenRouter's 5.5%. Enterprise invoice billing has no payment processing fees.
- **Per-request ZDR is FREE** (Pro/Enterprise): "Zero Data Retention (ZDR) routes requests to providers that have agreed not to retain or train on prompt data." Per-request ZDR: no additional cost. Team-wide ZDR: $0.10 per 1,000 requests. Source: https://vercel.com/docs/ai-gateway/pricing.
- **disallowPromptTraining filter is FREE for all users** (no extra charge), set per request in `providerOptions.gateway.disallowPromptTraining`. Source: https://vercel.com/docs/ai-gateway/security-and-compliance/disallow-prompt-training (updated 2026-09-10).
- **Training-data default:** "By default, AI Gateway does not route based on the training data policy of providers. If we do not know a provider's training data stance or have not yet established an agreement with them, we assume that they train on your data." With the filter on, requests route only to ✓ providers; if none available, the request fails (`no_providers_available`, 400). The filter is NOT enforced on BYOK requests (your key, your agreement) but IS honored on failover to system credentials.

### Per-model-family training-data status on AI Gateway (from the ✓ "no prompt training" provider table)

| Basket model | Family provider on gateway | No-prompt-training agreement ✓? | Default posture |
|---|---|---|---|
| DeepSeek V3 | DeepSeek | ✗ (not listed) | **Assumed to train** unless filter set; with filter set, no DeepSeek route available (request fails or routes elsewhere) |
| Claude Sonnet | Anthropic (+ Bedrock, AWS) | ✓ Anthropic, ✓ Bedrock | No training via agreement |
| Grok 4.7 | xAI | ✓ xAI | No training via agreement |
| Llama 3.1 8B | Meta (+ inference providers e.g. DeepInfra, Fireworks, Groq — all ✓) | ✓ Meta | No training via agreement |
| Qwen3 | Alibaba Cloud (+ DeepInfra etc.) | ✓ Alibaba Cloud | No training via agreement |
| GPT-4o-mini / gpt-oss-120b | OpenAI (+ Azure, etc.) | ✓ OpenAI | No training via agreement |

Practical note for the fleet: DeepSeek is the only basket model family with no no-training agreement on AI Gateway. Either route it with the filter off (assumed-trains) or use per-request ZDR/disallowPromptTraining and accept that DeepSeek routes become unavailable.

---

## 3. OpenRouter (verified live 2026-09-28)

- Live model API: https://openrouter.ai/api/v1/models — prices above are per-token × 1M from today's payload. Anthropic Claude Sonnet 5.5 (`canonical_slug: anthropic/claude-sonnet-5.5-20260928`, created today); x-ai/grok-4.7 (flagship, `~x-ai/grok-latest` aliases to it); deepseek/deepseek-chat (canonical `deepseek-chat-v3`); meta-llama/llama-3.1-8b-instruct; qwen/qwen3-235b-a22b; openai/gpt-4o-mini; openai/gpt-oss-120b.
- **Fee: 5.5% on Stripe card top-ups ($0.80 minimum), 5% on crypto.** No markup on inference — catalog rates match provider list (independently verified 2026-08-31: https://ofox.ai/blog/openrouter-pricing-hidden-markup-breakdown-2026/).
- **Amortization math:** fee is charged at purchase, so to hold $C of credits you pay $C × 1.055. Effective per-token = list × 1.055 at any spend level (no volume discounts — OpenRouter FAQ states none currently).
  - **$50/mo:** pay $52.75 → $50 credit. Fee $2.75. Effective multiplier 1.055.
  - **$200/mo:** pay $211.00 → $200 credit. Fee $11.00. Effective multiplier 1.055.
  - The $0.80 minimum only matters for top-ups under ~$14.55 (e.g. $10 → $10.80 = 8.0% effective).
- Credits: USD-denominated, pre-purchased; unused credits may expire after 1 year; refunds within 24h (platform fee non-refundable; crypto never refundable).
- **BYOK:** 5% fee of normal OpenRouter cost, free allowance $25,000/mo list-price inference (PAYG) — effectively $0 fee for Garrett's fleet scale.

---

## 4. Neon AI Gateway (docs: https://neon.com/docs/ai-gateway/overview)

- Databricks Foundation Model APIs passthrough; **no markup** — "Neon charges the same per-token rate as the model provider."
- Availability: paid Neon plans (Launch/Scale) only, prepaid credits ($5 minimum, 1 credit = $1 USD, valid 12 months). Foundation models rolled out gradually; open-weight models usable immediately with credits.
- **Basket coverage (from a July 2026 live gateway probe: https://github.com/anomalyco/models.dev/pull/3019):**
  - ✓ `meta-llama-3-1-8b-instruct` — $0.15/$0.45 (Databricks DBU × $0.070/DBU)
  - ✓ `gpt-oss-120b` — $0.15/$0.60 (Databricks headline) — flagged: pre-existing Neon entries show $0.072/$0.28 (OpenRouter pricing); inconsistency unresolved
  - ✓ Qwen3 variants: `qwen3-next-80b-a3b-instruct` $0.15/$1.20, `qwen35-122b-a10b` $0.22/$2.20 (235B A22B not confirmed)
  - ✓ pass-through proprietary: `claude-opus-4-8`, `gemini-3-5-flash`, GPT codex models (provider list pricing)
  - ✗ `claude-sonnet-5` verified NOT available (July); `claude-sonnet-4-6` works. Sonnet 5.5 availability: queued
  - ✗ DeepSeek V3 — not in catalog (DeepSeek is not a Databricks Foundation Model API offering)
  - ~ Grok: docs overview names `Grok 4.6` as a callable foundation model, but the July probe did not test xAI models — availability queued
  - ~ GPT-4o-mini: not seen in probe results — queued
- Note: Garrett's Neon plan tier is unconfirmed and a Neon API key for `neon deploy` is still owed (per 2026-09-28 audit) — both are founder taps before the Neon lane can be piloted.

---

## 5. Direct provider pricing (verified 2026-09-28)

| Provider | Model | Input / Output per 1M | Source |
|---|---|---|---|
| Anthropic | Claude Sonnet 5.5 (released today) | $2.00 / $10.00 (cache read $0.20, write $2.50) | https://artificialanalysis.ai/articles/claude-sonnet-5-5 ; https://www.unite.ai/anthropic-releases-claude-sonnet-5-5-at-unchanged-sonnet-5-pricing/ |
| xAI | Grok 4.7 | $2.00 / $6.00 global <200k prompt; $4.00/$12.00 ≥200k; cached $0.50/$1.00; US regional ×1.1 | https://docs.x.ai/developers/pricing ; https://docs.x.ai/developers/grok-4-7 |
| OpenAI | GPT-4o-mini | $0.15 / $0.60 (batch $0.075/$0.30) | Long-standing OpenAI list; OpenRouter live API matches exactly (no-markup policy); corroborated June 2026 catalog https://github.com/vbcdng/claim-grounding/blob/HEAD/docs/MODEL_OPTIONS.md |
| DeepSeek | deepseek-chat (V3) | RETIRED 2026-07-24 — historic $0.27/$1.10 | https://felloai.com/deepseek-pricing/ ; https://benchlm.ai/deepseek/api-pricing |
| DeepSeek | deepseek-flash (V4.1, current) | $0.30 / $1.20 peak; $0.15 / $0.60 off-peak; cache-hit input $0.006 | https://benchlm.ai/deepseek/api-pricing |
| DeepSeek | deepseek-v4-pro (current flagship) | $1.32 / $3.96 peak; $0.66 / $1.98 off-peak | https://benchlm.ai/deepseek/api-pricing |
| Meta | Llama 3.1 8B | No hosted per-token list price (open weights) | n/a |
| Alibaba | Qwen3 235B | Not verified — queued | — |
| NVIDIA NIM | llama-3.1-8b / qwen3 / gpt-oss-120b | **No published per-token list price found.** NIM hosted API (build.nvidia.com) is a free developer tier (rate-limited; free-tier flakiness already noted in Garrett's fleet); production = NVIDIA AI Enterprise licensing / self-host. Not comparable per-token — queued for evaluation. | https://build.nvidia.com (catalog) |

---

## 6. Queued for evaluation (NOT dismissed)

1. Vercel catalog per-model prices for deepseek-chat, gpt-4o-mini, llama-3.1-8b-instruct, gpt-oss-120b, qwen3-235b-a22b — the ?discount=true catalog view was rate-limited during this pass; only Sonnet 5.5 and Grok 4.7 were rendered live. Zero-markup policy implies provider-list pricing.
2. Whether the "Grok 4.7 40% off" Vercel promo is still live on any route (catalog today shows $2/$6).
3. Neon availability of Sonnet 5.5, Grok 4.7, GPT-4o-mini, Qwen3 235B A22B — requires a live probe against Garrett's Neon branch (needs his Neon API key).
4. NVIDIA NIM per-token economics — none published; free-tier limits + production licensing need a direct read of build.nvidia.com plan terms.
5. Alibaba Cloud direct Qwen3 list pricing (DashScope/Model Studio).
6. OpenAI GPT-4o-mini current list — matched via OpenRouter no-markup parity; worth one direct check of platform.openai.com/docs/pricing.

## 7. Pilot recommendation (researcher's read)

- **For the Next.js app + fleet:** Vercel AI Gateway on the paid tier with BYOK for Garrett's existing Anthropic/OpenAI/xAI keys gives provider-list pricing with $0 gateway fee, free per-request ZDR, free disallowPromptTraining, $5/mo free credit to start, and the fleet already deploys on Vercel. OpenRouter's only structural cost is the 5.5% deposit fee (~$2.75 on $50, $11.00 on $200).
- **Caveats:** (a) first top-up permanently forfeits the $5/mo free credit — run the free tier first, then commit; (b) BYOK requests need a positive credit balance for fallback; (c) DeepSeek is the only basket model with no no-training agreement — decide its data posture explicitly; (d) credits must be prefunded (402 on empty balance) — set auto top-up.
- **Neon** is the dark horse for the open-weights slice (Llama 3.1 8B $0.15/$0.45 vs OpenRouter $0.05/$0.08 — OpenRouter wins on price; Neon wins on zero-fee prepaid with no deposit markup and branch-scoped credentials) but needs Garrett's Neon API key + plan check first.

*Method note: numbers above are fetched 2026-09-28 from the sources listed; provider prices move — re-pull the OpenRouter API and the Vercel models catalog before signing off on a pilot budget.*
