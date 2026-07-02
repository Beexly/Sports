# Crypto Payments — Go-Live Checklist (owner + ops gated)

Everything in code is done and adversarially verified (two review rounds, 12
findings fixed). The items below CANNOT be verified from code — they are
environment/ops actions to complete BEFORE flipping `CRYPTO_PAYMENTS_ENABLED=true`.

## 1. Database privileges (learned from the prod picks-table GRANT precedent)
Two migrations ship on this branch:
- `20260702120000_add_crypto_payment_provider` (Subscription: optional
  stripeCustomerId, PaymentProvider enum, externalChargeId)
- `20260702200000_add_commerce_charge_ledger` (new `commerce_charges` table)

The go-live prod audit previously found the pooled RUNTIME role lacked
privileges on a table it did not create. `commerce_charges` is created by the
migration role; if the runtime role differs, the first real payment throws
permission-denied inside the webhook transaction. Before flipping the flag:

```sql
SELECT has_table_privilege('<runtime_role>', 'commerce_charges', 'INSERT');
SELECT has_table_privilege('<runtime_role>', 'commerce_charges', 'SELECT');
SELECT has_column_privilege('<runtime_role>', 'subscriptions', 'paymentProvider', 'SELECT');
```

If any is false, add a GRANT (and consider `ALTER DEFAULT PRIVILEGES` for the
migration role so every FUTURE migration-created table is covered, not just
this one).

## 2. Deploy order (migration must lead code)
Both migrations must apply BEFORE the new code serves. The repo runs
migrate-in-build (vercel.json), so a normal deploy is safe. As a belt: if
`paymentProvider`/`commerce_charges` are missing when code runs, entitlements
now fails CLOSED to FREE (P2021/P2022) instead of 500-ing the site — but that
is a safety net, not the plan. Confirm both migrations show as applied.

## 3. Coinbase Commerce config
- `COINBASE_COMMERCE_API_KEY` and `COINBASE_COMMERCE_WEBHOOK_SECRET` set in
  the Vercel env (both required, or the lane stays dark).
- Webhook endpoint pointed at `/api/webhooks/coinbase-commerce`, subscribed to
  at least `charge:confirmed` (grants), plus `charge:delayed` / `charge:resolved`
  (these log for MANUAL review — a human confirms full payment and grants; they
  are never auto-granted, because resolved fires for under/over payments too).
- `STRIPE_SECRET_KEY` must also be set: a crypto grant that replaces a live
  Stripe subscription CANCELS it at Stripe to stop double-billing. Without the
  key that cancel fails and logs URGENT.

## 4. First-payment smoke test (Commerce test mode)
Pay one test charge; confirm: a `commerce_charges` row appears, the
Subscription flips to COINBASE_COMMERCE with `currentPeriodEnd` ~365d out,
entitlements grant the tier, and a replayed webhook logs a duplicate without
extending. Then let it expire (or hand-edit `currentPeriodEnd` to the past in
a test DB) and confirm access drops to FREE.

## Residual, monitored not blocked
- Cross-rail double-buy TOCTOU: whichever rail confirms second is reconciled
  (late crypto grant cancels the Stripe sub; a post-expiry card sub reclaims
  the row). The remaining exposure is a sub-hour window of parallel billing
  that self-heals on the next event; watch the `[commerce]`/`[stripe]` logs.
