# Crypto Payments — Go-Live Checklist (owner-run, in order)

Status: branch `claude/crypto-payments` is CODE-COMPLETE and thrice
adversarially verified (~22 findings fixed, incl. the crash-window double-bill
via the durable `stripeSubToCancel` ledger column). Everything below is OPS,
not code. Nothing on this list is autonomous — each step is an owner action.
This file was referenced by the overnight ledgers but never written (continuity
audit, 2026-07-02); it exists now so the sequence can't be improvised at 1am.

## 0. Counsel (before any live flip)
- [ ] One-question counsel check: selling ANNUAL ACCESS PASSES for crypto via
      Coinbase Commerce (a hosted, custodial processor; we never touch keys or
      custody) — any money-services / MSB registration concern in our operating
      state? (Expected answer: processor-custodial + digital-goods = low risk,
      but VERIFY, don't assume.)

## 1. Merge + migrations (order matters — migration LEADS code)
- [ ] Merge `claude/crypto-payments` into main (after the standing five-branch
      merge, or with it).
- [ ] Run BOTH migrations against prod BEFORE the code deploy serves traffic:
      (a) stripeCustomerId-optional + PaymentProvider enum, (b) commerce_charges
      append-only ledger (+ stripeSubToCancel column).
- [ ] Prod GRANT on `commerce_charges` for the runtime role — same precedent as
      the picks-table GRANT (prod runtime role is not the migration role; a
      missing GRANT = 500s on webhook writes).

## 2. Environment (Vercel, prod scope)
- [ ] `COINBASE_COMMERCE_API_KEY` (from commerce.coinbase.com → Settings →
      Security).
- [ ] `COINBASE_COMMERCE_WEBHOOK_SECRET` (from the webhook subscription below).
- [ ] Confirm Stripe live keys unchanged (crypto path must not disturb card
      path; clobber guards are in code but env sanity still matters).
- [ ] Leave `CRYPTO_PAYMENTS_ENABLED` UNSET/false until step 5.

## 3. Webhook registration
- [ ] In Coinbase Commerce: add webhook endpoint
      `https://galaxysportsedge.com/api/webhooks/coinbase-commerce`.
- [ ] Events: charge:confirmed (grant), charge:resolved / charge:delayed
      (manual-review alerts only — code grants ONLY on confirmed).
- [ ] Copy the shared secret into the env var above; redeploy.

## 4. Dark verification (flag still OFF)
- [ ] Hit the webhook route with an invalid signature → expect 401 and NO
      ledger row (HMAC gate works in prod).
- [ ] Confirm /pricing does NOT render crypto copy while the flag is off.

## 5. Flip + first-payment smoke (the only irreversible step)
- [ ] Set `CRYPTO_PAYMENTS_ENABLED=true`, redeploy.
- [ ] Make ONE real small-value purchase yourself (smallest annual pass, real
      chain, real confirmation).
- [ ] Verify: commerce_charges row (append-only, correct code), subscription
      granted with paymentProvider=COINBASE_COMMERCE, term = 365d
      extend-don't-reset, dashboard shows the pass, Stripe untouched.
- [ ] Verify the Telegram owner alert fired for the charge.
- [ ] Refund/void is NOT possible on-chain — this smoke spend is a real cost;
      size it accordingly.

## 6. Post-live watches (first week)
- [ ] charge:delayed / charge:resolved alerts → manual review queue (expected
      rare; each one is a human decision, never auto-grant).
- [ ] Rate-limit logs on the webhook route (per-user limiter is in code).
- [ ] KNOWN OPEN (deliberate): no pass-expiry reminder exists — passes end
      silently (SWEEP-FIX-LEDGER #11, corrected 2026-07-02: the PASS_ENDING
      notice was ledgered DONE but never built). Pricing copy no longer
      promises a reminder, so there is no broken promise — but building the
      notice before the first cohort's year ends (2027) is the durable fix.

Related: CRYPTO-PAYMENTS-SPEC.md (design), overnight-2026-07-01/SWEEP-FIX-LEDGER.md
(#11/#12/#22), memory project-gse-overnight-five-branches.
