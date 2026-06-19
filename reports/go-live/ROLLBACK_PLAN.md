# Rollback Plan — how to undo safely

Activation is built to be reversible. Nothing in the launch path is destructive, and
every paid lane is off by default. This is how to back out of any step without data
loss or surprise spend.

> Golden rule: **unsetting an env var disables a feature; it never deletes data.** The
> app degrades to its honest "not configured" state for whatever you turn off.

---

## Fast kill-switches (no redeploy of code needed)

| To stop… | Do this | Effect |
|---|---|---|
| All paid spend | Ensure `PAID_ADS_ENABLED` and `PAID_SPORTS_DATA_ENABLED` are unset/`false`; remove `ANTHROPIC_API_KEY` | Back to $0 free pools |
| Odds API calls | Set `ODDS_API_CAPTURE_MODE=OFF` (or `ODDS_API_CAP_REACHED=true`) | No credit-spending calls |
| Checkout / billing | Unset `STRIPE_SECRET_KEY` | `/founding-desk` reverts to "opening soon"; no charges |
| Public picks | Set `PUBLIC_PICKS_ENABLED=false` | Picks hidden from public |
| Content publishing | It's already human-gated (`autoPublish=false`) | Nothing auto-publishes |
| The whole site | Disable the deployment in your host | Site offline; data intact |

Each takes effect on the next request (or redeploy of env on Vercel). No code change.

---

## Step-by-step rollback

### Roll back billing
1. In Stripe, switch back to **test mode** or unset `STRIPE_SECRET_KEY`.
2. Existing subscriptions are **not** cancelled by unsetting the key — they remain in
   Stripe. To stop a specific test subscription, cancel it in the Stripe Dashboard.
3. Never bulk-cancel/migrate real subscriptions — that's an explicit, deliberate action.

### Roll back data / loops
1. Remove the cron schedules in `vercel.json` (or pause the deployment) to stop the loops.
2. Set `OUTCOME_LEARNING_ENABLED=false` to stop stamping new picks as learning-eligible.
   Already-stamped picks stay as they are (no retroactive relabeling — by design).

### Roll back the database
1. Unsetting `DATABASE_URL` puts the app in its stub/honest-empty mode (no crash).
2. Your data remains in the provider. To restore, set `DATABASE_URL` again.
3. Migrations are forward-only; if a migration misbehaves, restore from your provider's
   point-in-time backup (Supabase/Neon/Railway all offer this on free/standard tiers).

### Roll back a bad deploy
1. On Vercel: Deployments → pick the last good one → **Promote to Production** (instant).
2. The previous build serves immediately; env vars are unchanged.

---

## What is NEVER touched by a rollback
- Founding-member rates and existing subscriptions (grandfathered).
- The model version / calibration state (founder-gated; only changes via MODEL_VERSION).
- Captured evidence and settled-pick history (append-only; not rewritten).

---

**Bottom line:** every step forward has a one-line step back, and the worst case
(unset everything) lands you on the same honest, zero-spend, no-crash state you started
from — with your data safe in the provider.
