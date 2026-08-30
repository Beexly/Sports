# Jynx vs other AI gateways

GSE **Jynx** is not a generic LLM proxy product. It is an **in-app credit + free-lane router** with product law baked in (trust-gate surfaces, free-first content, cash last).

| Dimension | **Jynx (GSE)** | OpenRouter | LiteLLM / Helicone-style gateway | Cloudflare AI Gateway | Direct Anthropic SDK |
|-----------|----------------|------------|----------------------------------|----------------------|----------------------|
| **Where it runs** | Inside `apps/web` (same deploy) | SaaS edge | Self-host or SaaS | Cloudflare edge | App → Anthropic |
| **Primary goal** | Burn **credits + free hosts** before cash; product surfaces | Many models, one API key | Unified multi-provider API | Observability + caching | Simple quality path |
| **Free lane** | Cerebras + secondary free (content/brief only) | Free model pool (retention varies) | You wire free backends | Depends on config | None |
| **Credit clouds** | Bedrock / Azure Foundry / Vertex Claude maps | Pay OpenRouter | Your keys behind proxy | Your providers | N/A |
| **Failover** | Ordered clouds on **transport/config** errors → cash | Provider fallbacks (their policy) | Configurable retries/fallback | Route rules | None |
| **Model ids** | Anthropic catalog + **no-guess** `*_MODEL_MAP` | OpenRouter slugs | Mapped in config | Provider-specific | Anthropic ids |
| **Data posture** | Prefer Cerebras free for non-retain; clouds per contract | OpenRouter data policy | You control host | CF policy | Anthropic policy |
| **Product law** | Free-lane allowlist; studio not free by default; trust-gate elsewhere | None | None | None | None |
| **Observability** | Ledger `modelName`, ops `creditStack.jynx` | Dashboard | Helicone/LiteLLM UI | CF analytics | Anthropic console |
| **Cost control** | Free → credits → cash; budget modules for blog etc. | Markup on tokens | Pass-through + your rules | Pass-through | List price cash |
| **When to use** | GSE production routing | Experiment / long-tail models | Multi-app org standard | Edge caching/WAF org | Local scripts, human Max Pro |

## What Jynx is optimized for

1. **Funding-aligned spend** — AWS Activate / Azure Foundry / Vertex credits before Anthropic cash.  
2. **Surface policy** — free only on `content`/`brief`; quality surfaces stay on Claude clouds.  
3. **Loud misconfig** — unmapped models throw; no silent wrong SKU.  
4. **One deploy** — no extra gateway hop latency or second billable middleman unless you add one.

## What Jynx is not

- Not a multi-tenant public AI gateway product  
- Not a replacement for Claude Max Pro (human coding)  
- Not a model marketplace (use open-weight catalog + free-lane secondary for that class)  
- Not settlement / trust math (never routes board truth through LLM)

## When you might still add an external gateway

| Need | Prefer |
|------|--------|
| 50+ non-Claude models, one key | OpenRouter (research / non-trust) |
| Org-wide proxy for many services | LiteLLM |
| Edge cache in front of public AI APIs | CF AI Gateway |
| GSE board/content under product law | **Jynx only** |

## Operator takeaway

Keep **Jynx** as the GSE runtime router. Use external gateways only for **non-product** or **research** workloads that must not confuse credit accounting or free-lane policy.
