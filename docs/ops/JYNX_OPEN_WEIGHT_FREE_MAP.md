# Jynx × open-weight / free model map

Operator research (2026-08) mapped into **lanes that do not fight each other**.

## Principle

| Lane | What goes here | Never |
|------|----------------|-------|
| **Free content** | Cerebras gpt-oss → secondary free API (Gemma/Nemotron/…) | Studio, journal, public picks claims |
| **Claude credits** | AWS Bedrock / Azure Foundry / Vertex | Paying cash when credits configured |
| **Internal** | Groq free, gpt-oss-20b, Llama Scout, small Qwen | User-facing GSE copy |
| **Human coding** | Claude Max Pro | Runtime product path |
| **Avoid** | Kimi K3 at $3/$15, random low-score models | Burning cash for no moat |

## Your free-tier table → GSE action

| Model (score) | Provider | GSE lane | How to burn $0 |
|---------------|----------|----------|----------------|
| **Gemma 4 26B/31B free (69)** | Google | free_content secondary | `FREE_LANE_SECONDARY_*` → host’s free OpenAI-compat endpoint |
| **Nemotron 3 Nano Omni free (68)** | NVIDIA | free_content secondary | NIM free / NVIDIA free host URL |
| **Nemotron Super/Ultra free** | NVIDIA | free_content / self_host | NIM + Founders Hub GPU for heavy |
| **gpt-oss-120b / 20b free** | OpenAI weights | free_content **primary** | Cerebras (already wired) |
| **North Mini Code free** | Cohere | internal_only | INTERNAL_LLM_* |
| **MiniMax M3 ($0.30/$1.20)** | MiniMax | paid only if free dry | Not free-lane |
| **DeepSeek V4 Pro** | DeepSeek | paid open-weight | Prefer Claude credits for trust surfaces |
| **Kimi K3 ($3/$15)** | Moonshot | **avoid** | Worse economics than Claude credits |
| **Llama 4 Scout** | Meta | internal long-context | Host when needed |
| **Qwen3 Coder 480B** | Alibaba | internal / agent coding | Not public claims |

Headline bench winners (Kimi K3, Inkling, GLM-5.2) are **not** automatic free-lane picks — price and trust-tier matter more than leaderboard rank.

## Env chain (content)

```bash
CONTENT_FREE_LANE_ENABLED=true

# 1) Primary free (data-sovereign Cerebras)
CEREBRAS_API_KEY=...
# default model gpt-oss-120b

# 2) Secondary free host (Gemma / Nemotron / OpenRouter free / Groq free)
FREE_LANE_SECONDARY_BASE_URL=https://api.example.com/v1
FREE_LANE_SECONDARY_API_KEY=...          # if required
FREE_LANE_SECONDARY_MODEL=gemma-4-31b    # host’s exact id
FREE_LANE_SECONDARY_LEDGER_PREFIX=free-secondary/

# 3) Jynx Claude credits after free fails
CLAUDE_PROVIDER=auto
# + Bedrock / Azure / Vertex maps
```

Attempt order: **Cerebras → secondary free → cloud Claude credits → cash Anthropic**.

## Internal (non-public)

```bash
INTERNAL_LLM_BASE_URL=https://api.groq.com/openai/v1
INTERNAL_LLM_MODEL=llama-3.3-70b-versatile   # or gpt-oss-20b / Nemotron nano
INTERNAL_LLM_API_KEY=...
```

## Code

- Catalog: `apps/web/lib/claude-api/open-weight-catalog.ts`
- Secondary host: `openai-compat.ts` + `free-lane.ts`
- Planner: `jynx.ts` (free first, then clouds)

## Law

- Free output still passes brand-safety / numeric-guard / no ROI theater  
- Never claim “on free models” while ledger shows cash Anthropic  
- Never free-lane studio/journal until quality validated  
- Image/video free models (LTX, Wan, SVD) are **out of band** for GSE text intelligence  

See `JYNX_COST_STACK.md` · `CLOUD_CREDIT_LAUNCH_MAP.md`.
