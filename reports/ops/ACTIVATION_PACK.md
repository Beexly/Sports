# Activation Pack — everything human-gated, driven to "paste and go"

**Purpose:** the three leverage docs (CLOUD_CREDIT_LEVERAGE_STRATEGY, LEVERAGE_ATLAS,
ADDENDUM) mapped everything. This pack is the EXECUTION layer: paste-ready
application answers, exact console steps, and the env-flip values — so a co-work
Claude session on the founder's computer can drive every step with the founder only
doing logins. All repo-side code is DONE; nothing below changes code.

---

## 0. Reusable company narrative (paste into any application)

> **Company:** Galaxy Sports Edge (galaxysportsedge.com) — a verifiable sports-
> prediction platform. Every pick is committed to a tamper-evident, hash-chained
> receipt BEFORE kickoff; the record is judged by closing-line value and settled
> results, and anyone (human or AI agent) can independently verify it via our
> public Proof API (/llms.txt → /api/proof/*), including recomputing our hashes
> from published conformance test vectors.
>
> **Original ML (not an LLM wrapper):** our edge engine is proprietary — an as-of
> feature store with runtime lookahead guards, purged walk-forward validation, a
> registered-trials ledger with false-discovery-rate control, conformal/Venn-Abers
> calibration, and gradient-boosted market-residual models. GPU/compute credits go
> to training and walk-forward backtesting of THESE models.
>
> **Where LLMs fit:** Claude generates data-backed content (explainers, loss
> autopsies, research journal) from our engine's outputs — the LLM is never the
> source of truth for predictions.
>
> **Stack:** Next.js/TypeScript on Vercel, Postgres (Prisma), Redis, Stripe
> subscriptions. Stage: pre-revenue/early-revenue, bootstrapped, solo founder.

Short taglines when a form wants one line:
- "A sports-prediction platform with a cryptographically verifiable track record."
- "Publish-before-kickoff, hash-chained picks — the first record an AI agent can audit."

---

## 1. Execution order (dependencies honored)

| # | Step | Why this order |
|---|---|---|
| 0 | (If not incorporated) Stripe Atlas | Gates NVIDIA Inception + top Azure/GitHub tiers |
| 1 | AWS Budgets hard cap + alert | MUST precede any Bedrock routing (silent credit depletion) |
| 2 | AWS Activate Founders ($1K + $350) | Self-serve, no VC; 7–10 day review |
| 3 | Bedrock model access + preview env-flip | Moves the AI bill onto credits (env-only) |
| 4 | Anthropic Claude for Startups | $25K–$100K+ credits on our main bill |
| 5 | Azure Founders Hub | Up to $150K, no funding needed |
| 6 | NVIDIA Inception | Free; $100K DGX; unlocks AWS AI-tier path |
| 7 | Vercel for Startups + AI Gateway | Our host; $5/mo free AI credits immediately |
| 8 | Cloudflare account (R2/Turnstile/Web Analytics) | Free; keys enable 3 wired-ready integrations |
| 9 | PostHog (+ startup program) | Fills the zero-analytics gap; $50K credits |
| 10 | SES identity + sandbox exit | Enables the Elite/watchlist alert channel wire |
| 11 | Google Dev Program + Search Console | Vertex lane + submit /news-sitemap.xml |
| 12 | GitHub for Startups | Needs a partner affiliation — do after any accelerator |

---

## 2. Per-step console details

### Step 1 — AWS Budgets cap (before anything else on AWS)
Console → Billing → Budgets → Create budget → Cost budget, monthly, amount = your
comfort ceiling (e.g. $50 while on credits), alert at 50/80/100% to your email. Note:
Bedrock Marketplace spend does NOT trigger Cost Anomaly Detection — this budget is
the only tripwire.

### Step 2 — AWS Activate Founders
aws.amazon.com/startups → Apply (Founders tier). Use §0 narrative. Answers: <10
employees; <$1M raised/revenue; no VC/accelerator affiliation; no prior Activate.

### Step 3 — Bedrock env-flip (env-only; code is DONE)
1. Console → Bedrock → Model access → enable Anthropic Claude for the chosen region
   (e.g. us-east-1). Copy the EXACT model id from the model catalog.
2. IAM → user `gse-bedrock-invoke` with least-privilege `bedrock:InvokeModel`;
   create access key.
3. Vercel → Project → Settings → Environment Variables, **Preview scope first**:
   `CLAUDE_PROVIDER=bedrock`, `AWS_BEDROCK_REGION=<region>`,
   `AWS_ACCESS_KEY_ID=…`, `AWS_SECRET_ACCESS_KEY=…`,
   `BEDROCK_MODEL_MAP={"<our-anthropic-model-id>":"<exact-bedrock-model-id>"}`
   (never guess the Bedrock id — the map throws on unmapped ids by design).
4. Redeploy preview → trigger one content generation → confirm output + that the
   call hit Bedrock (CloudWatch/Bedrock metrics) → then copy the vars to Production.
   MODEL_VERSION is unchanged (same model, different provider). Any provider error
   transparently falls back to direct Anthropic — zero downtime risk.

### Step 4 — Claude for Startups
claude.com/programs/startups → short form (needs a Claude **Console** account,
company email, website, what we build — §0 narrative). Mention no VC unless one
exists; 2–4 week review; credits valid 12 months.

### Step 5 — Azure Founders Hub
microsoft.com/en-us/startups → sign up (Microsoft account) → business verification →
self-serve tier ($1–5K) immediately; progressive unlocks toward $150K. Use §0.

### Step 6 — NVIDIA Inception
nvidia.com/en-us/startups → apply (needs incorporated entity, working website, ≥1
developer, <10 yrs). Emphasize the ORIGINAL-ML paragraph of §0 (GPU story =
walk-forward backtests + GBM training). Free NIM endpoints usable immediately after
acceptance; DGX credits by request via the portal.

### Step 7 — Vercel for Startups + AI Gateway
vercel.com/startups/credits → apply (12+ mo free Pro + credits). AI Gateway: enable
in the dashboard — $5/mo free credits start with the first request. Optional lane
test (Preview env): `INTERNAL_LLM_BASE_URL=https://ai-gateway.vercel.sh/v1`,
`INTERNAL_LLM_MODEL=<a free-tier model id>`, `INTERNAL_LLM_API_KEY=<gateway key>`.

### Step 8 — Cloudflare
dash.cloudflare.com → create account → R2 (create bucket `gse-proof-exports`; note
account id + API token), Turnstile (create widget → sitekey/secret), Web Analytics
(add site → token). Startup program application optional on top.

### Step 9 — PostHog
posthog.com → create project (US cloud) → copy project API key. Apply to PostHog
for Startups ($50K credits). Key goes to env when we wire the SDK.

### Step 10 — SES
Console → SES → verify identity (domain galaxysportsedge.com via DNS, or a sender
address) → request production access (use-case: transactional, graded pick alerts
to opted-in subscribers, low volume) → IAM user `gse-ses-send` with `ses:SendEmail`
→ note region + creds. Then tell the build session — the alert-channel wire at
`alert-dispatch.ts:92` is a ~1-file, fully-gated drop-in.

### Step 11 — Google
developers.google.com/program (or AI Pro/Ultra sub) → credits. Search Console:
verify galaxysportsedge.com → submit BOTH `sitemap.xml` and `news-sitemap.xml`.
Vertex (optional alternative to Bedrock): enable Vertex AI + Claude in Model
Garden → service account (JSON) → the three VERTEX_* vars per .env.example.

### Step 12 — GitHub for Startups
github.com/enterprise/startups — requires a partner affiliation + outside funding
(≤ Series B). Park until an accelerator/partner referral exists (which also
multiplies AWS/Azure/Anthropic tiers — the single highest-leverage human move).

---

## 3. What is already DONE code-side (no waiting on the repo)

- Bedrock/Vertex/OpenAI-compatible routing: live-wired, tested, env-flip only
  (.env.example lines ~342–375 document every var).
- Proof surface (/llms.txt, /api/proof/*, conformance vectors) — cite it in every
  application; it is the differentiator.
- Alert-channel gate (graded-only, Elite-only, kill-switch) — awaiting SES creds.
- Google News sitemap — awaiting Search Console submission.
- Weather + body-clock edge features — body-clock backtestable now; weather awaits
  an as-of forecast loader.
- Guard discipline: budgets-first rule, model-freeze invariance, no secrets in code.
