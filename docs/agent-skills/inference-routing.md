# Inference routing (existing)

**In-repo:** `apps/web/lib/claude-api/model-router.ts` + `provider-dispatch.ts` + `free-lane.ts`.

| Surface | Active tier (see SURFACE_TIER) |
|---------|--------------------------------|
| calibration-insight, brief | haiku |
| studio, journal, content, model-court | sonnet (model-court recommended opus when validated) |

Env flags already exist for free lane / internal LLM / bedrock / vertex — see `.env.example` and CREDITS pack.

**Do not:** self-host DeepSeek/DeepSpeed clusters.  
**Optional:** point coding-agent DX at cheap OpenAI-compatible endpoints outside this monorepo.
