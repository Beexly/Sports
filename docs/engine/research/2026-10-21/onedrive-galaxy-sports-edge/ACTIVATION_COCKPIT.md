# Galaxy Sports Edge — Activation Cockpit
**Generated:** 2026-07-17 by the activation co-pilot · **Companion file:** `activation-log.md` (same folder)
**Source of truth:** `reports/ops/ACTIVATION_PACK.md` on branch `claude/glass-ledger-edge-engine` (repo `Beexly/Sports`, public), reconciled against live program terms verified 2026-07-17.

> This is the paste-and-go layer. Every step below has the exact URL, the exact answers to paste, the exact console clicks, and a status line. You log in / 2FA / pay; everything else I drive.

---

## ⚠️ READ FIRST — the one gap that reframes the whole pack

I verified production **live** on 2026-07-17:

| Surface | Result | Why it matters |
|---|---|---|
| `https://www.galaxysportsedge.com/` | **200, real product** ("A Sports Intelligence Operating System", 168 settled picks) | Site is deployed & healthy |
| `https://www.galaxysportsedge.com/llms.txt` | **404** | This is the "verifiable record" the pack says to cite in **every** application |
| `https://www.galaxysportsedge.com/news-sitemap.xml` | **404** | Step 11 submits this to Search Console |

**Root cause:** production deploys from **`main`**, but the **Proof surface** (`/llms.txt`, `/api/proof/*`), the **news-sitemap**, and the **Bedrock/Vertex credit-routing code** all live **only on `claude/glass-ledger-edge-engine`** (confirmed in the branch tree). They are not on `main`, so they 404 in production.

**Three consequences:**
1. Applications that cite the Proof API today point at a 404 — a bad look and not honest. Deploy the branch first, or phrase the differentiator as "shipping" and don't hyperlink it yet.
2. Search Console (Step 11) can't submit `news-sitemap.xml` until it's live.
3. The Bedrock env-flip (Step 3) won't actually route in prod until the routing code ships — **validate it on a Vercel Preview deploy of the branch first** (the pack already says preview-first).

**The fix (your call — it's a production change, so I did NOT do it autonomously):**
- **Best:** merge `claude/glass-ledger-edge-engine` → `main` and deploy. That lights up the Proof surface + news-sitemap + credit routing in one move.
- **Minimum to unblock activation:** trigger a **Preview deploy** of the branch in Vercel → gives a temporary URL with the Proof surface live so you can validate the Bedrock flip and (optionally) cite a preview Proof URL.

---

## Verified program reality (2026-07) — do the ✅ now, don't waste time on the ⚠️

| # | Program | Pack said | Verified now (2026-07) | Verdict |
|---|---|---|---|---|
| 1 | **AWS Budgets cap** | do first | free, self-serve | ✅ **DO FIRST** |
| 2 | **AWS Activate Founders** | $1k+$350 | **$1k–$5k credits + $350 support**, self-serve, no VC, GSE qualifies | ✅ **DO NOW** |
| 3 | **Bedrock env-flip** | env-only | code lives on the branch → needs Preview/deploy to route | ✅ after a branch deploy |
| 5 | **Azure Founders Hub** | up to $150k | up to $150k, **no funding needed**, self-serve entry tier | ✅ **DO NOW** |
| 9 | **PostHog for Startups** | $50k | **$50k/12mo**; needs **<2 yrs old + <$5M raised** → GSE qualifies | ✅ **DO NOW** |
| 8 | **Cloudflare** (R2/Turnstile/Analytics) | free | unchanged, self-serve | ✅ **DO NOW** |
| 7 | **Vercel AI Gateway** | $5/mo free | unchanged, self-serve | ✅ **DO NOW** |
| 10 | **SES** | pay-go | pay-go, sandbox-first, tiny cost | ✅ DO NOW (after entity for prod volume) |
| 11 | **Search Console** | verify + sitemaps | free | ✅ **after the branch deploy** |
| 4 | **Claude for Startups** | $25k–$100k any founder | **credits now require institutional funding + founded <4yr + no prior credits** | ⚠️ credits **gated** while bootstrapped — you can still make the Console account; credits need a raise/accelerator |
| 7b | **Vercel *for Startups*** | 12mo Pro + credits | now **requires a backing Partner (VC/accelerator) + a dashboard screenshot** | ⚠️ **gated** without a partner |
| 6 | **NVIDIA Inception** | free, $100k DGX | free **but requires an incorporated entity**; your `LAUNCH_LEDGER` D1 (EIN/entity) is **unchecked** | ⚠️ **gated** — incorporate first (Stripe Atlas) |
| 12 | **GitHub for Startups** | $10k | needs partner affiliation + funding | ⚠️ **park** until an accelerator |

**The single highest-leverage human move** (straight from your own leverage atlas, and it checks out): **join one accelerator / partner network.** A referral code lifts AWS ($1k→$200k), Azure (→$150k), Anthropic ($5k→$25k+), and Vercel/GitHub to their top tiers **all at once**, and it's the unlock for every ⚠️ row above.

---

## The reusable narrative (paste into any "what are you building" field)

> **Company:** Galaxy Sports Edge (galaxysportsedge.com) — a verifiable sports-prediction platform. Every pick is committed to a tamper-evident, hash-chained receipt BEFORE kickoff; the record is judged by closing-line value and settled results, and anyone (human or AI agent) can independently verify it via our public Proof API (/llms.txt → /api/proof/*), including recomputing our hashes from published conformance test vectors.
>
> **Original ML (not an LLM wrapper):** our edge engine is proprietary — an as-of feature store with runtime lookahead guards, purged walk-forward validation, a registered-trials ledger with false-discovery-rate control, conformal/Venn-Abers calibration, and gradient-boosted market-residual models. GPU/compute credits go to training and walk-forward backtesting of THESE models.
>
> **Where LLMs fit:** Claude generates data-backed content (explainers, loss autopsies, research journal) from our engine's outputs — the LLM is never the source of truth for predictions.
>
> **Stack:** Next.js/TypeScript on Vercel, Postgres (Prisma), Redis, Stripe subscriptions. Stage: pre-revenue/early-revenue, bootstrapped, solo founder.

**One-liners** (when a form wants a single line):
- "A sports-prediction platform with a cryptographically verifiable track record."
- "Publish-before-kickoff, hash-chained picks — the first record an AI agent can audit."

> ⚠️ **Caveat until the branch deploys:** the Proof API sentence links to `/llms.txt`, which 404s today. Either deploy the branch first, or drop the parenthetical URL and keep the claim as "…can independently verify it via our public Proof API (shipping)."

---

## Secrets — hard rules (how I handle every key)

- **Never** written to the repo, a commit, or any chat. Only pasted into the provider's own secure field, a **Vercel env var**, or your **password manager**.
- When I create a key (IAM, API token, etc.), I paste it **straight into its destination**. The activation log records the **name and storage location only — never the value**.
- Bedrock/Vertex creds go to Vercel **Preview scope first**, verified, then promoted to Production. `MODEL_VERSION` never changes on a provider swap.

---

## Steps — exact URL · answers · clicks · secrets · status

### Step 1 — AWS Budgets hard cap  ✅ do before anything else on AWS
- **URL:** https://console.aws.amazon.com/billing/home#/budgets
- **Why first:** Bedrock Marketplace spend does **not** trigger Cost Anomaly Detection. This budget is the only tripwire against silent credit depletion.
- **Clicks:** Budgets → **Create budget** → **Customize (advanced)** → **Cost budget** → Period **Monthly** → Budget amount **$50** (comfort ceiling while on credits) → Add alert thresholds at **50% / 80% / 100%** of budgeted → email = your ops email → Create.
- **Secrets:** none.
- **Status:** ☐ pending your AWS login.

### Step 2 — AWS Activate Founders  ✅ $1k–$5k + $350 support
- **URL:** https://aws.amazon.com/startups/credits (Apply → Founders / self-funded)
- **Paste answers:**
  - What are you building → the §0 narrative above.
  - Company website → https://www.galaxysportsedge.com
  - Employees → **<10 (solo founder)** · Funding raised → **$0 / bootstrapped** · Annual revenue → **pre-revenue/early**
  - VC or accelerator affiliation → **None** · Prior Activate credits → **No**
- **Clicks:** Apply → create/login AWS → fill form → submit. Review ≈ 7–10 business days.
- **Secrets:** none (credits auto-apply to the account).
- **Status:** ☐ pending.

### Step 3 — Bedrock env-flip  (env-only; code is on the branch)
- **Console:** https://console.aws.amazon.com/bedrock → **Model access** → enable **Anthropic Claude** in your chosen region (e.g. `us-east-1`) → **copy the EXACT model id** from the catalog (never guess it).
- **IAM:** https://console.aws.amazon.com/iam → create user **`gse-bedrock-invoke`**, least-privilege policy = `bedrock:InvokeModel` (+`bedrock:InvokeModelWithResponseStream`) → create **access key**.
- **Vercel env (PREVIEW scope first):** Project → Settings → Environment Variables:
  ```
  CLAUDE_PROVIDER=bedrock
  AWS_BEDROCK_REGION=<your region, e.g. us-east-1>
  AWS_ACCESS_KEY_ID=<from IAM>
  AWS_SECRET_ACCESS_KEY=<from IAM>
  BEDROCK_MODEL_MAP={"claude-sonnet-4-6":"<EXACT-bedrock-id-from-console>"}
  ```
  (`claude-sonnet-4-6` is the repo's `DEFAULT_MODEL` — confirmed in `provider-dispatch.ts`. The map **throws on an unmapped id by design**, so the right side must be the console's exact Bedrock id / inference-profile id.)
- **Verify:** redeploy Preview → trigger one content generation → confirm output **and** that the call hit Bedrock (CloudWatch / Bedrock metrics) → then copy the vars to **Production**. `MODEL_VERSION` unchanged. Any provider error falls back to direct Anthropic (zero downtime).
- **Secrets:** AWS key id + secret → **Vercel env only**.
- **Status:** ☐ blocked until a branch Preview/deploy exists (routing code isn't on prod `main` yet).

### Step 4 — Claude for Startups  ⚠️ credits gated while bootstrapped
- **URL:** https://claude.com/programs/startups (form: https://claude.com/form/startups-application) — needs a Claude **Console** account (API console, not the chat app).
- **Reality:** credit qualification now needs **equity funding from an institutional investor + founded <4 yrs + no prior Anthropic credits**. As a bootstrapped solo founder you can create the Console account and apply, but **credits likely won't issue until you raise or get an accelerator referral.** Not worth blocking the ✅ steps on.
- **Status:** ☐ optional now / revisit after a raise or accelerator.

### Step 5 — Azure Founders Hub  ✅ up to $150k, no funding needed
- **URL:** https://www.microsoft.com/en-us/startups → Sign up (Microsoft account) → business verification.
- **Paste answers:** §0 narrative; stage = bootstrapped/solo/pre-revenue.
- **Flow:** self-serve entry tier ($1–5k Azure) unlocks immediately; progressive unlocks toward $150k. Includes Azure OpenAI (eval/shadow lane only — model-freeze holds for picks), GitHub Enterprise, M365.
- **Secrets:** none yet (Azure creds only if you later route a lane through it).
- **Status:** ☐ pending.

### Step 6 — NVIDIA Inception  ⚠️ needs an incorporated entity
- **URL:** https://www.nvidia.com/en-us/startups → Apply.
- **Blocker:** requires an incorporated entity + working website + ≥1 developer. Your `LAUNCH_LEDGER` **D1 (EIN/entity) is unchecked** → incorporate first (**Stripe Atlas**, you already use Stripe; ~days). Then apply, leading with the **original-ML** paragraph of §0 (GPU = walk-forward backtests + GBM training). Free NIM endpoints on acceptance; DGX credits by request.
- **Status:** ☐ blocked on incorporation.

### Step 7 — Vercel AI Gateway (✅ now) + Vercel for Startups (⚠️ gated)
- **AI Gateway (do now):** dashboard → enable AI Gateway → $5/mo free credits start on first request. Optional Preview-env lane test:
  ```
  INTERNAL_LLM_BASE_URL=https://ai-gateway.vercel.sh/v1
  INTERNAL_LLM_MODEL=<a free-tier model id>
  INTERNAL_LLM_API_KEY=<gateway key>
  ```
  (routes non-user-facing drafts only; keep pick-adjacent surfaces on the same Claude model.)
- **Vercel for Startups (gated):** https://vercel.com/startups/credits now requires selecting a **backing Partner** (YC/a16z/etc.) and uploading a screenshot of the Vercel offer in that partner's dashboard. **Park until you have an accelerator/VC.**
- **Secrets:** gateway key → Vercel env only.
- **Status:** AI Gateway ☐ do now · For-Startups ☐ parked.

### Step 8 — Cloudflare  ✅ free, enables 3 wired-ready integrations
- **URL:** https://dash.cloudflare.com → create account.
  - **R2:** create bucket **`gse-proof-exports`** → note account id + create an **API token** (Object Read & Write, scoped to that bucket).
  - **Turnstile:** create widget → note **sitekey + secret**.
  - **Web Analytics:** add site `galaxysportsedge.com` → note the **token**.
- **Secrets:** R2 token, Turnstile secret, Analytics token → **Vercel env / password manager only**.
- **Status:** ☐ pending.

### Step 9 — PostHog  ✅ $50k program, GSE qualifies
- **URL:** https://posthog.com (create project, **US cloud**) → copy **Project API key** → apply at https://posthog.com/startups (auto-approved, then eligibility review; you meet <2yr + <$5M raised).
- **Secrets:** PostHog project key → env when the SDK is wired (build-session task).
- **Status:** ☐ pending.

### Step 10 — SES  ✅ unlocks the Elite/watchlist alert channel
- **URL:** https://console.aws.amazon.com/ses → **Verify identity** (domain `galaxysportsedge.com` via DNS, or a single sender address to start) → **Request production access** (use-case: transactional, graded pick alerts to opted-in subscribers, low volume).
- **IAM:** user **`gse-ses-send`**, policy `ses:SendEmail` → note region + creds.
- **Then:** tell the build session — the alert wire at `alert-dispatch.ts` (`dispatchWatchlistAlert()` currently returns `no_channel_wired`) is a ~1-file gated drop-in using the repo's existing SigV4 signer; then flip `WATCHLIST_ALERTS_ENABLED=true`.
- **Secrets:** SES IAM creds → Vercel env only.
- **Status:** ☐ pending (sender-address verify works even pre-incorporation; domain + higher volume later).

### Step 11 — Google Search Console  ✅ after the branch deploys
- **URL:** https://search.google.com/search-console → add property `galaxysportsedge.com` → verify (DNS TXT or the existing Google site verification) → **Sitemaps** → submit **`sitemap.xml`** AND **`news-sitemap.xml`**.
- **Blocker:** `news-sitemap.xml` 404s until the branch ships to prod (see READ FIRST). Verify the property now; submit the news sitemap right after deploy.
- **Status:** ☐ verify now / submit news-sitemap after deploy.

### Step 12 — GitHub for Startups  ⚠️ park
- **URL:** https://github.com/enterprise/startups — needs a partner affiliation + outside funding (≤ Series B). Do after an accelerator/partner referral (same referral multiplies AWS/Azure/Anthropic). Copilot Pro + free Actions minutes are available now regardless.
- **Status:** ☐ parked.

---

## Master status table

| # | Step | Type | Blocker | Status |
|---|---|---|---|---|
| 1 | AWS Budgets cap | console | your AWS login | ☐ |
| 2 | AWS Activate Founders | application | login | ☐ |
| 3 | Bedrock env-flip | env | branch not deployed to prod | ☐ |
| 4 | Claude for Startups | application | institutional funding (credits) | ⏸ |
| 5 | Azure Founders Hub | application | login | ☐ |
| 6 | NVIDIA Inception | application | incorporation (EIN) | ⏸ |
| 7 | Vercel AI Gateway | console | login | ☐ |
| 7b | Vercel for Startups | application | partner backing | ⏸ |
| 8 | Cloudflare R2/Turnstile/Analytics | console | login | ☐ |
| 9 | PostHog + startup program | console/application | login | ☐ |
| 10 | SES identity + sandbox exit | console | login (+entity for volume) | ☐ |
| 11 | Search Console + sitemaps | console | branch deploy (news-sitemap) | ☐ |
| 12 | GitHub for Startups | application | partner + funding | ⏸ |

**Legend:** ☐ ready to drive (needs your login) · ⏸ gated on a prerequisite (funding/entity/partner) · ✅ done (updated in `activation-log.md`).

## Fastest sequence when you're at the keyboard
1. **Deploy the branch** (or Preview deploy) — unblocks 3, 11, and the Proof-API citation.
2. **Step 1** AWS Budgets cap → **Step 2** AWS Activate → **Step 5** Azure → **Step 9** PostHog → **Step 8** Cloudflare → **Step 7** Vercel AI Gateway → **Step 10** SES. All self-serve, ~1 login each.
3. **Step 3** Bedrock flip on Preview → verify → promote to Production.
4. **Step 11** submit both sitemaps.
5. Then the multiplier: pursue **one accelerator/partner** to unlock Claude-for-Startups credits, Vercel-for-Startups, NVIDIA, GitHub, and the AWS/Azure top tiers.
