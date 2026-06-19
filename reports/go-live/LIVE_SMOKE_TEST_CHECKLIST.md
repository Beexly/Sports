# Live Smoke-Test Checklist — prove it works after deploy

Run this once, right after activation (`OWNER_ACTIVATION_RUNBOOK.md`). Each item is a
human-observable check. If one fails, see `ROLLBACK_PLAN.md`. None of these mutate
production data beyond a test you control.

> Tip: most of these are visible from `/cockpit/go-live` and `/cockpit/live` without
> manual poking. Use the cockpit first; only do the manual flows for billing.

---

## 1. The site is up
- [ ] Homepage `/` loads with no error.
- [ ] A few public pages render: `/board`, `/pricing`, `/founding-desk`, `/trust-room`.
- [ ] No console errors that break the page (info/analytics warnings are fine).

## 2. Auth
- [ ] `/auth/signin` loads.
- [ ] You can sign in with your `ADMIN_EMAILS` account.
- [ ] After sign-in you can reach `/cockpit` (operator badge present).

## 3. Database & readiness
- [ ] `/cockpit/go-live` → Infrastructure → **Database reachable** is `ready`.
- [ ] No group shows an unexpected `action_needed` for something you set.
- [ ] `/cockpit/gates` renders real counts (not "unknown" everywhere → DB is connected).

## 4. Data / loops
- [ ] Trigger `/api/cron/refresh-odds` once (or wait for the schedule); it returns ok.
- [ ] `/cockpit/live` shows non-empty health/freshness once data has flowed.
- [ ] `/cockpit/autonomy` shows the recurring loops as self-driving.

## 5. Billing (the one flow worth doing manually)
- [ ] `/founding-desk` shows a live **checkout** CTA (not "opening soon").
- [ ] Start a checkout in **Stripe test mode** with card `4242 4242 4242 4242`.
- [ ] Checkout completes; the Stripe webhook fires (Stripe Dashboard → Webhooks → recent).
- [ ] The member's tier updates in the DB (or `/cockpit/revenue` reflects the change).
- [ ] Cancel the test subscription in Stripe to clean up.

## 6. AI / Jarvis
- [ ] In `/cockpit/live`, ask Jarvis a question — it answers (free pool; no key needed).
- [ ] Voice toggle round-trips (browser STT→TTS) if you use it.

## 7. Spend posture
- [ ] `/cockpit/spend` shows **zero-spend** (or only the services you intentionally enabled).
- [ ] No service shows `PAID_ENABLED` that you didn't authorize.

## 8. Honesty spot-check
- [ ] No public page shows a fabricated win rate / record (gated pages say "building the record").
- [ ] `/performance` and `/calibration` show honest gated/empty states until the sample clears.

---

**Pass condition:** sections 1–4 all green = the site is live and self-running.
Section 5 green = revenue is live. Sections 6–8 confirm the AI + spend + honesty posture.

If everything passes, you're launched. The loops take it from here.
