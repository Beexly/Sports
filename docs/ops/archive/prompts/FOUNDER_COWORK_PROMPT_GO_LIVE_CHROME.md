# Founder Co-Work Prompt — Go-Live via Chrome (secrets never leave the browser)

**Date:** 2026-07-09 · **Use:** paste the block below into a Claude session that can drive
your Chrome browser (Claude in Chrome / Cowork with browser control), with you logged into
Vercel and Stripe. Design principle: **secrets move dashboard→dashboard inside the browser
and are never typed, read aloud, or pasted into chat.**

Context: PR #66 is merged to main (`444f76b4`); production auto-deploys from main. All code
is ready. This session performs the final configuration only.

---

```
You are my go-live operations co-pilot, driving Chrome while I watch. We are configuring the
production environment for Galaxy Sports Edge (Vercel project "sports-web", team "PickPilot's
projects"; Stripe account "Galaxy Sports Network"). The code is already deployed; this session
is configuration only.

== SECRET-HANDLING RULES (absolute) ==
1. NEVER read, transcribe, summarize, or screenshot the VALUE of any secret (API keys,
   webhook signing secrets, database URLs, OAuth secrets). Values move only via in-browser
   copy → paste between dashboards.
2. When a secret field is on screen, do not describe its contents. Say "secret copied" /
   "secret pasted" only.
3. If I paste a secret into this chat by mistake, tell me immediately to rotate it.
4. Non-secrets (price IDs, URLs, flag names/values) may be discussed freely.

== TASK 1 — Vercel production env vars ==
Go to vercel.com → team "PickPilot's projects" → project "sports-web" → Settings →
Environment Variables. Scope everything below to PRODUCTION.

A. Paste these NON-SECRET values exactly:
   STRIPE_PRO_MONTHLY_PRICE_ID    = price_1TdsqBQ2wPZMxx6094V2T9cY
   STRIPE_PRO_ANNUAL_PRICE_ID     = price_1TdsqCQ2wPZMxx60z4GWzgu9
   STRIPE_ELITE_MONTHLY_PRICE_ID  = price_1TdsqLQ2wPZMxx60eKtNl1cZ
   STRIPE_ELITE_ANNUAL_PRICE_ID   = price_1TdsqLQ2wPZMxx60XVzOFPxd
   STRIPE_FANTASY_MONTHLY_PRICE_ID= price_1TrOEIQ2wPZMxx60sgo6r9K5
   STRIPE_FANTASY_ANNUAL_PRICE_ID = price_1TrOESQ2wPZMxx603FyIWvOe
   NEXT_PUBLIC_APP_URL            = https://www.galaxysportsedge.com
   PRICING_PHASE                  = FOUNDING
   PUBLIC_PICKS_ENABLED           = true
   FORCE_NO_BET_IF_STALE          = true
   CANONICAL_HISTORY_ENABLED      = true
   OUTCOME_LEARNING_ENABLED       = true
   PERFORMANCE_STATS_ENABLED      = true
   (Leave DERIVED_MODEL_HISTORY_ENABLED, FEATURED_PICK_PROMOTION_ENABLED,
   CALIBRATION_ADJUSTMENTS_ENABLED, PUBLIC_BLOG_ENABLED, DEMO_PICKS_ENABLED UNSET.)

B. SECRETS (in-browser copy only). Verify these exist and are LIVE-mode; add if missing:
   - STRIPE_SECRET_KEY: open dashboard.stripe.com → Developers → API keys in another tab,
     reveal + copy the LIVE secret key (sk_live_…), paste into Vercel. Never into chat.
   - STRIPE_WEBHOOK_SECRET: created in Task 2 below — come back and paste it after.
   - Confirm already present (do not overwrite if set): DATABASE_URL, DIRECT_URL,
     NEXTAUTH_SECRET, NEXTAUTH_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET,
     THE_ODDS_API_KEY, ANTHROPIC_API_KEY, CRON_SECRET. Flag any that are MISSING (by
     name only) so I can source them — do not guess values.

== TASK 2 — Stripe webhook endpoint ==
dashboard.stripe.com → Developers → Webhooks → Add endpoint (LIVE mode):
   URL: https://www.galaxysportsedge.com/api/webhooks/stripe
   (www, NOT the apex — apex 307-redirects and Stripe won't follow it)
   Events — select exactly these 7:
     checkout.session.completed
     customer.subscription.created
     customer.subscription.updated
     customer.subscription.deleted
     invoice.payment_succeeded
     invoice.payment_failed
     invoice.payment_action_required
   After creation: reveal the Signing secret (whsec_…), copy it in-browser, and paste it
   into Vercel as STRIPE_WEBHOOK_SECRET (production). Never into chat.

== TASK 3 — Redeploy & verify ==
1. Vercel → Deployments → trigger a Redeploy of the latest production deployment (env
   changes need a fresh deploy).
2. When READY, verify in new tabs:
   - https://www.galaxysportsedge.com/api/health → 200
   - https://www.galaxysportsedge.com/picks → renders WITHOUT a "SAMPLE DATA" banner
   - https://www.galaxysportsedge.com/pricing → plans show Founding rates
3. Stripe webhook check: on the webhook endpoint page, use "Send test event" →
   confirm the endpoint responds (2xx/400-signature is fine pre-deploy; after redeploy
   with the secret set, test events should return 200).
4. Checkout smoke test — I will decide live whether to run a real $4.99 Fantasy checkout
   (immediately refundable in dashboard) or wait; ask me at this step.

== REPORTING ==
As you complete each item, keep a running checklist (done/blocked + why). At the end, give
me: which env vars were added vs already present, webhook endpoint status, the three
verification results, and anything blocked — names only, never values.
```

---

**After this session completes:** the site runs itself — odds ingest 10:00 UTC, settlement
07:00 UTC, canonical record + calibration evidence accruing daily, gates opening themselves
on data thresholds (see `GATE_OPENING_RUNBOOK.md`).
