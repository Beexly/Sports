# GSE Credits, Programs & Partnerships — Action Pack v3

**2026-07-31** · Supersedes v2 (2026-07-30 11:45).  
v2 traps and copy corrections still stand. This re-sequences by leverage and records **verified plumbing**.

**Agent law:** Applications, ToS, and account creation are **founder-only**. Agent wires env + smoke when keys land. Never claim a program or invent a green.

---

## 0. Verified plumbing (main) — activation is env-only

Confirmed on main this session:

| Area | Path |
|------|------|
| Providers | `apps/web/lib/claude-api/providers/` — bedrock + aws-sigv4, vertex + google-oauth, cerebras (+ tests) |
| Credit OS | `credit-pool.ts` + store, `model-router.ts`, `provider-dispatch.ts`, `cost-monitor.ts`, `model-economics.ts`, `usage-store.ts`, `budget-store.ts`, `free-lane.ts`, `internal-llm.ts`, `dashboard.ts` |
| Partner OS | `docs/revenue/` — 10 docs (FTC, RG partner policy, offer compliance, outreach, target-list template, …) |
| Affiliate ledger | `apps/web/lib/affiliate/ledger.ts` |

**Meaning:** every credit you win is spendable the day it lands. Bottleneck = applications (mostly founder-gated).

### Env surfaces (wire targets)

| Purpose | Env | Notes |
|---------|-----|--------|
| Free content lane | `CONTENT_FREE_LANE_ENABLED=true` + `CEREBRAS_API_KEY` | `free-lane.ts` |
| Internal LLM (Groq/Ollama) | `INTERNAL_LLM_*` | Already in `.env.example` |
| Claude → Bedrock | `CLAUDE_PROVIDER=bedrock` + AWS + `BEDROCK_MODEL_MAP` | InvokeModel only for credit eligibility |
| Claude → Vertex | `CLAUDE_PROVIDER=vertex` + GCP + `VERTEX_MODEL_MAP` | Partner credit path |
| Clarity / CF analytics | `NEXT_PUBLIC_ANALYTICS_ENABLED` + tokens | OP-004 gated; PR #260 optional npm bridge |

---

## 1. Keystone — `founder@galaxysportsedge.com` (~5 min)

Unblocks soft/hard requirements: Microsoft Founders Hub · HubSpot · NVIDIA Inception · GitHub for Startups · Notion · Linear.

**Order-of-operations trap (live):** Google for Startups **31-day rule** — no paid Google Workspace on the domain within 31 days of applying, or credits can be forfeited. If Google application is recent/pending → use **Zoho free** (or non-Workspace) for `founder@`, not paid Workspace. Verify application date first.

---

## 2. Programs v2 missed — you already run the services

| Program | Typical value | Self-serve? | GSE why |
|---------|---------------|-------------|---------|
| GitHub for Startups | Enterprise free, 20 seats, 12 mo | Partner-referral usually | Private repo Actions minutes cap is real |
| NVIDIA Inception | Free; GPU/DGX credits | Yes | KIE/CRC GPU path; highest value-per-minute |
| PostHog for Startups | ~$50k + free tier | Yes | Live org; <$5M raised + <2yr |
| Cloudflare for Startups | Up to ~$250k hist. | Partner-gated | Workers/KV/R2/D1 — not Web Analytics (already free) |
| HubSpot for Startups | Up to 90% yr 1 | Partner-pref | Only if you run CRM |
| Notion / Linear | Small | Yes | Low friction |
| Sentry / QuickNode / Railway / Supabase | Varies | Mixed | Claim only if you'll spend |
| Modal / RunPod | $25k-class | Yes | KIE GPU alt to Azure |
| Hugging Face | Community GPU | Yes | KIE model-zoo export |

**Anti-pattern:** unused claim burns a once-ever slot (Stripe/Vercel trap).

---

## 3. KIE update — Azure calculus changed

v2: Founders Hub only if you'll burn Azure (not Claude).  
**Now:** KIE plan names Founders Hub Azure **GPU** (not Claude) + Modal/RunPod. Founders Hub moves up **for KIE GPU only**.

Claude-on-Azure remains **not** credit-eligible. Free-first before claim slot: NVIDIA Inception + Modal/RunPod + HF for KIE Phase 0/1.

---

## 4. Meta-play — accelerator affiliation

Self-serve vs portfolio tiers (AWS/Google/Azure/CF/GitHub) often need **partner/accelerator affiliation**, not company quality. One affiliation multiplies every row. Worth ~1 hour evaluate.

---

## 5. Claim-order traps (do not violate)

| Program | Trap |
|---------|------|
| Datadog | Claim via program **before** organic trial; once |
| Stripe | **One** lifetime offer — save for Activate fee credit at payments go-live |
| Vercel | ~$1.2k Activate path may consume larger Vercel-for-Startups slot — confirm terms |
| Google | 31-day Workspace · yr-2 ~20% · anti-stacking · Ads 2× match timed to launch |
| AWS | Credits expire 12–24 mo; Founders → Portfolio/GenAI sequential, never parallel |
| Amplitude vs Mixpanel | Pick one; you already run PostHog — don't triple analytics |
| Claude | Stay on **Bedrock InvokeModel** for eligibility; Marketplace/Claude-Platform-on-AWS and Azure Claude **not** eligible |

---

## 6. Click-queue — (value × probability) ÷ minutes

### Zero-application free capacity

1. **Cerebras key** → `CEREBRAS_API_KEY` + `CONTENT_FREE_LANE_ENABLED=true` (adapter on main)  
2. **Groq** → `INTERNAL_LLM_API_KEY` (paths already default to Groq URL/model)  
3. **OpenRouter** free models (optional $10 top-up)

### Today highest leverage

4. **`founder@` email** (§1)  
5. **NVIDIA Inception** — free, self-serve, KIE GPU  
6. **Anthropic Claude for Startups** — match **reality**: free-first multi-source spine; “gated public track record,” **never** “public track record page” (gates are OFF)  
7. **AWS Activate tier confirm** → Bedrock model access → exact model ids → IAM `bedrock:InvokeModel` only → hand agent region + ids for staging smoke  

### This week

8. PostHog for Startups · Neon Startup · Microsoft Founders Hub (KIE GPU; corporate email) · Google AE email for $10k Vertex (vertex.ts exists)  
9. Evaluate one accelerator/partner affiliation  

### Decide, don't drift

- **Odds API:** leave deactivated for free spine **or** use free tier only — B-11 CLV via `CLOSING_ODDS_API_KEY` ≈100/mo of 500 free — **no paid reactivation required**  
- Sportsbook CPA: **HARD_REFUSE forever** (`docs/revenue/`)

---

## 7. Affiliate / partnerships — framework exists

Use `docs/revenue/PARTNER_TARGET_LIST_TEMPLATE.md` + 8-step flow. Non-gambling only. FTC disclosure required. No live Content Affiliate links without flow.

---

## 8. Agent handshake — “hand me X”

| You hand | Agent does |
|----------|------------|
| `CEREBRAS_API_KEY` (path/secret ref) | Env surface + free-lane smoke + ledger visibility |
| Groq key | `INTERNAL_LLM_API_KEY` + smoke |
| AWS region + Bedrock model ids | `CLAUDE_PROVIDER=bedrock` staging + smoke; verify ledger shows Bedrock ids |
| Vertex grant | `CLAUDE_PROVIDER=vertex` + maps + smoke |
| Program acceptance notice | Env activation only (adapters exist) |
| Partner candidate names | Draft through `docs/revenue/` flow — never publish |

**Agent cannot:** create accounts, submit applications, accept ToS.

---

## Related estate PRs (not this pack)

| PR | Topic |
|----|--------|
| #258 | APEX + public brand A-8 — founder YES |
| #261 | Omnibus A-1 trademarks |
| #260 | Clarity npm bridge |
| #263 | UQ Mondrian/EIG leverage (research) |

---

## Supersession

- **v3** = this file  
- v2 traps/copy still valid  
- Cloud credits strategy companion: `docs/ops/CLOUD_CREDITS_MAXIMIZATION_STRATEGY_2026-07-08.md` (if present)
