# CONSOLIDATION AUDIT — kill redundant spend with what's already included (2026-09-28)

**Thesis:** the "way more value" isn't trimming the Neon/Vercel bills — it's the services Garrett pays for (or will pay for) that Neon Launch + Vercel Pro **already include**. Every item below: current state with repo evidence, the included replacement, difficulty, what breaks, reversibility. Untested replacements are **queued for evaluation**, never dismissed.

Repo: Beexly/Sports @ motif/orchestration-v4-2026-09-28. Evidence via package.json + code search + docs/ops/CREDENTIALS_CHECKLIST.md.

---

## Service map (what the operation actually touches)

| # | Service | Current state (evidence) | Paid? |
|---|---|---|---|
| 1 | Vercel Pro | Hosting, 23 crons, team "PickPilot's projects" | Yes — $20/mo + usage |
| 2 | Neon | Postgres SoT (gse-postgres); tier UNCONFIRMED (his screenshot was Vercel's) | Yes — tier unknown |
| 3 | OpenRouter | Fleet LLM router (Minis app; docs/ops fleet docs reference it) | Yes — 5.5% Stripe deposit fee |
| 4 | NVIDIA NIM | TASK-012 kit receptionist spec; nvapi key, flaky free tier | Free tier (flaky) / paid per-token |
| 5 | Hugging Face PRO | Account Beexly, prepaid billing on file | Yes — PRO subscription |
| 6 | The Odds API | 20K credits/mo plan, enrichment-only lane | Yes — $30/mo |
| 7 | Stripe | Billing wired (apps/web/lib/stripe.ts, webhook handlers, price seeds) | Yes — processing fees |
| 8 | Resend | Waitlist + settlement-alert emails (2 routes) | Free tier (3k/mo) — watch volume |
| 9 | Sentry | @sentry/nextjs wired, **DSN-optional** ("not wired" when absent) | Unknown — may be $0 |
| 10 | next-auth v5 | Google OAuth + Prisma adapter on Neon (apps/web/lib/auth.ts) | $0 (self-hosted) |
| 11 | Cloudflare Web Analytics + Microsoft Clarity | Beacon tokens in credentials checklist | $0 (both free) |
| 12 | Upstash Redis | **NOT provisioned** ("path-ready until set", founder-if-needed) | $0 |
| 13 | web-push | Push notifications, self-hosted lib | $0 |
| 14 | Direct LLM keys | Groq, Anthropic, xAI, Gemini (credentials checklist) | Usage-based |

No evidence of: PostHog, Clerk/Auth0, Pinecone/Algolia/weaviate, Datadog/Better Uptime, LaunchDarkly, Vercel KV/Edge Config, SendGrid, Twilio.

---

## Consolidation findings (ranked by dollars killed)

### C1. FOUR LLM routers → one primary + one fallback (biggest structural win)
- **Now:** OpenRouter (5.5% deposit fee) + NIM (flaky free) + direct provider keys + two unevaluated gateways (Vercel AI Gateway, Neon AI Gateway). The fleet pays a funding tax and has zero per-key budgets.
- **Included replacement:** **Vercel AI Gateway** — zero markup over provider list, **per-key budgets at 4 scopes** (team/project/key/user, CLI-managed), built-in ordered fallbacks, OIDC on Vercel (no secrets), 360+ models, OpenAI-compatible endpoint callable from any infra. Some models auto-priced below list.
- **Neon AI Gateway** also exists (Databricks FM passthrough, no markup, prepaid credits 12-mo expiry) — but Vercel's per-key budgets are the operational edge OpenRouter lacks. Evaluate both; standardize on ONE.
- **What breaks:** base-URL swaps in fleet configs; the 5.5% OpenRouter fee is sunk on past deposits; per-request ZDR/training-data defaults must be set explicitly (Vercel assumes providers train unless disallow-prompt-training/ZDR is set).
- **Difficulty:** config + small code. **Reversible:** yes.
- **Action:** pilot one budget-capped Vercel AI Gateway key on one agent lane for a month vs OpenRouter; keep one fallback router. **Queued for evaluation.**

### C2. Hugging Face PRO — audit what it's actually buying
- **Now:** PRO with prepaid billing. Known uses: ZeroGPU experiments (OmniVoice, TTS — research-only), Inference Providers. Round-2 finding: ZeroGPU free quota is too small for fleet inference and paid overflow is far pricier than API inference.
- **Consolidation angle:** if LLM routing moves to Vercel AI Gateway (C1) and embeddings run via the gated bge-m3/Qwen3 tests, what remains that needs PRO? Higher rate limits, ZeroGPU quota, Inference Providers credits.
- **What breaks if downgraded:** ZeroGPU access for experiments; inference-provider routing.
- **Difficulty:** founder decision. **Reversible:** yes (resubscribe).
- **Action:** list PRO features actually used in the last 90 days vs the PRO price; if it's only ZeroGPU tinkering, that's a downgrade candidate. **Queued for evaluation — do not cancel blind.**

### C3. Sentry → Vercel native observability (if Sentry is paid)
- **Now:** @sentry/nextjs in deps, but initialization no-ops without a DSN. Unknown whether prod has a DSN / paid tier.
- **Included replacement:** Vercel usage dashboard + runtime logs (1hr) + tracing spans (1M/mo beta) included; Observability Plus at $1.20/1M events (no base fee) if deeper tracing is needed.
- **What breaks:** Sentry's issue-grouping UX; source maps were already deliberately skipped, so fidelity loss is small.
- **Difficulty:** config (remove DSN / uninstall). **Reversible:** yes.
- **Action:** founder check — is SENTRY_DSN set in prod and on what tier? If paid: kill it. If free tier: keep, $0. If unset: uninstall the dep (dead weight).

### C4. next-auth v5 (beta, self-hosted) → Neon Auth (managed Better Auth) — operational, not dollars
- **Now:** next-auth ^5.0.0-beta.22 + @auth/prisma-adapter, Google OAuth, Neon-backed. Costs $0 already — **no dollar savings here.**
- **Included replacement:** Neon Auth — managed Better Auth, 1M MAU included on Launch, per-branch auth environments, JWKS verification for functions.
- **What breaks:** the entitlement logic, the emailVerified-from-OIDC stamping (apps/web/lib/auth.ts), Prisma adapter tables, session shape. This is a real migration with auth-shaped risk.
- **Difficulty:** medium code change. **Reversible:** painful (user sessions).
- **Verdict:** **queued for evaluation, low priority** — migrate only if next-auth v5 beta becomes a liability, not for cost.

### C5. Future vector DB → Lakebase Search (kills a bill before it exists)
- **Now:** no vector DB. bge-m3 (MIT) + Qwen3-Embedding (Apache-2.0) tests are unblocked once Garrett pastes HF_TOKEN to the coding agent.
- **Included replacement:** Lakebase Search — vector/keyword/hybrid search in Postgres itself. No Pinecone/weaviate line item, ever.
- **Difficulty:** evaluate when embeddings land. **Reversible:** yes.

### C6. Backtest artifacts (VM disk / Drive) → Neon Object Storage
- **Now:** versioned backtest/calibration datasets live on VM disk and Drive.
- **Included replacement:** Neon Object Storage — $0.023/GB-mo, **no per-operation fees**, branches with the database (files and rows stay in sync per experiment branch).
- **Difficulty:** code change (S3 client). **Reversible:** yes.

### C7. DB-heavy writers → Neon Functions (Vercel-compute savings)
- **Now:** 23 Vercel crons; the signals writer is I/O-heavy and Fluid bills memory for the entire instance lifetime including I/O waits.
- **Included replacement (Neon side):** Neon Functions — long-running compute next to the DB ($0.10/$0.025 per Capacity-Hour + $0.60/M invocations on Launch), module-scope `pg` pool reuse, no Vercel function involved.
- **What breaks:** moves compute off Vercel — deployment, logging, and cron-trigger wiring change.
- **Difficulty:** medium. **Reversible:** yes.
- **Verdict:** evaluate for the signals writer specifically; keep Vercel Cron as the trigger plane until measured. **Queued for evaluation.**

### C8. Redis — do NOT buy Upstash until Postgres proves insufficient
- **Now:** Upstash Redis is "path-ready until set" — **$0 today, and it should stay that way.** ioredis is a root devDep; the LLM response-cache module is deliberately store-agnostic (Redis, LRU, or in-memory).
- **No Neon/Vercel-native Redis exists** (Vercel KV is Upstash-powered; also paid). If a shared cache becomes necessary, the honest options are Upstash (paid) or a Postgres-backed cache table on Neon (already-paid compute/storage, transactional, branch-aware).
- **Verdict:** keep $0. Revisit only with measured cache-miss pain.

---

## Honest gaps — NO native replacement exists

| Need | Current | Verdict |
|---|---|---|
| Email delivery | Resend (free 3k/mo) | No Neon/Vercel equivalent. Watch volume; upgrade Resend only when the free tier binds. |
| Payments | Stripe (processing fees) | No replacement — fees are the cost of getting paid. |
| Odds data | The Odds API ($30/mo) | Data, not infra — nothing native replaces it. Enrichment-only by design. |
| Push | web-push lib (self-hosted) | $0 already. Fine. |

## Do NOT "consolidate" these (traps)

- **Vercel Web Analytics on Pro has NO included events ($0.03/1K)** — Cloudflare Web Analytics + Clarity are free and already wired. Switching would CREATE spend.
- **Neon read replicas** bill their own CU-hours — they add compute, not remove it.
- **Neon Scale plan** is 2.1× the compute rate for compliance features this workload doesn't need.

## Duplicate-spend watchlist

1. **4 LLM routers** (OpenRouter / NIM / direct keys / 2 unevaluated gateways) → C1.
2. **Sentry + Vercel observability** overlap → C3 (check DSN/tier first).
3. **Cloudflare Analytics + Clarity** — both free; not duplication that costs money. Leave alone.

## Suggested order

1. Founder taps (10 min): Neon console — plan tier + burn (Finding 0 of the Neon audit); is SENTRY_DSN set in prod, what tier?
2. C1 pilot: one budget-capped Vercel AI Gateway key, one agent lane, one month, vs OpenRouter.
3. C2: HF PRO usage-vs-price audit.
4. C3: resolve Sentry (kill if paid / uninstall if unset / keep if free).
5. C6: move backtest artifacts to Neon Object Storage.
6. C7: evaluate Neon Functions for the signals writer.
7. C5: Lakebase Search when embeddings land. C4/C8: only on measured pain.
