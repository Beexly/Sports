# Web Test Harness Notes

**Status:** Initial regression-test scaffold.
**Created:** 2026-05-23
**Related decision:** DEC-NEXT-026

## What changed

The repo now has a minimal Vitest harness for pure Vault helpers:

- `npm run test:web`
- `apps/web/vitest.config.ts`
- Vault entitlement tests.
- Vault seat-count tests.
- Vault application-validation tests.
- Vault Discord role-planning tests.

## DEC-NEXT-026 - Add a first web regression-test harness around Vault pure helpers

**Decision:** Add a small Vitest suite before live integrations are implemented.

**Rationale:** The overnight audit found no broad test harness in this clone. The inert Vault scaffold introduced pure logic that can and should be covered immediately, without waiting for Stripe, Discord, email, database, or production environment decisions.

**Scope limits:**

- No browser automation dependency.
- No Stripe API calls.
- No Discord API calls.
- No database setup.
- No production smoke execution.

**Follow-up:** Expand this harness when provider adapters and database persistence are intentionally wired.
