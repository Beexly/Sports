# Owner Action Items — what needs YOU (accounts, keys, deploys)

Everything I can ship in code is shipped + tested. This is the running list of things that
require *you* (signups, API keys, env vars, deploys) to actually switch the leverage on.
Each item says: what, why, exact steps, and which code is already waiting for it.

Status legend: ⬜ not started · ✅ done (mark when you finish).

---

## A. Cut the Claude bill (#1 — code shipped)

⬜ **A1 — Turn on the internal-LLM tier (biggest recurring saving).**
Non-user-facing LLM work (classification, normalization, drafts) can leave Claude for a
free/cheap OpenAI-compatible model. Code is live (`lib/claude-api/internal-llm.ts`), off
until you set env. Cheapest path = **Groq free tier**:
1. Create a free key at https://console.groq.com → API Keys.
2. Set env (Vercel project + local `.env`):
   - `INTERNAL_LLM_BASE_URL=https://api.groq.com/openai/v1`
   - `INTERNAL_LLM_MODEL=llama-3.3-70b-versatile`
   - `INTERNAL_LLM_API_KEY=<your groq key>`
   (Or, once the Oracle VPS is up (item D1), self-host Ollama and point the BASE_URL there —
   $0, no key.)
Economics: models.dev has Groq Llama-3.3-70B at ~$0.59/$0.79 per Mtok vs Sonnet $3/$15 →
~85% cheaper before Groq's free tier (which can make internal work $0).

⬜ **A2 — Run the prompt-downgrade eval gate, then flip cheap surfaces.**
`npm run eval:prompts` (needs `ANTHROPIC_API_KEY`, already in your stack). It proves a
cheaper model matches before you change anything. Start with the surfaces my economics
module flags as biggest wins (calibration-insight & brief: Sonnet→Haiku ≈ 67% cheaper).
After a pass, flip that one line in `lib/claude-api/model-router.ts` (`SURFACE_TIER`).

---

## (more items appended as the other three workstreams land: free-data adapter,
## SEO flywheel, $0 infra, analytics)
