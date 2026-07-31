# CREDITS — claim index (founder applications)

Full pack: [`GSE_CREDITS_PROGRAMS_ACTION_PACK_V3.md`](./GSE_CREDITS_PROGRAMS_ACTION_PACK_V3.md).  
Agent wires env after keys land. **Applications = founder-only.**

| Priority | Program | Apply | Wire when approved |
|----------|---------|-------|--------------------|
| 1 | Neon Startup | https://neon.com/startups | DATABASE_URL / DIRECT_URL |
| 2 | Vercel for Startups | https://vercel.com/startups | Pro credits on existing project |
| 3 | Anthropic Claude Startups | https://claude.com/programs/startups | ANTHROPIC_API_KEY / rate limits |
| 4 | OpenAI Startups | https://openai.com/startups | optional |
| 5 | AWS Activate | https://aws.amazon.com/activate/ | Bedrock path if CLAUDE_PROVIDER=bedrock |
| 6 | Cerebras / Groq free | console | CEREBRAS_API_KEY, INTERNAL_LLM_* |

**Anti-pattern:** claim once-ever slots (Stripe/Vercel traps) before you will spend.  
**Stack freely** across independent vendors.
