# 02: Storefront Security, HMAC Cookies & Unified Pack Entitlements

**What to build:** Close `whop.ts` `whop_vip`/`mem_*` auth bypasses, replace `gse_unlock_global` with HMAC-SHA256 slug-scoped unlock cookies, require `WHOP_WEBHOOK_SECRET` in production, strip live `stripe.products.update`/`accounts.update` calls from checkout, remove `"week8-all-access"` fallback from Stripe webhooks + emit buyer magic-link receipts, and unify unexpired `PackagePurchase` ledger rows with `Subscription` inside `getUserEntitlements()`.

**Blocked by:** 01-setup-disk-and-dev-server

**Status:** implemented-awaiting-shell-verify

- [ ] Unverified `whop_vip`, `mem_*`, and `token_*` strings return `{ authorized: false }` when `WHOP_API_KEY` is unset outside automated tests.
- [ ] Unlock cookie signed for one slug never unlocks a different pack slug.
- [ ] Buyers with a verified `PackagePurchase` receive `PRO`, `FANTASY`, or `ELITE` entitlements in `getUserEntitlements()` even without a recurring `Subscription` row.
