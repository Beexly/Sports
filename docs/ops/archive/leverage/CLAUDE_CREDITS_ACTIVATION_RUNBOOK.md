# Claude-Bill Credits — Activation Runbook

**Date:** 2026-07-08 · **Companion to:** `CLOUD_CREDITS_MAXIMIZATION_STRATEGY_2026-07-08.md`

Three independent, diversified ways to pay the Claude bill. This is the **do-this** list —
exact steps, what's already automated in the codebase, and what only you can do (needs your
accounts/credentials). Ordered by speed-to-value.

**One hard rule the research surfaced:** keep Claude on **AWS Bedrock `InvokeModel`**
specifically. Claude-Platform-on-AWS Marketplace and Claude-on-Azure both bill in ways that
are **not** credit-eligible. Our shipped adapter uses `InvokeModel` — correct by construction.

---

## Path B — Anthropic "Claude for Startups" (FASTEST · zero code · do first)

Credits land on the **same `ANTHROPIC_API_KEY` account we already use**, so there is
**nothing to build or deploy** — approved credits simply start paying the existing bill.

**What only you can do:**
1. Apply at **claude.com/programs/startups** (~2 min). It weighs *Claude integration and
   usage* — which we have in spades — and is explicitly open to founders with or without VC.
2. Use the ready-to-paste answers below.
3. On approval, confirm the credit shows in the Anthropic Console billing page. No code change.

**Draft application answers (paste + edit):**
> **What are you building?** A production sports-prediction platform. Structured odds/line
> data (The Odds API) is the source of truth; deterministic engines score picks with
> calibrated 0–100 confidence. Claude is the content/reasoning layer — never the source of
> truth.
>
> **How do you use Claude today?** Seven governed, production surfaces, all model-routed
> (Haiku/Sonnet/Opus per surface) with a cost + usage ledger: pick explainers, an adversarial
> "model court" Q&A, weekly public accountability journals, calibration-insight summaries,
> editorial content drafts, a brand-voice studio, and loss autopsies. Every output passes
> claim/brand-safety scanners and a fabricated-stat guard before it can ship.
>
> **Scale / trajectory:** Live in production (Vercel + Neon + Redis), daily automated jobs
> across 7 sports, subscription paywall (Stripe), moving to real revenue. Claude spend is our
> single largest variable cost and grows directly with usage.

**Status in code:** ✅ nothing needed. Works the moment credits are applied.

---

## Path A — AWS Bedrock (BIGGEST · up to $300k · adapter + wiring shipped)

**What's already automated (this session):**
- ✅ Zero-dependency SigV4 signer (`providers/aws-sigv4.ts`), pinned to AWS's official test vector.
- ✅ Bedrock `InvokeModel` adapter (`providers/bedrock.ts`) — identical result shape, so the
  cost/usage ledger + governance run unchanged.
- ✅ `callClaude` dispatcher and **all 7 Claude surfaces wired to it** — so activation is a
  single env flip. Falls back to the direct Anthropic API on any Bedrock error.
- ✅ Inert by default: unset `CLAUDE_PROVIDER` → behavior byte-identical to today.

**What only you can do:**
1. Confirm your AWS Activate tier is the **GenAI tier** (that's the one covering Bedrock).
2. **Bedrock console** (pick a region, e.g. `us-east-1`) → request **model access** for the
   Claude models we use; copy each exact **model id**.
3. Create an **IAM user/role** scoped to only `bedrock:InvokeModel` (least privilege). Prefer
   short-lived STS creds (the adapter supports `AWS_SESSION_TOKEN`).
4. Set env in **staging first** (do NOT set `CLAUDE_PROVIDER` yet):
   ```
   AWS_ACCESS_KEY_ID=…
   AWS_SECRET_ACCESS_KEY=…
   AWS_BEDROCK_REGION=us-east-1
   BEDROCK_MODEL_MAP={"claude-sonnet-4-6":"<verified id>","claude-haiku-4-5-20251001":"<verified id>","claude-opus-4-8":"<verified id>"}
   ```
5. **Staging smoke test:** set `CLAUDE_PROVIDER=bedrock` in staging only, generate one draft
   per surface, and confirm each recorded `modelName` is a **Bedrock** id (proves credits are
   used and no silent fallback). Then promote to production.
6. Layer discounts: Batch (up to 50% off) for batchable content; set a Bedrock **budget
   alarm** and mirror the cap in `FABLE_AWS_MAX_MONTHLY_COST_USD`.

**Status in code:** ✅ turnkey — activation is `CLAUDE_PROVIDER=bedrock` + the 4 env vars above.

---

## Path C — Google Vertex $10k Anthropic partner credit (SMALL top-up)

The only Google pool that touches the Claude bill. A **top-up**, not the primary — pursue
after A/B.

**What only you can do:**
1. Email your Google Cloud **Account Executive** to request the **$10k Anthropic
   partner-model credit** (Scale/Scale-AI tier; **not automatic**). Draft:
   > "We're on the Google for Startups Cloud AI tier and want to pilot Claude on Vertex AI
   > Model Garden (`us.anthropic.*`). Please enable the $10k Anthropic partner-model credit
   > referenced in the startup partner-models program for our billing account."
2. Enable the **Vertex AI API**; create a **service account** with Vertex AI User; download
   its JSON key.
3. Set env (once the Vertex adapter ships — see status): `CLAUDE_PROVIDER=vertex`,
   `GOOGLE_VERTEX_PROJECT`, `GOOGLE_VERTEX_REGION`, `GOOGLE_APPLICATION_CREDENTIALS_JSON`,
   `VERTEX_MODEL_MAP`.

**Status in code:** the `callClaude` seam makes a Vertex provider a drop-in sibling to
Bedrock (service-account OAuth2 bearer instead of SigV4). Worth building once the $10k is
confirmed — Bedrock alone captures the far larger pool.

---

## Do-this-week order

1. **Today:** apply to Anthropic Claude for Startups (Path B) — fastest, zero-code, credits
   hit the existing key.
2. **This week:** confirm AWS Activate GenAI tier → request Bedrock model access → run the
   staging smoke test (Path A). Everything in code is ready.
3. **When convenient:** email the Google AE for the $10k Vertex credit (Path C).

**Net effect:** the same Claude bill can be paid three different ways, diversified so no single
program's approval delay or credit expiry can strand us. All the code required for Path A is
already merged and tested; Paths B and C are account-side actions.
