# Leverage Atlas — Completeness Addendum (nothing sidestepped)

**Owner directive:** "Be sure you didn't sidestep any … developer programs, coding
agents, workflows, tech, websites, partnerships … drive all of these, make them fit."

**Honest note:** the first two docs (`CLOUD_CREDIT_LEVERAGE_STRATEGY.md`,
`LEVERAGE_ATLAS.md`) under-covered several categories the owner explicitly named —
coding agents / dev workflows, Anthropic-native programs, Vercel, GitHub, accelerators,
extra compute/voice lanes, and incorporation. This addendum closes every one, and
flags the pieces that **already fit in code today** vs. those that need a founder key.

---

## 0. The technical headline: most AI lanes ALREADY FIT — no new code

The repo's `apps/web/lib/claude-api/` layer is a **universal LLM router** we can point
at almost any provider by env alone:

- **`CLAUDE_PROVIDER=bedrock | vertex`** → Claude on AWS/Google credits (identical model,
  zero premium; transparent Anthropic fallback). *Code-complete; env flip.*
- **`internal-llm.ts` is a universal OpenAI-compatible lane** — it POSTs
  `${INTERNAL_LLM_BASE_URL}/chat/completions` with `Authorization: Bearer
  ${INTERNAL_LLM_API_KEY}` and `INTERNAL_LLM_MODEL`. That means **the Vercel AI Gateway,
  Groq, Together, Fireworks, OpenRouter, and Cerebras all already fit** — set those three
  env vars at the provider's base URL and it works, no new adapter. (Model-freeze caveat:
  route the PICK-adjacent surfaces only to a lane serving the SAME Claude model — e.g.
  the Vercel AI Gateway pointed at `anthropic/claude-…`; a different model is for
  non-pick content only.)
- **`docker/oracle-vps` Ollama** → the $0 local lane on Oracle Always-Free.

So "make the AI programs fit" is done: they fit through env config on a proven,
tested router. The only real *code* gap is optionally promoting the OpenAI-compatible
lane to a first-class `CLAUDE_PROVIDER` value (a small, model-freeze-aware follow-up).

---

## 1. Coding agents & dev workflows (explicitly named — was missing)
| Lever | Value | State |
|---|---|---|
| **Claude Code** (this agent) | autonomous build/PR/CI loop | in use — the delivery engine |
| **Claude Agent SDK** | build custom agents/automations on our stack | available to adopt |
| **MCP servers already connected this session** | Figma, Higgsfield (video), Vercel, Stripe, Notion, Gmail, Google Drive, GitHub | LIVE leverage — usable now (e.g. Higgsfield for podcast/social video, Figma for design-to-code, Vercel MCP for deploy ops) |
| **GitHub Copilot** (for Startups) | AI pair-programming, code review | via GitHub for Startups |
| **GitHub Actions / Codespaces** | CI + cloud dev env | using Actions; 50K min via Startups |
| **Cursor / Windsurf** | agentic IDEs | optional |
| **Workflows** (this harness's multi-agent orchestration) | parallel fan-out for audits/migrations | available on demand |

## 2. Anthropic-native (we're a Claude shop — was under-covered)
- **Claude for Startups** — **$25K–$100K+ Claude credits**, any early-stage founder
  (higher tiers VC-nominated), 12-mo validity; apply at claude.com/programs/startups.
  Directly offsets our single biggest variable cost.
- **Claude for Open Source / Anthology** — additional credit paths.
- **Prompt caching** — `messages.ts` already exposes a `cache` option; using it on the
  stable system prompts cuts input-token cost materially. **Verify every generator passes
  `cache` — a free, code-side cost win.**
- **MCP ecosystem** — expose our own read-only Proof/ledger surface as an MCP tool (builds
  on the `/api/proof/*` surface already shipped) so any Claude client can query our record.

## 3. Vercel (our current host — was under-covered)
- **Vercel for Startups** — 12+ months **free Pro** + platform credits.
- **Vercel AI Gateway** — **$5/mo free** LLM credits (indefinite) + unified observability +
  automatic cross-provider failover; fits via the `internal-llm` lane (base URL
  `https://ai-gateway.vercel.sh/v1`).
- **Vercel AI Accelerator** — **$6M** credit pool (Vercel + v0 + AWS + AI platforms).
- **v0** ($5/mo free) — UI generation for customer surfaces; **Speed Insights** — perf.

## 4. GitHub for Startups (was under-covered)
- **$10K flexible credits** (Enterprise, **Copilot**, Advanced Security, Actions) + **50K
  Actions minutes**. Needs a partner affiliation + outside funding (≤ Series B). Even
  absent that, Copilot Pro + free Actions minutes are immediate.

## 5. Accelerators — the multiplier that unlocks Portfolio tiers
YC, Techstars, 500 Global, On Deck, a16z START, gener8tor, etc. A partner/VC **referral
code** is the single biggest multiplier: it lifts AWS Activate ($1K→$100K), Azure
Founders Hub (→$150K), Anthropic ($5K→$25K+), and Vercel/GitHub to their top tiers.
**Action:** join one accelerator/partner network to unlock the high tiers across ALL
programs at once.

## 6. More compute / inference lanes (fit via the universal lane or free tiers)
| Provider | Free/credit | Fit |
|---|---|---|
| **Groq** | free tier, fastest inference | OpenAI-compat → `internal-llm` |
| **Together / Fireworks / OpenRouter** | free credits | OpenAI-compat → `internal-llm` |
| **Modal** | ~$30/mo free compute | GPU jobs (edge-lab training/backtests) |
| **Replicate / Fal / Baseten** | pay-per-use, credits | model hosting |
| **Hugging Face** | free Inference tier | prototyping |
| **NVIDIA NIM** (via Inception) | free endpoints | prototyping |

## 7. Voice / media — podcast, social, content (was missing)
- **ElevenLabs** (startup credits), Play.ht, Descript — TTS/voice for the podcast + audio.
- **Higgsfield** (MCP connected this session) — social/promo video generation.
- **Figma** (MCP connected) — design system → code for the customer surfaces (#8 UX task).
- OpenAI TTS (via Azure OpenAI credits).

## 8. Incorporation — the gate for the biggest programs (was missing)
Several top programs (NVIDIA Inception, some Azure/GitHub tiers) require an incorporated
entity. **Stripe Atlas** (we already use Stripe), Firstbase, Clerky, or Doola incorporate
in days and unlock those gates. High-leverage first step if not already incorporated.

## 9. Auth / search / edge / DNS (rounding out the surface)
- **Clerk / WorkOS** — startup-free auth (we use NextAuth+Google; optional upgrade).
- **Algolia** (startup free) / **Meilisearch** (OSS) / **Typesense** — search over
  players/games/journal.
- **Cloudflare** — DNS + registrar at cost, WAF/DDoS/Turnstile free, R2 $0-egress.
- **Bunny.net** — cheap CDN alternative.

---

## Priority sequence (unlocks the most, fastest)
1. **Incorporate** (Stripe Atlas) if not already → unlocks the gated programs.
2. **Join one accelerator/partner network** → referral code multiplies EVERY tier.
3. **Claude for Startups** + **AWS Activate** + **Azure Founders Hub** + **NVIDIA
   Inception** applications (stack them).
4. **Vercel for Startups** + **GitHub for Startups** (host + dev tooling free).
5. Env-flip the AI bill onto credits (Bedrock/Vertex/Vercel AI Gateway — code-ready).
6. Turn on **prompt caching** everywhere (free code-side cost cut) + **PostHog** (analytics
   gap) + **Cloudflare** (R2/Turnstile/analytics) + the **SES/OneSignal** alert channel.

## Sources
- Claude for Startups: https://claude.com/programs/startups
- Vercel for Startups / AI Gateway / AI Accelerator: https://vercel.com/startups/credits , https://vercel.com/docs/ai-gateway/pricing , https://vercel.com/blog/the-vercel-ai-accelerator-is-back-with-6-million-in-credits
- GitHub for Startups: https://github.com/enterprise/startups
- (Azure Founders Hub, NVIDIA Inception, Cloudflare, PostHog, sports data: see LEVERAGE_ATLAS.md)
