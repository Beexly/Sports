# Short-Form Attribution Scaffold Notes

**Status:** Parser-only scaffold.
**Created:** 2026-05-23
**Related decision:** DEC-NEXT-034

## What changed

The app now has a strict parser for short-form UTM attribution:

- [utm.ts](../../../apps/web/lib/utm.ts) - allowed `utm_source`, `utm_medium`, `utm_campaign`, and `utm_content` parser for short-form traffic.
- [utm.test.ts](../../../apps/web/lib/utm.test.ts) - regression coverage for accepted and rejected short-form attribution payloads.

## DEC-NEXT-034 - Add short-form UTM parser

**Decision:** Add a typed parser for the allowed short-form UTM convention without adding analytics provider calls.

**Rationale:** The short-form R&D lane routes attention to proof surfaces. A strict parser gives future reporting and capture flows a common contract while preserving the guardrail against paid-ad retargeting and checkout-first routing.

**Guardrails:**

- No tracking pixels.
- No third-party analytics SDK.
- No checkout routing.
- No public posting automation.

**Follow-up:** Feed parsed attribution into weekly reports only after event storage and privacy review are intentionally wired.
