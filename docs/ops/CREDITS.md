# CREDITS — claim tracker (founder fills Status)

Agent wires env after keys land. **Applications = founder-only.** Never invent grant amounts.

| Program | Claim URL | Eligibility notes | Status (founder) | Wire env |
|---------|-----------|-------------------|------------------|----------|
| Neon Startup | https://neon.com/startups | Self-funded ≤$1k or VC up to $100k | | DATABASE_URL / DIRECT_URL |
| Vercel for Startups | https://vercel.com/startups | Partner-affiliated preferred | | Pro credits on project |
| Anthropic Claude Startups | https://claude.com/programs/startups | Claude Console account; partner VC for higher tiers | | ANTHROPIC_API_KEY |
| OpenAI Startups | https://openai.com/startups | Partner VC preferred | | OPENAI_API_KEY optional |
| AWS Activate | https://aws.amazon.com/activate/ | Founders vs Portfolio | | CLAUDE_PROVIDER=bedrock path |
| Stripe Atlas / Activate | https://stripe.com/atlas | Once-ever traps — time carefully | | STRIPE_* live |
| GCP / Google for Startups | https://cloud.google.com/startup | 31-day Workspace rule | | VERTEX_* if used |
| Cerebras free | https://cloud.cerebras.ai | Free lane content (**content-generator wired #320**) | | CEREBRAS_API_KEY + CONTENT_FREE_LANE_ENABLED |
| Groq free | https://console.groq.com | Internal LLM tier | | INTERNAL_LLM_* |

Full sequencing + traps: [`GSE_CREDITS_PROGRAMS_ACTION_PACK_V3.md`](./GSE_CREDITS_PROGRAMS_ACTION_PACK_V3.md) · **Master alignment:** [`FUNDING_PARTNERSHIP_ALIGNMENT_MASTER.md`](./FUNDING_PARTNERSHIP_ALIGNMENT_MASTER.md)

**Anti-pattern:** claim once-ever slots before you will spend.
