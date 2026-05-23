# Vault Route Access Scaffold Notes

**Status:** Engineering scaffold. No auth provider yet.
**Related decision:** DEC-NEXT-051

## DEC-NEXT-051 - Add Vault route-access decision helper

**Decision:** Add a reusable route-access helper for member-only Vault routes that inherits the explainable entitlement reason codes.

**Why now:** Current member routes fail closed, but once auth is wired, each route needs the same server-side entitlement decision. A shared helper prevents route-by-route drift.

## Implemented

- [route-access.ts](../../../apps/web/lib/vault/route-access.ts) maps member-only route keys to allowed/denied decisions.
- [route-access.test.ts](../../../apps/web/lib/vault/route-access.test.ts) covers allowed active access and denied refunded access.

## Member Route Keys

- `member_dashboard`
- `digest_archive`
- `digest_detail`
- `office_hours`
- `quarterly_reviews`
- `referrals`

## Still Unwired

- Session/auth provider.
- User-to-VaultMember lookup.
- Route handlers using the helper.
- Redirect behavior for web pages.

## Guardrail

This helper does not authenticate users, create sessions, query a database, or unlock any route. Existing routes remain fail-closed until real auth is wired.
