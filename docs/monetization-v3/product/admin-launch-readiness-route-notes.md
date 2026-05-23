# Admin Launch Readiness Route Notes

**Status:** Fail-closed scaffold.
**Related decision:** DEC-NEXT-070

## DEC-NEXT-070 - Add fail-closed admin launch-readiness route

**Decision:** Add a placeholder admin launch-readiness API route that returns admin-required until real auth and persistence exist.

**Why now:** The launch-readiness verdict helper is useful, but exposing it through an API before admin auth exists would be backwards. The route can exist now as an integration anchor while remaining closed.

## Implemented

- [api.ts](../../../apps/web/lib/vault/api.ts) now includes `vaultAdminRequiredResponse()`.
- [api.test.ts](../../../apps/web/lib/vault/api.test.ts) covers access, admin, write-disabled, and webhook-disabled response helpers.
- [route.ts](../../../apps/web/app/api/admin/launch-readiness/route.ts) returns HTTP 403 admin-required.

## Still Unwired

- Admin auth provider.
- Session lookup.
- Durable launch-readiness inputs.
- Admin cockpit UI.

## Guardrail

This route does not expose readiness data, member data, provider data, repair tasks, or secrets. It is an anchor for future admin work and fails closed.
