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
- **Google for Startups credits do NOT cover third-party models** (Anthropic). They *do*
  cover Google infra (Cloud Run, Cloud SQL, BigQuery, Memorystore) and **Gemini/Gemma**.
  So Google credits are best spent on **infrastructure** + a **Gemini "free lane"** for
  non-user-facing drafting — not on our user-facing Claude surfaces.
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
6. Layer the discounts: enable **prompt caching** (`cache: { system: true }`, already
   supported on both providers) and move batchable content generation to **Batch** for up to
   50% additional savings **on top of** credits.

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
2. **Prompt caching + Batch on top of credits.** Up to 90% off cached input, 50% off batch —
   multiplies the credit runway. Caching is already supported in the adapter.
3. **Gemini free lane via the existing seam** for non-user-facing drafting on Google credits.
   *Zero new code — env only.*
4. **BigQuery for historical PBP / calibration analytics.** Capability unlock that
   strengthens the expected-metrics IP; trivial credit cost.
5. **Selective infra migration (Cloud SQL / Memorystore / Cloud Run)** — only where a real
   bill is growing. Not a rip-and-replace.
6. **Keep Vercel + Neon** while cheap and fast. Credits are for offsetting real bills and
   unlocking capability, not for busywork migrations.

---

## Open items / founder actions

- [ ] Confirm which AWS Activate tier was granted (Founders vs Portfolio vs GenAI) — the
      GenAI tier is the one that unlocks the Bedrock play at scale.
- [ ] Request Bedrock model access + capture verified model ids for `BEDROCK_MODEL_MAP`.
- [ ] Confirm Google credit amount/track and generate an AI Studio (Gemini) key.
- [ ] Decide the monthly Bedrock cost cap; set the budget alarm + mirror in FABLE.
- [ ] Run the staging smoke test before flipping any production surface.
```
