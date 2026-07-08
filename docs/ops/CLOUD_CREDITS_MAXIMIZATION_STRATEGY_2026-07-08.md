# Cloud Credits Maximization Strategy — AWS Activate + Google for Startups

**Date:** 2026-07-08
**Author:** Executive-director autonomous pass (branch `claude/nfl-pbp-expected-metrics-xb069r`)
**Status:** Strategy + shipped scaffolding. No live cloud spend enabled by this doc.
**Context:** Founder just enrolled in the AWS and Google developer/credit programs. Goal:
extract the maximum runway-extending value from those credits **without** compromising
quality, integrity, or the non-negotiable rules in `CLAUDE.md`.

---

## TL;DR — the one decision that matters

> **Route Claude through AWS Bedrock; run infrastructure and the non-user-facing
> "free lane" on Google.**

- Our **single largest variable cost is LLM inference** (Anthropic API). Claude on **AWS
  Bedrock is the identical model at identical pricing**, but the spend is **billable to AWS
  Activate GenAI credits** (that tier explicitly covers Bedrock). So the biggest cash line
  can be paid with credits → direct runway extension.
- **Google for Startups credits do NOT cover third-party models** (Anthropic) — with one
  verified exception: a separate **$10k Anthropic partner-model credit** on Vertex (request
  via your Google AE). The general pool covers Google infra (Cloud Run, Cloud SQL, BigQuery,
  Memorystore) and **Gemini/Gemma**. So Google credits are best spent on **infrastructure**
  + a **Gemini "free lane"** for non-user-facing drafting, with the $10k as a small Claude
  top-up — the primary Claude offset stays AWS Bedrock.
- This is not either/or. **AWS pays the AI bill; Google pays the infra bill.** Both extend
  runway on different cost centers simultaneously.

**Shipped in this pass (inert, tested, zero behavior change until an operator flips it):**
a full AWS Bedrock provider behind the existing `claude-api` seam — so the credits play is
*already wired*, pending only credential approval and an in-console model-id confirmation.

---

## Our real cost centers (what the credits actually offset)

| Cost center | Today | Credit that offsets it | How |
|---|---|---|---|
| **LLM inference (Claude)** — content, studio, journal, model-court, explainers, autopsy | Anthropic API (cash) | **AWS Activate GenAI** | Bedrock InvokeModel, SigV4-signed (shipped) |
| **Non-user-facing LLM** — classify / normalize / dedup / draft | Groq/Cerebras free or cash | **Google (Gemini)** or free tiers | `internal-llm.ts` seam is OpenAI-compatible; Gemini drops in with **no new code** |
| **Compute / SSR / workers** | Vercel + 4 workers | **Google** (Cloud Run) or **AWS** (App Runner/ECS) | infra credits |
| **Postgres** | Neon | **Google** (Cloud SQL) or **AWS** (RDS/Aurora Serverless v2) | infra credits |
| **Redis (BullMQ)** | ioredis | **Google** (Memorystore) or **AWS** (ElastiCache) | infra credits |
| **Analytics / model-fit at scale** (nflverse PBP, calibration) | in-process | **Google (BigQuery)** or **AWS (Athena)** | pennies of credit, big headroom |

**Principle:** don't migrate what already works cheaply just to "use credits." Migrate where
credits offset a **real, growing** bill (LLM inference first) or unlock **capability we can't
afford in cash** (large-scale historical PBP analytics). Everything else stays put.

---

## Program facts that shaped the strategy (verified 2026-07)

- **AWS Activate** tiers: Founders (~$1k), Portfolio ($25k–$100k via an affiliated
  accelerator/VC), and a **GenAI tier (up to $300k)** that explicitly covers **Bedrock /
  SageMaker / Trainium**. Claude is a first-class Bedrock model.
- **Google for Startups Cloud**: AI-first startups up to **$250k year-1 / $350k over 2 yrs**
  (requires meaningful Gemini usage); non-AI track up to $200k. **Critical nuance:**
  third-party models (Anthropic) are billed directly and are **not** covered by program
  credits — only Google's own models/infra are.
- **Claude pricing parity:** Claude on Bedrock and on Google Vertex is priced identically to
  the direct Anthropic API. **Batch = up to 50% off**; **prompt caching = up to 90% off**
  cached input. These stack with credits — do both.

**Why Bedrock over Vertex for Claude:** both host Claude at parity, but **AWS credits cover
Claude spend and Google credits do not.** So Claude → Bedrock (AWS credits), and Google
credits go to infra + Gemini. Vertex-for-Claude is only interesting if AWS credits run out.

---

## What was shipped in this pass (and how to turn it on)

All additions live behind the existing `claude-api` provider seam and are **inert by
default** — the same "introduce inert, flip deliberately" doctrine as `model-router.ts`,
`free-lane.ts`, and `internal-llm.ts`. With no env set, every Claude call is byte-identical
to today (direct Anthropic API).

| File | Role |
|---|---|
| `apps/web/lib/claude-api/providers/aws-sigv4.ts` | Zero-dependency SigV4 signer (Node `crypto`). Correctness pinned to AWS's official `get-vanilla` known-answer vector. |
| `apps/web/lib/claude-api/providers/bedrock.ts` | Bedrock `InvokeModel` adapter. Returns the identical `ClaudeMessagesResult` shape, so all downstream governance (claim/brand scanners, cost + usage ledger) runs unchanged. |
| `apps/web/lib/claude-api/provider-dispatch.ts` | `callClaude()` — drop-in for `callClaudeMessages()` that routes to Bedrock when selected, else Anthropic. Falls back to Anthropic on **any** Bedrock error. |

**Guardrails baked in:**
- **No fabricated model ids.** Bedrock ids are account/region-specific; the adapter refuses
  to guess and requires a `BEDROCK_MODEL_MAP` of ids **you confirm in the Bedrock console**.
  An unmapped model falls back to Anthropic rather than inventing an id. (Honors
  `CLAUDE.md`: no fake data.)
- **Observability against silent fallback.** A Bedrock result carries the Bedrock model id
  as `modelName`, so the cost/usage ledger *proves* whether spend hit credits. If a
  misconfiguration silently falls back to Anthropic, the ledger shows an Anthropic id — you
  will see it, not discover it on a credit-card statement.
- **Reliability never regresses.** Config error or runtime API error → transparent fallback
  to the direct Anthropic API.

### Activation runbook (when AWS Activate GenAI credits are approved)

1. In the **Bedrock console** (target region, e.g. `us-east-1`): request **model access** for
   the Claude models you use; copy their exact **model ids**.
2. Create an **IAM principal** scoped to `bedrock:InvokeModel` only (least privilege). Prefer
   short-lived STS creds (the adapter supports `AWS_SESSION_TOKEN`).
3. Set env (staging first): `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_BEDROCK_REGION`,
   and `BEDROCK_MODEL_MAP={"claude-sonnet-4-6":"<verified id>", ...}`. **Do NOT set
   `CLAUDE_PROVIDER` yet.**
4. **Staging smoke test:** flip `CLAUDE_PROVIDER=bedrock` in staging only; generate one draft
   per surface; assert each response's recorded `modelName` is a **Bedrock** id (proves
   credits are actually being used and no silent fallback occurred).
5. Adopt per surface: swap `callClaudeMessages(req)` → `callClaude(req)` at call sites,
   lowest-stakes first (`brief`, `calibration-insight`), validating output parity each step —
   exactly the deliberate flip pattern `model-router.ts` documents. Quality-/trust-sensitive
   surfaces last.
6. Layer the discounts — **with eyes open on caching**: move batchable content generation to
   **Batch** for up to 50% additional savings **on top of** credits. Prompt caching
   (`cache: { system: true }`, supported on both providers) is currently a **silent no-op**
   here: a `cache_control` block only engages when the cached prefix meets the model's
   minimum (≈2048 tokens on Sonnet 4.6), and every one of our 7 surfaces' system prompts is
   far below that (largest ≈650 tokens; verified 2026-07-08). It becomes a real 90%-off
   lever only if a surface's static system prompt grows past the floor AND is hit repeatedly
   within the 5-minute TTL — don't book savings from it before then.

### Google side (no code required to start)

- **Gemini free lane, today, zero new code:** the `internal-llm.ts` seam is OpenAI-compatible.
  Point it at Gemini for non-user-facing drafting and pay it with Google credits:
  `INTERNAL_LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai`,
  `INTERNAL_LLM_MODEL=gemini-2.0-flash`, `INTERNAL_LLM_API_KEY=<AI Studio key>`. Never for
  user-facing content (`CLAUDE.md`: facts-backed, quality-gated).
- **Infra:** stand up Cloud SQL (Postgres) / Memorystore (Redis) / Cloud Run only if/when a
  bill is actually growing; keep Neon+Vercel while they're cheap and fast. BigQuery is the
  standout *capability* unlock — cheap historical nflverse PBP + calibration analytics that
  strengthen the expected-metrics IP.

---

## Governance — this does not loosen any guardrail

- **Runtime LLM routing ≠ agent AWS actions.** The `FABLE_AWS_*` gates
  (`FABLE_AWS_ALLOW_EXPERIMENTS/DEPLOY/PAID_RESOURCES`, `FABLE_AWS_MAX_MONTHLY_COST_USD`)
  govern the *agent* provisioning AWS resources; they remain **off**. Bedrock *inference
  routing* is a product-runtime concern gated separately by `CLAUDE_PROVIDER` + creds.
- **No secrets in code.** All credentials via env (`CLAUDE.md` rule #4). `.env.example`
  documents the keys with empty values only.
- **No quality compromise.** User-facing surfaces stay on Claude (via Bedrock or direct).
  The free lane (Gemini/Cerebras) remains non-user-facing / low-stakes only.
- **Cost ceiling discipline.** Set a Bedrock budget alarm and mirror the intended monthly cap
  in `FABLE_AWS_MAX_MONTHLY_COST_USD` so the governance layer's expectation matches reality.

---

## Prioritized value ladder (highest leverage first)

1. **Claude → Bedrock on AWS GenAI credits.** Biggest cash line, now paid by credits.
   *Scaffolding shipped; pending credential approval + console model-id confirmation.*
2. **Batch on top of credits.** Up to 50% off batchable generation — multiplies the credit
   runway. (Prompt caching is plumbed in but currently inert: all system prompts sit below
   the model's ~2048-token cache floor — see runbook step 6. No savings booked from it.)
3. **Gemini free lane via the existing seam** for non-user-facing drafting on Google credits.
   *Zero new code — env only.*
4. **BigQuery for historical PBP / calibration analytics.** Capability unlock that
   strengthens the expected-metrics IP; trivial credit cost.
5. **Selective infra migration (Cloud SQL / Memorystore / Cloud Run)** — only where a real
   bill is growing. Not a rip-and-replace.
6. **Keep Vercel + Neon** while cheap and fast. Credits are for offsetting real bills and
   unlocking capability, not for busywork migrations.

---

## Full benefits extraction — beyond the headline credits (verified 2026-07-08)

The programs bundle far more than compute credits. Every item below was web-verified by a
research pass (sources in the research log); claim-order matters on several.

### AWS Activate — the full set, ranked by realistic value to us

| Benefit | Value | Action |
|---|---|---|
| **Datadog for Startups** (Activate exclusive) | 1 year Datadog Pro free | **Claim BEFORE ever starting an organic Datadog trial** (existing customers ineligible). Gives us real monitoring for workers/Redis/webhooks — currently a gap. |
| **Stripe fee credit** | ~$500 in processing-fee credits (12-mo clock from activation) | Claim in the Activate console **when payments go live** (don't start the clock early). ≈ fees on ~$11k of Pro-tier volume. |
| **Amplitude Growth** | 1 year free (~$10k list) | Claim; wire pick-view → paywall → checkout funnel analytics. |
| **Support credits** | Founders: $350 Developer Support / Portfolio: up to $10k Business Support (~1 yr) | Auto-included per tier; confirm in console. Use during the Bedrock migration window. |
| **DB/infra offers** | Supabase $300, MongoDB Atlas credits, ClickHouse $400, CircleCI up to $20k | Optional hedges; nothing here beats our current Neon/Vercel setup — claim only on need. |
| **SaaS ops bundle** | Notion 6mo, Slack 30% off, Intercom 12mo free, HubSpot up to 75% off, Mercury $750 | Intercom free-year is the standout (subscriber support). |
| **GenAI Accelerator** | up to $1M credits, 8-week program (~40 startups/yr) | Long-shot application once the NGS-validated IP + track record make the pitch credible. |
| Training & Certification | **NOT credit-eligible** (explicit exclusion) | Budget cert exams as cash; use free Skill Builder courses. |

**Critical eligibility pitfall (affects our architecture directly):** Activate credits cover
Anthropic **only as Bedrock 3P model spend via `InvokeModel`/`Converse`** — the exact API our
shipped adapter uses. They do **NOT** cover Claude-Platform-on-AWS (which bills through AWS
Marketplace) nor general Marketplace SaaS purchases. Do not "upgrade" the integration to
Claude Platform on AWS while credits remain — it would silently move the spend off-credit.
Other exclusions: Mechanical Turk, ProServe, Training. Credits expire ~12–24 months by
package (console shows the exact date; 60/30-day warning emails). Re-applying only grants
the **difference** up to the larger package — sequence Founders → Portfolio (within 12
months of a raise) deliberately.

### Google for Startups — full set (verified 2026-07-08)

| Benefit | Value | Action |
|---|---|---|
| **Anthropic partner-model credit (Vertex Model Garden)** | **$10,000** | Scale/Scale-AI tier only, **not automatic — request via your Google Cloud Account Executive.** This is the ONLY Google pool that touches our Claude bill: route Claude through Vertex (`us.anthropic.*`) to burn it. Small vs AWS Bedrock's up-to-$300k, so it's a **top-up**, not the primary. |
| **Enhanced Support** | up to **$12k / 1 yr** free | Turn on for year 1 (1-hr critical response). Downgrade before it lapses — support bills on *gross* (pre-credit) consumption. |
| **Redis Cloud credits** | up to **$25k** | We run Redis (BullMQ). Move Memorystore/self-managed → Redis Cloud and this covers it for years. |
| **Workspace Business Plus** | free 12 mo (~$264) | Business email on our domain (also satisfies the program's domain-match requirement). **31-day trap:** don't start paid Workspace on the domain within 31 days of applying. |
| **Mixpanel** | 1 year free | Funnel/paywall/replay analytics for conversion — pairs with (or substitutes for) AWS's Amplitude offer; pick one. |
| **Datadog Pro** | 1 year free (★ Scale form) | Same offer exists on both programs — claim once, before any organic trial. |
| **Google Ads 2× match** (separate public promo, NOT credits) | spend $500 → $1,000 (up to $1,400→$2,800) | **The acquisition lever.** New-advertiser only, <14-day account, ~35-day verification, 60-day spend window — **time it to launch week** on sports-picks keywords. |
| Maps credits ($600/mo), Skills ($500) | — | Near-zero for us; skip Maps. |
| AI-tier non-cash: AI experts, Startup School, Gemini API Sprints | — | Join Startup School / Sprints now; accelerator (AI-First NA, equity-free, free TPU) once we have traction. |

**Google's exact third-party-model constraint** (benefits footnote 5 / partner-models PDF):
Gemini, Gemma, and **open-weight** models on Vertex burn program credits; Vertex (Google
models) and Firebase count toward the $200k/$350k pool. **Anthropic/Mistral/AI21 on Vertex
bill cash** — except the separate $10k partner credit above. Credits also do **not** cover
Workspace, Maps, Ads, or Marketplace. Year 2 covers only 20% of usage (up to $100k) — plan
the heavy-spend work for year 1. One-incentive/anti-stacking rule: joining other Google
Cloud promos can forfeit remaining credits.

**Seam readiness:** the `callClaude` dispatcher shipped this session makes a **Vertex Claude
provider** a drop-in sibling to the Bedrock one (add a `providers/vertex.ts` returning the
same `ClaudeMessagesResult`; Vertex uses a service-account OAuth2 bearer instead of SigV4).
Worth building only after the $10k AE credit is confirmed — otherwise Bedrock alone captures
the far larger AWS pool. Gemini for the non-user-facing lane needs **no new code** (existing
OpenAI-compatible `internal-llm` seam) and can start on the always-free AI Studio tier before
touching credits at all.

## Open items / founder actions

- [ ] Confirm which AWS Activate tier was granted (Founders vs Portfolio vs GenAI) — the
      GenAI tier is the one that unlocks the Bedrock play at scale.
- [ ] Request Bedrock model access + capture verified model ids for `BEDROCK_MODEL_MAP`.
- [ ] Confirm Google credit amount/track and generate an AI Studio (Gemini) key.
- [ ] Decide the monthly Bedrock cost cap; set the budget alarm + mirror in FABLE.
- [ ] Run the staging smoke test before flipping any production surface.
- [ ] **Claim order (console):** Datadog year-free FIRST (before any organic trial) →
      Amplitude year-free → Intercom year-free → hold the Stripe $500 fee credit until
      payments go live (12-mo clock starts at activation).
- [ ] Keep ALL Claude spend on Bedrock InvokeModel while credits last — never Claude
      Platform on AWS / Marketplace billing (not credit-eligible).
