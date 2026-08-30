# Free-lane model deprecations - action required by 2026-08-16

Verified 2026-07-31 against provider primary sources.

## URGENT: the live INTERNAL_LLM_MODEL dies in 16 days

`llama-3.3-70b-versatile` shuts down 2026-08-16. Groq announced it by email on
2026-06-17; the notice explicitly covers free-tier usage.

    INTERNAL_LLM_BASE_URL=https://api.groq.com/openai/v1   # unchanged
    INTERNAL_LLM_MODEL=openai/gpt-oss-120b                 # was llama-3.3-70b-versatile

Three behaviour changes, none cosmetic:
- Free-tier TPM drops 12K to 8K (TPD doubles to 200K). Bursty callers will see
  429s that never fired before.
- max_completion_tokens doubles to 65,536.
- gpt-oss-120b is a reasoning model; thinking tokens bill against the output
  budget. Anywhere max_tokens is sized tightly needs review.

Do NOT substitute qwen/qwen3.6-27b - preview tier, evaluation-only, 16,384
output cap. Wrong choice for a production default.

## Deprecation table

| Model ID | Provider | Shutdown | Replacement |
|---|---|---|---|
| llama-3.3-70b-versatile | Groq | 2026-08-16 | openai/gpt-oss-120b |
| llama-3.1-8b-instant | Groq | 2026-08-16 | openai/gpt-oss-20b (14x less RPD) |
| embedding-2-preview | Google | 2026-08-10 | gemini-embedding-2 |
| zai-glm-4.7 | Cerebras | 2026-08-17 | none announced |
| qwen/qwen3-32b | Groq | 2026-07-17 | ALREADY DEAD |
| llama-4-scout-17b-16e-instruct | Groq | 2026-07-17 | ALREADY DEAD |
| gemini-2.5-flash/-lite/-pro | Google | 2026-10-16 | gemini-3.6-flash |

## Roster corrections

- Cerebras is no longer a free tier. Requires a verified payment method before
  API access activates; $5 credit expires after 30 days. Demote or drop.
- Google stopped publishing free-tier rate limits - they are per-account at
  aistudio.google.com/rate-limit. Any hardcoded Gemini RPM/RPD came from a blog,
  not from Google. Let 429 handling drive failover.
- Best free line item available: Cloudflare Workers AI @cf/baai/bge-m3
  embeddings, ~9.3M tokens/day free, no credit card. Make it the primary embed lane.
- Ruled out as router lanes: Hugging Face free inference ($0.10/mo credits),
  Together AI (no free tier), Mistral (limits undocumented).

## Ordering law (unchanged)

Local first, then Cloudflare embed, then Groq (no card; Services Agreement 4.2
forbids training on inputs/outputs), then Gemini (Google trains on free-tier
content), then OpenRouter/GitHub Models as failover, then Cerebras, then
Anthropic last.
