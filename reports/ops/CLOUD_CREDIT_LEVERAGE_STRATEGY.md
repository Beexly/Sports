# Cloud-Credit Leverage Strategy — Google Developer Program + AWS Developer/Activate

**Owner directive (2026-07-17):** "I am part of the Google Developer Program and
the Amazon AWS Developer Program … maximize these, use as much leverage as we can
… I know they have credits … be sure we're getting maximum value out of this area."

**Author:** Fable 5 orchestrator. **Status:** research + prioritized plan; the one
build-now item (SES email-alert adapter) ships gated/inert on
`claude/glass-ledger-edge-engine`. **Non-negotiables held:** no spend, no live
provider switch, no secrets in code — every activation below is a founder env/console
step, documented here, never auto-executed.

---

## TL;DR — the three biggest levers, in priority order

1. **AI inference on credits (P0, biggest recurring $).** Claude on **AWS Bedrock**
   and **Google Vertex** is priced *identically* to the direct Anthropic API (per
   token), so routing our content/explainer/autopsy generation through Bedrock or
   Vertex lets **cloud credits pay the AI bill at zero premium**. The provider
   adapters already exist in the repo (`apps/web/lib/claude-api/providers/aws-sigv4.ts`,
   `vertex.ts`, `google-oauth.ts`). This is a config + credential step, not new code.
2. **The alert channel on credits (P0, unlocks Elite revenue).** The Elite tier's
   "real-time email & push alerts" and the watchlist alert loop have **no channel
   wired** (`alert-dispatch.ts:92` TODO; the `Alert` EMAIL|PUSH model is defined but
   unused). **AWS SES** ($0.10 / 1,000 emails) + **Google FCM** (push, free) fill that
   seam for ~$0, credit-covered — turning a paid-tier promise into a live feature. SES
   can be called with the repo's **existing SigV4 signer** (no new SDK dependency). The
   gate is built; it needs founder SES provisioning, then a ~1-file wire (see P0-B).
3. **Infrastructure + a possible large AI-tier grant (P1/P2).** Move DB/Redis/cron/
   object-storage onto credit-covered GCP or AWS managed services to cut burn; and
   evaluate the **AWS Activate AI tier** (up to ~$100K–$300K) against our *original*
   edge-engine ML (not a Claude wrapper — the trials-registry/GBM/edge-lab stack is
   genuinely our own models).

---

## Program facts (July 2026)

### Google Developer Program
- **Premium** ≈ **$299/yr** → **$500 annual Google Cloud credit** + **$500 bonus** on
  earning a Google Cloud certification; monthly plan ≈ **$45/mo** Cloud credit + cert
  voucher after 6 months.
- **Jan 2026 change:** premium benefits fold into Google AI subscriptions — **AI Pro
  → $10/mo** Cloud credits, **AI Ultra → $100/mo** Cloud credits, plus Gemini dev
  tooling and Cloud Skills Boost.
- Credits apply to **Vertex AI** (Claude + Gemini), **Cloud SQL** (Postgres),
  **Memorystore** (Redis), **Cloud Run**, **BigQuery**, **Cloud Storage**, **FCM**.

### AWS Activate / Developer Program
- **Founders tier: $1,000 credits + $350 AWS Developer Support** + training — needs
  <10 employees, <$1M revenue/funding, no prior Activate, no VC affiliation. **GSE
  qualifies today.** Approval in ~7–10 business days.
- **Portfolio tier:** $5K–$100K+ via a recognized accelerator/VC/partner.
- **AI tier:** up to **$300K** for startups building **original** AI/ML models
  (explicitly *not* "wrappers on GPT or Claude APIs") with GPU-heavy workloads —
  usually needs a VC nomination.
- **Activate marketplace:** up to ~$800K in third-party discounts (Datadog, Segment,
  HubSpot, etc.).
- Credits cover **Bedrock** (Claude), **RDS** (Postgres), **ElastiCache** (Redis),
  **SES** (email), **SNS** (push/SMS), **Lambda**, **S3**, **CloudFront**, **Amplify**.

---

## Leverage map — GSE cost/capability × who covers it

| GSE need | Today | AWS (credits) | Google (credits) | Notes |
|---|---|---|---|---|
| Claude content/explainer/autopsy | Anthropic direct ($) | **Bedrock** (same price) | **Vertex** (same price) | Adapters exist; flip = config + creds |
| Email alerts (Elite + watchlist) | **none wired** | **SES** ($0.10/1k) | (use SES or FCM email) | Build-now adapter via existing SigV4 |
| Push alerts (Elite + watchlist) | **none wired** | **SNS** | **FCM** (free) | FCM is the standard free push path |
| Postgres | external (Neon/managed) | **RDS** | **Cloud SQL** | Credit-cover to cut burn |
| Redis / BullMQ queue | `REDIS_URL` | **ElastiCache** | **Memorystore** | Credit-cover |
| Cron / workers | (Vercel/host cron) | **Lambda + EventBridge** | **Cloud Run Jobs + Scheduler** | Backtest harness, ingestion, settle |
| Object storage (receipts, exports) | — | **S3** | **Cloud Storage** | For ledger snapshots / proof exports |
| Analytics at scale (backtest, edge-lab) | in-app | **Athena/Redshift** | **BigQuery** | BigQuery is the strongest analytics lever |
| CDN / edge | Vercel | **CloudFront** | **Cloud CDN** | Keep Vercel unless migrating |
| Hosting | **Vercel** (live) | **Amplify/EC2** (scaffolded) | **Cloud Run** | `infrastructure/aws/amplify/` exists |
| Monitoring | — | Datadog via Activate mktplace | — | Marketplace discount |

---

## Prioritized plays

### P0-A — Route Claude through Bedrock or Vertex (credits pay the AI bill) — CODE-COMPLETE, config-only flip
- **Why:** identical per-token price → credits cover it at zero premium; AI generation
  (content, glass-box explainer, loss-autopsy, journal, studio, calibration-training,
  model-court) is the main recurring variable cost.
- **What exists (verified in-repo):** the routing is **already LIVE-wired**, not just
  scaffolded. `apps/web/lib/claude-api/provider-dispatch.ts::callClaude()` selects
  Bedrock → Vertex → direct Anthropic, and **any provider error transparently falls
  back to Anthropic** (so credit-routing can never take a surface down). `callClaude`
  is imported by **7 production generators** (`content-generator.ts`, `studio/claude.ts`,
  `journal/claude.ts`, `pick-explainer/explain.ts`, `loss-autopsy/draft.ts`,
  `calibration-training/claude.ts`, `intelligence-graph/model-court/answer.ts`). The
  SigV4 signer and the RFC-7523 service-account token minter are hand-rolled on
  `node:crypto` (no AWS/GCP SDK), each with known-answer tests. **No code change is
  needed to flip the AI bill onto credits — only env.**
- **Flip to Bedrock (AWS credits):** set `CLAUDE_PROVIDER=bedrock`, `AWS_BEDROCK_REGION`
  (or `AWS_REGION`), `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` (+ optional
  `AWS_SESSION_TOKEN`), and `BEDROCK_MODEL_MAP` — a JSON map of our anthropic model-id →
  the Bedrock model-id. **`BEDROCK_MODEL_MAP` throws on an unmapped id by design (no
  fabricated model IDs)**, so copy the exact Bedrock model-id from the AWS Bedrock
  console model catalog for the pinned model + region; do not guess it.
- **Flip to Vertex (Google credits / the Google-for-Startups Anthropic partner credit):**
  set `CLAUDE_PROVIDER=vertex`, `GOOGLE_VERTEX_PROJECT`, `GOOGLE_VERTEX_REGION`,
  `GOOGLE_APPLICATION_CREDENTIALS_JSON` (service-account JSON), and `VERTEX_MODEL_MAP`.
- **Verify:** flip on a Vercel **preview** env first, trigger one generation, confirm the
  cost-ledger still records it, then set prod. **MODEL_VERSION is unchanged** — same
  model, different provider, so the model-freeze guard still holds.
- **Guard (important):** AWS does **not** fire Cost Anomaly Detection on Bedrock
  Marketplace, so when Activate credits deplete, charges accrue silently. Set an AWS
  **Budgets** alert + a hard monthly cap before routing prod traffic. Same for a GCP
  billing budget on Vertex.
- **Free-lane bonus (already scaffolded):** `providers/cerebras.ts` is an
  OpenAI-compatible free-tier lane (`gpt-oss-120b`) via a separate free-lane dispatcher —
  a zero-cost fallback for non-critical drafts; and `docker/oracle-vps/deploy.sh` runs
  **Redis + Ollama (llama3.2)** on Oracle's **Always-Free** ARM tier for a $0 local LLM +
  cache lane. Credits are the premium lane; these are the free floor.

### P0-B — Wire the alert channel on SES (email) + FCM (push) — seam ready, provision-then-wire
- **Why:** activates the Elite tier's paid promise + the watchlist graded-alert loop;
  cost is ~$0 on credits (SES $0.10/1k, 3,000/mo free first year, $200 new-account
  free-tier credit).
- **What exists (verified):** the entire gate is built — `alert-dispatch.ts`
  `dispatchWatchlistAlert()` runs the kill-switch (`WATCHLIST_ALERTS_ENABLED`),
  graded-only eligibility, and Elite-tier check, then hits `TODO(founder): wire a real
  email/push channel here` at **`alert-dispatch.ts:92`**, returning
  `{ sent: false, outcome: "no_channel_wired" }`. The `Alert` model
  (`schema.prisma`, `channel EMAIL|PUSH`) is defined and unused, ready to back it. The
  repo's zero-dependency SigV4 signer (`providers/aws-sigv4.ts::signRequest`) can call
  **SES's REST API with no new npm dependency** — the same pattern the Bedrock lane uses.
- **Why not built blind this session:** (1) the channel is unusable until the founder
  provisions SES (verify a sending identity, exit the sandbox) — so it would ship inert
  regardless; (2) a live engine-triggerable email send must be introduced carefully
  w.r.t. the `draft-only` guard (which flags email/SMS/webhook send paths), best done in
  the same change that the founder validates end-to-end. The seam + signer make this a
  ~1-file drop-in when SES is ready.
- **Founder steps:** verify a sending domain/identity in SES, request production access
  (exit the SES sandbox), set the SES env (region + verified sender + IAM creds), then
  flip `WATCHLIST_ALERTS_ENABLED=true`. Push (FCM) is a parallel adapter at the same seam.

### P1 — Move burn onto credit-covered managed services
- Postgres → **Cloud SQL** or **RDS**; Redis → **Memorystore** or **ElastiCache**;
  cron/workers → **Cloud Run Jobs + Scheduler** or **Lambda + EventBridge**. Keep the
  Prisma/BullMQ abstractions (already provider-neutral) so this is a connection-string
  swap, not a rewrite. Prioritize whichever program has the larger active credit balance.

### P1 — BigQuery (or Athena) for edge-lab / backtest at scale
- The backtest harness and edge-lab feature-admission runs are analytics-heavy and a
  natural fit for **BigQuery** (Google credits). Export settled-ledger + as-of features
  to BigQuery for cheap, fast, walk-forward analysis without loading the app DB.

### P2 — Pursue the AWS Activate AI tier for the edge engine
- Our prediction engine is **original ML** (trials registry, GBM market-residual models,
  selective-gate calibration) — not a Claude wrapper — which is exactly what the AI tier
  targets. Worth a founder application (likely needs a partner/VC nomination + a GPU
  workload story, e.g. training/backtesting at scale). Upside: $100K–$300K.
- Also claim the **Founders-tier $1,000 + $350 support** immediately (no affiliation
  needed) as the baseline.
- **Portfolio asset already built:** the repo's `apps/web/lib/fable/aws-*` system (a
  Well-Architected shadow governance model, decision-tier engine, and a "personal
  learning evidence ledger" with `AWS_PORTFOLIO_CASE_STUDY.md` / `AWS_TO_GSE_CROSSWALK.md`)
  is exactly the kind of documented cloud-governance maturity that strengthens an
  Activate / AI-tier application and the AWS Developer Program relationship. It makes no
  live AWS calls (`live_aws_action:false` by construction) — its value here is as
  application/credibility material, not a runtime lever.

### P2 — Activate marketplace + Google structured-data/News
- Claim marketplace discounts (Datadog for monitoring, etc.).
- Already shipped this session: **Google News sitemap** (`/news-sitemap.xml`) + JSON-LD
  — submit in Google **Search Console / News Publisher Center** (a Google-program-adjacent
  distribution win at $0).

---

## Risks / guardrails
- **Silent credit depletion (Bedrock):** no anomaly alert → set AWS Budgets + a hard cap
  before prod routing. Same discipline for GCP billing budgets.
- **SES sandbox:** new SES accounts can only send to verified addresses until production
  access is granted — the adapter must degrade honestly (it does: inert until configured).
- **Lock-in:** keep provider adapters behind our existing seams (claude-api providers,
  Prisma, BullMQ, the new SES adapter) so credits are an optimization, never a dependency
  we can't reverse when they expire.
- **Model-freeze:** provider swaps keep the SAME model + MODEL_VERSION; never let a
  provider migration silently change the model.
- **No secrets in code:** every credential above is a deploy-env value (rule #4).

---

## Founder action checklist (fastest value first)
1. Claim **AWS Activate Founders**: $1,000 credits + $350 Developer Support (no VC needed).
2. Set an **AWS Budgets** hard cap + alert (guards silent Bedrock overage).
3. Enable **Bedrock** model access (pinned model, chosen region) **or** **Vertex** Claude;
   set provider-select env + credentials; verify one generation on preview.
4. Verify an **SES** sending identity + request production access; set SES env → flip
   `WATCHLIST_ALERTS_ENABLED=true` to light up Elite/watchlist email alerts.
5. Point Postgres/Redis at **Cloud SQL/Memorystore** or **RDS/ElastiCache** as credit
   balances warrant.
6. Evaluate the **Activate AI tier** application for the edge engine (larger grant).
7. Submit `/news-sitemap.xml` in Google Search Console / News Publisher Center.

---

## Sources
- Google Developer Program plans/benefits: https://developers.google.com/program/plans-and-pricing ,
  https://developers.googleblog.com/introducing-the-google-developer-program-premium/ ,
  https://blog.google/innovation-and-ai/technology/developers-tools/gdp-premium-ai-pro-ultra/
- AWS Activate credits/tiers: https://aws.amazon.com/startups/credits/ ,
  https://aws.amazon.com/startups/learn/applying-for-aws-activate-credits-a-step-by-step-guide
- Bedrock Claude pricing parity + credit coverage: https://aws.amazon.com/bedrock/pricing/ ,
  https://www.cloudzero.com/blog/claude-on-aws-bedrock/ ,
  https://dev.to/aws-builders/using-claude-code-with-aws-credits-via-amazon-bedrock-5a52
- SES pricing: https://aws.amazon.com/ses/pricing/
