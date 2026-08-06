# Personal zero-cost hive vs GSE Jynx (do not conflate)

| | **Personal hive (other chat)** | **GSE production (this repo)** |
|--|-------------------------------|--------------------------------|
| Goal | iPhone assistant + research swarm @ $0 | Sports intelligence product, Vercel + Neon |
| Runtime | Your laptop Ollama + OpenClaw + CrewAI | Next.js, free-lane, Bedrock/Azure/Vertex credits |
| LLM | Local Ollama only | Cerebras free + cloud credits + Anthropic cash last |
| Trust | Personal | Honesty gates, settlement, no LLM on board truth |
| Where code lives | **Separate repo / machine** | `github.com/Beexly/Sports` only |

## Leverage (what we take, what we skip)
**Take:** free-first mindset, no paid SaaS middlemen, GitHub Actions CI, document skip-list (LangSmith, AMP, etc.).  
**Skip in Sports:** CrewAI, LangGraph hive, OpenClaw gateway, Ollama-in-Vercel, hive-mind-mcp as product path.

## Personal stack (founder machine only)
Install Ollama/OpenClaw/CrewAI on **your** Mac/PC — not as Sports monorepo deps.  
GSE agents (Claude Code / Grok) stay on Sports main + Vercel.

## GSE P0 after #334
Production builds were ERROR on dead cipher typecheck — fixed in #334.  
Confirm Vercel production READY on main; free-lane + `CLAUDE_PROVIDER=auto` env still founder.
